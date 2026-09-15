import previous_index from "./previous_index.js"
import previous_word from "./previous_word.js"
import type_parameters_start from "./type_parameters_start.js"
/**
 * @param {string} text
 * @param {number} close
 * @param {import("../../private.js").ScanState} state
 * @returns {import("../../private.js").Bracket["body_keywords"]}
 */
export default function(text, close, state) {
	let i = previous_index(
		text,
		state.openings.get(close + 1) ?? 0,
		state
	)
	if (text[i] == ">" && text[i - 1] != "=") i = previous_index(
		text,
		type_parameters_start(text, i),
		state
	)
	if (text[i] == "?") i = previous_index(text, i, state)
	let name_start = state.openings.get(i + 1) ?? i - previous_word(text, i).length + 1
	if (text[name_start - 1] == "#") name_start--
	let before = previous_index(text, name_start, state)
	const generator = text[before] == "*"
	if (generator) before = previous_index(text, before, state)
	return previous_word(text, before) == "async"
		? generator
			? "await yield"
			: "await"
		: generator
			? "yield"
			: ""
}