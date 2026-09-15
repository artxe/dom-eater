import create_char_state from "./create_char_state.js"
import parse_char from "./parse_char.js"
/**
 * @param {string} text
 * @param {number} start
 * @param {number} end
 * @param {string} delimiter
 * @returns {{ end: number, mismatches: number[] }}
 */
export default function(text, start, end, delimiter) {
	const state = create_char_state()
	/** @type {number[]} */
	const mismatches = []
	for (let index = start; index < end; index++) {
		const char = /** @type {string} */(text[index])/**/
		if (state.stack.length == 0 && char == delimiter) return { end: index, mismatches }
		if (!parse_char(state, char)) mismatches.push(index)
	}
	return { end: -1, mismatches }
}