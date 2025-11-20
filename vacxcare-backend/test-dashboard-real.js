const mongoose = require("mongoose");
const Child = require("./dist/models/Child").default;
const Vaccination = require("./dist/models/Vaccination").default;
const Vaccine = require("./dist/models/Vaccine").default;
const Campaign = require("./dist/models/Campaign").default;

async function testDashboardReal() {
  try {
    // Connexion à MongoDB
    await mongoose.connect("mongodb://localhost:27017/vacxcare");
    console.log("✅ Connecté à MongoDB");

    // Simuler la logique du dashboard
    console.log("\n📊 Test du Dashboard National:");

    // 1️⃣ Nombre total d'enfants
    const totalChildren = await Child.countDocuments();
    console.log(`- Enfants enregistrés: ${totalChildren}`);

    // 2️⃣ Nombre d'enfants vaccinés (au moins une vaccination)
    const vaccinatedChildren = await Vaccination.distinct("child").then(
      (uniqueChildren) => uniqueChildren.length
    );
    console.log(`- Enfants vaccinés: ${vaccinatedChildren}`);

    // 3️⃣ Taux de couverture (%)
    const coverageRate =
      totalChildren > 0
        ? Number(((vaccinatedChildren / totalChildren) * 100).toFixed(2))
        : 0;
    console.log(`- Taux de couverture: ${coverageRate}%`);

    // 4️⃣ Campagnes actives
    const today = new Date();
    const campaigns = await Campaign.countDocuments({
      startDate: { $lte: today },
      endDate: { $gte: today },
    });
    console.log(`- Campagnes actives: ${campaigns}`);

    // 5️⃣ Nombre total de vaccinations
    const totalVaccinations = await Vaccination.countDocuments();
    console.log(`- Vaccinations totales: ${totalVaccinations}`);

    // 6️⃣ Évolution mensuelle
    const monthlyVaccinationsRaw = await Vaccination.aggregate([
      {
        $group: {
          _id: { $month: "$date" },
          value: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          month: {
            $arrayElemAt: [
              [
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec",
              ],
              { $subtract: ["$_id", 1] },
            ],
          },
          value: 1,
        },
      },
    ]);

    const monthlyVaccinations =
      monthlyVaccinationsRaw.length > 0
        ? monthlyVaccinationsRaw
        : [
            { month: "Jul", value: 120 },
            { month: "Aug", value: 145 },
            { month: "Sep", value: 98 },
            { month: "Oct", value: 167 },
            { month: "Nov", value: 134 },
            { month: "Dec", value: 89 },
          ];

    console.log("\n📈 Évolution mensuelle:");
    monthlyVaccinations.forEach((item) => {
      console.log(`  ${item.month}: ${item.value} vaccinations`);
    });

    // 7️⃣ Répartition par vaccin
    const vaccinationsByVaccine = await Vaccination.aggregate([
      {
        $lookup: {
          from: "vaccines",
          localField: "vaccine",
          foreignField: "_id",
          as: "vaccineInfo",
        },
      },
      { $unwind: "$vaccineInfo" },
      {
        $group: {
          _id: "$vaccineInfo.name",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const coverageByVaccine =
      vaccinationsByVaccine.length > 0
        ? vaccinationsByVaccine.map((v) => ({
            name: v._id,
            value: v.count,
          }))
        : [
            { name: "BCG", value: 45 },
            { name: "Polio", value: 38 },
            { name: "DTP", value: 32 },
            { name: "Rougeole", value: 28 },
            { name: "Hépatite B", value: 25 },
          ];

    console.log("\n🥧 Répartition par vaccin:");
    coverageByVaccine.forEach((item) => {
      console.log(`  ${item.name}: ${item.value} vaccinations`);
    });

    // 8️⃣ Top 5 régions en retard
    const topRegionsRaw = await Child.aggregate([
      {
        $lookup: {
          from: "vaccinations",
          localField: "_id",
          foreignField: "child",
          as: "vaccinations",
        },
      },
      {
        $group: {
          _id: "$region",
          totalChildren: { $sum: 1 },
          vaccinatedChildren: {
            $sum: { $cond: [{ $gt: [{ $size: "$vaccinations" }, 0] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          region: "$_id",
          totalChildren: 1,
          vaccinatedChildren: 1,
          retard: { $subtract: ["$totalChildren", "$vaccinatedChildren"] },
        },
      },
      { $sort: { retard: -1 } },
      { $limit: 5 },
    ]);

    const topRegions =
      topRegionsRaw.length > 0
        ? topRegionsRaw
        : [
            { region: "Nord", retard: 45 },
            { region: "Est", retard: 38 },
            { region: "Sud", retard: 32 },
            { region: "Ouest", retard: 28 },
            { region: "Centre", retard: 25 },
          ];

    console.log("\n🏆 Top 5 régions en retard:");
    topRegions.forEach((item) => {
      console.log(`  ${item.region}: ${item.retard} enfants non vaccinés`);
    });

    // Résumé final
    console.log("\n✅ Dashboard testé avec succès !");
    console.log("\n📋 Résumé pour le frontend:");
    console.log(
      JSON.stringify(
        {
          totalChildren,
          totalVaccinations,
          campaigns,
          coverageRate,
          monthlyVaccinations,
          coverageByVaccine,
          topRegions,
        },
        null,
        2
      )
    );
  } catch (error) {
    console.error("❌ Erreur:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ Déconnecté de MongoDB");
  }
}

testDashboardReal();





