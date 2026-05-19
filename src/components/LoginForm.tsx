import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Github, Loader2 } from "lucide-react";

import { useAuth, useAuthConfig } from "@/context/AuthContext";
import { executeRecaptchaV3 } from "@/lib/captchaV3";
import { cn } from "@/lib/utils";
import type { LoginFormProps, OAuthProvider } from "@/types";
import { CaptchaWidget, type CaptchaHandle } from "@/components/CaptchaWidget";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const passwordSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const magicLinkSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

type PasswordValues = z.infer<typeof passwordSchema>;
type MagicLinkValues = z.infer<typeof magicLinkSchema>;

// ─── OAuth icon map ───────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function OAuthProviderIcon({ provider }: { provider: string }) {
  if (provider === "google") return <GoogleIcon />;
  if (provider === "github") return <Github className="h-4 w-4" />;
  return null;
}

function OAuthButton({ provider }: { provider: OAuthProvider }) {
  const label =
    provider.label ??
    provider.provider.charAt(0).toUpperCase() + provider.provider.slice(1);

  return (
    <a href={provider.url}>
      <Button
        type="button"
        variant="outline"
        className="w-full gap-2 rounded-full"
      >
        <OAuthProviderIcon provider={provider.provider} />
        {label}
      </Button>
    </a>
  );
}

// ─── Mode toggle ──────────────────────────────────────────────────────────────

