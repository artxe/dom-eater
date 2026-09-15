import identifier_part_regex from "./identifier_part_regex.js"
import previous_index from "./previous_index.js"
/**
 * @param {string} text
 * @param {number} index
 * @param {import("../../private.js").ScanState} state
 * @returns {import("../../private.js").Token}
 */
export default function(text, index, state) {
	const i = previous_index(text, index, state)
	const char = text[i] ?? ""
	const opening = state.openings.get(i + 1)
	if (opening !== undefined) {
		return {
			end: i + 1,
			kind: char == ")" || char == "]" || char == "}"
				? "bracket"
				: "literal",
			start: opening,
			value: char
		}
	}
	if (!identifier_part_regex.test(char)) {
		return {
			end: i + 1,
			kind: char
				? "punctuator"
				: "",
			start: i,
			value: char
		}
	}
	let start = i
	while (identifier_part_regex.test(text[start - 1] ?? "")) start--
	const flags_of = state.openings.get(start)
	if (text[start - 1] == "/" && flags_of !== undefined) {
		return {
			end: i + 1,
			kind: "literal",
			start: flags_of,
			value: "/"
		}
	}
	return {
		end: i + 1,
		kind: "word",
		start,
		value: text.slice(start, i + 1)
	}
}