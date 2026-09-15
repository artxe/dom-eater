import create_ast_syntax_error from "../create_ast_syntax_error.js"
import pug_templates from "./pug_templates.js"
const closes_p = [
	"address",
	"article",
	"aside",
	"blockquote",
	"center",
	"details",
	"dialog",
	"dir",
	"div",
	"dl",
	"fieldset",
	"figcaption",
	"figure",
	"footer",
	"form",
	"h1",
	"h2",
	"h3",
	"h4",
	"h5",
	"h6",
	"header",
	"hgroup",
	"hr",
	"listing",
	"main",
	"menu",
	"nav",
	"ol",
	"p",
	"plaintext",
	"pre",
	"search",
	"section",
	"summary",
	"table",
	"ul",
	"xmp"
]
const closes_rt = [ "rb", "rp", "rt" ]
const closes_ruby = [ "rb", "rp", "rt", "rtc" ]
const closes_table_cell = [ "caption", "colgroup", "td", "th" ]
const closes_table_section = [
	"caption",
	"colgroup",
	"tbody",
	"td",
	"tfoot",
	"th",
	"thead",
	"tr"
]
const foreign_raw_text_element_regex = /^(?:script|style)$/
/** @type {Map<string, Set<string>>} */
const implied_end_tags = new Map(
	[
		...closes_p.map(
			name => /** @type {[ string, string[] ]} */([ name, [ "p" ] ])/**/
		),
		[ "body", [ "head" ] ],
		[ "caption", closes_table_section ],
		[ "colgroup", closes_table_section ],
		[ "dd", [ "dd", "dt", "p" ] ],
		[ "dt", [ "dd", "dt", "p" ] ],
		[ "li", [ "li", "p" ] ],
		[
			"optgroup",
			[ "optgroup", "option" ]
		],
		[ "option", [ "option" ] ],
		[ "rb", closes_ruby ],
		[ "rp", closes_rt ],
		[ "rt", closes_rt ],
		[ "rtc", closes_ruby ],
		[ "tbody", closes_table_section ],
		[ "td", closes_table_cell ],
		[ "tfoot", closes_table_section ],
		[ "th", closes_table_cell ],
		[ "thead", closes_table_section ],
		[
			"tr",
			[
				"caption",
				"colgroup",
				"td",
				"th",
				"tr"
			]
		]
	].map(
		([ name, closed ]) => [
			/** @type {string} */(name)/**/,
			new Set(closed)
		]
	)
)
const optional_end_tags = new Set(
	[
		"body",
		"caption",
		"colgroup",
		"dd",
		"dt",
		"head",
		"html",
		"li",
		"optgroup",
		"option",
		"p",
		"rb",
		"rp",
		"rt",
		"rtc",
		"tbody",
		"td",
		"tfoot",
		"th",
		"thead",
		"tr"
	]
)
const raw_text_element_regex = /^(?:iframe|noembed|noframes|plaintext|script|style|textarea|title|xmp)$/
const void_element_regex = /^(?:!doctype|area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/
/**
 * @param {import("../../private.js").OpenElement[]} open_elements
 * @param {number} index
 * @returns {string}
 */
function open_element_name(open_elements, index) {
	return /** @type {import("../../private.js").OpenElement} */(open_elements[index])/**/.name
}
/**
 * @param {import("../../private.js").MarkupNode[]} nodes
 * @param {import("../../public.js").AstSyntaxError[]} errors
 * @param {Set<import("../../public.js").AstNode>} foreign_nodes
 * @returns {import("../../private.js").MarkupNode[]}
 */
export default function(nodes, errors, foreign_nodes) {
	/** @type {import("../../private.js").OpenElement[]} */
	const open_elements = [ { children: [], name: "" } ]
	/**
	 * @param {number} count
	 * @returns {void}
	 */
	function close_open_elements(count) {
		const closed = open_elements.splice(
			open_elements.length - count,
			count
		)
		for (let i = closed.length - 1; i >= 0; i--) {
			const open_element = /** @type {import("../../private.js").OpenElement} */(closed[i])/**/
			const element = /** @type {import("../../public.js").Element} */(open_element.element)/**/
			if (!optional_end_tags.has(open_element.name)) errors.push(
				create_ast_syntax_error(
					`The "${element.name}" element is not closed.`,
					element.start,
					element.end
				)
			)
		}
		let siblings = current().children
		for (const open_element of closed) {
			const element = /** @type {import("../../public.js").Element} */(open_element.element)/**/
			if (optional_end_tags.has(open_element.name)) {
				element.children = open_element.children
				siblings = element.children
			} else {
				for (const child of open_element.children) siblings.push(child)
			}
		}
		for (let i = closed.length - 1; i >= 0; i--) {
			const open_element = /** @type {import("../../private.js").OpenElement} */(closed[i])/**/
			const element = /** @type {import("../../public.js").Element} */(open_element.element)/**/
			const last_child = element.children[element.children.length - 1]
			if (optional_end_tags.has(open_element.name) && last_child) element.end = last_child.end
		}
	}
	/**
	 * @returns {import("../../private.js").OpenElement}
	 */
	function current() {
		return /** @type {import("../../private.js").OpenElement} */(open_elements[open_elements.length - 1])/**/
	}/**/
	for (const node of nodes) {
		if (node.type == "Element" && node.subType == "close") {
			const name = node.name.toLowerCase()
			let index = open_elements.length - 1
			while (index > 0 && open_element_name(open_elements, index) != name) index--
			if (index) {
				close_open_elements(
					open_elements.length - 1 - index
				)
				const open_element = /** @type {import("../../private.js").OpenElement} */(open_elements.pop())/**/
				const element = /** @type {import("../../public.js").Element} */(open_element.element)/**/
				element.children = open_element.children
				element.end = node.end
			} else {
				errors.push(
					create_ast_syntax_error(
						`The "${node.name}" close tag has no open element.`,
						node.start,
						node.end
					)
				)
				current().children.push(node)
			}
			continue
		}
		if (node.type == "Element") {
			const name = node.name.toLowerCase()
			const implied = implied_end_tags.get(name)
			if (implied) {
				let index = open_elements.length - 1
				let outermost = 0
				while (index > 0) {
					const open_name = open_element_name(open_elements, index)
					if (!optional_end_tags.has(open_name)) break
					if (implied.has(open_name)) outermost = index
					index--
				}
				if (outermost) close_open_elements(
					open_elements.length - outermost
				)
			}
			current().children.push(node)
			const raw_text_regex = foreign_nodes.has(node)
				? foreign_raw_text_element_regex
				: raw_text_element_regex
			if (node.subType == "open" && !raw_text_regex.test(name) && !void_element_regex.test(name) && !pug_templates.has(node)) {
				open_elements.push(
					{ children: [], element: node, name }
				)
			}
			continue
		}
		current().children.push(node)
	}
	close_open_elements(open_elements.length - 1)
	return current().children
}