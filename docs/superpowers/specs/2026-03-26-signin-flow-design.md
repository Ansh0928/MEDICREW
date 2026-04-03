# Sign-In Flow — Design Spec

**Date:** 2026-03-26
**Status:** Approved

---

## Overview

Replace `/app/login/patient/page.tsx` and `/app/login/doctor/page.tsx` with an animated sign-in component using a WebGL dot-matrix canvas effect (`three` + `@react-three/fiber`), a multi-step flow (email → OTP-style code → success), and role-based color themes. Sign-up functionality on the existing patient page is intentionally dropped — this is a demo-mode app.

---

## Color Themes

| Role    | Primary Gradient               | Page BG   | Dot matrix RGB   |
| ------- | ------------------------------ | --------- | ---------------- |
| Patient | `#0ea5e9 → #38bdf8` (sky blue) | `#f0f9ff` | `[14, 165, 233]` |
| Doctor  | `#06b6d4 → #22d3ee` (cyan)     | `#ecfeff` | `[6, 182, 212]`  |

All headings in deep navy: `#0c4a6e` (patient) / `#164e63` (doctor). Body text `#64748b`. White card on role-tinted page background.

**Important — Tailwind dynamic class rule:** Never interpolate variables into Tailwind class strings. Use explicit conditionals with full literal strings:

```tsx
// WRONG: `from-[${theme.bg}]`
// RIGHT:
const gradientClass = role === "doctor" ? "from-[#ecfeff]" : "from-[#f0f9ff]";
```

---

## Source Component

The component code is provided by the user in the conversation. It does not exist in the repo yet. Create it at:

**`src/components/ui/sign-in-flow-1.tsx`**

All internal sub-components (`CanvasRevealEffect`, `DotMatrix`, `Shader`, `ShaderMaterial`, `MiniNavbar`) are defined within the same file — no external imports needed beyond `react`, `framer-motion`, `next/link`, `@react-three/fiber`, `three`, and `@/lib/utils`.

---

## New Dependencies

```bash
bun add three @react-three/fiber
```

Already present: `framer-motion`, `next`, TypeScript, Tailwind v4, `@/lib/utils` (shadcn).

---

## Component Modifications from Source

### 1. Add `role` prop

```ts
interface SignInPageProps {
  role: "patient" | "doctor";
  className?: string;
}
```

### 2. Derive theme with literal Tailwind strings

```ts
const isDoctor = role === "doctor";
const dotColor = isDoctor ? [6, 182, 212] : [14, 165, 233];
const pageBg = isDoctor ? "bg-[#ecfeff]" : "bg-[#f0f9ff]";
const headingColor = isDoctor ? "#164e63" : "#0c4a6e";
const gradientFrom = isDoctor ? "from-[#06b6d4]" : "from-[#0ea5e9]";
const gradientTo = isDoctor ? "to-[#22d3ee]" : "to-[#38bdf8]";
const borderColor = isDoctor ? "border-cyan-100" : "border-sky-100";
const inputBg = isDoctor ? "bg-[#ecfeff]" : "bg-[#f0f9ff]";
```

### 3. Flip dark → light theme

Replace throughout `SignInPage` JSX:

- Root div: `bg-black` → `${pageBg}`
- Text `text-white` on backgrounds → `text-[${headingColor}]` or `text-slate-600`
- Muted text `text-white/50`, `text-white/40` → `text-slate-400`
- All `border-white/10` → `${borderColor}`
- All `bg-white/5` / `bg-[#111]` buttons → `bg-white border ${borderColor}`
- Continue button → `bg-gradient-to-r ${gradientFrom} ${gradientTo} text-white`
- Input field → `${inputBg} border ${borderColor} text-slate-700`
- Dark radial overlay → `bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.8)_0%,_transparent_100%)]`
- Top fade: `const topFadeFrom = isDoctor ? "from-[#ecfeff]" : "from-[#f0f9ff]"` → use as ``className={`${topFadeFrom} to-transparent`}``

Pass `colors={[dotColor]}` to both `CanvasRevealEffect` instances.

### 4. Wire auth — email step

Import `useAuth` and `useRouter`:

```ts
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
// inside component:
const { login } = useAuth();
const router = useRouter();
```

Add a demo hint below the email input:

```tsx
<p className="text-xs text-slate-400 text-center mt-1">
  Demo: {role === "doctor" ? "doctor@demo.com" : "patient@demo.com"}
</p>
```

### 5. Wire auth — code step (async)

