import type { Request, Response, NextFunction } from "express";
import {
  getMailerConfig,
  saveMailerConfig,
  testMailerConnection,
  getDeliveryLogs,
} from "../services/siteMailer.service.js";

export async function getMailerConfigHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id || req.params.websiteId);
    const config = await getMailerConfig(websiteId);
    return res.status(200).json({
      success: true,
      config,
    });
  } catch (error) {
    next(error);
  }
}

export async function saveMailerConfigHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id || req.params.websiteId);
    const { host, port, username, password, fromName, fromEmail } = req.body || {};

    const saved = await saveMailerConfig(websiteId, {
      host,
      port: port ? Number(port) : 587,
      username,
      password,
      fromName,
      fromEmail,
    });

    return res.status(200).json({
      success: true,
      config: saved,
      message: "SMTP configuration saved successfully.",
    });
  } catch (error) {
    next(error);
  }
}

export async function testMailerConnectionHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id || req.params.websiteId);
    const { recipient } = req.body || {};

    const result = await testMailerConnection(websiteId, recipient);
    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getDeliveryLogsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id || req.params.websiteId);
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const status = req.query.status ? String(req.query.status) : undefined;

    const result = await getDeliveryLogs(websiteId, { page, limit, status });
    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}
