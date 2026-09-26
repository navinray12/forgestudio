import { Request, Response, NextFunction } from "express";
import {
  getExperiments,
  createExperiment,
  updateExperiment,
  concludeExperiment,
  deleteExperiment,
  recordImpression,
  recordConversion,
} from "../services/experiment.service.js";

export async function getExperimentsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const websiteId = req.params.id as string;
    const experiments = await getExperiments(websiteId);
    res.status(200).json({ success: true, data: experiments });
  } catch (error) {
    next(error);
  }
}

export async function createExperimentHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const websiteId = req.params.id as string;
    const experiment = await createExperiment(websiteId, req.body || {});
    res.status(201).json({ success: true, data: experiment });
  } catch (error) {
    next(error);
  }
}

export async function updateExperimentHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const websiteId = req.params.id as string;
    const expId = req.params.expId as string;
    const updated = await updateExperiment(websiteId, expId, req.body || {});
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
}

export async function concludeExperimentHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const websiteId = req.params.id as string;
    const expId = req.params.expId as string;
    const { winningVariantId } = req.body || {};
    const updated = await concludeExperiment(websiteId, expId, winningVariantId);
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
}

export async function deleteExperimentHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const websiteId = req.params.id as string;
    const expId = req.params.expId as string;
    const result = await deleteExperiment(websiteId, expId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function recordImpressionHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const websiteId = req.params.id as string;
    const expId = req.params.expId as string;
    const { variantId } = req.body || {};
    const success = await recordImpression(websiteId, expId, variantId);
    res.status(200).json({ success });
  } catch (error) {
    next(error);
  }
}

export async function recordConversionHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const websiteId = req.params.id as string;
    const expId = req.params.expId as string;
    const { variantId } = req.body || {};
    const success = await recordConversion(websiteId, expId, variantId);
    res.status(200).json({ success });
  } catch (error) {
    next(error);
  }
}
