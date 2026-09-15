---
paths:
  - "src/parse_jsx/**"
  - "src/parse_script.js"
  - "test/parse_jsx.test.js"
  - "test/parse_script.test.js"
---

# JSX and scripts (`src/parse_jsx`)

- Astro: `<!--` in children is a Comment; `script`/`style` content is raw text unless it is a single `{…}`; a tag right after a JSX element is a sibling if it parses without errors or runs to the end.
- JSX: whitespace in close tags, type arguments after the tag name, comments between attributes, element attribute values without braces (a jsx Script), a leading `#!` line.
- Elements in nested blocks and substitutions go to the nearest jsx Script's `elements`; ordinary template literals hoist theirs.
- Markup templates (`is_markup_template`: `html`/`svg` tag, `/* html */` comment, `template:` key) go through `parse_markup_template`: blank the substitution code, run `parse_markup`, shift positions, replace the `{…}` at each substitution with its template Script (from `$`, with `strings`/`elements`); drop markup errors inside substitutions; read completeness from `unclosed_templates`, never from error messages.
