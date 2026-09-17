import { prisma } from "../config/prisma.js";

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

export async function listNetworks() {
  return prisma.multisiteNetwork.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteNetwork(id: string) {
  return prisma.multisiteNetwork.delete({
    where: { id },
  });
}
