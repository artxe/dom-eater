import create_ast_syntax_error from "../create_ast_syntax_error.js"
import is_expression_start from "./is_expression_start.js"
import skip_line_comment from "./skip_line_comment.js"
/**
 * @param {string} text
 * @param {import("../../public.js").AstSyntaxError[]} errors
 * @param {number} index
 * @param {import("../../private.js").ScanState} state
 * @returns {number}
 */
export default function(text, errors, index, state) {
	const next = text[index + 1]
	if (next == "/") return skip_line_comment(text, index, state)
	if (next == "*") {
		const close = text.indexOf("*/", index + 2)
		if (close < 0) {
			errors.push(
				create_ast_syntax_error(
					"The block comment is not closed.",
					index,
					text.length
				)
			)
			state.comments.set(text.length, index)
			return text.length
		}
		state.comments.set(close + 2, index)
		return close + 2
	}
	if (!is_expression_start(text, index, state)) return index + 1
	let in_class = false
	for (let i = index + 1; i < text.length; i++) {
		const char = text[i]
		if (char == "\\") {
			i++
		} else if (char == "\n") {
			break
		} else if (in_class) {
			if (char == "]") in_class = false
		} else if (char == "[") {
			in_class = true
		} else if (char == "/") {
			state.expression_after.set(i + 1, false)
			state.openings.set(i + 1, index)
			return i + 1
		}
	}
	return index + 1
}