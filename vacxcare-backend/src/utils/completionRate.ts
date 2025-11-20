import Child, { IChild } from "../models/Child";
import Vaccination from "../models/Vaccination";
import VaccineCalendar from "../models/VaccineCalendar";
import { differenceInWeeks, differenceInMonths, differenceInYears } from "date-fns";

/**
 * Calcule l'âge d'un enfant dans une unité spécifique
 */
function calculateAge(birthDate: Date, unit: "weeks" | "months" | "years"): number {
  const now = new Date();
  switch (unit) {
    case "weeks":
      return differenceInWeeks(now, birthDate);
    case "months":
      return differenceInMonths(now, birthDate);
    case "years":
      return differenceInYears(now, birthDate);
  }
}

/**
 * Vérifie si un enfant a atteint l'âge pour une entrée du calendrier
 */
function isAgeEligible(
  childAge: number,
  entry: {
    specificAge?: number | null;
    minAge?: number;
    maxAge?: number | null;
  }
): boolean {
  // Si c'est un âge spécifique
  if (entry.specificAge !== null && entry.specificAge !== undefined) {
    return childAge >= entry.specificAge;
  }
  
  // Si c'est un intervalle
  if (entry.minAge !== undefined) {
    return childAge >= entry.minAge;
  }
  
  return false;
}

/**
 * Calcule le taux de complétion vaccinal pour un enfant
 * @param childId - ID de l'enfant
 * @returns Object contenant le taux, les doses attendues et faites
 */
export async function calculateChildCompletionRate(childId: string) {
  try {
    // 1. Récupérer l'enfant
    const childDoc = await Child.findById(childId).lean();
    if (!childDoc || !childDoc.birthDate) {
      return {
        completionRate: 0,
        expectedDoses: 0,
        completedDoses: 0,
        missingDoses: [],
        error: "Enfant non trouvé ou date de naissance manquante",
      };
    }

    // Cast to proper type for accessing properties
    const child = childDoc as any;

    // 2. Récupérer TOUT le calendrier vaccinal
    const allCalendarEntries = await VaccineCalendar.find({}).lean();

    // 3. Filtrer les doses attendues selon l'âge de l'enfant
    const expectedDoses: any[] = [];
    
    for (const entry of allCalendarEntries) {
      const childAge = calculateAge(child.birthDate, entry.ageUnit);
      
      if (isAgeEligible(childAge, entry)) {
        // L'enfant a atteint l'âge pour cette dose
        expectedDoses.push({
          vaccines: entry.vaccine,
          dose: entry.dose,
          ageUnit: entry.ageUnit,
          age: entry.specificAge || entry.minAge,
        });
      }
    }

    // 4. Récupérer les vaccinations FAITES de l'enfant
    const completedVaccinations = await Vaccination.find({
      child: childId,
      status: "done",
    })
      .populate("vaccine", "name")
      .lean();

    // 5. Compter le nombre de doses faites
    const completedDoses = completedVaccinations.length;

    // 6. Identifier les doses manquantes
    const missingDoses: any[] = [];
    for (const expected of expectedDoses) {
      // Vérifier si au moins un des vaccins de cette entrée est fait
      const isDone = completedVaccinations.some((vacc: any) => {
        const vaccineName = vacc.vaccine?.name?.toLowerCase() || "";
        return expected.vaccines.some((v: string) => 
          vaccineName.includes(v.toLowerCase()) || v.toLowerCase().includes(vaccineName)
        );
      });

      if (!isDone) {
        missingDoses.push({
          vaccines: expected.vaccines,
          dose: expected.dose,
        });
      }
    }

    // 7. Calculer le taux
    const totalExpected = expectedDoses.length;
    const completionRate = totalExpected > 0 
      ? Math.round((completedDoses / totalExpected) * 100) 
      : 0;

    return {
      completionRate,
      expectedDoses: totalExpected,
      completedDoses,
      missingDoses,
      child: {
        id: child._id,
        name: `${child.firstName} ${child.lastName}`,
        age: calculateAge(child.birthDate, "months"),
      },
    };
  } catch (error) {
    console.error("❌ Erreur calcul taux complétion:", error);
    return {
      completionRate: 0,
      expectedDoses: 0,
      completedDoses: 0,
      missingDoses: [],
      error: "Erreur lors du calcul",
    };
  }
}

/**
 * Calcule le taux de complétion vaccinal global pour un centre de santé (agent)
 * @param healthCenter - Nom du centre de santé
 * @returns Taux global pondéré
 */
export async function calculateAgentCompletionRate(healthCenter: string) {
  try {
    // 1. Récupérer tous les enfants du centre
    const children = await Child.find({
      healthCenter: { $regex: new RegExp(`^${healthCenter}$`, "i") },
    }).lean();

    if (children.length === 0) {
      return {
        completionRate: 0,
        totalChildren: 0,
        totalExpectedDoses: 0,
        totalCompletedDoses: 0,
      };
    }

    // 2. Calculer pour chaque enfant
    let totalExpected = 0;
    let totalCompleted = 0;

    for (const child of children) {
      const childResult = await calculateChildCompletionRate(child._id.toString());
      totalExpected += childResult.expectedDoses;
      totalCompleted += childResult.completedDoses;
    }

    // 3. Calculer le taux global pondéré
    const completionRate = totalExpected > 0 
      ? Math.round((totalCompleted / totalExpected) * 100) 
      : 0;

    return {
      completionRate,
      totalChildren: children.length,
      totalExpectedDoses: totalExpected,
      totalCompletedDoses: totalCompleted,
    };
  } catch (error) {
    console.error("❌ Erreur calcul taux agent:", error);
    return {
      completionRate: 0,
      totalChildren: 0,
      totalExpectedDoses: 0,
      totalCompletedDoses: 0,
      error: "Erreur lors du calcul",
    };
  }
}
