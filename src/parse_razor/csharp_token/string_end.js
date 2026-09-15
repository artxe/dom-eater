import interpolated_end from "../interpolated_end.js"
import skip_run from "../skip_run.js"
import string_literal_end from "../string_literal_end.js"
import verbatim_end from "../verbatim_end.js"
/**
 * @param {string} text
 * @param {number} index
 * @returns {number}
 */
export default function(text, index) {
	if (text[index] == "$" || text[index] == "@" && text[skip_run(text, index, "@")] == "$") {
		return interpolated_end(text, index)
	}
	if (text[index] == "@") return verbatim_end(text, index)
	return string_literal_end(text, index)
}