import { useEffect, useState } from "react";
import type { FormEvent } from "react";
function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const apiUrl =
    import.meta.env.VITE_API_URL || "http://localhost:5000";

  // =========================
  // OAuth Callback Handling
  // =========================

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const oauthStatus = params.get("oauth");
    const oauthError = params.get("error");

    if (oauthStatus === "google_success") {
      console.log("Google OAuth login successful");

      // Temporary:
      // Dashboard navigation will be added
      // after /me authentication is connected.
    }

    if (oauthStatus === "github_success") {
      console.log("GitHub OAuth login successful");

      // Temporary:
      // Dashboard navigation will be added
      // after /me authentication is connected.
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

  const handleGoogleLogin = () => {
    window.location.href = `${apiUrl}/api/v1/auth/google`;
  };

  // =========================
  // GitHub OAuth
  // =========================

  const handleGithubLogin = () => {
    window.location.href = `${apiUrl}/api/v1/auth/github`;
  };

  // =========================
  // Normal Login
  // =========================

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setError("");

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

      console.log("Login successful:", data);

      // Dashboard navigation will be added
      // after auth flow is complete.
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