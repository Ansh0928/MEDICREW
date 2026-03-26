# Sign-In Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing MediCrew login pages with a role-aware animated sign-in component (WebGL dot-matrix background, email → OTP → success flow) wired to the real demo auth system.

**Architecture:** A single `sign-in-flow-1.tsx` file contains all sub-components (canvas shader, dot matrix, navbar, sign-in page). Pages at `/login/patient` and `/login/doctor` import it via `next/dynamic` with `ssr: false` to prevent Three.js SSR crashes. Auth is wired through the existing `useAuth().login()` hook — demo email required, password ignored.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind v4, Three.js, @react-three/fiber, framer-motion, vitest + @testing-library/react

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Create | `src/components/ui/sign-in-flow-1.tsx` | Full sign-in component with all sub-components |
| Replace | `src/app/login/patient/page.tsx` | Dynamic import of SignInPage with role="patient" |
| Replace | `src/app/login/doctor/page.tsx` | Dynamic import of SignInPage with role="doctor" |
| Create | `src/__tests__/sign-in-flow.test.tsx` | Unit tests for auth wiring and step transitions |

---

## Task 1: Install Dependencies

**Files:** `package.json`, `bun.lock`

- [ ] **Step 1: Install three and @react-three/fiber**

```bash
bun add three @react-three/fiber
```

Expected: both packages appear in `package.json` dependencies.

- [ ] **Step 2: Verify install**

```bash
bun run build 2>&1 | head -20
```

Expected: no "Cannot find module 'three'" or "Cannot find module '@react-three/fiber'" errors. Build may show other unrelated errors — that's fine for now.

- [ ] **Step 3: Commit**

```bash
git add package.json bun.lock
git commit -m "chore: add three and @react-three/fiber for sign-in canvas effect"
```

---

## Task 2: Write Tests First

**Files:**
- Create: `src/__tests__/sign-in-flow.test.tsx`

