import is_operand_end from "./is_operand_end.js"
/**
 * @param {import("../../../private.js").PugCharState} state
 * @returns {boolean}
 */
export default function(state) {
	let view = state
	while (view.tail) {
		view = view.tail
	}
	if (view.line_comment || view.stack.length != 0 || view.ternaries != 0) {
		return false
	}
	return is_operand_end(view)
}