# Deep Dive

[![Test](https://github.com/rezkam/deep-dive/actions/workflows/test.yml/badge.svg)](https://github.com/rezkam/deep-dive/actions/workflows/test.yml)
[![Release](https://github.com/rezkam/deep-dive/actions/workflows/release.yml/badge.svg)](https://github.com/rezkam/deep-dive/actions/workflows/release.yml)
[![npm version](https://badge.fury.io/js/deep-dive.svg)](https://www.npmjs.com/package/deep-dive)
[![npm downloads](https://img.shields.io/npm/dm/deep-dive.svg)](https://www.npmjs.com/package/deep-dive)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

**Run `deep-dive` in any project and an AI agent reads your codebase, generates a rich HTML architecture doc with mermaid diagrams, then stays around as a chat partner you can ask questions about the code.**

You join a new project. There's no architecture doc. The README says "see the code." You spend half a day clicking through files trying to understand how anything connects to anything.

Deep Dive fixes that. It spawns an AI agent that reads your entire codebase, builds a mental model of the architecture, and writes it up as a rich HTML document with mermaid diagrams, module breakdowns, data flow explanations, and real code walkthroughs. You watch it happen live in your browser.

But the document is just the starting point. Once the agent has explored the codebase, it **stays around as a knowledgeable colleague**. The chat sidebar lets you ask follow-up questions, dig into specifics, or ask it to explain something differently. The agent already has context from reading the actual source, so the conversation is grounded in what's really in the code, not hallucinated guesses.

## Install

### Standalone CLI

```bash
npm install -g deep-dive
```

### Tab Completion (Optional)

Enable shell completion for commands, providers, and flags:

```bash
# Bash
deep-dive completion bash >> ~/.bashrc
source ~/.bashrc

# Zsh
deep-dive completion zsh > ~/.zsh/completions/_deep-dive
# Or for Oh My Zsh: deep-dive completion zsh > ~/.oh-my-zsh/completions/_deep-dive

# Fish
deep-dive completion fish > ~/.config/fish/completions/deep-dive.fish
```

After installing, you can tab-complete:
- Commands: `deep-dive auth <TAB>`
- Providers: `deep-dive auth set <TAB>`
- OAuth providers: `deep-dive auth login <TAB>`
- Flags: `deep-dive --<TAB>`

## Quick Start

```bash
deep-dive
```

That's it. A browser tab opens with a split-panel UI. The agent starts reading your codebase and generating the document on the left. The URL and session token are printed in your terminal. Paste the token in the browser to connect.

## What You Get

### Architecture Document (left panel)
- **Mermaid diagrams**: system architecture, data flows, sequence diagrams, state machines — all generated from the actual code
- **Syntax-highlighted code blocks**: real code from your codebase with explanations of what it does and why
- **Metrics cards**: lines of code, file counts, language, key stats at a glance
- **Sticky navigation**: jump between sections, wraps responsively on narrow viewports
- **Dark theme**: designed for developers who live in dark mode

### Live Chat (right panel)
- **Ask anything** about the codebase — the agent has already read the files
- **Select text** from the document, click "📎 Ask about this" to use it as context
- **Rich responses**: tables, code blocks, headings, bold/italic, bullet lists — all rendered inline
- **Streaming**: watch the response arrive word by word
- **Token usage & costs**: see per-request and session-total token counts and estimated costs

### Reliability
- **Auto-restart**: if the agent crashes, it restarts automatically (up to 3 times with exponential backoff)
- **Health monitoring**: server pings the agent every 15s; if it stops responding, the UI shows "Unresponsive" immediately
- **Mermaid validation**: every diagram is validated with `mermaid-cli`; broken diagrams get sent back to the agent to fix automatically (up to 3 cycles)
- **Session persistence**: stop and come back later with `deep-dive resume`

## Usage

```
deep-dive [prompt] [--path ./subdir] [--depth level] [--model name]
```

Everything that isn't a flag is your prompt. No quotes needed.

| Flag | Description |
|------|-------------|
| `prompt` | Topic or question to focus on (no quotes needed) |
| `--path` | Subdirectory to scope the exploration (repeatable) |
| `--depth` | `shallow` · `medium` (default) · `deep` |
| `--model` | LLM model to use (default: `claude-sonnet-4-5`) |
| `--help` | Show usage examples |

### Full Exploration (no prompt)

Explores the entire codebase: project structure, entry points, all major modules, dependency graph.

```bash
deep-dive                              # explore everything
deep-dive --depth deep                 # more diagrams, more code examples
deep-dive --depth shallow              # quick overview, faster
deep-dive --path ./src                 # full exploration scoped to ./src
```

### Focused Exploration (with prompt)

Give it a question and it explores **only** what's relevant, skipping unrelated modules entirely. Faster than a full exploration.

```bash
deep-dive how does authentication work
deep-dive explain the WebSocket reconnection logic
deep-dive error handling patterns --path ./src --depth deep
```

### Scoping with `--path`

Narrow exploration to specific subdirectories. The agent reads project config for context but focuses the document on the scoped area.

```bash
deep-dive --path ./src/api             # explore only the API module
deep-dive --path ./src --path ./lib    # focus on src and lib
deep-dive auth flow --path ./src/auth  # focused prompt + scoped directory
```

### Depth Levels

| Depth | Full Exploration | Focused Exploration |
|-------|-----------------|---------------------|
| `shallow` | 3-5 diagrams, ~800 lines, fast | 2-3 diagrams, ~500 lines, very fast |
| `medium` | 7-12 diagrams, ~1500 lines | 4-7 diagrams, ~1000 lines |
| `deep` | 12-18+ diagrams, 2000+ lines | 8-12+ diagrams, 1500+ lines |

## Commands

| Command | What it does |
|---------|-------------|
| `deep-dive` | Start a new exploration |
| `deep-dive resume` | Resume a previous session in this directory |
| `deep-dive stop` | Stop the running agent |

`deep-dive resume` shows a picker if you have multiple sessions:

```
Resume which session?
  1) 📄 "how does auth work?" (medium) — 2h ago
  2) 📄 full exploration (deep) — 1d ago
  3) ⏳ "error handling" [./src/api] (shallow) — 3d ago
```

## Authentication

Deep Dive needs an API key for your chosen LLM provider.

### Option 1: Environment Variables

```bash
export DEEP_DIVE_ANTHROPIC_API_KEY=sk-ant-xxx
# or use standard env vars as fallback:
export ANTHROPIC_API_KEY=sk-ant-xxx
```

### Option 2: Store a Key

```bash
deep-dive auth set anthropic sk-ant-xxx
```

### Option 3: OAuth Login

```bash
deep-dive auth login anthropic      # Claude Pro/Max
deep-dive auth login github-copilot # GitHub Copilot
deep-dive auth login google         # Google Gemini CLI
deep-dive auth login antigravity    # Google Cloud
deep-dive auth login openai-codex   # ChatGPT OAuth
```

### Manage Credentials

```bash
deep-dive auth list                 # show configured providers
deep-dive auth logout anthropic     # remove credentials
```

Credentials are stored in `~/.deep-dive/auth.json` with 600 permissions.

### Supported Environment Variables

| Deep Dive Variable | Standard Fallback |
|---|---|
| `DEEP_DIVE_ANTHROPIC_API_KEY` | `ANTHROPIC_API_KEY` |
| `DEEP_DIVE_OPENAI_API_KEY` | `OPENAI_API_KEY` |
| `DEEP_DIVE_GEMINI_API_KEY` | `GEMINI_API_KEY` |
| `DEEP_DIVE_GROQ_API_KEY` | `GROQ_API_KEY` |
| `DEEP_DIVE_XAI_API_KEY` | `XAI_API_KEY` |
| `DEEP_DIVE_OPENROUTER_API_KEY` | `OPENROUTER_API_KEY` |
| `DEEP_DIVE_MISTRAL_API_KEY` | `MISTRAL_API_KEY` |
| `DEEP_DIVE_CEREBRAS_API_KEY` | `CEREBRAS_API_KEY` |
| `DEEP_DIVE_GITHUB_TOKEN` | `COPILOT_GITHUB_TOKEN`, `GH_TOKEN`, `GITHUB_TOKEN` |

## Token Usage & Costs

Deep Dive tracks token usage per-request and per-session:

- **Per-request**: input tokens, output tokens, cache read/creation tokens
- **Per-session**: cumulative totals with estimated cost in dollars
- **Visible in browser UI**: token counts and costs displayed in the chat sidebar

## Agent Control

From the browser chat panel you can:

- **Stop**: halt the agent completely
- **Abort**: cancel the current operation (e.g., a long bash command)
- **Steer**: send a new message while the agent is working — it interrupts and responds

## Session Management

Sessions are stored locally in your project:

```
your-project/
  .deep-dive/
    a3f29b12/          # session 1
      document.md      # generated markdown
      document.html    # rendered architecture doc
      meta.json        # session metadata
      agent.log        # debug log
    c7e4d001/          # session 2
      ...
```

- **Resume**: `deep-dive resume` to pick up where you left off
- **Multiple concurrent**: run separate `deep-dive` instances in different terminals
- **No conflicts**: each gets its own port and session

## Configuration

### Global Settings

`~/.deep-dive/settings.json`:

```json
{
  "compaction": { "enabled": true },
  "retry": { "enabled": true, "maxRetries": 5 },
  "thinking": "medium",
  "maxTokens": 16384
}
```

### Project Settings

`.deep-dive/settings.json` — overrides global settings for this project.

### Custom Skills

Add custom skills to extend the agent's capabilities:

- Global: `~/.deep-dive/skills/`
- Project: `.deep-dive/skills/`

## How It Works

```
Terminal (deep-dive CLI)
    ↕ In-process agent session
Agent Runtime (reads files, runs tools)
    ↕ Events
HTTP + WebSocket Server
    ↕ WebSocket
Browser (split-panel UI)
```

1. You run `deep-dive` and the CLI creates an in-process agent session and starts an HTTP + WebSocket server
2. The agent reads files, follows imports, and builds understanding — streaming events to the browser
3. When the agent writes a markdown document, the system renders it to styled HTML
4. Mermaid diagrams are validated; broken ones are sent back to the agent for auto-fix
5. You ask questions in the chat — the agent already has full context from its exploration
6. Token usage and costs are tracked and displayed in the browser UI

## Security

The server generates a random session token on startup, printed in your terminal. Paste it in the browser to connect. This prevents other localhost processes from accessing the document or controlling the agent.

## Pi Extension

If you use [Pi](https://github.com/badlogic/pi) as your coding agent, there's a separate extension that wraps Deep Dive — uses Pi's existing auth, no global install needed:

```bash
pi install git:github.com/rezkam/pi-deep-dive
```

See [pi-deep-dive](https://github.com/rezkam/pi-deep-dive) for details.

## License

Copyright 2026 Reza Kamali. Licensed under [Apache License 2.0](LICENSE).



