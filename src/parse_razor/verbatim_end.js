import skip_run from "./skip_run.js"
import utf8_suffix_end from "./utf8_suffix_end.js"
/**
 * @param {string} text
 * @param {number} index
 * @returns {number}
 */
export default function(text, index) {
	let i = skip_run(text, index, "@") + 1
	for (;;) {
		const char = text[i]
		if (char === undefined) break
		i++
		if (char == "\"") {
			if (text[i] != "\"") break
			i++
		}
	}
	return utf8_suffix_end(text, i)
}