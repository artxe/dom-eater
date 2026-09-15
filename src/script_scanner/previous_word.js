import identifier_part_regex from "./identifier_part_regex.js"
import member_dot_regex from "./member_dot_regex.js"
/**
 * @param {string} text
 * @param {number} end
 * @returns {string}
 */
export default function(text, end) {
	if (end < 0 || !identifier_part_regex.test(text[end] ?? "")) return ""
	let start = end
	while (start > 0 && identifier_part_regex.test(text[start - 1] ?? "")) start--
	member_dot_regex.lastIndex = start - 1
	return start > 0 && member_dot_regex.test(text)
		? ""
		: text.slice(start, end + 1)
}