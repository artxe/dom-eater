import create_ast_syntax_error from "../../../create_ast_syntax_error.js"
import parse_script_block from "../../parse_script_block.js"
import php_open_regex from "../../php_open_regex.js"
import unclosed_blocks from "../../unclosed_blocks.js"
const stop_attribute_double_quotes_regex = /["{]|<[%?]/
const stop_attribute_single_quotes_regex = /['{]|<[%?]/
/**
 * @param {string} text
 * @param {import("../../../../public.js").AstSyntaxError[]} errors
 * @param {number} start
 * @returns {import("../../../../public.js").String & { subType: "double" | "single" }}
 */
export default function(text, errors, start) {
	const quote = text[start]
	const sub_type = quote == "'"
		? "single"
		: "double"
	const stop_regex = sub_type == "single"
		? stop_attribute_single_quotes_regex
		: stop_attribute_double_quotes_regex
	let child_pre_index = start + 1
	let missing = ""
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
			if (text[index] == "<") {
				const tag = /** @type {string} */(text[index + 1])/**/
				php_open_regex.lastIndex = index
				let close = -1
				if (!missing.includes(tag) && (tag == "%" || php_open_regex.test(text))) {
					close = text.indexOf(`${tag}>`, index + 2)
					if (close < 0) missing += tag
				}
				child_pre_index = close < 0
					? index + 1
					: close + 2
				continue
			}
			const error_count = errors.length
			const node = parse_script_block(text, errors, index)
			const close = unclosed_blocks.has(node)
				? text.indexOf(
					sub_type == "single"
						? "'"
						: "\"",
					index + 1
				)
				: -1
			if (close < 0) {
				scripts.push(node)
				child_pre_index = node.end
				continue
			}
			errors.length = error_count
			errors.push(
				create_ast_syntax_error(
					"The {…} block is not closed.",
					index,
					close
				)
			)
			scripts.push(
				{
					end: close,
					start: index,
					strings: node.strings.filter(string => string.end <= close),
					subType: "block",
					type: "Script"
				}
			)
			child_pre_index = close
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