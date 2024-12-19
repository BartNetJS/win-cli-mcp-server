#!/usr/bin/env node
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import { loadConfig, createDefaultConfig } from './utils/config.js';
import { logger } from './utils/logger.js';
import { CLIServer } from './server/CLIServer.js';

// Rest of the code stays the same...
const parseArgs = async () => {
  return yargs(hideBin(process.argv))
    .option('config', {
      alias: 'c',
      type: 'string',
      description: 'Path to config file'
    })
    .option('init-config', {
      type: 'string',
      description: 'Create a default config file at the specified path'
    })
    .help()
    .parse();
};

async function main() {
  logger.info('Starting Windows CLI MCP Server...', true);
  
  try {
    const args = await parseArgs();
    logger.debug('Parsed command line arguments', args);
    
    // Handle --init-config flag
    if (args['init-config']) {
      try {
        createDefaultConfig(args['init-config'] as string);
        logger.info(`Created default config at: ${args['init-config']}`, true);
        process.exit(0);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('Failed to create config file:', err, true);
        process.exit(1);
      }
    }

    // Load configuration
    logger.info('Loading configuration...', true);
    const config = loadConfig(args.config);
    
    logger.info('Initializing server...', true);
    const server = new CLIServer(config);
    await server.run();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Fatal error occurred:', err, true);
    process.exit(1);
  }
}

// Start the application
logger.info('Initializing application...', true);
main().catch((error) => {
  const err = error instanceof Error ? error : new Error(String(error));
  logger.error('Error in main:', err, true);
  process.exit(1);
});