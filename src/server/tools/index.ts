import { createCommandTool } from './commandTool.js';
import { createHistoryTool } from './historyTool.js';
import { createSshTools } from './sshTools.js';
import type { ServerConfig } from '../../types/config.js';

export function createTools(config: ServerConfig) {
  const tools = [
    createCommandTool(config),
    createHistoryTool(config),
    ...createSshTools(config)
  ];

  return tools;
}