Mock Three.js and R3F (they use browser-only APIs that don't exist in vitest/jsdom). Test only the auth wiring and step transitions, not the WebGL canvas itself.

- [ ] **Step 1: Create the test file**

```tsx
// src/__tests__/sign-in-flow.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import React from "react";

// --- Mocks ---

// Mock Three.js and R3F (browser-only, not needed for logic tests)
vi.mock("three", () => ({
  ShaderMaterial: vi.fn().mockReturnValue({ uniforms: {} }),
  Vector2: vi.fn().mockReturnValue({ fromArray: vi.fn() }),
  Vector3: vi.fn().mockReturnValue({ fromArray: vi.fn() }),
  GLSL3: "GLSL3",
  CustomBlending: "CustomBlending",
  SrcAlphaFactor: "SrcAlphaFactor",
  OneFactor: "OneFactor",
}));

vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="canvas">{children}</div>
  ),
  useFrame: vi.fn(),
  useThree: vi.fn().mockReturnValue({ size: { width: 800, height: 600 } }),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock AuthContext
const mockLogin = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ login: mockLogin }),
}));

// Import AFTER mocks
import { SignInPage } from "@/components/ui/sign-in-flow-1";

// --- Tests ---

describe("SignInPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders email step with demo hint for patient role", () => {
    render(<SignInPage role="patient" />);
    expect(screen.getByPlaceholderText(/gmail\.com/i)).toBeTruthy();
    expect(screen.getByText(/patient@demo\.com/i)).toBeTruthy();
  });

  it("renders email step with demo hint for doctor role", () => {
    render(<SignInPage role="doctor" />);
    expect(screen.getByText(/doctor@demo\.com/i)).toBeTruthy();
  });

  it("advances to code step on email submit", async () => {
    render(<SignInPage role="patient" />);
    const input = screen.getByPlaceholderText(/gmail\.com/i);
    fireEvent.change(input, { target: { value: "patient@demo.com" } });
    fireEvent.submit(input.closest("form")!);
    await waitFor(() => {
      expect(screen.getByText(/we sent you a code/i)).toBeTruthy();
    });
  });

  it("calls login with correct args when 6 digits entered", async () => {
    mockLogin.mockResolvedValue(true);
    render(<SignInPage role="patient" />);

    // Advance to code step
    const emailInput = screen.getByPlaceholderText(/gmail\.com/i);
    fireEvent.change(emailInput, { target: { value: "patient@demo.com" } });
    fireEvent.submit(emailInput.closest("form")!);

    await waitFor(() => screen.getByText(/we sent you a code/i));

    // Fill 6 code inputs
    const codeInputs = screen.getAllByRole("textbox").filter(
      (el) => el.getAttribute("maxlength") === "1"
    );
    for (const [i, input] of codeInputs.entries()) {
      fireEvent.change(input, { target: { value: String(i + 1) } });
    }

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("patient@demo.com", "123456", "patient");
    });
  });

  it("shows error and resets code inputs on failed login", async () => {
    mockLogin.mockResolvedValue(false);
    render(<SignInPage role="patient" />);

    const emailInput = screen.getByPlaceholderText(/gmail\.com/i);
    fireEvent.change(emailInput, { target: { value: "wrong@example.com" } });
    fireEvent.submit(emailInput.closest("form")!);

    await waitFor(() => screen.getByText(/we sent you a code/i));

    const codeInputs = screen.getAllByRole("textbox").filter(
      (el) => el.getAttribute("maxlength") === "1"
    );
    for (const [i, input] of codeInputs.entries()) {
      fireEvent.change(input, { target: { value: String(i + 1) } });
    }

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeTruthy();
    });
  });

  it("redirects patient to /patient on success", async () => {
    mockLogin.mockResolvedValue(true);
    render(<SignInPage role="patient" />);

    const emailInput = screen.getByPlaceholderText(/gmail\.com/i);
    fireEvent.change(emailInput, { target: { value: "patient@demo.com" } });
    fireEvent.submit(emailInput.closest("form")!);
    await waitFor(() => screen.getByText(/we sent you a code/i));

    const codeInputs = screen.getAllByRole("textbox").filter(
      (el) => el.getAttribute("maxlength") === "1"
    );
    for (const [i, input] of codeInputs.entries()) {
      fireEvent.change(input, { target: { value: String(i + 1) } });
    }

    // Success step appears after 2s timeout — advance fake timers
    await waitFor(() => screen.getByText(/you're in/i), { timeout: 3000 });

    const dashboardBtn = screen.getByRole("button", { name: /continue to dashboard/i });
    fireEvent.click(dashboardBtn);
    expect(mockPush).toHaveBeenCalledWith("/patient");
  });

  it("redirects doctor to /doctor on success", async () => {
    mockLogin.mockResolvedValue(true);
    render(<SignInPage role="doctor" />);

    const emailInput = screen.getByPlaceholderText(/gmail\.com/i);
    fireEvent.change(emailInput, { target: { value: "doctor@demo.com" } });
    fireEvent.submit(emailInput.closest("form")!);
    await waitFor(() => screen.getByText(/we sent you a code/i));

    const codeInputs = screen.getAllByRole("textbox").filter(
      (el) => el.getAttribute("maxlength") === "1"
    );
    for (const [i, input] of codeInputs.entries()) {
      fireEvent.change(input, { target: { value: String(i + 1) } });
    }

    await waitFor(() => screen.getByText(/you're in/i), { timeout: 3000 });

    const dashboardBtn = screen.getByRole("button", { name: /continue to dashboard/i });
    fireEvent.click(dashboardBtn);
    expect(mockPush).toHaveBeenCalledWith("/doctor");
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail (component doesn't exist yet)**

```bash
bun run test src/__tests__/sign-in-flow.test.tsx 2>&1 | tail -20
```

Expected: FAIL with "Cannot find module '@/components/ui/sign-in-flow-1'".

---

## Task 3: Create the Component

**Files:**
- Create: `src/components/ui/sign-in-flow-1.tsx`

Start from the source component provided in the conversation. Apply all modifications from the spec.

- [ ] **Step 1: Create the file with the base source + role prop + theme derivation**

Paste the full source component, then make the following changes at the top of `SignInPage`:

```tsx
// Add these imports after existing ones
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

// Change the interface
interface SignInPageProps {
  role: "patient" | "doctor";
  className?: string;
}

export const SignInPage = ({ role, className }: SignInPageProps) => {
  // Theme derivation — all literal strings, no interpolation
  const isDoctor = role === "doctor";
  const dotColor: number[] = isDoctor ? [6, 182, 212] : [14, 165, 233];
  const pageBg = isDoctor ? "bg-[#ecfeff]" : "bg-[#f0f9ff]";
  const headingColor = isDoctor ? "#164e63" : "#0c4a6e";
  const gradientFrom = isDoctor ? "from-[#06b6d4]" : "from-[#0ea5e9]";
  const gradientTo = isDoctor ? "to-[#22d3ee]" : "to-[#38bdf8]";
  const borderColor = isDoctor ? "border-cyan-100" : "border-sky-100";
  const inputBg = isDoctor ? "bg-[#ecfeff]" : "bg-[#f0f9ff]";
  const topFadeFrom = isDoctor ? "from-[#ecfeff]" : "from-[#f0f9ff]";

  // Auth hooks
  const { login } = useAuth();
  const router = useRouter();

  // Existing state
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "code" | "success">("email");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [authError, setAuthError] = useState("");           // NEW
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [initialCanvasVisible, setInitialCanvasVisible] = useState(true);
  const [reverseCanvasVisible, setReverseCanvasVisible] = useState(false);
  // ... rest of existing state
```

- [ ] **Step 2: Replace CanvasRevealEffect calls with role colors**

Find both `<CanvasRevealEffect` usages in `SignInPage` and update `colors` prop:

```tsx
// Both instances — replace:
colors={[[255, 255, 255], [255, 255, 255]]}
// With:
colors={[dotColor]}
```

- [ ] **Step 3: Flip the root div and background overlays to light theme**

```tsx
// Root div — replace bg-black:
<div className={cn(`flex w-[100%] flex-col min-h-screen relative ${pageBg}`, className)}>

// Radial overlay — replace rgba(0,0,0,1):
<div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.8)_0%,_transparent_100%)]" />

