// src/modules/ritual/ritual.routes.ts
import { FastifyInstance } from "fastify";
import { RitualController } from "./ritual.controller";

export async function ritualRoutes(app: FastifyInstance) {
    // Rota para listar todos os rituais de um usuário
    app.get("/rituals", RitualController.listAll);

    // GET /rituals?status=PLANNED,COMPLETED
    app.get("/rituals/status", RitualController.listByStatus);

    // Rota para buscar um ritual específico por ID
    app.get("/rituals/:id", RitualController.listById);

    // Rota para criar um ritual
    app.post("/rituals", RitualController.create);

    // Rota para atualizar um ritual
    app.put("/rituals/:id", RitualController.update);

    // Rota para excluir um ritual
    app.delete("/rituals/:id", RitualController.remove);

    // Rota para registrar o check-in do ritual (achieved: true/false)
    app.post("/rituals/:id/checkin", RitualController.registerCheckIn);

    // Rota para criar ou atualizar o ritual da manhã (Hoje eu vou...)
    app.post("/rituals/upsert", RitualController.upsertMorning);
}
