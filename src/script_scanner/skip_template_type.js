import skip_brackets from "./skip_brackets.js"
/**
 * @param {string} text
 * @param {number} index
 * @returns {number}
 */
export default function(text, index) {
	for (let i = index + 1; i < text.length; i++) {
		if (text[i] == "\\") {
			i++
		} else if (text[i] == "`") {
			return i + 1
		} else if (text[i] == "$" && text[i + 1] == "{") {
			i = skip_brackets(text, i + 1) - 1
		}
	}
	return text.length
}