function ModeToggle({
  mode,
  onChange,
}: {
  mode: "password" | "magic-link";
  onChange: (m: "password" | "magic-link") => void;
}) {
  return (
    <div className="flex rounded-lg bg-muted p-1 text-sm font-medium">
      {(["password", "magic-link"] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={cn(
            "flex-1 rounded-md px-3 py-1.5 transition-all",
            mode === m
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {m === "password" ? "Password" : "Magic Link"}
        </button>
      ))}
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function FormSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <div className="h-6 w-3/4 animate-pulse rounded bg-muted mx-auto" />
      <div className="h-10 animate-pulse rounded bg-muted" />
      <div className="h-10 animate-pulse rounded bg-muted" />
      <div className="h-10 animate-pulse rounded bg-muted" />
      <div className="h-10 animate-pulse rounded bg-muted" />
    </div>
  );
}

// ─── LoginForm ────────────────────────────────────────────────────────────────

export function LoginForm({
  className,
  onSuccess,
  onError,
  forgotPasswordUrl,
  signupUrl,
  title = "Sign in to your account",
}: LoginFormProps) {
  const { login, sendMagicLink } = useAuth();
  const { config, configLoading } = useAuthConfig();

  const [mode, setMode] = useState<"password" | "magic-link">("password");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const captchaRef = useRef<CaptchaHandle>(null);

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
  });

  const magicLinkForm = useForm<MagicLinkValues>({
    resolver: zodResolver(magicLinkSchema),
  });

  // ── Captcha helper ────────────────────────────────────────────────────────────

  async function getCaptchaToken(): Promise<string | null> {
    if (!config?.captcha.enabled) return "";
    if (
      config.captcha.provider === "recaptcha" &&
      config.captcha.version === "v3" &&
      config.captcha.siteKey
    ) {
      return executeRecaptchaV3(config.captcha.siteKey, "login");
    }
    if (!captchaToken) {
      setCaptchaError("Please complete the captcha");
      return null;
    }
    return captchaToken;
  }

  function resetCaptcha() {
    captchaRef.current?.reset();
    setCaptchaToken("");
    setCaptchaError(null);
  }

  // ── Submit handlers ───────────────────────────────────────────────────────────

  const onPasswordSubmit = passwordForm.handleSubmit(async (values) => {
    setServerError(null);
    const token = await getCaptchaToken();
    if (token === null) return;

    try {
      await login({
        email: values.email,
        password: values.password,
        captchaToken: token,
        rememberMe,
      });
      resetCaptcha();
      onSuccess?.({} as never);
    } catch (err) {
      resetCaptcha();
      const error = err instanceof Error ? err : new Error("Login failed");
      setServerError(error.message);
      onError?.(error);
    }
  });

  const onMagicLinkSubmit = magicLinkForm.handleSubmit(async (values) => {
    setServerError(null);
    const token = await getCaptchaToken();
    if (token === null) return;

    try {
      await sendMagicLink({ email: values.email, captchaToken: token });
      resetCaptcha();
      setMagicLinkSent(true);
    } catch (err) {
      resetCaptcha();
      const error =
        err instanceof Error ? err : new Error("Failed to send magic link");
      setServerError(error.message);
      onError?.(error);
    }
  });

  // ── Magic link success state ──────────────────────────────────────────────────

  if (magicLinkSent) {
    return (
      <Card className={cn("w-full max-w-sm p-8 text-center space-y-3", className)}>
        <div className="text-4xl">✉️</div>
        <p className="font-semibold">Check your inbox</p>
        <p className="text-sm text-muted-foreground">
          We sent a sign-in link to{" "}
          <span className="font-medium text-foreground">
            {magicLinkForm.getValues("email")}
          </span>
        </p>
        <button
          type="button"
          onClick={() => setMagicLinkSent(false)}
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          Use a different email
        </button>
      </Card>
    );
  }

  // ── Config loading ────────────────────────────────────────────────────────────

  if (configLoading) {
    return (
      <Card className={cn("w-full max-w-sm", className)}>
        <FormSkeleton />
      </Card>
    );
  }

  const isPasswordSubmitting = passwordForm.formState.isSubmitting;
  const isMagicSubmitting = magicLinkForm.formState.isSubmitting;
  const isSubmitting = isPasswordSubmitting || isMagicSubmitting;

  const hasOAuth = (config?.oauthProviders?.length ?? 0) > 0;

  return (
    <Card className={cn("w-full max-w-sm", className)}>
      <div className="p-6 space-y-5">
        {/* Logo */}
        {config?.logoUrl && (
          <img
            src={config.logoUrl}
            alt="Logo"
            className="mx-auto h-8 object-contain"
          />
        )}

        {/* Title */}
        <h1 className="text-center text-xl font-bold tracking-tight">
          {title}
        </h1>

        {/* OAuth buttons */}
        {hasOAuth && (
          <div
            className={cn(
              "grid gap-2",
              (config?.oauthProviders?.length ?? 0) === 1
                ? "grid-cols-1"
                : "grid-cols-2"
            )}
          >
            {config?.oauthProviders?.map((p) => (
              <OAuthButton key={p.provider} provider={p} />
            ))}
          </div>
        )}

        {/* Divider */}
        {hasOAuth && (
          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              Or continue with email
            </span>
            <Separator className="flex-1" />
          </div>
        )}

        {/* Mode toggle */}
        {config?.allowMagicLink && (
          <ModeToggle
            mode={mode}
            onChange={(m) => {
              setMode(m);
              setServerError(null);
              resetCaptcha();
            }}
          />
        )}

        {/* ── Password mode form ── */}
        {mode === "password" && (
          <form onSubmit={onPasswordSubmit} noValidate className="space-y-4">
            {serverError && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {serverError}
              </p>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                placeholder="name@example.com"
                autoComplete="email"
                {...passwordForm.register("email")}
              />
              {passwordForm.formState.errors.email && (
                <p className="text-xs text-destructive">
                  {passwordForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="login-password">Password</Label>
                {forgotPasswordUrl && (
                  <a
                    href={forgotPasswordUrl}
                    className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                  >
                    Forgot password?
                  </a>
                )}
              </div>
              <Input
                id="login-password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                {...passwordForm.register("password")}
              />
              {passwordForm.formState.errors.password && (
                <p className="text-xs text-destructive">
                  {passwordForm.formState.errors.password.message}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="remember-me"
                checked={rememberMe}
                onCheckedChange={(v) => setRememberMe(Boolean(v))}
              />
              <Label
                htmlFor="remember-me"
                className="text-sm font-normal cursor-pointer"
              >
                Remember me
              </Label>
            </div>

            {config?.captcha.enabled && config.captcha.version !== "v3" && (
              <div className="space-y-1">
                <CaptchaWidget
                  ref={captchaRef}
                  config={config.captcha}
                  onVerify={(t) => {
                    setCaptchaToken(t);
                    setCaptchaError(null);
                  }}
                  onExpire={() => setCaptchaToken("")}
                />
                {captchaError && (
                  <p className="text-xs text-destructive">{captchaError}</p>
                )}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isPasswordSubmitting && <Loader2 className="animate-spin" />}
              {isPasswordSubmitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        )}

        {/* ── Magic link mode form ── */}
        {mode === "magic-link" && (
          <form onSubmit={onMagicLinkSubmit} noValidate className="space-y-4">
            {serverError && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {serverError}
              </p>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="magic-email">Email</Label>
              <Input
                id="magic-email"
                type="email"
                placeholder="name@example.com"
                autoComplete="email"
                {...magicLinkForm.register("email")}
              />
              {magicLinkForm.formState.errors.email && (
                <p className="text-xs text-destructive">
                  {magicLinkForm.formState.errors.email.message}
                </p>
              )}
            </div>

            {config?.captcha.enabled && config.captcha.version !== "v3" && (
              <div className="space-y-1">
                <CaptchaWidget
                  ref={captchaRef}
                  config={config.captcha}
                  onVerify={(t) => {
                    setCaptchaToken(t);
                    setCaptchaError(null);
                  }}
                  onExpire={() => setCaptchaToken("")}
                />
                {captchaError && (
                  <p className="text-xs text-destructive">{captchaError}</p>
                )}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isMagicSubmitting && <Loader2 className="animate-spin" />}
              {isMagicSubmitting ? "Sending…" : "Send Magic Link"}
            </Button>
          </form>
        )}

        {/* Terms & Privacy */}
        {(config?.termsOfServiceUrl || config?.privacyPolicyUrl) && (
          <p className="text-center text-xs text-muted-foreground">
            By continuing, you agree to our{" "}
            {config.termsOfServiceUrl && (
              <a
                href={config.termsOfServiceUrl}
                className="underline underline-offset-2 hover:text-foreground"
              >
                Terms of Service
              </a>
            )}
            {config.termsOfServiceUrl && config.privacyPolicyUrl && " and "}
            {config.privacyPolicyUrl && (
              <a
                href={config.privacyPolicyUrl}
                className="underline underline-offset-2 hover:text-foreground"
              >
                Privacy Policy
              </a>
            )}
            .
          </p>
        )}

        {/* Sign up link */}
        {config?.allowSignup && signupUrl && (
          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <a
              href={signupUrl}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Sign up
            </a>
          </p>
        )}
      </div>
    </Card>
  );
}
