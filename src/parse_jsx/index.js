import not_string_result from "../not_string_result.js"
import parse_script_markup from "./parse_script_markup.js"
/**
 * Finds the JSX elements in JavaScript or TypeScript with JSX, such as `.jsx`, `.tsx`, `.js` or Astro files,
 * and the markup of HTML templates: template literals tagged `html` or `svg`, preceded by an `html` block comment,
 * or used as the value of a `template` property.
 * The script itself is scanned, not parsed, the way the TypeScript parser reads it, so incomplete code is fine.
 * Never throws: syntax errors are returned in `errors` while parsing goes on.
 * Positions are UTF-16 offsets into `text`, with `start` inclusive and `end` exclusive.
 * @param {string} text the source code to scan
 * @param {boolean=} include_text `true` to add `text`, the source slice, to every node
 * @returns {{
 *   ast: import("../../public.js").Element[]
 *   errors: import("../../public.js").AstSyntaxError[]
 * }} `ast`: the top-level elements found in the script; `errors`: the syntax errors, each with the `start` and `end`
 * of the problem
 * @example
 * parseJsx(`const App = () => <p className={cls}>Hi</p>`).ast.map(element => element.name) // [ "p" ]
 */
export default function(text, include_text) {
	if (typeof text != "string") return not_string_result()
	return parse_script_markup(text, include_text, true)
}