# Modifications à apporter pour le filtrage District/Acteurs des rendez-vous

## Résumé
Ajouter la même logique que pour les enfants :
- Filtre "Tous / District / Acteurs"
- Statistiques par type
- Badge visuel pour distinguer
- Actions désactivées pour rendez-vous d'acteurs (lecture seule)

## Modifications effectuées

### 1. Interface Appointment ✅
- Ajout champ `healthCenter?: string`
- Ajout champ `type?: "district" | "actor"`

### 2. État typeFilter ✅
- `const [typeFilter, setTypeFilter] = useState<"all" | "district" | "actor">("all");`

### 3. Détermination du type ✅
Dans `fetchAppointments` :
```typescript
const healthCenter = apt.healthCenter || "";
const userHealthCenter = user?.healthCenter || "";
const type: "district" | "actor" = healthCenter === userHealthCenter ? "district" : "actor";
```

### 4. Filtrage par type ✅
Dans `filteredAppointments` :
```typescript
const matchesTypeFilter = typeFilter === "all" || apt.type === typeFilter;
const result = matchesFilter && matchesTypeFilter && matchesSearch && matchesDate;
```

### 5. Dépendances useMemo ✅
```typescript
}, [appointments, filter, typeFilter, searchTerm, dateFilter, startDate, endDate]);
```

## Modifications à faire manuellement

### 6. Ajouter statistiques par type (après ligne 423)
```tsx
{/* Statistiques District vs Acteurs (seulement pour district) */}
{user?.role === "district" && (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm border border-blue-200 p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setTypeFilter("district")}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-blue-700 mb-1 font-medium flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Mes rendez-vous (District)
          </p>
          <p className="text-3xl font-bold text-blue-900">
            {appointments.filter(a => a.type === "district").length}
          </p>
          <p className="text-xs text-blue-600 mt-1">Actions disponibles</p>
        </div>
        <Calendar className="h-12 w-12 text-blue-300" />
      </div>
    </div>
    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-sm border border-purple-200 p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setTypeFilter("actor")}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-purple-700 mb-1 font-medium flex items-center gap-2">
            <User className="h-4 w-4" />
            Rendez-vous acteurs de santé
          </p>
          <p className="text-3xl font-bold text-purple-900">
            {appointments.filter(a => a.type === "actor").length}
          </p>
          <p className="text-xs text-purple-600 mt-1">Lecture seule</p>
        </div>
        <MapPin className="h-12 w-12 text-purple-300" />
      </div>
    </div>
  </div>
)}
```

### 7. Ajouter filtres de type (après les filtres de statut, ligne 472)
```tsx
{/* Filtre de type (seulement pour district) */}
{user?.role === "district" && (
  <div className="flex gap-2 border-l border-gray-300 pl-4">
    <button
      onClick={() => setTypeFilter("all")}
      className={`px-4 py-2.5 rounded-lg font-medium transition-colors ${
        typeFilter === "all"
          ? "bg-gray-600 text-white"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      }`}
    >
      Tous
    </button>
    <button
      onClick={() => setTypeFilter("district")}
      className={`px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 ${
        typeFilter === "district"
          ? "bg-blue-600 text-white"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      }`}
    >
      <Shield className="h-4 w-4" />
      District
    </button>
    <button
      onClick={() => setTypeFilter("actor")}
      className={`px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 ${
        typeFilter === "actor"
          ? "bg-purple-600 text-white"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      }`}
    >
      <User className="h-4 w-4" />
      Acteurs
    </button>
  </div>
)}
```

### 8. Ajouter badge de type dans l'affichage de chaque rendez-vous
Dans la liste des rendez-vous, après le badge de statut, ajouter :
```tsx
{user?.role === "district" && appointment.type && (
  <>
    {appointment.type === "district" ? (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
        <Shield className="h-3 w-3" />
        District
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
        <User className="h-3 w-3" />
        Acteur
      </span>
    )}
  </>
)}
```

### 9. Désactiver les actions pour rendez-vous d'acteurs
Modifier les boutons d'action (Fait, Raté, Annuler) :
```tsx
const isActorAppointment = user?.role === "district" && appointment.type === "actor";
const canPerformAction = !isActorAppointment;

// Pour chaque bouton d'action, ajouter :
disabled={!canPerformAction || actionLoading}
className={`... ${!canPerformAction ? 'opacity-50 cursor-not-allowed' : ''}`}
title={!canPerformAction ? "Actions non disponibles pour les rendez-vous des acteurs" : ""}
```

### 10. Message info pour rendez-vous d'acteurs
Dans le modal de détails, si c'est un rendez-vous d'acteur :
```tsx
{user?.role === "district" && selectedAppointment?.type === "actor" && (
  <div className="mb-4 bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm text-purple-800">
    <p className="font-medium flex items-center gap-2">
      <AlertCircle className="h-4 w-4" />
      Rendez-vous d'un acteur de santé
    </p>
    <p className="mt-1 text-xs">
      Vous pouvez uniquement consulter ce rendez-vous. Les actions (compléter, manquer, annuler) sont réservées au centre de santé : <strong>{selectedAppointment.healthCenter}</strong>
    </p>
  </div>
)}
```

## Ordre d'application

1. ✅ Les modifications 1-5 sont déjà faites
2. Ajouter la section statistiques (#6)
3. Ajouter les filtres de type (#7)
4. Ajouter les badges de type (#8)
5. Désactiver les actions (#9)
6. Ajouter le message info (#10)

## Test

1. Se connecter avec un compte district
2. Programmer une vaccination directement au district
3. Les rendez-vous devraient avoir un badge bleu "District"
4. Les actions (Fait, Raté, Annuler) doivent être disponibles
5. Les rendez-vous des acteurs doivent avoir un badge violet "Acteur"
6. Les actions doivent être désactivées pour les rendez-vous des acteurs
7. Les filtres "District" et "Acteurs" doivent fonctionner
8. Les statistiques doivent être correctes
