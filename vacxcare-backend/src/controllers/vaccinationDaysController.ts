import { Request, Response } from 'express';
import VaccinationDays from '../models/VaccinationDays';
import { AuthRequest } from '../middleware/auth';

// Créer ou mettre à jour les jours de vaccination d'un utilisateur
export const saveVaccinationDays = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Utilisateur non authentifié' });
    }

    // Seuls les districts et agents peuvent configurer leurs jours
    if (!['district', 'agent'].includes(user.role)) {
      return res.status(403).json({ 
        error: 'Accès refusé', 
        message: 'Seuls les districts et agents peuvent configurer leurs jours de vaccination' 
      });
    }

    const {
      vaccinationDays,
      timeSlots,
      notes,
      isActive = true
    } = req.body;

    // Validation des jours de vaccination
    if (!vaccinationDays || typeof vaccinationDays !== 'object') {
      return res.status(400).json({ 
        error: 'Données invalides', 
        message: 'Les jours de vaccination sont requis' 
      });
    }

    // Vérifier qu'au moins un jour est sélectionné
    const selectedDays = Object.values(vaccinationDays).filter(Boolean);
    if (selectedDays.length === 0) {
      return res.status(400).json({ 
        error: 'Validation échouée', 
        message: 'Au moins un jour de vaccination doit être sélectionné' 
      });
    }

    // Chercher un planning existant ou en créer un nouveau
    let vaccinationDaysDoc = await VaccinationDays.findOne({ userId: user._id });

    // Debug log pour voir les données utilisateur
    console.log('🔍 Debug user data:', {
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      healthCenter: user.healthCenter,
      region: user.region
    });
    
    const userName = user.name || 
                    `${user.firstName || ''} ${user.lastName || ''}`.trim() || 
                    user.email.split('@')[0] || 
                    'Utilisateur';
    
    console.log('✅ Nom utilisateur calculé:', userName);

    const planningData = {
      userId: user._id,
      userName: userName,
      userRole: user.role as 'district' | 'agent',
      healthCenter: user.healthCenter,
      region: user.region,
      vaccinationDays,
      timeSlots: timeSlots || {
        morning: {
          enabled: true,
          startTime: '08:00',
          endTime: '12:00'
        },
        afternoon: {
          enabled: true,
          startTime: '14:00',
          endTime: '17:00'
        }
      },
      notes,
      isActive
    };

    if (vaccinationDaysDoc) {
      // Mettre à jour le planning existant
      Object.assign(vaccinationDaysDoc, planningData);
      await vaccinationDaysDoc.save();
      
      console.log(`✅ Planning vaccination mis à jour pour ${user.name} (${user.role})`);
    } else {
      // Créer un nouveau planning
      vaccinationDaysDoc = new VaccinationDays(planningData);
      await vaccinationDaysDoc.save();
      
      console.log(`✅ Nouveau planning vaccination créé pour ${user.name} (${user.role})`);
    }

    res.status(200).json({
      success: true,
      message: 'Planning de vaccination enregistré avec succès',
      data: vaccinationDaysDoc
    });

  } catch (error) {
    console.error('❌ Erreur sauvegarde planning vaccination:', error);
    res.status(500).json({ 
      error: 'Erreur serveur', 
      message: 'Impossible d\'enregistrer le planning de vaccination' 
    });
  }
};

// Récupérer les jours de vaccination d'un utilisateur
export const getVaccinationDays = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Utilisateur non authentifié' });
    }

    const vaccinationDays = await VaccinationDays.findOne({ userId: user._id });

    if (!vaccinationDays) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'Aucun planning de vaccination configuré'
      });
    }

    res.status(200).json({
      success: true,
      data: vaccinationDays
    });

  } catch (error) {
    console.error('❌ Erreur récupération planning vaccination:', error);
    res.status(500).json({ 
      error: 'Erreur serveur', 
      message: 'Impossible de récupérer le planning de vaccination' 
    });
  }
};

// Récupérer les plannings de vaccination pour un district (pour les régionaux)
export const getDistrictVaccinationDays = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Utilisateur non authentifié' });
    }

    // Seuls les régionaux peuvent voir les plannings de leur région
    if (user.role !== 'regional') {
      return res.status(403).json({ 
        error: 'Accès refusé', 
        message: 'Seuls les régionaux peuvent voir les plannings de vaccination' 
      });
    }

    const { district } = req.params;
    if (!district) {
      return res.status(400).json({ 
        error: 'Paramètre manquant', 
        message: 'Le district est requis' 
      });
    }

    // Chercher tous les plannings du district dans la région de l'utilisateur
    const vaccinationDays = await VaccinationDays.find({
      region: user.region,
      $or: [
        { healthCenter: district }, // District lui-même
        { healthCenter: { $regex: district, $options: 'i' } } // Agents du district
      ],
      isActive: true
    }).sort({ userRole: 1, userName: 1 });

    res.status(200).json({
      success: true,
      data: vaccinationDays,
      count: vaccinationDays.length
    });

  } catch (error) {
    console.error('❌ Erreur récupération plannings district:', error);
    res.status(500).json({ 
      error: 'Erreur serveur', 
      message: 'Impossible de récupérer les plannings du district' 
    });
  }
};

// Supprimer le planning de vaccination
export const deleteVaccinationDays = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Utilisateur non authentifié' });
    }

    const vaccinationDays = await VaccinationDays.findOneAndDelete({ userId: user._id });

    if (!vaccinationDays) {
      return res.status(404).json({ 
        error: 'Planning introuvable', 
        message: 'Aucun planning de vaccination à supprimer' 
      });
    }

    console.log(`✅ Planning vaccination supprimé pour ${user.name}`);

    res.status(200).json({
      success: true,
      message: 'Planning de vaccination supprimé avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur suppression planning vaccination:', error);
    res.status(500).json({ 
      error: 'Erreur serveur', 
      message: 'Impossible de supprimer le planning de vaccination' 
    });
  }
};
