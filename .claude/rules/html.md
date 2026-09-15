---
paths:
  - "src/parse_html/**"
  - "test/parse_html.test.js"
---

# HTML (`src/parse_html`)

- Flat scan, then `normalize_nodes` builds the tree without recursion: close tags match the nearest same name case-insensitively; HTML spec implied end tags (also before self-closing tags); other unclosed elements are reported and their children stay siblings, moved once per cascade (`close_open_elements`) so deep unclosed trees stay linear.
- Raw text (script, style, textarea, title, iframe, noembed, noframes, xmp; plaintext to the end) ends at the first close tag (`</name` followed by whitespace, `/` or `>`, parsed like any tag), even inside strings; `<!--`/`-->` are comments in script content.
- svg/math and their integration points: only script/style are raw text and CDATA is Text (in HTML, a bogus Comment).
- `{}` blocks are expressions (`create_scan_state()`); one not closed before the end is Text, or in a quoted value ends at the closing quote (`unclosed_blocks`; failed starts are memoized to stay linear); a leading Svelte tag (`#if`, `/each`, `@html`…) or Mustache section close (`{{/name}}`) is skipped. Attribute values have no backslash escapes.
- Angular: `@if (…) {`, `} @else {`, `@let x = …;`, ICU headers and case braces stay Text. `add_icu_brace_starts` tracks the case depth of each nested ICU and records nested ICU and case braces, so each is scanned once; interpolations end like the Angular lexer (`}}` outside quotes; quotes ignored after `//`).
- Server templates: `<?php`/`<?=` are Comments up to `?>` (to the end without error); `<%…%>` is a Comment only if a `%>` follows; inside quoted attribute values `<?php…?>`/`<?=…?>`/`<%…%>` are skipped only when their close follows. `template_text_end` keeps `{{!-- --}}`, `{{! }}`, `{# #}` (not Svelte `{#if`…) and `{% raw|verbatim|comment %}…{% end… %}` as Text.
- `<template lang="pug|jade">`: content up to `</template` goes to `parse_pug_markup` with Vue's dedent and a base offset; `pug_templates` tells `normalize_nodes` the element is complete.
