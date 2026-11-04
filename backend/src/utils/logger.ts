type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'success';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

const formatPrefix = (level: LogLevel, context?: string): string => {
  const timestamp = new Date().toISOString();
  const timeStr = `${colors.gray}[${timestamp}]${colors.reset}`;
  const ctxStr = context ? `${colors.magenta}[${context}]${colors.reset} ` : '';

  switch (level) {
    case 'info':
      return `${timeStr} ${colors.blue}ℹ INFO${colors.reset}  ${ctxStr}`;
    case 'success':
      return `${timeStr} ${colors.green}✔ SUCCESS${colors.reset} ${ctxStr}`;
    case 'warn':
      return `${timeStr} ${colors.yellow}⚠ WARN${colors.reset}  ${ctxStr}`;
    case 'error':
      return `${timeStr} ${colors.red}✖ ERROR${colors.reset} ${ctxStr}`;
    case 'debug':
      return `${timeStr} ${colors.cyan}⚙ DEBUG${colors.reset} ${ctxStr}`;
  }
};

export class Logger {
  private context?: string;

  constructor(context?: string) {
    this.context = context;
  }

  info(message: string, ...args: any[]): void {
    console.log(formatPrefix('info', this.context) + message, ...args);
  }

  success(message: string, ...args: any[]): void {
    console.log(formatPrefix('success', this.context) + message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.warn(formatPrefix('warn', this.context) + message, ...args);
  }

  error(message: string, error?: any, ...args: any[]): void {
    console.error(formatPrefix('error', this.context) + message, ...args);
    if (error && error.stack) {
      console.error(colors.red + error.stack + colors.reset);
    } else if (error) {
      console.error(error);
    }
  }

  debug(message: string, ...args: any[]): void {
    if (process.env.NODE_ENV !== 'production' || process.env.DEBUG === 'true') {
      console.log(formatPrefix('debug', this.context) + message, ...args);
    }
  }
}

export const logger = new Logger('App');

