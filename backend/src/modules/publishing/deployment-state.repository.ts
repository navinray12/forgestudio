/**
 * @file Publishing: database reads and writes. File responsibility: deployment state repository.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { prisma } from "../../platform/database/prisma.js";
import { AppError } from "../../platform/http/app-error.js";
import type { Prisma } from "../../generated/prisma/client.js";

const predecessors: Record<string, string[]> = {
  BUILDING: ["QUEUED"],
  PROCESSING: ["BUILDING"],
  DEPLOYING: ["PROCESSING"],
  VERIFYING: ["DEPLOYING"],
  PUBLISHED: ["VERIFYING"],
  VERIFICATION_FAILED: ["VERIFYING"],
  RECONCILIATION_REQUIRED: ["DEPLOYING", "VERIFYING"],
  // A failure after activation may have committed; retain that uncertainty.
  DEPLOY_FAILED: ["QUEUED", "BUILDING", "PROCESSING"],
};

export type DeploymentDetails = Pick<
  Prisma.DeploymentUpdateManyMutationInput,
  "completedAt" | "destinationRef" | "sourceRevisionId" | "metadata" | "error"
>;

/** Compare-and-swap in the database; terminal states cannot be overwritten.
 * @param id Id supplied to this operation (type: string).
 * @param status Status supplied to this operation (type: string).
 * @param details Details supplied to this operation (type: DeploymentDetails). Defaults to {}.
 */
export async function transitionDeployment(
  id: string,
  status: string,
  details: DeploymentDetails = {},
) {
  const from = predecessors[status];
  if (!from)
    throw new AppError(
      "Unsupported deployment transition.",
      409,
      "INVALID_DEPLOYMENT_TRANSITION",
    );
  return prisma.$transaction(async (tx) => {
    const changed = await tx.deployment.updateMany({
      where: { id, status: { in: from } },
      data: { ...details, status },
    });
    if (changed.count !== 1) {
      throw new AppError(
        "Deployment state changed or is already terminal.",
        409,
        "DEPLOYMENT_STATE_CONFLICT",
      );
    }
    return tx.deployment.findUniqueOrThrow({ where: { id } });
  });
}

/** The generic catch updates only current in-progress rows, never stale objects.
 * @param id Id supplied to this operation (type: string).
 * @param error Error value to inspect, report or pass to the next error boundary.
 */
export async function recordDeploymentFailure(
  id: string,
  error: { code: string; message: string },
) {
  return prisma.$transaction(async (tx) => {
    await tx.deployment.updateMany({
      where: { id, status: { in: ["QUEUED", "BUILDING", "PROCESSING"] } },
      data: { status: "DEPLOY_FAILED", error, completedAt: new Date() },
    });
    await tx.deployment.updateMany({
      where: { id, status: { in: ["DEPLOYING", "VERIFYING"] } },
      data: { status: "RECONCILIATION_REQUIRED", error },
    });
  });
}
