import { Request } from "express";
import { Document, Query } from "mongoose";

/* -------------------------------------------------------------------------- */
/* 📄 Interface de pagination                                                */
/* -------------------------------------------------------------------------- */
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sort?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    nextPage: number | null;
    prevPage: number | null;
  };
}

/* -------------------------------------------------------------------------- */
/* 🔧 Utilitaires de pagination                                              */
/* -------------------------------------------------------------------------- */
export class PaginationHelper {
  /**
   * Extraire les paramètres de pagination depuis la requête
   */
  static extractPaginationParams(req: Request): PaginationOptions {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100); // Max 100 items
    const sort = (req.query.sort as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

    return {
      page: Math.max(page, 1), // Minimum page 1
      limit: Math.max(limit, 1), // Minimum 1 item
      sort,
      sortOrder
    };
  }

  /**
   * Appliquer la pagination à une requête Mongoose
   */
  static async paginate<T extends Document>(
    query: Query<T[], T>,
    options: PaginationOptions
  ): Promise<PaginationResult<T>> {
    const { page = 1, limit = 20, sort = 'createdAt', sortOrder = 'desc' } = options;
    
    const skip = (page - 1) * limit;
    
    // Construire l'objet de tri
    const sortObj: any = {};
    sortObj[sort] = sortOrder === 'asc' ? 1 : -1;
    
    // Exécuter la requête avec pagination
    const [data, totalItems] = await Promise.all([
      query
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .exec(),
      query.model.countDocuments(query.getQuery())
    ]);

    const totalPages = Math.ceil(totalItems / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      data,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage,
        hasPrevPage,
        nextPage: hasNextPage ? page + 1 : null,
        prevPage: hasPrevPage ? page - 1 : null
      }
    };
  }

  /**
   * Créer une réponse paginée standardisée
   */
  static createPaginatedResponse<T>(
    data: T[],
    totalItems: number,
    options: PaginationOptions
  ): PaginationResult<T> {
    const { page = 1, limit = 20 } = options;
    const totalPages = Math.ceil(totalItems / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      data,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage,
        hasPrevPage,
        nextPage: hasNextPage ? page + 1 : null,
        prevPage: hasPrevPage ? page - 1 : null
      }
    };
  }

  /**
   * Valider les paramètres de pagination
   */
  static validatePaginationParams(options: PaginationOptions): string[] {
    const errors: string[] = [];
    
    if (options.page && (options.page < 1 || !Number.isInteger(options.page))) {
      errors.push("Le numéro de page doit être un entier positif");
    }
    
    if (options.limit && (options.limit < 1 || options.limit > 100 || !Number.isInteger(options.limit))) {
      errors.push("La limite doit être un entier entre 1 et 100");
    }
    
    if (options.sortOrder && !['asc', 'desc'].includes(options.sortOrder)) {
      errors.push("L'ordre de tri doit être 'asc' ou 'desc'");
    }
    
    return errors;
  }
}

/* -------------------------------------------------------------------------- */
/* 🔍 Utilitaires de recherche et filtrage                                   */
/* -------------------------------------------------------------------------- */
export class SearchHelper {
  /**
   * Construire un filtre de recherche textuelle
   */
  static buildTextSearchFilter(searchTerm: string, fields: string[]): any {
    if (!searchTerm || !fields.length) return {};
    
    const searchRegex = new RegExp(searchTerm.trim(), 'i');
    
    return {
      $or: fields.map(field => ({
        [field]: { $regex: searchRegex }
      }))
    };
  }

  /**
   * Construire un filtre de date
   */
  static buildDateFilter(
    field: string,
    startDate?: string,
    endDate?: string
  ): any {
    const filter: any = {};
    
    if (startDate || endDate) {
      filter[field] = {};
      
      if (startDate) {
        filter[field].$gte = new Date(startDate);
      }
      
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Fin de journée
        filter[field].$lte = end;
      }
    }
    
    return filter;
  }

  /**
   * Construire un filtre par statut
   */
  static buildStatusFilter(status?: string | string[]): any {
    if (!status) return {};
    
    if (Array.isArray(status)) {
      return { status: { $in: status } };
    }
    
    return { status };
  }

  /**
   * Combiner plusieurs filtres
   */
  static combineFilters(...filters: any[]): any {
    const validFilters = filters.filter(filter => 
      filter && Object.keys(filter).length > 0
    );
    
    if (validFilters.length === 0) return {};
    if (validFilters.length === 1) return validFilters[0];
    
    return { $and: validFilters };
  }
}

/* -------------------------------------------------------------------------- */
/* 📊 Middleware de pagination pour Express                                  */
/* -------------------------------------------------------------------------- */
export const paginationMiddleware = (req: Request, res: any, next: any) => {
  const paginationParams = PaginationHelper.extractPaginationParams(req);
  const errors = PaginationHelper.validatePaginationParams(paginationParams);
  
  if (errors.length > 0) {
    return res.status(400).json({
      error: "Paramètres de pagination invalides",
      details: errors
    });
  }
  
  req.pagination = paginationParams;
  next();
};

/* -------------------------------------------------------------------------- */
/* 🔧 Extension du type Request                                              */
/* -------------------------------------------------------------------------- */
declare global {
  namespace Express {
    interface Request {
      pagination?: PaginationOptions;
    }
  }
}
