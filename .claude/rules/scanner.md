---
paths:
  - "src/parse_html/parse_element/parse_script_content.js"
  - "src/parse_html/parse_script_backticks/**"
  - "src/parse_html/parse_script_block.js"
  - "src/parse_jsx/**"
  - "src/parse_pug/scan_code.js"
  - "src/script_scanner/**"
---

# Script scanner (`src/script_scanner`)

No JS parser: tag vs `<`, regex vs `/`, declaration vs expression are decided from the previous significant token, matching the TypeScript parser on valid code. One wrong decision swallows the rest of the file. Every rule below is required by TS; verify before simplifying one.
- Brackets record `expression_after`: an expression may follow `)` of if/for/while/with/`import x = require()` and `}` of a block or declaration body; not a call `)`, an object/class-/function-expression `}`, a regex or a JSX end.
- `{` is a block after statement ends, `=>`, `)`, label/`case` `:` (`colons`), right inside a block (not a class body), and after a literal or `]` at a line break.
- ASI: after an operand or decorator, `class`/`function` is a declaration. A line break ends the statement after `break`/`continue`/`debugger` (+label), a binding without initializer, `import … from "x"`, `import "x"`, `import x = y.z`, `declare module "m"`, `export as namespace N`, a signature without body.
- Walk-backs (`previous_token`, `is_declaration_list` memoized in `declaration_lists`, arrow cache `arrow_inside`) must stay linear: 20k-item comma lists, 8k nested `case f(a): {`.
- `await`/`yield` follow TS (async functions/methods/arrows and static blocks; generators); identifiers in field initializers and plain functions; context flows through `nested_bracket`. Top-level `await` is a keyword only in modules: scan as module, rescan as script if a top-level `await` was decided without module syntax. HTML script content is a module.
- Names: a word after a single `.` is a member (not after `...` or `5.`: `member_dot_regex`) and nothing starts an expression after `?.`; `const`/`let`/`using`/`var` declare only if a binding follows; `class`/`function` + `(`/`<` in an object or class body is a method (`is_method_name`); `of` is a keyword only after a for-head binding.
- `++`/`--` and `!` are prefix unless right after an operand on the same line (a postfix `!` is a non-null assertion). `regex.test(undefined)` tests "undefined": guard with `?? ""`.
- `<`: `<<` pairs from the left; `<T,>`, `<T = U>`, `<const T extends U>` are type parameters; `<Name>(` is a tag only if `</Name` exists and it parses cleanly; `parseScript` makes no tags (`ScriptInfo.jsx`).
- `skip_type` (no regex inside types) after `as`/`satisfies`, `type X =`, `let x:`, `):` return types; `interface` has a body; `close_bracket` keeps an `expression_after` a type set.
- Deliberate: `a < b > /c/` reads as JS (comparison, regex). JS and TS are not told apart.
