import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { performance } from "node:perf_hooks";

const PROCESS_RSS_LIMIT_BYTES = 1024 * 1024 * 1024;
const HASHES_PER_RUN = 8;
const SCRIPT_PATH = fileURLToPath(import.meta.url);
const backendRequire = createRequire(
  fileURLToPath(new URL("../../../../Aplicativo/back/package.json", import.meta.url)),
);

async function readMemoryFile(filename) {
  try {
    return BigInt((await readFile(`/sys/fs/cgroup/${filename}`, "utf8")).trim());
  } catch {
    return null;
  }
}

function toMiB(bytes) {
  return Math.round(Number(bytes) / (1024 * 1024));
}

async function runWorker(concurrency) {
  const argon2 = backendRequire("argon2");
  const latencies = [];
  const options = {
    type: argon2.argon2id,
    memoryCost: 65_536,
    timeCost: 3,
    parallelism: 1,
  };
  const runStarted = performance.now();

  for (let offset = 0; offset < HASHES_PER_RUN; offset += concurrency) {
    const group = Array.from(
      { length: Math.min(concurrency, HASHES_PER_RUN - offset) },
      async (_, groupIndex) => {
        const started = performance.now();
        await argon2.hash(
          `synthetic-audit-password-${concurrency}-${offset + groupIndex}`,
          options,
        );
        latencies.push(performance.now() - started);
      },
    );
    await Promise.all(group);
  }

  const usage = process.resourceUsage();
  const sorted = [...latencies].sort((left, right) => left - right);
  console.log(
    JSON.stringify({
      concurrency,
      hashes: latencies.length,
      wallMs: Math.round(performance.now() - runStarted),
      meanHashMs: Math.round(
        latencies.reduce((sum, value) => sum + value, 0) / latencies.length,
      ),
      medianHashMs: Math.round(sorted[Math.floor(sorted.length / 2)]),
      maxHashMs: Math.round(sorted.at(-1)),
      processMaxRssBytes: usage.maxRSS * 1024,
    }),
  );
}

async function runParent() {
  const baselineBytes = await readMemoryFile("memory.current");
  const cgroupLimitBytes = await readMemoryFile("memory.max");
  if (cgroupLimitBytes === null || baselineBytes === null) {
    throw new Error("Cgroup memory limit/current is unavailable; benchmark refused.");
  }
  if (
    cgroupLimitBytes - baselineBytes <
    BigInt(PROCESS_RSS_LIMIT_BYTES) * 2n
  ) {
    throw new Error("Insufficient cgroup headroom; benchmark refused.");
  }

  let observedContainerPeak = baselineBytes;
  const results = [];
  let stoppedAtLimit = false;

  for (const concurrency of [1, 2, 4, 8]) {
    const child = spawn(process.execPath, [SCRIPT_PATH], {
      cwd: path.resolve(path.dirname(SCRIPT_PATH), "../../../.."),
      env: {
        PATH: process.env.PATH ?? "",
        HOME: process.env.HOME ?? "",
        ARGON2_BENCH_WORKER: String(concurrency),
      },
      stdio: ["ignore", "pipe", "inherit"],
    });
    const closePromise = new Promise((resolve) => {
      child.once("close", (code) => resolve(code));
    });
    let stdout = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });

    let processRssPeak = 0;
    let killedForLimit = false;
    let finished = false;
    const timeout = setTimeout(() => {
      if (!finished) child.kill("SIGKILL");
    }, 120_000);

    while (!finished) {
      await new Promise((resolve) => setTimeout(resolve, 20));
      const current = await readMemoryFile("memory.current");
      if (current !== null && current > observedContainerPeak) {
        observedContainerPeak = current;
      }
      try {
        const status = await readFile(`/proc/${child.pid}/status`, "utf8");
        const match = status.match(/^VmRSS:\s+(\d+)\s+kB$/m);
        if (match) {
          processRssPeak = Math.max(processRssPeak, Number(match[1]) * 1024);
        }
      } catch {
        // The process may have exited between polling and reading its status.
      }
      if (processRssPeak > PROCESS_RSS_LIMIT_BYTES) {
        killedForLimit = true;
        stoppedAtLimit = true;
        child.kill("SIGKILL");
      }
      finished = child.exitCode !== null || child.signalCode !== null;
    }
    clearTimeout(timeout);
    const exitCode = await closePromise;

    if (killedForLimit) {
      results.push({ concurrency, stopped: "process RSS exceeded 1 GiB" });
      break;
    }
    if (exitCode !== 0) {
      throw new Error(
        `Argon2 worker failed at concurrency ${concurrency}; exit=${exitCode}.`,
      );
    }

    const workerResult = JSON.parse(stdout.trim());
    if (workerResult.processMaxRssBytes > PROCESS_RSS_LIMIT_BYTES) {
      results.push({ concurrency, stopped: "reported process maxRSS exceeded 1 GiB" });
      stoppedAtLimit = true;
      break;
    }
    results.push({
      ...workerResult,
      sampledProcessPeakMiB: toMiB(BigInt(processRssPeak)),
    });
  }

  const endingBytes = await readMemoryFile("memory.current");
  if (endingBytes !== null && endingBytes > observedContainerPeak) {
    observedContainerPeak = endingBytes;
  }

  console.log(
    JSON.stringify({
      hashParameters: {
        algorithm: "Argon2id",
        memoryCostKiB: 65_536,
        timeCost: 3,
        parallelism: 1,
        syntheticInputsOnly: true,
      },
      containerMemoryLimitMiB: toMiB(cgroupLimitBytes),
      containerMemoryBaselineMiB: toMiB(baselineBytes),
      containerMemoryPeakSampledMiB: toMiB(observedContainerPeak),
      containerMemoryPeakDeltaMiB: toMiB(observedContainerPeak - baselineBytes),
      processRssStopLimitMiB: 1024,
      stoppedAtLimit,
      results,
    }),
  );
}

const workerConcurrency = Number(process.env.ARGON2_BENCH_WORKER);
if (Number.isInteger(workerConcurrency) && workerConcurrency > 0) {
  await runWorker(workerConcurrency);
} else {
  await runParent();
}
