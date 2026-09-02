import { useEffect, useState } from "react";
import type { FormEvent } from "react";
<<<<<<< HEAD

=======
>>>>>>> 8d95dec (Initial project code)
function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

<<<<<<< HEAD
  // =========================
  // OTP Verification States
  // =========================
  const [step, setStep] = useState<"credentials" | "create_password" | "select_method" | "otp">("credentials");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [selectedChannel, setSelectedChannel] = useState<"EMAIL" | "WHATSAPP">("EMAIL");
  const [otp, setOtp] = useState("");
  const [otpUserId, setOtpUserId] = useState("");
  const [otpEmail, setOtpEmail] = useState("");
  const [otpPhone, setOtpPhone] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  const apiUrl =
    import.meta.env.VITE_API_URL || "http://localhost:5000";

  const maskEmail = (emailStr?: string) => {
    if (!emailStr) return "ha****@gmail.com";
    const parts = emailStr.split("@");
    if (parts.length < 2) return emailStr;
    const [local, domain] = parts;
    if (local.length <= 2) return `${local[0]}*@${domain}`;
    return `${local.slice(0, 2)}****@${domain}`;
  };

  const maskPhone = (phoneStr?: string) => {
    if (!phoneStr) return "+91 ******1234";
    const clean = phoneStr.trim();
    if (clean.length <= 4) return clean;
    const last4 = clean.slice(-4);
    const prefix = clean.startsWith("+") ? clean.slice(0, 3) : "+91";
    return `${prefix} ******${last4}`;
  };

  // =========================
  // Resend Countdown Timer
  // =========================
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // =========================
  // OAuth Callback Handling
  // =========================
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const oauthCreatePassword = params.get("oauth_create_password");
    const oauthSelect = params.get("oauth_select");
    const oauthUserId = params.get("userId");
    const oauthEmail = params.get("email");
    const oauthPhone = params.get("phone");
    const oauthStatus = params.get("oauth");
    const oauthError = params.get("error");

    if (oauthCreatePassword === "true" && oauthUserId) {
      setOtpUserId(oauthUserId);
      setOtpEmail(oauthEmail || "");
      setOtpPhone(oauthPhone || "");
      setStep("create_password");
    } else if (oauthSelect === "true" && oauthUserId) {
      setOtpUserId(oauthUserId);
      setOtpEmail(oauthEmail || "");
      setOtpPhone(oauthPhone || "");
      setStep("select_method");
      setSelectedChannel("EMAIL");
    } else if (oauthStatus === "google_success" || oauthStatus === "github_success") {
=======
  const apiUrl =
    import.meta.env.VITE_API_URL || "http://localhost:5000";

  // =========================
  // OAuth Callback Handling
  // =========================

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const oauthStatus = params.get("oauth");
    const oauthError = params.get("error");

    if (oauthStatus === "google_success" || oauthStatus === "github_success") {
>>>>>>> 8d95dec (Initial project code)
      console.log("OAuth login successful, redirecting to dashboard...");
      window.location.href = "/dashboard";
    }

    if (oauthError === "google_auth_failed") {
      setError("Google authentication failed. Please try again.");
    }

    if (oauthError === "github_auth_failed") {
      setError("GitHub authentication failed. Please try again.");
    }
  }, []);

  // =========================
  // Google OAuth
  // =========================
<<<<<<< HEAD
=======

>>>>>>> 8d95dec (Initial project code)
  const handleGoogleLogin = () => {
    window.location.href = `${apiUrl}/api/v1/auth/google`;
  };

  // =========================
  // GitHub OAuth
  // =========================
<<<<<<< HEAD
=======

>>>>>>> 8d95dec (Initial project code)
  const handleGithubLogin = () => {
    window.location.href = `${apiUrl}/api/v1/auth/github`;
  };

  // =========================
<<<<<<< HEAD
  // Create Password Submit
  // =========================
  const handleCreatePassword = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setError("");

    if (!newPassword) {
      setError("Please enter a password.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${apiUrl}/api/v1/auth/create-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            userId: otpUserId,
            password: newPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error?.message || "Failed to create password. Please try again."
        );
      }

      if (data.requireOtp) {
        setStep("otp");
        setResendCooldown(60);
        return;
      }

      setStep("select_method");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create password."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // Credentials Login Submit
  // =========================
