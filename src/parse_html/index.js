import create_ast_syntax_error from "../create_ast_syntax_error.js"
import not_string_result from "../not_string_result.js"
import set_text from "../set_text.js"
import parse_markup from "./parse_markup.js"
/**
 * Parses HTML and template files, such as Vue, Svelte and Angular templates, Alpine.js or HTMX, into an element tree.
 * `{…}` blocks in text and attribute values become `Script` nodes with the string literals found in their code.
 * Never throws: syntax errors are returned in `errors` while parsing goes on.
 * Positions are UTF-16 offsets into `text`, with `start` inclusive and `end` exclusive.
 * @param {string} text the markup to parse
 * @param {boolean=} include_text `true` to add `text`, the source slice, to every node
 * @returns {{
 *   ast: import("../../public.js").Element["children"]
 *   errors: import("../../public.js").AstSyntaxError[]
 * }} `ast`: the top-level nodes; `errors`: the syntax errors, each with the `start` and `end` of the problem
 * @example
 * const [ p ] = parseHtml(`<p class="note {tone}">Hi {name}</p>`).ast
 * if (p?.type == "Element") p.attributes.map(attribute => attribute.name) // [ "class" ]
 */
export default function(text, include_text) {
	if (typeof text != "string") return not_string_result()
	/** @type {import("../../public.js").AstSyntaxError[]} */
	const errors = []
	try {
		const ast = parse_markup(text, errors)
		if (include_text) set_text(text, ast)
		return { ast, errors }
	} catch (error) {
		if (!(error instanceof RangeError)) throw error
		errors.push(
			create_ast_syntax_error(
				"The input is nested too deeply.",
				0,
				text.length
			)
		)
		return { ast: [], errors }
	}
}