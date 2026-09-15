import parse_script_block from "../../parse_script_block.js"
const stop_attribute_unquoted_regex = /[\s>{]/
/**
 * @param {string} text
 * @param {import("../../../../public.js").AstSyntaxError[]} errors
 * @param {number} start
 * @returns {import("../../../../public.js").String & { subType: "unquoted" }}
 */
export default function(text, errors, start) {
	let child_pre_index = start
	/** @type {import("../../../../private.js").MarkupScript[]} */
	const scripts = []
	for (;;) {
		const child_index = text.slice(child_pre_index).search(stop_attribute_unquoted_regex)
		const index = child_index < 0
			? text.length
			: child_pre_index + child_index
		if (text[index] != "{") {
			return {
				end: index,
				scripts,
				start,
				subType: "unquoted",
				type: "String"
			}
		}
		const node = parse_script_block(text, errors, index)
		scripts.push(node)
		child_pre_index = node.end
	}
}