"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { SignIn, useSignIn } from "@clerk/nextjs";

type Uniforms = {
  [key: string]: {
    value: number[] | number[][] | number;
    type: string;
  };
};

interface ShaderProps {
  source: string;
  uniforms: {
    [key: string]: {
      value: number[] | number[][] | number;
      type: string;
    };
  };
  maxFps?: number;
}

interface SignInPageProps {
  role: "patient" | "doctor";
  className?: string;
}

export const CanvasRevealEffect = ({
  animationSpeed = 10,
  opacities = [0.3, 0.3, 0.3, 0.5, 0.5, 0.5, 0.8, 0.8, 0.8, 1],
  colors = [[0, 255, 255]],
  containerClassName,
  dotSize,
  showGradient = true,
  reverse = false,
}: {
  animationSpeed?: number;
  opacities?: number[];
  colors?: number[][];
  containerClassName?: string;
  dotSize?: number;
  showGradient?: boolean;
  reverse?: boolean;
}) => {
  return (
    <div className={cn("h-full relative w-full", containerClassName)}>
      <div className="h-full w-full">
        <DotMatrix
          colors={colors ?? [[0, 255, 255]]}
          dotSize={dotSize ?? 3}
          opacities={
            opacities ?? [0.3, 0.3, 0.3, 0.5, 0.5, 0.5, 0.8, 0.8, 0.8, 1]
          }
          shader={`
            ${reverse ? "u_reverse_active" : "false"}_;
            animation_speed_factor_${animationSpeed.toFixed(1)}_;
          `}
          center={["x", "y"]}
        />
      </div>
      {showGradient && (
        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
      )}
    </div>
  );
};

interface DotMatrixProps {
  colors?: number[][];
  opacities?: number[];
  totalSize?: number;
  dotSize?: number;
  shader?: string;
  center?: ("x" | "y")[];
}

