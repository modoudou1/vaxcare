import { Express } from "express";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "VacxCare API",
      version: "1.0.0",
      description: "📚 Documentation de l'API VacxCare (Swagger + OpenAPI 3.0)",
    },
    servers: [
      {
        url: "http://localhost:5000", // ✅ corrigé : pas de /api ici
        description: "Serveur local",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "string" },
            email: { type: "string" },
            role: {
              type: "string",
              enum: ["national", "regional", "agent", "user"],
            },
            region: { type: "string" },
            healthCenter: { type: "string" },
          },
        },
        Child: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            birthDate: { type: "string", format: "date" },
            createdBy: { type: "string" },
            region: { type: "string" },
            parentName: { type: "string" },
            parentPhone: { type: "string" },
            address: { type: "string" },
            status: { type: "string" },
            nextAppointment: { type: "string", format: "date-time" },
            vaccinesDue: {
              type: "array",
              items: { type: "string" },
            },
            healthCenter: { type: "string" },
          },
        },
        Appointment: {
          type: "object",
          properties: {
            id: { type: "string" },
            child: { $ref: "#/components/schemas/Child" },
            vaccine: { type: "string" },
            healthCenter: { type: "string" },
            agent: { type: "string" },
            requestedBy: { type: "string" },
            date: { type: "string", format: "date-time" },
            status: {
              type: "string",
              enum: ["pending", "confirmed", "done", "missed"],
            },
            notes: { type: "string" },
          },
        },
        Vaccination: {
          type: "object",
          properties: {
            id: { type: "string" },
            child: { $ref: "#/components/schemas/Child" },
            vaccine: { type: "string" },
            doseNumber: { type: "number" },
            date: { type: "string", format: "date-time" },
            givenBy: { type: "string" },
            healthCenter: { type: "string" },
            region: { type: "string" },
          },
        },
        Stock: {
          type: "object",
          properties: {
            id: { type: "string" },
            vaccine: { type: "string" },
            batchNumber: { type: "string" },
            quantity: { type: "number" },
            expirationDate: { type: "string", format: "date" },
            healthCenter: { type: "string" },
            region: { type: "string" },
            lowStock: { type: "boolean" },
            expiringSoon: { type: "boolean" },
          },
        },
        Campaign: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            description: { type: "string" },
            startDate: { type: "string", format: "date" },
            endDate: { type: "string", format: "date" },
            region: { type: "string" },
            videos: { type: "array", items: { type: "string" } },
          },
        },
        Notification: {
          type: "object",
          properties: {
            id: { type: "string" },
            user: { type: "string" },
            message: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
      },
    },
  },
  apis: ["./src/routes/*.ts"], // 🛠 garde les annotations dans tes routes
};

const swaggerSpec = swaggerJsdoc(options);

// ✅ Fonction d’intégration Swagger
export const setupSwagger = (app: Express) => {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};
