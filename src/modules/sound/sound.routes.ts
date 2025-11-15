// src/modules/sound/sound.routes.ts
import { FastifyInstance } from "fastify";
import { SoundController } from "./sound.controller";

export async function soundRoutes(app: FastifyInstance) {
    app.get("/sounds", SoundController.listAll);
    app.get("/sounds/:id", SoundController.listById);
    app.post("/sounds", SoundController.create);
    app.put("/sounds/:id", SoundController.update);
    app.delete("/sounds/:id", SoundController.remove);
}
