#!/usr/bin/env node
/**
 * Starts Next.js dev server, removing stale lock files left by crashed processes.
 * The .next/dev/lock file is created by Next.js on purpose while dev is running —
 * this script only removes it when no dev server is actually alive.
 *
 * Security: never uses shell:true with user argv (command-injection risk).
 */
import { spawn, spawnSync } from "child_process";
import { existsSync, unlinkSync } from "fs";
import { createRequire } from "module";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const lockPath = join(root, ".next/dev/lock");

/** Only pass through safe Next CLI flags from the parent process. */
function sanitizeNextArgs(argv) {
  const allowed = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (typeof arg !== "string" || arg.length === 0 || arg.length > 200) continue;
    // Reject shell metacharacters / path traversal
    if (/[;&|`$<>\\\n\r]/.test(arg)) continue;
    if (arg.startsWith("-")) {
      // e.g. --port, -p, --hostname
      if (!/^--?[A-Za-z][A-Za-z0-9_-]*$/.test(arg)) continue;
      allowed.push(arg);
      // value for flags that take one (allow next token if non-flag)
      const next = argv[i + 1];
      if (
        next &&
        !next.startsWith("-") &&
        typeof next === "string" &&
        next.length <= 200 &&
        /^[A-Za-z0-9_.:/@+-]+$/.test(next)
      ) {
        allowed.push(next);
        i++;
      }
      continue;
    }
    // positional: rarely needed for `next dev`; skip unknowns
  }
  return allowed;
}

function isDevServerRunning() {
  // argv form — no shell interpolation
  const result = spawnSync("pgrep", ["-f", "next dev"], {
    encoding: "utf8",
    shell: false,
  });
  if (result.error) return false;
  return (result.stdout || "").trim().length > 0;
}

if (existsSync(lockPath) && !isDevServerRunning()) {
  try {
    unlinkSync(lockPath);
    console.log("Removed stale .next/dev/lock (previous dev server did not shut down cleanly).");
  } catch {
    // ignore
  }
}

let nextBin;
try {
  nextBin = require.resolve("next/dist/bin/next");
} catch {
  console.error("Could not resolve next binary. Run npm install.");
  process.exit(1);
}

const nextArgs = ["dev", ...sanitizeNextArgs(process.argv.slice(2))];
const child = spawn(process.execPath, [nextBin, ...nextArgs], {
  stdio: "inherit",
  shell: false,
  cwd: root,
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
