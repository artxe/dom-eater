import csharp_token from "./csharp_token/index.js"
/**
 * @param {string} text
 * @param {number} index
 * @param {string} word
 * @returns {boolean}
 */
export default function(text, index, word) {
	const token = csharp_token(text, index)
	return token?.kind == "keyword" && text.slice(index, token.end) == word
}