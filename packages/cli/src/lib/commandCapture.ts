import { spawn } from "node:child_process";

export type CommandCaptureResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  startedAt: number;
  endedAt: number;
};

export async function runCommandWithCapture(
  command: string,
  cwd: string,
): Promise<CommandCaptureResult> {
  const startedAt = Date.now();

  return new Promise((resolve) => {
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    const child = spawn(command, {
      cwd,
      shell: true,
      env: process.env,
      stdio: ["inherit", "pipe", "pipe"],
    });

    child.stdout?.on("data", (chunk: Buffer) => {
      stdoutChunks.push(chunk);
      process.stdout.write(chunk);
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      stderrChunks.push(chunk);
      process.stderr.write(chunk);
    });

    child.on("close", (code) => {
      const endedAt = Date.now();
      resolve({
        stdout: Buffer.concat(stdoutChunks).toString("utf8"),
        stderr: Buffer.concat(stderrChunks).toString("utf8"),
        exitCode: code ?? 1,
        durationMs: endedAt - startedAt,
        startedAt,
        endedAt,
      });
    });

    child.on("error", () => {
      const endedAt = Date.now();
      resolve({
        stdout: Buffer.concat(stdoutChunks).toString("utf8"),
        stderr: Buffer.concat(stderrChunks).toString("utf8"),
        exitCode: 1,
        durationMs: endedAt - startedAt,
        startedAt,
        endedAt,
      });
    });
  });
}

export function mergeCommandOutput(stdout: string, stderr: string): string {
  if (!stdout) return stderr;
  if (!stderr) return stdout;
  return `${stdout}${stdout.endsWith("\n") ? "" : "\n"}--- stderr ---\n${stderr}`;
}

export function getRunCommandArgs(argv: string[]): string[] {
  const separatorIndex = argv.indexOf("--");
  if (separatorIndex === -1) {
    return [];
  }
  return argv.slice(separatorIndex + 1).filter((arg) => arg.length > 0);
}
