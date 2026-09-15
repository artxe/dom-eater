import not_string_result from "../not_string_result.js"
import parse_razor_markup from "./parse_razor_markup.js"
/**
 * Parses Razor views and pages, `.cshtml` files of ASP.NET Core MVC and Razor Pages, into an element tree.
 * `@` expressions, `@{…}` code blocks, control flow such as `@if (…) {…}` and directives such as `@model` become
 * `Script` nodes holding the C# string literals in their code and the elements of the markup inside them.
 * The markup is read the way the Razor compiler reads it. Use `parseRazorComponent` for `.razor` files.
 * Never throws: syntax errors are returned in `errors` while parsing goes on.
 * Positions are UTF-16 offsets into `text`, with `start` inclusive and `end` exclusive.
 * @param {string} text the Razor source to parse
 * @param {boolean=} include_text `true` to add `text`, the source slice, to every node
 * @returns {{
 *   ast: import("../../public.js").Element["children"]
 *   errors: import("../../public.js").AstSyntaxError[]
 * }} `ast`: the top-level nodes; `errors`: the syntax errors, each with the `start` and `end` of the problem
 * @example
 * const [ ul ] = parseRazor(`<ul>@foreach (var item in Model.Items) { <li class="@item.Css">x</li> }</ul>`).ast
 * const [ loop ] = ul?.type == "Element" ? ul.children : []
 * if (loop?.type == "Script" && loop.subType == "razor") loop.elements.map(element => element.name) // [ "li" ]
 */
export default function(text, include_text) {
	if (typeof text != "string") return not_string_result()
	return parse_razor_markup(text, include_text, false)
}