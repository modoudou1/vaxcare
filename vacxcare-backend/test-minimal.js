// Script pour tester le serveur minimal
const { spawn } = require("child_process");
const axios = require("axios");

console.log("🧪 Test du serveur minimal...");

// Lancer le serveur minimal
const server = spawn("npx", ["ts-node", "src/server-minimal.ts"], {
  stdio: "pipe",
  cwd: process.cwd(),
});

let serverReady = false;

server.stdout.on("data", (data) => {
  const output = data.toString();
  console.log(output);

  if (output.includes("Serveur minimal lancé")) {
    serverReady = true;
    testEndpoints();
  }
});

server.stderr.on("data", (data) => {
  console.error("Erreur serveur:", data.toString());
});

async function testEndpoints() {
  try {
    console.log("\n🔍 Test des endpoints...");

    // Test route de base
    const testResponse = await axios.get("http://localhost:5000/test");
    console.log("✅ Route /test:", testResponse.data);

    // Test dashboard national
    const nationalResponse = await axios.get(
      "http://localhost:5000/api/dashboard/national"
    );
    console.log("✅ Dashboard national:", nationalResponse.data);

    // Test dashboard régional
    const regionalResponse = await axios.get(
      "http://localhost:5000/api/dashboard/regional"
    );
    console.log("✅ Dashboard régional:", regionalResponse.data);

    // Test dashboard agent
    const agentResponse = await axios.get(
      "http://localhost:5000/api/dashboard/agent"
    );
    console.log("✅ Dashboard agent:", agentResponse.data);

    console.log("\n🎉 Tous les tests passent ! Le serveur minimal fonctionne.");
  } catch (error) {
    console.error("❌ Erreur lors des tests:", error.message);
  } finally {
    server.kill();
    process.exit(0);
  }
}

// Timeout de sécurité
setTimeout(() => {
  if (!serverReady) {
    console.error("❌ Le serveur minimal n'a pas démarré dans les temps");
    server.kill();
    process.exit(1);
  }
}, 10000);

