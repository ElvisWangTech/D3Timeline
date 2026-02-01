type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

class Logger {
  private static readonly LEVEL_PRIORITY: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    fatal: 4,
  };

  private static readonly COLORS: Record<LogLevel | "logName", string> = {
    debug: "#6b7280",
    info: "#3b82f6",
    warn: "#f59e0b",
    error: "#ef4444",
    fatal: "#dc2626",
    logName: "#06b6d4",
  };

  private currentLevel: LogLevel;
  private readonly logName: string;

  constructor(logName: string = "APP", level: LogLevel = "debug") {
    this.logName = logName;
    this.currentLevel = level;
  }

  setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return (
      Logger.LEVEL_PRIORITY[level] >= Logger.LEVEL_PRIORITY[this.currentLevel]
    );
  }

  private formatTime(): string {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
  }

  private _log(level: LogLevel, content: string, module?: string): void {
    if (!this.shouldLog(level)) return;

    const styles = {
      logName: `color: ${Logger.COLORS.logName}; font-weight: bold;`,
      module: "color: #4b5563; font-weight: 600;",
      level: `color: ${Logger.COLORS[level]}; font-weight: bold; text-transform: uppercase;`,
      content: "color: #eeeeee;",
      time: "color: #9ca3af; font-size: 11px;",
      sep: "color: #d1d5db;",
    };

    const parts = [`%c[${this.logName}]`, "%c | "];
    const styleArgs = [styles.logName, styles.sep];

    if (module) {
      parts.push(`%c[${module}]`, "%c | ");
      styleArgs.push(styles.module, styles.sep);
    }

    parts.push(
      `%c${level}`,
      "%c | ",
      "%c" + content,
      "%c | ",
      `%c${this.formatTime()}`,
    );
    styleArgs.push(
      styles.level,
      styles.sep,
      styles.content,
      styles.sep,
      styles.time,
    );

    console.log(parts.join(""), ...styleArgs);
  }

  debug(content: string, module?: string): void {
    this._log("debug", content, module);
  }

  info(content: string, module?: string): void {
    this._log("info", content, module);
  }

  warn(content: string, module?: string): void {
    this._log("warn", content, module);
  }

  error(content: string, module?: string): void {
    this._log("error", content, module);
  }

  fatal(content: string, module?: string): void {
    this._log("fatal", content, module);
  }

  log(level: LogLevel, content: string, module?: string): void {
    this._log(level, content, module);
  }
}

export default Logger;