Replace the existing `handleCodeChange` completion block with:

```ts
const handleCodeComplete = async (finalCode: string[]) => {
  setReverseCanvasVisible(true);
  setTimeout(() => setInitialCanvasVisible(false), 50);

  const ok = await login(email, finalCode.join(""), role);
  if (ok) {
    setTimeout(() => {
      setStep("success");
    }, 2000);
  } else {
    // Reset animation + show error
    setReverseCanvasVisible(false);
    setInitialCanvasVisible(true);
    setAuthError("Invalid credentials. Use the demo email shown above.");
    setCode(["", "", "", "", "", ""]);
    setTimeout(() => codeInputRefs.current[0]?.focus(), 100);
  }
};
```

Add `authError` state:

```ts
const [authError, setAuthError] = useState("");
```

Show below code inputs:

```tsx
{
  authError && <p className="text-red-500 text-xs text-center">{authError}</p>;
}
```

Make `handleCodeChange` async. When all 6 digits are filled, call `await handleCodeComplete(newCode)`. Add `setAuthError("")` at the top of `handleCodeComplete` (before the `await login()` call) so stale errors are cleared on each new attempt.

### 6. Wire auth — success step

In the success step, the "Continue to Dashboard" button:

```tsx
<button onClick={() => router.push(role === "doctor" ? "/doctor" : "/patient")}>
  Continue to Dashboard
</button>
```

### 7. MiniNavbar adaptation

Replace hardcoded nav links:

```ts
const navLinksData = [
  { label: "Home", href: "/" },
  { label: "Consult", href: "/consult" },
  {
    label: role === "doctor" ? "Patient Portal" : "Doctor Portal",
    href: role === "doctor" ? "/login/patient" : "/login/doctor",
  },
];
```

Swap Login/Signup buttons:

- Login button → `← Back` linking to `/login`
- Signup button → remove or hide

Update navbar background/border colors to light theme:

- `bg-[#1f1f1f57]` → `bg-white/80`
- `border-[#333]` → `border-slate-200`
- Text `text-gray-300` → `text-slate-600`
- Hover `text-white` → `text-slate-900`

---

## SSR Safety

`@react-three/fiber` uses browser-only APIs and will crash on SSR. Wrap `SignInPage` (or at minimum `CanvasRevealEffect`) with `next/dynamic` + `{ ssr: false }` at the page level:

```tsx
// src/app/login/patient/page.tsx
import dynamic from "next/dynamic";
const SignInPage = dynamic(
  () => import("@/components/ui/sign-in-flow-1").then((m) => m.SignInPage),
  { ssr: false },
);
export default function PatientLogin() {
  return <SignInPage role="patient" />;
}
```

Same pattern for the doctor page.

---

## Export Convention

`SignInPage` must be a **named export**: `export const SignInPage = ...` or `export function SignInPage(...)`. The page integration uses `{ SignInPage }` named import.

---

## Success Step Note

The success step appears after the 2 s `setTimeout` in `handleCodeComplete`. The "Continue to Dashboard" button requires no additional guard — it only renders after `step === "success"` and the user taps it manually.

---

## Page Integration

### `src/app/login/patient/page.tsx` — full replacement

```tsx
"use client";
import { SignInPage } from "@/components/ui/sign-in-flow-1";
export default function PatientLogin() {
  return <SignInPage role="patient" />;
}
```

### `src/app/login/doctor/page.tsx` — full replacement

```tsx
"use client";
import { SignInPage } from "@/components/ui/sign-in-flow-1";
export default function DoctorLogin() {
  return <SignInPage role="doctor" />;
}
```

The `/login` portal selector (`/app/login/page.tsx`) is **unchanged**.

---

## Auth Reality

`useAuth().login(email, _password, role)`:

- Accepts ONLY `patient@demo.com` (role=patient) or `doctor@demo.com` (role=doctor)
- Password is ignored entirely
- Returns `Promise<boolean>` — must be `await`ed
- On success: sets `medicrew_portal_user` in localStorage + fires PostHog events
- `AuthProvider` wraps all routes in root layout — available on login pages

The 6 OTP digits are passed as password but ignored. Auth passes/fails on email match only.

---

## What Gets Dropped

The existing `src/app/login/patient/page.tsx` has:

- A sign-up flow (POST `/api/patients`)
- Its own localStorage writes (`patientEmail`, `patientName`, `patientId`)

Both are intentionally removed. The new component uses `AuthContext` only (demo users, `medicrew_portal_user` key).
