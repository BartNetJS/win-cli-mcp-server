import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import type { HandlerContext, ToolResponse } from '../../types/server.js';
import { validateShellOperators } from '../../utils/validation.js';
import { SSHConnectionPool } from '../../utils/ssh.js';

interface SshExecuteArgs {
  connectionId: string;
  command: string;
}

export async function sshExecute(
  args: SshExecuteArgs,
  context: HandlerContext,
  sshPool: SSHConnectionPool
): Promise<ToolResponse> {
  const { config, logger, commandHistory } = context;

  if (!config.ssh.enabled) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      "SSH support is disabled in configuration"
    );
  }

  const connectionConfig = config.ssh.connections[args.connectionId];
  if (!connectionConfig) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      `Unknown SSH connection ID: ${args.connectionId}`
    );
  }

  try {
    // Validate command using shell operators for 'cmd' shell
    validateShellOperators(args.command, config.shells.cmd);

    const connection = await sshPool.getConnection(args.connectionId, connectionConfig);
    const { output, exitCode } = await connection.executeCommand(args.command);

    if (config.security.logCommands) {
      commandHistory.push({
        command: args.command,
        output,
        timestamp: new Date().toISOString(),
        exitCode,
        connectionId: args.connectionId
      });

      if (commandHistory.length > config.security.maxHistorySize) {
        commandHistory.splice(0, commandHistory.length - config.security.maxHistorySize);
      }
    }

    return {
      content: [{
        type: "text",
        text: output || 'Command completed successfully (no output)'
      }],
      isError: exitCode !== 0,
      metadata: {
        exitCode,
        connectionId: args.connectionId
      }
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('SSH command execution failed:', err);
    throw error;
  }
}

interface SshDisconnectArgs {
  connectionId: string;
}

export async function sshDisconnect(
  args: SshDisconnectArgs,
  context: HandlerContext,
  sshPool: SSHConnectionPool
): Promise<ToolResponse> {
  const { config } = context;

  if (!config.ssh.enabled) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      "SSH support is disabled in configuration"
    );
  }

  await sshPool.closeConnection(args.connectionId);
  
  return {
    content: [{
      type: "text",
      text: `Disconnected from ${args.connectionId}`
    }]
  };
}