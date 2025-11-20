import { Request, Response } from 'express';
import HealthTip from '../models/HealthTip';
import { sendSocketNotification } from '../utils/socketManager';

/**
 * 📝 Créer un conseil de santé
 * POST /api/health-tips
 */
export const createHealthTip = async (req: Request, res: Response) => {
  try {
    const { title, description, category, targetAgeGroup, priority, media } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Le titre et la description sont obligatoires',
      });
    }

    const healthTip = new HealthTip({
      title,
      description,
      category: category || 'general',
      targetAgeGroup: targetAgeGroup || 'Tous',
      priority: priority || 'medium',
      media: media || undefined,
      isActive: true,
      createdBy: userId,
    });

    await healthTip.save();

    // 📡 Envoyer une notification Socket.io aux parents
    const io = (req as any).io;
    if (io) {
      await sendSocketNotification(io, ['parent', 'all'], {
        title: '💡 Nouveau conseil de santé',
        message: title,
        icon: '💡',
        type: 'health_tip',
        metadata: {
          healthTipId: (healthTip._id as any).toString(),
          category,
        },
      });
    }

    console.log(`✅ Conseil de santé créé: ${title} (${category})`);

    res.status(201).json({
      success: true,
      message: 'Conseil de santé créé avec succès',
      healthTip,
    });
  } catch (error: any) {
    console.error('❌ Erreur création conseil de santé:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du conseil',
      error: error.message,
    });
  }
};

/**
 * 📋 Obtenir tous les conseils de santé (avec filtres)
 * GET /api/health-tips
 */
export const getHealthTips = async (req: Request, res: Response) => {
  try {
    const { category, isActive, limit = 50, skip = 0 } = req.query;

    const filter: any = {};
    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const healthTips = await HealthTip.find(filter)
      .sort({ priority: -1, createdAt: -1 })
      .limit(Number(limit))
      .skip(Number(skip))
      .populate('createdBy', 'name email role')
      .lean();

    const total = await HealthTip.countDocuments(filter);

    res.json({
      success: true,
      healthTips,
      pagination: {
        total,
        limit: Number(limit),
        skip: Number(skip),
        hasMore: total > Number(skip) + Number(limit),
      },
    });
  } catch (error: any) {
    console.error('❌ Erreur récupération conseils:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des conseils',
      error: error.message,
    });
  }
};

/**
 * 🔍 Obtenir un conseil de santé par ID
 * GET /api/health-tips/:id
 */
export const getHealthTipById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const healthTip = await HealthTip.findById(id)
      .populate('createdBy', 'name email role')
      .lean();

    if (!healthTip) {
      return res.status(404).json({
        success: false,
        message: 'Conseil de santé non trouvé',
      });
    }

    // Incrémenter le compteur de vues
    await HealthTip.findByIdAndUpdate(id, { $inc: { views: 1 } });

    res.json({
      success: true,
      healthTip,
    });
  } catch (error: any) {
    console.error('❌ Erreur récupération conseil:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du conseil',
      error: error.message,
    });
  }
};

/**
 * ✏️ Modifier un conseil de santé
 * PUT /api/health-tips/:id
 */
export const updateHealthTip = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, category, targetAgeGroup, priority, isActive, media } = req.body;

    const healthTip = await HealthTip.findById(id);

    if (!healthTip) {
      return res.status(404).json({
        success: false,
        message: 'Conseil de santé non trouvé',
      });
    }

    // Mettre à jour les champs
    if (title !== undefined) healthTip.title = title;
    if (description !== undefined) healthTip.description = description;
    if (category !== undefined) healthTip.category = category;
    if (targetAgeGroup !== undefined) healthTip.targetAgeGroup = targetAgeGroup;
    if (priority !== undefined) healthTip.priority = priority;
    if (isActive !== undefined) healthTip.isActive = isActive;
    if (media !== undefined) healthTip.media = media;

    await healthTip.save();

    console.log(`✅ Conseil de santé modifié: ${id}`);

    res.json({
      success: true,
      message: 'Conseil de santé modifié avec succès',
      healthTip,
    });
  } catch (error: any) {
    console.error('❌ Erreur modification conseil:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la modification du conseil',
      error: error.message,
    });
  }
};

/**
 * 🗑️ Supprimer un conseil de santé
 * DELETE /api/health-tips/:id
 */
export const deleteHealthTip = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const healthTip = await HealthTip.findByIdAndDelete(id);

    if (!healthTip) {
      return res.status(404).json({
        success: false,
        message: 'Conseil de santé non trouvé',
      });
    }

    console.log(`✅ Conseil de santé supprimé: ${id}`);

    res.json({
      success: true,
      message: 'Conseil de santé supprimé avec succès',
    });
  } catch (error: any) {
    console.error('❌ Erreur suppression conseil:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du conseil',
      error: error.message,
    });
  }
};

/**
 * 📊 Obtenir les statistiques des conseils
 * GET /api/health-tips/stats
 */
export const getHealthTipsStats = async (req: Request, res: Response) => {
  try {
    const total = await HealthTip.countDocuments();
    const active = await HealthTip.countDocuments({ isActive: true });
    const byCategory = await HealthTip.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);
    const totalViews = await HealthTip.aggregate([
      { $group: { _id: null, total: { $sum: '$views' } } },
    ]);

    res.json({
      success: true,
      stats: {
        total,
        active,
        inactive: total - active,
        byCategory,
        totalViews: totalViews[0]?.total || 0,
      },
    });
  } catch (error: any) {
    console.error('❌ Erreur statistiques conseils:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
      error: error.message,
    });
  }
};
