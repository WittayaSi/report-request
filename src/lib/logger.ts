type LogLevel = "info" | "warn" | "error" | "debug";

/**
 * Structured logger for production environments.
 * Outputs JSON format in production for log aggregators (ELK, Datadog, CloudWatch).
 * Outputs human-readable format in development.
 */
export const logger = {
  log: (level: LogLevel, message: string, meta?: Record<string, any>) => {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, level, message, ...meta };
    
    if (process.env.NODE_ENV === "production") {
      // In production: structured JSON
      console[level === "debug" ? "log" : level](JSON.stringify(logEntry));
    } else {
      // In development: readable
      console[level === "debug" ? "log" : level](`[${timestamp}] [${level.toUpperCase()}] ${message}`, meta ? meta : "");
    }
  },
  info: (message: string, meta?: Record<string, any>) => logger.log("info", message, meta),
  warn: (message: string, meta?: Record<string, any>) => logger.log("warn", message, meta),
  error: (message: string, meta?: Record<string, any>) => logger.log("error", message, meta),
  debug: (message: string, meta?: Record<string, any>) => logger.log("debug", message, meta),
};
