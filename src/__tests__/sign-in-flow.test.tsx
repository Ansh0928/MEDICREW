// @vitest-environment jsdom
/**
 * sign-in-flow.test.tsx
 * Tests for the animated sign-in component (sign-in-flow-1.tsx).
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act, cleanup } from "@testing-library/react";

// ─── Mock next/navigation ────────────────────────────────────────────────────
vi.mock("next/navigation", () => {
  const push = vi.fn();
  return { useRouter: () => ({ push }) };
});

// ─── Mock next/link ───────────────────────────────────────────────────────────
vi.mock("next/link", () => {
  const React = require("react");
  return {
    default: ({ href, children, className }: any) =>
      React.createElement("a", { href, className }, children),
  };
});

// ─── Mock framer-motion (render children immediately, no animation) ───────────
vi.mock("framer-motion", () => {
  const React = require("react");
  function makeComp(tag: string) {
    return React.forwardRef(
      (
        {
          children,
          initial,
          animate,
          exit,
          transition,
          whileHover,
          whileTap,
          variants,
          custom,
          layout,
          layoutId,
          ...rest
        }: any,
        ref: any
      ) => React.createElement(tag, { ...rest, ref }, children)
    );
  }
  const motion = new Proxy({}, { get: (_: any, prop: string) => makeComp(prop) });
  const AnimatePresence = ({ children }: any) =>
    React.createElement(React.Fragment, null, children);
  return { motion, AnimatePresence };
});

// ─── Mock @react-three/fiber ─────────────────────────────────────────────────
vi.mock("@react-three/fiber", () => {
  const React = require("react");
  return {
    Canvas: () => React.createElement("div", { "data-testid": "canvas" }),
    useFrame: vi.fn(),
    useThree: () => ({ size: { width: 0, height: 0 } }),
  };
});

// ─── Mock three ──────────────────────────────────────────────────────────────
vi.mock("three", () => {
  function Vector2(x: number, y: number) { return { x, y }; }
  function Vector3() { return { fromArray: function () { return this; } }; }
  function ShaderMaterial() {
    return { uniforms: { u_time: { value: 0 }, u_resolution: { value: {} } } };
  }
  function Mesh() {}
  return {
    ShaderMaterial,
    Vector2,
    Vector3,
    Mesh,
    GLSL3: "",
    CustomBlending: 0,
    SrcAlphaFactor: 0,
    OneFactor: 0,
  };
});

// ─── Mock AuthContext ─────────────────────────────────────────────────────────
vi.mock("@/contexts/AuthContext", () => {
  const loginFn = vi.fn();
  return {
    useAuth: () => ({
      login: loginFn,
      logout: vi.fn(),
      user: null,
      isLoading: false,
    }),
    __loginFn: loginFn,
  };
});

// ─── Import component and mocked modules ────────────────────────────────────
import { SignInPage } from "@/components/ui/sign-in-flow-1";
import * as AuthContext from "@/contexts/AuthContext";
import * as Nav from "next/navigation";

// Fix 5: reset the login mock before every test to prevent state bleed
beforeEach(() => {
  vi.clearAllMocks();
  const { useAuth } = AuthContext as any;
  const { login } = useAuth();
  vi.mocked(login).mockReset();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function renderPatient() {
  return render(<SignInPage role="patient" />);
}
function renderDoctor() {
  return render(<SignInPage role="doctor" />);
}

async function changeEmailAndSubmit(emailValue: string) {
  const input = screen.getByPlaceholderText("info@gmail.com") as HTMLInputElement;
  await act(async () => {
    fireEvent.change(input, { target: { value: emailValue } });
  });
  // Click the submit button (type="submit" inside the form)
  const submitBtn = document.querySelector('button[type="submit"]') as HTMLButtonElement;
  await act(async () => {
    if (submitBtn) fireEvent.click(submitBtn);
  });
}

async function fillAllDigits(digits: string = "123456") {
  // Fill indices 0-4, waiting for each to commit
  for (let i = 0; i < 5; i++) {
    await act(async () => {
      const inputs = screen
        .getAllByRole("textbox")
        .filter((el) => (el as HTMLInputElement).maxLength === 1);
      fireEvent.change(inputs[i], { target: { value: digits[i] } });
    });
    // Wait for React to commit the state update before next digit
    await waitFor(() => {
      const inputs = screen
        .getAllByRole("textbox")
        .filter((el) => (el as HTMLInputElement).maxLength === 1);
      expect((inputs[i] as HTMLInputElement).value).toBe(digits[i]);
    });
  }
  // Fill index 5 — this triggers handleCodeComplete, which may reset the code
  await act(async () => {
    const inputs = screen
      .getAllByRole("textbox")
      .filter((el) => (el as HTMLInputElement).maxLength === 1);
    fireEvent.change(inputs[5], { target: { value: digits[5] } });
  });
}

// ─── Static render tests ─────────────────────────────────────────────────────
describe("SignInPage — static render", () => {
  afterEach(() => cleanup());

  it("renders Patient Portal label", () => {
    renderPatient();
    expect(screen.getByText(/patient portal/i)).toBeTruthy();
  });

  it("renders Welcome to MediCrew heading", () => {
    renderPatient();
    expect(screen.getByText(/welcome to medicrew/i)).toBeTruthy();
  });

  it("renders the demo hint with patient email", () => {
    renderPatient();
    expect(screen.getByText(/patient@demo\.com/i)).toBeTruthy();
  });

  it("renders Doctor Portal label for doctor role", () => {
    renderDoctor();
    expect(screen.getByText(/doctor portal/i)).toBeTruthy();
  });

  it("renders the demo hint with doctor email", () => {
    renderDoctor();
    expect(screen.getByText(/doctor@demo\.com/i)).toBeTruthy();
  });
});

// ─── Step transition tests ────────────────────────────────────────────────────
describe("SignInPage — step transitions", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("advances to code step after email form submit", async () => {
    renderPatient();
    await changeEmailAndSubmit("patient@demo.com");
    expect(screen.getByText(/we sent you a code/i)).toBeTruthy();
  });

  it("back button returns to email step from code step", async () => {
    renderPatient();
    await changeEmailAndSubmit("patient@demo.com");
    expect(screen.getByText(/we sent you a code/i)).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /back/i }));
    });
    expect(screen.getByText(/welcome to medicrew/i)).toBeTruthy();
  });

  it("calls login with correct email, code, and role", async () => {
    const { useAuth } = AuthContext as any;
    const { login } = useAuth();
    vi.mocked(login).mockResolvedValue(false);

    renderPatient();
    await changeEmailAndSubmit("patient@demo.com");
    await fillAllDigits("999999");
    await waitFor(() =>
      expect(login).toHaveBeenCalledWith("patient@demo.com", "999999", "patient")
    );
  });

  it("shows auth error when login returns false", async () => {
    const { useAuth } = AuthContext as any;
    const { login } = useAuth();
    vi.mocked(login).mockResolvedValue(false);

    renderPatient();
    await changeEmailAndSubmit("wrong@email.com");
    await fillAllDigits("123456");
    await waitFor(() =>
      expect(screen.getByText(/invalid credentials/i)).toBeTruthy()
    );
  });

  it("shows success step and navigates to /patient on successful login", async () => {
    const { useAuth } = AuthContext as any;
    const { login } = useAuth();
    vi.mocked(login).mockResolvedValue(true);

    const { useRouter } = Nav as any;
    const { push } = useRouter();

    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderPatient();
    await changeEmailAndSubmit("patient@demo.com");
    await fillAllDigits("123456");
    await act(async () => { vi.advanceTimersByTime(2500); });

    expect(screen.getByText(/you're in/i)).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /continue to dashboard/i }));
    });
    expect(push).toHaveBeenCalledWith("/patient");
  });

  it("shows success step and navigates to /doctor on successful login", async () => {
    const { useAuth } = AuthContext as any;
    const { login } = useAuth();
    vi.mocked(login).mockResolvedValue(true);

    const { useRouter } = Nav as any;
    const { push } = useRouter();

    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderDoctor();
    await changeEmailAndSubmit("doctor@demo.com");
    await fillAllDigits("123456");
    await act(async () => { vi.advanceTimersByTime(2500); });

    expect(screen.getByText(/you're in/i)).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /continue to dashboard/i }));
    });
    expect(push).toHaveBeenCalledWith("/doctor");
  });
});
