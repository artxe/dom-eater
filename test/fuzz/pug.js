import {
	check_seeds,
	entry_problems,
	pick,
	random,
	test_strings
} from "./fuzz.js"
import { parsePug } from "dom-eater"
import { createRequire } from "node:module"
import lex from "pug-lexer"
const require = createRequire(import.meta.url)
const parse_tokens = /** @type {(tokens: unknown, options: { filename: string, src: string }) => unknown} */(require("pug-parser"))/**/
const strip_comments = /** @type {(tokens: unknown, options: { filename: string }) => unknown} */(require("pug-strip-comments"))/**/
const fixtures = [
	"doctype html\nhtml(lang=\"en\")\n  head\n    title= pageTitle\n    script(type='text/javascript').\n      if (foo) bar(1 + 5)\n  body\n    h1#title.main Pug - node template engine\n    #container.col\n      if youAreUsingPug\n        p You are amazing\n      else\n        p Get on it!\n      p.\n        Pug is a terse and simple templating language.\n",
	"extends layout\nblock content\n  - var items = [\"a\", 'b']\n  ul.list(data-count=items.length)\n    each item, i in items\n      li(class=\"item-\" + i, title=`${item}`)= item\n    else\n      li.empty No items\n",
	"mixin card(title)\n  .card&attributes(attributes)\n    h2.card-title= title\n    if block\n      block\n+card('Hello')(class=\"wide\")\n  p Body #[strong.x bold] and #[a(href=\"/\") link]\n",
	"case kind\n  when \"a\"\n    p.a(style={color: 'red'}) A\n  when \"b\": p.b B\n  default\n    p(data-x=[1, 2]) other\n//- hidden\n// shown\ndiv(class=['a', \"b\"] id=name + '-x')\n  | text #{value} !{raw}\n",
	"table\n  thead: tr: th(scope=\"col\") Name\n  tbody\n    while n < 3\n      tr(class={active: n == 1})\n        td= n\ninput(type=\"checkbox\" checked disabled=false)\na(href=url, target=\"_blank\")&attributes({rel: 'noopener'}) Go\n",
	"script.\n  const a = \"<p>\"\nstyle.\n  .a { color: red }\ndiv\n  <p class=\"raw\">html</p>\n  p: span.inline(title='x') nested\n  img(src=\"a.png\" alt='')/\n"
]
const mutations = [
	"\n",
	" ",
	"!",
	"!= ",
	"\"",
	"#",
	"#[",
	"#{",
	"${",
	"&attributes(a)",
	"'",
	"(",
	"(a='x' + y)",
	"(a=b c=d)",
	")",
	"+m",
	",",
	"- ",
	".",
	"/",
	"//",
	"/re/",
	":",
	"= ",
	"?",
	"[",
	"\\",
	"]",
	"`",
	"a",
	"div",
	"{",
	"|",
	"}",
	"  "
]
/**
 * @param {string} source
 * @returns {Set<string>}
 */
function dom_eater_items(source) {
	/** @type {Set<string>} */
	const items = new Set()
	/**
	 * @param {import("dom-eater").AstNode} node
	 * @param {number} parent
	 * @returns {void}
	 */
	function visit(node, parent) {
		if (node.type == "Element") {
			items.add(
				`element ${node.start} ${JSON.stringify(node.name)} parent=${parent}`
			)
			for (const attribute of node.attributes) {
				if (attribute.name == "") {
					if (attribute.value !== true && attribute.value.type == "Script" && source.startsWith("&attributes", attribute.start)) {
						items.add(
							`&attributes ${attribute.start}-${attribute.end}`
						)
					}
					continue
				}
				const value = attribute.value === true
					? "true"
					: JSON.stringify(
						source.slice(
							attribute.value.start,
							attribute.value.end
						)
					)
				items.add(
					`attribute ${attribute.start}-${attribute.end} ${JSON.stringify(attribute.name)} ${value}`
				)
				if (attribute.value !== true) visit(attribute.value, parent)
			}
			for (const child of node.children) visit(child, node.start)
		} else if (node.type == "Script") {
			if ("elements" in node) {
				for (const element of node.elements) visit(element, parent)
			}
		}
	}
	for (const node of parsePug(source).ast) visit(node, -1)
	return items
}
/**
 * @param {number} seed
 * @returns {string}
 */
export function mutated_template(seed) {
	const next = random(seed)
	let source = normalize(
		pick(
			next,
			next() < 0.5 ? fixtures : test_strings("parse_pug")
		)
	)
	const count = 1 + Math.floor(next() * 3)
	for (let i = 0; i < count; i++) {
		const at = Math.floor(next() * (source.length + 1))
		source = next() < 0.5
			? source.slice(0, at) + pick(next, mutations) + source.slice(at)
			: source.slice(0, at) + source.slice(
				at + 1 + Math.floor(next() * 3)
			)
	}
	return source
}
/**
 * @param {string} source
 * @returns {string}
 */
