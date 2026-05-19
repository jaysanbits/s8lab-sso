declare global {
  interface Window {
    grecaptcha: {
      ready: (cb: () => void) => void;
      execute: (
        siteKey: string,
        options: { action: string }
      ) => Promise<string>;
    };
  }
}

const loadedKeys = new Set<string>();

export function loadRecaptchaV3Script(siteKey: string): void {
  if (loadedKeys.has(siteKey)) return;
  loadedKeys.add(siteKey);
  const script = document.createElement("script");
  script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
  script.async = true;
  document.head.appendChild(script);
}

export function executeRecaptchaV3(
  siteKey: string,
  action: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const run = () => {
      window.grecaptcha.ready(() => {
        window.grecaptcha
          .execute(siteKey, { action })
          .then(resolve)
          .catch(reject);
      });
    };

    if (typeof window.grecaptcha !== "undefined") {
      run();
      return;
    }

    // Wait for the script to finish loading
    let attempts = 0;
    const interval = setInterval(() => {
      if (typeof window.grecaptcha !== "undefined") {
        clearInterval(interval);
        run();
      } else if (attempts++ > 30) {
        clearInterval(interval);
        reject(new Error("reCAPTCHA v3 script failed to load"));
      }
    }, 300);
  });
}
