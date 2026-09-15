# Changelog

## 1.0.0

### Breaking

- **The types come from the package itself, and `dom-eater/@types` is gone.** Replace
  `import type { AstNode } from "dom-eater/@types"` with
  `import type { AstNode } from "dom-eater"`, or import values and types together:
  `import { parseHtml, type AstNode } from "dom-eater"`. They gained `Comment`, the `"unquoted"`
  String subtype and `elements` on `"template"` Scripts in markup. The parser-internal types, such
  as `Bracket`, `Token` and the Pug and Razor parser states, stay unpublished.
- **`AstSyntaxError` the function is `createAstSyntaxError`.** `AstSyntaxError` is now only the type
  of the errors in `errors`, since one name cannot be both on one import path.
- **The package is an ES module only.** `import` loads `src/index.js`, and `dom-eater.cjs` is gone:
  `require("dom-eater")` works on Node.js 20.19+ and 22.12+, which load ES modules with `require`.
  Jest loads it once its ESM mode is on or the package is transformed.
- **Errors in `errors` keep their fields when serialized, and have no `stack`.** They are still
  `instanceof Error` with `name: "AstSyntaxError"`, but `name`, `message`, `start` and `end` are
  their own enumerable properties, so `JSON.stringify`, `structuredClone` and `postMessage` keep
  all four (the copies of the last two are plain objects). `createAstSyntaxError` makes the same
  shape.
- **The types follow the node shapes.** `parseJsx` and `parseScript` return `ast` as `Element[]`,
  the other parsers as `Element["children"]`; `children` holds only `Comment`, `Element`, `Script`,
  `Style` and `Text` nodes. A `"template"` Script in an element's `children` or in a quoted
  attribute value has `elements`, and one in a `"backtick"` String has not, so code that read
  `elements` from any `"template"` Script needs `"elements" in script`.
- **Comments are `Comment` nodes.** `<!-- a -->` was an unclosed `!--` element with the
  attributes `a` and `--`, and `<?xml version="1.0"?>` an unclosed `?xml` element. Both are now
  `{ type: "Comment" }`, as are other bogus comments such as `<!…>`, PHP tags (`<?php … ?>` and
  `<?= … ?>`, up to `?>` rather than the first `>`) and ERB/EJS tags (`<% … %>`). Code that
  switches over `AstNode` needs a case for it.
- **Optional end tags are implied the way browsers imply them.** `<p>a<p>b` returned two empty
  `p` elements with the text beside them and two "not closed" errors; each `p` now holds its text,
  without errors. The same goes for `li`, `dt`/`dd`, `option`/`optgroup`, table rows, cells and
  sections, ruby annotations, and `head`/`body`/`html`. Other elements that are never closed are
  still reported, and the nodes after them stay their siblings.
- **Close tags match case-insensitively.** `<DIV></div>` was an unclosed `DIV` followed by an
  unopened `div` close tag.
- **`textarea`, `title`, `iframe`, `noembed`, `noframes`, `xmp` and `plaintext` hold text.**
  `<textarea><b></b></textarea>` had a `b` child and now has a Text child; `plaintext` runs to the
  end of the input. `{…}` blocks inside them are still Scripts. Inside `svg` and `math`, only
  `script` and `style` hold text, and HTML integration points such as `foreignObject` switch back
  to HTML.
- **A `<script>` element ends at the first `</script>`**, even inside a string or comment, as in
  browsers. `<script>a = '</script><p></p>` used to swallow the `p`.
- **Unquoted attribute values are `String` nodes with `subType: "unquoted"`.** `<p class=a>` was
  a boolean `class` and a boolean `a` with an error.
- **JSX fragments are elements with an empty `name`.** `<><p/></>` returned only the `p`; the
  fragment now contains it.
- **`parseJsx` finds elements inside template literal substitutions.** `` `${<p/>}` `` returned
  nothing.