=======
  // Normal Login
  // =========================

>>>>>>> 8d95dec (Initial project code)
  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setError("");
<<<<<<< HEAD
    setResendMessage("");
=======
>>>>>>> 8d95dec (Initial project code)

    if (!identifier.trim()) {
      setError("Please enter your email or phone number.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${apiUrl}/api/v1/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            identifier: identifier.trim(),
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error?.message ||
            "Invalid email/phone number or password."
        );
      }

<<<<<<< HEAD
      if (data.requireChannelSelection) {
        setOtpUserId(data.data.userId);
        setOtpEmail(data.data.email || "");
        setOtpPhone(data.data.phone || "");
        setStep("select_method");
        setSelectedChannel("EMAIL");
        return;
      }

      if (data.requireOtp) {
        setOtpUserId(data.data.userId);
        setOtpEmail(data.data.email || "");
        setStep("otp");
        setResendCooldown(60);
        return;
      }

=======
>>>>>>> 8d95dec (Initial project code)
      console.log("Login successful:", data);
      window.location.href = "/dashboard";
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

<<<<<<< HEAD
  // =========================
  // Send OTP for Selected Channel
  // =========================
  const handleSendOtpForChannel = async (channelChoice: "EMAIL" | "WHATSAPP") => {
    setError("");
    setResendMessage("");

    try {
      setLoading(true);

      const response = await fetch(`${apiUrl}/api/v1/auth/login/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          userId: otpUserId,
          channel: channelChoice,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error?.message || "Failed to send verification code."
        );
      }

      if (data.requireOtp) {
        setOtpEmail(data.data.email || otpEmail);
        setStep("otp");
        setResendCooldown(60);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to send verification code."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChannelSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSendOtpForChannel(selectedChannel);
  };

  // =========================
  // OTP Verification Submit
  // =========================
  const handleVerifyOtp = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setError("");
    setResendMessage("");

    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      setError("Please enter a valid 6-digit verification code.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${apiUrl}/api/v1/auth/login/verify-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            userId: otpUserId,
            otp: cleanOtp,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error?.message ||
            "Invalid or expired verification code."
        );
      }

      console.log("OTP Verification successful:", data);
      window.location.href = "/dashboard";
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Verification failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // Resend OTP Handler
  // =========================
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resendLoading) return;

    setError("");
    setResendMessage("");

    try {
      setResendLoading(true);

      const response = await fetch(
        `${apiUrl}/api/v1/auth/login/resend-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            userId: otpUserId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error?.message ||
            "Failed to resend verification code. Please try again."
        );
      }

      setResendMessage("A new 6-digit code has been sent to your email.");
      setResendCooldown(60);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not resend code. Please try again later."
      );
    } finally {
      setResendLoading(false);
    }
  };

=======
>>>>>>> 8d95dec (Initial project code)
  return (
    <main className="min-h-screen overflow-hidden bg-[#f4f7fc]">
      <div className="grid min-h-screen lg:grid-cols-[1.08fr_0.92fr]">

        {/* ================= LEFT SIDE ================= */}

        <section className="relative hidden min-h-screen overflow-hidden bg-[#111a2d] lg:block">

          {/* Background */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_40%,rgba(37,99,235,0.18),transparent_35%)]" />

          {/* Diagonal */}
          <div
            className="absolute inset-y-0 -right-[2px] z-20 w-[34%] bg-[#f4f7fc]"
            style={{
              clipPath:
                "polygon(100% 0,100% 100%,0 100%)",
            }}
          />

          <div className="relative z-10 flex min-h-screen flex-col px-[7%] py-10 xl:px-[8%]">

            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 text-lg font-bold text-white">
                F
              </div>

              <span className="text-xl font-bold tracking-tight text-white">
                ForgeStudio
              </span>
            </div>

            {/* Hero */}
            <div className="flex flex-1 items-center">
              <div className="max-w-[620px] pb-10">

                <div className="mb-7 inline-flex rounded-full border border-blue-300/20 bg-blue-400/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-300">
                  Build without limits
                </div>

                <h1 className="text-[56px] font-bold leading-[1.04] tracking-[-0.045em] text-white xl:text-[68px]">
                  Your ideas,
                  <br />
                  shipped as
                  <br />
                  polished
                  <br />
                  websites.
                </h1>

                <p className="mt-7 max-w-[450px] text-[16px] leading-7 text-slate-400">
                  Build, customize and launch powerful websites
                  without limits.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>© 2026 ForgeStudio</span>
              <span>Build something amazing.</span>
            </div>
          </div>
        </section>

        {/* ================= RIGHT SIDE ================= */}

        <section className="flex min-h-screen items-center justify-center px-5 py-8 sm:px-8">

          {/* Mobile Brand */}
          <div className="absolute left-6 top-6 flex items-center gap-3 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-cyan-400 font-bold text-white">
              F
            </div>

            <span className="font-bold text-slate-900">
              ForgeStudio
            </span>
          </div>

