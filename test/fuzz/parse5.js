/** @import { DefaultTreeAdapterTypes } from "parse5" */
import { last_element, pick, random } from "./fuzz.js"
import { parseHtml } from "dom-eater"
import { parse, parseFragment } from "parse5"
const attributes = [
	" class=\"a b\"",
	" hidden",
	" id='x'",
	" title=t"
]
/** @type {Record<string, string[]>} */
const children = {
	a: [ "b", "span" ],
	b: [ "span" ],
	button: [ "span" ],
	caption: [ "span" ],
	col: [],
	colgroup: [ "col" ],
	dd: [ "div", "p" ],
	div: [
		"a",
		"b",
		"div",
		"dl",
		"form",
		"h1",
		"img",
		"p",
		"ruby",
		"section",
		"select",
		"span",
		"table",
		"ul"
	],
	dl: [ "dd", "dt" ],
	dt: [ "span" ],
	form: [ "button", "input", "p", "select" ],
	h1: [ "br", "span" ],
	img: [],
	input: [],
	li: [ "div", "ol", "p", "span", "ul" ],
	ol: [ "li" ],
	optgroup: [ "option" ],
	option: [],
	p: [
		"b",
		"br",
		"button",
		"img",
		"ruby",
		"select",
		"span"
	],
	pre: [ "span" ],
	rb: [],
	root: [
		"a",
		"b",
		"button",
		"div",
		"dl",
		"form",
		"h1",
		"ol",
		"p",
		"pre",
		"ruby",
		"section",
		"select",
		"span",
		"table",
		"ul"
	],
	rp: [],
	rt: [],
	ruby: [ "rb", "rp", "rt" ],
	section: [ "div", "h1", "p", "ul" ],
	select: [ "optgroup", "option" ],
	span: [ "b", "br" ],
	table: [
		"caption",
		"colgroup",
		"tbody",
		"tfoot",
		"thead"
	],
	tbody: [ "tr" ],
	td: [ "div", "p", "span", "table" ],
	tfoot: [ "tr" ],
	th: [ "span" ],
	thead: [ "tr" ],
	tr: [ "td", "th" ],
	ul: [ "li" ]
}
const optional_end_tags = new Set(
	[
		"caption",
		"colgroup",
		"dd",
		"dt",
		"li",
		"optgroup",
		"option",
		"p",
		"rb",
		"rp",
		"rt",
		"tbody",
		"td",
		"tfoot",
		"th",
		"thead",
		"tr"
	]
)
const textless = new Set(
	[
		"colgroup",
		"dl",
		"ol",
		"optgroup",
		"select",
		"table",
		"tbody",
		"tfoot",
		"thead",
		"tr",
		"ul"
	]
)
const void_elements = new Set(
	[ "br", "col", "img", "input" ]
)
/**
 * @param {string} source
 * @param {() => number} next
 * @returns {string[]}
 */
