import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

export type UserRole =
  | "USER"
  | "ADMIN"
  | "SUPER_ADMIN"
  | "PLATFORM_ADMIN"
  | "SUPPORT_ADMIN"
  | "DEVELOPER"
  | "AI_CONTENT_ADMIN"
  | "TEAM_MEMBER";

export interface AuthUser {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  role: UserRole;
  status: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  lastLoginAt: string | null;
}

export interface SupportToken {
  id: string;
  label: string;
  token: string;
  scope: string;
  createdAt: string;
  expiresAt: string;
  status: "active" | "expired" | "revoked";
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
  supportTokens: SupportToken[];
  getSupportTokens: () => SupportToken[];
  createSupportToken: (label: string, durationHours: number, scope: string) => SupportToken;
  revokeSupportToken: (tokenId: string) => void;
}

const AuthContext = createContext<
  AuthContextType | undefined
>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({
  children,
}: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [supportTokens, setSupportTokens] = useState<SupportToken[]>(() => {
    try {
      const stored = localStorage.getItem("forgestudio_support_tokens");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const saveSupportTokens = (tokens: SupportToken[]) => {
    setSupportTokens(tokens);
    try {
      localStorage.setItem("forgestudio_support_tokens", JSON.stringify(tokens));
    } catch (e) {
      console.error("Failed to persist support tokens", e);
    }
  };

  const getSupportTokens = (): SupportToken[] => {
    const now = new Date().getTime();
    const updated = supportTokens.map((t) => {
      if (t.status === "active" && new Date(t.expiresAt).getTime() <= now) {
        return { ...t, status: "expired" as const };
      }
      return t;
    });
    return updated;
  };

  const createSupportToken = (
    label: string,
    durationHours: number,
    scope: string
  ): SupportToken => {
    const now = new Date();
    const expires = new Date(now.getTime() + durationHours * 3600 * 1000);
    const randPart = Math.random().toString(36).substring(2, 10);
    const newToken: SupportToken = {
      id: "supp_" + Date.now().toString(36) + "_" + randPart,
      label: label || "Temporary Support Ticket #" + Math.floor(Math.random() * 9000 + 1000),
      token: `fs_supp_${Date.now().toString(36)}_${randPart}_sec`,
      scope: scope || "editor_read_write",
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      status: "active",
    };

    const nextTokens = [newToken, ...supportTokens];
    saveSupportTokens(nextTokens);
    return newToken;
  };

  const revokeSupportToken = (tokenId: string) => {
    const nextTokens = supportTokens.map((t) =>
      t.id === tokenId ? { ...t, status: "revoked" as const } : t
    );
    saveSupportTokens(nextTokens);
  };

  const checkAuth = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/v1/auth/me`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!response.ok) {
        setUser(null);
        return;
      }

      const data = await response.json();

      if (data.success && data.data?.user) {
        setUser(data.data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error(
        "Authentication check failed:",
        error
      );

      setUser(null);
    }
  };

  const logout = async () => {
    try {
      await fetch(
        `${API_URL}/api/v1/auth/logout`,
        {
          method: "POST",
          credentials: "include",
        }
      );
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setUser(null);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const params = new URLSearchParams(
        window.location.search
      );

      const oauthStatus = params.get("oauth");

      // OAuth callback completed
      if (
        oauthStatus === "google_success" ||
        oauthStatus === "github_success"
      ) {
        await checkAuth();

        // Remove OAuth query parameters
        window.history.replaceState(
          {},
          document.title,
          "/login"
        );
      } else {
        // Normal application startup
        await checkAuth();
      }

      setLoading(false);
    };

    initializeAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        checkAuth,
        logout,
        supportTokens,
        getSupportTokens,
        createSupportToken,
        revokeSupportToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}