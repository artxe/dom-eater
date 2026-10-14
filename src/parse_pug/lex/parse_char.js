import is_js_whitespace from "../is_js_whitespace.js"
import create_char_state from "./create_char_state.js"
import is_operand_end from "./is_operand_end.js"
import is_punctuator from "./is_punctuator.js"
const char_kinds = Uint8Array.from(
	{ length: 128 },
	(_, code) => code >= 9 && code <= 13 || code == 32
		? 1
		: code >= 48 && code <= 57 || code >= 65 && code <= 90 || code >= 97 && code <= 122 || code == 95
			? 2
			: code == 36
				? 3
				: 0
)
const digits_regex = /^\d+$/
const identifier_part_regex = /[\p{ID_Continue}$]/u
const plain_codes = Uint8Array.from(
	{ length: 128 },
	(_, code) => "\"'()*/:?[]`{}".includes(String.fromCharCode(code))
		? 0
		: 1
)
const regexp_keywords = new Set(
	[
		"break",
		"case",
		"catch",
		"class",
		"const",
		"continue",
		"debugger",
		"default",
		"delete",
		"do",
		"else",
		"enum",
		"export",
		"extends",
		"finally",
		"for",
		"function",
		"if",
		"implements",
		"import",
		"in",
		"instanceof",
		"interface",
		"let",
		"new",
		"package",
		"private",
		"protected",
		"public",
		"return",
		"static",
		"super",
		"switch",
		"this",
		"throw",
		"try",
		"typeof",
		"var",
		"void",
		"while",
		"with",
		"yield"
	]
)
/**
 * @param {import("../../../private.js").PugCharState} state
 * @param {string} char
 * @param {number} code
 * @returns {void}
 */
function append_history(state, char, code) {
	if ((code == 43 || code == 45) && state.last != char) {
		state.operand_before = is_operand_end(state)
	}
	state.undo_ident = state.ident
	state.undo_ident_before = state.ident_before
	state.undo_last = state.last
	state.undo_last_operand = state.last_operand
	state.undo_recent = state.recent
	state.undo_recent_kind = state.recent_kind
	state.undo_separated = state.separated
	state.undo_word = state.word
	const kind = code < 128
		? /** @type {number} */(char_kinds[code])/**/
		: is_js_whitespace(char)
			? 1
			: identifier_part_regex.test(char)
				? 3
				: 0
	if (kind == 1) {
		state.recent = char
		state.recent_kind = 1
		return
	}
	const last_operand = state.recent_kind != 1
		&& state.recent !== ""
		&& ((code == 43 || code == 45) && state.last == char && !state.last_operand && state.operand_before
			|| code == 46 && state.ident_before != "." && digits_regex.test(state.ident))
	state.word = kind == 2
		? state.recent_kind == 2
			? state.word + char
			: char
		: ""
	if (kind < 2) {
		state.ident = ""
	} else if (state.recent_kind >= 2 && !state.separated) {
		state.ident += char
	} else {
		state.ident = char
		state.ident_before = state.last
	}
	state.last = char
	state.last_operand = last_operand
	state.recent = char
	state.recent_kind = kind
	state.separated = false
}
/**
 * The state of acorn, which reads from here on what character-parser reads differently.
 * @param {import("../../../private.js").PugCharState} state
 * @param {string} char
 * @returns {import("../../../private.js").PugCharState}
 */
function create_tail(state, char) {
	const tail = create_char_state()
	tail.last = char
	tail.recent = char
	tail.ternaries = state.ternaries
	return tail
}
/**
 * @param {import("../../../private.js").PugCharState} state
 * @returns {boolean}
 */
function is_regexp(state) {
	if (state.last == ")") {
		return false
	}
	if (state.last == "}" || is_punctuator(state.last)) {
		return true
	}
	return state.word != "" && regexp_keywords.has(state.word)
}
/**
 * @param {import("../../../private.js").PugCharState} state
 * @param {string} char
 * @param {number} code
 * @param {string | undefined} current
 * @param {boolean} after_regexp
 * @returns {boolean}
 */
function parse_default(
	state,
	char,
	code,
	current,
	after_regexp
) {
	const stack = state.stack
	if (code == 40) {
		stack.push(")")
	} else if (code == 91) {
		stack.push("]")
	} else if (code == 123) {
		stack.push("}")
	} else if (code == 41 || code == 93 || code == 125) {
		if (current !== char) {
			return false
		}
		stack.pop()
	} else if (state.recent == "/" && (code == 47 || code == 42)) {
		state.ident = state.undo_ident
		state.ident_before = state.undo_ident_before
		state.last = state.undo_last
		state.last_operand = state.undo_last_operand
		state.recent = state.undo_recent
		state.recent_kind = state.undo_recent_kind
		state.separated = true
		state.word = state.undo_word
		if (after_regexp && !state.tail) {
			// acorn reads this `/` or `*` as an operator, character-parser as a comment
			state.tail = create_tail(state, char)
		}
		if (code == 47) {
			stack.push("//")
			state.line_comment = true
		} else {
			stack.push("/**/")
		}
		return true
	} else if (code == 47 && is_regexp(state)) {
		stack.push("//g")
		state.regexp_start = true
		if (!state.tail && is_operand_end(state)) {
			// acorn reads this `/` as a division, character-parser as a regexp
			state.tail = create_tail(state, char)
		}
	} else if (code == 34 || code == 39 || code == 96) {
		stack.push(char)
	} else if (stack.length == 0 && code == 63) {
		state.ternaries++
	} else if (stack.length == 0 && code == 58) {
		state.ternaries--
	}
	append_history(state, char, code)
	return true
}
/**
 * @param {import("../../../private.js").PugCharState} state
 * @param {string} char
 * @returns {boolean}
 */
export default function parse_char(state, char) {
	if (state.tail) {
		parse_char(state.tail, char)
	}
	const after_regexp = state.regexp_closed
	state.regexp_closed = false
	const code = char.charCodeAt(0)
	const stack = state.stack
	if (state.regexp_start) {
		if (code == 47 || code == 42) {
			stack.pop()
		}
		state.regexp_start = false
	}
	const current = stack[stack.length - 1]
	if (current === undefined && code < 128 && plain_codes[code]) {
		append_history(state, char, code)
	} else if (current === undefined || current == ")" || current == "]" || current == "}") {
		if (!parse_default(
			state,
			char,
			code,
			current,
			after_regexp
		)) {
			return false
		}
	} else if (current == "//") {
		if (code == 10) {
			stack.pop()
		}
	} else if (current == "/**/") {
		if (state.last_char == "*" && code == 47) {
			stack.pop()
		}
	} else if (current == "`") {
		if (code == 96 && !state.escaped) {
			stack.pop()
			state.has_dollar = false
			append_history(state, char, code)
		} else if (code == 92 && !state.escaped) {
			state.escaped = true
			state.has_dollar = false
		} else if (code == 36 && !state.escaped) {
			state.has_dollar = true
		} else if (code == 123 && state.has_dollar) {
			stack.push("}")
			append_history(state, char, code)
		} else {
			state.escaped = false
			state.has_dollar = false
		}
	} else if (code == (current == "//g" ? 47 : current.charCodeAt(0)) && !state.escaped) {
		stack.pop()
		append_history(state, char, code)
		if (current == "//g") {
			state.last_operand = true
			state.regexp_closed = true
		}
	} else {
		append_history(state, char, code)
		state.escaped = code == 92 && !state.escaped
	}
	state.last_char = char
	return true
}