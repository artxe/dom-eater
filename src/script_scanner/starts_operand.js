import binary_words from "./binary_words.js"
/**
 * @param {import("../../private.js").Token} token
 * @returns {boolean}
 */
export default function(token) {
	return token.kind == "literal"
		? token.value != "`"
		: token.kind == "word" && !binary_words.has(token.value)
}