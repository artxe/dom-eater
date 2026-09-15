import create_ast_syntax_error from "../create_ast_syntax_error.js"
import php_open_regex from "./php_open_regex.js"
const comment_close_regex = /--!?>/g
/**
 * @param {string} text
 * @param {number} start
 * @param {string} close
 * @returns {number}
 */
function close_end(text, start, close) {
	if (close == "-->") {
		comment_close_regex.lastIndex = start + 2
		const match = comment_close_regex.exec(text)
		return match
			? match.index + match[0].length
			: -1
	}
	const index = text.indexOf(close, start + 2)
	return index < 0
		? -1
		: index + close.length
}
/**
 * @param {string} text
 * @param {import("../../public.js").AstSyntaxError[]} errors
 * @param {number} start
 * @param {boolean} foreign
 * @returns {import("../../public.js").Comment | import("../../public.js").Text}
 */
export default function(text, errors, start, foreign) {
	php_open_regex.lastIndex = start
	const php = php_open_regex.test(text)
	const close = text.startsWith("<!--", start)
		? "-->"
		: foreign && text.startsWith("<![CDATA[", start)
			? "]]>"
			: php
				? "?>"
				: text[start + 1] == "%"
					? "%>"
					: ">"
	/** @type {"Comment" | "Text"} */
	const type = close == "]]>"
		? "Text"
		: "Comment"
	const end = close_end(text, start, close)
	if (end >= 0) {
		return { end, start, type }
	}
	if (!php) {
		errors.push(
			create_ast_syntax_error(
				`The ${type == "Text" ? "CDATA section" : "comment"} is not closed with "${close}".`,
				start,
				text.length
			)
		)
	}
	return { end: text.length, start, type }
}