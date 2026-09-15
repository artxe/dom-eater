import equals_ignore_case from "./equals_ignore_case.js"
import html_token from "./html_token/index.js"
import is_bang_escape from "./is_bang_escape.js"
import is_hyphen from "./is_hyphen.js"
import skip_html_whitespace from "./skip_html_whitespace.js"
/**
 * @param {string} text
 * @param {number} index
 * @returns {boolean}
 */
function is_cdata(text, index) {
	if (text[index + 2] != "[") return false
	const token = html_token(text, index + 3)
	return token?.kind == "text" && equals_ignore_case(
		text.slice(index + 3, token.end),
		"CDATA"
	) && text[token.end] == "["
}
/**
 * @param {string} text
 * @param {number} index
 * @returns {boolean}
 */
function is_html_comment_ahead(text, index) {
	if (text[index + 1] != "!" || !text.startsWith("--", index + 2)) return false
	const after = html_token(text, index + 4)
	if (after?.kind == ">" || is_hyphen(text, index + 4, after) && html_token(text, index + 5)?.kind == ">") {
		return false
	}
	for (let i = index + 4; ;) {
		const token = html_token(text, i)
		if (!token) return false
		if (token.kind == "--") {
			const next = html_token(text, token.end)
			if (next?.kind == ">") return true
			if (is_hyphen(text, token.end, next) && html_token(text, token.end + 1)?.kind == ">") return true
			if (next?.kind == "!" && html_token(text, token.end + 1)?.kind == ">") return false
		} else if (token.kind == "<" && text[token.end] == "!" && text.startsWith("--", token.end + 1)) {
			return false
		}
		i = token.end
	}
}
/**
 * @param {import("../../private.js").RazorContext} ctx
 * @param {number} index
 * @param {"code" | "markup" | "text"} mode
 * @returns {import("../../private.js").RazorParserState}
 */
export default function(ctx, index, mode) {
	const { text } = ctx
	const start = skip_html_whitespace(text, index)
	if (start == index && index >= text.length) return "eof"
	const token = html_token(text, start)
	if (token?.kind == "@*") return "razor_comment"
	if (token?.kind == "@") {
		return text[start + 1] == "@"
			? "double_transition"
			: "code_transition"
	}
	if (start > index) return "misc"
	if (mode == "text") return "markup_text"
	if (token?.kind != "<") return "unknown"
	const next = html_token(text, index + 1)
	if (next?.kind == "?") return "xml_pi"
	if (next?.kind != "!" || is_bang_escape(text, index + 1)) return "tag"
	if (is_html_comment_ahead(text, index)) return "markup_comment"
	return is_cdata(text, index)
		? "cdata"
		: "special_tag"
}