import { FastifyInstance } from "fastify";
import { createUserSchema, idParamsSchema, updateUserSchema } from "./user.schema";
import { UserController } from "./user.controller";


export async function userRoutes(app: FastifyInstance) {
    app.get("/users", UserController.listAll);
    app.get("/users/:id", { schema: { params: idParamsSchema } }, UserController.listById);
    app.post("/users", { schema: { body: createUserSchema } }, UserController.create);
    app.put("/users/:id", { schema: { params: idParamsSchema, body: updateUserSchema } }, UserController.update);
    app.delete("/users/:id", { schema: { params: idParamsSchema } }, UserController.remove);
};
