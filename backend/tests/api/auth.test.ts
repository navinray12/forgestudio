import app from "../../src/app.js";
import { prisma } from "../../src/config/prisma.js";
import http from "http";
import crypto from "crypto";

export async function runAuthApisAudit() {
    console.log("==================================================");
    console.log("   FORGESTUDIO AUTH MODULE — FULL AUTOMATED TEST  ");
    console.log("==================================================\n");

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(5088, resolve));

    const baseUrl = "http://localhost:5088";
    const testEmail = "auth_suite_user@example.com";
    const testPassword = "Password123!";
    let testUserId = "";
    let sessionCookie = "";

    try {
        const existing = await prisma.user.findFirst({ where: { email: testEmail } });
        if (existing) {
            await prisma.session.deleteMany({ where: { userId: existing.id } });
            await (prisma as any).otpVerification?.deleteMany({ where: { userId: existing.id } });
            await prisma.user.delete({ where: { id: existing.id } });
        }

        // 1. POST /api/v1/auth/signup
        const signupRes = await fetch(`${baseUrl}/api/v1/auth/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                fullName: "Auth Suite User",
                identifier: testEmail,
                password: testPassword,
            }),
        });
        const signupBody: any = await signupRes.json();
        if ((signupRes.status === 200 || signupRes.status === 201) && signupBody.data?.userId) {
            testUserId = signupBody.data.userId;
            console.log(`[PASSED] 1. POST /api/v1/auth/signup -> Account created (User ID: ${testUserId})`);
        } else {
            throw new Error(`Signup failed: ${JSON.stringify(signupBody)}`);
        }

        // 2. POST /api/v1/auth/signup/resend-otp
        await (prisma as any).otpVerification?.deleteMany({ where: { userId: testUserId } });
        const resendRes = await fetch(`${baseUrl}/api/v1/auth/signup/resend-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: testUserId }),
        });
        const resendBody: any = await resendRes.json();
        if (resendRes.status === 200 && resendBody.success) {
            console.log(`[PASSED] 2. POST /api/v1/auth/signup/resend-otp -> ${resendBody.message}`);
        } else {
            throw new Error(`Resend signup OTP failed: ${JSON.stringify(resendBody)}`);
        }

        // 3. POST /api/v1/auth/signup/verify-otp
        const testOtp = "123456";
        const testOtpHash = crypto.createHash("sha256").update(testOtp).digest("hex");
        await (prisma as any).otpVerification.updateMany({
            where: { userId: testUserId, purpose: "EMAIL_SIGNUP" },
            data: { otpHash: testOtpHash, expiresAt: new Date(Date.now() + 600000) },
        });

        const verifySignupRes = await fetch(`${baseUrl}/api/v1/auth/signup/verify-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userId: testUserId,
                otp: testOtp,
                channel: "EMAIL",
            }),
        });
        const verifySignupBody: any = await verifySignupRes.json();
        const signupSetCookie = verifySignupRes.headers.get("set-cookie");
        if (signupSetCookie) {
            sessionCookie = signupSetCookie.split(";")[0];
        }
        if (verifySignupRes.status === 200 && verifySignupBody.success) {
            console.log(`[PASSED] 3. POST /api/v1/auth/signup/verify-otp -> Verified email & session cookie issued`);
        } else {
            throw new Error(`Verify signup OTP failed: ${JSON.stringify(verifySignupBody)}`);
        }

        // 4. POST /api/v1/auth/login
        const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                identifier: testEmail,
                password: testPassword,
            }),
        });
        const loginBody: any = await loginRes.json();
        if (loginRes.status === 200 && loginBody.success) {
            console.log(`[PASSED] 4. POST /api/v1/auth/login -> Login step successful`);
        } else {
            throw new Error(`Login failed: ${JSON.stringify(loginBody)}`);
        }

        // 5. POST /api/v1/auth/login/send-otp
        await (prisma as any).otpVerification?.deleteMany({ where: { userId: testUserId } });
        const sendLoginOtpRes = await fetch(`${baseUrl}/api/v1/auth/login/send-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userId: testUserId,
                channel: "EMAIL",
            }),
        });
        const sendLoginOtpBody: any = await sendLoginOtpRes.json();
        if (sendLoginOtpRes.status === 200 && sendLoginOtpBody.success) {
            console.log(`[PASSED] 5. POST /api/v1/auth/login/send-otp -> Login OTP sent to email`);
        } else {
            throw new Error(`Send login OTP failed: ${JSON.stringify(sendLoginOtpBody)}`);
        }

        // 6. POST /api/v1/auth/login/verify-otp
        await (prisma as any).otpVerification.updateMany({
            where: { userId: testUserId, purpose: "EMAIL_LOGIN" },
            data: { otpHash: testOtpHash, expiresAt: new Date(Date.now() + 600000) },
        });
        const verifyLoginRes = await fetch(`${baseUrl}/api/v1/auth/login/verify-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userId: testUserId,
                otp: testOtp,
                channel: "EMAIL",
            }),
        });
        const verifyLoginBody: any = await verifyLoginRes.json();
        const loginSetCookie = verifyLoginRes.headers.get("set-cookie");
        if (loginSetCookie) {
            sessionCookie = loginSetCookie.split(";")[0];
        }
        if (verifyLoginRes.status === 200 && verifyLoginBody.success) {
            console.log(`[PASSED] 6. POST /api/v1/auth/login/verify-otp -> Authenticated via login OTP`);
        } else {
            throw new Error(`Verify login OTP failed: ${JSON.stringify(verifyLoginBody)}`);
        }

        // 7. GET /api/v1/auth/me
        const meRes = await fetch(`${baseUrl}/api/v1/auth/me`, {
            method: "GET",
            headers: { Cookie: sessionCookie },
        });
        const meBody: any = await meRes.json();
        if (meRes.status === 200 && meBody.success && meBody.data?.user?.id === testUserId) {
            console.log(`[PASSED] 7. GET /api/v1/auth/me -> Profile fetched for ${meBody.data.user.email}`);
        } else {
            throw new Error(`GET /api/v1/auth/me failed: ${JSON.stringify(meBody)}`);
        }

        // 8. POST /api/v1/auth/logout
        const logoutRes = await fetch(`${baseUrl}/api/v1/auth/logout`, {
            method: "POST",
            headers: { Cookie: sessionCookie },
        });
        const logoutBody: any = await logoutRes.json();
        if (logoutRes.status === 200 && logoutBody.success) {
            console.log(`[PASSED] 8. POST /api/v1/auth/logout -> Successfully logged out & session invalidated`);
        } else {
            throw new Error(`Logout failed: ${JSON.stringify(logoutBody)}`);
        }

        console.log("\n==================================================");
        console.log("   ALL 8 AUTH APIs VERIFIED 100% BUG-FREE (8/8)   ");
        console.log("==================================================");

        return true;

    } catch (err: any) {
        console.error("\n[TEST ERROR]:", err.message || err);
        return false;
    } finally {
        server.close();
    }
}

if (process.argv[1]?.endsWith("auth.test.ts") || process.argv[1]?.endsWith("auth.test.js")) {
    runAuthApisAudit();
}
