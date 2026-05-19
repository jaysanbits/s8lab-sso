# @s8lab/sso-client

React authentication component library — **Login**, **Signup**, **Forgot Password**, **Logout**, and **Profile** — with Google reCAPTCHA v2 and shadcn-style UI built on Radix UI + Tailwind CSS.

---

## Installation

```bash
npm install @s8lab/sso-client
```

> **Peer dependencies** — make sure your project has `react` and `react-dom` ≥ 18.

### Tailwind setup (required)

Add this library to your Tailwind `content` so its classes are picked up:

```js
// tailwind.config.js
export default {
  content: [
    "./src/**/*.{ts,tsx}",
    "./node_modules/@s8lab/sso-client/dist/**/*.js",
  ],
  // ...
};
```

Then import the bundled CSS once at your app root:

```ts
import "@s8lab/sso-client/styles.css";
```

---

## Quick start

### 1 — Wrap your app with `<AuthProvider>`

```tsx
import { AuthProvider } from "@s8lab/sso-client";

function App() {
  return (
    <AuthProvider
      apiUrl="https://api.yourapp.com"
      recaptchaSiteKey="6LeXXXXXXXXXXXXXXXXX"
    >
      <Router />
    </AuthProvider>
  );
}
```

#### `AuthProvider` props

| Prop | Type | Default | Description |
|---|---|---|---|
| `apiUrl` | `string` | **required** | Base URL of your SSO server |
| `recaptchaSiteKey` | `string` | **required** | Google reCAPTCHA v2 site key |
| `storageKeyPrefix` | `string` | `"sso"` | localStorage key prefix for tokens |
| `fetcher` | `(url, init) => Promise<T>` | built-in fetch | Override for custom headers/interceptors |

---

### 2 — Use the components

```tsx
import {
  LoginForm,
  SignupForm,
  ForgotPasswordForm,
  LogoutButton,
  ProfileComponent,
} from "@s8lab/sso-client";
```

#### `<LoginForm>`

```tsx
<LoginForm
  className="mx-auto"
  title="Welcome back"
  description="Sign in to your account"
  signupUrl="/signup"
  forgotPasswordUrl="/forgot-password"
  onSuccess={(user) => router.push("/dashboard")}
  onError={(err) => toast.error(err.message)}
/>
```

#### `<SignupForm>`

```tsx
<SignupForm
  className="mx-auto"
  loginUrl="/login"
  onSuccess={(user) => router.push("/dashboard")}
/>
```

#### `<ForgotPasswordForm>`

```tsx
<ForgotPasswordForm
  loginUrl="/login"
  onSuccess={() => toast.success("Reset link sent!")}
/>
```

#### `<LogoutButton>`

```tsx
// Default button
<LogoutButton onSuccess={() => router.push("/login")} />

// Custom render
<LogoutButton onSuccess={() => router.push("/login")}>
  {({ isLoading }) => (
    <button disabled={isLoading}>
      {isLoading ? "Logging out…" : "Log out"}
    </button>
  )}
</LogoutButton>
```

#### `<ProfileComponent>`

```tsx
<ProfileComponent
  showLogout
  onLogoutSuccess={() => router.push("/login")}
  onEditProfile={(user) => router.push("/settings")}
/>
```

---

### 3 — `useAuth` hook

Access auth state and actions anywhere inside `<AuthProvider>`:

```tsx
import { useAuth } from "@s8lab/sso-client";

function Dashboard() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  if (isLoading) return <Spinner />;
  if (!isAuthenticated) return <Redirect to="/login" />;

  return <h1>Hello, {user.firstName}!</h1>;
}
```

---

## API server contract

The `AuthProvider` expects the following endpoints on your `apiUrl`:

| Method | Path | Request body | Response |
|---|---|---|---|
| `POST` | `/auth/login` | `{ email, password, recaptchaToken }` | `{ user, tokens }` |
| `POST` | `/auth/signup` | `{ firstName, lastName, email, password, whatsappNumber?, recaptchaToken }` | `{ user, tokens }` |
| `POST` | `/auth/logout` | *(none)* | `204` |
| `POST` | `/auth/forgot-password` | `{ email, recaptchaToken }` | `200` |
| `GET` | `/auth/me` | *(Authorization header)* | `User` |

`tokens` shape: `{ accessToken: string; refreshToken?: string }`

---

## Customising styles

Every component accepts a `className` prop that is merged onto the outer `Card` via `tailwind-merge`, so you can freely override any Tailwind class:

```tsx
<LoginForm className="border-2 border-indigo-500 shadow-xl rounded-2xl" />
```

CSS variables for the design tokens (colors, radius, etc.) follow the standard shadcn/ui convention and can be overridden globally in your CSS.

---

## Publishing to npm

```bash
npm run build
npm publish --access public
```
