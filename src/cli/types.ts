/**
 * Shared types for CLI module.
 */

export interface StartOptions {
	prompt?: string;
	depth: "shallow" | "medium" | "deep";
	paths: string[];
	model: string;
	cwd: string;
}

export interface AuthCallbacks {
	onAuth: (info: { url: string; instructions?: string }) => void;
	onPrompt: (prompt: { message: string; isPassword?: boolean }) => Promise<string>;
}
