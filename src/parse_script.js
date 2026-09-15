import not_string_result from "./not_string_result.js"
import parse_script_markup from "./parse_jsx/parse_script_markup.js"
/**
 * Finds the markup of HTML templates in JavaScript or TypeScript without JSX, such as `.ts` files:
 * template literals tagged `html` or `svg` (Lit), preceded by an `html` block comment, or used as the value of a
 * `template` property (Angular and Vue components). Each `${…}` is a `"template"` Script in the markup,
 * with the strings and elements found in its code. `<T>value` is read as a type assertion, not a tag.
 * Never throws: syntax errors are returned in `errors` while parsing goes on.
 * Positions are UTF-16 offsets into `text`, with `start` inclusive and `end` exclusive.
 * @param {string} text the source code to scan
 * @param {boolean=} include_text `true` to add `text`, the source slice, to every node
 * @returns {{
 *   ast: import("../public.js").Element[]
 *   errors: import("../public.js").AstSyntaxError[]
 * }} `ast`: the top-level elements of the templates; `errors`: the syntax errors, each with the `start` and `end`
 * of the problem
 * @example
 * parseScript("render(html`<p class=\"a\">${b}</p>`)").ast.map(element => element.name) // [ "p" ]
 */
export default function(text, include_text) {
	if (typeof text != "string") return not_string_result()
	return parse_script_markup(text, include_text, false)
}