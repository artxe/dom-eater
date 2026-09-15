import block_keywords from "./block_keywords.js"
import concise_arrow_async from "./concise_arrow_async.js"
import current_bracket from "./current_bracket.js"
import identifier_part_regex from "./identifier_part_regex.js"
import is_import_alias from "./is_import_alias.js"
import is_keyword_before_expression from "./is_keyword_before_expression.js"
import line_terminator_regex from "./line_terminator_regex.js"
import method_body_keywords from "./method_body_keywords.js"
import previous_index from "./previous_index.js"
import previous_word from "./previous_word.js"
import type_operators from "./type_operators.js"
const body_end_chars = ")>]}"
const control_keywords = new Set(
	[ "for", "if", "while", "with" ]
)
const literal_end_chars = "\"'`]"
/**
 * @param {string} text
 * @param {number} end
 * @param {import("../../private.js").ScanState} state
 * @returns {boolean}
 */
function is_namespace_name(text, end, state) {
	let i = end
	for (;;) {
		while (identifier_part_regex.test(text[i] ?? "")) i--
		if (text[i] != ".") break
		i--
	}
	const keyword = previous_word(
		text,
		previous_index(text, i + 1, state)
	)
	return keyword == "module" || keyword == "namespace"
}
/**
 * @param {string} text
 * @param {number} end
 * @param {import("../../private.js").ScanState} state
 * @returns {string}
 */
function word_before_string(text, end, state) {
	return previous_word(
		text,
		previous_index(
			text,
			text.lastIndexOf(text[end] ?? "", end - 1),
			state
		)
	)
}
/**
 * @param {string} text
 * @param {number} index
 * @param {import("../../private.js").ScanState} state
 * @returns {void}
 */
export default function(text, index, state) {
	const i = previous_index(text, index, state)
	const char = text[i] ?? ""
	const word = identifier_part_regex.test(char)
		? previous_word(text, i)
		: ""
	const parent = current_bracket(state)
	const arrow_async = concise_arrow_async(
		text,
		index,
		text[index] == "{",
		state
	)
	/** @type {import("../../private.js").Bracket} */
	const bracket = {
		arrow: -1,
		arrow_async: false,
		arrow_inside: -1,
		await_keyword: arrow_async ?? parent.await_keyword,
		body: "",
		body_declaration: false,
		body_keywords: "",
		body_start: -1,
		expression_after: false,
		for_head: false,
		kind: "block",
		members: false,
		script: parent.script,
		start: index,
		ternaries: 0,
		type_end: -1,
		yield_keyword: arrow_async === undefined && parent.yield_keyword
	}
	if (text[index] == "(") {
		if (parent.body == "function") {
			bracket.await_keyword = parent.body_keywords.includes("await")
			bracket.yield_keyword = parent.body_keywords.includes("yield")
		}
		bracket.for_head = word == "for"
			|| word == "await" && previous_word(
				text,
				previous_index(text, i - word.length + 1, state)
			) == "for"
		bracket.expression_after = bracket.for_head
			|| control_keywords.has(word)
			|| word == "require" && is_import_alias(
				text,
				previous_index(text, i - 6, state),
				state
			)
		bracket.kind = "("
	} else if (text[index] == "[") {
		bracket.kind = "["
	} else if (
		parent.body
		&& index >= parent.body_start
		&& (body_end_chars.includes(char) || identifier_part_regex.test(char) && !type_operators.has(word))
	) {
		bracket.await_keyword = parent.body_keywords.includes("await")
		bracket.expression_after = parent.body_declaration
		bracket.members = parent.body == "class"
		bracket.yield_keyword = parent.body_keywords.includes("yield")
		parent.body = ""
	} else {
		const block = word
			? block_keywords.has(word) || !is_keyword_before_expression(text, i, state)
			: char == ""
				|| char == ")"
				|| char == ";"
				|| char == "}"
				|| char == "{" && parent.kind == "block" && !parent.members
				|| char == ">" && text[i - 1] == "="
				|| char == ":" && state.colons.get(i) == true
				|| (char == "\"" || char == "'") && word_before_string(text, i, state) == "module"
				|| identifier_part_regex.test(char) && is_namespace_name(text, i, state)
				|| (literal_end_chars.includes(char) || char == "/" && state.openings.has(i + 1))
					&& line_terminator_regex.test(text.slice(i + 1, index))
		bracket.expression_after = block
		if (!block) {
			bracket.kind = "{"
		} else if (char == ">" && text[i - 1] == "=") {
			bracket.await_keyword = parent.arrow == i - 1 && parent.arrow_async
			bracket.yield_keyword = false
			parent.arrow = -1
		} else if (char == ")" && (parent.kind == "{" || parent.members)) {
			const keywords = method_body_keywords(text, i, state)
			bracket.await_keyword = keywords.includes("await")
			bracket.yield_keyword = keywords.includes("yield")
		} else if (word == "static" && parent.members) {
			bracket.await_keyword = true
			bracket.yield_keyword = false
		}
	}
	state.brackets.push(bracket)
}