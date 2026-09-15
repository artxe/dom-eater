import current_bracket from "./current_bracket.js"
import open_bracket from "./open_bracket.js"
/**
 * @param {string} text
 * @param {number} index
 * @param {import("../../private.js").ScanState} state
 * @returns {import("../../private.js").Bracket}
 */
export default function(text, index, state) {
	open_bracket(text, index, state)
	return current_bracket(state)
}