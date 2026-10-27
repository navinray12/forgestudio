import type { NextFunction, Request, Response } from "express";

import {
  createWordPressForm,
  deleteWordPressForm,
  deleteWordPressFormSubmission,
  getWordPressForm,
  getWordPressFormsCapabilities,
  getWordPressFormSubmissions,
  listWordPressForms,
  submitWordPressForm,
  syncWordPressForm,
  updateWordPressForm,
} from "../../services/wordpress/formsConnector.service.js";

export async function getWordPressFormsCapabilitiesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await getWordPressFormsCapabilities(String(req.params.id), res.locals.user?.id);
    return res.status(200).json(result);
  } catch (error) { next(error); }
}

export async function listWordPressFormsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await listWordPressForms(String(req.params.id), res.locals.user?.id);
    return res.status(200).json(result);
  } catch (error) { next(error); }
}

export async function getWordPressFormHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await getWordPressForm(String(req.params.id), String(req.params.formId), res.locals.user?.id);
    return res.status(200).json(result);
  } catch (error) { next(error); }
}

export async function createWordPressFormHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await createWordPressForm(String(req.params.id), req.body || {}, res.locals.user?.id);
    return res.status(201).json(result);
  } catch (error) { next(error); }
}

export async function updateWordPressFormHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await updateWordPressForm(String(req.params.id), String(req.params.formId), req.body || {}, res.locals.user?.id);
    return res.status(200).json(result);
  } catch (error) { next(error); }
}

export async function deleteWordPressFormHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await deleteWordPressForm(String(req.params.id), String(req.params.formId), res.locals.user?.id);
    return res.status(200).json(result);
  } catch (error) { next(error); }
}

export async function syncWordPressFormHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await syncWordPressForm(String(req.params.id), String(req.params.formId), res.locals.user?.id);
    return res.status(200).json(result);
  } catch (error) { next(error); }
}

export async function submitWordPressFormHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await submitWordPressForm(
      String(req.params.id),
      String(req.params.formId),
      req.body || {},
      {
        ip: req.ip || String(req.headers["x-forwarded-for"] || "127.0.0.1"),
        userAgent: req.headers["user-agent"],
        referer: req.headers.referer,
      },
    );
    return res.status(200).json(result);
  } catch (error) { next(error); }
}

export async function getWordPressFormSubmissionsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await getWordPressFormSubmissions(String(req.params.id), String(req.params.formId), res.locals.user?.id);
    return res.status(200).json(result);
  } catch (error) { next(error); }
}

export async function deleteWordPressFormSubmissionHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await deleteWordPressFormSubmission(
      String(req.params.id),
      String(req.params.formId),
      String(req.params.submissionId),
      res.locals.user?.id,
    );
    return res.status(200).json(result);
  } catch (error) { next(error); }
}
