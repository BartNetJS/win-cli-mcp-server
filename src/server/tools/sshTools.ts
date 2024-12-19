import type { ServerConfig } from '../../types/config.js';

export function createSshTools(config: ServerConfig) {
  return [
    {
      name: "ssh_execute",
      description: `Execute a command on a remote host via SSH

Example usage:
\`\`\`json
{
  "connectionId": "raspberry-pi",
  "command": "uname -a"
}
\`\`\`

Configuration required in config.json:
\`\`\`json
{
  "ssh": {
    "enabled": true,
    "connections": {
      "raspberry-pi": {
        "host": "raspberrypi.local",
        "port": 22,
        "username": "pi",
        "password": "raspberry"
      }
    }
  }
}
\`\`\``,
      inputSchema: {
        type: "object",
        properties: {
          connectionId: {
            type: "string",
            description: "ID of the SSH connection to use",
            enum: Object.keys(config.ssh.connections)
          },
          command: {
            type: "string",
            description: "Command to execute"
          }
        },
        required: ["connectionId", "command"]
      }
    },
    {
      name: "ssh_disconnect",
      description: `Disconnect from an SSH server

Example usage:
\`\`\`json
{
  "connectionId": "raspberry-pi"
}
\`\`\`

Use this to cleanly close SSH connections when they're no longer needed.`,
      inputSchema: {
        type: "object",
        properties: {
          connectionId: {
            type: "string",
            description: "ID of the SSH connection to disconnect",
            enum: Object.keys(config.ssh.connections)
          }
        },
        required: ["connectionId"]
      }
    }
  ] as const;
}