import { MonitoringService } from "@/lib/monitoring";

export enum LogLevel {
  DEBUG = "debug",
  INFO = "info", 
  WARN = "warn",
  ERROR = "error",
  CRITICAL = "critical"
}

export interface LogContext {
  userId?: string;
  workspaceId?: string;
  component?: string;
  action?: string;
  requestId?: string;
  [key: string]: any;
}

class Logger {
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : "";
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`;
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error) {
    const formattedMessage = this.formatMessage(level, message, context);
    
    // Always log to console
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(formattedMessage);
        break;
    }

    // Send to monitoring service for errors and critical issues
    if (level === LogLevel.ERROR || level === LogLevel.CRITICAL) {
      MonitoringService.trackEvent("error_occurred", {
        level,
        message,
        context,
        error: error?.message,
        stack: error?.stack,
      });
      
      if (error) {
        MonitoringService.logError(error.message, context);
      }
    }

    // In production, you might want to send logs to external services
    if (process.env.NODE_ENV === "production" && level !== LogLevel.DEBUG) {
      // TODO: Add external logging service (e.g., Logtail, Papertrail, etc.)
    }
  }

  debug(message: string, context?: LogContext) {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: LogContext) {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, context?: LogContext, error?: Error) {
    this.log(LogLevel.ERROR, message, context, error);
  }

  critical(message: string, context?: LogContext, error?: Error) {
    this.log(LogLevel.CRITICAL, message, context, error);
  }

  // Specialized logging methods for common scenarios
  authError(message: string, context?: LogContext, error?: Error) {
    this.error(`AUTH ERROR: ${message}`, { ...context, category: "auth" }, error);
  }

  databaseError(message: string, context?: LogContext, error?: Error) {
    this.error(`DATABASE ERROR: ${message}`, { ...context, category: "database" }, error);
  }

  authFlow(message: string, context?: LogContext) {
    this.info(`AUTH FLOW: ${message}`, { ...context, category: "auth_flow" });
  }

  workspaceError(message: string, context?: LogContext, error?: Error) {
    this.error(`WORKSPACE ERROR: ${message}`, { ...context, category: "workspace" }, error);
  }

  subscriptionError(message: string, context?: LogContext, error?: Error) {
    this.error(`SUBSCRIPTION ERROR: ${message}`, { ...context, category: "subscription" }, error);
  }
}

export const logger = new Logger();
