import { createLogger, format, transports } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

/**
 * IST timestamp formatter
 */
const istTimestamp = format((info) => {
    info.timestamp = new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
    });
    return info;
});

/**
 * Custom log format
 */
const logFormat = format.printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} [${level}]: ${stack || message}`;
});

/**
 * Console transport (dev-friendly)
 */
const consoleTransport = new transports.Console({
    format: format.combine(
        format.colorize({ all: true }),
        istTimestamp(),
        logFormat
    ),
});

/**
 * Daily rotating file transport (all logs)
 */
const dailyRotateTransport = new DailyRotateFile({
    dirname: "logs",
    filename: "%DATE%.log",
    datePattern: "YYYY-MM-DD",
    level: "info",
    maxFiles: "14d",
    format: format.combine(
        istTimestamp(),
        logFormat
    ),
});

/**
 * Error-only file transport
 */
const errorFileTransport = new transports.File({
    filename: "logs/error.log",
    level: "error",
    format: format.combine(
        istTimestamp(),
        logFormat
    ),
});

/**
 * Central application logger
 */
const logger = createLogger({
    level: "info",
    format: format.combine(
        format.errors({ stack: true })
    ),
    transports: [
        consoleTransport,
        dailyRotateTransport,
        errorFileTransport,
    ],
});

export default logger;
