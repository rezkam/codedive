/**
 * Tests for extractChatMessages — the function that recovers
 * chat history from the agent session for WebSocket reconnects.
 */

import { describe, it, expect } from "vitest";
import { extractChatMessages } from "./engine.js";

/** Helper to create a user message */
function userMsg(text: string) {
	return { role: "user", content: [{ type: "text", text }], timestamp: Date.now() };
}

/** Helper to create an assistant message with text */
function assistantMsg(text: string) {
	return {
		role: "assistant",
		content: [{ type: "text", text }],
		usage: { input: 100, output: 50 },
		timestamp: Date.now(),
	};
}

/** Helper to create an assistant message with only tool calls (no text) */
function assistantToolCallMsg() {
	return {
		role: "assistant",
		content: [{ type: "toolCall", name: "read", id: "tc1", arguments: { path: "/foo" } }],
		usage: { input: 100, output: 50 },
		timestamp: Date.now(),
	};
}

/** Helper to create a toolResult message */
function toolResultMsg() {
	return {
		role: "toolResult",
		toolCallId: "tc1",
		toolName: "read",
		content: [{ type: "text", text: "file contents" }],
		timestamp: Date.now(),
	};
}

describe("extractChatMessages", () => {
	it("returns empty for no messages", () => {
		expect(extractChatMessages(undefined, [])).toEqual([]);
	});

	it("returns empty for null/undefined session", () => {
		// No messagesOverride and no S.session → returns []
		expect(extractChatMessages()).toEqual([]);
	});

	it("skips the first user message (exploration prompt)", () => {
		const msgs = [
			userMsg("Explore the codebase in depth..."),
			assistantToolCallMsg(),
			toolResultMsg(),
			assistantMsg("Here is the architecture document..."),
		];
		const result = extractChatMessages(undefined, msgs);
		// The first user message is skipped, and the assistant response to it
		// doesn't follow a user chat message, so it's also skipped
		expect(result).toEqual([]);
	});

	it("extracts user chat question and assistant answer", () => {
		const msgs = [
			userMsg("Explore the codebase..."), // initial prompt (skipped)
			assistantToolCallMsg(),
			toolResultMsg(),
			assistantMsg("Document written."), // doc generation response (no preceding user chat)
			userMsg("How does auth work?\n\n[Respond in well-structured markdown. Use headings (##), bullet lists, fenced code blocks with language tags (```ts), tables, bold/italic for emphasis. Keep responses clear and organized.]"),
			assistantMsg("## Authentication\n\nThe auth module uses JWT tokens..."),
		];
		const result = extractChatMessages(undefined, msgs);
		expect(result).toEqual([
			{ role: "user", text: "How does auth work?" },
			{ role: "assistant", text: "## Authentication\n\nThe auth module uses JWT tokens..." },
		]);
	});

	it("extracts multiple chat exchanges", () => {
		const msgs = [
			userMsg("Explore..."), // skipped
			assistantMsg("Doc done."),
			userMsg("Question 1\n\n[Respond in well-structured markdown. Use headings (##), bullet lists, fenced code blocks with language tags (```ts), tables, bold/italic for emphasis. Keep responses clear and organized.]"),
			assistantMsg("Answer 1"),
			userMsg("Question 2\n\n[Respond in well-structured markdown. Use headings (##), bullet lists, fenced code blocks with language tags (```ts), tables, bold/italic for emphasis. Keep responses clear and organized.]"),
			assistantMsg("Answer 2"),
			userMsg("Question 3\n\n[Respond in well-structured markdown. Use headings (##), bullet lists, fenced code blocks with language tags (```ts), tables, bold/italic for emphasis. Keep responses clear and organized.]"),
			assistantMsg("Answer 3"),
		];
		const result = extractChatMessages(undefined, msgs);
		expect(result).toHaveLength(6);
		expect(result[0]).toEqual({ role: "user", text: "Question 1" });
		expect(result[1]).toEqual({ role: "assistant", text: "Answer 1" });
		expect(result[4]).toEqual({ role: "user", text: "Question 3" });
		expect(result[5]).toEqual({ role: "assistant", text: "Answer 3" });
	});

	it("respects limit parameter", () => {
		const msgs = [
			userMsg("Explore..."), // skipped
			assistantMsg("Doc."),
			userMsg("Q1\n\n[Respond in well-structured markdown. Use headings (##), bullet lists, fenced code blocks with language tags (```ts), tables, bold/italic for emphasis. Keep responses clear and organized.]"),
			assistantMsg("A1"),
			userMsg("Q2\n\n[Respond in well-structured markdown. Use headings (##), bullet lists, fenced code blocks with language tags (```ts), tables, bold/italic for emphasis. Keep responses clear and organized.]"),
			assistantMsg("A2"),
			userMsg("Q3\n\n[Respond in well-structured markdown. Use headings (##), bullet lists, fenced code blocks with language tags (```ts), tables, bold/italic for emphasis. Keep responses clear and organized.]"),
			assistantMsg("A3"),
		];
		const result = extractChatMessages(4, msgs);
		expect(result).toHaveLength(4);
		// Should return the LAST 4 messages (Q2, A2, Q3, A3)
		expect(result[0]).toEqual({ role: "user", text: "Q2" });
		expect(result[1]).toEqual({ role: "assistant", text: "A2" });
		expect(result[2]).toEqual({ role: "user", text: "Q3" });
		expect(result[3]).toEqual({ role: "assistant", text: "A3" });
	});

	it("skips tool result messages", () => {
		const msgs = [
			userMsg("Explore..."),
			assistantToolCallMsg(),
			toolResultMsg(),
			assistantMsg("Done."),
			userMsg("What is X?\n\n[Respond in well-structured markdown. Use headings (##), bullet lists, fenced code blocks with language tags (```ts), tables, bold/italic for emphasis. Keep responses clear and organized.]"),
			assistantToolCallMsg(), // agent reads a file to answer
			toolResultMsg(),
			assistantMsg("X is a module that..."),
		];
		const result = extractChatMessages(undefined, msgs);
		// Should only have user question + final assistant answer
		expect(result).toEqual([
			{ role: "user", text: "What is X?" },
			{ role: "assistant", text: "X is a module that..." },
		]);
	});

	it("skips assistant messages that are only tool calls (no text)", () => {
		const msgs = [
			userMsg("Explore..."),
			assistantToolCallMsg(),
			toolResultMsg(),
			assistantMsg("Doc written."),
			userMsg("Tell me about Y\n\n[Respond in well-structured markdown. Use headings (##), bullet lists, fenced code blocks with language tags (```ts), tables, bold/italic for emphasis. Keep responses clear and organized.]"),
			assistantToolCallMsg(), // tool call only — no text
			toolResultMsg(),
			assistantMsg("Y handles data processing..."),
		];
		const result = extractChatMessages(undefined, msgs);
		expect(result).toEqual([
			{ role: "user", text: "Tell me about Y" },
			{ role: "assistant", text: "Y handles data processing..." },
		]);
	});

	it("strips markdown instruction suffix from user messages", () => {
		const suffix = "\n\n[Respond in well-structured markdown. Use headings (##), bullet lists, fenced code blocks with language tags (```ts), tables, bold/italic for emphasis. Keep responses clear and organized.]";
		const msgs = [
			userMsg("Explore..."),
			assistantMsg("Done."),
			userMsg("How does it work?" + suffix),
			assistantMsg("It works by..."),
		];
		const result = extractChatMessages(undefined, msgs);
		expect(result[0].text).toBe("How does it work?");
	});

	it("handles user message without markdown suffix", () => {
		const msgs = [
			userMsg("Explore..."),
			assistantMsg("Done."),
			userMsg("Plain question"),
			assistantMsg("Plain answer"),
		];
		const result = extractChatMessages(undefined, msgs);
		expect(result[0].text).toBe("Plain question");
	});

	it("handles assistant message with multiple text content blocks", () => {
		const msgs = [
			userMsg("Explore..."),
			assistantMsg("Done."),
			userMsg("Tell me more"),
			{
				role: "assistant",
				content: [
					{ type: "text", text: "First part." },
					{ type: "text", text: "Second part." },
				],
				usage: { input: 10, output: 20 },
				timestamp: Date.now(),
			},
		];
		const result = extractChatMessages(undefined, msgs);
		expect(result[1].text).toBe("First part.\nSecond part.");
	});

	it("handles mixed content (text + thinking) in assistant messages", () => {
		const msgs = [
			userMsg("Explore..."),
			assistantMsg("Done."),
			userMsg("Question"),
			{
				role: "assistant",
				content: [
					{ type: "thinking", thinking: "Let me think about this..." },
					{ type: "text", text: "The answer is 42." },
				],
				usage: { input: 10, output: 20 },
				timestamp: Date.now(),
			},
		];
		const result = extractChatMessages(undefined, msgs);
		// Should only include text content, not thinking
		expect(result[1].text).toBe("The answer is 42.");
	});

	it("limit of 0 returns empty array", () => {
		const msgs = [
			userMsg("Explore..."),
			assistantMsg("Done."),
			userMsg("Q"),
			assistantMsg("A"),
		];
		expect(extractChatMessages(0, msgs)).toEqual([]);
	});

	it("limit larger than message count returns all", () => {
		const msgs = [
			userMsg("Explore..."),
			assistantMsg("Done."),
			userMsg("Q"),
			assistantMsg("A"),
		];
		const result = extractChatMessages(100, msgs);
		expect(result).toHaveLength(2);
	});

	it("skips empty text messages", () => {
		const msgs = [
			userMsg("Explore..."),
			assistantMsg("Done."),
			userMsg(""),  // empty user message
			assistantMsg(""),  // empty assistant message
			userMsg("Real question"),
			assistantMsg("Real answer"),
		];
		const result = extractChatMessages(undefined, msgs);
		expect(result).toEqual([
			{ role: "user", text: "Real question" },
			{ role: "assistant", text: "Real answer" },
		]);
	});
});
