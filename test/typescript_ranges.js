import { collect } from "./helpers.js"
import { parseHtml, parseJsx, parseScript } from "dom-eater"
import ts from "typescript"
import { expect } from "vitest"
const jsx_kinds = new Set(
	[
		ts.SyntaxKind.JsxElement,
		ts.SyntaxKind.JsxFragment,
		ts.SyntaxKind.JsxSelfClosingElement
	]
)
const string_kinds = new Set(
	[
		ts.SyntaxKind.NoSubstitutionTemplateLiteral,
		ts.SyntaxKind.StringLiteral
	]
)
const template_kinds = new Set(
	[
		ts.SyntaxKind.TemplateExpression,
		ts.SyntaxKind.TemplateLiteralType
	]
)
/**
 * @param {string} code
 * @param {boolean} jsx
 * @returns {{ elements: number[][], strings: number[][] | undefined }}
 */
export function dom_eater_ranges(code, jsx) {
	const result = (jsx ? parseJsx : parseScript)(code)
	expect(result.errors).toStrictEqual([])
	/** @type {[ number, number ][]} */
	const elements = collect(result.ast, "Element")
		.map(
			node => [ node.start, node.end ]
		)
	elements.sort(
		(a, b) => a[0] - b[0] || b[1] - a[1]
	)
	if (elements.length) return { elements, strings: undefined }
	const source = parse_typescript(code, jsx)
	const prefix = "externalModuleIndicator" in source && source.externalModuleIndicator
		? "{async () => {\n"
		: "{() => {\n"
	const html = parseHtml(`${prefix}${code}\n}}`)
	expect(html.errors).toStrictEqual([])
	return {
		elements,
		strings: html.ast[0]?.type == "Script"
			? html.ast[0].strings.map(
				node => [
					node.start - prefix.length,
					node.end - prefix.length
				]
			)
			: []
	}
}
/**
 * @param {string} code
 * @param {boolean} jsx
 * @returns {import("typescript").SourceFile}
 */
function parse_typescript(code, jsx) {
	return jsx
		? ts.createSourceFile(
			"x.tsx",
			code,
			ts.ScriptTarget.Latest,
			true,
			ts.ScriptKind.TSX
		)
		: ts.createSourceFile(
			"x.ts",
			code,
			ts.ScriptTarget.Latest,
			true,
			ts.ScriptKind.TS
		)
}
/**
 * @param {string} code
 * @param {boolean} jsx
 * @returns {{ elements: number[][], strings: number[][] | undefined }}
 */
export function typescript_ranges(code, jsx) {
	const source = parse_typescript(code, jsx)
	/** @type {import("typescript").Diagnostic[]} */
	const diagnostics = Reflect.get(source, "parseDiagnostics")
	expect(
		diagnostics.map(
			diagnostic => ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")
		)
	).toStrictEqual([])
	/** @type {[ number, number ][]} */
	const elements = []
	/** @type {number[][]} */
	const strings = []
	/**
	 * @param {import("typescript").Node} node
	 * @param {boolean} in_template
	 * @returns {void}
	 */
	function visit(node, in_template) {
		if (jsx_kinds.has(node.kind)) elements.push(
			[ node.getStart(source), node.end ]
		)
		const literal = string_kinds.has(node.kind) && node.parent.kind != ts.SyntaxKind.JsxAttribute
			|| template_kinds.has(node.kind)
		if (literal && !in_template) strings.push(
			[ node.getStart(source), node.end ]
		)
		ts.forEachChild(
			node,
			child => visit(
				child,
				in_template || template_kinds.has(node.kind)
			)
		)
	}
	visit(source, false)
	elements.sort(
		(a, b) => a[0] - b[0] || b[1] - a[1]
	)
	return {
		elements,
		strings: elements.length
			? undefined
			: strings
	}
}