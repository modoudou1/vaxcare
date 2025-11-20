import fs from 'fs';
import path from 'path';

/* -------------------------------------------------------------------------- */
/* 📝 Types de logs                                                          */
/* -------------------------------------------------------------------------- */
export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG'
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  meta?: any;
  userId?: string;
  ip?: string;
  userAgent?: string;
  route?: string;
  method?: string;
  statusCode?: number;
  responseTime?: number;
}

/* -------------------------------------------------------------------------- */
/* 🏗️ Classe Logger                                                          */
/* -------------------------------------------------------------------------- */
class Logger {
  private logDir: string;
  private maxFileSize: number = 10 * 1024 * 1024; // 10MB
  private maxFiles: number = 5;

  constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
    this.ensureLogDirectory();
  }

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private formatLogEntry(entry: LogEntry): string {
    const { timestamp, level, message, meta, userId, ip, userAgent, route, method, statusCode, responseTime } = entry;
    
    let logLine = `[${timestamp}] ${level}: ${message}`;
    
    if (userId) logLine += ` | User: ${userId}`;
    if (ip) logLine += ` | IP: ${ip}`;
    if (method && route) logLine += ` | ${method} ${route}`;
    if (statusCode) logLine += ` | Status: ${statusCode}`;
    if (responseTime) logLine += ` | Time: ${responseTime}ms`;
    if (userAgent) logLine += ` | UA: ${userAgent}`;
    if (meta) logLine += ` | Meta: ${JSON.stringify(meta)}`;
    
    return logLine + '\n';
  }

  private writeToFile(filename: string, content: string): void {
    const filePath = path.join(this.logDir, filename);
    
    try {
      // Vérifier la taille du fichier et faire une rotation si nécessaire
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        if (stats.size > this.maxFileSize) {
          this.rotateLogFile(filename);
        }
      }
      
      fs.appendFileSync(filePath, content);
    } catch (error) {
      console.error('❌ Erreur écriture log:', error);
    }
  }

  private rotateLogFile(filename: string): void {
    const baseName = filename.replace('.log', '');
    
    // Supprimer le plus ancien fichier si on atteint la limite
    const oldestFile = path.join(this.logDir, `${baseName}.${this.maxFiles}.log`);
    if (fs.existsSync(oldestFile)) {
      fs.unlinkSync(oldestFile);
    }
    
    // Décaler tous les fichiers
    for (let i = this.maxFiles - 1; i >= 1; i--) {
      const currentFile = path.join(this.logDir, `${baseName}.${i}.log`);
      const nextFile = path.join(this.logDir, `${baseName}.${i + 1}.log`);
      
      if (fs.existsSync(currentFile)) {
        fs.renameSync(currentFile, nextFile);
      }
    }
    
    // Renommer le fichier actuel
    const currentFile = path.join(this.logDir, filename);
    const firstRotatedFile = path.join(this.logDir, `${baseName}.1.log`);
    
    if (fs.existsSync(currentFile)) {
      fs.renameSync(currentFile, firstRotatedFile);
    }
  }

  private log(level: LogLevel, message: string, meta?: any): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      meta
    };

    const formattedEntry = this.formatLogEntry(entry);
    
    // Écrire dans la console en développement
    if (process.env.NODE_ENV !== 'production') {
      const colors = {
        [LogLevel.ERROR]: '\x1b[31m', // Rouge
        [LogLevel.WARN]: '\x1b[33m',  // Jaune
        [LogLevel.INFO]: '\x1b[36m',  // Cyan
        [LogLevel.DEBUG]: '\x1b[37m'  // Blanc
      };
      console.log(`${colors[level]}${formattedEntry.trim()}\x1b[0m`);
    }
    
    // Écrire dans les fichiers
    this.writeToFile('app.log', formattedEntry);
    
    if (level === LogLevel.ERROR) {
      this.writeToFile('error.log', formattedEntry);
    }
  }

  public error(message: string, meta?: any): void {
    this.log(LogLevel.ERROR, message, meta);
  }

  public warn(message: string, meta?: any): void {
    this.log(LogLevel.WARN, message, meta);
  }

  public info(message: string, meta?: any): void {
    this.log(LogLevel.INFO, message, meta);
  }

  public debug(message: string, meta?: any): void {
    this.log(LogLevel.DEBUG, message, meta);
  }

  // Méthodes spécialisées pour les logs d'API
  public apiRequest(req: any, res: any, responseTime: number): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.INFO,
      message: 'API Request',
      userId: req.user?.id,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      route: req.route?.path || req.path,
      method: req.method,
      statusCode: res.statusCode,
      responseTime
    };

    const formattedEntry = this.formatLogEntry(entry);
    this.writeToFile('api.log', formattedEntry);
    
    if (process.env.NODE_ENV !== 'production') {
      const statusColor = res.statusCode >= 400 ? '\x1b[31m' : '\x1b[32m';
      console.log(`\x1b[36m${formattedEntry.trim()}\x1b[0m`);
    }
  }

  public securityEvent(message: string, req: any, meta?: any): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.WARN,
      message: `SECURITY: ${message}`,
      userId: req.user?.id,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      route: req.route?.path || req.path,
      method: req.method,
      meta
    };

    const formattedEntry = this.formatLogEntry(entry);
    this.writeToFile('security.log', formattedEntry);
    
    console.warn(`🚨 ${formattedEntry.trim()}`);
  }

  public databaseEvent(operation: string, collection: string, meta?: any): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.DEBUG,
      message: `DB: ${operation} on ${collection}`,
      meta
    };

    const formattedEntry = this.formatLogEntry(entry);
    this.writeToFile('database.log', formattedEntry);
  }

  public notificationEvent(type: string, recipient: string, success: boolean, meta?: any): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: success ? LogLevel.INFO : LogLevel.ERROR,
      message: `NOTIFICATION: ${type} to ${recipient} - ${success ? 'SUCCESS' : 'FAILED'}`,
      meta
    };

    const formattedEntry = this.formatLogEntry(entry);
    this.writeToFile('notifications.log', formattedEntry);
  }
}

/* -------------------------------------------------------------------------- */
/* 🚀 Instance singleton                                                     */
/* -------------------------------------------------------------------------- */
export const logger = new Logger();

/* -------------------------------------------------------------------------- */
/* 🔧 Middleware de logging des requêtes                                     */
/* -------------------------------------------------------------------------- */
export const requestLogger = (req: any, res: any, next: any) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    logger.apiRequest(req, res, responseTime);
  });
  
  next();
};
