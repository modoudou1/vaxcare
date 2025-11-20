// ✅ FONCTION CORRIGÉE À COPIER DANS ChildDetailsModal.tsx

/** Marquer comme raté */
async function handleMarkMissed(id: string) {
  if (!confirm("Confirmer que ce vaccin est raté ?")) return;
  try {
    const vaccinationRes = await fetch(`${BASE}/api/vaccinations/${id}/missed`, {
      method: "PUT",
      credentials: "include",
    });

    if (!vaccinationRes.ok) throw new Error();
    
    const result = await vaccinationRes.json();
    console.log("✅ Vaccin marqué comme raté:", result);

    // Met à jour l'enfant côté backend (statut et prochain RDV)
    const childRes = await fetch(
      `${BASE}/api/children/${getChildId(child)}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          status: "Pas à jour",
          nextAppointment: null, // pour afficher "Pas encore programmé"
        }),
      }
    );

    if (!childRes.ok) throw new Error();

    alert("Vaccin marqué comme raté ❌ - Notification envoyée aux parents");
    child.status = "Pas à jour";
    child.nextAppointment = null;
    onUpdate(child);
    
    // Recharger les vaccinations pour voir le changement de statut
    await loadVaccinations();
  } catch (e) {
    console.error("Erreur markMissed", e);
    alert("Erreur lors de la mise à jour");
  }
}

// INSTRUCTIONS :
// 1. Ouvrez ChildDetailsModal.tsx
// 2. Trouvez la fonction handleMarkMissed (vers ligne 630-650)
// 3. Remplacez-la par la fonction ci-dessus
// 4. Assurez-vous que la syntaxe est correcte (accolades, try/catch)
// 5. Sauvegardez le fichier
