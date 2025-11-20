# 🔒 Isolation des rendez-vous par acteur de santé

## Résumé des modifications

Les agents/acteurs de santé voient maintenant **UNIQUEMENT** les rendez-vous de leur propre centre de santé, sans voir les rendez-vous des autres acteurs ni du district.

## Logique de filtrage finale

### 👤 AGENT (Acteur de santé)
- ✅ Voit **UNIQUEMENT** les rendez-vous de **SON** centre de santé
- ✅ Ne voit **PAS** les rendez-vous des autres acteurs
- ✅ Ne voit **PAS** les rendez-vous du district
- ✅ Peut agir sur **TOUS** les rendez-vous qu'il voit (car ce sont les siens)
- ✅ Pas de filtres District/Acteurs (pas nécessaire)
- ✅ Pas de badges de type (pas nécessaire)

### 🏛️ DISTRICT
- ✅ Voit **TOUS** les rendez-vous du district (les siens + ceux des acteurs)
- ✅ Peut agir **UNIQUEMENT** sur ses propres rendez-vous
- ✅ Ne peut que **CONSULTER** les rendez-vous des acteurs (lecture seule)
- ✅ Filtres District/Acteurs disponibles
- ✅ Badges de type affichés (bleu "District" / violet "Acteur")

## Modifications backend

### `appointmentController.ts`

```typescript
// Si l'utilisateur est un AGENT → Filtrage strict par healthCenter
if (user?.role === "agent" && user?.healthCenter) {
  vaccinationFilter.healthCenter = user.healthCenter;
  appointmentFilter.healthCenter = user.healthCenter;
}
// Si l'utilisateur est un DISTRICT → Filtrage par district (tous les centres)
else if (district && typeof district === "string") {
  // ... logique district existante
}
```

## Modifications frontend

### `page.tsx`

1. **fetchAppointments** :
   ```typescript
   // DISTRICT : Passe le paramètre district
   if (user?.role === "district" && user?.healthCenter) {
     url += `?district=${encodeURIComponent(user.healthCenter)}`;
   }
   // AGENT : Pas de paramètre (filtré automatiquement par le backend)
   ```

2. **Messages d'info** :
   - District : "Vous voyez tous les rendez-vous du district (vos RDV + acteurs)"
   - Agent : "Vous voyez uniquement les rendez-vous de votre centre"

3. **Type de rendez-vous** :
   - District : Distinction "district" vs "actor" selon healthCenter
   - Agent : Tous marqués comme "district" (leurs propres RDV)

4. **Actions** :
   - Agent : Toujours activées (ils ne voient que leurs RDV)
   - District : Actives seulement pour leurs RDV, désactivées pour ceux des acteurs

5. **UI spécifique district** :
   - Statistiques District/Acteurs : Visible seulement pour district
   - Filtres District/Acteurs : Visibles seulement pour district
   - Badges de type : Visibles seulement pour district

## Exemples concrets

### Cas 1 : Agent "Case de Santé Mbour"
```
Rendez-vous visibles :
✅ Vaccin BCG - Enfant Fatou - Case de Santé Mbour
✅ Vaccin Polio - Enfant Amadou - Case de Santé Mbour

Rendez-vous NON visibles :
❌ Vaccin Penta - Enfant Marie - Poste de Santé Joal (autre acteur)
❌ Vaccin ROR - Enfant Jean - District Thiès (district)
```

### Cas 2 : District "District Thiès"
```
Rendez-vous visibles :
✅ Vaccin BCG - Enfant Fatou - Case de Santé Mbour (acteur)
✅ Vaccin Polio - Enfant Amadou - Case de Santé Mbour (acteur)
✅ Vaccin Penta - Enfant Marie - Poste de Santé Joal (acteur)
✅ Vaccin ROR - Enfant Jean - District Thiès (district)

Actions disponibles :
✅ Vaccin ROR (District Thiès) → Peut agir
❌ Autres vaccins (acteurs) → Lecture seule
```

## Test

1. **Se connecter en tant qu'AGENT** :
   ```
   Email : agent.mbour@vacxcare.sn
   Centre : Case de Santé Mbour
   ```

2. **Vérifier** :
   - ✅ Voit uniquement les RDV de "Case de Santé Mbour"
   - ✅ Ne voit pas les RDV des autres centres
   - ✅ Ne voit pas les RDV du district
   - ✅ Toutes les actions sont disponibles
   - ✅ Message vert "Vue centre de santé"
   - ✅ Pas de filtres District/Acteurs
   - ✅ Pas de badges de type

3. **Se connecter en tant que DISTRICT** :
   ```
   Email : district.thies@vacxcare.sn
   Centre : District Thiès
   ```

4. **Vérifier** :
   - ✅ Voit tous les RDV du district
   - ✅ Filtres District/Acteurs disponibles
   - ✅ Badges de type affichés
   - ✅ Actions actives pour RDV district
   - ✅ Actions désactivées pour RDV acteurs
   - ✅ Message bleu "Vue district"

## Schéma final

```
┌─────────────────────────────────────────────────────────┐
│                    RENDEZ-VOUS                           │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  👤 AGENT "Case de Santé Mbour"                         │
│  ─────────────────────────────────                       │
│  Filtre backend: healthCenter = "Case de Santé Mbour"   │
│  Voit: 3 rendez-vous                                     │
│  Actions: ✅ Toutes disponibles                          │
│                                                           │
│  🏛️ DISTRICT "District Thiès"                           │
│  ────────────────────────────                            │
│  Filtre backend: district = "District Thiès" OU          │
│                  healthCenter IN [centres du district]   │
│  Voit: 15 rendez-vous (5 district + 10 acteurs)         │
│  Actions: ✅ District (5), ❌ Acteurs (10)               │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

## Résumé des règles

| Rôle     | Voit                    | Peut agir sur          | Filtres        | Badges |
|----------|-------------------------|------------------------|----------------|--------|
| Agent    | Son centre uniquement   | Tous ses RDV           | Non            | Non    |
| District | Tous RDV du district    | Ses RDV uniquement     | Oui            | Oui    |

---

**Date** : 17 novembre 2024  
**Version** : 2.0.0  
**Fonctionnalité** : Isolation des rendez-vous par acteur
