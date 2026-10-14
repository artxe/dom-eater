import is_newline from "./is_newline.js"
import is_whitespace from "./is_whitespace.js"
/**
 * @param {string} text
 * @param {number} index
 * @returns {number}
 */
export default function(text, index) {
	let i = index
	while (i < text.length) {
		const char = /** @type {string} */(text[i])/**/
		if (!is_whitespace(char) && !is_newline(char)) {
			return i
		}
		i++
	}
	return i
}