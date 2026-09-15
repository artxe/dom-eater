---
name: verify-parser
description: Differential verification of dom-eater scanner or parser changes against the reference parsers (TypeScript, Razor compiler, pug, parse5). Use after changing the script scanner (src/script_scanner) or any parser, before calling the change done.
---

# Verifying a parser change

Unit tests are not enough: compare against the reference parser. The seeded harnesses are `test/fuzz/<entry>.test.js`; `pnpm test` runs a few hundred seeds of each, a real check needs the large runs below.

## Large runs
Git Bash, one command per line (PowerShell: `$env:SIM_SEEDS = '100000'; npx vitest run test/fuzz`, then `Remove-Item Env:SIM_*`). `SIM_SEEDS` is the count, `SIM_FROM` the first seed (default 1; move it to reach new seeds), `SIM_SEED` replays one seed, `SIM_MODE` runs one mode. A failure prints `SIM_MODE=… SIM_SEED=…`, a minimized input and the input. A seed whose check takes longer than `SIM_BUDGET` (5000 ms, `0` turns it off) fails the same way: the parsers are synchronous, so a backtracking blowup shows up as one slow seed long before it hangs the run, and a run that prints nothing for minutes is that, not slow progress.
- `SIM_MODE=invariants SIM_SEEDS=200000 npx vitest run test/fuzz` (about a minute): all six entries on fragment soups, mutated string literals of `test/<entry>.test.js` and their prefixes; no throw, `check_invariants`, determinism, `include_text` changes only `text`, every error message a one-line sentence.
- `SIM_MODE=typescript SIM_SEEDS=100000 npx vitest run test/fuzz/parse_jsx.test.js test/fuzz/parse_script.test.js` (about 35 seconds): grammar-generated programs, with probes, cursor completion in JSX attributes and prefixes.
- `SIM_MODE=typescript-corpus npx vitest run test/fuzz/parse_jsx.test.js test/fuzz/parse_script.test.js` (about 40 seconds): every script under `node_modules/.pnpm`, one seed per file in path order, so `SIM_FROM` and `SIM_SEEDS` take a slice. Runs only in this mode.
- `SIM_MODE=pug SIM_SEEDS=100000 npx vitest run test/fuzz/parse_pug.test.js` (about a minute): mutated fixtures and test templates.
- `SIM_MODE=parse5 SIM_SEEDS=1000000 npx vitest run test/fuzz/parse_html.test.js` and the same with `SIM_MODE=completion` (about half a minute each): generated valid documents with implied end tags, and typing inside their quoted attributes.
- `SIM_MODE=razor SIM_SEEDS=20000 npx vitest run test/fuzz/parse_razor.test.js test/fuzz/parse_razor_component.test.js` (about 15 seconds): needs the .NET SDK (`dotnet` on `PATH`, 10 or later); builds `test/fuzz/razor/razor.csproj` into the temp directory (`--artifacts-path`, so the repo stays clean) and compares mutated pages that Razor accepts without diagnostics. Skipped without `SIM_MODE=razor` or without `dotnet`.

## Method
1. Normalize both outputs to comparable items: element ranges (and parents), attribute ranges with value ranges, text/script/comment ranges, string literal ranges.
2. Only inputs the reference accepts are compared; all inputs are checked for invariants and crashes. Extend the generators and fixtures in `test/fuzz/*.js` for new syntax.
3. For wider coverage also run a real corpus (below) and its random prefixes, and compare with HEAD's `src` on the same inputs to catch unintended changes in other parsers.
4. Check pathological inputs for superlinear time and deep nesting.
5. Record distinctive snippets as tests (outputs taken from the reference), and break each new behavior once to see a test fail.

## References
- Scripts: `typescript` package (TS 6 API). Inputs must have no `parseDiagnostics`. Element ranges via `parseJsx`, string ranges via `parseHtml` of `{() => {code}}`, also with probes (`/'/.test(q);`, `<Q/>;`, `(e / "'" / 1)`) inserted at statements and operands, plus keyword-as-name and prefix-operator sweeps. `ts.forEachChild` stops at a truthy callback result. Recorded under "agreement with the TypeScript parser" in `test/parse_jsx.test.js` and `test/parse_script.test.js`.
- Razor: `RazorSyntaxTree.Parse` from `Microsoft.CodeAnalysis.Razor.Compiler.dll` in the .NET SDK, with MVC or component `DirectiveDescriptor`s and `UseRoslynTokenizer` set by reflection, dumped as a node/token tree (`MarkupEphemeralTextLiteral` is an escaped `@`). Corpus: dotnet/aspnetcore, AspNetCore.Docs, blazor-samples, MudBlazor, fluentui-blazor; also all prefixes of dotnet/razor's legacy parser test inputs. Recorded under "agreement with the Razor compiler" in `test/parse_razor.test.js` and `test/parse_razor_component.test.js`.
- Pug: `pug-lexer` + `pug-strip-comments` + `pug-parser`; strings via TypeScript on each JavaScript range. Pug's line/column is wrong after `+` followed by a newline, in multi-line `&attributes(`, after `\#[` inside `#[`, and after a mixin call whose arguments follow a space (the lexer never counts that space); the harness skips those inputs. Attributes come from the lexer tokens but only the ones the parser kept, because `tag.` drops a `:` block expansion. Filter attributes are not compared. Corpus: pugjs/pug tests, Hexo themes (butterfly, stun, maupassant, yun), overleaf, codecombat. Recorded under "agreement with the Pug lexer and parser" in `test/parse_pug.test.js`.
- HTML: `parse5` with `sourceCodeLocationInfo`, `parse` for documents and `parseFragment` otherwise; element starts, parents, attribute ranges and explicit end tags.
