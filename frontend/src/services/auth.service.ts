const API_URL = "http://localhost:5000/api/v1";

export interface AuthUser {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  status: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  lastLoginAt: string | null;
}

interface MeResponse {
  success: boolean;
  data?: {
    user: AuthUser;
  };
  message?: string;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      return null;
    }

    const data: MeResponse = await response.json();

    if (!data.success || !data.data?.user) {
      return null;
    }

    return data.data.user;
  } catch (error) {
    console.error("Failed to fetch current user:", error);
    return null;
  }
}

export function loginWithGoogle() {
  window.location.href = `${API_URL}/auth/google`;
}

export function loginWithGitHub() {
  window.location.href = `${API_URL}/auth/github`;
}