import create_ast_syntax_error from "../create_ast_syntax_error.js"
import set_text from "../set_text.js"
import parse_document from "./parse_document.js"
/**
 * @param {import("../../private.js").MarkupNode[]} nodes
 * @param {number} start
 * @param {number} end
 * @returns {import("../../private.js").MarkupNode[]}
 */
function fill_text(nodes, start, end) {
	/** @type {import("../../private.js").MarkupNode[]} */
	const filled = []
	let text_start = start
	for (const node of nodes) {
		if (node.start > text_start) {
			filled.push(
				{
					end: node.start,
					start: text_start,
					type: "Text"
				}
			)
		}
		filled.push(node)
		text_start = Math.max(text_start, node.end)
	}
	if (end > text_start) {
		filled.push(
			{
				end,
				start: text_start,
				type: "Text"
			}
		)
	}
	return filled
}
/**
 * @param {import("../../private.js").RazorContext} ctx
 * @param {import("../../public.js").AstNode[]} nodes
 * @returns {void}
 */
function fill_texts(ctx, nodes) {
	const pending = [ ...nodes ]
	for (let node = pending.pop(); node; node = pending.pop()) {
		if (node.type == "Attribute") {
			if (node.value !== true) pending.push(node.value)
		} else if (node.type == "Element") {
			const body = ctx.bodies.get(node)
			if (body) node.children = fill_text(node.children, body[0], body[1])
			for (const attribute of node.attributes) pending.push(attribute)
			for (const child of node.children) pending.push(child)
		} else if (node.type == "Script") {
			if ("elements" in node) {
				for (const element of node.elements) pending.push(element)
			}
		} else if (node.type == "String") {
			for (const script of node.scripts) pending.push(script)
		}
	}
}
/**
 * @param {string} text
 * @param {boolean | undefined} include_text
 * @param {boolean} component
 * @returns {{
 *   ast: import("../../private.js").MarkupNode[]
 *   errors: import("../../public.js").AstSyntaxError[]
 * }}
 */
export default function(text, include_text, component) {
	/** @type {import("../../public.js").AstSyntaxError[]} */
	const errors = []
	try {
		/** @type {import("../../private.js").RazorContext} */
		const ctx = {
			balance_failures: new Set(),
			bodies: new Map(),
			component,
			errors,
			in_template: false,
			nested: false,
			null_generate: false,
			script: undefined,
			single_line: false,
			statement_ends: new Set(),
			text
		}
		const ast = fill_text(
			parse_document(ctx),
			0,
			text.length
		)
		fill_texts(ctx, ast)
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