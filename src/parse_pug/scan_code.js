import parse_script_backticks from "../parse_html/parse_script_backticks/index.js"
import create_scan_state from "../script_scanner/create_scan_state.js"
import nested_bracket from "../script_scanner/nested_bracket.js"
import parse_script_quotes from "../script_scanner/parse_script_quotes.js"
import record_literal from "../script_scanner/record_literal.js"
import scan_punctuator from "../script_scanner/scan_punctuator.js"
import script_bracket from "../script_scanner/script_bracket.js"
import script_stop_pattern from "../script_scanner/script_stop_pattern.js"
import skip_slash from "../script_scanner/skip_slash.js"
const stop_code_regex = new RegExp(script_stop_pattern, "u")
/**
 * @param {string} text
 * @param {import("../../public.js").AstSyntaxError[]} errors
 * @param {number} start
 * @param {number} end
 * @param {boolean} statement
 * @returns {import("../../public.js").String[]}
 */
export default function(text, errors, start, end, statement) {
	const code = text.slice(start, end)
	const error_count = errors.length
	const state = create_scan_state(
		statement
			? script_bracket
			: undefined
	)
	/** @type {import("../../public.js").String[]} */
	const strings = []
	let child_pre_index = 0
	for (;;) {
		const child_index = code.slice(child_pre_index).search(stop_code_regex)
		if (child_index < 0) break
		const index = child_pre_index + child_index
		if (code[index] == "/") {
			child_pre_index = skip_slash(code, errors, index, state)
		} else if (code[index] == "'" || code[index] == "\"") {
			const node = parse_script_quotes(code, errors, index)
			strings.push(node)
			record_literal(node, state)
			child_pre_index = node.end
		} else if (code[index] == "`") {
			const node = parse_script_backticks(
				code,
				errors,
				index,
				nested_bracket(code, index, false, state)
			)
			strings.push(node)
			record_literal(node, state)
			child_pre_index = node.end
		} else {
			child_pre_index = scan_punctuator(code, index, state)
		}
	}
	for (let i = error_count; i < errors.length; i++) {
		const error = /** @type {import("../../public.js").AstSyntaxError} */(errors[i])/**/
		error.end += start
		error.start += start
	}
	/** @type {import("../../public.js").AstNode[]} */
	const pending = [ ...strings ]
	for (let node = pending.pop(); node; node = pending.pop()) {
		node.end += start
		node.start += start
		if (node.type == "String") {
			for (const script of node.scripts) pending.push(script)
		} else if (node.type == "Script") {
			for (const string of node.strings) pending.push(string)
		}
	}
	return strings
}