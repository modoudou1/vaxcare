import crypto from "crypto";
import { Request, Response } from "express";
import nodemailer from "nodemailer";
import User from "../models/User";

// 📋 Liste agents
export const getAgents = async (req: Request, res: Response) => {
  try {
    const users = await User.find({
      role: { $in: ["agent", "regional"] },
    }).lean();

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err });
  }
};

// ➕ Créer un agent
export const createAgent = async (req: Request, res: Response) => {
  try {
    const { email, role, region, healthCenter } = req.body;

    if (!email || !role)
      return res.status(400).json({ message: "Email et rôle obligatoires" });

    // Token pour activation
    const token = crypto.randomBytes(32).toString("hex");
    const expire = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h

    const user = new User({
      email,
      role,
      region,
      healthCenter,
      resetPasswordToken: token,
      resetPasswordExpires: expire,
    });

    await user.save();

    // Envoyer mail
    const transporter = nodemailer.createTransport({
      service: "gmail", // ⚠️ à adapter
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    const activationLink = `${process.env.FRONT_URL}/activate?token=${token}`;

    await transporter.sendMail({
      from: `"VacxCare" <${process.env.MAIL_USER}>`,
      to: email,
      subject: "Activation de votre compte VacxCare",
      text: `Bonjour, veuillez activer votre compte en cliquant ici: ${activationLink}`,
      html: `<p>Bonjour,</p>
             <p>Votre compte a été créé sur VacxCare.</p>
             <p><a href="${activationLink}">Cliquez ici pour activer et définir votre mot de passe</a></p>`,
    });

    res.status(201).json({ message: "Agent créé et email envoyé", user });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err });
  }
};

// ❌ Supprimer un agent
export const deleteAgent = async (req: Request, res: Response) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id).lean();
    if (!user) return res.status(404).json({ message: "Agent introuvable" });
    res.json({ message: "Agent supprimé" });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err });
  }
};
