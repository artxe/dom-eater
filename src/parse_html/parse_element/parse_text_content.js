import create_ast_syntax_error from "../../create_ast_syntax_error.js"
import parse_script_block from "../parse_script_block.js"
/**
 * @param {string} text
 * @param {import("../../../public.js").AstSyntaxError[]} errors
 * @param {number} start
 * @param {string} name
 * @returns {{ children: import("../../../private.js").MarkupNode[], end: number }}
 */
export default function(text, errors, start, name) {
	const end_index = text.slice(start).search(
		new RegExp(`<\\/${name}(?=[\\s/>])`, "i")
	)
	const end = end_index < 0
		? text.length
		: start + end_index
	const content = text.slice(0, end)
	/** @type {import("../../../private.js").MarkupNode[]} */
	const children = []
	let child_pre_index = start
	for (;;) {
		const child_index = content.indexOf("{", child_pre_index)
		const index = child_index < 0
			? end
			: child_index
		if (index > child_pre_index) {
			children.push(
				{
					end: index,
					start: child_pre_index,
					type: "Text"
				}
			)
		}
		if (child_index < 0) break
		const node = parse_script_block(content, errors, index)
		children.push(node)
		child_pre_index = node.end
	}
	if (end_index < 0) {
		errors.push(
			create_ast_syntax_error(
				`The "${name}" element is not closed.`,
				start,
				text.length
			)
		)
	}
	return { children, end }
}