- **Error messages are sentences.** Messages named after internal functions, such as
  `parse_element is incomplete.` or `parse_script_double_quotes is incomplete.`, now say what is
  wrong: `The start tag is not closed.`, `The "p" Element is not closed.`,
  `The double-quoted string is not closed.`, `The "b" attribute has no value after "=".`, or
  `The comment is not closed with "-->".`. Pug errors no longer name internal tokens, such as
  `Expected "]", but found the end of the input.`, "element" is lower case in every parser, an
  unclosed Razor comment is "The Razor comment is not closed.", and the source an error quotes is
  escaped, so every message stays on one line. Code that compares `message` needs updating.

### Added

- `parsePug(text, include_text?)` for Pug templates (`.pug`, `.jade`). It follows the Pug lexer
  and parser: tags, `.class` and `#id` literals, attributes, `&attributes` and mixin calls are
  elements and attributes, and code, `#{…}` interpolations and logic lines such as `if` and `each`
  are `"pug"` Scripts with the string literals in their JavaScript.
- `parseHtml` parses the content of `<template lang="pug">` in Vue single-file components as Pug,
  after removing its common indentation as Vue does. It was read as HTML text, so none of its
  elements were found.
- `parseRazor(text, include_text?)` for Razor views and pages (`.cshtml`) and
  `parseRazorComponent(text, include_text?)` for Razor components (`.razor`, Blazor). They follow
  the Razor compiler of the .NET SDK: `@…` code is a `"razor"` Script with the C# string literals
  and the elements of the markup inside it, `@* … *@` is a Comment, and components read
  `@onclick` and `@bind-Value` as attributes. `parseHtml` read `@foreach (…) {` as Text and
  `class="@(a ? "b" : "c")"` as a value ending at the second quote.
- `parseScript(text, include_text?)` for JavaScript or TypeScript without JSX, such as `.ts`
  files, where `<T>value` is a type assertion rather than a tag.
- The markup of HTML templates in scripts is parsed by `parseJsx` and `parseScript`: template
  literals tagged `html` or `svg` (Lit), marked with a `/* html */` comment, or used as the value
  of a `template` property (Angular and Vue components). `` html`<p class="a"></p>` `` returned
  nothing. Each `${…}` is a `"template"` Script in the markup, with the strings and elements found
  in its code.
- Angular templates: control flow headers such as `@if (a) {` and `} @else {`, `@let`
  declarations and the syntax of ICU expressions such as `{n, plural, =0 {…}}` stay Text, and the
  markup inside them is parsed. `@if (a) {<p></p>}` and `{n, plural, =0 {<b></b>}}` were read
  as Script blocks.
- `package.json` declares `engines.node` as `>=14`, the oldest Node.js release line it runs on,
  and `sideEffects: false`, so bundlers drop the parsers an app does not import.
- `include_text` accepts `false` and any `boolean`, not only `true`.

### Fixed

- The parsers no longer throw a `TypeError` when `text` is not a string: they return no nodes and
  the error "The input is not a string.".
- Input nested too deeply no longer throws a `RangeError`: it keeps the nodes before it and adds
  the error "The input is nested too deeply.".
- Scripts are scanned the way the TypeScript parser reads them, so a `/`, `<` or quote is no
  longer misread and the rest of the file is no longer swallowed as one unterminated string. Each
  of these lost every element after it:
  - a regular expression after `)` of a control statement or after a declaration:
    `if (a) /'/.test(b)`, `class A {} /'/.test(b)`
  - `await` and `yield` operands: `async function f() { await /'/ }`
  - a line break that ends a statement: `var a` + line break + `/'/.test(b)`
  - TypeScript: generic arrow functions `<T,>(a: T) => a` and generic components
    `<Select<Option> />` were read as unclosed JSX tags; types after `as`, `satisfies` and `:`
    are skipped
  - Svelte blocks that start with a regular expression: `{#if /'/.test(x)}`
