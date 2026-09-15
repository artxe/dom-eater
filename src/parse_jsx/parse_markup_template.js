import parse_markup from "../parse_html/parse_markup.js"
import unclosed_templates from "./unclosed_templates.js"
const escaped_backtick_regex = /(?:\\\\)*\\`/g
/**
 * @param {string} text
 * @param {import("../../public.js").AstSyntaxError[]} errors
 * @param {import("../../public.js").String} template
 * @returns {import("../../public.js").Element[]}
 */
export default function(text, errors, template) {
	const offset = template.start + 1
	const end = unclosed_templates.has(template)
		? template.end
		: template.end - 1
	let body = ""
	let position = offset
	/** @type {Map<number, import("../../public.js").Script>} */
	const substitutions = new Map()
	for (const script of template.scripts) {
		const code_start = Math.min(script.start + 2, end)
		const code_end = Math.min(
			unclosed_templates.has(script)
				? script.end
				: script.end - 1,
			end
		)
		body += text.slice(position, code_start) + " ".repeat(
			Math.max(code_end - code_start, 0)
		)
		position = Math.max(code_end, code_start)
		substitutions.set(script.start + 1, script)
	}
	body = `${body}${text.slice(position, end)}`.replace(
		escaped_backtick_regex,
		found => `${found.slice(0, -2)}  `
	)
	/** @type {import("../../public.js").AstSyntaxError[]} */
	const markup_errors = []
	const nodes = parse_markup(
		body,
		markup_errors,
		new Set(
			[ ...substitutions.keys() ].map(start => start - offset)
		)
	)
	for (const error of markup_errors) {
		error.start += offset
		error.end += offset
		let low = 0
		let high = template.scripts.length
		while (low < high) {
			const middle = low + high >>> 1
			if (/** @type {import("../../public.js").Script} */(template.scripts[middle])/**/.start <= error.start) {
				low = middle + 1
			} else {
				high = middle
			}
		}
		const script = template.scripts[low - 1]
		if (!script || script.end <= error.start) errors.push(error)
	}
	/**
	 * @param {import("../../public.js").AstNode} node
	 * @returns {import("../../public.js").Script | undefined}
	 */
	function substitution_of(node) {
		if (node.type != "Script" || node.subType != "block") return
		const script = substitutions.get(node.start + offset)
		return script?.end == node.end + offset
			? script
			: undefined
	}
	/** @type {import("../../public.js").AstNode[][]} */
	const lists = [ nodes ]
	for (let list = lists.pop(); list; list = lists.pop()) {
		for (let i = 0; i < list.length; i++) {
			const node = /** @type {import("../../public.js").AstNode} */(list[i])/**/
			const script = substitution_of(node)
			if (script) {
				list[i] = script
				const previous = list[i - 1]
				if (previous?.type == "Text" && previous.end == script.start + 1) {
					previous.end = script.start
					if (previous.start == previous.end) {
						list.splice(i - 1, 1)
						i--
					}
				}
				continue
			}
			node.start += offset
			node.end += offset
			if (node.type == "Attribute") {
				if (node.value === true) continue
				node.value.start += offset
				node.value.end += offset
				lists.push(
					node.value.type == "String"
						? node.value.scripts
						: node.value.strings
				)
			} else if (node.type == "Element") {
				lists.push(node.attributes, node.children)
			} else if (node.type == "Script") {
				lists.push(node.strings)
			} else if (node.type == "String") {
				lists.push(node.scripts)
			}
		}
	}
	/** @type {import("../../public.js").Element[]} */
	const elements = []
	for (const node of nodes) {
		if (node.type == "Element") {
			elements.push(node)
		} else if (node.type == "Script" && "elements" in node) {
			for (const element of node.elements) elements.push(element)
		}
	}
	return elements
}