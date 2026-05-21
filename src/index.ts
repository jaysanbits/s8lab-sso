// ─── Styles ───────────────────────────────────────────────────────────────────
import "./styles/globals.css";

// ─── Provider & Hooks ─────────────────────────────────────────────────────────
export { AuthProvider, useAuth, useAuthConfig, GuestRoute } from "@/context/AuthContext";

// ─── Components ───────────────────────────────────────────────────────────────
export { LoginForm } from "@/components/LoginForm";
export { SignupForm } from "@/components/SignupForm";
export { ForgotPasswordForm } from "@/components/ForgotPasswordForm";
export { LogoutButton } from "@/components/LogoutButton";
export { ProfileComponent } from "@/components/ProfileComponent";

// ─── Types ────────────────────────────────────────────────────────────────────
export type {
  User,
  AuthTokens,
  AuthState,
  AuthConfig,
  AuthConfigContextValue,
  CaptchaConfig,
  OAuthProvider,
  AuthContextValue,
  AuthProviderProps,
  LoginFormProps,
  SignupFormProps,
  ForgotPasswordFormProps,
  LogoutButtonProps,
  ProfileComponentProps,
  LoginPayload,
  SignupPayload,
  ForgotPasswordPayload,
  MagicLinkPayload,
} from "@/types";
