import create_ast_syntax_error from "../../create_ast_syntax_error.js"
const end_style_content_regex = /<\/style(?=[\s/>])/i
/**
 * @param {string} text
 * @param {import("../../../public.js").AstSyntaxError[]} errors
 * @param {number} start
 * @returns {import("../../../public.js").Style}
 */
export default function(text, errors, start) {
	const index = text.slice(start).search(end_style_content_regex)
	if (index >= 0) {
		return {
			end: start + index,
			start,
			type: "Style"
		}
	}
	errors.push(
		create_ast_syntax_error(
			"The \"style\" element is not closed.",
			start,
			text.length
		)
	)
	return {
		end: text.length,
		start,
		type: "Style"
	}
}