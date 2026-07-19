import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { isNonEmptyString } from "../utils/validation";

// Response shapes here intentionally match the original in-memory stub
// exactly ({success, photos} / {success, message} / {error}) — the frontend
// (MobileCameraCapture, SellVehicleWizard, UniversalSmartUpload) calls these
// endpoints with raw fetch() and reads those fields directly, not through
// src/lib/api.ts's {success,data} envelope unwrapping.

export async function uploadPhoto(req: Request, res: Response) {
  const { sessionId, photoKey, imageBytes } = req.body ?? {};

  if (!isNonEmptyString(sessionId) || !isNonEmptyString(photoKey) || !isNonEmptyString(imageBytes)) {
    res.status(400).json({ error: "Missing required parameters: sessionId, photoKey, or imageBytes" });
    return;
  }

  await prisma.photoSyncPhoto.upsert({
    where: { sessionId_photoKey: { sessionId, photoKey } },
    create: { sessionId, photoKey, imageBytes },
    update: { imageBytes },
  });

  res.json({ success: true, message: `Photo synced for key '${photoKey}' under session '${sessionId}'` });
}

export async function getSessionPhotos(req: Request, res: Response) {
  const { sessionId } = req.params;

  if (!isNonEmptyString(sessionId)) {
    res.status(400).json({ error: "No sessionId provided" });
    return;
  }

  const rows = await prisma.photoSyncPhoto.findMany({ where: { sessionId } });
  const photos: Record<string, string> = {};
  for (const row of rows) {
    photos[row.photoKey] = row.imageBytes;
  }

  res.json({ success: true, photos });
}

export async function clearSession(req: Request, res: Response) {
  const { sessionId } = req.body ?? {};

  if (isNonEmptyString(sessionId)) {
    await prisma.photoSyncPhoto.deleteMany({ where: { sessionId } });
  }

  res.json({ success: true });
}
