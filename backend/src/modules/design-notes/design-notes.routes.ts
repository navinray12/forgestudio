/**
 * @file Design notes: HTTP route registration and middleware order. File responsibility: design notes routes.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { Router } from "express";
import { requireAuth } from "../authentication/session-authentication.middleware.js";
import {
    createNote,
    getNotes,
    getNoteById,
    updateNote,
    deleteNote,
    resolveNote,
    reopenNote
} from "./design-notes.controller.js";

const router = Router();

// Retrieve all notes for a specific website via query `?websiteId=...`
router.get("/", requireAuth, getNotes);

// Create a note
router.post("/", requireAuth, createNote);

// Note specific actions
router.get("/:id", requireAuth, getNoteById);
router.patch("/:id", requireAuth, updateNote);
router.delete("/:id", requireAuth, deleteNote);

// Status workflows
router.post("/:id/resolve", requireAuth, resolveNote);
router.post("/:id/reopen", requireAuth, reopenNote);

export default router;
