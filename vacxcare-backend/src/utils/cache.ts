import { Request, Response, NextFunction } from "express";

/* -------------------------------------------------------------------------- */
/* 🗄️ Interface du cache                                                     */
/* -------------------------------------------------------------------------- */
export interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number; // Time to live en millisecondes
}

export interface CacheOptions {
  ttl?: number; // Durée de vie en millisecondes (défaut: 5 minutes)
  keyGenerator?: (req: Request) => string;
  condition?: (req: Request) => boolean;
}

/* -------------------------------------------------------------------------- */
/* 🧠 Gestionnaire de cache en mémoire                                       */
/* -------------------------------------------------------------------------- */
class MemoryCache {
  private cache: Map<string, CacheEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Nettoyage automatique toutes les 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Obtenir une valeur du cache
   */
  get(key: string): any | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Vérifier si l'entrée a expiré
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  /**
   * Définir une valeur dans le cache
   */
  set(key: string, data: any, ttl: number = 5 * 60 * 1000): void {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl
    };
    
    this.cache.set(key, entry);
  }

  /**
   * Supprimer une clé du cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Supprimer toutes les clés qui correspondent à un pattern
   */
  deletePattern(pattern: string): number {
    let deletedCount = 0;
    const regex = new RegExp(pattern);
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    
    return deletedCount;
  }

  /**
   * Vider tout le cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Nettoyer les entrées expirées
   */
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cache nettoyé: ${cleanedCount} entrées supprimées`);
    }
  }

  /**
   * Obtenir les statistiques du cache
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Détruire le cache et arrêter le nettoyage automatique
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
  }
}

/* -------------------------------------------------------------------------- */
/* 🚀 Instance singleton du cache                                            */
/* -------------------------------------------------------------------------- */
export const cache = new MemoryCache();

/* -------------------------------------------------------------------------- */
/* 🔧 Générateurs de clés de cache                                           */
/* -------------------------------------------------------------------------- */
export class CacheKeyGenerator {
  /**
   * Clé basée sur la route et les paramètres de requête
   */
  static routeWithQuery(req: Request): string {
    const route = req.route?.path || req.path;
    const query = JSON.stringify(req.query);
    const userId = (req as any).user?.id || 'anonymous';
    return `route:${route}:${userId}:${query}`;
  }

  /**
   * Clé basée sur l'utilisateur et la route
   */
  static userRoute(req: Request): string {
    const route = req.route?.path || req.path;
    const userId = (req as any).user?.id || 'anonymous';
    return `user:${userId}:route:${route}`;
  }

  /**
   * Clé pour les statistiques d'un utilisateur
   */
  static userStats(req: Request): string {
    const userId = (req as any).user?.id || 'anonymous';
    return `stats:user:${userId}`;
  }

  /**
   * Clé pour les données d'un enfant
   */
  static childData(childId: string): string {
    return `child:${childId}`;
  }

  /**
   * Clé pour les vaccinations d'un enfant
   */
  static childVaccinations(childId: string): string {
    return `vaccinations:child:${childId}`;
  }

  /**
   * Clé pour les rendez-vous d'un enfant
   */
  static childAppointments(childId: string): string {
    return `appointments:child:${childId}`;
  }

  /**
   * Clé pour les statistiques globales
   */
  static globalStats(type: string): string {
    return `stats:global:${type}`;
  }
}

/* -------------------------------------------------------------------------- */
/* 🔧 Middleware de cache pour Express                                       */
/* -------------------------------------------------------------------------- */
export const cacheMiddleware = (options: CacheOptions = {}) => {
  const {
    ttl = 5 * 60 * 1000, // 5 minutes par défaut
    keyGenerator = CacheKeyGenerator.routeWithQuery,
    condition = () => true
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    // Vérifier si le cache doit être utilisé
    if (!condition(req) || req.method !== 'GET') {
      return next();
    }

    const cacheKey = keyGenerator(req);
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
      console.log(`💾 Cache hit: ${cacheKey}`);
      return res.json(cachedData);
    }

    // Intercepter la réponse pour la mettre en cache
    const originalJson = res.json;
    res.json = function(data: any) {
      // Mettre en cache seulement les réponses réussies
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(cacheKey, data, ttl);
        console.log(`💾 Cache set: ${cacheKey}`);
      }
      
      return originalJson.call(this, data);
    };

    next();
  };
};

/* -------------------------------------------------------------------------- */
/* 🔧 Utilitaires de cache spécialisés                                       */
/* -------------------------------------------------------------------------- */
export class CacheUtils {
  /**
   * Invalider le cache pour un enfant spécifique
   */
  static invalidateChildCache(childId: string): void {
    cache.delete(CacheKeyGenerator.childData(childId));
    cache.delete(CacheKeyGenerator.childVaccinations(childId));
    cache.delete(CacheKeyGenerator.childAppointments(childId));
    
    // Invalider aussi les caches liés aux statistiques
    cache.deletePattern(`stats:.*`);
    
    console.log(`🗑️ Cache invalidé pour l'enfant: ${childId}`);
  }

  /**
   * Invalider le cache pour un utilisateur spécifique
   */
  static invalidateUserCache(userId: string): void {
    cache.deletePattern(`user:${userId}:.*`);
    cache.delete(CacheKeyGenerator.userStats({ user: { id: userId } } as any));
    
    console.log(`🗑️ Cache invalidé pour l'utilisateur: ${userId}`);
  }

  /**
   * Invalider tous les caches de statistiques
   */
  static invalidateStatsCache(): void {
    cache.deletePattern(`stats:.*`);
    console.log(`🗑️ Cache des statistiques invalidé`);
  }

  /**
   * Invalider le cache pour une route spécifique
   */
  static invalidateRouteCache(route: string): void {
    cache.deletePattern(`route:${route}:.*`);
    console.log(`🗑️ Cache invalidé pour la route: ${route}`);
  }

  /**
   * Précharger le cache avec des données
   */
  static preloadCache(key: string, data: any, ttl?: number): void {
    cache.set(key, data, ttl);
    console.log(`⚡ Cache préchargé: ${key}`);
  }

  /**
   * Obtenir les statistiques du cache
   */
  static getCacheStats(): { size: number; keys: string[] } {
    return cache.getStats();
  }
}

/* -------------------------------------------------------------------------- */
/* 🔧 Configurations de cache prédéfinies                                    */
/* -------------------------------------------------------------------------- */
export const CacheConfigs = {
  // Cache court pour les données fréquemment modifiées
  short: {
    ttl: 1 * 60 * 1000, // 1 minute
    keyGenerator: CacheKeyGenerator.routeWithQuery
  },
  
  // Cache moyen pour les données modérément stables
  medium: {
    ttl: 5 * 60 * 1000, // 5 minutes
    keyGenerator: CacheKeyGenerator.routeWithQuery
  },
  
  // Cache long pour les données stables
  long: {
    ttl: 30 * 60 * 1000, // 30 minutes
    keyGenerator: CacheKeyGenerator.routeWithQuery
  },
  
  // Cache pour les statistiques utilisateur
  userStats: {
    ttl: 10 * 60 * 1000, // 10 minutes
    keyGenerator: CacheKeyGenerator.userStats,
    condition: (req: Request) => !!(req as any).user?.id
  },
  
  // Cache pour les données d'enfant
  childData: {
    ttl: 15 * 60 * 1000, // 15 minutes
    keyGenerator: (req: Request) => {
      const childId = req.params.id || req.params.childId;
      return CacheKeyGenerator.childData(childId);
    },
    condition: (req: Request) => !!(req.params.id || req.params.childId)
  }
};
