import { Server, Socket } from "socket.io";
import { logger } from "./logger";

/* -------------------------------------------------------------------------- */
/* 🧠 Structure d'un utilisateur connecté                                    */
/* -------------------------------------------------------------------------- */
interface ConnectedUser {
  socketId: string;
  role: string;
  userId: string;
  rooms: string[];
  parentPhone?: string;
  childId?: string;
  connectedAt: Date;
  lastActivity: Date;
  reconnectCount: number;
}

interface ConnectionStats {
  totalConnections: number;
  activeConnections: number;
  connectionsByRole: Record<string, number>;
  averageSessionDuration: number;
}

/* -------------------------------------------------------------------------- */
/* 🗄️ Gestionnaire de connexions amélioré                                   */
/* -------------------------------------------------------------------------- */
class ConnectionManager {
  private connectedUsers: ConnectedUser[] = [];
  private connectionHistory: Array<{ userId: string; connectedAt: Date; disconnectedAt?: Date }> = [];
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startHeartbeat();
  }

  /**
   * Ajouter un utilisateur connecté
   */
  addUser(user: Omit<ConnectedUser, 'connectedAt' | 'lastActivity' | 'reconnectCount'>): void {
    // Supprimer les anciennes connexions du même utilisateur
    this.removeUserByUserId(user.userId);

    const connectedUser: ConnectedUser = {
      ...user,
      connectedAt: new Date(),
      lastActivity: new Date(),
      reconnectCount: 0
    };

    this.connectedUsers.push(connectedUser);
    this.connectionHistory.push({
      userId: user.userId,
      connectedAt: connectedUser.connectedAt
    });

    logger.info('Utilisateur connecté', {
      userId: user.userId,
      role: user.role,
      rooms: user.rooms,
      totalConnections: this.connectedUsers.length
    });
  }

  /**
   * Supprimer un utilisateur par socket ID
   */
  removeUserBySocketId(socketId: string): ConnectedUser | null {
    const index = this.connectedUsers.findIndex(u => u.socketId === socketId);
    if (index === -1) return null;

    const user = this.connectedUsers[index];
    this.connectedUsers.splice(index, 1);

    // Mettre à jour l'historique
    const historyEntry = this.connectionHistory.find(h => 
      h.userId === user.userId && !h.disconnectedAt
    );
    if (historyEntry) {
      historyEntry.disconnectedAt = new Date();
    }

    logger.info('Utilisateur déconnecté', {
      userId: user.userId,
      role: user.role,
      sessionDuration: Date.now() - user.connectedAt.getTime(),
      totalConnections: this.connectedUsers.length
    });

    return user;
  }

  /**
   * Supprimer un utilisateur par user ID
   */
  removeUserByUserId(userId: string): void {
    const indices = this.connectedUsers
      .map((user, index) => user.userId === userId ? index : -1)
      .filter(index => index !== -1)
      .reverse(); // Supprimer de la fin vers le début

    indices.forEach(index => {
      const user = this.connectedUsers[index];
      this.connectedUsers.splice(index, 1);
      
      // Mettre à jour l'historique
      const historyEntry = this.connectionHistory.find(h => 
        h.userId === userId && !h.disconnectedAt
      );
      if (historyEntry) {
        historyEntry.disconnectedAt = new Date();
      }
    });
  }

  /**
   * Mettre à jour l'activité d'un utilisateur
   */
  updateActivity(socketId: string): void {
    const user = this.connectedUsers.find(u => u.socketId === socketId);
    if (user) {
      user.lastActivity = new Date();
    }
  }

  /**
   * Obtenir les utilisateurs dans des rooms spécifiques
   */
  getUsersInRooms(rooms: string[]): ConnectedUser[] {
    return this.connectedUsers.filter(user => 
      user.rooms.some(room => rooms.includes(room))
    );
  }

  /**
   * Obtenir les statistiques de connexion
   */
  getStats(): ConnectionStats {
    const now = Date.now();
    const connectionsByRole: Record<string, number> = {};
    
    this.connectedUsers.forEach(user => {
      connectionsByRole[user.role] = (connectionsByRole[user.role] || 0) + 1;
    });

    // Calculer la durée moyenne des sessions
    const completedSessions = this.connectionHistory.filter(h => h.disconnectedAt);
    const averageSessionDuration = completedSessions.length > 0
      ? completedSessions.reduce((sum, session) => {
          return sum + (session.disconnectedAt!.getTime() - session.connectedAt.getTime());
        }, 0) / completedSessions.length
      : 0;

    return {
      totalConnections: this.connectionHistory.length,
      activeConnections: this.connectedUsers.length,
      connectionsByRole,
      averageSessionDuration
    };
  }

  /**
   * Nettoyer les connexions inactives
   */
  cleanupInactiveConnections(maxInactiveTime: number = 30 * 60 * 1000): number {
    const now = Date.now();
    let cleanedCount = 0;

    for (let i = this.connectedUsers.length - 1; i >= 0; i--) {
      const user = this.connectedUsers[i];
      if (now - user.lastActivity.getTime() > maxInactiveTime) {
        this.connectedUsers.splice(i, 1);
        cleanedCount++;
        
        logger.warn('Connexion inactive nettoyée', {
          userId: user.userId,
          inactiveTime: now - user.lastActivity.getTime()
        });
      }
    }

    return cleanedCount;
  }

  /**
   * Démarrer le heartbeat pour nettoyer les connexions inactives
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const cleaned = this.cleanupInactiveConnections();
      if (cleaned > 0) {
        logger.info(`Nettoyage heartbeat: ${cleaned} connexions inactives supprimées`);
      }
    }, 5 * 60 * 1000); // Toutes les 5 minutes
  }

  /**
   * Arrêter le heartbeat
   */
  destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Obtenir tous les utilisateurs connectés
   */
  getAllUsers(): ConnectedUser[] {
    return [...this.connectedUsers];
  }
}