// Top fade — replace from-black:
<div className={`absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b ${topFadeFrom} to-transparent`} />
```

- [ ] **Step 4: Update all text and border colors in SignInPage JSX**

Apply these replacements throughout the email step, code step, and success step JSX:

| Old | New |
|-----|-----|
| `text-white` (headings h1) | `style={{ color: headingColor }}` |
| `text-white/70`, `text-white/50` | `text-slate-500` |
| `text-white/40` | `text-slate-400` |
| `border-white/10` | `className={borderColor}` (or literal `border-sky-100` / `border-cyan-100`) |
| `bg-white/5` (Google button) | `bg-white` |
| `text-white` (Google button label) | `text-slate-700` |
| `bg-[#111]` (disabled Continue) | `bg-slate-100` |
| `text-white/50` (disabled Continue) | `text-slate-400` |
| Continue button active state | `` `bg-gradient-to-r ${gradientFrom} ${gradientTo} text-white` `` |
| Email input `className` | `` `w-full ${inputBg} border ${borderColor} rounded-full py-3 px-4 text-slate-700 focus:outline-none focus:border focus:border-sky-300` `` |
| Back button | `bg-slate-900 text-white` (keep dark for contrast) |
| `text-white` (code inputs) | `text-slate-800` |
| Placeholder `0` in code | `text-slate-300` |
| `text-white/20` (pipe separator) | `text-slate-200` |
| Code input container border | `` `border ${borderColor}` `` |

- [ ] **Step 5: Add demo hint below email input**

After the email input `</div>` (the `relative` wrapper), add:

```tsx
<p className="text-xs text-slate-400 text-center mt-1">
  Demo: {isDoctor ? "doctor@demo.com" : "patient@demo.com"}
</p>
```

- [ ] **Step 6: Replace handleCodeChange completion block with async auth wiring**

Add `handleCodeComplete` above `handleCodeChange`:

```tsx
const handleCodeComplete = async (finalCode: string[]) => {
  setAuthError("");
  setReverseCanvasVisible(true);
  setTimeout(() => setInitialCanvasVisible(false), 50);

  const ok = await login(email, finalCode.join(""), role);
  if (ok) {
    setTimeout(() => {
      setStep("success");
    }, 2000);
  } else {
    setReverseCanvasVisible(false);
    setInitialCanvasVisible(true);
    setAuthError("Invalid credentials. Use the demo email shown above.");
    setCode(["", "", "", "", "", ""]);
    setTimeout(() => codeInputRefs.current[0]?.focus(), 100);
  }
};
```

Make `handleCodeChange` async and call `handleCodeComplete` when all 6 digits are filled. Find the block inside `handleCodeChange` that starts `if (index === 5 && value)` and replace it:

```tsx
// OLD (remove this block):
if (index === 5 && value) {
  const isComplete = newCode.every(digit => digit.length === 1);
  if (isComplete) {
    setReverseCanvasVisible(true);
    setTimeout(() => { setInitialCanvasVisible(false); }, 50);
    setTimeout(() => { setStep("success"); }, 2000);
  }
}

// NEW:
if (index === 5 && value) {
  const isComplete = newCode.every(digit => digit.length === 1);
  if (isComplete) {
    await handleCodeComplete(newCode);
  }
}
```

Also make the function signature async:
```tsx
const handleCodeChange = async (index: number, value: string) => {
```

- [ ] **Step 7: Add authError display below code inputs**

In the code step JSX, after the code input container `</div>`, add:

```tsx
{authError && (
  <p className="text-red-500 text-xs text-center mt-2">{authError}</p>
)}
```

- [ ] **Step 8: Wire success step router.push**

Find the "Continue to Dashboard" button in the success step and add the onClick:

```tsx
<motion.button
  // ... existing motion props
  onClick={() => router.push(isDoctor ? "/doctor" : "/patient")}
  className="w-full rounded-full bg-slate-900 text-white font-medium py-3 hover:bg-slate-800 transition-colors"
>
  Continue to Dashboard
</motion.button>
```

- [ ] **Step 9: Adapt MiniNavbar to light theme and MediCrew links**

In `MiniNavbar`, the component receives no props — it cannot access `role`. Pass role down as a prop:

Change `function MiniNavbar()` to `function MiniNavbar({ role }: { role: "patient" | "doctor" })` and update the call site in `SignInPage`: `<MiniNavbar role={role} />`.

Then inside `MiniNavbar`:

```tsx
// Replace navLinksData:
const navLinksData = [
  { label: "Home", href: "/" },
  { label: "Consult", href: "/consult" },
  { label: role === "doctor" ? "Patient Portal" : "Doctor Portal",
    href: role === "doctor" ? "/login/patient" : "/login/doctor" },
];
```

Replace the header className values:
- `bg-[#1f1f1f57]` → `bg-white/80`
- `border-[#333]` → `border-slate-200`

Replace the Login button:
```tsx
<a
  href="/login"
  className="px-4 py-2 sm:px-3 text-xs sm:text-sm border border-slate-200 bg-white text-slate-600 rounded-full hover:border-slate-400 hover:text-slate-900 transition-colors duration-200 w-full sm:w-auto text-center"
>
  ← Back
</a>
```

Remove the Signup button entirely (delete `signupButtonElement` and its usage).

Update `AnimatedNavLink` text colors:
- `text-gray-300` → `text-slate-500`
- `text-white` (hover) → `text-slate-900`

Update mobile menu link colors:
- `text-gray-300 hover:text-white` → `text-slate-600 hover:text-slate-900`

Update hamburger icon color:
- `text-gray-300` → `text-slate-600`

- [ ] **Step 10: Run tests**

```bash
bun run test src/__tests__/sign-in-flow.test.tsx 2>&1 | tail -30
```

Expected: most tests pass. The success-redirect tests may need `vi.useFakeTimers()` — see fix below if they fail.

**If the 2s setTimeout causes test timeouts**, add to the describe block:
```tsx
beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});
```

And in the success tests, after filling digits:
```tsx
await vi.runAllTimersAsync();
await waitFor(() => screen.getByText(/you're in/i));
```

- [ ] **Step 11: Commit**

```bash
git add src/components/ui/sign-in-flow-1.tsx src/__tests__/sign-in-flow.test.tsx
git commit -m "feat(auth): add animated sign-in component with role-based blue/cyan theme"
```

---

## Task 4: Replace Patient Login Page

**Files:**
- Replace: `src/app/login/patient/page.tsx`

- [ ] **Step 1: Overwrite the patient login page**

```tsx
// src/app/login/patient/page.tsx
import dynamic from "next/dynamic";

const SignInPage = dynamic(
  () => import("@/components/ui/sign-in-flow-1").then((m) => m.SignInPage),
  { ssr: false }
);

export default function PatientLogin() {
  return <SignInPage role="patient" />;
}
```

Note: No `"use client"` directive needed — the page itself is a server component; `dynamic` with `ssr: false` handles the client-only rendering.

- [ ] **Step 2: Run tests to confirm nothing broke**

```bash
bun run test 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/app/login/patient/page.tsx
git commit -m "feat(auth): replace patient login page with animated sign-in flow"
```

---

## Task 5: Replace Doctor Login Page

**Files:**
- Replace: `src/app/login/doctor/page.tsx`

- [ ] **Step 1: Check what the current doctor login page contains**

Read `src/app/login/doctor/page.tsx` first to understand what's being dropped.

- [ ] **Step 2: Overwrite the doctor login page**

```tsx
// src/app/login/doctor/page.tsx
import dynamic from "next/dynamic";

const SignInPage = dynamic(
  () => import("@/components/ui/sign-in-flow-1").then((m) => m.SignInPage),
  { ssr: false }
);

export default function DoctorLogin() {
  return <SignInPage role="doctor" />;
}
```

- [ ] **Step 3: Run full test suite**

```bash
bun run test 2>&1 | tail -30
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/app/login/doctor/page.tsx
git commit -m "feat(auth): replace doctor login page with animated sign-in flow (cyan theme)"
```

---

## Task 6: Smoke Test in Browser

**No code changes — manual verification only.**

- [ ] **Step 1: Start dev server**

```bash
bun run dev
```

- [ ] **Step 2: Check patient login**

Navigate to `http://localhost:3000/login/patient`:
- [ ] Page background is light blue (`#f0f9ff`)
- [ ] Animated dot matrix renders in sky blue
- [ ] Demo hint shows `patient@demo.com`
- [ ] Enter `patient@demo.com` in email field → click arrow → advances to code step
- [ ] Code step has 6 input boxes with sky-blue border
- [ ] Enter any 6 digits → reverse animation plays → success screen appears
- [ ] "Continue to Dashboard" → redirects to `/patient`

- [ ] **Step 3: Check doctor login**

Navigate to `http://localhost:3000/login/doctor`:
- [ ] Page background is light cyan (`#ecfeff`)
- [ ] Dot matrix renders in cyan
- [ ] Demo hint shows `doctor@demo.com`
- [ ] Full flow works → redirects to `/doctor`

- [ ] **Step 4: Check error state**

On either page:
- [ ] Enter a wrong email (e.g. `fake@test.com`) → advance → fill 6 digits → error message appears, code inputs reset

- [ ] **Step 5: Check navbar links**

- [ ] "← Back" returns to `/login` portal selector
- [ ] "Consult" link → `/consult`
- [ ] Role-switch link works

- [ ] **Step 6: Final commit (if any last fixes)**

```bash
git add -A
git commit -m "fix(auth): smoke test corrections"
```
