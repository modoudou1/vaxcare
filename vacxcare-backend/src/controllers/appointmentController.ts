import { Request, Response } from "express";
import { Types } from "mongoose";
import Appointment from "../models/Appointment";
import HealthCenter from "../models/HealthCenter";
import Child from "../models/Child";
import Vaccine from "../models/Vaccine";
import Notification from "../models/Notification";
import { io } from "../server";
import { sendSocketNotification } from "../utils/socketManager";
import { decrementStock } from "./stockController";

// 🔤 Helper: échappe les caractères spéciaux d'une string pour un usage sûr dans une RegExp
function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
// ➕ Créer un rendez-vous (agent uniquement) + notification parent
export const createAppointment = async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    let { healthCenter, ...rest } = body;
    const user = (req as any).user;

    if (!healthCenter && user?.healthCenter) {
      healthCenter = user.healthCenter;
    }

    let centerName: string | null = null;

    if (typeof healthCenter === "object" && healthCenter !== null) {
      centerName =
        (healthCenter as any).name ||
        (await HealthCenter.findById((healthCenter as any)._id).then(
          (hc) => hc?.name || null
        ));
    } else if (
      typeof healthCenter === "string" &&
      /^[0-9a-fA-F]{24}$/.test(healthCenter)
    ) {
      const found = await HealthCenter.findById(healthCenter).lean();
      centerName = found?.name || null;
    } else if (typeof healthCenter === "string") {
      centerName = healthCenter.trim();
    } else if (!centerName && user?.healthCenter) {
      if (typeof user.healthCenter === "string")
        centerName = user.healthCenter.trim();
      else if (typeof user.healthCenter === "object")
        centerName = (user.healthCenter as any).name?.trim() || null;
    }

    if (!centerName) {
      return res
        .status(400)
        .json({ error: "Impossible de déterminer le centre de santé." });
    }

    // ✅ Coercions et validations
    // child → ObjectId
    if (typeof rest.child === "string") {
      if (/^[0-9a-fA-F]{24}$/.test(rest.child)) {
        rest.child = new Types.ObjectId(rest.child);
      } else {
        return res.status(400).json({ error: "Paramètre 'child' invalide" });
      }
    }

    // vaccine → ObjectId (accepte un nom depuis le frontend)
    if (rest.vaccine) {
      if (typeof rest.vaccine === "string") {
        if (/^[0-9a-fA-F]{24}$/.test(rest.vaccine)) {
          rest.vaccine = new Types.ObjectId(rest.vaccine);
        } else {
          const byName = await Vaccine.findOne({
            name: {
              $regex: `^${escapeRegex(rest.vaccine.trim())}$`,
              $options: "i",
            },
          }).lean();
          if (!byName?._id) {
            return res
              .status(400)
              .json({ error: `Vaccin introuvable: '${rest.vaccine}'` });
          }
          rest.vaccine = byName._id;
        }
      } else if (
        typeof rest.vaccine === "object" &&
        (rest.vaccine as any)._id
      ) {
        rest.vaccine = new Types.ObjectId((rest.vaccine as any)._id);
      }
    } else {
      return res.status(400).json({ error: "Paramètre 'vaccine' manquant" });
    }

    // date → Date
    if (typeof rest.date === "string") {
      const d = new Date(rest.date);
      if (isNaN(d.getTime()))
        return res.status(400).json({ error: "Paramètre 'date' invalide" });
      rest.date = d;
    } else if (!(rest.date instanceof Date)) {
      return res.status(400).json({ error: "Paramètre 'date' manquant" });
    }

    let resolvedDistrict: string | undefined;
    try {
      // Si on a l'enfant, essayer d'utiliser son district
      if (rest.child) {
        const childDoc: any = await Child.findById(rest.child).lean();
        if (childDoc?.district) {
          resolvedDistrict = childDoc.district;
        }
      }

      // Sinon, déduire depuis le centre de santé
      if (!resolvedDistrict && centerName && user?.region) {
        const hc = await HealthCenter.findOne({
          name: centerName,
          region: user.region,
        }).lean();
        if (hc) {
          const hcAny: any = hc;
          if (hcAny.type === "district") {
            resolvedDistrict = hcAny.name;
          } else if (hcAny.districtName) {
            resolvedDistrict = hcAny.districtName;
          }
        }
      }
    } catch (e) {
      console.error("❌ Erreur résolution district pour rendez-vous:", (e as any)?.message);
    }

    const appointmentData: any = {
      ...rest,
      healthCenter: centerName,
      agent: new Types.ObjectId(user.id),
      region: user?.region,
      district: resolvedDistrict,
      status: "planned",
    };

    const appointment = new Appointment(appointmentData);
    await appointment.save();

    console.log(
      `✅ Rendez-vous créé pour ${centerName} par ${user?.email || user?.id}`
    );

    res.status(201).json({
      message: "Rendez-vous créé avec succès ✅",
      appointment,
    });
  } catch (err) {
    console.error("❌ Erreur createAppointment:", err);
    res.status(500).json({ error: "Erreur serveur", details: err });
  }
};

