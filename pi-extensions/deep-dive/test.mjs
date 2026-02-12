/**
 * Deep Dive extension verification tests.
 *
 * Run: node pi-extensions/deep-dive/test.mjs
 *
 * Tests the template, document builder, mermaid cleaning, and prompt
 * for correctness without needing a running server or browser.
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(__dirname, "index.ts"), "utf-8");
const ui = readFileSync(join(__dirname, "ui.html"), "utf-8");
const templatePath = join(__dirname, "template.html");
const template = existsSync(templatePath) ? readFileSync(templatePath, "utf-8") : "";

let pass = 0;
let fail = 0;

function test(name, fn) {
  try {
    fn();
    pass++;
    console.log(`  \u2713 ${name}`);
  } catch (e) {
    fail++;
    console.log(`  \u2717 ${name}`);
    console.log(`    ${e.message}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || "assertion failed");
}

// ═══════════════════════════════════════════════════════════════════
console.log("\n── Template (template.html) ──");
// ═══════════════════════════════════════════════════════════════════

test("template.html exists", () => {
  assert(template.length > 0, "template.html is missing or empty");
});

test("template has {{TITLE}} placeholder", () => {
  assert(template.includes("{{TITLE}}"), "Missing {{TITLE}} placeholder");
});

test("template has {{CONTENT}} placeholder", () => {
  assert(template.includes("{{CONTENT}}"), "Missing {{CONTENT}} placeholder");
});

test("template includes mermaid CDN", () => {
  assert(template.includes("mermaid"), "Missing mermaid in template");
  const mermaidUrl = template.match(/mermaid@(\d+\.\d+\.\d+)/);
  assert(mermaidUrl, "Mermaid CDN URL not pinned to specific version");
});

test("template includes highlight.js CDN", () => {
  assert(template.includes("highlight.js"), "Missing highlight.js in template");
  const hljsUrl = template.match(/highlight\.js\/(\d+\.\d+\.\d+)/);
  assert(hljsUrl, "highlight.js CDN URL not pinned to specific version");
});

test("template includes Google Fonts", () => {
  assert(template.includes("fonts.googleapis.com"), "Missing Google Fonts in template");
});

test("template has mermaid.initialize with theme:base", () => {
  assert(template.includes("mermaid.initialize"), "Missing mermaid.initialize");
  assert(template.includes('"base"'), 'Missing theme:"base" in mermaid.initialize');
});

test("template has themeVariables (not relying on defaults)", () => {
  assert(template.includes("themeVariables"), "Missing themeVariables in mermaid config");
  assert(template.includes("primaryColor"), "Missing primaryColor in themeVariables");
  assert(template.includes("lineColor"), "Missing lineColor in themeVariables");
});

test("template CSS isolates mermaid labels from page styles", () => {
  // p, span, li inside mermaid should inherit color, not use page-level rules
  assert(template.includes(".mermaid-box .mermaid p"), "Missing mermaid p isolation");
  assert(template.includes("color: inherit"), "Missing color:inherit for mermaid labels");
});

test("template has hljs.highlightAll()", () => {
  assert(template.includes("highlightAll"), "Missing hljs.highlightAll() in template");
});

test("template has zoom/pan controls", () => {
  assert(template.includes("zoom-in"), "Missing zoom-in in template");
  assert(template.includes("zoom-out"), "Missing zoom-out in template");
  assert(template.includes("zoom-reset"), "Missing zoom-reset in template");
});

test("template has drag-to-pan with CSS transform", () => {
  assert(template.includes("translate("), "Missing CSS translate for pan");
  assert(template.includes("cursor: grab") || template.includes("cursor:grab"), "Missing cursor:grab");
});

test("template has design system variables", () => {
  assert(template.includes("--bg:"), "Missing --bg CSS variable");
  assert(template.includes("--accent:"), "Missing --accent CSS variable");
  assert(template.includes("--card:"), "Missing --card CSS variable");
  assert(template.includes("--text:"), "Missing --text CSS variable");
});

test("template has dark scrollbar", () => {
  assert(template.includes("::-webkit-scrollbar"), "Missing custom scrollbar styles");
});

// ═══════════════════════════════════════════════════════════════════
console.log("\n── Document builder (index.ts) ──");
// ═══════════════════════════════════════════════════════════════════

test("buildDocument function exists", () => {
  assert(src.includes("function buildDocument"), "Missing buildDocument function");
});

test("extractBodyContent function exists", () => {
  assert(src.includes("function extractBodyContent"), "Missing extractBodyContent function");
});

test("cleanMermaidBlock strips style directives", () => {
  assert(src.includes("cleanMermaidBlock"), "Missing cleanMermaidBlock function");
  // Check it filters style, classDef, and init lines
  assert(src.includes("style\\s+\\S+\\s+") || src.includes("^style\\s"), "Missing style directive filter");
  assert(src.includes("classDef"), "Missing classDef filter");
  assert(src.includes("%%{init:"), "Missing init directive filter");
});

test("extractBodyContent removes agent script tags", () => {
  assert(src.includes("<script[\\s\\S]*?<\\/script>"), "Missing script tag removal regex");
});

test("selection bridge is injected at serve time", () => {
  assert(src.includes("dd-sel"), "Missing selection bridge postMessage (dd-sel)");
  assert(src.includes("dd-sel-clear"), "Missing selection clear postMessage");
});

test("no MERMAID_THEME constant (removed)", () => {
  assert(!src.includes("const MERMAID_THEME"), "MERMAID_THEME still exists - should use template");
});

test("no MERMAID_INIT_DIRECTIVE constant (removed)", () => {
  assert(!src.includes("const MERMAID_INIT_DIRECTIVE"), "MERMAID_INIT_DIRECTIVE still exists - should use template");
});

test("no CDN URL regex normalization (removed)", () => {
  assert(!src.includes("HLJS_CDN_CSS"), "HLJS_CDN_CSS still exists - template handles CDN");
  assert(!src.includes("HLJS_CDN_JS"), "HLJS_CDN_JS still exists - template handles CDN");
});

test("getTemplate loads template.html", () => {
  assert(src.includes("getTemplate"), "Missing getTemplate function");
  assert(src.includes("template.html"), "getTemplate doesn't reference template.html");
});

// ═══════════════════════════════════════════════════════════════════
console.log("\n── Mermaid validation ──");
// ═══════════════════════════════════════════════════════════════════

test("MERMAID_CLI_VERSION is defined", () => {
  assert(src.includes('const MERMAID_CLI_VERSION = "'), "Missing MERMAID_CLI_VERSION constant");
});

test("mermaid extraction matches both div and pre elements", () => {
  const regex = src.match(/pre\|div/);
  assert(regex, "Mermaid extraction regex should match both <pre> and <div> class='mermaid'");
});

test("validation uses mermaid-cli (not CDN)", () => {
  assert(src.includes("@mermaid-js/mermaid-cli"), "Missing mermaid-cli for validation");
  assert(src.includes("MERMAID_CLI_VERSION"), "Not using CLI version constant");
});

// ═══════════════════════════════════════════════════════════════════
console.log("\n── Chat history & state signals ──");
// ═══════════════════════════════════════════════════════════════════

test("get_messages only sent for resumed sessions", () => {
  assert(src.includes("S.isResumedSession") && src.includes("get_messages"),
    "get_messages should be gated on isResumedSession flag");
});

test("get_messages has one-shot guard (chatHistoryRequested)", () => {
  assert(src.includes("S.chatHistoryRequested"), "Missing chatHistoryRequested one-shot guard");
  const gatedBlock = src.slice(
    src.indexOf("isResumedSession"),
    src.indexOf("get_messages", src.indexOf("isResumedSession")) + 20
  );
  assert(gatedBlock.includes("chatHistoryRequested"), "get_messages not guarded by chatHistoryRequested");
});

test("fresh session resets resume flags", () => {
  assert(src.includes("S.isResumedSession = false"), "Fresh session must set isResumedSession = false");
});

test("resume session sets isResumedSession = true", () => {
  assert(src.includes("S.isResumedSession = true"), "Resume handler must set isResumedSession = true");
});

test("stopAgent resets resume and chatHistory flags", () => {
  const stopBlock = src.slice(src.indexOf("function stopAll") - 500, src.indexOf("function stopAll"));
  assert(stopBlock.includes("S.isResumedSession = false"), "stopAgent must reset isResumedSession");
  assert(stopBlock.includes("S.chatHistoryRequested = false"), "stopAgent must reset chatHistoryRequested");
});

// ═══════════════════════════════════════════════════════════════════
console.log("\n── Agent prompt ──");
// ═══════════════════════════════════════════════════════════════════

test("prompt tells agent to write body content only", () => {
  assert(src.includes("body content only") || src.includes("Do NOT include <html>"),
    "Prompt should instruct agent to write body content only");
});

test("prompt lists available CSS classes", () => {
  assert(src.includes(".hero"), "Prompt missing .hero class");
  assert(src.includes("nav.sticky-nav"), "Prompt missing nav.sticky-nav class");
  assert(src.includes(".mermaid-box"), "Prompt missing .mermaid-box class");
  assert(src.includes(".callout"), "Prompt missing .callout class");
  assert(src.includes(".metric-card"), "Prompt missing .metric-card class");
});

test("prompt tells agent to write structure-only mermaid", () => {
  assert(src.includes("no `style` directives") || src.includes("no style directives") || 
         src.includes("Do NOT include any styling") || src.includes("no \\`style\\` directives"),
    "Prompt should forbid style directives in mermaid");
  assert(src.includes("no `classDef`") || src.includes("no classDef") ||
         src.includes("no \\`classDef\\`"),
    "Prompt should forbid classDef in mermaid");
});

test("prompt shows mermaid-box container pattern", () => {
  assert(src.includes("mermaid-box"), "Prompt missing mermaid-box container example");
  assert(src.includes("pan-area"), "Prompt missing pan-area in mermaid example");
});

test("prompt warns about square brackets in sequence diagrams", () => {
  assert(src.includes("Do NOT use square brackets") || src.includes("Do not use square brackets"),
    "Missing square bracket warning for mermaid");
});

test("prompt does not include CDN URLs", () => {
  // CDN URLs are in the template, not the prompt
  const promptSection = src.slice(src.indexOf("Phase 2"), src.indexOf("Phase 2") + 3000);
  assert(!promptSection.includes("cdn.jsdelivr.net"), "Prompt should not include CDN URLs (template handles them)");
  assert(!promptSection.includes("cdnjs.cloudflare.com"), "Prompt should not include CDN URLs (template handles them)");
});

// ═══════════════════════════════════════════════════════════════════
console.log("\n── UI (ui.html) ──");
// ═══════════════════════════════════════════════════════════════════

test("ui.html has chat_history handler", () => {
  assert(ui.includes("chat_history"), "Missing chat_history event handler in ui.html");
});

test("chat_history does not claim 'Document ready'", () => {
  const chatHistoryBlock = ui.slice(
    ui.indexOf("data.type === 'chat_history'"),
    ui.indexOf("return;", ui.indexOf("data.type === 'chat_history'")) + 10
  );
  assert(!chatHistoryBlock.includes("Document ready"), "chat_history handler says 'Document ready' - only doc_ready should");
  assert(!chatHistoryBlock.includes("docReady = true"), "chat_history handler sets docReady - only doc_ready event should");
});

test("ui.html has chat persistence via sessionStorage", () => {
  assert(ui.includes("dd-chat-log"), "Missing chat log storage key");
  assert(ui.includes("sessionStorage"), "Missing sessionStorage usage");
});

test("ui.html has selection popup (Ask about this)", () => {
  assert(ui.includes("Ask about this"), "Missing 'Ask about this' selection popup");
});

test("ui.html has token auth screen", () => {
  assert(ui.includes("Paste token"), "Missing token auth screen");
});

test("ui.html pins Tailwind version", () => {
  const tailwindMatch = ui.match(/cdn\.tailwindcss\.com\/(\d+\.\d+\.\d+)/);
  assert(tailwindMatch, "Tailwind CDN not pinned to specific version");
});

test("ui.html pins highlight.js version", () => {
  const hljsMatch = ui.match(/highlight\.js\/(\d+\.\d+\.\d+)/);
  assert(hljsMatch, "highlight.js CDN not pinned to specific version");
});

// ═══════════════════════════════════════════════════════════════════
console.log("\n── No hardcoded paths ──");
// ═══════════════════════════════════════════════════════════════════

test("no /Users/rez in source", () => {
  assert(!src.includes("/Users/rez"), "Found /Users/rez in index.ts");
  assert(!ui.includes("/Users/rez"), "Found /Users/rez in ui.html");
});

test("no os.homedir() in source", () => {
  assert(!src.includes("os.homedir()"), "Found os.homedir() in index.ts");
});

test("no @latest dependencies", () => {
  assert(!src.includes("@latest"), "Found @latest in index.ts");
});

// ═══════════════════════════════════════════════════════════════════
console.log("\n── Results ──");
// ═══════════════════════════════════════════════════════════════════

console.log(`\n${pass + fail} tests: ${pass} passed, ${fail} failed\n`);
process.exit(fail > 0 ? 1 : 0);
