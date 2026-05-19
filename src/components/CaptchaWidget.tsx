import { forwardRef, useImperativeHandle, useRef } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import type { CaptchaConfig } from "@/types";

export interface CaptchaHandle {
  reset: () => void;
}

interface CaptchaWidgetProps {
  config: CaptchaConfig;
  onVerify: (token: string) => void;
  onExpire: () => void;
}

/**
 * Renders the appropriate captcha widget based on config:
 * - recaptcha v2 → Google checkbox widget
 * - hcaptcha     → hCaptcha checkbox widget
 * - recaptcha v3 → nothing (invisible; execute via executeRecaptchaV3 util)
 * - disabled     → nothing
 *
 * Expose .reset() via ref to reset the widget after submission.
 */
export const CaptchaWidget = forwardRef<CaptchaHandle, CaptchaWidgetProps>(
  ({ config, onVerify, onExpire }, ref) => {
    const recaptchaRef = useRef<ReCAPTCHA>(null);
    const hcaptchaRef = useRef<HCaptcha>(null);

    useImperativeHandle(ref, () => ({
      reset() {
        recaptchaRef.current?.reset();
        hcaptchaRef.current?.resetCaptcha();
      },
    }));

    if (!config.enabled || !config.siteKey) return null;

    if (config.provider === "hcaptcha") {
      return (
        <HCaptcha
          ref={hcaptchaRef}
          sitekey={config.siteKey}
          onVerify={onVerify}
          onExpire={onExpire}
        />
      );
    }

    // recaptcha v2 (default)
    if (config.version !== "v3") {
      return (
        <ReCAPTCHA
          ref={recaptchaRef}
          sitekey={config.siteKey}
          onChange={(token) => onVerify(token ?? "")}
          onExpired={onExpire}
        />
      );
    }

    // v3 is invisible — nothing to render
    return null;
  }
);
CaptchaWidget.displayName = "CaptchaWidget";