const connectionManager = new ConnectionManager();

/* -------------------------------------------------------------------------- */
/* 🔌 ENREGISTREMENT DES ÉVÉNEMENTS SOCKET.IO                                */
/* -------------------------------------------------------------------------- */
export const registerSocketEvents = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    console.log(`🟢 Nouvelle connexion Socket.io : ${socket.id}`);

    /* ---------------------------------------------------------------------- */
    /* 🔹 Enregistrement initial de l’utilisateur                             */
    /* ---------------------------------------------------------------------- */
    socket.on(
      "registerUser",
      (data: {
        userId: string;
        role: string;
        rooms?: string[];
        parentPhone?: string;
        childId?: string;
      }) => {
        const { userId, role, childId } = data;
        // 🔢 Normaliser le téléphone parent pour les rooms (chiffres uniquement)
        const parentPhoneRaw = data.parentPhone || "";
        const parentPhoneDigits = parentPhoneRaw.replace(/\D+/g, "");

        // 🔸 Définir les rooms de base
        const baseRooms = [role, "all"];
        const extraRooms: string[] = [];

        // 🔸 Ajouter les rooms reçues explicitement
        if (Array.isArray(data.rooms)) {
          extraRooms.push(...data.rooms.filter(Boolean));
        }

        // 🔸 Room combinée parent + enfant (ciblage privé)
        if (parentPhoneDigits && childId) {
          extraRooms.push(`parent_${parentPhoneDigits}_child_${childId}`);
        }

        // ✅ Fusion sans doublons
        const rooms = Array.from(new Set([...baseRooms, ...extraRooms]));
        rooms.forEach((r) => socket.join(r));

        connectionManager.addUser({
          socketId: socket.id,
          role,
          userId,
          rooms,
          parentPhone: parentPhoneDigits,
          childId,
        });

        socket.emit("joinedRooms", rooms);
        console.log(`✅ ${userId} (${role}) connecté → ${rooms.join(", ")}`);
        console.log(`👥 Connectés totaux : ${connectionManager.getAllUsers().length}`);
      }
    );

    /* ---------------------------------------------------------------------- */
    /* 🔹 Rejoindre dynamiquement des rooms spécifiques                       */
    /* ---------------------------------------------------------------------- */
    socket.on(
      "join",
      (payload: { rooms?: string[]; parentPhone?: string; childId?: string }) => {
        const dynRooms: string[] = [];

        // Ajout manuel de rooms personnalisées
        if (Array.isArray(payload.rooms)) {
          dynRooms.push(...payload.rooms.filter(Boolean));
        }

        // 🔸 Room unique pour parent + enfant
        const parentPhoneDigits = (payload.parentPhone || "").replace(/\D+/g, "");
        if (parentPhoneDigits && payload.childId) {
          dynRooms.push(`parent_${parentPhoneDigits}_child_${payload.childId}`);
        }

        // ✅ Nettoyage doublons et join effectif
        const uniqueRooms = Array.from(new Set(dynRooms));
        uniqueRooms.forEach((r) => socket.join(r));

        socket.emit("joinedRooms", uniqueRooms);
        console.log(`➕ ${socket.id} a rejoint : ${uniqueRooms.join(", ")}`);
      }
    );

    /* ---------------------------------------------------------------------- */
    /* 🔻 Gestion de la déconnexion                                           */
    /* ---------------------------------------------------------------------- */
    socket.on("disconnect", () => {
      const user = connectionManager.removeUserBySocketId(socket.id);
      if (user) {
        console.log(`🔴 Déconnexion Socket : ${socket.id}`);
      }
      console.log(`👥 Connectés restants : ${connectionManager.getAllUsers().length}`);
    });
  });
};

/* -------------------------------------------------------------------------- */
/* 📢 ENVOI DE NOTIFICATION SOCKET.IO                                        */
/* -------------------------------------------------------------------------- */
export const sendSocketNotification = (
  io: Server,
  targetRooms: string[],
  notification: { title?: string; message?: string; [key: string]: any }
) => {
  if (!notification?.title || !notification?.message) {
    console.warn("⚠️ Notification invalide :", notification);
    return;
  }

  const rooms = Array.isArray(targetRooms) ? targetRooms : [];
  if (rooms.length === 0) {
    console.warn("⚠️ Aucun ciblage — broadcast global.");
    io.emit("newNotification", notification);
    return;
  }

  console.log("🔵 === ENVOI SOCKET.IO ===");
  console.log("  📦 Payload:", JSON.stringify(notification, null, 2));
  console.log("  🎯 Rooms cibles:", rooms);
  console.log("  👥 Utilisateurs connectés:", connectionManager.getAllUsers().length);
  
  // Afficher TOUTES les rooms de TOUS les utilisateurs connectés
  console.log("  🗂️ Rooms de tous les utilisateurs:");
  connectionManager.getAllUsers().forEach((u: ConnectedUser) => {
    console.log(`    - ${u.socketId} (${u.role}): ${u.rooms.join(", ")}`);
  });
  
  // Vérifier quels utilisateurs sont dans les rooms cibles
  const usersInRooms = connectionManager.getUsersInRooms(rooms);
  console.log("  ✅ Utilisateurs qui vont recevoir:", usersInRooms.map((u: ConnectedUser) => ({
    socketId: u.socketId,
    role: u.role,
    rooms: u.rooms.filter((r: string) => rooms.includes(r))
  })));

  for (const room of rooms) {
    io.to(room).emit("newNotification", notification);
    console.log(`📡 Notification envoyée → ${room}`);
  }
  
  console.log("🔵 === FIN ENVOI ===");
};