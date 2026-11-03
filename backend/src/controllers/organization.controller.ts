import type { Request, Response, NextFunction } from "express";
import {
  createOrganization,
  getOrganization,
  getUserOrganizations,
  addOrganizationMember,
  removeOrganizationMember,
} from "../services/organization.service.js";

export async function getUserOrganizationsHandler(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const organizations = await getUserOrganizations(user.id);
    return res.status(200).json({ success: true, organizations });
  } catch (err) {
    next(err);
  }
}

export async function createOrganizationHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const { name, slug, settings } = req.body;
    const organization = await createOrganization(user.id, name, slug, settings);
    return res.status(201).json({ success: true, organization });
  } catch (err) {
    next(err);
  }
}

export async function getOrganizationHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const orgId = String(req.params.id);
    const organization = await getOrganization(orgId, user.id);
    return res.status(200).json({ success: true, organization });
  } catch (err) {
    next(err);
  }
}

export async function addOrganizationMemberHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const orgId = String(req.params.id);
    const { userId, role } = req.body;
    const member = await addOrganizationMember(orgId, user.id, String(userId), role);
    return res.status(201).json({ success: true, member });
  } catch (err) {
    next(err);
  }
}

export async function removeOrganizationMemberHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const orgId = String(req.params.id);
    const targetUserId = String(req.params.userId);
    const result = await removeOrganizationMember(orgId, user.id, targetUserId);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
