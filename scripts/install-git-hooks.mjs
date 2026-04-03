import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const MARKER_START = "# medicrew-validate-push-hook:start";
const MARKER_END = "# medicrew-validate-push-hook:end";
const DEBUG_LOG_PATH =
  "/Users/tasmanstar/Desktop/projects/medicrew/.cursor/debug-d65f45.log";
const DEBUG_SESSION_ID = "d65f45";
const hookBlock = `${MARKER_START}
log_ts() { date +%s%3N; }
emit_log() {
  echo "{\\"sessionId\\":\\"${DEBUG_SESSION_ID}\\",\\"runId\\":\\"git-pre-push-$(log_ts)\\",\\"hypothesisId\\":\\"H6\\",\\"location\\":\\".git/hooks/pre-push\\",\\"message\\":\\"$1\\",\\"data\\":$2,\\"timestamp\\":$(log_ts)}" >> "${DEBUG_LOG_PATH}" 2>/dev/null || true
  return 0
}
emit_log "hook-start" "{\\"hasPath\\":$( [ -n "$PATH" ] && echo true || echo false ),\\"pwd\\":\\"$(pwd)\\"}"
echo "Running Medicrew pre-push validation..."
bun run validate:push
hook_status=$?
emit_log "hook-validation-exit" "{\\"status\\":$hook_status}"
if [ $hook_status -ne 0 ]; then
  echo "Pre-push validation failed. Push blocked."
  emit_log "hook-blocked-push" "{\\"status\\":$hook_status}"
  exit $hook_status
fi
emit_log "hook-pass" "{\\"status\\":$hook_status}"
${MARKER_END}
`;

const root = process.cwd();
const gitDir = join(root, ".git");

if (!existsSync(gitDir)) {
  console.log("Skipping git hook install: .git directory not found.");
  process.exit(0);
}

const hooksDir = join(gitDir, "hooks");
const prePushPath = join(hooksDir, "pre-push");
mkdirSync(hooksDir, { recursive: true });

const hasPrePush = existsSync(prePushPath);
const existing = hasPrePush ? readFileSync(prePushPath, "utf8") : "";

const hasShebang =
  existing.startsWith("#!/bin/sh") || existing.startsWith("#!/usr/bin/env sh");
const base = hasPrePush ? existing.trimEnd() : "#!/bin/sh\n";
const markerRegex = new RegExp(
  `${MARKER_START}[\\s\\S]*?${MARKER_END}\\n?`,
  "g",
);
const baseWithoutManagedBlock = base.replace(markerRegex, "").trimEnd();

const preparedBase = hasShebang
  ? baseWithoutManagedBlock
  : `#!/bin/sh\n\n${baseWithoutManagedBlock}`;
const nextContent = `${preparedBase}\n\n${hookBlock}`;
writeFileSync(prePushPath, nextContent, "utf8");
chmodSync(prePushPath, 0o755);

console.log("Installed or updated pre-push validation hook.");
