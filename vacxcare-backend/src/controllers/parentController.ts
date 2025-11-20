import { Request, Response } from "express";
import Child from "../models/Child";

/**
 * Obtenir la liste des parents avec le nombre d'enfants
 * Groupé par numéro de téléphone parent
 */
export const getParentsList = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userRole = req.user?.role;
    // @ts-ignore
    const userRegion = req.user?.region;
    // @ts-ignore
    const userHealthCenter = req.user?.healthCenter;

    // Construire le filtre selon le rôle
    let matchFilter: any = {};

    if (userRole === "agent") {
      // Agent : seulement son centre de santé
      matchFilter.healthCenter = userHealthCenter;
    } else if (userRole === "regional") {
      // Régional : seulement sa région
      matchFilter.region = userRegion;
    }
    // National : tous les parents (pas de filtre)

    // Agrégation pour grouper par parent
    const parentsAggregation = await Child.aggregate([
      // Filtrer selon le rôle
      { $match: matchFilter },
      
      // Grouper par téléphone parent
      {
        $group: {
          _id: "$parentInfo.parentPhone",
          parentName: { $first: "$parentInfo.parentName" },
          parentEmail: { $first: "$parentInfo.parentEmail" },
          parentPhone: { $first: "$parentInfo.parentPhone" },
          childrenCount: { $sum: 1 },
          children: {
            $push: {
              id: "$_id",
              firstName: "$firstName",
              lastName: "$lastName",
              birthDate: "$birthDate",
              gender: "$gender",
              status: "$status",
              region: "$region",
              healthCenter: "$healthCenter",
            },
          },
          // Statistiques
          regions: { $addToSet: "$region" },
          healthCenters: { $addToSet: "$healthCenter" },
        },
      },
      
      // Trier par nombre d'enfants décroissant
      { $sort: { childrenCount: -1 } },
      
      // Formater le résultat
      {
        $project: {
          _id: 0,
          parentPhone: "$_id",
          parentName: 1,
          parentEmail: 1,
          childrenCount: 1,
          children: 1,
          regions: 1,
          healthCenters: 1,
        },
      },
    ]);

    // Statistiques globales
    const totalParents = parentsAggregation.length;
    const totalChildren = parentsAggregation.reduce(
      (sum, parent) => sum + parent.childrenCount,
      0
    );
    const avgChildrenPerParent = totalParents > 0 
      ? (totalChildren / totalParents).toFixed(2) 
      : "0";

    res.status(200).json({
      success: true,
      data: parentsAggregation,
      statistics: {
        totalParents,
        totalChildren,
        avgChildrenPerParent: parseFloat(avgChildrenPerParent as string),
      },
    });
  } catch (error) {
    console.error("Erreur récupération liste parents:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération de la liste des parents",
    });
  }
};

/**
 * Obtenir les détails d'un parent et tous ses enfants
 */
export const getParentDetails = async (req: Request, res: Response) => {
  try {
    const { phone } = req.params;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Numéro de téléphone requis",
      });
    }

    // @ts-ignore
    const userRole = req.user?.role;
    // @ts-ignore
    const userRegion = req.user?.region;
    // @ts-ignore
    const userHealthCenter = req.user?.healthCenter;

    // Construire le filtre
    let filter: any = {
      "parentInfo.parentPhone": phone,
    };

    if (userRole === "agent") {
      filter.healthCenter = userHealthCenter;
    } else if (userRole === "regional") {
      filter.region = userRegion;
    }

    // Récupérer tous les enfants du parent
    const children = await Child.find(filter)
      .select(
        "firstName lastName birthDate gender status region healthCenter parentInfo nextAppointment vaccinesDone vaccinesDue createdAt"
      )
      .sort({ birthDate: -1 })
      .lean();

    if (!children || children.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Aucun enfant trouvé pour ce parent",
      });
    }

    // Informations du parent (depuis le premier enfant)
    const firstChild: any = children[0];
    const parentInfo = {
      parentName: firstChild.parentInfo?.parentName || "N/A",
      parentPhone: firstChild.parentInfo?.parentPhone || phone,
      parentEmail: firstChild.parentInfo?.parentEmail || "N/A",
    };

    res.status(200).json({
      success: true,
      data: {
        parent: parentInfo,
        children,
        childrenCount: children.length,
      },
    });
  } catch (error) {
    console.error("Erreur récupération détails parent:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des détails du parent",
    });
  }
};
