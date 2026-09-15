import create_ast_syntax_error from "../../create_ast_syntax_error.js"
import create_scan_state from "../../script_scanner/create_scan_state.js"
import nested_bracket from "../../script_scanner/nested_bracket.js"
import parse_script_quotes from "../../script_scanner/parse_script_quotes.js"
import record_literal from "../../script_scanner/record_literal.js"
import scan_punctuator from "../../script_scanner/scan_punctuator.js"
import script_bracket from "../../script_scanner/script_bracket.js"
import script_stop_pattern from "../../script_scanner/script_stop_pattern.js"
import skip_line_comment from "../../script_scanner/skip_line_comment.js"
import skip_slash from "../../script_scanner/skip_slash.js"
import whitespace_regex from "../../script_scanner/whitespace_regex.js"
import parse_script_backticks from "../parse_script_backticks/index.js"
const end_script_content_regex = /<\/script(?=[\s/>])/i
const stop_script_content_regex = new RegExp(
	`${script_stop_pattern}|-->|<!--`,
	"u"
)
/**
 * @param {string} text
 * @param {number} start
 * @param {number} index
 * @returns {boolean}
 */
function is_line_start(text, start, index) {
	let i = index - 1
	while (i >= start && text[i] != "\n" && whitespace_regex.test(text[i] ?? "")) i--
	return i < start || text[i] == "\n"
}
/**
 * @param {string} text
 * @param {import("../../../public.js").AstSyntaxError[]} errors
 * @param {number} start
 * @returns {import("../../../public.js").Script & { subType: "content" }}
 */
export default function(text, errors, start) {
	const end_index = text.slice(start).search(end_script_content_regex)
	const end = end_index < 0
		? text.length
		: start + end_index
	const content = text.slice(0, end)
	let child_pre_index = start
	const state = create_scan_state(script_bracket)
	/** @type {import("../../../public.js").String[]} */
	const strings = []
	for (;;) {
		const child_index = content.slice(child_pre_index).search(stop_script_content_regex)
		if (child_index < 0) break
		const index = child_pre_index + child_index
		if (content[index] == "-") {
			child_pre_index = is_line_start(content, start, index)
				? skip_line_comment(content, index, state)
				: index + 3
		} else if (content[index] == "<") {
			child_pre_index = skip_line_comment(content, index, state)
		} else if (content[index] == "/") {
			child_pre_index = skip_slash(content, errors, index, state)
		} else if (content[index] == "'" || content[index] == "\"") {
			const node = parse_script_quotes(content, errors, index)
			strings.push(node)
			record_literal(node, state)
			child_pre_index = node.end
		} else if (content[index] == "`") {
			const node = parse_script_backticks(
				content,
				errors,
				index,
				nested_bracket(content, index, false, state)
			)
			strings.push(node)
			record_literal(node, state)
			child_pre_index = node.end
		} else {
			child_pre_index = scan_punctuator(content, index, state)
		}
	}
	if (end_index < 0) {
		errors.push(
			create_ast_syntax_error(
				"The \"script\" element is not closed.",
				start,
				text.length
			)
		)
	}
	return {
		end,
		start,
		strings,
		subType: "content",
		type: "Script"
	}
}