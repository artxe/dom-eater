import next_index from "./next_index.js"
import skip_quoted from "./skip_quoted.js"
import skip_template_type from "./skip_template_type.js"
/**
 * @param {string} text
 * @param {number} index
 * @returns {number}
 */
export default function(text, index) {
	let depth = 0
	let i = index
	while (i < text.length) {
		const char = text[i]
		if (char == "\"" || char == "'") {
			i = skip_quoted(text, i)
		} else if (char == "`") {
			i = skip_template_type(text, i)
		} else if (char == "/" && (text[i + 1] == "/" || text[i + 1] == "*")) {
			i = next_index(text, i)
		} else {
			if (char == "(" || char == "[" || char == "{") {
				depth++
			} else if ((char == ")" || char == "]" || char == "}") && !--depth) {
				return i + 1
			}
			i++
		}
	}
	return text.length
}