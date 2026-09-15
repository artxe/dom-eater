import create_ast_syntax_error from "../../create_ast_syntax_error.js"
import parse_script_template from "./parse_script_template.js"
const stop_backtick_regex = /(?<=(?<!\\)(?:\\\\)*)(?:`|\${)/
/**
 * @param {string} text
 * @param {import("../../../public.js").AstSyntaxError[]} errors
 * @param {number} start
 * @param {import("../../../private.js").Bracket} bracket
 * @returns {import("../../../public.js").String & { subType: "backtick" }}
 */
export default function(text, errors, start, bracket) {
	let child_pre_index = start + 1
	/** @type {import("../../../private.js").TemplateLiteralScript[]} */
	const scripts = []
	for (;;) {
		const child_index = text.slice(child_pre_index).search(stop_backtick_regex)
		if (child_index >= 0) {
			const index = child_pre_index + child_index
			if (text[index] == "`") {
				return {
					end: index + 1,
					scripts,
					start,
					subType: "backtick",
					type: "String"
				}
			}
			const node = parse_script_template(text, errors, index, bracket)
			scripts.push(node)
			child_pre_index = node.end
		} else {
			errors.push(
				create_ast_syntax_error(
					"The template literal is not closed.",
					start,
					text.length
				)
			)
			return {
				end: text.length,
				scripts,
				start,
				subType: "backtick",
				type: "String"
			}
		}
	}
}