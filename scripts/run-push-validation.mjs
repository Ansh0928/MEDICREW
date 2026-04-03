import { rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { cwd, platform } from "node:process";

const DEBUG_ENDPOINT =
  "http://127.0.0.1:7485/ingest/d6fb8f9e-e5b3-4f25-baae-6022b72f56f5";
const DEBUG_SESSION_ID = "d65f45";
const runId = `push-validation-${Date.now()}`;

async function debugLog(hypothesisId, location, message, data = {}) {
  try {
    await fetch(DEBUG_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": DEBUG_SESSION_ID,
      },
      body: JSON.stringify({
        sessionId: DEBUG_SESSION_ID,
        runId,
        hypothesisId,
        location,
        message,
        data,
        timestamp: Date.now(),
      }),
    });
  } catch {}
}

const strictMode = process.argv.includes("--strict");
const steps = strictMode
  ? [
      ["bun", ["run", "lint"]],
      ["bun", ["run", "test"]],
      ["bun", ["run", "build"]],
    ]
  : [
      ["bun", ["run", "test"]],
      ["bun", ["run", "build"]],
    ];

async function main() {
  // Start with a clean Next.js build cache to avoid intermittent manifest issues.
  // #region agent log
  await debugLog(
    "H1",
    "scripts/run-push-validation.mjs:22",
    "validation-run-start",
    {
      strictMode,
      stepCount: steps.length,
      platform,
      cwd: cwd(),
    },
  );
  // #endregion

  try {
    rmSync(".next", { recursive: true, force: true });
    // #region agent log
    await debugLog(
      "H2",
      "scripts/run-push-validation.mjs:33",
      "next-cache-cleared",
      { path: ".next" },
    );
    // #endregion
  } catch (error) {
    // #region agent log
    await debugLog(
      "H2",
      "scripts/run-push-validation.mjs:36",
      "next-cache-clear-failed",
      {
        name: error?.name,
        message: error?.message,
      },
    );
    // #endregion
    throw error;
  }

  for (const [command, args] of steps) {
    // #region agent log
    await debugLog("H3", "scripts/run-push-validation.mjs:45", "step-start", {
      command,
      args,
      hasPath: Boolean(process.env.PATH),
    });
    // #endregion

    const result = spawnSync(command, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
      env: process.env,
    });

    // #region agent log
    await debugLog("H3", "scripts/run-push-validation.mjs:58", "step-finish", {
      command,
      args,
      status: result.status,
      signal: result.signal,
      errorMessage: result.error?.message ?? null,
      errorCode: result.error?.code ?? null,
    });
    // #endregion

    if (typeof result.status === "number" && result.status !== 0) {
      // #region agent log
      await debugLog(
        "H4",
        "scripts/run-push-validation.mjs:69",
        "step-nonzero-exit",
        {
          command,
          args,
          status: result.status,
        },
      );
      // #endregion
      process.exit(result.status);
    }

    if (result.error) {
      // #region agent log
      await debugLog(
        "H4",
        "scripts/run-push-validation.mjs:80",
        "step-runtime-error",
        {
          command,
          args,
          message: result.error.message,
          code: result.error.code ?? null,
        },
      );
      // #endregion
      console.error(result.error.message);
      process.exit(1);
    }
  }
  // #region agent log
  await debugLog(
    "H5",
    "scripts/run-push-validation.mjs:92",
    "validation-run-success",
    {
      strictMode,
      stepCount: steps.length,
    },
  );
  // #endregion
}

await main();
