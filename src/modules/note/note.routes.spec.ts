// tests/note.routes.spec.ts
import Fastify from "fastify";
import { noteRepo } from "./note.repo";
import { describe } from "node:test";
import zodValidator from "../../core/http/plugins/zodValidator";
import { noteRoutes } from "./note.routes";
import prismaPkg from '@prisma/client';
const { Note } = prismaPkg;
jest.mock('./note.repo');

var mockedNoteRepo = noteRepo as jest.Mocked<typeof noteRepo>;

describe('Note Routes', () => {
    const app = Fastify();

    beforeAll(async () => {
        await app.register(zodValidator);
        app.register(noteRoutes);
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ---------- Test for GET /notes ----------
    test("GET /notes should list all notes (200)", async () => {
        const fakeNotes = [{ id: "1", title: "Note 1", content: "Content 1" }];

        mockedNoteRepo.listAll.mockResolvedValueOnce(fakeNotes as any);

        const res = await app.inject({
            path: "/notes",
            method: "GET"
        });

        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body).toHaveProperty("notes");
        expect(body.notes).toHaveLength(1);
        expect(body.notes[0].id).toBe("1");
    });

    test("GET /notes should return 404 if no notes found", async () => {
        mockedNoteRepo.listAll.mockResolvedValueOnce([]);

        const res = await app.inject({
            path: "/notes",
            method: "GET"
        });

        expect(res.statusCode).toBe(404);
        const body = res.json();
        expect(body).toHaveProperty("message", "Notas não encontradas");
    });

    // ---------- Test for GET /notes/:id ----------
    test("GET /notes/:id should return a note (200)", async () => {
        const fakeNote = { id: "1", title: "Note 1", content: "Content 1" };

        mockedNoteRepo.listNoteById.mockResolvedValueOnce(fakeNote as Note);

        const res = await app.inject({
            path: "/notes/1",
            method: "GET"
        });

        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body).toHaveProperty("note");
        expect(body.note.id).toBe("1");
    });

    test("GET /notes/:id should return 404 if note not found", async () => {
        mockedNoteRepo.listNoteById.mockResolvedValueOnce(null);

        const res = await app.inject({
            path: "/notes/999",
            method: "GET"
        });

        expect(res.statusCode).toBe(404);
        const body = res.json();
        expect(body).toHaveProperty("message", "Nota não encontrada");
    });

    // ---------- Test for POST /notes ----------
    test("POST /notes should create a note (201)", async () => {
        const newNote = { title: "New Note", content: "New Content" };
        const createdNote = { id: "1", ...newNote };

        mockedNoteRepo.create.mockResolvedValueOnce(createdNote as Note);

        const res = await app.inject({
            path: "/notes",
            method: "POST",
            payload: newNote
        });

        expect(res.statusCode).toBe(201);
        const body = res.json();
        expect(body).toHaveProperty("note");
        expect(body.note.title).toBe("New Note");
    });

    test("POST /notes should return 500 if note creation fails", async () => {
        mockedNoteRepo.create.mockRejectedValueOnce(new Error("Error"));

        const res = await app.inject({
            path: "/notes",
            method: "POST",
            payload: { title: "Test Note", content: "Test Content" }
        });

        expect(res.statusCode).toBe(500);
        const body = res.json();
        expect(body).toHaveProperty("message", "Erro ao criar nota");
    });

    // ---------- Test for PUT /notes/:id ----------
    test("PUT /notes/:id should update a note (200)", async () => {
        const updateData = { title: "Updated Note" };
        const updatedNote = { id: "1", title: "Updated Note", content: "Updated Content" };

        mockedNoteRepo.update.mockResolvedValueOnce(updatedNote as Note);

        const res = await app.inject({
            path: "/notes/1",
            method: "PUT",
            payload: updateData
        });

        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body).toHaveProperty("note");
        expect(body.note.title).toBe("Updated Note");
    });

    test("PUT /notes/:id should return 404 if note not found", async () => {
        mockedNoteRepo.update.mockResolvedValueOnce(null);

        const res = await app.inject({
            path: "/notes/999",
            method: "PUT",
            payload: { title: "Updated Note" }
        });

        expect(res.statusCode).toBe(404);
        const body = res.json();
        expect(body).toHaveProperty("message", "Nota não encontrada");
    });

    // ---------- Test for DELETE /notes/:id ----------
    test("DELETE /notes/:id should delete a note (200)", async () => {
        const deletedNote = { id: "1", title: "Deleted Note", content: "Deleted Content" };

        mockedNoteRepo.delete.mockResolvedValueOnce(deletedNote as Note);

        const res = await app.inject({
            path: "/notes/1",
            method: "DELETE"
        });

        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body).toHaveProperty("message", "Nota excluída com sucesso");
        expect(body).toHaveProperty("note");
        expect(body.note.id).toBe("1");
    });

    test("DELETE /notes/:id should return 500 if delete fails", async () => {
        mockedNoteRepo.delete.mockRejectedValueOnce(new Error("Error"));

        const res = await app.inject({
            path: "/notes/1",
            method: "DELETE"
        });

        expect(res.statusCode).toBe(500);
        const body = res.json();
        expect(body).toHaveProperty("message", "Erro ao excluir nota");
    });

    test("DELETE /notes/:id should return 404 if note not found", async () => {
        mockedNoteRepo.delete.mockResolvedValueOnce(null as any);

        const res = await app.inject({
            path: "/notes/999",
            method: "DELETE"
        });

        expect(res.statusCode).toBe(404);
        const body = res.json();
        expect(body).toHaveProperty("message", "Nota não encontrada");
    });
});