// ✅ Marquer un rendez-vous comme “fait” + notification parent
export const completeAppointment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findById(id)
      .populate("child", "name _id")
      .populate("vaccine", "name");

    if (!appointment)
      return res.status(404).json({ error: "Rendez-vous introuvable" });

    appointment.status = "done";
    await appointment.save();

    const childData = appointment.child as any;
    const vaccineData = appointment.vaccine as any;
    const vaccineDoc = await Vaccine.findById(appointment.vaccine);

    // 🔽 Décrémenter le stock si nécessaire
    if (appointment.healthCenter && vaccineDoc?.name) {
      await decrementStock(vaccineDoc.name, appointment.healthCenter as any);
    }

    // 🔔 Notification parent vaccination faite
    const notif = await Notification.create({
      title: "✅ Vaccination effectuée",
      message: `La vaccination ${vaccineData?.name || ""} de votre enfant ${childData?.name || ""} a été réalisée avec succès.`,
      type: "vaccination",
      icon: "✅",
      status: "success",
      targetRoles: ["parent"],
      targetUsers: [childData?._id],
    });

    if (childData?._id) {
      console.log(`📤 Envoi notif socket → child_${childData._id}`);
      sendSocketNotification(io, [`child_${childData._id}`], {
        title: notif.title,
        message: notif.message,
        type: notif.type,
        icon: notif.icon,
        status: notif.status,
        createdAt: notif.createdAt,
      });
    }

    res.json({
      message: "Rendez-vous marqué comme fait et notification envoyée ✅",
      appointment,
      notification: notif,
    });
  } catch (err: any) {
    console.error("❌ Erreur completeAppointment:", err.message);
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
};

// 🔎 Détail d’un rendez-vous
export const getAppointmentById = async (req: Request, res: Response) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate("child", "name _id")
      .populate("vaccine", "name");

    if (!appointment)
      return res.status(404).json({ message: "Rendez-vous introuvable" });

    res.json(appointment);
  } catch (err: any) {
    console.error("❌ Erreur getAppointmentById:", err);
    res.status(500).json({ message: err.message });
  }
};

