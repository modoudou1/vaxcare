import { Request, Response } from "express";
import mongoose from "mongoose";
import { logger } from "./logger";

/* -------------------------------------------------------------------------- */
/* 📊 Types de métriques                                                     */
/* -------------------------------------------------------------------------- */
export interface HealthCheck {
  service: string;
  status: "healthy" | "unhealthy" | "degraded";
  responseTime: number;
  message?: string;
  details?: any;
}

export interface SystemMetrics {
  timestamp: string;
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
  };
  requests: {
    total: number;
    success: number;
    errors: number;
    averageResponseTime: number;
  };
  database: {
    connections: number;
    status: string;
  };
}

/* -------------------------------------------------------------------------- */
/* 📈 Collecteur de métriques                                                */
/* -------------------------------------------------------------------------- */
class MetricsCollector {
  private requestCount = 0;
  private successCount = 0;
  private errorCount = 0;
  private responseTimes: number[] = [];
  private startTime = Date.now();

  /**
   * Enregistrer une requête
   */
  recordRequest(responseTime: number, success: boolean): void {
    this.requestCount++;
    this.responseTimes.push(responseTime);
    
    if (success) {
      this.successCount++;
    } else {
      this.errorCount++;
    }
    
    // Garder seulement les 1000 derniers temps de réponse
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000);
    }
  }

  /**
   * Obtenir les métriques actuelles
   */
  getMetrics(): SystemMetrics {
    const memUsage = process.memoryUsage();
    const uptime = Date.now() - this.startTime;
    
    return {
      timestamp: new Date().toISOString(),
      uptime,
      memory: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100
      },
      cpu: {
        usage: process.cpuUsage().user / 1000000 // Convertir en secondes
      },
      requests: {
        total: this.requestCount,
        success: this.successCount,
        errors: this.errorCount,
        averageResponseTime: this.responseTimes.length > 0 
          ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length 
          : 0
      },
      database: {
        connections: mongoose.connection.readyState,
        status: this.getDatabaseStatus()
      }
    };
  }

  /**
   * Réinitialiser les métriques
   */
  reset(): void {
    this.requestCount = 0;
    this.successCount = 0;
    this.errorCount = 0;
    this.responseTimes = [];
    this.startTime = Date.now();
  }

  private getDatabaseStatus(): string {
    switch (mongoose.connection.readyState) {
      case 0: return "disconnected";
      case 1: return "connected";
      case 2: return "connecting";
      case 3: return "disconnecting";
      default: return "unknown";
    }
  }
}

/* -------------------------------------------------------------------------- */
/* 🏥 Gestionnaire de health checks                                          */
/* -------------------------------------------------------------------------- */
class HealthCheckManager {
  private checks: Map<string, () => Promise<HealthCheck>> = new Map();

  /**
   * Enregistrer un health check
   */
  register(name: string, check: () => Promise<HealthCheck>): void {
    this.checks.set(name, check);
  }

  /**
   * Exécuter tous les health checks
   */
  async runAll(): Promise<{ status: string; checks: HealthCheck[]; timestamp: string }> {
    const results: HealthCheck[] = [];
    let overallStatus = "healthy";

    for (const [name, check] of this.checks) {
      try {
        const result = await Promise.race([
          check(),
          new Promise<HealthCheck>((_, reject) => 
            setTimeout(() => reject(new Error("Timeout")), 5000)
          )
        ]);
        
        results.push(result);
        
        if (result.status === "unhealthy") {
          overallStatus = "unhealthy";
        } else if (result.status === "degraded" && overallStatus === "healthy") {
          overallStatus = "degraded";
        }
      } catch (error) {
        const failedCheck: HealthCheck = {
          service: name,
          status: "unhealthy",
          responseTime: 5000,
          message: error instanceof Error ? error.message : "Unknown error"
        };
        
        results.push(failedCheck);
        overallStatus = "unhealthy";
      }
    }

    return {
      status: overallStatus,
      checks: results,
      timestamp: new Date().toISOString()
    };
  }
}

/* -------------------------------------------------------------------------- */
/* 🚀 Instances singleton                                                    */
/* -------------------------------------------------------------------------- */
export const metricsCollector = new MetricsCollector();
export const healthCheckManager = new HealthCheckManager();

/* -------------------------------------------------------------------------- */
/* 🔧 Health checks prédéfinis                                               */
/* -------------------------------------------------------------------------- */

/**
 * Health check de la base de données
 */
export const databaseHealthCheck = async (): Promise<HealthCheck> => {
  const startTime = Date.now();
  
  try {
    // Test de ping à la base de données
    if (!mongoose.connection.db) {
      throw new Error('Base de données non connectée');
    }
    await mongoose.connection.db.admin().ping();
    
    const responseTime = Date.now() - startTime;
    
    return {
      service: "database",
      status: "healthy",
      responseTime,
      message: "Base de données accessible",
      details: {
        readyState: mongoose.connection.readyState,
        host: mongoose.connection.host,
        name: mongoose.connection.name
      }
    };
  } catch (error) {
    return {
      service: "database",
      status: "unhealthy", 
      responseTime: Date.now() - startTime,
      message: error instanceof Error ? error.message : "Erreur de base de données"
    };
  }
};

