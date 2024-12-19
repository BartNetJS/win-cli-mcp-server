import type { ServerConfig } from '../../types/config.js';

export function createCommandTool(config: ServerConfig) {
  return {
    name: "execute_command",
    description: `Execute a command in the specified shell (powershell, cmd, or gitbash)

Example usage (PowerShell):
\`\`\`json
{
  "shell": "powershell",
  "command": "Get-Process | Select-Object -First 5",
  "workingDir": "C:\\Users\\username"
}
\`\`\`

Example usage (CMD):
\`\`\`json
{
  "shell": "cmd",
  "command": "dir /b",
  "workingDir": "C:\\Projects"
}
\`\`\`

Example usage (Git Bash):
\`\`\`json
{
  "shell": "gitbash",
  "command": "ls -la",
  "workingDir": "/c/Users/username"
}
\`\`\``,
    inputSchema: {
      type: "object",
      properties: {
        shell: {
          type: "string",
          enum: Object.keys(config.shells).filter(shell => 
            config.shells[shell as keyof typeof config.shells].enabled
          ),
          description: "Shell to use for command execution"
        },
        command: {
          type: "string",
          description: "Command to execute"
        },
        workingDir: {
          type: "string",
          description: "Working directory for command execution (optional)"
        }
      },
      required: ["shell", "command"]
    }
  } as const;
}