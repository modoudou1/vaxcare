const axios = require("axios");

async function changePassword() {
  try {
    console.log("🔐 Changement du mot de passe pour national@test.com");

    const response = await axios.post(
      "http://localhost:5000/api/change-password",
      {
        email: "national@test.com",
        newPassword: "Modoudou",
      }
    );

    console.log("✅ Réponse du serveur:", response.data);
    console.log("\n🎉 Mot de passe changé avec succès !");
    console.log("📧 Email: national@test.com");
    console.log("🔐 Nouveau mot de passe: Modoudou");
  } catch (error) {
    if (error.response) {
      console.error(
        "❌ Erreur API:",
        error.response.status,
        error.response.data
      );
    } else {
      console.error("❌ Erreur:", error.message);
    }
  }
}

changePassword();
















