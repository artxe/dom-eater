import current_bracket from "../script_scanner/current_bracket.js"
import identifier_part_regex from "../script_scanner/identifier_part_regex.js"
import previous_index from "../script_scanner/previous_index.js"
import previous_word from "../script_scanner/previous_word.js"
import whitespace_regex from "../script_scanner/whitespace_regex.js"
const markup_comment_regex = /^\s*(?:html|svg)\s*$/i
/**
 * @param {string} text
 * @param {number} index
 * @param {import("../../private.js").ScanState} state
 * @returns {boolean}
 */
export default function(text, index, state) {
	let before = index - 1
	while (whitespace_regex.test(text[before] ?? "")) before--
	const comment_start = state.comments.get(before + 1)
	if (comment_start !== undefined) {
		return text[comment_start + 1] == "*" && markup_comment_regex.test(
			text.slice(comment_start + 2, before - 1)
		)
	}
	const i = previous_index(text, index, state)
	if (text[i] == ":") {
		const key_end = previous_index(text, i, state)
		const key_start = state.openings.get(key_end + 1)
		const key = key_start !== undefined && (text[key_end] == "\"" || text[key_end] == "'")
			? text.slice(key_start + 1, key_end)
			: previous_word(text, key_end)
		return key == "template" && current_bracket(state).kind == "{"
	}
	let tag_start = i
	while (identifier_part_regex.test(text[tag_start - 1] ?? "")) tag_start--
	const tag = text.slice(tag_start, i + 1)
	return tag == "html" || tag == "svg"
}