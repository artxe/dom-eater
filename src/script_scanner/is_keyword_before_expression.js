import concise_arrow_async from "./concise_arrow_async.js"
import current_bracket from "./current_bracket.js"
import identifier_part_regex from "./identifier_part_regex.js"
import previous_index from "./previous_index.js"
import previous_word from "./previous_word.js"
const expression_keywords = new Set(
	[
		"case",
		"default",
		"delete",
		"do",
		"else",
		"extends",
		"in",
		"instanceof",
		"new",
		"return",
		"throw",
		"typeof",
		"void"
	]
)
/**
 * @param {string} text
 * @param {number} end
 * @param {import("../../private.js").ScanState} state
 * @returns {boolean}
 */
function is_of_keyword(text, end, state) {
	const i = previous_index(text, end - 1, state)
	const char = text[i] ?? ""
	if (char == "]" || char == "}") return true
	if (!identifier_part_regex.test(char)) return false
	const word = previous_word(text, i)
	return word == "of"
		? !is_of_keyword(text, i, state)
		: word != "const" && word != "let" && word != "var"
}
/**
 * @param {string} text
 * @param {number} end
 * @param {import("../../private.js").ScanState} state
 * @returns {boolean}
 */
export default function(text, end, state) {
	const word = previous_word(text, end)
	const bracket = current_bracket(state)
	if (word == "await" || word == "yield") {
		const arrow_async = concise_arrow_async(
			text,
			end - word.length + 1,
			true,
			state
		)
		if (arrow_async !== undefined) return word == "await" && arrow_async
		if (word == "yield") return bracket.yield_keyword
		if (bracket.await_keyword !== undefined || !bracket.script) return bracket.await_keyword ?? true
		bracket.script.top_level_await = true
		return bracket.script.module
	}
	if (word == "of") return bracket.for_head && is_of_keyword(text, end, state)
	return expression_keywords.has(word)
}