function normalize(source) {
	return source.replace(/^﻿/, "").replace(/\r\n?/g, "\n")
}
/**
 * @param {number} count
 * @returns {void}
 */
export function pug_differential(count) {
	check_seeds(
		"pug",
		count,
		mutated_template,
		source => [
			...entry_problems("parse_pug", source),
			...pug_problems(source) ?? []
		]
	)
}
/**
 * @returns {string[]}
 */
export function pug_fixture_problems() {
	return fixtures.flatMap(
		source => (pug_problems(source) ?? [ "rejected by Pug" ]).map(
			problem => `${JSON.stringify(source)}\n${problem}`
		)
	)
}
/**
 * @param {string} source
 * @returns {Set<string> | undefined}
 */
function pug_items(source) {
	/** @type {import("pug-lexer").Token[]} */
	let tokens
	/** @type {unknown} */
	let ast
	const { warn } = console
	// eslint-disable-next-line no-console
	console.warn = () => {}
	try {
		tokens = lex(source, { filename: "x.pug" })
		ast = parse_tokens(
			strip_comments(tokens, { filename: "x.pug" }),
			{ filename: "x.pug", src: source }
		)
	} catch {
		return undefined
	} finally {
		// eslint-disable-next-line no-console
		console.warn = warn
	}
	const line_starts = [ 0 ]
	for (let i = 0; i < source.length; i++) {
		if (source[i] == "\n") line_starts.push(i + 1)
	}
	/**
	 * @param {{ column: number, line: number }} position
	 * @returns {number}
	 */
	function offset(position) {
		return /** @type {number} */(line_starts[position.line - 1])/**/ + position.column - 1
	}
	/** @type {Set<string>} */
	const items = new Set()
	/** @type {Map<number, string>} */
	const attribute_items = new Map()
	let in_filter = false
	for (const [ i, token ] of tokens.entries()) {
		const start = offset(token.loc.start)
		const range = `${start}-${offset(token.loc.end)}`
		if (token.type == "start-attributes") in_filter = tokens[i - 1]?.type == "filter"
		else if (token.type == "end-attributes") in_filter = false
		else if (token.type == "&attributes") attribute_items.set(start, `&attributes ${range}`)
		else if (token.type == "class" || token.type == "id") attribute_items.set(
			start,
			`attribute ${range} "${token.type}" ${JSON.stringify(token.val)}`
		)
		else if (token.type == "attribute" && !in_filter && token.name) attribute_items.set(
			start,
			`attribute ${range} ${JSON.stringify(token.name)} ${token.val === true ? "true" : JSON.stringify(String(token.val))}`
		)
	}
	/**
	 * @param {unknown} node
	 * @param {number} parent
	 * @returns {void}
	 */
	function visit(node, parent) {
		if (!node || typeof node != "object") return
		if (Array.isArray(node)) {
			for (const child of node) visit(child, parent)
			return
		}
		const record = /** @type {Record<string, unknown>} */(node)/**/
		let inner = parent
		const name = record["type"] == "Tag"
			? record["name"]
			: record["type"] == "Mixin" && record["call"]
				? `+${String(record["name"])}`
				: record["type"] == "InterpolatedTag"
					? `#{${String(record["expr"])}}`
					: undefined
		if (name != undefined) {
			inner = offset(
				{
					column: Number(record["column"]),
					line: Number(record["line"])
				}
			)
			items.add(
				`element ${inner} ${JSON.stringify(name)} parent=${parent}`
			)
			for (const attribute of [
				.../** @type {{ column: number, line: number }[]} */(record["attributeBlocks"] ?? [])/**/,
				.../** @type {{ column: number, line: number }[]} */(record["attrs"] ?? [])/**/
			]) {
				const item = attribute_items.get(offset(attribute))
				if (item != undefined) items.add(item)
			}
		}
		for (const key of [
			"alternate",
			"block",
			"code",
			"consequent",
			"nodes"
		]) visit(record[key], inner)
	}
	visit(ast, -1)
	return items
}
/**
 * @param {string} source
 * @returns {string[] | undefined}
 */
export function pug_problems(source) {
	if (/\+[\t ]*\n|\+[\t ]*(?:[-\w]+|#\{[^\n}]*\}) +\((?!\s*[-\w]+ *=)|&attributes\([^)]*\n|\\#\[/.test(source)) return undefined
	const reference = pug_items(source)
	if (!reference) return undefined
	const actual = dom_eater_items(source)
	return [
		...[ ...reference ].filter(item => !actual.has(item)).map(item => `pug only: ${item}`),
		...[ ...actual ].filter(item => !reference.has(item)).map(
			item => `dom-eater only: ${item}`
		)
	]
}