export function completion_problems(source, next) {
	/** @type {[ number, number ][]} */
	const quoted = []
	for (const match of source.matchAll(
		/<[a-z\d]+[^>]*? (?:class|id)=(["'])[^"']*\1/g
	)) {
		quoted.push(
			[
				match.index,
				match.index + match[0].length
			]
		)
	}
	if (!quoted.length) return []
	const [ start, end ] = pick(next, quoted)
	const value_start = source.lastIndexOf("=", end) + 2
	const cursor = value_start + Math.floor(next() * (end - value_start))
	const typed = source.slice(0, cursor)
	const element = last_element(parseHtml(typed).ast)
	const found = {
		attribute: element?.attributes[element.attributes.length - 1]?.end,
		element: element && [ element.start, element.end ]
	}
	return found.attribute == cursor && found.element?.[0] == start && found.element[1] == cursor
		? []
		: [
			`typed ${JSON.stringify(typed)}: ${JSON.stringify(found)}`
		]
}
/**
 * @param {string} source
 * @returns {{ ends: Map<number, number>, items: Set<string> }}
 */
function dom_eater_items(source) {
	const { ast } = parseHtml(source)
	/** @type {Map<number, number>} */
	const ends = new Map()
	/** @type {Set<string>} */
	const items = new Set()
	/**
	 * @param {import("dom-eater").AstNode} node
	 * @param {number} parent
	 * @returns {void}
	 */
	function visit(node, parent) {
		if (node.type != "Element" || node.subType == "close" || node.name.startsWith("!")) return
		items.add(
			`element ${node.start} ${node.name.toLowerCase()} parent=${parent}`
		)
		for (const attribute of node.attributes) items.add(
			`attribute ${attribute.start}-${attribute.end} ${attribute.name.toLowerCase()}`
		)
		ends.set(node.start, node.end)
		for (const child of node.children) visit(child, node.start)
	}
	for (const node of ast) visit(node, -1)
	return { ends, items }
}
/**
 * @param {number} seed
 * @returns {string}
 */
export function html_document(seed) {
	const next = random(seed)
	let budget = 25
	/**
	 * @param {string} tag
	 * @param {number} depth
	 * @returns {string}
	 */
	function generate(tag, depth) {
		let source = tag == "root"
			? ""
			: `<${tag}${next() < 0.3 ? pick(next, attributes) : ""}>`
		if (void_elements.has(tag)) return source
		const kids = children[tag] ?? []
		const count = depth > 5 || !kids.length ? 0 : Math.floor(next() * 4)
		for (let i = 0; i < count && budget-- > 0; i++) {
			if (!textless.has(tag) && next() < 0.2) source += "t"
			source += generate(pick(next, kids), depth + 1)
		}
		if (tag != "root" && !(optional_end_tags.has(tag) && next() < 0.6)) source += `</${tag}>`
		return source
	}
	return generate("root", 0)
}
/**
 * @param {string} source
 * @returns {{ ends: Map<number, number>, items: Set<string> }}
 */
function parse5_items(source) {
	const options = { sourceCodeLocationInfo: true }
	const root = /^\s*<(?:!doctype|body|head|html)/i.test(source)
		? parse(source, options)
		: parseFragment(source, options)
	/** @type {Map<number, number>} */
	const ends = new Map()
	/** @type {Set<string>} */
	const items = new Set()
	/**
	 * @param {DefaultTreeAdapterTypes.Node} node
	 * @param {number} parent
	 * @returns {void}
	 */
	function visit(node, parent) {
		let inner = parent
		const location = "tagName" in node ? node.sourceCodeLocation : undefined
		if ("tagName" in node && location?.startTag) {
			const start = location.startTag.startOffset
			items.add(
				`element ${start} ${node.tagName} parent=${parent}`
			)
			for (const attribute of node.attrs) {
				const range = location.attrs?.[attribute.name]
				if (range) items.add(
					`attribute ${range.startOffset}-${range.endOffset} ${attribute.name}`
				)
			}
			if (location.endTag) ends.set(start, location.endTag.endOffset)
			inner = start
		}
		if ("childNodes" in node) {
			for (const child of node.childNodes) visit(child, inner)
		}
		if ("content" in node) visit(node.content, inner)
	}
	visit(root, -1)
	return { ends, items }
}
/**
 * @param {string} source
 * @returns {string[]}
 */
export function parse5_problems(source) {
	const reference = parse5_items(source)
	const actual = dom_eater_items(source)
	return [
		...[ ...reference.items ].filter(
			item => !actual.items.has(item)
		).map(item => `parse5 only: ${item}`),
		...[ ...actual.items ].filter(
			item => !reference.items.has(item)
		).map(
			item => `dom-eater only: ${item}`
		),
		...[ ...reference.ends ]
			.filter(
				([ start, end ]) => actual.ends.has(start) && actual.ends.get(start) != end
			)
			.map(
				([ start, end ]) => `end of ${start}: parse5 ${end}, dom-eater ${actual.ends.get(start)}`
			)
	]
}