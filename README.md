# DOM Eater

A fast, error-tolerant AST parser for markup in HTML templates, JSX/TSX, JavaScript/TypeScript, Razor and Pug.

DOM Eater is built for [Intellisense Click CSS](https://github.com/artxe/click-css), a VS Code extension that highlights and completes CSS written in class attributes. Its AST is general enough for other editor tooling that needs the same information, but its scope and API follow what that extension needs:

- It finds elements, attributes, text, and the script regions and string literals inside them, with exact source positions.
- It does not parse JavaScript or C#. It scans them the way the TypeScript parser and the Razor compiler read them, to decide what `{`, `}`, `<`, `/`, `@` and quotes mean, and skips the rest. If you need a JavaScript AST, use a JavaScript parser.
- It never gives up on incomplete code, so the element being typed at the end of the text is still found.

## Installation

```bash
npm i dom-eater
```

## API

```ts
import { createAstSyntaxError, parseHtml, parseJsx, parsePug, parseRazor, parseRazorComponent, parseScript } from "dom-eater"
import type { AstNode, AstSyntaxError, Element } from "dom-eater"
```

| Function | Input | Finds |
| --- | --- | --- |
| `parseHtml(text, include_text?)` | HTML and template files: Vue, Svelte, Angular templates, Alpine.js, HTMX, Blade, Jinja | The element tree, with `{…}` blocks as scripts |
| `parseJsx(text, include_text?)` | JavaScript or TypeScript with JSX: `.jsx`, `.tsx`, `.js`, Astro | JSX elements, and the markup of HTML templates |
| `parsePug(text, include_text?)` | Pug templates: `.pug` and `.jade` | The element tree, with code, `#{…}` interpolations and logic such as `if` and `each` as scripts |
| `parseRazor(text, include_text?)` | Razor views and pages: `.cshtml` in ASP.NET Core MVC and Razor Pages | The element tree, with `@…` code as scripts |
| `parseRazorComponent(text, include_text?)` | Razor components: `.razor` in Blazor | The element tree, with `@…` code as scripts and directive attributes such as `@onclick` |
| `parseScript(text, include_text?)` | JavaScript or TypeScript without JSX: `.ts`, where `<T>value` is a type assertion | The markup of HTML templates |
| `createAstSyntaxError(message, start, end)` | A message and a range | An error in the shape of those in `errors`, for tools that report their own problems next to them |

Each parser returns `{ ast, errors }` and never throws: syntax errors are reported in `errors` while parsing goes on. A `text` that is not a string gives no nodes and the error "The input is not a string.".

- `ast`: for `parseHtml`, `parsePug`, `parseRazor` and `parseRazorComponent`, the top-level nodes, typed `Element["children"]`; for `parseJsx` and `parseScript`, the top-level elements found in the script, typed `Element[]`.
- `errors`: `AstSyntaxError` objects, which are `instanceof Error`, with `name: "AstSyntaxError"`, `message` and the `start` and `end` of the problem as own properties and no `stack`. `JSON.stringify`, `structuredClone` and `postMessage` keep all four, so errors can be sent from a worker or a language server; the copies `structuredClone` and `postMessage` make are plain objects.
- `include_text`: pass `true` to add `text`, the source slice, to every node.

Positions are UTF-16 offsets into `text`: `start` is inclusive and `end` exclusive, so `text.slice(node.start, node.end)` is the node's source.

### HTML templates in scripts

`parseJsx` and `parseScript` parse the content of these template literals as HTML:

- Tagged with `html` or `svg`, as in Lit: `` html`<p class="a">${b}</p>` ``
- Marked with a comment: `` /* html */ `<p>…</p>` ``
- The value of a `template` property, as in Angular and Vue components: `` @Component({ template: `<p>…</p>` }) ``

Each `${…}` becomes a `Script` node in the markup, starting at its `$`. It holds the strings and elements in its code, so templates nested in substitutions stay in place.

## AST

Every node has `type`, `start`, `end`, and `text` when `include_text` is set.

| Node | Fields |
| --- | --- |
| `Element` | `name`; `subType`: `"open"`, `"closed"` (self-closing `<br/>`) or `"close"` (an unmatched close tag); `attributes`; `children`: `Element`, `Text`, `Comment`, `Script` and `Style` nodes. In `parseHtml` and HTML templates, `<!DOCTYPE html>` is an empty `"open"` element named `!DOCTYPE` with the attribute `html`, without an error |
| `Attribute` | `name` (`""` for a spread block such as `{...props}`, and for Pug's `&attributes(…)` and mixin arguments); `value`: `true` without a value, a `String` (`"double"`, `"single"` or `"unquoted"`), or a `Script` for `name={…}`, Razor code in place of an attribute, and Pug values other than a quoted string |
| `String` | `subType`: `"double"`, `"single"`, `"backtick"` or `"unquoted"` (also Pug's `.class` and `#id` literals); `scripts`: the script regions inside it |
| `Script` | `subType`: `"block"` (`{…}` in `parseHtml` and in HTML templates), `"content"` (of a `<script>` element), `"template"` (`${…}`), `"jsx"` (`{…}` in JSX), `"pug"` (code, `#{…}`, logic lines and attribute values in `parsePug`) or `"razor"` (`@…` in `parseRazor` and `parseRazorComponent`); `strings`: the string literals in its code; `elements`: the elements in its code, on `"jsx"`, `"razor"` and `"template"` Scripts except a `"template"` in a `"backtick"` String, the `${…}` of a template literal in code |
| `Text` | Text between the other nodes |
| `Comment` | `<!-- … -->`, bogus comments such as `<?xml … ?>`, Razor comments `@* … *@` and declarations such as `<!DOCTYPE html>`, and Pug comments `//` and `//-` with their blocks |
| `Style` | The content of a `<style>` element |

The types are exported from `dom-eater` itself: `import type { AstNode, Element } from "dom-eater"`. The `type` and `subType` fields narrow them: a `"template"` Script among an element's `children` has `elements` and one in a `"backtick"` String has none, so on any `AstNode` check `"elements" in node`.

## Examples

### parseHtml

```ts
import { parseHtml } from "dom-eater"

parseHtml(`<p class="note {tone}">Hi {name}</p>`)
```
```json
{
  "ast": [
    {
      "attributes": [
        {
          "end": 22,
          "name": "class",
          "start": 3,
          "type": "Attribute",
          "value": {
            "end": 22,
            "scripts": [
              {
                "end": 21,
                "start": 15,
                "strings": [],
                "subType": "block",
                "type": "Script"
              }
            ],
            "start": 9,
            "subType": "double",
            "type": "String"
          }
        }
      ],
      "children": [
        {
          "end": 26,
          "start": 23,
          "type": "Text"
        },
        {
          "end": 32,
          "start": 26,
          "strings": [],
          "subType": "block",
          "type": "Script"
        }
      ],
      "end": 36,
      "name": "p",
      "start": 0,
      "subType": "open",
      "type": "Element"
    }
  ],
  "errors": []
}
```

### parseRazor

```ts
import { parseRazor } from "dom-eater"

parseRazor(`<li class="@(done ? "done" : "")">@item.Name</li>`)
```
```json
{
  "ast": [
    {
      "attributes": [
        {
          "end": 33,
          "name": "class",
          "start": 4,
          "type": "Attribute",
          "value": {
            "end": 33,
            "scripts": [
              {
                "elements": [],
                "end": 32,
                "start": 11,
                "strings": [
                  {
                    "end": 26,
                    "scripts": [],
                    "start": 20,
                    "subType": "double",
                    "type": "String"
                  },
                  {
                    "end": 31,
                    "scripts": [],
                    "start": 29,
                    "subType": "double",
                    "type": "String"
                  }
                ],
                "subType": "razor",
                "type": "Script"
              }
            ],
            "start": 10,
            "subType": "double",
            "type": "String"
          }
        }
      ],
      "children": [
        {
          "elements": [],
          "end": 44,
          "start": 34,
          "strings": [],
          "subType": "razor",
          "type": "Script"
        }
      ],
      "end": 49,
      "name": "li",
      "start": 0,
      "subType": "open",
      "type": "Element"
    }
  ],
  "errors": []
}
```

`parseJsx`, `parseScript` and `parsePug` produce the same shapes: `{…}` in JSX is a `"jsx"` Script with its `elements`, `${…}` in an HTML template is a `"template"` Script, and Pug code and attribute expressions are `"pug"` Scripts.

## Frameworks

| Framework | Parser |
| --- | --- |
| React, Preact, Solid, Qwik, Stencil | `parseJsx` |
| Astro | `parseJsx` |
| Vue (single-file components, including `<template lang="pug">`) | `parseHtml` |
| Svelte, including Svelte 5 snippets and `{@render}` | `parseHtml` |
| Angular templates, including control flow, `@let` and ICU expressions | `parseHtml` |
| Angular inline templates, Lit | `parseScript`, or `parseJsx` for `.js` |
| Alpine.js, HTMX | `parseHtml` |
| ASP.NET Core MVC and Razor Pages (`.cshtml`) | `parseRazor` |
| Blazor (`.razor`) | `parseRazorComponent` |
| Pug (`.pug`, `.jade`), as in Express and Hexo themes | `parsePug` |
| Server templates: PHP, Blade, ERB, Twig, Jinja, Liquid, Handlebars, Hugo; Markdown | `parseHtml` |

## How markup is parsed

### parseHtml

- Close tags match the nearest open element with the same name, case-insensitively.
- End tags that HTML makes optional (`p`, `li`, `td`, `option`, …) are implied the way browsers imply them. Any other element that is never closed is reported, and the nodes after it stay its siblings.
- `script`, `style`, `textarea`, `title`, `iframe`, `noembed`, `noframes` and `xmp` hold raw text that ends at the first matching close tag, as in browsers. `plaintext` runs to the end of the input.
- Inside `svg` and `math`, only `script` and `style` hold raw text, as in Svelte, and `<![CDATA[…]]>` is Text. HTML integration points such as `foreignObject` switch back to HTML.
- `{…}` in text and attribute values is a `Script`. A leading Svelte tag such as `{#if`, `{:else}` or `{@html` is skipped.
- Angular block headers such as `@if (a) {` and `} @else {`, `@let` declarations, and the syntax of ICU expressions such as `{count, plural, =0 {…}}` stay Text, so the markup inside them is parsed.
- Attribute values have no backslash escapes.
- The content of `<template lang="pug">` is parsed as Pug, after removing its common indentation as Vue does.

### parsePug

It follows the Pug lexer and parser, and is checked against them on real templates.

- Tags, `.class` and `#id` literals, `(…)` attributes, `&attributes(…)`, `#{…}` tags and `+mixin(…)` calls are elements and attributes. `.class` is an `Attribute` named `class` whose value is an unquoted `String`.
- Attribute values end where the Pug lexer ends them: at a comma or at whitespace after a complete JavaScript expression. A value that is one quoted string is a `String`; any other value is a `Script` with the string literals in it.
- `-`, `=` and `!=` code, `#{…}` and `!{…}` interpolations, and the lines of `if`, `else`, `unless`, `case`, `when`, `default`, `each`, `while` and `mixin` are `Script` nodes. The nodes in their blocks stay in the enclosing element, as with Svelte blocks.
- Piped text, text after tags, `.` blocks, filters and lines starting with `<` are Text, with `#[…]` tags inside them. Unbuffered `//-` and buffered `//` comments are `Comment` nodes, including their blocks.
- Inconsistent indentation is reported, and the line becomes a sibling of the more deeply indented lines before it.

### parseRazor and parseRazorComponent

They follow the Razor compiler of the .NET SDK rather than browsers, and are checked against it on real views, pages and components.

- Close tags match the nearest open element with the same name. No end tags are implied, and only `script` holds text, which may still contain `@` code.
- `@name.Member`, `@(…)`, `@{…}`, control flow such as `@if`, `@foreach` and `@switch`, and directives such as `@model`, `@section` and `@code` are `Script` nodes. The markup inside code blocks, `@<p>…</p>` templates and `<text>` elements is in their `elements`, and the C# string literals, including interpolated, verbatim and raw strings, in their `strings`.
- `@@` and email addresses such as `a@b.com` stay Text.
- `parseRazor` reads `@` where an attribute name goes as C# code, an `Attribute` with the name `""`. `parseRazorComponent` reads it as a directive attribute such as `@onclick` or `@bind-Value`.

### Scripts

`parseJsx`, `parseScript`, and the script regions of `parseHtml` are scanned rather than parsed. To tell a tag from a comparison, a regular expression from a division, and the end of a statement, the scanner follows the rules of the TypeScript parser:

- Operands and keywords: `return <p/>` has a tag, while `a < b` and `f<T>(x)` do not. `x = a / 2` divides, while `if (a) /re/.test(b)` has a regular expression.
- Automatic semicolon insertion, such as a line break after `var a`, `break`, a function overload or `import … from "x"`.
- Where `await` and `yield` are keywords: async functions, generators, methods, arrow functions, class bodies, and the top level of modules.
- TypeScript: type parameters such as `<T,>`, type assertions with `as` and `satisfies`, type annotations, `type` aliases, interfaces, overloads and decorators.

The scanner is checked against the TypeScript parser on real code from `node_modules`, on the same code with probes inserted at every statement and operand, and on generated programs.

## Limitations

- Syntax that depends on the file type is decided without it. At the top level of `parseHtml` scripts, `await` is a keyword, as in modules. `a < b > /c/` follows JavaScript, where TypeScript reads an instantiation expression.
- `parseJsx` reads `<T>value` as a JSX tag, as the TypeScript parser does in `.tsx` files. Use `parseScript` for `.ts` files.
- Razor code inside `<!-- … -->`, `<!…>`, `<?…?>` and `<![CDATA[…]]>` is part of the `Comment` node, although the Razor compiler still reads it as code. In code the compiler rejects, `#define` is not applied to later `#if` directives, and a `#` directive right after markup on the same line can be read differently.
- In Pug attributes and `#{…}`, a `/` inside a regular expression's character class ends the regular expression, as in Pug: `p(a=/[/]/.test(x))` fails in Pug with "Mismatched Bracket: ]", and `parsePug` reports the same error. Write `/[\/]/` instead. Where that misreading still leaves the brackets balanced, Pug checks the value with a JavaScript parser while `parsePug` judges it from its last token, so the value can end at a different place.
- Very deep nesting, such as thousands of nested blocks, is reported as "The input is nested too deeply." instead of parsed. The TypeScript parser itself overflows at a smaller depth.
