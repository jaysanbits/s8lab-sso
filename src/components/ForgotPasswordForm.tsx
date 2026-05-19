import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Loader2 } from "lucide-react";

import { useAuth, useAuthConfig } from "@/context/AuthContext";
import { executeRecaptchaV3 } from "@/lib/captchaV3";
import { cn } from "@/lib/utils";
import type { ForgotPasswordFormProps } from "@/types";
import { CaptchaWidget, type CaptchaHandle } from "@/components/CaptchaWidget";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
});

type FormValues = z.infer<typeof schema>;

function FormSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <div className="h-6 w-3/4 animate-pulse rounded bg-muted mx-auto" />
      <div className="h-10 animate-pulse rounded bg-muted" />
      <div className="h-10 animate-pulse rounded bg-muted" />
    </div>
  );
}

export function ForgotPasswordForm({
  className,
  onSuccess,
  onError,
  loginUrl,
  title = "Forgot password?",
}: ForgotPasswordFormProps) {
  const { forgotPassword } = useAuth();
  const { config, configLoading } = useAuthConfig();

  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const captchaRef = useRef<CaptchaHandle>(null);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function getCaptchaToken(): Promise<string | null> {
    if (!config?.captcha.enabled) return "";
    if (
      config.captcha.provider === "recaptcha" &&
      config.captcha.version === "v3" &&
      config.captcha.siteKey
    ) {
      return executeRecaptchaV3(config.captcha.siteKey, "forgot_password");
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

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const token = await getCaptchaToken();
    if (token === null) return;

    try {
      await forgotPassword({ email: values.email, captchaToken: token });
      resetCaptcha();
      setSubmitted(true);
      onSuccess?.();
    } catch (err) {
      resetCaptcha();
      const error = err instanceof Error ? err : new Error("Request failed");
      setServerError(error.message);
      onError?.(error);
    }
  });

  if (configLoading) {
    return (
      <Card className={cn("w-full max-w-sm", className)}>
        <FormSkeleton />
      </Card>
    );
  }

  if (submitted) {
    return (
      <Card className={cn("w-full max-w-sm", className)}>
        <div className="flex flex-col items-center gap-4 p-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-primary" />
          <div className="space-y-1">
            <p className="font-semibold">Check your inbox</p>
            <p className="text-sm text-muted-foreground">
              We sent a reset link to{" "}
              <span className="font-medium text-foreground">
                {getValues("email")}
              </span>
            </p>
          </div>
          {loginUrl && (
            <a
              href={loginUrl}
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Back to sign in
            </a>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full max-w-sm", className)}>
      <div className="p-6 space-y-5">
        {config?.logoUrl && (
          <img
            src={config.logoUrl}
            alt="Logo"
            className="mx-auto h-8 object-contain"
          />
        )}

        <div className="space-y-1 text-center">
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">
            Enter your email and we&apos;ll send you a reset link
          </p>
        </div>

        <form onSubmit={onSubmit} noValidate className="space-y-4">
          {serverError && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {serverError}
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="forgot-email">Email</Label>
            <Input
              id="forgot-email"
              type="email"
              placeholder="name@example.com"
              autoComplete="email"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
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
            {isSubmitting && <Loader2 className="animate-spin" />}
            {isSubmitting ? "Sending…" : "Send reset link"}
          </Button>
        </form>

        {loginUrl && (
          <p className="text-center text-sm text-muted-foreground">
            <a
              href={loginUrl}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Back to sign in
            </a>
          </p>
        )}
      </div>
    </Card>
  );
}
