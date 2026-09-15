import create_ast_syntax_error from "../../../create_ast_syntax_error.js"
import parse_script_block from "../../parse_script_block.js"
const stop_attribute_double_quotes_regex = /["{]/
const stop_attribute_single_quotes_regex = /['{]/
/**
 * @param {string} text
 * @param {import("../../../../public.js").AstSyntaxError[]} errors
 * @param {number} start
 * @param {import("../../../../private.js").Bracket} [bracket]
 * @returns {import("../../../../public.js").String & { subType: "double" | "single" }}
 */
export default function(text, errors, start, bracket) {
	const quote = text[start]
	const sub_type = quote == "'"
		? "single"
		: "double"
	const stop_regex = sub_type == "single"
		? stop_attribute_single_quotes_regex
		: stop_attribute_double_quotes_regex
	let child_pre_index = start + 1
	/** @type {import("../../../../private.js").MarkupScript[]} */
	const scripts = []
	for (;;) {
		const child_index = text.slice(child_pre_index).search(stop_regex)
		if (child_index >= 0) {
			const index = child_pre_index + child_index
			if (text[index] == quote) {
				return {
					end: index + 1,
					scripts,
					start,
					subType: sub_type,
					type: "String"
				}
			}
			const node = parse_script_block(text, errors, index, bracket)
			scripts.push(node)
			child_pre_index = node.end
		} else {
			errors.push(
				create_ast_syntax_error(
					`The ${sub_type}-quoted attribute value is not closed.`,
					start,
					text.length
				)
			)
			return {
				end: text.length,
				scripts,
				start,
				subType: sub_type,
				type: "String"
			}
		}
	}
}