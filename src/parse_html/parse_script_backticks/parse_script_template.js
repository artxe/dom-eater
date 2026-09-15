import create_ast_syntax_error from "../../create_ast_syntax_error.js"
import close_bracket from "../../script_scanner/close_bracket.js"
import create_scan_state from "../../script_scanner/create_scan_state.js"
import nested_bracket from "../../script_scanner/nested_bracket.js"
import open_block from "../../script_scanner/open_block.js"
import parse_script_quotes from "../../script_scanner/parse_script_quotes.js"
import record_literal from "../../script_scanner/record_literal.js"
import scan_punctuator from "../../script_scanner/scan_punctuator.js"
import script_stop_pattern from "../../script_scanner/script_stop_pattern.js"
import skip_slash from "../../script_scanner/skip_slash.js"
import parse_script_block from "../parse_script_block.js"
import parse_script_backticks from "./index.js"
const stop_script_template_regex = new RegExp(script_stop_pattern, "u")
/**
 * @param {string} text
 * @param {import("../../../public.js").AstSyntaxError[]} errors
 * @param {number} start
 * @param {import("../../../private.js").Bracket} bracket
 * @returns {import("../../../public.js").Script & { subType: "template" }}
 */
export default function(text, errors, start, bracket) {
	let child_pre_index = start + 2
	const state = create_scan_state(bracket)
	/** @type {import("../../../public.js").String[]} */
	const strings = []
	for (;;) {
		const child_index = text.slice(child_pre_index).search(stop_script_template_regex)
		if (child_index < 0) break
		const index = child_pre_index + child_index
		if (text[index] == "}") {
			return {
				end: index + 1,
				start,
				strings,
				subType: "template",
				type: "Script"
			}
		} else if (text[index] == "{") {
			const node = parse_script_block(
				text,
				errors,
				index,
				open_block(text, index, state)
			)
			for (const str of node.strings) {
				strings.push(str)
			}
			close_bracket(node.end - 1, state)
			child_pre_index = node.end
		} else if (text[index] == "/") {
			child_pre_index = skip_slash(text, errors, index, state)
		} else if (text[index] == "'" || text[index] == "\"") {
			const node = parse_script_quotes(text, errors, index)
			strings.push(node)
			record_literal(node, state)
			child_pre_index = node.end
		} else if (text[index] == "`") {
			const node = parse_script_backticks(
				text,
				errors,
				index,
				nested_bracket(text, index, false, state)
			)
			strings.push(node)
			record_literal(node, state)
			child_pre_index = node.end
		} else {
			child_pre_index = scan_punctuator(text, index, state)
		}
	}
	errors.push(
		create_ast_syntax_error(
			"The template literal substitution is not closed.",
			start,
			text.length
		)
	)
	return {
		end: text.length,
		start,
		strings,
		subType: "template",
		type: "Script"
	}
}