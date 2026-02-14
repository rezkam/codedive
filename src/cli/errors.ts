/**
 * CLI error handling with proper exit codes.
 */

export enum ExitCode {
	SUCCESS = 0,
	GENERAL_ERROR = 1,
	INVALID_USAGE = 2,
	NO_AUTH = 3,
	NOT_FOUND = 4,
	PERMISSION_DENIED = 5,
	NETWORK_ERROR = 6,
}

export class CLIError extends Error {
	constructor(
		message: string,
		public readonly exitCode: ExitCode = ExitCode.GENERAL_ERROR,
		public readonly details?: string,
	) {
		super(message);
		this.name = "CLIError";
		Error.captureStackTrace(this, this.constructor);
	}
}

export class AuthenticationError extends CLIError {
	constructor(message: string, details?: string) {
		super(message, ExitCode.NO_AUTH, details);
		this.name = "AuthenticationError";
	}
}

export class ValidationError extends CLIError {
	constructor(message: string, details?: string) {
		super(message, ExitCode.INVALID_USAGE, details);
		this.name = "ValidationError";
	}
}

export class NotFoundError extends CLIError {
	constructor(message: string, details?: string) {
		super(message, ExitCode.NOT_FOUND, details);
		this.name = "NotFoundError";
	}
}

export function handleError(error: unknown): never {
	if (error instanceof CLIError) {
		if (error.details) {
			console.error(error.details);
		}
		process.exit(error.exitCode);
	}

	if (error instanceof Error) {
		console.error(`Error: ${error.message}`);
		if (process.env.DEBUG) {
			console.error(error.stack);
		}
		process.exit(ExitCode.GENERAL_ERROR);
	}

	console.error(`Unknown error: ${String(error)}`);
	process.exit(ExitCode.GENERAL_ERROR);
}