// 📋 Liste des rendez-vous (combine Vaccinations + Appointments sans duplication)
export const getAppointments = async (req: Request, res: Response) => {
  try {
    const { district } = req.query;
    const user = (req as any).user;
    const vaccinationFilter: any = {};
    const appointmentFilter: any = {};

    console.log('\n🔍 === DEBUG getAppointments ===');
    console.log('User role:', user?.role);
    console.log('User healthCenter:', user?.healthCenter);
    console.log('Paramètre district reçu:', district);

    // 🔹 Si l'utilisateur est un AGENT (acteur de santé)
    // → Il voit UNIQUEMENT les rendez-vous de SON centre
    if (user?.role === "agent" && user?.healthCenter) {
      vaccinationFilter.healthCenter = user.healthCenter;
      appointmentFilter.healthCenter = user.healthCenter;
      console.log('👤 AGENT : Filtrage par healthCenter uniquement:', user.healthCenter);
    }
    // 🔹 Si l'utilisateur est un DISTRICT ou si un paramètre district est passé
    // → Il voit TOUS les rendez-vous du district (les siens + acteurs)
    else if (district && typeof district === "string") {
      try {
        const centersInDistrict = await HealthCenter.find({
          $or: [
            { name: district, type: "district" },
            { districtName: district },
          ],
        })
          .select("name")
          .lean();

        console.log(`📍 Centres trouvés pour district "${district}":`, centersInDistrict.length);
        centersInDistrict.forEach(c => console.log(`  - ${c.name}`));

        const centerNames = centersInDistrict
          .map((c: any) => c.name)
          .filter(Boolean);

        if (centerNames.length > 0) {
          vaccinationFilter.$or = [
            { district },
            { healthCenter: { $in: centerNames } },
          ];
          appointmentFilter.$or = [
            { district },
            { healthCenter: { $in: centerNames } },
          ];
          console.log('🔎 Filtre vaccinations:', JSON.stringify(vaccinationFilter, null, 2));
        } else {
          vaccinationFilter.district = district;
          appointmentFilter.district = district;
          console.log('🔎 Filtre vaccinations (simple):', vaccinationFilter);
        }
      } catch (e) {
        console.error(
          "❌ Erreur résolution centres pour getAppointments district:",
          (e as any)?.message
        );
        vaccinationFilter.district = district;
        appointmentFilter.district = district;
      }
    }

    const Vaccination = require("../models/Vaccination").default;

    // 🔹 Récupérer les vaccinations
    const vaccinations = await Vaccination.find(vaccinationFilter)
      .populate("child", "name _id parentInfo parentName parentPhone")
      .populate("vaccine", "name")
      .lean();

    console.log(`📊 Vaccinations trouvées:`, vaccinations.length);
    if (vaccinations.length > 0) {
      console.log('📋 Exemples de vaccinations trouvées:');
      vaccinations.slice(0, 3).forEach((v: any) => {
        console.log(`  - Vaccin: ${v.vaccine?.name || 'N/A'}, Enfant: ${v.child?.name || 'N/A'}, Status: ${v.status}, District: ${v.district || 'NON DÉFINI'}, HealthCenter: ${v.healthCenter}`);
      });
    }

    // 🔹 Récupérer les appointments (seulement ceux sans vaccination associée)
    const appointments = await Appointment.find(appointmentFilter)
      .populate("child", "name _id parentInfo parentName parentPhone")
      .populate("vaccine", "name")
      .lean();

    console.log(`📊 Appointments trouvés:`, appointments.length);

    // 🔄 Combiner et formater SANS DUPLICATION
    const allAppointments: any[] = [];
    const seenKeys = new Set<string>();

    // Ajouter les vaccinations en priorité
    for (const v of vaccinations) {
      const childId = (v.child as any)?._id?.toString() || "";
      const vaccineId = (v.vaccine as any)?._id?.toString() || "";
      const date = v.scheduledDate || v.doneDate || new Date();

      // Clé unique : enfant + vaccin + date (jour)
      const dateStr = new Date(date).toISOString().split("T")[0];
      const key = `${childId}-${vaccineId}-${dateStr}`;

      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        allAppointments.push({
          _id: v._id,
          id: v._id,
          child: v.child,
          childName: (v.child as any)?.name || "Enfant",
          childId: childId,
          parentName: (v.child as any)?.parentInfo?.parentName || (v.child as any)?.parentName || "Parent inconnu",
          parentPhone: (v.child as any)?.parentInfo?.parentPhone || (v.child as any)?.parentPhone,
          vaccine: v.vaccine,
          vaccineName: (v.vaccine as any)?.name || "Vaccin",
          date: v.scheduledDate || v.doneDate || new Date(),
          status: v.status, // 'scheduled', 'done', 'missed', etc.
          notes: v.notes,
          healthCenter: v.healthCenter,
          source: "vaccination",
        });
      }
    }

    // Ajouter les appointments qui n'ont pas de vaccination correspondante
    for (const a of appointments) {
      const childId = (a.child as any)?._id?.toString() || "";
      const vaccineId = (a.vaccine as any)?._id?.toString() || "";
      const dateStr = new Date(a.date).toISOString().split("T")[0];
      const key = `${childId}-${vaccineId}-${dateStr}`;

      // Seulement si pas déjà ajouté via vaccination
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        allAppointments.push({
          _id: a._id,
          id: a._id,
          child: a.child,
          childName: (a.child as any)?.name || "Enfant",
          childId: childId,
          parentName: (a.child as any)?.parentInfo?.parentName || (a.child as any)?.parentName || "Parent inconnu",
          parentPhone: (a.child as any)?.parentInfo?.parentPhone || (a.child as any)?.parentPhone,
          vaccine: a.vaccine,
          vaccineName: (a.vaccine as any)?.name || "Vaccin",
          date: a.date,
          status: a.status, // 'planned', 'done', 'missed', etc.
          notes: a.notes,
          healthCenter: a.healthCenter,
          source: "appointment",
        });
      }
    }

    // 🎯 Tri : Programmés en haut, Faits en bas
    allAppointments.sort((a, b) => {
      const getPriority = (status: string) => {
        switch (status) {
          case "scheduled":
          case "planned":
            return 1;
          case "pending":
            return 2;
          case "done":
          case "completed":
            return 3;
          case "missed":
            return 4;
          case "cancelled":
          case "refused":
            return 5;
          default:
            return 6;
        }
      };

      const prioA = getPriority(a.status);
      const prioB = getPriority(b.status);

      if (prioA !== prioB) return prioA - prioB;

      // Même priorité : tri par date
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateA - dateB;
    });

    console.log(`📋 ${allAppointments.length} rendez-vous combinés (sans duplication)`);
    console.log(`  - ${vaccinations.length} vaccinations`);
    console.log(`  - ${appointments.length} appointments`);
    console.log(`  - Uniques: ${seenKeys.size}`);
    
    if (allAppointments.length > 0) {
      console.log('📤 Exemples de rendez-vous retournés:');
      allAppointments.slice(0, 3).forEach((apt: any, i: number) => {
        console.log(`  ${i + 1}. ${apt.vaccineName} - ${apt.childName} (${apt.status}) - ${apt.healthCenter}`);
      });
    }
    console.log('='.repeat(60) + '\n');

    res.json(allAppointments);
  } catch (err: any) {
    console.error("❌ Erreur getAppointments:", err);
    res.status(500).json({ message: err.message });
  }
};