/**
 * Health check de la mémoire
 */
export const memoryHealthCheck = async (): Promise<HealthCheck> => {
  const startTime = Date.now();
  const memUsage = process.memoryUsage();
  const memoryPercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  
  let status: "healthy" | "degraded" | "unhealthy" = "healthy";
  let message = "Utilisation mémoire normale";
  
  if (memoryPercentage > 90) {
    status = "unhealthy";
    message = "Utilisation mémoire critique";
  } else if (memoryPercentage > 75) {
    status = "degraded";
    message = "Utilisation mémoire élevée";
  }
  
  return {
    service: "memory",
    status,
    responseTime: Date.now() - startTime,
    message,
    details: {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      percentage: memoryPercentage
    }
  };
};

/**
 * Health check du système de fichiers
 */
export const diskHealthCheck = async (): Promise<HealthCheck> => {
  const startTime = Date.now();
  
  try {
    const fs = require('fs').promises;
    const testFile = '/tmp/health-check-test';
    
    // Test d'écriture
    await fs.writeFile(testFile, 'test');
    await fs.unlink(testFile);
    
    return {
      service: "disk",
      status: "healthy",
      responseTime: Date.now() - startTime,
      message: "Système de fichiers accessible"
    };
  } catch (error) {
    return {
      service: "disk",
      status: "unhealthy",
      responseTime: Date.now() - startTime,
      message: error instanceof Error ? error.message : "Erreur système de fichiers"
    };
  }
};

/* -------------------------------------------------------------------------- */
/* 🔧 Middleware de monitoring                                               */
/* -------------------------------------------------------------------------- */
export const monitoringMiddleware = (req: Request, res: Response, next: any) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    const success = res.statusCode < 400;
    
    metricsCollector.recordRequest(responseTime, success);
    
    // Logger les requêtes lentes
    if (responseTime > 1000) {
      logger.warn('Requête lente détectée', {
        method: req.method,
        url: req.url,
        responseTime,
        statusCode: res.statusCode,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });
    }
  });
  
  next();
};

/* -------------------------------------------------------------------------- */
/* 🔧 Routes de monitoring                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Route de health check
 */
export const healthCheckRoute = async (req: Request, res: Response) => {
  try {
    const healthStatus = await healthCheckManager.runAll();
    const statusCode = healthStatus.status === "healthy" ? 200 : 
                      healthStatus.status === "degraded" ? 200 : 503;
    
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    logger.error('Erreur health check', { error });
    res.status(503).json({
      status: "unhealthy",
      message: "Erreur lors du health check",
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Route des métriques
 */
export const metricsRoute = (req: Request, res: Response) => {
  try {
    const metrics = metricsCollector.getMetrics();
    res.json(metrics);
  } catch (error) {
    logger.error('Erreur métriques', { error });
    res.status(500).json({
      error: "Erreur lors de la récupération des métriques"
    });
  }
};

/**
 * Route de readiness (prêt à recevoir du trafic)
 */
export const readinessRoute = async (req: Request, res: Response) => {
  try {
    // Vérifier seulement les services critiques
    const dbCheck = await databaseHealthCheck();
    
    if (dbCheck.status === "healthy") {
      res.status(200).json({ status: "ready" });
    } else {
      res.status(503).json({ status: "not ready", reason: dbCheck.message });
    }
  } catch (error) {
    res.status(503).json({ status: "not ready", reason: "Service unavailable" });
  }
};

/**
 * Route de liveness (processus vivant)
 */
export const livenessRoute = (req: Request, res: Response) => {
  res.status(200).json({ 
    status: "alive",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
};

/* -------------------------------------------------------------------------- */
/* 🔧 Initialisation du monitoring                                           */
/* -------------------------------------------------------------------------- */
export const initializeMonitoring = () => {
  // Enregistrer les health checks par défaut
  healthCheckManager.register("database", databaseHealthCheck);
  healthCheckManager.register("memory", memoryHealthCheck);
  healthCheckManager.register("disk", diskHealthCheck);
  
  // Health check périodique (toutes les 30 secondes)
  setInterval(async () => {
    try {
      const healthStatus = await healthCheckManager.runAll();
      
      if (healthStatus.status !== "healthy") {
        logger.warn('Health check dégradé', {
          status: healthStatus.status,
          checks: healthStatus.checks.filter(c => c.status !== "healthy")
        });
      }
    } catch (error) {
      logger.error('Erreur health check périodique', { error });
    }
  }, 30000);
  
  // Métriques périodiques (toutes les 5 minutes)
  setInterval(() => {
    const metrics = metricsCollector.getMetrics();
    logger.info('Métriques système', metrics);
  }, 5 * 60 * 1000);
  
  logger.info('Monitoring initialisé');
};
