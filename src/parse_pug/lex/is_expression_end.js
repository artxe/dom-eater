import is_operand_end from "./is_operand_end.js"
/**
 * @param {import("../../../private.js").PugCharState} state
 * @returns {boolean}
 */
export default function(state) {
	if (state.line_comment || state.ternaries != 0) return false
	return is_operand_end(state)
}