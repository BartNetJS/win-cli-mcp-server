import type { ServerConfig } from './config.js';
import type { McpError } from '@modelcontextprotocol/sdk/types.js';

export interface ToolResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
  isError?: boolean;
  metadata?: Record<string, any>;
}

export interface ExecuteCommandArgs {
  shell: string;
  command: string;
  workingDir?: string;
}

export interface CommandResult {
  output: string;
  error: string;
  exitCode: number | null;
}

export interface ShellHandler {
  execute(command: string, args: string[], workingDir: string): Promise<CommandResult>;
}

export type HandlerContext = {
  config: ServerConfig;
  logger: {
    debug: (message: string, ...args: any[]) => void;
    info: (message: string, ...args: any[]) => void;
    warn: (message: string, ...args: any[]) => void;
    error: (message: string, error?: Error | McpError, showStack?: boolean) => void;
  };
  commandHistory: Array<{
    command: string;
    output: string;
    timestamp: string;
    exitCode: number;
    connectionId?: string;
  }>;
};