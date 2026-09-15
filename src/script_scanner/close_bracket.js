/**
 * @param {number} index
 * @param {import("../../private.js").ScanState} state
 * @returns {void}
 */
export default function(index, state) {
	const bracket = state.brackets.length > 1
		? state.brackets.pop()
		: undefined
	if (bracket) state.openings.set(index + 1, bracket.start)
	if (!state.expression_after.has(index + 1)) {
		state.expression_after.set(
			index + 1,
			bracket?.expression_after ?? false
		)
	}
}