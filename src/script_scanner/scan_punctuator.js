import block_keywords from "./block_keywords.js"
import close_bracket from "./close_bracket.js"
import current_bracket from "./current_bracket.js"
import declaration_keywords from "./declaration_keywords.js"
import ends_operand from "./ends_operand.js"
import identifier_part_regex from "./identifier_part_regex.js"
import is_declaration_list from "./is_declaration_list.js"
import is_expression_start from "./is_expression_start.js"
import is_keyword_before_expression from "./is_keyword_before_expression.js"
import line_terminator_regex from "./line_terminator_regex.js"
import method_body_keywords from "./method_body_keywords.js"
import next_index from "./next_index.js"
import open_bracket from "./open_bracket.js"
import previous_index from "./previous_index.js"
import previous_token from "./previous_token.js"
import previous_word from "./previous_word.js"
import record_operand from "./record_operand.js"
import skip_brackets from "./skip_brackets.js"
import skip_quoted from "./skip_quoted.js"
import skip_template_type from "./skip_template_type.js"
import skip_type_arguments from "./skip_type_arguments.js"
import statement_words from "./statement_words.js"
import type_operators from "./type_operators.js"
import type_parameters_start from "./type_parameters_start.js"
const declaration_modifiers = new Set(
	[ "abstract", "async", "declare" ]
)
const generator_star_regex = /(?:\s|\/\*[\s\S]*?\*\/|\/\/.*)*\*/y
const import_alias_regex = /(?:type\s+)?[\p{ID_Start}$_][\p{ID_Continue}$]*\s*=(?!=)\s*(?!require\s*\()/uy
const method_modifiers = new Set(
	[
		"abstract",
		"accessor",
		"async",
		"declare",
		"get",
		"override",
		"private",
		"protected",
		"public",
		"readonly",
		"set",
		"static"
	]
)
const property_name_end_chars = ",:;=?)]}"
/**/
/**
 * @param {string} text
 * @param {number} end
 * @param {import("../../private.js").ScanState} state
 * @returns {number}
 */
function decorator_start(text, end, state) {
	let i = text[end] == ")"
		? previous_index(
			text,
			state.openings.get(end + 1) ?? 0,
			state
		)
		: end
	for (;;) {
		if (!identifier_part_regex.test(text[i] ?? "")) return -1
		while (identifier_part_regex.test(text[i - 1] ?? "")) i--
		if (text[i - 1] == "@") return i - 1
		if (text[i - 1] != ".") return -1
		i -= 2
	}
}
/**
 * @param {string} text
 * @param {number} index
 * @param {import("../../private.js").ScanState} state
 * @returns {boolean}
 */
function is_async_arrow(text, index, state) {
	const i = previous_index(text, index, state)
	let start = i - previous_word(text, i).length + 1
	if (text[i] == ")") {
		start = state.openings.get(i + 1) ?? -1
		const before = previous_index(text, start, state)
		if (text[before] == ">" && text[before - 1] != "=") start = type_parameters_start(text, before)
	}
	return start >= 0 && start <= i && previous_word(
		text,
		previous_index(text, start, state)
	) == "async"
}
/**
 * @param {string} text
 * @param {number} index
 * @param {import("../../private.js").ScanState} state
 * @returns {boolean}
 */
function is_case_clause(text, index, state) {
	let i = index
	for (;;) {
		const token = previous_token(text, i, state)
		if (token.kind == "word" && token.value == "case") return true
		const stops = token.kind == ""
			|| token.kind == "punctuator" && ":;{}".includes(token.value)
			|| token.kind == "word" && statement_words.has(token.value)
			|| token.kind == "bracket" && state.expression_after.get(token.end) == true
		if (stops) return false
		i = token.start
	}
}
/**
 * @param {string} text
 * @param {number} index
 * @param {import("../../private.js").ScanState} state
 * @returns {boolean}
 */
function is_declaration_annotation(text, index, state) {
	let i = previous_index(text, index, state)
	if (text[i] == "!") i = previous_index(text, i, state)
	const word = previous_word(text, i)
	if (!word) return false
	const before = previous_index(text, i - word.length + 1, state)
	return declaration_keywords.has(previous_word(text, before))
		|| text[before] == "," && is_declaration_list(text, before, state)
}
/**
 * @param {string} text
 * @param {number} index
 * @param {number} end
 * @param {import("../../private.js").ScanState} state
 * @returns {boolean}
 */
function is_method_name(text, index, end, state) {
	const next = text[next_index(text, end)]
	const bracket = current_bracket(state)
	if (next != "(" && next != "<" || bracket.kind != "{" && !bracket.members) return false
	let start = index
	for (;;) {
		const i = previous_index(text, start, state)
		const word = identifier_part_regex.test(text[i] ?? "")
			? previous_word(text, i)
			: ""
		if (text[i] == "*") {
			start = i
		} else if (method_modifiers.has(word) && !line_terminator_regex.test(text.slice(i + 1, start))) {
			start = i - word.length + 1
		} else {
			break
		}
	}
	const token = previous_token(text, start, state)
	if (token.kind == "" || "{,;".includes(token.value) && token.kind == "punctuator") return true
	if (!bracket.members) return false
	return token.value == "}"
		|| decorator_start(text, token.end - 1, state) >= 0
		|| text[start] != "*" && ends_operand(token) && line_terminator_regex.test(text.slice(token.end, start))
}
/**
 * @param {string} text
 * @param {number} index
 * @param {import("../../private.js").ScanState} state
 * @returns {boolean}
 */
function is_statement_start(text, index, state) {
	const i = previous_index(text, index, state)
	const decorator = decorator_start(text, i, state)
	if (decorator >= 0) return is_statement_start(text, decorator, state)
	if (i < 0 || state.expression_after.has(i + 1)) return true
	const char = /** @type {string} */(text[i])/**/
	if (identifier_part_regex.test(char)) {
		const word = previous_word(text, i)
		const line_break = line_terminator_regex.test(text.slice(i + 1, index))
		if (word == "default" || word == "export" || declaration_modifiers.has(word) && !line_break) {
			return is_statement_start(text, i - word.length + 1, state)
		}
		return block_keywords.has(word)
			|| !is_keyword_before_expression(text, i, state)
			|| line_break && (word == "return" || word == "yield")
	}
	if (char == ":") return state.colons.get(i) == true
	if (char == "{") return current_bracket(state).kind == "block"
	return char == ";" || char == "\"" || char == "'" || !is_expression_start(text, index, state)
}
/**
 * @param {string} text
 * @param {number} index
 * @param {import("../../private.js").ScanState} state
 * @returns {number}
 */
function scan_keyword(text, index, state) {
	let end = index
	while (identifier_part_regex.test(text[end] ?? "")) end++
	const word = text.slice(index, end)
	const next = next_index(text, end)
	const bracket = current_bracket(state)
	const name_follows = identifier_part_regex.test(text[next] ?? "") && !line_terminator_regex.test(text.slice(end, next))
	if (word == "export" || word == "import") {
		import_alias_regex.lastIndex = next
		const declaration = state.brackets.length == 1
			&& bracket.start < 0
			&& text[next] != "("
			&& text[next] != "."
			&& !(word == "import" && import_alias_regex.test(text))
		if (bracket.script && (declaration || word == "import" && text[next] == ".")) {
			bracket.script.module_syntax = true
		}
	} else if (word == "as" || word == "satisfies") {
		const i = previous_index(text, index, state)
		if (word == "as" && previous_word(text, i) == "export") {
			let name_end = next
			while (identifier_part_regex.test(text[name_end] ?? "")) name_end++
			name_end = next_index(text, name_end)
			while (identifier_part_regex.test(text[name_end] ?? "")) name_end++
			state.expression_after.set(name_end, true)
		} else if (!is_expression_start(text, index, state) && !line_terminator_regex.test(text.slice(i + 1, index))) {
			bracket.type_end = skip_type(text, end)
			record_operand(bracket.type_end, state)
		}
	} else if (word == "interface") {
		if (name_follows) {
			bracket.body = "class"
			bracket.body_declaration = true
			bracket.body_keywords = ""
			bracket.body_start = -1
		}
	} else if (word == "type") {
		if (name_follows) {
			let i = next
			while (identifier_part_regex.test(text[i] ?? "")) i++
			i = next_index(text, i)
			if (text[i] == "<") i = next_index(
				text,
				skip_type_arguments(text, i)
			)
			if (text[i] == "=") {
				bracket.type_end = skip_type(text, i + 1)
				state.expression_after.set(bracket.type_end, true)
			}
		}
	} else if (!property_name_end_chars.includes(text[next] ?? ",") && !is_method_name(text, index, end, state)) {
		bracket.body = word == "class"
			? "class"
			: "function"
		bracket.body_declaration = is_statement_start(text, index, state)
		bracket.body_start = -1
		if (word == "class") {
			bracket.body_keywords = ""
		} else {
			const i = previous_index(text, index, state)
			const is_async = previous_word(text, i) == "async" && !line_terminator_regex.test(text.slice(i + 1, index))
			generator_star_regex.lastIndex = end
			const is_generator = generator_star_regex.test(text)
			bracket.body_keywords = is_async
				? is_generator
					? "await yield"
					: "await"
				: is_generator
					? "yield"
					: ""
		}
	}
	return end
}
/**
 * @param {string} text
 * @param {number} index
 * @returns {number}
 */
function skip_type(text, index) {
	let conditionals = 0
	let end = index
	let i = next_index(text, index)
	let operand = false
	let parameters = false
	let questions = 0
	while (i < text.length) {
		const char = /** @type {string} */(text[i])/**/
		const line_break = operand && line_terminator_regex.test(text.slice(end, i))
		const after_parameters = parameters
		parameters = false
		if (identifier_part_regex.test(char)) {
			let word_end = i
			while (identifier_part_regex.test(text[word_end] ?? "")) word_end++
			const word = text.slice(i, word_end)
			if (operand) {
				if (word == "extends" && !line_break) conditionals++
				else if (word != "is") return end
				operand = false
			} else if (!type_operators.has(word)) {
				end = word_end
				operand = true
			}
			i = next_index(text, word_end)
		} else if (operand) {
			if (char == "&" || char == "." || char == "|") {
				operand = false
				i = next_index(text, i + 1)
			} else if (char == "=" && text[i + 1] == ">" && after_parameters) {
				operand = false
				i = next_index(text, i + 2)
			} else if (char == "?" && conditionals > questions) {
				operand = false
				questions++
				i = next_index(text, i + 1)
			} else if (char == ":" && questions) {
				conditionals--
				operand = false
				questions--
				i = next_index(text, i + 1)
			} else if (char == "<" && !line_break) {
				end = skip_type_arguments(text, i)
				i = next_index(text, end)
			} else if ((char == "(" || char == "[") && !line_break) {
				end = skip_brackets(text, i)
				i = next_index(text, end)
			} else {
				return end
			}
		} else if (char == "(" || char == "[" || char == "{") {
			end = skip_brackets(text, i)
			operand = true
			parameters = char == "("
			i = next_index(text, end)
		} else if (char == "\"" || char == "'") {
			end = skip_quoted(text, i)
			operand = true
			i = next_index(text, end)
		} else if (char == "`") {
			end = skip_template_type(text, i)
			operand = true
			i = next_index(text, end)
		} else if (char == "<") {
			i = next_index(
				text,
				skip_type_arguments(text, i)
			)
		} else if (char == "&" || char == "-" || char == "|") {
			i = next_index(text, i + 1)
		} else {
			return end
		}
	}
	return end
}
/**
 * @param {string} text
 * @param {number} index
 * @param {import("../../private.js").ScanState} state
 * @returns {number}
 */
export default function(text, index, state) {
	const char = text[index]
	if (char == "(" || char == "[" || char == "{") {
		open_bracket(text, index, state)
	} else if (char == ")" || char == "]" || char == "}") {
		close_bracket(index, state)
		const bracket = current_bracket(state)
		if (char == ")" && bracket.body == "function") {
			const next = next_index(text, index + 1)
			const ends = next == text.length
				|| text[next] == ";"
				|| text[next] == "}"
				|| line_terminator_regex.test(text.slice(index + 1, next))
			if (ends && text[next] != "{" && text[next] != ":") {
				bracket.body = ""
				state.expression_after.set(index + 1, true)
			}
		}
	} else if (char == "=") {
		const bracket = current_bracket(state)
		if (index >= bracket.type_end) {
			bracket.arrow = index
			bracket.arrow_async = state.arrows.get(index) ?? is_async_arrow(text, index, state)
			bracket.arrow_inside = index + 2
		}
		return index + 2
	} else if (char == "?") {
		const next = text[index + 1]
		if (next == "?") return index + 2
		if (next == "." && !/\d/.test(text[index + 2] ?? "")) return index + 2
		current_bracket(state).ternaries++
	} else if (char == ":") {
		const bracket = current_bracket(state)
		if (bracket.ternaries) {
			bracket.ternaries--
			state.colons.set(index, false)
		} else if (text[previous_index(text, index, state)] == ")" && !is_case_clause(text, index, state)) {
			const type_end = skip_type(text, index + 1)
			const next = next_index(text, type_end)
			bracket.type_end = type_end
			if (text.startsWith("=>", next)) {
				state.arrows.set(
					next,
					is_async_arrow(text, index, state)
				)
			} else if (text[next] == "{" && bracket.body) {
				bracket.body_start = next
			} else if (text[next] == "{" && (bracket.kind == "{" || bracket.members)) {
				bracket.body = "function"
				bracket.body_declaration = false
				bracket.body_keywords = method_body_keywords(
					text,
					previous_index(text, index, state),
					state
				)
				bracket.body_start = next
			} else if (bracket.body == "function") {
				bracket.body = ""
				state.expression_after.set(type_end, true)
			}
			state.colons.set(index, bracket.kind == "block")
		} else if (is_declaration_annotation(text, index, state)) {
			const type_end = skip_type(text, index + 1)
			bracket.type_end = type_end
			state.colons.set(index, false)
			state.expression_after.set(type_end, true)
		} else {
			state.colons.set(index, bracket.kind == "block")
		}
	} else {
		return scan_keyword(text, index, state)
	}
	return index + 1
}