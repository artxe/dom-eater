---
paths:
  - "src/parse_pug/**"
  - "test/*pug*.test.js"
---

# Pug (`src/parse_pug`)

- Ports of pug-lexer 5 (`lex`), pug-strip-comments and pug-parser (`parse_pug_markup`), and character-parser (`parse_char`, `parse_until`). Keep the lexer order of `advance` (dispatched by first character) and each regex exact; quirks such as `if-x` being a conditional are Pug's.
- Pug ends an attribute value where acorn 7 (ES2019) accepts the text so far as an expression, checked at whitespace before a non-punctuator, `:`, `...` or quote, and at `,`. `is_expression_end` approximates that from the last token (operand, postfix `++`, `1.`, closed regex, reserved word, `.` member) plus unbalanced `?` and line comments; `++` and `--` only end one after an operand, so prefix `++ b` keeps going.
- Positions come from tokens, not Pug's line/column. CRLF and a BOM are normalized with an offset table; `#[…]` child lexers get the rest of the line and a `base`.
- Unbuffered comments are stripped from the token stream and flushed into the sink of the next node or closing block.
- A `tag.` text block replaces whatever the `:` block expansion on the same line built, as Pug's parser does.
- Logic blocks are flattened into the enclosing element; Scripts end at trimmed line ends. Recovery never throws: unclosed brackets run to the end, inconsistent indentation continues the deeper block.
