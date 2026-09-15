import not_string_result from "./not_string_result.js"
import parse_razor_markup from "./parse_razor/parse_razor_markup.js"
/**
 * Parses Razor components, the `.razor` files of Blazor, into an element tree.
 * `@` expressions, `@{…}` code blocks, control flow such as `@if (…) {…}` and directives such as `@code` become
 * `Script` nodes holding the C# string literals in their code and the elements of the markup inside them.
 * Directive attributes such as `@onclick` and `@bind-Value` are attributes. Use `parseRazor` for `.cshtml` files.
 * Never throws: syntax errors are returned in `errors` while parsing goes on.
 * Positions are UTF-16 offsets into `text`, with `start` inclusive and `end` exclusive.
 * @param {string} text the Razor component source to parse
 * @param {boolean=} include_text `true` to add `text`, the source slice, to every node
 * @returns {{
 *   ast: import("../public.js").Element["children"]
 *   errors: import("../public.js").AstSyntaxError[]
 * }} `ast`: the top-level nodes; `errors`: the syntax errors, each with the `start` and `end` of the problem
 * @example
 * const [ button ] = parseRazorComponent(`<button class="btn @(active ? "on" : "off")" @onclick="Toggle">+</button>`).ast
 * if (button?.type == "Element") button.attributes.map(attribute => attribute.name) // [ "class", "@onclick" ]
 */
export default function(text, include_text) {
	if (typeof text != "string") return not_string_result()
	return parse_razor_markup(text, include_text, true)
}