const DotMatrix: React.FC<DotMatrixProps> = ({
  colors = [[0, 0, 0]],
  opacities = [0.04, 0.04, 0.04, 0.04, 0.04, 0.08, 0.08, 0.08, 0.08, 0.14],
  totalSize = 20,
  dotSize = 2,
  shader = "",
  center = ["x", "y"],
}) => {
  const uniforms = React.useMemo(() => {
    let colorsArray = [
      colors[0],
      colors[0],
      colors[0],
      colors[0],
      colors[0],
      colors[0],
    ];
    if (colors.length === 2) {
      colorsArray = [
        colors[0],
        colors[0],
        colors[0],
        colors[1],
        colors[1],
        colors[1],
      ];
    } else if (colors.length === 3) {
      colorsArray = [
        colors[0],
        colors[0],
        colors[1],
        colors[1],
        colors[2],
        colors[2],
      ];
    }
    return {
      u_colors: {
        value: colorsArray.map((color) => [
          color[0] / 255,
          color[1] / 255,
          color[2] / 255,
        ]),
        type: "uniform3fv",
      },
      u_opacities: {
        value: opacities,
        type: "uniform1fv",
      },
      u_total_size: {
        value: totalSize,
        type: "uniform1f",
      },
      u_dot_size: {
        value: dotSize,
        type: "uniform1f",
      },
      u_reverse: {
        value: shader.includes("u_reverse_active") ? 1 : 0,
        type: "uniform1i",
      },
    };
  }, [colors, opacities, totalSize, dotSize, shader]);

  return (
    <Shader
      source={`
        precision mediump float;
        in vec2 fragCoord;

        uniform float u_time;
        uniform float u_opacities[10];
        uniform vec3 u_colors[6];
        uniform float u_total_size;
        uniform float u_dot_size;
        uniform vec2 u_resolution;
        uniform int u_reverse;

        out vec4 fragColor;

        float PHI = 1.61803398874989484820459;
        float random(vec2 xy) {
            return fract(tan(distance(xy * PHI, xy) * 0.5) * xy.x);
        }
        float map(float value, float min1, float max1, float min2, float max2) {
            return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
        }

        void main() {
            vec2 st = fragCoord.xy;
            ${
              center.includes("x")
                ? "st.x -= abs(floor((mod(u_resolution.x, u_total_size) - u_dot_size) * 0.5));"
                : ""
            }
            ${
              center.includes("y")
                ? "st.y -= abs(floor((mod(u_resolution.y, u_total_size) - u_dot_size) * 0.5));"
                : ""
            }

            float opacity = step(0.0, st.x);
            opacity *= step(0.0, st.y);

            vec2 st2 = vec2(int(st.x / u_total_size), int(st.y / u_total_size));

            float frequency = 5.0;
            float show_offset = random(st2);
            float rand = random(st2 * floor((u_time / frequency) + show_offset + frequency));
            opacity *= u_opacities[clamp(int(rand * 10.0), 0, 9)];
            opacity *= 1.0 - step(u_dot_size / u_total_size, fract(st.x / u_total_size));
            opacity *= 1.0 - step(u_dot_size / u_total_size, fract(st.y / u_total_size));

            vec3 color = u_colors[clamp(int(show_offset * 6.0), 0, 5)];

            float animation_speed_factor = 0.5;
            vec2 center_grid = u_resolution / 2.0 / u_total_size;
            float dist_from_center = distance(center_grid, st2);

            float timing_offset_intro = dist_from_center * 0.01 + (random(st2) * 0.15);

            float max_grid_dist = distance(center_grid, vec2(0.0, 0.0));
            float timing_offset_outro = (max_grid_dist - dist_from_center) * 0.02 + (random(st2 + 42.0) * 0.2);

            float current_timing_offset;
            if (u_reverse == 1) {
                current_timing_offset = timing_offset_outro;
                 opacity *= 1.0 - step(current_timing_offset, u_time * animation_speed_factor);
                 opacity *= clamp((step(current_timing_offset + 0.1, u_time * animation_speed_factor)) * 1.25, 1.0, 1.25);
            } else {
                current_timing_offset = timing_offset_intro;
                 opacity *= step(current_timing_offset, u_time * animation_speed_factor);
                 opacity *= clamp((1.0 - step(current_timing_offset + 0.1, u_time * animation_speed_factor)) * 1.25, 1.0, 1.25);
            }

            fragColor = vec4(color, opacity);
            fragColor.rgb *= fragColor.a;
        }`}
      uniforms={uniforms}
      maxFps={60}
    />
  );
};

