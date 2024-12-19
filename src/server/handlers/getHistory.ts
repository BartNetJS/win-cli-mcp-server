import type { HandlerContext, ToolResponse } from '../../types/server.js';
import type { CommandHistoryEntry } from '../../types/config.js';

export interface GetHistoryArgs {
  limit?: number;
}

export async function getHistory(
  args: GetHistoryArgs,
  context: HandlerContext
): Promise<ToolResponse> {
  const { config, commandHistory } = context;
  
  if (!config.security.logCommands) {
    return {
      content: [{
        type: "text",
        text: "Command history is disabled in configuration"
      }]
    };
  }

  const limit = Math.min(
    args.limit ?? 10,
    config.security.maxHistorySize
  );

  const history = commandHistory
    .slice(-limit)
    .map((entry: CommandHistoryEntry) => ({
      ...entry,
      output: entry.output.slice(0, 1000) // Limit output size
    }));

  return {
    content: [{
      type: "text",
      text: JSON.stringify(history, null, 2)
    }]
  };
}