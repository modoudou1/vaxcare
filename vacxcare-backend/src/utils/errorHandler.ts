import { Request, Response, NextFunction } from "express";
import { logger } from "./logger";

/* -------------------------------------------------------------------------- */
/* 🚨 Types d'erreurs personnalisées                                         */
/* -------------------------------------------------------------------------- */
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Non authentifié') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Non autorisé') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Ressource non trouvée') {
    super(message, 404, 'NOT_FOUND_ERROR');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Conflit de données') {
    super(message, 409, 'CONFLICT_ERROR');
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Trop de requêtes') {
    super(message, 429, 'RATE_LIMIT_ERROR');
    this.name = 'RateLimitError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Erreur de base de données') {
    super(message, 500, 'DATABASE_ERROR');
    this.name = 'DatabaseError';
  }
}

export class ExternalServiceError extends AppError {
  constructor(message: string = 'Erreur de service externe') {
    super(message, 502, 'EXTERNAL_SERVICE_ERROR');
    this.name = 'ExternalServiceError';
  }
}

/* -------------------------------------------------------------------------- */
/* 🔧 Utilitaires de gestion d'erreurs                                       */
/* -------------------------------------------------------------------------- */
export class ErrorUtils {
  /**
   * Vérifier si une erreur est opérationnelle
   */
  static isOperationalError(error: Error): boolean {
    if (error instanceof AppError) {
      return error.isOperational;
    }
    return false;
  }

  /**
   * Extraire les informations d'erreur MongoDB
   */
  static handleMongoError(error: any): AppError {
    if (error.code === 11000) {
      // Erreur de duplication
      const field = Object.keys(error.keyValue)[0];
      const value = error.keyValue[field];
      return new ConflictError(`${field} '${value}' existe déjà`);
    }
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      return new ValidationError(`Erreurs de validation: ${messages.join(', ')}`);
    }
    
    if (error.name === 'CastError') {
      return new ValidationError(`Format invalide pour le champ ${error.path}: ${error.value}`);
    }
    
    return new DatabaseError(error.message);
  }

  /**
   * Extraire les informations d'erreur JWT
   */
  static handleJWTError(error: any): AppError {
    if (error.name === 'JsonWebTokenError') {
      return new AuthenticationError('Token invalide');
    }
    
    if (error.name === 'TokenExpiredError') {
      return new AuthenticationError('Token expiré');
    }
    
    return new AuthenticationError('Erreur d\'authentification');
  }

  /**
   * Formater une erreur pour la réponse API
   */
  static formatErrorResponse(error: AppError, includeStack: boolean = false): any {
    const response: any = {
      error: error.message,
      code: error.code,
      timestamp: new Date().toISOString()
    };

    if (includeStack && process.env.NODE_ENV !== 'production') {
      response.stack = error.stack;
    }

    return response;
  }
}

/* -------------------------------------------------------------------------- */
/* 🔧 Middleware de gestion d'erreurs global                                 */
/* -------------------------------------------------------------------------- */
export const globalErrorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let appError: AppError;

  // Convertir les erreurs connues en AppError
  if (error instanceof AppError) {
    appError = error;
  } else if (error.name === 'MongoError' || error.name === 'ValidationError' || error.name === 'CastError') {
    appError = ErrorUtils.handleMongoError(error);
  } else if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    appError = ErrorUtils.handleJWTError(error);
  } else {
    // Erreur inconnue
    appError = new AppError(
      process.env.NODE_ENV === 'production' ? 'Erreur interne du serveur' : error.message,
      500,
      'INTERNAL_ERROR'
    );
  }

  // Logger l'erreur
  logger.error('Erreur API', {
    message: appError.message,
    statusCode: appError.statusCode,
    code: appError.code,
    stack: appError.stack,
    url: req.url,
    method: req.method,
    userId: (req as any).user?.id,
    ip: req.ip
  });

  // Envoyer la réponse d'erreur
  const includeStack = process.env.NODE_ENV !== 'production';
  const errorResponse = ErrorUtils.formatErrorResponse(appError, includeStack);

  res.status(appError.statusCode).json(errorResponse);
};

