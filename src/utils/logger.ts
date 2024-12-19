import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const LOG_DIR = path.join(os.homedir(), '.mcp', 'logs');
const STARTUP_LOG_FILE = path.join(LOG_DIR, 'win-cli-mcp-server-startup.log');
const OPERATIONAL_LOG_FILE = path.join(LOG_DIR, 'win-cli-mcp-server.log');

// Log levels
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

// Get log level from environment
function getLogLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL?.toUpperCase();
  const level = envLevel && envLevel in LogLevel ? 
    LogLevel[envLevel as keyof typeof LogLevel] : 
    LogLevel.INFO;

  // Write initial log message about log level
  const message = envLevel ? 
    `Initializing logger with level ${envLevel} from environment` :
    'Initializing logger with default level INFO';
  
  const timestamp = new Date().toISOString();
  fs.appendFileSync(STARTUP_LOG_FILE, `[${timestamp}] [INFO] ${message}\n`);
  console.log(message);

  return level;
}

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// On startup, rename existing log files
function renameExistingLogs(): void {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  // Rename startup log if it exists
  if (fs.existsSync(STARTUP_LOG_FILE)) {
    fs.renameSync(
      STARTUP_LOG_FILE,
      path.join(LOG_DIR, `win-cli-mcp-server-startup-${timestamp}.log`)
    );
  }

  // Rename operational log if it exists
  if (fs.existsSync(OPERATIONAL_LOG_FILE)) {
    fs.renameSync(
      OPERATIONAL_LOG_FILE,
      path.join(LOG_DIR, `win-cli-mcp-server-${timestamp}.log`)
    );
  }
}

// Rename existing logs on startup
renameExistingLogs();

// Initialize log level after renaming logs
const currentLogLevel = getLogLevel();

function getTimestamp(): string {
  return new Date().toISOString();
}

function shouldLog(level: LogLevel): boolean {
  return level >= currentLogLevel;
}

function formatMessage(message: string | Object, data?: Object): string {
  if (typeof message === 'string' && data) {
    return `${message} ${JSON.stringify(data, null, 2)}`;
  } else if (typeof message === 'object') {
    return JSON.stringify(message, null, 2);
  }
  return String(message);
}

function writeToLog(message: string | Object, data: Object | undefined, level: LogLevel = LogLevel.INFO, isStartup: boolean = false): void {
  if (!shouldLog(level)) return;

  const levelName = LogLevel[level];
  const formattedMessage = formatMessage(message, data);
  const logMessage = `[${getTimestamp()}] [${levelName}] ${formattedMessage}\n`;
  const logFile = isStartup ? STARTUP_LOG_FILE : OPERATIONAL_LOG_FILE;
  
  try {
    fs.appendFileSync(logFile, logMessage);
  } catch (error) {
    console.error(`Failed to write to log file ${logFile}:`, error);
  }
}

export const logger = {
  debug: (message: string | Object, data?: Object | boolean, isStartup?: boolean) => {
    if (shouldLog(LogLevel.DEBUG)) {
      const actualIsStartup = typeof data === 'boolean' ? data : isStartup;
      const actualData = typeof data === 'object' ? data : undefined;
      
      console.debug(`[${getTimestamp()}] [DEBUG] ${formatMessage(message, actualData)}`);
      writeToLog(message, actualData, LogLevel.DEBUG, actualIsStartup);
    }
  },

  info: (message: string | Object, data?: Object | boolean, isStartup?: boolean) => {
    if (shouldLog(LogLevel.INFO)) {
      const actualIsStartup = typeof data === 'boolean' ? data : isStartup;
      const actualData = typeof data === 'object' ? data : undefined;
      
      console.info(`[${getTimestamp()}] [INFO] ${formatMessage(message, actualData)}`);
      writeToLog(message, actualData, LogLevel.INFO, actualIsStartup);
    }
  },
  
  warn: (message: string | Object, data?: Object | boolean, isStartup?: boolean) => {
    if (shouldLog(LogLevel.WARN)) {
      const actualIsStartup = typeof data === 'boolean' ? data : isStartup;
      const actualData = typeof data === 'object' ? data : undefined;
      
      console.warn(`[${getTimestamp()}] [WARN] ${formatMessage(message, actualData)}`);
      writeToLog(message, actualData, LogLevel.WARN, actualIsStartup);
    }
  },
  
  error: (message: string | Object, error?: Error | Object | boolean, isStartup?: boolean) => {
    if (shouldLog(LogLevel.ERROR)) {
      let errorMessage: string;
      let actualIsStartup = isStartup;
      let actualData: Object | undefined;

      if (error instanceof Error) {
        errorMessage = `${formatMessage(message)}: ${error.message}\n${error.stack}`;
      } else if (typeof error === 'boolean') {
        errorMessage = formatMessage(message);
        actualIsStartup = error;
      } else if (typeof error === 'object') {
        errorMessage = formatMessage(message, error);
        actualData = error;
      } else {
        errorMessage = formatMessage(message);
      }

      console.error(`[${getTimestamp()}] [ERROR] ${errorMessage}`);
      writeToLog(errorMessage, actualData, LogLevel.ERROR, actualIsStartup);
    }
  }
};