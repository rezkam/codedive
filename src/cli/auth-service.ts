/**
 * Authentication service for CLI commands.
 */

import type { AuthStorage } from "@mariozechner/pi-coding-agent";
import { CLILogger } from "./logger.js";
import { ValidationError, AuthenticationError } from "./errors.js";
import { ENV_VAR_MAP, AUTH_PATH, APP_CMD } from "../constants.js";

interface OAuthProvider {
	name: string;
	subscription: string;
}

const OAUTH_PROVIDERS: Record<string, OAuthProvider> = {
	anthropic: {
		name: "Anthropic Claude",
		subscription: "Claude Pro/Max or Claude Team",
	},
	"github-copilot": {
		name: "GitHub Copilot",
		subscription: "GitHub Copilot Individual, Business, or Enterprise",
	},
	google: {
		name: "Google Gemini CLI",
		subscription: "Google Gemini CLI access (via gcloud)",
	},
	antigravity: {
		name: "Google Cloud Antigravity",
		subscription: "Google Cloud Project with Antigravity API enabled",
	},
	"openai-codex": {
		name: "OpenAI Codex",
		subscription: "ChatGPT Plus/Pro or ChatGPT Team (OAuth flow)",
	},
};

const API_KEY_PROVIDERS = Object.keys(ENV_VAR_MAP);

export class AuthService {
	constructor(
		private readonly storage: AuthStorage,
		private readonly logger: CLILogger,
	) {}

	async setApiKey(provider: string, key: string): Promise<void> {
		if (!API_KEY_PROVIDERS.includes(provider)) {
			this.logger.error(`Unknown provider: ${provider}`);
			this.logger.newline();
			this.logger.section("Supported providers:");
			this.showApiKeyProviders();
			this.logger.newline();
			this.logger.hint(`Run '${APP_CMD} auth --help' for more info`);
			this.logger.newline();
			throw new ValidationError(`Unknown provider: ${provider}`);
		}

		this.storage.set(provider, { type: "api_key", key });

		this.logger.success(`API key stored for ${provider}`);
		this.logger.hint(`Saved to: ${AUTH_PATH}`);
		this.logger.newline();
	}

	async oauthLogin(
		provider: string,
		callbacks: {
			onAuth: (info: { url: string; instructions?: string }) => void;
			onPrompt: (prompt: { message: string; isPassword?: boolean }) => Promise<string>;
		},
	): Promise<void> {
		if (!OAUTH_PROVIDERS[provider]) {
			this.logger.error(`Provider '${provider}' does not support OAuth login`);
			this.logger.newline();
			this.logger.section("Supported OAuth providers:");
			this.showOAuthProviders();
			this.logger.newline();
			this.logger.hint(`For API key providers, use: ${APP_CMD} auth set <provider> <key>`);
			this.logger.newline();
			throw new ValidationError(`OAuth not supported for: ${provider}`);
		}

		try {
			await this.storage.login(provider, callbacks);
			this.logger.success(`Successfully authenticated with ${provider}`);
			this.logger.newline();
		} catch (error) {
			this.logger.error(`Login failed: ${error}`);
			this.logger.newline();
			throw new AuthenticationError(`OAuth login failed for ${provider}`, String(error));
		}
	}

	async removeCredentials(provider: string): Promise<void> {
		this.storage.remove(provider);
		this.logger.success(`Credentials removed for ${provider}`);
		this.logger.newline();
	}

	listCredentials(): void {
		const stored = API_KEY_PROVIDERS.filter((p) => this.storage.get(p) !== null);

		if (stored.length === 0) {
			this.logger.info("No credentials stored.");
			this.logger.hint(`Use '${APP_CMD} auth set <provider> <key>' or '${APP_CMD} auth login <provider>'`);
			this.logger.newline();
			return;
		}

		this.logger.section("Stored credentials:");
		this.logger.newline();
		for (const provider of stored) {
			const cred = this.storage.get(provider);
			const type = cred?.type === "oauth" ? "OAuth Token" : "API Key";
			this.logger.info(`  ✓ ${provider} (${type})`);
		}
		this.logger.newline();
	}

	private showApiKeyProviders(): void {
		const providers = [
			["anthropic", "Anthropic Claude API"],
			["openai", "OpenAI API"],
			["google", "Google AI Studio (Gemini)"],
			["groq", "Groq API"],
			["xai", "xAI (Grok)"],
			["openrouter", "OpenRouter"],
			["mistral", "Mistral AI"],
			["cerebras", "Cerebras Cloud"],
			["github-copilot", "GitHub Copilot"],
		];

		for (const [id, desc] of providers) {
			this.logger.keyValue(id, desc);
		}
	}

	private showOAuthProviders(): void {
		for (const [id, info] of Object.entries(OAUTH_PROVIDERS)) {
			this.logger.info(`  ${id.padEnd(18)} → ${info.name}`);
			this.logger.info(`  ${" ".repeat(18)}   ${info.subscription}`);
			this.logger.newline();
		}
	}
}
