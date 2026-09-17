/**
 * @file Passport: platform/authentication module support.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";

// const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

// =========================
// Google OAuth
// =========================

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL:
        "http://localhost:5000/api/v1/auth/google/callback",
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        console.log("Google profile:", {
          id: profile.id,
          email: profile.emails?.[0]?.value,
          name: profile.displayName,
        });

        return done(null, profile);
      } catch (error) {
        return done(error as Error, undefined);
      }
    }
  )
);

// =========================
// GitHub OAuth
// =========================

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      callbackURL:
        "http://localhost:5000/api/v1/auth/github/callback",
    },
    async (
      _accessToken: string,
      _refreshToken: string,
      profile: {
        id: string;
        username?: string;
        displayName?: string;
        emails?: Array<{
          value: string;
        }>;
      },
      done: (
        error: Error | null,
        user?: unknown
      ) => void
    ) => {
      try {
        console.log("GitHub profile:", {
          id: profile.id,
          username: profile.username,
          email: profile.emails?.[0]?.value,
          name: profile.displayName,
        });

        return done(null, profile);
      } catch (error) {
        return done(error as Error);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user as Express.User);
});

export default passport;
