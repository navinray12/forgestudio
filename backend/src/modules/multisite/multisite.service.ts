/**
 * @file Multisite: business operations and coordination with persistence or external services. File responsibility: multisite service.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { prisma } from "../../platform/database/prisma.js";

/**
 * Create Network.
 * @param name Name supplied to this operation (type: string).
 * @param domain Domain supplied to this operation (type: string).
 * @param networkType Network Type supplied to this operation (type: string). Defaults to "SUBDIRECTORY".
 * @param config Config supplied to this operation (type: any). Defaults to {}.
 */
export async function createNetwork(name: string, domain: string, networkType: string = "SUBDIRECTORY", config: any = {}) {
  return prisma.multisiteNetwork.create({
    data: {
      name,
      domain,
      networkType,
      config,
    },
  });
}

/**
 * List Networks.
 */
export async function listNetworks() {
  return prisma.multisiteNetwork.findMany({
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Delete Network.
 * @param id Id supplied to this operation (type: string).
 */
export async function deleteNetwork(id: string) {
  return prisma.multisiteNetwork.delete({
    where: { id },
  });
}
