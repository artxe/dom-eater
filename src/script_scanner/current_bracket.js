/**
 * @param {import("../../private.js").ScanState} state
 * @returns {import("../../private.js").Bracket}
 */
export default function(state) {
	return /** @type {import("../../private.js").Bracket} */(state.brackets[state.brackets.length - 1])/**/
}