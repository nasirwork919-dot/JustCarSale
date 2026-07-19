import { Router } from "express";
import * as photoSyncController from "../controllers/photoSyncController";

const router = Router();

router.post("/upload", photoSyncController.uploadPhoto);
router.get("/session/:sessionId", photoSyncController.getSessionPhotos);
router.post("/clear", photoSyncController.clearSession);

export default router;
