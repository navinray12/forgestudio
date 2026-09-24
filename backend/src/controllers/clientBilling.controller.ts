import { Request, Response, NextFunction } from "express";
import {
  getClientBilling,
  updateClientBilling,
  generateClientInvoice,
} from "../services/billing/clientBilling.service.js";

export async function getClientBillingHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = (req as any).user?.id || res.locals?.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const websiteId = req.params.id as string;
    const result = await getClientBilling(websiteId, userId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function updateClientBillingHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = (req as any).user?.id || res.locals?.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const websiteId = req.params.id as string;
    const result = await updateClientBilling(websiteId, userId, req.body || {});
    res.status(200).json({
      success: true,
      message: "Client billing settings updated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function generateClientInvoiceHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = (req as any).user?.id || res.locals?.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const websiteId = req.params.id as string;
    const { sendEmail, customNotes } = req.body || {};
    const result = await generateClientInvoice(websiteId, userId, { sendEmail, customNotes });
    res.status(200).json({
      success: true,
      message: result.emailSent ? "Invoice generated and email dispatched to client" : "Invoice generated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
