import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import path from 'path';
import { executeShellCommand } from '../../utils/shell.js';
import { validateShellOperators } from '../../utils/validation.js';
import type { ExecuteCommandArgs, HandlerContext, ToolResponse } from '../../types/server.js';
import type { ServerConfig } from '../../types/config.js';

export async function executeCommand(
  args: ExecuteCommandArgs,
  context: HandlerContext
): Promise<ToolResponse> {
  const { config, logger, commandHistory } = context;

  // Log the command execution request
  logger.info('Executing command:', {
    shell: args.shell,
    command: args.command,
    workingDir: args.workingDir || process.cwd()
  });

  // Validate command
  const shellKey = args.shell as keyof ServerConfig['shells'];
  validateShellOperators(args.command, config.shells[shellKey]);

  // Validate working directory if provided
  const workingDir = args.workingDir ? 
    path.resolve(args.workingDir) : 
    process.cwd();

  const shellConfig = config.shells[shellKey];
  
  if (config.security.restrictWorkingDirectory) {
    const isAllowedPath = Array.from(config.security.allowedPaths).some(
      (allowedPath: string) => workingDir.startsWith(allowedPath)
    );

    if (!isAllowedPath) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Working directory (${workingDir}) outside allowed paths`
      );
    }
  }

  try {
    const result = await executeShellCommand(
      shellConfig.command,
      shellConfig.args,
      args.command,
      workingDir,
      config.security.commandTimeout
    );

    // Prepare result message
    let resultMessage = '';
    if (result.exitCode === 0) {
      resultMessage = result.output || 'Command completed successfully (no output)';
    } else {
      resultMessage = `Command failed with exit code ${result.exitCode}\n`;
      if (result.error) resultMessage += `Error output:\n${result.error}\n`;
      if (result.output) resultMessage += `Standard output:\n${result.output}`;
    }

    // Log command result
    logger.info('Command completed:', {
      exitCode: result.exitCode,
      command: args.command,
      shell: args.shell,
      output: resultMessage
    });

    // Store in history if enabled
    if (config.security.logCommands) {
      commandHistory.push({
        command: args.command,
        output: resultMessage,
        timestamp: new Date().toISOString(),
        exitCode: result.exitCode ?? -1
      });

      if (commandHistory.length > config.security.maxHistorySize) {
        commandHistory.splice(0, commandHistory.length - config.security.maxHistorySize);
      }
    }

    return {
      content: [{
        type: "text",
        text: resultMessage
      }],
      isError: result.exitCode !== 0,
      metadata: {
        exitCode: result.exitCode ?? -1,
        shell: args.shell,
        workingDirectory: workingDir
      }
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Command execution failed:', err);
    throw error;
  }
}