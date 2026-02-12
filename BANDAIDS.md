# Band-Aid Fixes and Proper Solutions

## Problem 1: Mermaid diagrams have unreadable colors

**Root cause**: The agent writes mermaid diagrams with arbitrary inline colors via
`style NodeA fill:#f0c674,color:#000` directives. Mermaid renders labels inside
`<foreignObject>` using `<p>` and `<span>` tags. Page-level CSS rules like
`p { color: #d4d4d8 }` override the per-node color with higher specificity.
Additionally, `%%{init:}%%` themeVariables interact unpredictably with per-node styles,
and different mermaid themes produce different (often unreadable) defaults.

**Band-aids applied** (all in index.ts):
1. Line 32-42: `MERMAID_THEME` constant + `MERMAID_INIT_DIRECTIVE` string
2. Line 328-336: Sanitizer step 3 - regex replaces/injects `%%{init:}%%` in every mermaid block
3. Line 338-350: Sanitizer step 4 - injects CSS isolation for `.node .label p` etc.
4. Line 833: Serve-time fallback `mermaid.initialize({theme:"base"})`
5. Line 869-885: Serve-time CSS `!important` overrides for cluster, edge, note fills
6. Line 1082: Prompt tells agent `mermaid.initialize({ startOnLoad: true, theme: "base" })`
7. Line 1090-1100: Prompt tells agent to include `%%{init:}%%` as first line of every diagram
8. Multiple prompt lines telling agent what NOT to do with colors

**Why every one fails**: The agent controls the diagram source. Mermaid has 4 levels
of styling (theme, themeVariables, %%{init:}%%, style directives) that interact in
undocumented ways. Page CSS bleeds into SVG foreignObject. No amount of post-hoc
regex or CSS can reliably fix arbitrary LLM output.

**Proper solution: Agent writes structure-only diagrams, rendering pipeline handles all styling**

The agent should write mermaid diagram LOGIC ONLY (nodes, edges, subgraphs) with NO
style directives, NO init directives, NO color references. A post-processing step
extracts the diagrams, prepends the fixed init directive, strips any style lines,
and renders them. The validation pipeline already extracts and validates each block.
Extend it to also normalize styling.

Specifically:
- Strip all `style` lines and `%%{init:}%%` from agent-generated mermaid
- Prepend our single init directive
- Render with mermaid-cli to SVG (already done for validation)
- Embed the rendered SVG directly in the HTML (no client-side rendering at all)
- This eliminates the entire client-side mermaid dependency and all CSS interaction issues

If client-side rendering is preferred (for interactivity):
- Still strip styles and inject init directive
- Use a `<script>` that calls `mermaid.initialize()` ONCE with our theme
- Add CSS isolation in the template (not injected post-hoc)
- The template owns the page CSS, so it controls what bleeds into foreignObject


## Problem 2: CDN URL management

**Root cause**: The agent writes the full HTML including `<script>` and `<link>` tags.
It may hallucinate URLs, use wrong versions, or omit dependencies.

**Band-aids applied**:
- Line 312-315: Sanitizer regex replaces mermaid CDN URLs
- Line 318-327: Sanitizer regex replaces highlight.js CDN URLs  
- Line 352-358: Sanitizer injects missing mermaid script
- Line 361-369: Sanitizer injects missing highlight.js
- Line 370-378: Sanitizer injects missing hljs.highlightAll()
- Line 379-386: Sanitizer injects missing Google Fonts
- Line 831-835: Serve-time fallback scripts for mermaid and hljs
- Prompt instructions with exact URLs (lines 1075-1082)

**Proper solution: HTML template with fixed head**

The agent should NOT write `<head>` content. Use an HTML template where:
- All CDN links, scripts, and meta tags are fixed in the template
- The template includes the mermaid init, hljs init, fonts, viewport, etc.
- The agent only writes the `<body>` content
- No sanitization needed because the template owns all dependencies


## Problem 3: HTML document structure/quality

**Root cause**: The agent generates the ENTIRE HTML document from scratch. The prompt
tries to dictate exact CSS values, class names, responsive patterns. Every model
produces different results. Prompt is ~80 lines of HTML/CSS instructions.

**Band-aids applied**:
- 80+ lines of prompt dictating CSS, fonts, responsive rules
- Serve-time injection of responsive CSS overrides (line 846-867)
- Serve-time injection of selection bridge (line 839-844)

**Proper solution: Provide an HTML template**

Create `template.html` with:
- Complete `<head>` (all CDN deps, meta, title placeholder)
- CSS design system (colors, fonts, responsive grid, cards, callouts, code blocks, nav)
- Mermaid initialization with fixed theme
- Selection bridge, wheel blocker
- Placeholder `<!-- CONTENT -->` marker

The agent writes ONLY the body content (sections, text, code blocks, mermaid diagrams).
The build step inserts content into the template.

Benefits:
- Prompt shrinks from 80 lines to "write content sections, here are the available CSS classes"
- Zero sanitization needed for structure
- Consistent design across all models
- Template can be tested and iterated independently
