import type { ServerConfig } from '../../types/config.js';

export function createHistoryTool(config: ServerConfig) {
  return {
    name: "get_command_history",
    description: `Get the history of executed commands

Example usage:
\`\`\`json
{
  "limit": 5
}
\`\`\`

Example response:
\`\`\`json
[
  {
    "command": "Get-Process",
    "output": "...",
    "timestamp": "2024-03-20T10:30:00Z",
    "exitCode": 0
  }
]
\`\`\``,
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: `Maximum number of history entries to return (default: 10, max: ${config.security.maxHistorySize})`
        }
      }
    }
  } as const;
}