<<<<<<< HEAD
          {/* ================= CARD ================= */}

          <div className="w-full max-w-[440px] rounded-[25px] border border-slate-200 bg-white p-7 shadow-[0_18px_55px_rgba(15,23,42,0.10)] sm:p-8">

            {step === "credentials" ? (
              <>
                {/* Heading */}
                <div>
                  <h2 className="text-[30px] font-bold tracking-[-0.025em] text-[#111827]">
                    Welcome back
                  </h2>

                  <p className="mt-2 text-[13px] leading-5 text-slate-500">
                    Sign in to continue building something amazing.
                  </p>

                  <p className="mt-3 text-[13px] text-slate-500">
                    Don't have an account?{" "}
                    <a
                      href="/signup"
                      className="font-semibold text-blue-600 hover:text-blue-700"
                    >
                      Sign up
                    </a>
                  </p>
                </div>

                {/* ================= GOOGLE + GITHUB ================= */}

                <div className="mt-6 flex items-center justify-center gap-3">

                  {/* Google */}
                  <button
                    type="button"
                    aria-label="Continue with Google"
                    onClick={handleGoogleLogin}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-[17px] font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    G
                  </button>

                  {/* GitHub */}
                  <button
                    type="button"
                    aria-label="Continue with GitHub"
                    onClick={handleGithubLogin}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.38 7.86 10.9.58.1.79-.25.79-.56v-2.1c-3.2.7-3.88-1.54-3.88-1.54-.53-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.23-1.27-5.23-5.67 0-1.25.45-2.27 1.18-3.07-.12-.29-.51-1.45.11-3.03 0 0 .96-.31 3.15 1.17a10.8 10.8 0 0 1 5.74 0c2.19-1.48 3.15-1.17 3.15-1.17.62 1.58.23 2.74.11 3.03.73.8 1.18 1.82 1.18 3.07 0 4.41-2.69 5.38-5.25 5.66.41.36.78 1.07.78 2.16v3.2c0 .31.21.67.8.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
                    </svg>
                  </button>

                  <span className="ml-1 text-[12px] font-medium text-slate-500">
                    OR
                  </span>
                </div>

                {/* Divider */}
                <div className="my-6 h-px bg-slate-100" />

                {/* Error */}
                {error && (
                  <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-600">
                    {error}
                  </div>
                )}

                {/* ================= FORM ================= */}

                <form
                  onSubmit={handleSubmit}
                  className="space-y-5"
                >

                  {/* Email / Phone */}
                  <div>
                    <label
                      htmlFor="identifier"
                      className="mb-2 block text-[13px] font-semibold text-slate-700"
                    >
                      Email or phone number
                    </label>

                    <input
                      id="identifier"
                      type="text"
                      value={identifier}
                      onChange={(event) =>
                        setIdentifier(event.target.value)
                      }
                      placeholder="Enter your email or phone number"
                      autoComplete="username"
                      className="h-12 w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-4 text-[13px] text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                    />
                  </div>

                  {/* Password */}
                  <div>

                    {/* Password Label */}
                    <div className="mb-2">
                      <label
                        htmlFor="password"
                        className="text-[13px] font-semibold text-slate-700"
                      >
                        Password
                      </label>
                    </div>

                    {/* Password Input */}
                    <div className="relative">

                      <input
                        id="password"
                        type={
                          showPassword
                            ? "text"
                            : "password"
                        }
                        value={password}
                        onChange={(event) =>
                          setPassword(event.target.value)
                        }
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        className="h-12 w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-4 pr-16 text-[13px] text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                      />

                      {/* Show / Hide */}
                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword(
                            (value) => !value
                          )
                        }
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-blue-600 hover:text-blue-700"
                      >
                        {showPassword
                          ? "Hide"
                          : "Show"}
                      </button>

                    </div>

                    {/* Forgot Password */}
                    <div className="mt-2 flex justify-end">
                      <a
                        href="/forgot-password"
                        className="text-[12px] font-semibold text-blue-600 transition hover:text-blue-700"
                      >
                        Forgot password?
                      </a>
                    </div>

                  </div>

                  {/* Login Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-2 h-12 w-full rounded-xl bg-gradient-to-r from-[#3158df] to-[#59c7a9] text-[13px] font-bold text-white shadow-[0_8px_22px_rgba(49,88,223,0.22)] transition duration-200 hover:-translate-y-[1px] hover:shadow-[0_12px_28px_rgba(49,88,223,0.25)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading
                      ? "Signing in..."
                      : "Sign in"}
                  </button>

                </form>
              </>
            ) : step === "create_password" ? (
              /* ================= CREATE FORGESTUDIO PASSWORD STEP ================= */
              <>
                <div>
                  <h2 className="text-[30px] font-bold tracking-[-0.025em] text-[#111827]">
                    Create your ForgeStudio password
                  </h2>

                  <p className="mt-2 text-[13px] leading-5 text-slate-500">
                    Set a ForgeStudio password for your account to complete registration.
                  </p>
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-600">
                    {error}
                  </div>
                )}

                <form onSubmit={handleCreatePassword} className="mt-6 space-y-4">
                  {/* New Password */}
                  <div>
                    <label
                      htmlFor="newPassword"
                      className="mb-1.5 block text-[13px] font-semibold text-slate-700"
                    >
                      Password
                    </label>

                    <div className="relative">
                      <input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Create a password"
                        autoComplete="new-password"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-4 pr-16 text-[13px] text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                      />

                      <button
                        type="button"
                        onClick={() => setShowNewPassword((v) => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-blue-600 hover:text-blue-700"
                      >
                        {showNewPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="mb-1.5 block text-[13px] font-semibold text-slate-700"
                    >
                      Confirm password
                    </label>

                    <div className="relative">
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm your password"
                        autoComplete="new-password"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-4 pr-16 text-[13px] text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                      />

                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-blue-600 hover:text-blue-700"
                      >
                        {showConfirmPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-2 h-12 w-full rounded-xl bg-gradient-to-r from-[#3158df] to-[#59c7a9] text-[13px] font-bold text-white shadow-[0_8px_22px_rgba(49,88,223,0.22)] transition duration-200 hover:-translate-y-[1px] hover:shadow-[0_12px_28px_rgba(49,88,223,0.25)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? "Creating password..." : "Continue"}
                  </button>
                </form>
              </>
            ) : step === "select_method" ? (
              /* ================= CHOOSE VERIFICATION METHOD STEP ================= */
              <>
                <div>
                  <h2 className="text-[30px] font-bold tracking-[-0.025em] text-[#111827]">
                    Choose verification method
                  </h2>

                  <p className="mt-2 text-[13px] leading-5 text-slate-500">
                    Select how you would like to receive your security verification code.
                  </p>
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-600">
                    {error}
                  </div>
                )}

                <form
                  onSubmit={handleSelectChannelSubmit}
                  className="mt-6 space-y-4"
                >
                  {/* Email Option */}
                  <div
                    onClick={() => {
                      setSelectedChannel("EMAIL");
                      setError("");
                    }}
                    className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition ${
                      selectedChannel === "EMAIL"
                        ? "border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/20"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                          selectedChannel === "EMAIL"
                            ? "border-blue-600 bg-blue-600"
                            : "border-slate-300"
                        }`}
                      >
                        {selectedChannel === "EMAIL" && (
                          <div className="h-2 w-2 rounded-full bg-white" />
                        )}
                      </div>
                      <div>
                        <div className="text-[14px] font-semibold text-slate-800">
                          Email OTP
                        </div>
                        <div className="text-[12px] text-slate-500">
                          {maskEmail(otpEmail)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* WhatsApp Option */}
                  <div
                    onClick={() => {
                      setSelectedChannel("WHATSAPP");
                      setError("");
                    }}
                    className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition ${
                      selectedChannel === "WHATSAPP"
                        ? "border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/20"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                          selectedChannel === "WHATSAPP"
                            ? "border-blue-600 bg-blue-600"
                            : "border-slate-300"
                        }`}
                      >
                        {selectedChannel === "WHATSAPP" && (
                          <div className="h-2 w-2 rounded-full bg-white" />
                        )}
                      </div>
                      <div>
                        <div className="text-[14px] font-semibold text-slate-800">
                          WhatsApp OTP
                        </div>
                        <div className="text-[12px] text-slate-500">
                          {maskPhone(otpPhone)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="h-12 w-full rounded-xl bg-gradient-to-r from-[#3158df] to-[#59c7a9] text-[13px] font-bold text-white shadow-[0_8px_22px_rgba(49,88,223,0.22)] transition duration-200 hover:-translate-y-[1px] hover:shadow-[0_12px_28px_rgba(49,88,223,0.25)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? "Sending..." : "Continue"}
                  </button>
                </form>

                <div className="mt-6 flex justify-center border-t border-slate-100 pt-5">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("credentials");
                      setError("");
                    }}
                    className="text-[12px] font-semibold text-slate-500 transition hover:text-slate-700"
                  >
                    ← Back to sign in
                  </button>
                </div>
              </>
            ) : (
              /* ================= OTP VERIFICATION STEP ================= */
              <>
                <div>
                  <h2 className="text-[30px] font-bold tracking-[-0.025em] text-[#111827]">
                    Verify your email
                  </h2>

                  <p className="mt-2 text-[13px] leading-5 text-slate-500">
                    We sent a 6-digit verification code to{" "}
                    <span className="font-semibold text-slate-700">
                      {otpEmail}
                    </span>
                  </p>
                </div>

                {/* Success Banner */}
                {resendMessage && (
                  <div className="mt-5 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-xs font-medium text-green-700">
                    {resendMessage}
                  </div>
                )}

                {/* Error Banner */}
                {error && (
                  <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-600">
                    {error}
                  </div>
                )}

                {/* OTP Form */}
                <form
                  onSubmit={handleVerifyOtp}
                  className="mt-6 space-y-5"
                >
                  <div>
                    <label
                      htmlFor="otpCode"
                      className="mb-2 block text-[13px] font-semibold text-slate-700"
                    >
                      Enter 6-digit OTP code
                    </label>

                    <input
                      id="otpCode"
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      placeholder="123456"
                      autoFocus
                      className="h-12 w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-4 text-center font-mono text-xl font-bold tracking-[0.4em] text-slate-800 outline-none transition placeholder:tracking-normal placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otp.length !== 6}
                    className="h-12 w-full rounded-xl bg-gradient-to-r from-[#3158df] to-[#59c7a9] text-[13px] font-bold text-white shadow-[0_8px_22px_rgba(49,88,223,0.22)] transition duration-200 hover:-translate-y-[1px] hover:shadow-[0_12px_28px_rgba(49,88,223,0.25)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? "Verifying..." : "Verify Code"}
                  </button>
                </form>

                {/* Resend Cooldown & Back */}
                <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-5 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("credentials");
                      setError("");
                      setOtp("");
                    }}
                    className="text-[12px] font-semibold text-slate-500 transition hover:text-slate-700"
                  >
                    ← Back to sign in
                  </button>

                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || resendLoading}
                    className="text-[12px] font-semibold text-blue-600 transition hover:text-blue-700 disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    {resendLoading
                      ? "Resending..."
                      : resendCooldown > 0
                      ? `Resend code in ${resendCooldown}s`
                      : "Resend verification code"}
                  </button>
                </div>
              </>
            )}

