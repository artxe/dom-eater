import whitespace_regex from "./whitespace_regex.js"
/**
 * @param {string} text
 * @param {number} index
 * @returns {number}
 */
export default function(text, index) {
	let i = index
	for (;;) {
		if (whitespace_regex.test(text[i] ?? "")) {
			i++
		} else if (text.startsWith("//", i)) {
			const newline = text.indexOf("\n", i)
			i = newline < 0
				? text.length
				: newline
		} else if (text.startsWith("/*", i)) {
			const close = text.indexOf("*/", i + 2)
			i = close < 0
				? text.length
				: close + 2
		} else {
			return i
		}
	}
}