- Scripts: a `!` right after an operand is a non-null assertion, so `return!/x/` and `a !/b/` scan
  like TypeScript; a line break ends `import a = b.c`; `{` on the line after a string, template,
  regular expression or `]` starts a block; `a?.<T>(x)` is a call, not a tag; an escaped backtick in
  the `<script>` content of an HTML template no longer ends the template.
- Classic-script HTML comments (`<!--` in a `<script>`) no longer start a string or regular
  expression.
- `<![CDATA[…]]>` inside `svg` and `math` is Text instead of an unclosed element.
- `parseHtml`: `</p/>` closes `p`; `<a/href=x>` is `a` with an attribute; raw text ends at a close
  tag with attributes or a slash, such as `</script foo>`; self-closing tags imply end tags, so
  `<p>a<hr/>` closes the `p`; `xmp`, `listing` and `plaintext` close `p`; `colgroup` closes rows,
  cells and sections; `rt` and `rp` no longer close `rtc`; `--!>` ends a comment; `<?` in a quoted
  attribute value skips to `?>` only for `<?php` and `<?=`; deep unclosed trees and long `<script>`
  contents with `-->` are parsed in linear time.
- `parseHtml`: a `{` that is never closed is Text, so an unmatched brace in code samples or prose,
  such as `<pre>function f() {</pre>` or `<p>{</p>`, no longer swallows the rest of the document;
  in a quoted attribute value, such as `title="{it's}"`, the block ends at the closing quote.
- JSX: close tags may contain whitespace (`</ div >`), comments between attributes are skipped
  instead of becoming attributes, and elements can be attribute values without braces
  (`<p a=<b/> />`).
- `parseJsx` reads Astro markup: `<!-- … -->` in an element is a `Comment`, the content of
  `<script>` and `<style>` is text unless it is a single `{…}` expression, and an element right
  after another element, such as the next top-level element, is found.
- `parseJsx`: fragments and close tags with whitespace or comments inside, such as `< >`, `</ >`
  and `< /* c */ >`, and self-closing tags such as `<A/ >` parse like TypeScript.
- `parsePug`: an unbuffered comment cut off inside `#[…]` no longer overlaps its element; a `:`
  block expansion after `tag.`, such as `p.: span`, no longer adds a child element, because the
  text block replaces it; and a prefix `++` or `--` no longer ends an attribute value early, so
  `p(a=++ b)` has the value `++ b`.
- Razor: children of an unclosed element in a `@section` no longer extend past the element; `\{`
  in an interpolated string keeps the brace and ends hole parsing, as in Roslyn.
- Razor: a `@` at the start of a line after a `=======` or `|||||||` line, such as git merge
  conflict markers in a view or an underline in `<pre>`, no longer makes `parseRazor` and
  `parseRazorComponent` run until memory runs out; conflict markers are read as the Razor compiler
  reads them. The space and line break after markup in code belong to the markup, so in
  `@if(@</>` followed by a line starting with `<`, the `<` is C#; a bang-escaped tag such as `<!p>`
  is named `p`.
- `parseRazorComponent`: `@@` in an attribute name is one escaped `@`, so its second `@` cannot
  open a Razor comment; `<input @@*bind="name" />` has the attribute `@@*bind` instead of one
  running to the end of the input.
- Server and template languages: a quote inside a template comment or raw block no longer
  swallows the rest of the file (`{{!-- it's --}}` in Handlebars, `{# it's #}` in Jinja, Twig and
  Nunjucks, `{% raw %}`, `{% verbatim %}` and `{% comment %}` blocks, which stay Text), markup
  inside PHP strings such as `<?php $a = "<span class=\"x\">"; ?>` is no longer an element, and
  `class="a <?= $b ? "c" : "d" ?>"` or `<%= … %>` with quotes keeps the whole attribute value.
- Many unterminated Angular `@let` or `@if (` lines, nested ICU expressions and HTML templates in
  scripts with many substitutions are parsed in linear time.

## 0.2.5 and earlier

No changelog was kept before 1.0.0. See the git history.
