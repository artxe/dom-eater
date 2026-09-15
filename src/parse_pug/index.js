import not_string_result from "../not_string_result.js"
import parse_pug_markup from "./parse_pug_markup.js"
/**
 * Parses Pug templates, `.pug` and `.jade` files, into an element tree.
 * Tags, class and id literals, attributes, `&attributes` and mixin calls become elements and attributes.
 * Attribute values that are a single quoted string are `String` nodes; other values, code such as `- var a = "b"`,
 * `#{…}` interpolations and logic such as `if`, `each` and `case` are `Script` nodes holding the string literals in
 * their code. The nodes inside logic blocks stay in the enclosing element. The template is read the way the Pug
 * lexer and parser read it.
 * Never throws: syntax errors are returned in `errors` while parsing goes on.
 * Positions are UTF-16 offsets into `text`, with `start` inclusive and `end` exclusive.
 * @param {string} text the Pug source to parse
 * @param {boolean=} include_text `true` to add `text`, the source slice, to every node
 * @returns {{
 *   ast: import("../../public.js").Element["children"]
 *   errors: import("../../public.js").AstSyntaxError[]
 * }} `ast`: the top-level nodes; `errors`: the syntax errors, each with the `start` and `end` of the problem
 * @example
 * const [ ul ] = parsePug(`ul\n  each item in items\n    li(class=item.done ? "done" : "")= item.name`).ast
 * if (ul?.type == "Element") ul.children.map(node => node.type) // [ "Script", "Element" ]
 */
export default function(text, include_text) {
	if (typeof text != "string") return not_string_result()
	return parse_pug_markup(text, include_text, 0, false)
}