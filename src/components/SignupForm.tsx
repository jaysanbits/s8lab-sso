import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import { useAuth, useAuthConfig } from "@/context/AuthContext";
import { executeRecaptchaV3 } from "@/lib/captchaV3";
import { cn } from "@/lib/utils";
import type { SignupFormProps } from "@/types";
import { CaptchaWidget, type CaptchaHandle } from "@/components/CaptchaWidget";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const schema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain an uppercase letter")
      .regex(/[0-9]/, "Must contain a number"),
    confirmPassword: z.string(),
    whatsappNumber: z
      .string()
      .regex(/^\+?[1-9]\d{6,14}$/, "Enter a valid WhatsApp number")
      .optional()
      .or(z.literal("")),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

function FormSkeleton() {
  return (
    <div className="space-y-4 p-6">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-10 animate-pulse rounded bg-muted" />
      ))}
    </div>
  );
}

export function SignupForm({
  className,
  onSuccess,
  onError,
  loginUrl,
  title = "Create an account",
}: SignupFormProps) {
  const { signup } = useAuth();
  const { config, configLoading } = useAuthConfig();

  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const captchaRef = useRef<CaptchaHandle>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function getCaptchaToken(): Promise<string | null> {
    if (!config?.captcha.enabled) return "";
    if (
      config.captcha.provider === "recaptcha" &&
      config.captcha.version === "v3" &&
      config.captcha.siteKey
    ) {
      return executeRecaptchaV3(config.captcha.siteKey, "signup");
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
      await signup({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        password: values.password,
        whatsappNumber: values.whatsappNumber || undefined,
        captchaToken: token,
      });
      resetCaptcha();
      onSuccess?.({} as never);
    } catch (err) {
      resetCaptcha();
      const error = err instanceof Error ? err : new Error("Signup failed");
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

        <h1 className="text-center text-xl font-bold tracking-tight">{title}</h1>

        <form onSubmit={onSubmit} noValidate className="space-y-4">
          {serverError && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {serverError}
            </p>
          )}

          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="signup-first">First name</Label>
              <Input
                id="signup-first"
                placeholder="John"
                autoComplete="given-name"
                {...register("firstName")}
              />
              {errors.firstName && (
                <p className="text-xs text-destructive">
                  {errors.firstName.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="signup-last">Last name</Label>
              <Input
                id="signup-last"
                placeholder="Doe"
                autoComplete="family-name"
                {...register("lastName")}
              />
              {errors.lastName && (
                <p className="text-xs text-destructive">
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="signup-email">Email</Label>
            <Input
              id="signup-email"
              type="email"
              placeholder="name@example.com"
              autoComplete="email"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          {/* WhatsApp */}
          <div className="space-y-1.5">
            <Label htmlFor="signup-whatsapp">
              WhatsApp{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="signup-whatsapp"
              type="tel"
              placeholder="+91 98765 43210"
              autoComplete="tel"
              {...register("whatsappNumber")}
            />
            {errors.whatsappNumber && (
              <p className="text-xs text-destructive">
                {errors.whatsappNumber.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="signup-password">Password</Label>
            <Input
              id="signup-password"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-xs text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Confirm password */}
          <div className="space-y-1.5">
            <Label htmlFor="signup-confirm">Confirm password</Label>
            <Input
              id="signup-confirm"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="text-xs text-destructive">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          {/* Captcha */}
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
            {isSubmitting ? "Creating account…" : "Create account"}
          </Button>
        </form>

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

        <Separator />

        {loginUrl && (
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <a
              href={loginUrl}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Sign in
            </a>
          </p>
        )}
      </div>
    </Card>
  );
}
