import winston from 'winston';
import { mkdirSync } from 'fs';
import config from './index.js';

mkdirSync(config.paths.logs, { recursive: true });

const logger = winston.createLogger({
  level: config.logging.level,

  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack }) => {
      const base = `${timestamp} [${level.toUpperCase()}] ${message}`;
      return stack ? `${base}\n${stack}` : base;
    })
  ),

  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(
          ({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`
        )
      ),
    }),
    new winston.transports.File({
      filename: `${config.paths.logs}/collection.log`,
      maxsize: 10 * 1024 * 1024,
      maxFiles: 3,
    }),
    new winston.transports.File({
      filename: `${config.paths.logs}/errors.log`,
      level: 'error',
    }),
  ],
});

export default logger;
