import { spawn } from 'child_process';
import type { CommandResult } from '../types/server.js';
import { McpError } from '@modelcontextprotocol/sdk/types.js';
import { ErrorCode } from '@modelcontextprotocol/sdk/types.js';

export async function executeShellCommand(
  shellCommand: string,
  shellArgs: string[],
  command: string,
  workingDir: string,
  timeoutSeconds: number
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    let stdoutDone = false;
    let stderrDone = false;
    let processClosed = false;
    let hasResolved = false;
    let output = '';
    let error = '';

    const tryResolve = () => {
      if (stdoutDone && stderrDone && processClosed && !hasResolved) {
        hasResolved = true;
        resolve({
          output,
          error,
          exitCode: shellProcess.exitCode
        });
      }
    };

    const shellProcess = spawn(
      shellCommand,
      [...shellArgs, command],
      { 
        cwd: workingDir, 
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: false,  // Make sure Windows console is visible
        shell: true  // This might help capture more output types
      }
    );

    if (!shellProcess.stdout || !shellProcess.stderr) {
      throw new McpError(
        ErrorCode.InternalError,
        'Failed to initialize shell process streams'
      );
    }

    shellProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    shellProcess.stderr.on('data', (data) => {
      error += data.toString();
    });

    shellProcess.stdout.on('end', () => {
      stdoutDone = true;
      tryResolve();
    });

    shellProcess.stderr.on('end', () => {
      stderrDone = true;
      tryResolve();
    });

    shellProcess.on('close', () => {
      processClosed = true;
      tryResolve();
    });

    shellProcess.on('error', (err) => {
      if (!hasResolved) {
        hasResolved = true;
        reject(new McpError(
          ErrorCode.InternalError,
          `Shell process error: ${err.message}`
        ));
      }
    });

    const timeout = setTimeout(() => {
      if (!hasResolved) {
        hasResolved = true;
        shellProcess.kill();
        reject(new McpError(
          ErrorCode.InternalError,
          `Command execution timed out after ${timeoutSeconds} seconds`
        ));
      }
    }, timeoutSeconds * 1000);

    shellProcess.on('close', () => clearTimeout(timeout));
  });
}