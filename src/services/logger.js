const winston = require('winston');
const path = require('path');

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// Custom format for readable logs
const logFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const metaString = Object.keys(meta).length ? JSON.stringify(meta) : '';
  return `${timestamp} [${level}]: ${stack || message} ${metaString}`;
});

// Configure transports
const transports = [
  // Combined Logs
  new winston.transports.File({
    filename: path.join(__dirname, '../../logs/app.log'),
    level: 'info',
  }),
  // Error Logs
  new winston.transports.File({
    filename: path.join(__dirname, '../../logs/error.log'),
    level: 'error',
  }),
];

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    json() // Log in JSON for easier parsing if needed
  ),
  transports: transports,
  // Catch uncaught exceptions and unhandled rejections
  exceptionHandlers: [
    new winston.transports.File({ filename: path.join(__dirname, '../../logs/exceptions.log') })
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: path.join(__dirname, '../../logs/rejections.log') })
  ],
});

// Always add console with color in dev, and plain in prod
if (process.env.APP_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: combine(
      colorize(),
      logFormat
    ),
  }));
} else {
  logger.add(new winston.transports.Console({
    format: logFormat
  }));
}

// Create a stream object for Morgan integration
logger.stream = {
  write: (message) => logger.info(message.trim()),
};

module.exports = logger;
