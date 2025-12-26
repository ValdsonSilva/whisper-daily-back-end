// src/plugins/socket-io.ts
import fp from 'fastify-plugin';
import { Server as IOServer } from "socket.io";

export default fp(async (app) => {
    const io = new IOServer(app.server, { cors: { origin: true } });
    app.decorate('io', io);
});