/* -------------------------------------------------------------------------- */
/* 🔧 Middleware de gestion des routes non trouvées                          */
/* -------------------------------------------------------------------------- */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new NotFoundError(`Route ${req.method} ${req.originalUrl} non trouvée`);
  next(error);
};

/* -------------------------------------------------------------------------- */
/* 🔧 Wrapper pour les fonctions async                                       */
/* -------------------------------------------------------------------------- */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/* -------------------------------------------------------------------------- */
/* 🔄 Système de retry pour les opérations externes                          */
/* -------------------------------------------------------------------------- */
export class RetryHelper {
  /**
   * Exécuter une fonction avec retry automatique
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    options: {
      maxRetries?: number;
      delay?: number;
      backoff?: boolean;
      retryCondition?: (error: any) => boolean;
    } = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      delay = 1000,
      backoff = true,
      retryCondition = (error) => !ErrorUtils.isOperationalError(error)
    } = options;

    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        // Ne pas retry si c'est la dernière tentative
        if (attempt === maxRetries) {
          break;
        }
        
        // Ne pas retry si la condition n'est pas remplie
        if (!retryCondition(error)) {
          break;
        }
        
        // Calculer le délai avec backoff exponentiel
        const currentDelay = backoff ? delay * Math.pow(2, attempt) : delay;
        
        logger.warn(`Tentative ${attempt + 1}/${maxRetries + 1} échouée, retry dans ${currentDelay}ms`, {
          error: error instanceof Error ? error.message : String(error),
          attempt: attempt + 1,
          maxRetries: maxRetries + 1
        });
        
        await new Promise(resolve => setTimeout(resolve, currentDelay));
      }
    }
    
    throw lastError;
  }

  /**
   * Wrapper pour les opérations de base de données
   */
  static async dbOperation<T>(operation: () => Promise<T>): Promise<T> {
    return this.withRetry(operation, {
      maxRetries: 2,
      delay: 500,
      retryCondition: (error) => {
        // Retry seulement pour les erreurs de connexion
        return error.name === 'MongoNetworkError' || 
               error.name === 'MongoTimeoutError' ||
               error.code === 'ECONNRESET';
      }
    });
  }

  /**
   * Wrapper pour les appels API externes
   */
  static async externalApiCall<T>(operation: () => Promise<T>): Promise<T> {
    return this.withRetry(operation, {
      maxRetries: 3,
      delay: 1000,
      backoff: true,
      retryCondition: (error) => {
        // Retry pour les erreurs 5xx et les erreurs réseau
        return error.response?.status >= 500 || 
               error.code === 'ECONNRESET' ||
               error.code === 'ETIMEDOUT';
      }
    });
  }

  /**
   * Wrapper pour l'envoi de notifications
   */
  static async notificationSend<T>(operation: () => Promise<T>): Promise<T> {
    return this.withRetry(operation, {
      maxRetries: 2,
      delay: 2000,
      retryCondition: (error) => {
        // Retry pour les erreurs temporaires
        return error.code !== 'INVALID_PHONE' && 
               error.code !== 'INVALID_EMAIL';
      }
    });
  }
}

/* -------------------------------------------------------------------------- */
/* 🔧 Gestionnaire d'erreurs non capturées                                   */
/* -------------------------------------------------------------------------- */
export const setupGlobalErrorHandlers = () => {
  // Erreurs non capturées
  process.on('uncaughtException', (error: Error) => {
    logger.error('Erreur non capturée', {
      message: error.message,
      stack: error.stack
    });
    
    // Arrêter le processus de manière propre
    process.exit(1);
  });

  // Promesses rejetées non gérées
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('Promesse rejetée non gérée', {
      reason: reason?.message || reason,
      stack: reason?.stack
    });
    
    // Arrêter le processus de manière propre
    process.exit(1);
  });

  // Arrêt propre du serveur
  process.on('SIGTERM', () => {
    logger.info('Signal SIGTERM reçu, arrêt du serveur...');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    logger.info('Signal SIGINT reçu, arrêt du serveur...');
    process.exit(0);
  });
};