// 📋 Liste des rendez-vous de l’agent connecté
export const getMyAppointments = async (req: Request, res: Response) => {
  try {
    const appointments = await Appointment.find({
      agent: (req as any).user._id, // Agent connecté
    })
      .populate("child", "name _id")
      .populate("vaccine", "name");
    res.json(appointments);
  } catch (err: any) {
    console.error("❌ Erreur getMyAppointments:", err);
    res.status(500).json({ message: err.message });
  }
};

// ✏️ Mise à jour d’un rendez-vous
export const updateAppointment = async (req: Request, res: Response) => {
  try {
    const updated = await Appointment.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!updated)
      return res.status(404).json({ message: "Rendez-vous introuvable" });

    res.json(updated);
  } catch (err: any) {
    console.error("❌ Erreur updateAppointment:", err);
    res.status(500).json({ message: err.message });
  }
};

// ⏭️ Marquer un rendez-vous comme "raté" + notification parent
export const missAppointment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findById(id)
      .populate("child", "name _id parentInfo")
      .populate("vaccine", "name");

    if (!appointment)
      return res.status(404).json({ error: "Rendez-vous introuvable" });

    appointment.status = "missed";
    await appointment.save();

    const childData = appointment.child as any;
    const vaccineData = appointment.vaccine as any;

    // 🔔 Notification parent rendez-vous raté
    const notif = await Notification.create({
      title: "⚠️ Rendez-vous manqué",
      message: `Le rendez-vous de vaccination ${vaccineData?.name || ""} de votre enfant ${childData?.name || ""} a été manqué. Veuillez contacter votre centre de santé pour reprogrammer.`,
      type: "appointment",
      icon: "⚠️",
      status: "warning",
      targetRoles: ["parent"],
      targetUsers: [childData?._id],
    });

    if (childData?._id) {
      console.log(`📤 Envoi notif socket (raté) → child_${childData._id}`);
      const parentPhone = childData.parentInfo?.phone;
      const rooms = [`child_${childData._id}`];
      if (parentPhone) {
        rooms.push(`parent_${parentPhone}_child_${childData._id}`);
      }
      
      sendSocketNotification(io, rooms, {
        title: notif.title,
        message: notif.message,
        type: notif.type,
        icon: notif.icon,
        status: notif.status,
        createdAt: notif.createdAt,
      });
    }

    res.json({
      message: "Rendez-vous marqué comme raté et notification envoyée ⚠️",
      appointment,
      notification: notif,
    });
  } catch (err: any) {
    console.error("❌ Erreur missAppointment:", err.message);
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
};

