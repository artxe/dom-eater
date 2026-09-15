import binary_words from "./binary_words.js"
const prefix_words = new Set(
	[
		"abstract",
		"asserts",
		"async",
		"await",
		"class",
		"delete",
		"function",
		"infer",
		"keyof",
		"new",
		"readonly",
		"typeof",
		"unique",
		"void",
		"yield"
	]
)
/**
 * @param {import("../../private.js").Token} token
 * @returns {boolean}
 */
export default function(token) {
	return token.kind == "bracket"
		|| token.kind == "literal"
		|| token.kind == "word" && !binary_words.has(token.value) && !prefix_words.has(token.value)
}