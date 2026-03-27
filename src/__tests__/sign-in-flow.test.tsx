// @vitest-environment jsdom
/**
 * sign-in-flow.test.tsx
 * Tests for sign-in-flow-1.tsx after Clerk migration.
 * The custom email/OTP form is gone — we now embed Clerk's <SignIn>.
 */

import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("next/link", () => {
  const React = require("react");
  return {
    default: ({ href, children, className }: any) =>
      React.createElement("a", { href, className }, children),
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("@react-three/fiber", () => {
  const React = require("react");
  return {
    Canvas: () => React.createElement("div", { "data-testid": "canvas" }),
    useFrame: vi.fn(),
    useThree: () => ({ size: { width: 0, height: 0 } }),
  };
});

vi.mock("three", () => {
  function Vector2() { return {}; }
  function Vector3() { return { fromArray() { return this; } }; }
  function ShaderMaterial() {
    return { uniforms: { u_time: { value: 0 }, u_resolution: { value: {} } } };
  }
  return {
    ShaderMaterial,
    Vector2,
    Vector3,
    Mesh: function () {},
    GLSL3: "",
    CustomBlending: 0,
    SrcAlphaFactor: 0,
    OneFactor: 0,
  };
});

vi.mock("@clerk/nextjs", () => {
  const React = require("react");
  return {
    SignIn: () => React.createElement("div", { "data-testid": "clerk-sign-in" }, "Clerk SignIn"),
    useClerk: () => ({
      loaded: true,
      client: {
        signIn: {
          create: vi.fn(),
        },
      },
      setActive: vi.fn(),
    }),
  };
});

import { SignInPage } from "@/components/ui/sign-in-flow-1";

afterEach(() => cleanup());

describe("SignInPage — Clerk integration", () => {
  it("renders without crashing for patient role", () => {
    render(<SignInPage role="patient" />);
  });

  it("renders without crashing for doctor role", () => {
    render(<SignInPage role="doctor" />);
  });

  it("renders the Clerk SignIn component", () => {
    render(<SignInPage role="patient" />);
    expect(screen.getByTestId("clerk-sign-in")).toBeTruthy();
  });

  it("renders the canvas background", () => {
    render(<SignInPage role="patient" />);
    expect(screen.getByTestId("canvas")).toBeTruthy();
  });

  it("renders the Back nav link", () => {
    render(<SignInPage role="patient" />);
    expect(screen.getAllByText(/back/i).length).toBeGreaterThan(0);
  });

  it("renders Home nav link in the navbar", () => {
    render(<SignInPage role="patient" />);
    expect(screen.getAllByText("Home").length).toBeGreaterThan(0);
  });
});
