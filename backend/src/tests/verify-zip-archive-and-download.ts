import fs from "fs";
import path from "path";
import http from "http";
import zlib from "zlib";
import { prisma } from "../config/prisma.js";

function parseZipEntries(buffer: Buffer): Array<{ name: string; uncompressedSize: number }> {
  const entries: Array<{ name: string; uncompressedSize: number }> = [];
  let offset = 0;

  while (offset < buffer.length - 4) {
    const sig = buffer.readUInt32LE(offset);
    if (sig === 0x02014b50) {
      // Central directory file header
      const uncompressedSize = buffer.readUInt32LE(offset + 24);
      const fileNameLen = buffer.readUInt16LE(offset + 28);
      const extraLen = buffer.readUInt16LE(offset + 30);
      const commentLen = buffer.readUInt16LE(offset + 32);
      const fileName = buffer.toString("utf8", offset + 46, offset + 46 + fileNameLen);

      entries.push({ name: fileName, uncompressedSize });
      offset += 46 + fileNameLen + extraLen + commentLen;
    } else {
      offset++;
    }
  }

  return entries;
}

async function verifyZipAndDownload() {
  console.log("=================================================");
  console.log("RUNNING LIVE ZIP INTEGRITY & DOWNLOAD TEST");
  console.log("=================================================\n");

  const websiteId = "26a9be1a-a4d5-4447-a50f-397c51e4d05c";
  const deploymentId = "69b0bc03-86d0-4377-926a-a8abf457458c";
  const supportToken = "supp_8UtDroe2DKOLB8ljqppy2yqS7P0nI-6VK6gsJYyu7HQ";

  // 1. Download Static ZIP via HTTP Endpoint
  const zipBuffer: Buffer = await new Promise((resolve, reject) => {
    const req = http.request(
      `http://localhost:5000/api/websites/${websiteId}/deployments/${deploymentId}/export-download`,
      {
        method: "GET",
        headers: {
          Cookie: `forge_session=${supportToken}`,
        },
      },
      (res) => {
        if (res.statusCode !== 200) {
          return reject(new Error(`Download failed with status: ${res.statusCode}`));
        }
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => resolve(Buffer.concat(chunks)));
      }
    );
    req.on("error", reject);
    req.end();
  });

  console.log(`[PASS] ZIP downloaded successfully via HTTP (${zipBuffer.length} bytes)`);

  // Assert ZIP magic bytes (PK\x03\x04)
  const isZip =
    zipBuffer[0] === 0x50 &&
    zipBuffer[1] === 0x4b &&
    zipBuffer[2] === 0x03 &&
    zipBuffer[3] === 0x04;

  if (!isZip) {
    throw new Error("Downloaded file does not have valid ZIP magic header");
  }
  console.log("[PASS] Valid PK\\x03\\x04 ZIP magic signature verified");

  // 2. Parse and inspect archive entries
  const zipEntries = parseZipEntries(zipBuffer);
  const entryNames = zipEntries.map((e) => e.name);
  console.log("Archive entries found in ZIP:", entryNames);

  const requiredEntries = ["index.html", "styles.css", "runtime.js", "site-manifest.json", "features.html"];
  for (const reqFile of requiredEntries) {
    const entry = zipEntries.find((e) => e.name === reqFile);
    if (!entry || entry.uncompressedSize === 0) {
      throw new Error(`Required file ${reqFile} is missing or empty in ZIP`);
    }
    console.log(`[PASS] Entry '${reqFile}' exists and is non-empty (${entry.uncompressedSize} bytes)`);
  }

  console.log(`[PASS] Successfully verified all ${requiredEntries.length} required files inside the static export ZIP archive`);

  // 3. Test that failed/unverified deployment cannot be downloaded
  const failedDeployment = await prisma.deployment.create({
    data: {
      websiteId,
      version: 99,
      status: "VERIFICATION_FAILED",
      destinationType: "STATIC",
      metadata: { error: "Simulated verification failure" },
    },
  });

  const failedDownloadStatus: number = await new Promise((resolve) => {
    const req = http.request(
      `http://localhost:5000/api/websites/${websiteId}/deployments/${failedDeployment.id}/export-download`,
      {
        method: "GET",
        headers: {
          Cookie: `forge_session=${supportToken}`,
        },
      },
      (res) => {
        resolve(res.statusCode || 0);
      }
    );
    req.end();
  });

  if (failedDownloadStatus === 400) {
    console.log(`[PASS] Failed deployment download was correctly rejected with HTTP 400 (EXPORT_UNVERIFIED)`);
  } else {
    throw new Error(`Expected HTTP 400 when downloading failed deployment, got: ${failedDownloadStatus}`);
  }

  // Cleanup failed deployment
  await prisma.deployment.delete({ where: { id: failedDeployment.id } });

  // 4. Test Idempotent Re-verification (zero duplicate deployment records)
  const countBefore = await prisma.deployment.count({ where: { websiteId } });

  const verifyResponse: any = await new Promise((resolve, reject) => {
    const req = http.request(
      `http://localhost:5000/api/websites/${websiteId}/deployments/${deploymentId}/verify`,
      {
        method: "POST",
        headers: {
          Cookie: `forge_session=${supportToken}`,
          "Content-Type": "application/json",
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve(JSON.parse(data)));
      }
    );
    req.on("error", reject);
    req.end();
  });

  const countAfter = await prisma.deployment.count({ where: { websiteId } });

  if (verifyResponse.verified && countBefore === countAfter) {
    console.log(`[PASS] Re-verification succeeded idempotently; deployment count remained ${countBefore} (zero duplicates)`);
  } else {
    throw new Error(`Re-verification failed or created duplicate records! Response: ${JSON.stringify(verifyResponse)}, Count before: ${countBefore}, count after: ${countAfter}`);
  }

  console.log("\n=================================================");
  console.log("ALL LIVE ZIP & DOWNLOAD VERIFICATIONS PASSED!");
  console.log("=================================================");

  await prisma.$disconnect();
}

verifyZipAndDownload().catch((err) => {
  console.error(err);
  process.exit(1);
});
