import "dotenv/config";
import dns from "node:dns/promises";
import net from "node:net";
import nodemailer from "nodemailer";

const host = process.env.SMTP_HOST;
const port = Number(process.env.SMTP_PORT || 587);
if (!host) throw new Error("SMTP_HOST is required");
const bounded = (promise, ms, label) => Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(`${label}_TIMEOUT`)), ms))]);
try { await bounded(dns.lookup(host), 5000, "DNS"); console.log("smtp_dns=pass"); } catch (e) { console.log(`smtp_dns=fail:${e.code || e.message}`); process.exit(1); }
try {
  await bounded(new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    socket.setTimeout(5000);
    socket.once("connect", () => { socket.destroy(); resolve(); });
    socket.once("timeout", () => reject(new Error("TCP_TIMEOUT")));
    socket.once("error", reject);
  }), 6000, "TCP");
  console.log("smtp_tcp=pass");
} catch (e) { console.log(`smtp_tcp=fail:${e.code || e.message}`); process.exit(1); }
const transport = nodemailer.createTransport({
  host, port, secure: port === 465,
  connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 8000,
  auth: process.env.SMTP_USER && process.env.SMTP_PASSWORD ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
});
try { await bounded(transport.verify(), 10000, "SMTP"); console.log("smtp_tls_auth=pass"); }
catch (e) { console.log(`smtp_tls_auth=fail:${e.code || e.message}`); process.exitCode = 1; }
finally { transport.close(); }
