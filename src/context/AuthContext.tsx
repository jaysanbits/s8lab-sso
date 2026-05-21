import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  AuthConfig,
  AuthConfigContextValue,
  AuthContextValue,
  AuthProviderProps,
  AuthState,
  ForgotPasswordPayload,
  LoginPayload,
  MagicLinkPayload,
  SignupPayload,
  User,
} from "@/types";
import { loadRecaptchaV3Script } from "@/lib/captchaV3";

// ─── Contexts ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);
const AuthConfigContext = createContext<AuthConfigContextValue | null>(null);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toHeaderRecord(h: HeadersInit | undefined): Record<string, string> {
  if (!h) return {};
  if (h instanceof Headers) return Object.fromEntries(h.entries());
  if (Array.isArray(h)) return Object.fromEntries(h as [string, string][]);
  return h as Record<string, string>;
}

// ─── HTTP error with status code ──────────────────────────────────────────────

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

// ─── Default fetcher ──────────────────────────────────────────────────────────

async function defaultFetcher<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...toHeaderRecord(init.headers),
    },
  });

  if (!res.ok) {
    let message = `Request failed: ${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
      else if (body?.error) message = body.error;
    } catch {
      // ignore
    }
    throw new HttpError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Token refresh (module-level lock so concurrent 401s share one attempt) ───

let refreshPromise: Promise<boolean> | null = null;

function attemptRefresh(apiUrl: string): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = fetch(`${apiUrl}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({
  children,
  apiUrl,
  projectId,
  fetcher,
  rootPath = "/",
}: AuthProviderProps) {
  const [authConfig, setAuthConfig] = useState<AuthConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);

  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const apiUrlRef = useRef(apiUrl);
  apiUrlRef.current = apiUrl;
  const projectIdRef = useRef(projectId);
  projectIdRef.current = projectId;
  const fetchRef = useRef(fetcher ?? defaultFetcher);
  fetchRef.current = fetcher ?? defaultFetcher;

  // Wraps fetchRef to always include X-Project-Id header on every request.
  // On 401, attempts one token refresh then retries; logs out if refresh fails.
  const callApi = useCallback(async <T,>(url: string, init: RequestInit = {}): Promise<T> => {
    const makeRequest = () =>
      (fetchRef.current as typeof defaultFetcher)<T>(url, {
        ...init,
        headers: {
          ...toHeaderRecord(init.headers),
          "X-Project-Id": projectIdRef.current,
        },
      });

    try {
      return await makeRequest();
    } catch (err: unknown) {
      if (!(err instanceof HttpError) || err.status !== 401) throw err;
      const refreshed = await attemptRefresh(apiUrlRef.current);
      if (!refreshed) {
        setState({ user: null, isLoading: false, isAuthenticated: false });
        throw err;
      }
      return makeRequest();
    }
  }, []);

  // ── Bootstrap: load config → restore session via cookie ──────────────────────

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      // 1. Fetch auth config
      let cfg: AuthConfig;
      try {
        cfg = await callApi<AuthConfig>(`${apiUrlRef.current}/auth/config`);
        if (!cancelled) setAuthConfig(cfg);
      } catch {
        cfg = {
          allowSignup: true,
          allowMagicLink: false,
          captcha: { enabled: false },
        };
        if (!cancelled) setAuthConfig(cfg);
      } finally {
        if (!cancelled) setConfigLoading(false);
      }

      // 2. Load reCAPTCHA v3 script if needed (non-blocking)
      if (
        cfg.captcha?.enabled &&
        cfg.captcha.provider === "recaptcha" &&
        cfg.captcha.version === "v3" &&
        cfg.captcha.siteKey
      ) {
        loadRecaptchaV3Script(cfg.captcha.siteKey);
      }

      // 3. Restore session — cookie is forwarded automatically via credentials: "include"
      try {
        const user = await callApi<User>(`${apiUrlRef.current}/auth/me`);
        if (!cancelled) {
          setState({ user, isLoading: false, isAuthenticated: true });
        }
      } catch {
        if (!cancelled) {
          setState({ user: null, isLoading: false, isAuthenticated: false });
        }
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auth actions ─────────────────────────────────────────────────────────────

  const login = useCallback(
    async (payload: LoginPayload) => {
      setState((s) => ({ ...s, isLoading: true }));
      try {
        const data = await callApi<{ user: User }>(
          `${apiUrlRef.current}/auth/login`,
          { method: "POST", body: JSON.stringify(payload) }
        );
        setState({ user: data.user, isLoading: false, isAuthenticated: true });
      } catch (err) {
        setState((s) => ({ ...s, isLoading: false }));
        throw err;
      }
    },
    [callApi]
  );

  const signup = useCallback(
    async (payload: SignupPayload) => {
      setState((s) => ({ ...s, isLoading: true }));
      try {
        const data = await callApi<{ user: User }>(
          `${apiUrlRef.current}/auth/signup`,
          { method: "POST", body: JSON.stringify(payload) }
        );
        setState({ user: data.user, isLoading: false, isAuthenticated: true });
      } catch (err) {
        setState((s) => ({ ...s, isLoading: false }));
        throw err;
      }
    },
    [callApi]
  );

  const logout = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true }));
    try {
      await callApi(`${apiUrlRef.current}/auth/logout`, {
        method: "POST",
      }).catch(() => {});
    } finally {
      setState({ user: null, isLoading: false, isAuthenticated: false });
    }
  }, [callApi]);

  const forgotPassword = useCallback(
    async (payload: ForgotPasswordPayload) => {
      await callApi(`${apiUrlRef.current}/auth/forgot-password`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    [callApi]
  );

  const sendMagicLink = useCallback(
    async (payload: MagicLinkPayload) => {
      await callApi(`${apiUrlRef.current}/auth/magic-link`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    [callApi]
  );

  const updateUser = useCallback((partial: Partial<User>) => {
    setState((s) =>
      s.user ? { ...s, user: { ...s.user, ...partial } } : s
    );
  }, []);

  // ── Context values ────────────────────────────────────────────────────────────

  const authValue = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      signup,
      logout,
      forgotPassword,
      sendMagicLink,
      updateUser,
    }),
    [state, login, signup, logout, forgotPassword, sendMagicLink, updateUser]
  );

  const configValue = useMemo<AuthConfigContextValue>(
    () => ({ config: authConfig, configLoading, apiUrl, rootPath }),
    [authConfig, configLoading, apiUrl, rootPath]
  );

  return (
    <AuthConfigContext.Provider value={configValue}>
      <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>
    </AuthConfigContext.Provider>
  );
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export function useAuthConfig(): AuthConfigContextValue {
  const ctx = useContext(AuthConfigContext);
  if (!ctx) throw new Error("useAuthConfig must be used inside <AuthProvider>");
  return ctx;
}

// ─── GuestRoute ───────────────────────────────────────────────────────────────

export function GuestRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const { rootPath } = useAuthConfig();

  if (isLoading) return null;

  if (isAuthenticated) {
    window.location.replace(rootPath);
    return null;
  }

  return <>{children}</>;
}
