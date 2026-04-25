

type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: unknown;
  timestamp: string;
}

function log(entry: LogEntry) {
  const prefix = `[${entry.level.toUpperCase()}] ${entry.timestamp}`;
  const args = [prefix, entry.message];
  if (entry.context) args.push(JSON.stringify(entry.context));

  switch (entry.level) {
    case 'info':
      console.log(...args);
      break;
    case 'warn':
      console.warn(...args);
      break;
    case 'error':
      console.error(...args, entry.error ?? '');
      break;
  }

}

export const logger = {
  info(message: string, context?: Record<string, unknown>) {
    log({ level: 'info', message, context, timestamp: new Date().toISOString() });
  },

  warn(message: string, context?: Record<string, unknown>) {
    log({ level: 'warn', message, context, timestamp: new Date().toISOString() });
  },

  error(message: string, error?: unknown, context?: Record<string, unknown>) {
    log({ level: 'error', message, error, context, timestamp: new Date().toISOString() });
  },
};
