/**
 * Auth state for the Traveloop frontend, backed by our FastAPI /auth endpoints.
 * Stores the JWT in localStorage; `useAuth()` exposes the current user (fetched
 * via /auth/me) and login/register/logout helpers.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, clearToken, getToken, setToken } from "@/lib/api";

export interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  photo_url: string | null;
  additional_info: string | null;
  is_admin: boolean;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  is_admin: boolean;
}

export function useAuth() {
  const qc = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ["auth", "me"],
    enabled: !!getToken(),
    queryFn: () => api<UserProfile>("/auth/me"),
    retry: false,
  });

  const login = async (email: string, password: string) => {
    const resp = await api<TokenResponse>("/auth/login", {
      method: "POST",
      body: { email, password },
      anon: true,
    });
    setToken(resp.access_token);
    await qc.invalidateQueries({ queryKey: ["auth", "me"] });
    return resp;
  };

  const register = async (payload: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone?: string;
    city?: string;
    country?: string;
  }) => {
    const resp = await api<TokenResponse>("/auth/register", {
      method: "POST",
      body: payload,
      anon: true,
    });
    setToken(resp.access_token);
    await qc.invalidateQueries({ queryKey: ["auth", "me"] });
    return resp;
  };

  const logout = () => {
    clearToken();
    qc.removeQueries({ queryKey: ["auth", "me"] });
    qc.clear();
  };

  return {
    user: user ?? null,
    loading: isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
  };
}
