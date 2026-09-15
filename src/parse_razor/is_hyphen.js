/**
 * @param {string} text
 * @param {number} index
 * @param {import("../../private.js").RazorToken | undefined} token
 * @returns {boolean}
 */
export default function(text, index, token) {
	return token?.kind == "text" && token.end == index + 1 && text[index] == "-"
}