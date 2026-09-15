import equals_ignore_case from "./equals_ignore_case.js"
import html_token from "./html_token/index.js"
/**
 * @param {string} text
 * @param {number} index
 * @returns {boolean}
 */
export default function(text, index) {
	if (text[index] != "!") return false
	const token = html_token(text, index + 1)
	return token?.kind == "text" && !equals_ignore_case(
		text.slice(index + 1, token.end),
		"DOCTYPE"
	)
}