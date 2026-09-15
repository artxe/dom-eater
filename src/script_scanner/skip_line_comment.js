/**
 * @param {string} text
 * @param {number} index
 * @param {import("../../private.js").ScanState} state
 * @returns {number}
 */
export default function(text, index, state) {
	const newline = text.indexOf("\n", index)
	const end = newline < 0
		? text.length
		: newline
	state.comments.set(end, index)
	return end
}