import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  createHealthTip,
  getHealthTips,
  getHealthTipById,
  updateHealthTip,
  deleteHealthTip,
  getHealthTipsStats,
} from '../controllers/healthTipController';
import { authMiddleware, roleCheck } from '../middleware/auth';

const router = express.Router();

// Configuration de multer pour l'upload de médias
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/health-tips');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req: any, file: any, cb: any) => {
  // Accepter images, vidéos et PDFs
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo',
    'application/pdf',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Type de fichier non supporté. Formats acceptés: JPG, PNG, GIF, WEBP, MP4, MOV, AVI, PDF'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
});

// 📤 Upload d'un média pour un conseil de santé
router.post('/upload-media', authMiddleware, roleCheck('national', 'regional'), upload.single('media'), (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier fourni',
      });
    }

    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    const mediaUrl = `${baseUrl}/uploads/health-tips/${req.file.filename}`;

    // Déterminer le type de média
    let mediaType: 'image' | 'video' | 'pdf' = 'image';
    if (req.file.mimetype.startsWith('video/')) {
      mediaType = 'video';
    } else if (req.file.mimetype === 'application/pdf') {
      mediaType = 'pdf';
    }

    console.log(`✅ Média uploadé: ${req.file.filename} (${mediaType})`);

    res.json({
      success: true,
      message: 'Média uploadé avec succès',
      media: {
        type: mediaType,
        url: mediaUrl,
        filename: req.file.filename,
      },
    });
  } catch (error: any) {
    console.error('❌ Erreur upload média:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'upload du média',
      error: error.message,
    });
  }
});

// 📊 Statistiques (avant les routes avec :id)
router.get('/stats', authMiddleware, roleCheck('national', 'regional'), getHealthTipsStats);

// 📝 Créer un conseil de santé
router.post('/', authMiddleware, roleCheck('national', 'regional'), createHealthTip);

// 📋 Obtenir tous les conseils de santé
router.get('/', getHealthTips);

// 🔍 Obtenir un conseil par ID
router.get('/:id', getHealthTipById);

// ✏️ Modifier un conseil
router.put('/:id', authMiddleware, roleCheck('national', 'regional'), updateHealthTip);

// 🗑️ Supprimer un conseil
router.delete('/:id', authMiddleware, roleCheck('national'), deleteHealthTip);

export default router;