// 🚫 Marquer un rendez-vous comme "annulé" + notification parent
export const cancelAppointment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body; // Raison de l'annulation (optionnel)
    
    const appointment = await Appointment.findById(id)
      .populate("child", "name _id parentInfo")
      .populate("vaccine", "name");

    if (!appointment)
      return res.status(404).json({ error: "Rendez-vous introuvable" });

    appointment.status = "refused";
    if (reason) {
      appointment.notes = `Annulé: ${reason}`;
    }
    await appointment.save();

    const childData = appointment.child as any;
    const vaccineData = appointment.vaccine as any;

    // 🔔 Notification parent rendez-vous annulé
    const notif = await Notification.create({
      title: "❌ Rendez-vous annulé",
      message: `Le rendez-vous de vaccination ${vaccineData?.name || ""} de votre enfant ${childData?.name || ""} a été annulé${reason ? ` : ${reason}` : ''}. Contactez votre centre de santé pour plus d'informations.`,
      type: "appointment",
      icon: "❌",
      status: "error",
      targetRoles: ["parent"],
      targetUsers: [childData?._id],
    });

    if (childData?._id) {
      console.log(`📤 Envoi notif socket (annulé) → child_${childData._id}`);
      const parentPhone = childData.parentInfo?.phone;
      const rooms = [`child_${childData._id}`];
      if (parentPhone) {
        rooms.push(`parent_${parentPhone}_child_${childData._id}`);
      }
      
      sendSocketNotification(io, rooms, {
        title: notif.title,
        message: notif.message,
        type: notif.type,
        icon: notif.icon,
        status: notif.status,
        createdAt: notif.createdAt,
      });
    }

    res.json({
      message: "Rendez-vous annulé et notification envoyée ❌",
      appointment,
      notification: notif,
    });
  } catch (err: any) {
    console.error("❌ Erreur cancelAppointment:", err.message);
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
};

// ❌ Suppression d'un rendez-vous
export const deleteAppointment = async (req: Request, res: Response) => {
  try {
    const deleted = await Appointment.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res.status(404).json({ message: "Rendez-vous introuvable" });

    res.json({ message: "Rendez-vous supprimé" });
  } catch (err: any) {
    console.error("❌ Erreur deleteAppointment:", err);
    res.status(500).json({ message: err.message });
  }
};