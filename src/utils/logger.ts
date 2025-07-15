import winston from 'winston';

// Define custom colors for different log levels
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'cyan',
  http: 'magenta',
  debug: 'white',
  success: 'green',
  request: 'blue'
};

// Add colors to winston
winston.addColors(colors);

// Custom log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
  success: 5,
  request: 6
};

// Create the logger
const logger = winston.createLogger({
  levels,
  level: process.env.LOG_LEVEL || 'request',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.colorize({ all: true }),
    winston.format.printf((info: any) => {
      const { timestamp, level, message, stack } = info;
      if (stack) {
        return `[${timestamp}] ${level}: ${message}\n${stack}`;
      }
      return `[${timestamp}] ${level}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console({
      handleExceptions: true,
      handleRejections: true,
    })
  ],
  exitOnError: false,
});

// Extend logger with custom methods
interface CustomLogger extends winston.Logger {
  success: winston.LeveledLogMethod;
  request: winston.LeveledLogMethod;
}

const customLogger = logger as CustomLogger;

export { customLogger as logger };
export default customLogger; 