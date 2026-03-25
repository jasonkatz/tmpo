import winston from "winston";
import { config } from "../config";

const devFormat = winston.format.printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
  return `${timestamp} ${level}: ${message}${metaStr}`;
});

export const logger = winston.createLogger({
  level: config.NODE_ENV === "production" ? "info" : "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    config.NODE_ENV === "production"
      ? winston.format.json()
      : winston.format.combine(winston.format.colorize(), devFormat)
  ),
  transports: [new winston.transports.Console()],
});
