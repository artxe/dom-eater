/** @import { AstNode, AstSyntaxError, Attribute, Comment, Element, Script, String as StringNode, Style, Text } from "dom-eater" */
import {
	parseHtml,
	parseJsx,
	parsePug,
	parseRazor,
	parseRazorComponent,
	parseScript
} from "dom-eater"
import { readFileSync } from "node:fs"
import { expect } from "vitest"
/**
 * @template T
 * @typedef {T extends readonly (infer U)[]
 *   ? Positionless<U>[]
 *   : T extends object
 *     ? { [K in keyof T as Exclude<K, "end" | "start">]: Positionless<T[K]> }
 *     : T} Positionless
 */
const node_types = [
	"Attribute",
	"Comment",
	"Element",
	"Script",
	"String",
	"Style",
	"Text"
]
/**
 * @param {string} text
 * @param {string} name
 * @param {Positionless<Attribute["value"]>} [value]
 * @returns {Positionless<Attribute>}
 */
export function attribute_node(text, name, value = true) {
	return { name, text, type: "Attribute", value }
}
/**
 * @param {string} source
 * @param {{ ast: AstNode[], errors: AstSyntaxError[] }} result
 * @param {boolean} include_text
 * @returns {void}
 */
export function check_invariants(source, result, include_text) {
	/**
	 * @param {AstNode[]} nodes
	 * @param {number} min
	 * @param {number} max
	 * @param {string} path
	 * @returns {void}
	 */
	function check_list(nodes, min, max, path) {
		let previous_end = min
		nodes.forEach(
			(node, i) => {
				check_node(
					node,
					previous_end,
					max,
					`${path}[${i}]`
				)
				previous_end = node.end
			}
		)
	}
	/**
	 * @param {AstNode} node
	 * @param {number} min
	 * @param {number} max
	 * @param {string} path
	 * @returns {void}
	 */
	function check_node(node, min, max, path) {
		expect(node_types, `${path}.type`).toContain(node.type)
		expect(node.start, `${path}.start`).toBeGreaterThanOrEqual(min)
		expect(node.end, `${path}.end`).toBeGreaterThanOrEqual(node.start)
		expect(node.end, `${path}.end`).toBeLessThanOrEqual(max)
		if (include_text) {
			expect(node.text, `${path}.text`).toBe(
				source.slice(node.start, node.end)
			)
		} else {
			expect(node, path).not.toHaveProperty("text")
		}
		if (node.type == "Attribute") {
			if (node.value !== true) {
				check_node(
					node.value,
					node.start,
					node.end,
					`${path}.value`
				)
			}
		} else if (node.type == "Element") {
			check_list(
				node.attributes,
				node.start,
				node.end,
				`${path}.attributes`
			)
			const last_attribute = node.attributes[node.attributes.length - 1]
			check_list(
				node.children,
				last_attribute ? last_attribute.end : node.start,
				node.end,
				`${path}.children`
			)
		} else if (node.type == "Script") {
			check_list(
				"elements" in node ? node.elements : [],
				node.start,
				node.end,
				`${path}.elements`
			)
			check_list(
				node.strings,
				node.start,
				node.end,
				`${path}.strings`
			)
		} else if (node.type == "String") {
			check_list(
				node.scripts,
				node.start,
				node.end,
				`${path}.scripts`
			)
		} else if (node.type == "Text") {
			expect(node.end, `${path} is empty`).toBeGreaterThan(node.start)
		}
	}
	check_list(result.ast, 0, source.length, "ast")
	result.errors.forEach(
		(error, i) => {
			expect(error, `errors[${i}]`).toBeInstanceOf(Error)
			expect(error.end, `errors[${i}].end`).toBeGreaterThanOrEqual(error.start)
			expect(error.end, `errors[${i}].end`).toBeLessThanOrEqual(source.length)
			expect(error.name, `errors[${i}].name`).toBe("AstSyntaxError")
			expect(
				error.start,
				`errors[${i}].start`
			).toBeGreaterThanOrEqual(0)
		}
	)
}
/**
 * @param {(text: string) => { ast: AstNode[], errors: AstSyntaxError[] }} parse
 * @returns {void}
 */
