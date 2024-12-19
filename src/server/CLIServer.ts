import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from "@modelcontextprotocol/sdk/types.js";
import { z } from 'zod';
import type { ServerConfig, CommandHistoryEntry } from '../types/config.js';
import type { HandlerContext } from '../types/server.js';
import { SSHConnectionPool } from '../utils/ssh.js';
import { logger } from '../utils/logger.js';
import { createTools } from './tools/index.js';
import {
  executeCommand,
  getHistory,
  sshExecute,
  sshDisconnect
} from './handlers/index.js';

export class CLIServer {
  private server: Server;
  private allowedPaths: Set<string>;
  private blockedCommands: Set<string>;
  private commandHistory: CommandHistoryEntry[];
  private config: ServerConfig;
  private sshPool: SSHConnectionPool;

  constructor(config: ServerConfig) {
    logger.debug('Initializing CLI Server');
    this.config = config;
    this.server = new Server({
      name: "windows-cli-server",
      version: process.env.npm_package_version || "unknown",
    }, {
      capabilities: {
        tools: {}
      }
    });

    // Initialize from config
    this.allowedPaths = new Set(config.security.allowedPaths);
    this.blockedCommands = new Set(config.security.blockedCommands);
    this.commandHistory = [];
    this.sshPool = new SSHConnectionPool();

    this.setupHandlers();
    logger.debug('CLI Server initialized successfully');
  }

  private getHandlerContext(): HandlerContext {
    return {
      config: this.config,
      logger,
      commandHistory: this.commandHistory
    };
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: createTools(this.config)
    }));

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
      try {
        const context = this.getHandlerContext();

        switch (request.params.name) {
          case "execute_command": {
            const args = z.object({
              shell: z.enum(Object.keys(this.config.shells).filter(shell => 
                this.config.shells[shell as keyof typeof this.config.shells].enabled
              ) as [string, ...string[]]),
              command: z.string(),
              workingDir: z.string().optional()
            }).parse(request.params.arguments);

            const response = await executeCommand(args, context);
            return {
              _meta: {},
              ...response
            };
          }

          case "get_command_history": {
            const args = z.object({
              limit: z.number()
                .min(1)
                .max(this.config.security.maxHistorySize)
                .optional()
            }).parse(request.params.arguments);

            const response = await getHistory(args, context);
            return {
              _meta: {},
              ...response
            };
          }

          case "ssh_execute": {
            const args = z.object({
              connectionId: z.string(),
              command: z.string()
            }).parse(request.params.arguments);

            const response = await sshExecute(args, context, this.sshPool);
            return {
              _meta: {},
              ...response
            };
          }

          case "ssh_disconnect": {
            const args = z.object({
              connectionId: z.string()
            }).parse(request.params.arguments);

            const response = await sshDisconnect(args, context, this.sshPool);
            return {
              _meta: {},
              ...response
            };
          }

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        logger.error('Error in request handler:', error);
        throw err;
      }
    });
  }

  private async cleanup(): Promise<void> {
    logger.info('Cleaning up server resources');
    await this.sshPool.closeAll();
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    
    // Set up cleanup handler
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT signal, cleaning up...');
      await this.cleanup();
      process.exit(0);
    });
    
    // Global error handlers
    process.on('uncaughtException', (error) => {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Uncaught exception:', err);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      logger.error('Unhandled rejection:', error);
      process.exit(1);
    });
    
    await this.server.connect(transport);
    logger.info('Windows CLI MCP Server running on stdio');
  }
}