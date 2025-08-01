import { createLogger, format, transports, Logger } from 'winston';

const { combine, timestamp, json, colorize, printf } = format;

// 🎨 Console log format with color and custom message
const consoleLogFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} ${level}: ${message}`;
});

// 🛠 Create Winston logger
const logger: Logger = createLogger({
  level: 'info',
  format: combine(timestamp(), json()), // default format for file logging
  transports: [
    // 🖥 Console logging
    new transports.Console({
      format: combine(colorize(), timestamp(), consoleLogFormat),
    }),

    // 📁 File logging
    new transports.File({ filename: 'app.log' }),
  ],
});

export default logger;