export function check_non_string_input(parse) {
	for (const input of [
		1,
		null,
		undefined,
		[ "<p>" ],
		{ length: 1 }
	]) {
		const result = parse(
			/** @type {string} */(/** @type {unknown} */(input))/**/
		)
		expect(result.ast, String(input)).toStrictEqual([])
		expect(
			result.errors.map(
				({ end, message, name, start }) => ({ end, message, name, start })
			),
			String(input)
		).toStrictEqual(
			[
				{
					end: 0,
					message: "The input is not a string.",
					name: "AstSyntaxError",
					start: 0
				}
			]
		)
	}
}
/**
 * @param {(AstNode | Positionless<AstNode>)[]} ast
 * @returns {(string | undefined)[]}
 */
export function class_attributes(ast) {
	return collect(ast, "Attribute")
		.filter(
			node => node.name == "class" || node.name == "className"
		)
		.map(node => node.text)
}
/**
 * @template {AstNode | Positionless<AstNode>} N
 * @template {AstNode["type"]} T
 * @param {N[]} ast
 * @param {T} type
 * @returns {Extract<N, { type: T }>[]}
 */
export function collect(ast, type) {
	/** @type {Positionless<AstNode>[]} */
	const found = []
	/**
	 * @param {Positionless<AstNode>} node
	 * @returns {void}
	 */
	function visit(node) {
		if (node.type == type) found.push(node)
		if (node.type == "Attribute") {
			if (node.value !== true) visit(node.value)
		} else if (node.type == "Element") {
			node.attributes.forEach(visit)
			node.children.forEach(visit)
		} else if (node.type == "Script") {
			if ("elements" in node) node.elements.forEach(visit)
			node.strings.forEach(visit)
		} else if (node.type == "String") {
			node.scripts.forEach(visit)
		}
	}
	ast.forEach(visit)
	return /** @type {Extract<N, { type: T }>[]} */(found)/**/
}
/**
 * @param {string} text
 * @returns {Positionless<Comment>}
 */
export function comment_node(text) {
	return { text, type: "Comment" }
}
/**
 * @param {(text: string, include_text?: true) => { ast: AstNode[], errors: AstSyntaxError[] }} parse
 * @returns {(source: string) => { ast: Positionless<AstNode>[], errors: { end: number, message: string, start: number }[] }}
 */
function create_parser(parse) {
	return source => {
		const result = parse(source, true)
		check_invariants(source, result, true)
		return {
			ast: /** @type {Positionless<AstNode>[]} */(strip_positions(result.ast))/**/,
			errors: result.errors.map(
				({ end, message, start }) => ({ end, message, start })
			)
		}
	}
}
/**
 * @param {(AstNode | Positionless<AstNode>)[]} ast
 * @returns {string[]}
 */
export function element_names(ast) {
	return collect(ast, "Element").map(node => node.name)
}
/**
 * @param {string} text
 * @param {string} name
 * @param {"close" | "closed" | "open"} sub_type
 * @param {Positionless<Attribute>[]} [attributes]
 * @param {Positionless<Element["children"][number]>[]} [children]
 * @returns {Positionless<Element>}
 */
export function element_node(
	text,
	name,
	sub_type,
	attributes = [],
	children = []
) {
	return {
		attributes,
		children,
		name,
		subType: sub_type,
		text,
		type: "Element"
	}
}
export const html = create_parser(parseHtml)
export const jsx = create_parser(parseJsx)
/**
 * @param {string} text
 * @param {Positionless<StringNode>[]} [strings]
 * @param {Positionless<Element>[]} [elements]
 * @returns {Positionless<Script> & { subType: "jsx" }}
 */
export function jsx_node(text, strings = [], elements = []) {
	return {
		elements,
		strings,
		subType: "jsx",
		text,
		type: "Script"
	}
}
export const pug = create_parser(parsePug)
/**
 * @param {string} text
 * @param {Positionless<StringNode>[]} [strings]
 * @returns {Positionless<Script> & { subType: "pug" }}
 */
export function pug_node(text, strings = []) {
	return {
		strings,
		subType: "pug",
		text,
		type: "Script"
	}
}
export const razor = create_parser(parseRazor)
export const razor_component = create_parser(parseRazorComponent)
/**
 * @param {string} source
 * @param {(text: string, include_text?: true) => { ast: AstNode[], errors: AstSyntaxError[] }} parse
 * @returns {string[]}
 */
