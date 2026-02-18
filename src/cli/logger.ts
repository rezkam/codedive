/* eslint-disable no-console */
// This module is the intentional console abstraction layer — console calls here are correct.
/**
 * Production-grade CLI logger with structured output.
 */

import chalk from "chalk";
import * as util from "node:util";

export enum LogLevel {
	DEBUG = 0,
	INFO = 1,
	WARN = 2,
	ERROR = 3,
	SILENT = 4,
}

export interface LoggerOptions {
	level?: LogLevel;
	colorEnabled?: boolean;
	prefix?: string;
}

export class CLILogger {
	private level: LogLevel;
	private colorEnabled: boolean;
	private prefix: string;

	constructor(options: LoggerOptions = {}) {
		this.level = options.level ?? LogLevel.INFO;
		this.colorEnabled = options.colorEnabled ?? chalk.level > 0;
		this.prefix = options.prefix ?? "";
	}

	setLevel(level: LogLevel): void {
		this.level = level;
	}

	debug(message: string, ...args: unknown[]): void {
		if (this.level <= LogLevel.DEBUG) {
			this.write("debug", chalk.dim(`[DEBUG] ${message}`), ...args);
		}
	}

	info(message: string, ...args: unknown[]): void {
		if (this.level <= LogLevel.INFO) {
			this.write("info", message, ...args);
		}
	}

	success(message: string, ...args: unknown[]): void {
		if (this.level <= LogLevel.INFO) {
			this.write("info", chalk.green(`✓ ${message}`), ...args);
		}
	}

	warn(message: string, ...args: unknown[]): void {
		if (this.level <= LogLevel.WARN) {
			this.write("warn", chalk.yellow(`⚠ ${message}`), ...args);
		}
	}

	error(message: string, ...args: unknown[]): void {
		if (this.level <= LogLevel.ERROR) {
			this.write("error", chalk.red(`✗ ${message}`), ...args);
		}
	}

	section(title: string): void {
		if (this.level <= LogLevel.INFO) {
			this.write("info", chalk.bold(`\n${title}\n`));
		}
	}

	keyValue(key: string, value: string): void {
		if (this.level <= LogLevel.INFO) {
			this.write("info", `  ${chalk.dim(key.padEnd(12))} ${chalk.cyan(value)}`);
		}
	}

	command(text: string): void {
		if (this.level <= LogLevel.INFO) {
			this.write("info", `  ${chalk.cyan(text)}`);
		}
	}

	hint(text: string): void {
		if (this.level <= LogLevel.INFO) {
			this.write("info", chalk.dim(text));
		}
	}

	newline(): void {
		if (this.level <= LogLevel.INFO) {
			console.log();
		}
	}

	private write(type: "info" | "warn" | "error" | "debug", message: string, ...args: unknown[]): void {
		const output = args.length > 0 ? util.format(message, ...args) : message;
		const prefixed = this.prefix ? `${this.prefix} ${output}` : output;

		switch (type) {
			case "error":
			case "warn":
				console.error(prefixed);
				break;
			default:
				console.log(prefixed);
		}
	}
}

// Singleton instance for global use
export const logger = new CLILogger();
