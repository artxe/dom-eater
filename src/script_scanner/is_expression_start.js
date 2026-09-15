import declaration_keywords from "./declaration_keywords.js"
import identifier_part_regex from "./identifier_part_regex.js"
import is_declaration_list from "./is_declaration_list.js"
import is_import_alias from "./is_import_alias.js"
import is_keyword_before_expression from "./is_keyword_before_expression.js"
import line_terminator_regex from "./line_terminator_regex.js"
import member_dot_regex from "./member_dot_regex.js"
import previous_index from "./previous_index.js"
import previous_word from "./previous_word.js"
const operand_end_chars = ")]'\"`"
const statement_end_keywords = new Set(
	[ "break", "continue", "debugger" ]
)
/**
 * @param {string} text
 * @param {number} index
 * @param {import("../../private.js").ScanState} state
 * @returns {boolean}
 */
function is_expression_start(text, index, state) {
	const i = previous_index(text, index, state)
	if (i < 0) return true
	const recorded = state.expression_after.get(i + 1)
	if (recorded !== undefined) return recorded
	const char = /** @type {string} */(text[i])/**/
	if (identifier_part_regex.test(char)) {
		return is_keyword_before_expression(text, i, state) || is_statement_end(text, i, state)
	}
	if (char == "\"" || char == "'") return is_module_specifier(text, i, state)
	if (char == ".") {
		if (text[i - 1] == "?") return false
		member_dot_regex.lastIndex = i
		return member_dot_regex.test(text) || text[i - 1] == "."
	}
	if (char == "!") {
		const before = previous_index(text, i, state)
		return is_expression_start(text, i, state) || line_terminator_regex.test(text.slice(before + 1, i))
	}
	if (char == "+" || char == "-") {
		if (text[i - 1] != char || text[i - 2] == char) return true
		const before = previous_index(text, i - 1, state)
		return is_expression_start(text, i - 1, state) || line_terminator_regex.test(text.slice(before + 1, i - 1))
	}
	return !operand_end_chars.includes(char)
}
/**
 * @param {string} text
 * @param {number} end
 * @param {import("../../private.js").ScanState} state
 * @returns {boolean}
 */
function is_module_specifier(text, end, state) {
	const i = previous_index(
		text,
		text.lastIndexOf(text[end] ?? "", end - 1),
		state
	)
	const word = previous_word(text, i)
	return word == "module"
		? previous_word(
			text,
			previous_index(text, i - word.length + 1, state)
		) == "declare"
		: word == "from" || word == "import"
}
/**
 * @param {string} text
 * @param {number} end
 * @param {import("../../private.js").ScanState} state
 * @returns {boolean}
 */
function is_statement_end(text, end, state) {
	const word = previous_word(text, end)
	if (!word) {
		let start = end
		while (identifier_part_regex.test(text[start] ?? "")) start--
		const dot = previous_index(text, start + 1, state)
		return text[dot] == "." && is_import_alias(text, dot, state)
	}
	if (statement_end_keywords.has(word)) return true
	const before = previous_index(text, end - word.length + 1, state)
	const keyword = previous_word(text, before)
	return keyword == "break"
		|| keyword == "continue"
		|| declaration_keywords.has(keyword)
		|| text[before] == "," && is_declaration_list(text, before, state)
		|| (text[before] == "=" || text[before] == ".") && is_import_alias(text, before, state)
}
export default is_expression_start