=======
          {/* ================= LOGIN CARD ================= */}

          <div className="w-full max-w-[440px] rounded-[25px] border border-slate-200 bg-white p-7 shadow-[0_18px_55px_rgba(15,23,42,0.10)] sm:p-8">

            {/* Heading */}
            <div>
              <h2 className="text-[30px] font-bold tracking-[-0.025em] text-[#111827]">
                Welcome back
              </h2>

              <p className="mt-2 text-[13px] leading-5 text-slate-500">
                Sign in to continue building something amazing.
              </p>

              <p className="mt-3 text-[13px] text-slate-500">
                Don't have an account?{" "}
                <a
                  href="/signup"
                  className="font-semibold text-blue-600 hover:text-blue-700"
                >
                  Sign up
                </a>
              </p>
            </div>

            {/* ================= GOOGLE + GITHUB ================= */}

            <div className="mt-6 flex items-center justify-center gap-3">

              {/* Google */}
              <button
                type="button"
                aria-label="Continue with Google"
                onClick={handleGoogleLogin}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-[17px] font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
              >
                G
              </button>

              {/* GitHub */}
              <button
                type="button"
                aria-label="Continue with GitHub"
                onClick={handleGithubLogin}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.38 7.86 10.9.58.1.79-.25.79-.56v-2.1c-3.2.7-3.88-1.54-3.88-1.54-.53-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.23-1.27-5.23-5.67 0-1.25.45-2.27 1.18-3.07-.12-.29-.51-1.45.11-3.03 0 0 .96-.31 3.15 1.17a10.8 10.8 0 0 1 5.74 0c2.19-1.48 3.15-1.17 3.15-1.17.62 1.58.23 2.74.11 3.03.73.8 1.18 1.82 1.18 3.07 0 4.41-2.69 5.38-5.25 5.66.41.36.78 1.07.78 2.16v3.2c0 .31.21.67.8.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
                </svg>
              </button>

              <span className="ml-1 text-[12px] font-medium text-slate-500">
                OR
              </span>
            </div>

            {/* Divider */}
            <div className="my-6 h-px bg-slate-100" />

            {/* Error */}
            {error && (
              <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-600">
                {error}
              </div>
            )}

            {/* ================= FORM ================= */}

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >

              {/* Email / Phone */}
              <div>
                <label
                  htmlFor="identifier"
                  className="mb-2 block text-[13px] font-semibold text-slate-700"
                >
                  Email or phone number
                </label>

                <input
                  id="identifier"
                  type="text"
                  value={identifier}
                  onChange={(event) =>
                    setIdentifier(event.target.value)
                  }
                  placeholder="Enter your email or phone number"
                  autoComplete="username"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-4 text-[13px] text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              {/* Password */}
              <div>

                {/* Password Label */}
                <div className="mb-2">
                  <label
                    htmlFor="password"
                    className="text-[13px] font-semibold text-slate-700"
                  >
                    Password
                  </label>
                </div>

                {/* Password Input */}
                <div className="relative">

                  <input
                    id="password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-4 pr-16 text-[13px] text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />

                  {/* Show / Hide */}
                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (value) => !value
                      )
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-blue-600 hover:text-blue-700"
                  >
                    {showPassword
                      ? "Hide"
                      : "Show"}
                  </button>

                </div>

                {/* Forgot Password */}
                <div className="mt-2 flex justify-end">
                  <a
                    href="/forgot-password"
                    className="text-[12px] font-semibold text-blue-600 transition hover:text-blue-700"
                  >
                    Forgot password?
                  </a>
                </div>

              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="mt-2 h-12 w-full rounded-xl bg-gradient-to-r from-[#3158df] to-[#59c7a9] text-[13px] font-bold text-white shadow-[0_8px_22px_rgba(49,88,223,0.22)] transition duration-200 hover:-translate-y-[1px] hover:shadow-[0_12px_28px_rgba(49,88,223,0.25)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "Signing in..."
                  : "Sign in"}
              </button>

            </form>

>>>>>>> 8d95dec (Initial project code)
            {/* Terms */}
            <p className="mt-6 text-center text-[11px] leading-5 text-slate-400">
              By continuing, you agree to our{" "}
              <a
                href="#"
                className="font-medium text-slate-600 hover:text-blue-600"
              >
                Terms of Service
              </a>{" "}
              and{" "}
              <a
                href="#"
                className="font-medium text-slate-600 hover:text-blue-600"
              >
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

export default LoginPage;