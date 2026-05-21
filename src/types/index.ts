import type React from "react";

// ─── Server-loaded auth config ────────────────────────────────────────────────

export interface CaptchaConfig {
  enabled: boolean;
  /** "recaptcha" (Google) or "hcaptcha" */
  provider?: "recaptcha" | "hcaptcha";
  /** "v2" = checkbox widget, "v3" = invisible/score-based */
  version?: "v2" | "v3";
  siteKey?: string;
}

export interface OAuthProvider {
  /** e.g. "google" | "github" | "facebook" */
  provider: string;
  /** Display label. Defaults to capitalised provider name */
  label?: string;
  /** Full OAuth redirect URL returned by your server */
  url: string;
}

export interface AuthConfig {
  logoUrl?: string;
  allowSignup: boolean;
  allowMagicLink?: boolean;
  captcha: CaptchaConfig;
  privacyPolicyUrl?: string;
  termsOfServiceUrl?: string;
  oauthProviders?: OAuthProvider[];
}

// ─── Internal context shape ───────────────────────────────────────────────────

export interface AuthConfigContextValue {
  config: AuthConfig | null;
  configLoading: boolean;
  apiUrl: string;
}

// ─── User & token types ───────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  whatsappNumber?: string;
  avatarUrl?: string;
  [key: string]: unknown;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// ─── Payload types ────────────────────────────────────────────────────────────

export interface LoginPayload {
  email: string;
  password: string;
  captchaToken: string;
  rememberMe?: boolean;
}

export interface SignupPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  whatsappNumber?: string;
  captchaToken: string;
}

export interface ForgotPasswordPayload {
  email: string;
  captchaToken: string;
}

export interface MagicLinkPayload {
  email: string;
  captchaToken: string;
}

// ─── Auth context ─────────────────────────────────────────────────────────────

export interface AuthContextValue extends AuthState {
  login: (payload: LoginPayload) => Promise<void>;
  signup: (payload: SignupPayload) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (payload: ForgotPasswordPayload) => Promise<void>;
  sendMagicLink: (payload: MagicLinkPayload) => Promise<void>;
  updateUser: (user: Partial<User>) => void;
}

// ─── Provider props ───────────────────────────────────────────────────────────

export interface AuthProviderProps {
  children: React.ReactNode;
  /**
   * Base URL of your SSO API server.
   * Expected endpoints:
   *   GET  /auth/config          (with X-Project-Id header)
   *   POST /auth/login           (server sets auth cookie, returns { user })
   *   POST /auth/signup          (server sets auth cookie, returns { user })
   *   POST /auth/logout          (server clears auth cookie)
   *   POST /auth/forgot-password
   *   POST /auth/magic-link
   *   GET  /auth/me
   */
  apiUrl: string;
  /** Project ID sent as X-Project-Id header on every request */
  projectId: string;
  /**
   * Custom fetch handler — override for custom headers, interceptors, etc.
   * Must return the parsed JSON response (or undefined for 204).
   * Should forward credentials (cookies) to the server.
   */
  fetcher?: <T>(url: string, init: RequestInit) => Promise<T>;
}

// ─── Component prop types ─────────────────────────────────────────────────────

export interface LoginFormProps {
  /** Extra CSS classes applied to the outer Card */
  className?: string;
  /** Called after a successful login */
  onSuccess?: (user: User) => void;
  /** Called on login or config error */
  onError?: (error: Error) => void;
  /** href for the "Forgot password?" link */
  forgotPasswordUrl?: string;
  /** href for the "Sign up" link (only shown when config.allowSignup is true) */
  signupUrl?: string;
  /** Override the page title. Default: "Sign in to your account" */
  title?: string;
}

export interface SignupFormProps {
  className?: string;
  onSuccess?: (user: User) => void;
  onError?: (error: Error) => void;
  /** href for the "Sign in" link */
  loginUrl?: string;
  title?: string;
}

export interface ForgotPasswordFormProps {
  className?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  loginUrl?: string;
  title?: string;
}

export interface LogoutButtonProps {
  className?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  label?: string;
  children?: (props: { isLoading: boolean }) => React.ReactNode;
}

export interface ProfileComponentProps {
  className?: string;
  onEditProfile?: (user: User) => void;
  showLogout?: boolean;
  onLogoutSuccess?: () => void;
}
