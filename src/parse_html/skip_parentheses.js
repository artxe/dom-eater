/**
 * @param {string} text
 * @param {number} index
 * @returns {number}
 */
export default function(text, index) {
	let depth = 0
	/** @type {string | undefined} */
	let quote
	for (let i = index; i < text.length; i++) {
		const char = text[i]
		if (quote) {
			if (char == "\\") i++
			else if (char == quote) quote = undefined
		} else if (char == "\"" || char == "'" || char == "`") {
			quote = char
		} else if (char == "(") {
			depth++
		} else if (char == ")" && !--depth) {
			return i + 1
		}
	}
	return -1
}