// src/modules/note/note.routes.ts
import { FastifyInstance } from "fastify";
import { NoteController } from "./note.controller";


export async function noteRoutes(app: FastifyInstance) {
    // Rota para listar todas as notas
    app.get("/notes", NoteController.listAll);

    // Rota para buscar uma nota por ID
    app.get("/notes/:id", NoteController.listById);

    // Rota para criar uma nova nota
    app.post("/notes", NoteController.create);

    // Rota para atualizar uma nota existente
    app.put("/notes/:id", NoteController.update);

    // Rota para excluir uma nota
    app.delete("/notes/:id", NoteController.remove);
}
