import type {
  AiConceptResponse,
  AssessmentDetail,
  AssessmentInputPayload,
  AssessmentSummary,
  Property,
  TokenPair,
  User,
} from "./types";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

const ACCESS_KEY = "rainwise.access";
const REFRESH_KEY = "rainwise.refresh";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface Tokens {
  access: string;
  refresh: string;
}

export function getTokens(): Tokens | null {
  if (typeof window === "undefined") return null;
  const access = window.localStorage.getItem(ACCESS_KEY);
  const refresh = window.localStorage.getItem(REFRESH_KEY);
  if (!access || !refresh) return null;
  return { access, refresh };
}

export function setTokens(tokens: Tokens): void {
  window.localStorage.setItem(ACCESS_KEY, tokens.access);
  window.localStorage.setItem(REFRESH_KEY, tokens.refresh);
}

export function clearTokens(): void {
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
}

function formatDetail(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "Something went wrong.";
  const detail = (payload as { detail?: unknown }).detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (item && typeof item === "object" && "msg" in item) {
          return String((item as { msg: unknown }).msg);
        }
        return JSON.stringify(item);
      })
      .join("; ");
  }
  return "Something went wrong.";
}

let refreshPromise: Promise<boolean> | null = null;

async function refreshTokens(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const tokens = getTokens();
    if (!tokens) return false;

    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: tokens.refresh }),
    });

    if (!response.ok) {
      clearTokens();
      return false;
    }

    const pair = (await response.json()) as TokenPair;
    setTokens({ access: pair.access_token, refresh: pair.refresh_token });
    return true;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  allowRetry = true,
): Promise<T> {
  const tokens = getTokens();
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (tokens) headers.set("Authorization", `Bearer ${tokens.access}`);

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (response.status === 401 && allowRetry && tokens) {
    const refreshed = await refreshTokens();
    if (refreshed) return request<T>(path, options, false);
  }

  if (!response.ok) {
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    throw new ApiError(formatDetail(payload), response.status);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  async register(email: string, password: string, fullName: string): Promise<TokenPair> {
    return request<TokenPair>(
      "/auth/register",
      {
        method: "POST",
        body: JSON.stringify({ email, password, full_name: fullName }),
      },
      false,
    );
  },

  async login(email: string, password: string): Promise<TokenPair> {
    return request<TokenPair>(
      "/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) },
      false,
    );
  },

  async logout(): Promise<void> {
    await request<{ message: string }>("/auth/logout", { method: "POST" });
  },

  async me(): Promise<User> {
    return request<User>("/auth/me");
  },

  async forgotPassword(email: string): Promise<{ message: string; reset_token: string | null }> {
    return request("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    return request("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, new_password: newPassword }),
    });
  },

  async listProperties(): Promise<Property[]> {
    return request<Property[]>("/properties");
  },

  async createProperty(input: {
    name: string;
    address?: string;
    latitude?: number | null;
    longitude?: number | null;
    notes?: string;
  }): Promise<Property> {
    return request<Property>("/properties", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async getProperty(id: string): Promise<Property> {
    return request<Property>(`/properties/${id}`);
  },

  async updateProperty(
    id: string,
    input: Partial<Pick<Property, "name" | "address" | "latitude" | "longitude" | "notes" | "is_archived">>,
  ): Promise<Property> {
    return request<Property>(`/properties/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },

  async archiveProperty(id: string): Promise<Property> {
    return request<Property>(`/properties/${id}`, { method: "DELETE" });
  },

  async listAssessments(propertyId: string): Promise<AssessmentSummary[]> {
    return request<AssessmentSummary[]>(`/properties/${propertyId}/assessments`);
  },

  async listAllAssessments(): Promise<AssessmentSummary[]> {
    return request<AssessmentSummary[]>("/assessments");
  },

  async getAssessment(id: string): Promise<AssessmentDetail> {
    return request<AssessmentDetail>(`/assessments/${id}`);
  },

  async createAssessment(
    propertyId: string,
    label: string,
    payload: AssessmentInputPayload,
  ): Promise<AssessmentDetail> {
    return request<AssessmentDetail>(`/properties/${propertyId}/assessments`, {
      method: "POST",
      body: JSON.stringify({ label, payload }),
    });
  },

  async calculate(payload: AssessmentInputPayload): Promise<unknown> {
    return request("/assessments/calculate", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async conceptVisual(input: {
    system: string;
    tank_label: string | null;
    structure_type: string | null;
    notes: string[];
  }): Promise<AiConceptResponse> {
    return request<AiConceptResponse>("/ai/concept", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
};
