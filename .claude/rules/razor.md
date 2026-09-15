---
paths:
  - "src/parse_razor/**"
  - "src/parse_razor_component.js"
  - "test/*razor*.test.js"
---

# Razor (`src/parse_razor`)

- A port of the Razor compiler (dotnet/razor `HtmlMarkupParser`, `CSharpCodeParser`, the Roslyn tokenizer as the .NET 10 SDK uses it), not of the HTML parser: no implied end tags, no raw text except `<script>` (which still has transitions), and the tag stack decides where markup inside code ends. When output differs, port Razor's source instead of guessing a rule.
- Tokenizers are position-based (`html_token`, `csharp_token`); that matches Razor because it resets its tokenizers on every put-back.
- `.cshtml` and `.razor` differ only in directives and in `@` where an attribute name goes (C# in views, a directive attribute in components). Keep the dialects separate: `@model` is a variable in components, and a component attribute name takes `@@` as one escape, so its second `@` cannot open an `@*` comment.
- A razor Script starts at `@` and ends at its last non-whitespace token or nested element; it holds C# string literals (interpolation holes are razor Scripts in `String.scripts`) and the elements of markup at statement starts, `@<p>` templates and `<text>`. Scripts inside `@section` bodies and `@:` lines are hoisted. Code inside `<!--`, `<!…>`, `<?…?>` and CDATA is hidden in the Comment node.
- Unclosed elements end at Razor's last flush (`frames[0].flushed`). Top-level code blocks capture whitespace to the end of the line (`capture_line_end`); `@{…}` before a newline sets `null_generate`.
- C# that changes structure: `#if` with no defined symbols makes disabled text, git conflict markers are trivia (a `=======` or `|||||||` token includes the disabled text after it), `_` and `var` are keywords, a qualified name must be followed by whitespace, interpolated strings follow Roslyn (holes, format clauses, runaway recovery).
- Razor rescans to EOF for every unclosed `(` and statement; `balance_failures` and `statement_ends` memoize that so repeated `@(a` stays linear.
