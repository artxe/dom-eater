import whitespace_regex from "./whitespace_regex.js"
/**
 * @param {string} text
 * @param {number} index
 * @param {import("../../private.js").ScanState} state
 * @returns {number}
 */
export default function(text, index, state) {
	let i = index - 1
	for (;;) {
		if (i < 0) return -1
		const comment_start = state.comments.get(i + 1)
		if (comment_start !== undefined) {
			i = comment_start - 1
		} else if (whitespace_regex.test(text[i] ?? "")) {
			i--
		} else {
			return i
		}
	}
}