// Fix 8: removed dead `hovered?: boolean` from props interface
const ShaderMaterial = ({
  source,
  uniforms,
  maxFps = 60,
}: {
  source: string;
  maxFps?: number;
  uniforms: Uniforms;
}) => {
  const { size } = useThree();
  const ref = useRef<THREE.Mesh>(null);
  // Fix 1: lastFrameTime is now a ref so it persists across renders without
  // causing re-renders and is safe inside useFrame.
  const lastFrameTimeRef = useRef(0);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const timestamp = clock.getElapsedTime();
    lastFrameTimeRef.current = timestamp;
    const material: any = ref.current.material;
    const timeLocation = material.uniforms.u_time;
    timeLocation.value = timestamp;
  });

  // Fix 2: uniforms logic inlined into useMemo; `uniforms` added to dep array.
  const material = useMemo(() => {
    const preparedUniforms: any = {};
    for (const uniformName in uniforms) {
      const uniform: any = uniforms[uniformName];
      switch (uniform.type) {
        case "uniform1f":
          preparedUniforms[uniformName] = { value: uniform.value, type: "1f" };
          break;
        case "uniform1i":
          preparedUniforms[uniformName] = { value: uniform.value, type: "1i" };
          break;
        case "uniform3f":
          preparedUniforms[uniformName] = {
            value: new THREE.Vector3().fromArray(uniform.value),
            type: "3f",
          };
          break;
        case "uniform1fv":
          preparedUniforms[uniformName] = { value: uniform.value, type: "1fv" };
          break;
        case "uniform3fv":
          preparedUniforms[uniformName] = {
            value: uniform.value.map((v: number[]) =>
              new THREE.Vector3().fromArray(v),
            ),
            type: "3fv",
          };
          break;
        case "uniform2f":
          preparedUniforms[uniformName] = {
            value: new THREE.Vector2().fromArray(uniform.value),
            type: "2f",
          };
          break;
        default:
          console.error(`Invalid uniform type for '${uniformName}'.`);
          break;
      }
    }
    preparedUniforms["u_time"] = { value: 0, type: "1f" };
    preparedUniforms["u_resolution"] = {
      value: new THREE.Vector2(size.width * 2, size.height * 2),
    };

    const materialObject = new THREE.ShaderMaterial({
      vertexShader: `
      precision mediump float;
      in vec2 coordinates;
      uniform vec2 u_resolution;
      out vec2 fragCoord;
      void main(){
        float x = position.x;
        float y = position.y;
        gl_Position = vec4(x, y, 0.0, 1.0);
        fragCoord = (position.xy + vec2(1.0)) * 0.5 * u_resolution;
        fragCoord.y = u_resolution.y - fragCoord.y;
      }
      `,
      fragmentShader: source,
      uniforms: preparedUniforms,
      glslVersion: THREE.GLSL3,
      blending: THREE.CustomBlending,
      blendSrc: THREE.SrcAlphaFactor,
      blendDst: THREE.OneFactor,
    });
    return materialObject;
  }, [size.width, size.height, source, uniforms]);

  return (
    <mesh ref={ref as any}>
      <planeGeometry args={[2, 2]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
};

const Shader: React.FC<ShaderProps> = ({ source, uniforms, maxFps = 60 }) => {
  return (
    <Canvas className="absolute inset-0  h-full w-full">
      <ShaderMaterial source={source} uniforms={uniforms} maxFps={maxFps} />
    </Canvas>
  );
};

// Fix 6: Use Next.js <Link> instead of <a> for nav links
const AnimatedNavLink = ({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) => {
  const textSizeClass = "text-sm";

  return (
    <Link
      href={href}
      className={`group relative inline-block overflow-hidden h-5 flex items-center ${textSizeClass}`}
    >
      <div className="flex flex-col transition-transform duration-400 ease-out transform group-hover:-translate-y-1/2">
        <span className="text-slate-500">{children}</span>
        <span className="text-slate-900">{children}</span>
      </div>
    </Link>
  );
};

function MiniNavbar({ role }: { role: "patient" | "doctor" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [headerShapeClass, setHeaderShapeClass] = useState("rounded-full");
  const shapeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isDoctor = role === "doctor";

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (shapeTimeoutRef.current) {
      clearTimeout(shapeTimeoutRef.current);
    }
    if (isOpen) {
      setHeaderShapeClass("rounded-xl");
    } else {
      shapeTimeoutRef.current = setTimeout(() => {
        setHeaderShapeClass("rounded-full");
      }, 300);
    }
    return () => {
      if (shapeTimeoutRef.current) {
        clearTimeout(shapeTimeoutRef.current);
      }
    };
  }, [isOpen]);

  const logoElement = (
    <div className="relative w-5 h-5 flex items-center justify-center">
      <span className="absolute w-1.5 h-1.5 rounded-full bg-gray-200 top-0 left-1/2 transform -translate-x-1/2 opacity-80"></span>
      <span className="absolute w-1.5 h-1.5 rounded-full bg-gray-200 left-0 top-1/2 transform -translate-y-1/2 opacity-80"></span>
      <span className="absolute w-1.5 h-1.5 rounded-full bg-gray-200 right-0 top-1/2 transform -translate-y-1/2 opacity-80"></span>
      <span className="absolute w-1.5 h-1.5 rounded-full bg-gray-200 bottom-0 left-1/2 transform -translate-x-1/2 opacity-80"></span>
    </div>
  );

  const navLinksData = [
    { label: "Home", href: "/" },
    { label: "Consult", href: "/consult" },
    {
      label: isDoctor ? "Patient Portal" : "Doctor Portal",
      href: isDoctor ? "/login/patient" : "/login/doctor",
    },
  ];

  // Fix 6 (loginButtonElement): stays as <a> — full navigation to /login is fine here
  const loginButtonElement = (
    <a
      href="/login"
      className="px-4 py-2 sm:px-3 text-xs sm:text-sm border border-slate-200 bg-white text-slate-600 rounded-full hover:border-slate-400 hover:text-slate-900 transition-colors duration-200 w-full sm:w-auto text-center block"
    >
      &larr; Back
    </a>
  );

  return (
    <header
      className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-20 flex flex-col items-center pl-6 pr-6 py-3 backdrop-blur-sm ${headerShapeClass} border border-slate-200 bg-white/80 w-[calc(100%-2rem)] sm:w-auto transition-[border-radius] duration-0 ease-in-out`}
    >
      <div className="flex items-center justify-between w-full gap-x-6 sm:gap-x-8">
        <div className="flex items-center">{logoElement}</div>
        <nav className="hidden sm:flex items-center space-x-4 sm:space-x-6 text-sm">
          {navLinksData.map((link) => (
            <AnimatedNavLink key={link.href} href={link.href}>
              {link.label}
            </AnimatedNavLink>
          ))}
        </nav>
        <div className="hidden sm:flex items-center gap-2 sm:gap-3">
          {loginButtonElement}
        </div>
        <button
          className="sm:hidden flex items-center justify-center w-8 h-8 text-slate-600 focus:outline-none"
          onClick={toggleMenu}
          aria-label={isOpen ? "Close Menu" : "Open Menu"}
        >
          {isOpen ? (
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          ) : (
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              ></path>
            </svg>
          )}
        </button>
      </div>
      <div
        className={`sm:hidden flex flex-col items-center w-full transition-all ease-in-out duration-300 overflow-hidden ${
          isOpen
            ? "max-h-[1000px] opacity-100 pt-4"
            : "max-h-0 opacity-0 pt-0 pointer-events-none"
        }`}
      >
        {/* Fix 6: mobile dropdown nav links use <Link> */}
        <nav className="flex flex-col items-center space-y-4 text-base w-full">
          {navLinksData.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-slate-600 hover:text-slate-900 transition-colors w-full text-center"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-col items-center space-y-4 mt-4 w-full">
          {loginButtonElement}
        </div>
      </div>
    </header>
  );
}

function DemoLoginButton({ role }: { role: "patient" | "doctor" }) {
  const { signIn, fetchStatus } = useSignIn();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availability, setAvailability] = useState<
    "checking" | "ready" | "disabled"
  >("checking");
  const [availabilityMessage, setAvailabilityMessage] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let active = true;
    const checkAvailability = async () => {
      try {
        const res = await fetch(`/api/demo-token?role=${role}`);
        if (!res.ok) throw new Error("status check failed");
        const data = (await res.json()) as { ready?: boolean; reason?: string };
        if (!active) return;
        if (data.ready) {
          setAvailability("ready");
          setAvailabilityMessage(null);
        } else {
          setAvailability("disabled");
          setAvailabilityMessage(
            data.reason === "disabled_by_env"
              ? "Demo login is disabled in this environment."
              : "Demo login is not configured in this environment.",
          );
        }
      } catch {
        if (!active) return;
        setAvailability("disabled");
        setAvailabilityMessage("Demo login is currently unavailable.");
      }
    };
    checkAvailability();
    return () => {
      active = false;
    };
  }, [role]);

  const handleDemoLogin = async () => {
    if (fetchStatus === "fetching") return;
    setLoading(true);
    setError(null);

    try {
      // Get a short-lived sign-in token from the backend (bypasses email verification)
      const tokenRes = await fetch("/api/demo-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      if (!tokenRes.ok) {
        const err = await tokenRes.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error ?? "Failed to get demo token",
        );
      }

      const { token } = (await tokenRes.json()) as { token: string };

      // Clerk v7: use ticket() then finalize() to create an active session
      const { error: ticketError } = await signIn.ticket({ ticket: token });
      if (ticketError) throw ticketError;

      if (signIn.status === "complete") {
        const { error: finalizeError } = await signIn.finalize();
        if (finalizeError) throw finalizeError;
        router.push(role === "doctor" ? "/doctor" : "/patient");
      } else {
        console.error("Unexpected sign-in status", signIn.status);
        setError("Sign-in requires additional steps. Please try again.");
      }
    } catch (err: unknown) {
      console.error("Demo login failed", err);
      const clerkErr = err as {
        errors?: { longMessage?: string; message?: string }[];
        message?: string;
        longMessage?: string;
      };
      const message =
        clerkErr?.longMessage ||
        clerkErr?.errors?.[0]?.longMessage ||
        clerkErr?.errors?.[0]?.message ||
        clerkErr?.message ||
        "Demo login failed.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const isDoctor = role === "doctor";
  const btnBg = isDoctor
    ? "bg-cyan-600 hover:bg-cyan-700"
    : "bg-sky-600 hover:bg-sky-700";
  const ringColor = isDoctor ? "ring-cyan-400" : "ring-sky-400";

  return (
    <div className="flex flex-col items-center gap-2 mt-4 w-full max-w-[360px]">
      <div className="flex items-center gap-3 w-full">
        <div className="flex-1 h-px bg-slate-300" />
        <span className="text-xs text-slate-400 uppercase tracking-wide">
          or try a demo
        </span>
        <div className="flex-1 h-px bg-slate-300" />
      </div>

      {availability === "ready" ? (
        <button
          onClick={handleDemoLogin}
          disabled={loading || fetchStatus === "fetching"}
          className={`w-full px-5 py-2.5 rounded-lg text-white text-sm font-medium shadow-md transition-all duration-200 focus:outline-none focus:ring-2 ${ringColor} focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed ${btnBg}`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="animate-spin h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Signing in…
            </span>
          ) : (
            `Demo ${isDoctor ? "Doctor" : "Patient"} Login`
          )}
        </button>
      ) : (
        <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-center text-xs text-slate-500">
          {availability === "checking"
            ? "Checking demo login availability..."
            : availabilityMessage}
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500 text-center mt-1 px-2">{error}</p>
      )}

      <p className="text-[10px] text-slate-400 text-center">
        Uses a shared demo account — no sign-up required
      </p>
    </div>
  );
}

export const SignInPage = ({ role, className }: SignInPageProps) => {
  const isDoctor = role === "doctor";
  const dotColor: number[] = isDoctor ? [6, 182, 212] : [14, 165, 233];
  const pageBg = isDoctor ? "bg-[#ecfeff]" : "bg-[#f0f9ff]";
  const topFadeFrom = isDoctor ? "from-[#ecfeff]" : "from-[#f0f9ff]";

  return (
    <div
      className={cn(
        `flex w-[100%] flex-col min-h-screen relative ${pageBg}`,
        className,
      )}
    >
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0">
          <CanvasRevealEffect
            animationSpeed={3}
            containerClassName={pageBg}
            colors={[dotColor]}
            dotSize={6}
            reverse={false}
          />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.8)_0%,_transparent_100%)]" />
        <div
          className={`absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b ${topFadeFrom} to-transparent`}
        />
      </div>

      <div className="relative z-10 flex flex-col flex-1">
        <MiniNavbar role={role} />
        <div className="flex flex-1 flex-col justify-center items-center mt-[150px] pb-16">
          <SignIn
            forceRedirectUrl={role === "doctor" ? "/doctor" : "/patient"}
          />
          <DemoLoginButton role={role} />
        </div>
      </div>
    </div>
  );
};
