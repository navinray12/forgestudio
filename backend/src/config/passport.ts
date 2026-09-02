import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";

// const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

// =========================
// Google OAuth
// =========================

passport.use(
  new GoogleStrategy(
    {
<<<<<<< HEAD
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL:
        "http://localhost:5000/api/v1/auth/google/callback",
=======
      clientID: process.env.GOOGLE_CLIENT_ID || "placeholder-google-client-id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "placeholder-google-client-secret",
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/api/v1/auth/google/callback",
>>>>>>> 8d95dec (Initial project code)
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

passport.use(
  new GitHubStrategy(
    {
<<<<<<< HEAD
      clientID: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      callbackURL:
        "http://localhost:5000/api/v1/auth/github/callback",
=======
      clientID: process.env.GITHUB_CLIENT_ID || "placeholder-github-client-id",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "placeholder-github-client-secret",
      callbackURL:
        process.env.GITHUB_CALLBACK_URL || "http://localhost:5000/api/v1/auth/github/callback",
>>>>>>> 8d95dec (Initial project code)
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