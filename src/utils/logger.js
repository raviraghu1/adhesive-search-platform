import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  verbose: 'cyan',
  debug: 'white',
  silly: 'gray',
};

winston.addColors(colors);

// Create format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Create format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Define transports
const transports = [];

// Console transport
if (config.logging.console) {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: config.logging.level,
    })
  );
}

// File transports
if (config.logging.file) {
  const logDir = path.join(__dirname, '../../logs');
  
  // Error log file
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
  
  // Combined log file
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
  
  // HTTP request log file
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'http.log'),
      level: 'http',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// Create the logger
const logger = winston.createLogger({
  level: config.logging.level,
  levels,
  format: fileFormat,
  transports,
  exitOnError: false,
});

// Create a stream for Morgan HTTP logging
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

// Add utility methods
logger.logRequest = (req, res, responseTime) => {
  const message = `${req.method} ${req.originalUrl} ${res.statusCode} ${responseTime}ms - ${req.ip}`;
  
  if (res.statusCode >= 500) {
    logger.error(message);
  } else if (res.statusCode >= 400) {
    logger.warn(message);
  } else {
    logger.http(message);
  }
};

logger.logError = (error, req = null) => {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  };
  
  if (req) {
    errorInfo.request = {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      user: req.user?.id,
    };
  }
  
  logger.error(JSON.stringify(errorInfo));
};

logger.logDatabaseOperation = (operation, collection, duration, success = true) => {
  const message = `DB ${operation} on ${collection} - ${duration}ms - ${success ? 'SUCCESS' : 'FAILED'}`;
  
  if (success) {
    logger.debug(message);
  } else {
    logger.error(message);
  }
};

logger.logSearchQuery = (query, results, duration) => {
  logger.info({
    type: 'search',
    query,
    resultsCount: results,
    duration,
    timestamp: new Date().toISOString(),
  });
};

logger.logAIOperation = (operation, model, tokens, duration) => {
  logger.info({
    type: 'ai_operation',
    operation,
    model,
    tokens,
    duration,
    timestamp: new Date().toISOString(),
  });
};

// Handle uncaught exceptions
if (config.server.isProduction) {
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });
}

export default logger;