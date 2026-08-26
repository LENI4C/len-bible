#!/usr/bin/env node
/**
 * Starts Next.js dev server, removing stale lock files left by crashed processes.
 * The .next/dev/lock file is created by Next.js on purpose while dev is running —
 * this script only removes it when no dev server is actually alive.
 */
import { execSync, spawn } from "child_process";
import { existsSync, unlinkSync } from "fs";
import { join } from "path";

const lockPath = join(process.cwd(), ".next/dev/lock");

function isDevServerRunning() {
  try {
    const out = execSync("pgrep -f 'next dev' 2>/dev/null || true", { encoding: "utf8" }).trim();
    return out.length > 0;
  } catch {
    return false;
  }
}

if (existsSync(lockPath) && !isDevServerRunning()) {
  try {
    unlinkSync(lockPath);
    console.log("Removed stale .next/dev/lock (previous dev server did not shut down cleanly).");
  } catch {
    // ignore
  }
}

const child = spawn("npx", ["next", "dev", ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: true,
  cwd: process.cwd(),
});

child.on("exit", (code) => process.exit(code ?? 0));
