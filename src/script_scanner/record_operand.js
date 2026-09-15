/**
 * @param {number} index
 * @param {import("../../private.js").ScanState} state
 * @returns {void}
 */
export default function(index, state) {
	state.expression_after.set(index, false)
}