import create_ast_syntax_error from "../create_ast_syntax_error.js"
const end_double_quotes_regex = /(?<=(?<!\\)(?:\\\\)*)"/
const end_single_quotes_regex = /(?<=(?<!\\)(?:\\\\)*)'/
/**
 * @param {string} text
 * @param {import("../../public.js").AstSyntaxError[]} errors
 * @param {number} start
 * @returns {import("../../public.js").String & { subType: "double" | "single" }}
 */
export default function(text, errors, start) {
	const sub_type = text[start] == "'"
		? "single"
		: "double"
	const index = text.slice(start + 1).search(
		sub_type == "single"
			? end_single_quotes_regex
			: end_double_quotes_regex
	) + 1
	if (index > 0) {
		return {
			end: start + index + 1,
			scripts: [],
			start,
			subType: sub_type,
			type: "String"
		}
	}
	errors.push(
		create_ast_syntax_error(
			`The ${sub_type}-quoted string is not closed.`,
			start,
			text.length
		)
	)
	return {
		end: text.length,
		scripts: [],
		start,
		subType: sub_type,
		type: "String"
	}
}