export function razor_items(source, parse) {
	const result = parse(source, true)
	check_invariants(source, result, true)
	/** @type {string[]} */
	const items = []
	const pending = [ ...result.ast ]
	for (let node = pending.pop(); node; node = pending.pop()) {
		if (node.type == "Element") {
			items.push(
				`element ${node.start}-${node.end} ${node.subType} ${JSON.stringify(node.name)}`
			)
			for (const attribute of node.attributes) {
				if (attribute.name == "" && attribute.value !== true && attribute.value.type == "Script") {
					pending.push(attribute.value)
					continue
				}
				const value = attribute.value === true
					? "true"
					: `${attribute.value.start}-${attribute.value.end}`
				items.push(
					`attribute ${attribute.start}-${attribute.end} ${JSON.stringify(attribute.name)} ${value}`
				)
				if (attribute.value !== true && attribute.value.type == "String") {
					for (const script of attribute.value.scripts) pending.push(script)
				}
			}
			for (const child of node.children) pending.push(child)
		} else if (node.type == "Script") {
			items.push(
				`script ${node.start}-${node.end}`
			)
			for (const string of node.strings) items.push(
				`string ${string.start}-${string.end}`
			)
			if ("elements" in node) {
				for (const element of node.elements) pending.push(element)
			}
		} else if (node.type == "Comment" && source.startsWith("@*", node.start)) {
			items.push(
				`comment ${node.start}-${node.end}`
			)
		}
	}
	return items.sort()
}
/**
 * @param {string} text
 * @param {Positionless<StringNode>[]} [strings]
 * @param {Positionless<Element>[]} [elements]
 * @returns {Positionless<Script> & { subType: "razor" }}
 */
export function razor_node(text, strings = [], elements = []) {
	return {
		elements,
		strings,
		subType: "razor",
		text,
		type: "Script"
	}
}
/**
 * @param {string} name
 * @returns {{ expected: unknown, source: string }}
 */
export function readme_example(name) {
	const readme = readFileSync(
		new URL("../README.md", import.meta.url),
		"utf8"
	).replace(/\r\n/g, "\n")
	const match = readme.match(
		new RegExp(
			`${name}\\(\`((?:[^\`\\\\]|\\\\.)*)\`\\)[\\s\\S]*?\`\`\`json\\n([\\s\\S]*?)\`\`\``
		)
	)
	expect(match).not.toBeNull()
	return {
		expected: JSON.parse(String(match?.[2])),
		source: String(match?.[1]).replace(/\\([\\$`])/g, "$1")
	}
}
export const script = create_parser(parseScript)
/**
 * @template {"block" | "content" | "template"} S
 * @param {string} text
 * @param {S} sub_type
 * @param {Positionless<StringNode>[]} [strings]
 * @returns {Positionless<Script> & { subType: S }}
 */
export function script_node(text, sub_type, strings = []) {
	const node = {
		strings,
		subType: sub_type,
		text,
		type: "Script"
	}
	return /** @type {Positionless<Script> & { subType: S }} */(node)/**/
}
/**
 * @template {StringNode["subType"]} S
 * @param {string} text
 * @param {S} sub_type
 * @param {Positionless<Script>[]} [scripts]
 * @returns {Positionless<StringNode> & { subType: S }}
 */
export function string_node(text, sub_type, scripts = []) {
	const node = {
		scripts,
		subType: sub_type,
		text,
		type: "String"
	}
	return /** @type {Positionless<StringNode> & { subType: S }} */(node)/**/
}
/**
 * @param {unknown} value
 * @returns {unknown}
 */
function strip_positions(value) {
	if (Array.isArray(value)) return value.map(strip_positions)
	if (value && typeof value == "object") {
		return Object.fromEntries(
			Object.entries(value)
				.filter(
					([ key ]) => key != "end" && key != "start"
				)
				.map(
					([ key, child ]) => [ key, strip_positions(child) ]
				)
		)
	}
	return value
}
/**
 * @param {string} text
 * @returns {Positionless<Style>}
 */
export function style_node(text) {
	return { text, type: "Style" }
}
/**
 * @param {string} text
 * @param {Positionless<StringNode>[]} [strings]
 * @param {Positionless<Element>[]} [elements]
 * @returns {Positionless<Extract<Script, { elements: Element[] }>> & { subType: "template" }}
 */
export function template_node(text, strings = [], elements = []) {
	return {
		elements,
		strings,
		subType: "template",
		text,
		type: "Script"
	}
}
/**
 * @param {string} text
 * @returns {Positionless<Text>}
 */
export function text_node(text) {
	return { text, type: "Text" }
}