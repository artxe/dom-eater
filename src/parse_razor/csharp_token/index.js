import interpolated_end from "../interpolated_end.js"
import is_decimal_char from "../is_decimal_char.js"
import is_newline from "../is_newline.js"
import is_whitespace from "../is_whitespace.js"
import line_end from "../line_end.js"
import newline_end from "../newline_end.js"
import skip_whitespace from "../skip_whitespace.js"
import string_end from "./string_end.js"
const binary_digit_regex = /[01_]*/y
/** @type {{ index: number, text: string, token: import("../../../private.js").RazorToken | undefined }} */
const cache = {
	index: -1,
	text: "",
	token: undefined
}
const decimal_digit_regex = /[\d_]*/y
const directive_name_regex = /(?:elif|else|endif|if)\b/y
const hex_digit_regex = /[\dA-F_a-f]*/y
const hex_regex = /^[\dA-Fa-f]+$/
const identifier_char_regex = /[\p{Cf}\p{L}\p{Mc}\p{Mn}\p{Nd}\p{Nl}\p{Pc}]/u
const identifier_part_regex = /[\p{Cf}\p{L}\p{Mc}\p{Mn}\p{Nd}\p{Nl}\p{Pc}]*/uy
const identifier_start_regex = /[\p{L}\p{Nl}_]/u
const keywords = new Set(
	[
		"_",
		"__arglist",
		"__makeref",
		"__reftype",
		"__refvalue",
		"abstract",
		"add",
		"alias",
		"allows",
		"and",
		"as",
		"ascending",
		"assembly",
		"async",
		"await",
		"base",
		"bool",
		"break",
		"by",
		"byte",
		"case",
		"catch",
		"char",
		"checked",
		"class",
		"closed",
		"const",
		"continue",
		"decimal",
		"default",
		"delegate",
		"descending",
		"do",
		"double",
		"else",
		"enum",
		"equals",
		"event",
		"explicit",
		"extension",
		"extern",
		"false",
		"field",
		"file",
		"finally",
		"fixed",
		"float",
		"for",
		"foreach",
		"from",
		"get",
		"global",
		"goto",
		"group",
		"if",
		"implicit",
		"in",
		"init",
		"int",
		"interface",
		"internal",
		"into",
		"is",
		"join",
		"let",
		"lock",
		"long",
		"managed",
		"method",
		"module",
		"nameof",
		"namespace",
		"new",
		"not",
		"null",
		"object",
		"on",
		"operator",
		"or",
		"orderby",
		"out",
		"override",
		"param",
		"params",
		"partial",
		"private",
		"property",
		"protected",
		"public",
		"readonly",
		"record",
		"ref",
		"remove",
		"required",
		"return",
		"safe",
		"sbyte",
		"scoped",
		"sealed",
		"select",
		"set",
		"short",
		"sizeof",
		"stackalloc",
		"static",
		"string",
		"struct",
		"switch",
		"this",
		"throw",
		"true",
		"try",
		"type",
		"typeof",
		"typevar",
		"uint",
		"ulong",
		"unchecked",
		"union",
		"unmanaged",
		"unsafe",
		"ushort",
		"using",
		"var",
		"virtual",
		"void",
		"volatile",
		"when",
		"where",
		"while",
		"with",
		"yield"
	]
)
const punctuator_kinds = new Set(
	[
		"!",
		"(",
		")",
		",",
		".",
		":",
		"::",
		";",
		"<",
		"=",
		">",
		"?",
		"[",
		"]",
		"{",
		"}"
	]
)
/**
 * @param {string} text
 * @param {number} index
 * @param {string} marker
 * @returns {number}
 */
function conflict_disabled_end(text, index, marker) {
	for (let i = index; i < text.length; i++) {
		if (marker == "|" && text[i] == "=" && is_conflict_marker(text, i)) return i
		if (text[i] == ">" && is_conflict_marker(text, i)) return line_end(text, i)
	}
	return text.length
}
/**
 * @param {string} text
 * @param {number} index
 * @param {number} directive_end
 * @returns {number}
 */
function disabled_text_end(text, index, directive_end) {
	const directive = read_directive(text, index)
	if (!directive) return directive_end
	if (directive.name == "if") {
		return evaluate_condition(directive.condition)
			? directive_end
			: skip_disabled_lines(text, directive_end)
	}
	if (directive.name != "elif" && directive.name != "else") return directive_end
	let depth = 0
	let taken = false
	for (let start = line_start(text, index); start > 0;) {
		start = line_start(text, start - 1)
		const previous = read_directive(text, start)
		if (previous?.name == "endif") {
			depth++
		} else if (previous?.name == "if") {
			if (!depth) {
				if (!taken) taken = evaluate_condition(previous.condition)
				break
			}
			depth--
		} else if (previous?.name == "elif" && !depth) {
			if (!taken) taken = evaluate_condition(previous.condition)
		}
	}
	if (taken) return skip_disabled_lines(text, directive_end)
	return directive.name == "else" || evaluate_condition(directive.condition)
		? directive_end
		: skip_disabled_lines(text, directive_end)
}
/**
 * @param {string} text
 * @param {number} index
 * @returns {number}
 */
function doc_comment_end(text, index) {
	let i = index
	for (;;) {
		i = line_end(text, i)
		if (i >= text.length) return i
		i = newline_end(text, i)
		const next = skip_whitespace(text, i)
		if (!text.startsWith("///", next) || text[next + 3] == "/") return i
	}
}
/**
 * @param {string} condition
 * @returns {boolean}
 */
function evaluate_condition(condition) {
	const tokens = condition.replace(/\/\/.*/, "").match(
		/&&|\|\||==|!=|[!()]|[^\s!&|=()]+/g
	) ?? []
	let position = 0
	/**
	 * @returns {boolean}
	 */
	function and() {
		let value = equality()
		while (tokens[position] == "&&") {
			position++
			value = equality() && value
		}
		return value
	}
	/**
	 * @returns {boolean}
	 */
	function equality() {
		let value = primary()
		while (tokens[position] == "==" || tokens[position] == "!=") {
			const operator = tokens[position++]
			const right = primary()
			value = operator == "=="
				? value == right
				: value != right
		}
		return value
	}
	/**
	 * @returns {boolean}
	 */
	function or() {
		let value = and()
		while (tokens[position] == "||") {
			position++
			value = and() || value
		}
		return value
	}
	/**
	 * @returns {boolean}
	 */
	function primary() {
		const token = tokens[position++]
		if (token == "!") return !primary()
		if (token == "(") {
			const value = or()
			position++
			return value
		}
		return token == "true"
	}
	return or()
}
/**
 * @param {string} text
 * @param {number} index
 * @returns {number}
 */
function identifier_end(text, index) {
	let i = index
	for (;;) {
		while (is_ascii_identifier_code(text.charCodeAt(i))) i++
		identifier_part_regex.lastIndex = i
		identifier_part_regex.test(text)
		i = identifier_part_regex.lastIndex
		const escape = text[i] == "\\"
			? unicode_escape(text, i)
			: undefined
		if (!escape || !identifier_char_regex.test(escape.char)) return i
		i = escape.end
	}
}
/**
 * @param {string} text
 * @param {number} index
 * @returns {number}
 */
function integer_suffix_end(text, index) {
	const char = text[index]
	const next = text[index + 1]
	if (char == "l" || char == "L") {
		return next == "u" || next == "U"
			? index + 2
			: index + 1
	}
	if (char == "u" || char == "U") {
		return next == "l" || next == "L"
			? index + 2
			: index + 1
	}
	return index
}
/**
 * @param {number} code
 * @returns {boolean}
 */
function is_ascii_identifier_code(code) {
	return code >= 97 && code <= 122
		|| code >= 65 && code <= 90
		|| code >= 48 && code <= 57
		|| code == 95
}
/**
 * @param {string} text
 * @param {number} index
 * @returns {boolean}
 */
function is_conflict_marker(text, index) {
	const marker = text[index] ?? ""
	if (index > 0 && !is_newline(text[index - 1] ?? "")) return false
	if (text.slice(index, index + 7) != marker.repeat(7)) return false
	return marker == "=" || marker == "|" || text[index + 7] == " "
}
/**
 * @param {string} text
 * @param {number} index
 * @returns {boolean}
 */
function is_line_start(text, index) {
	let i = index - 1
	while (i >= 0 && is_whitespace(text[i] ?? "")) i--
	return i < 0 || is_newline(text[i] ?? "")
}
/**
 * @param {string} text
 * @param {number} index
 * @returns {number}
 */
function line_start(text, index) {
	let i = index
	while (i > 0 && !is_newline(text[i - 1] ?? "")) i--
	return i
}
/**
 * @param {string} text
 * @param {number} index
 * @returns {number}
 */
function number_end(text, index) {
	let i = index
	const second = text[i + 1]
	if (text[i] == "0" && (second == "x" || second == "X" || second == "b" || second == "B")) {
		const regex = second == "x" || second == "X"
			? hex_digit_regex
			: binary_digit_regex
		regex.lastIndex = i + 2
		regex.test(text)
		return integer_suffix_end(text, regex.lastIndex)
	}
	decimal_digit_regex.lastIndex = i
	decimal_digit_regex.test(text)
	i = decimal_digit_regex.lastIndex
	let real = false
	if (text[i] == "." && is_decimal_char(text[i + 1] ?? "")) {
		real = true
		decimal_digit_regex.lastIndex = i + 1
		decimal_digit_regex.test(text)
		i = decimal_digit_regex.lastIndex
	}
	if (text[i] == "e" || text[i] == "E") {
		real = true
		i++
		if (text[i] == "+" || text[i] == "-") i++
		decimal_digit_regex.lastIndex = i
		decimal_digit_regex.test(text)
		i = decimal_digit_regex.lastIndex
	}
	return suffix_end(text, i, real)
}
/**
 * @param {string} text
 * @param {number} index
 * @returns {number}
 */
function operator_end(text, index) {
	const char = text[index]
	const next = text[index + 1]
	if (char == ":") {
		return next == ":"
			? index + 2
			: index + 1
	}
	if (char == "?") {
		return next == "?"
			? text[index + 2] == "="
				? index + 3
				: index + 2
			: index + 1
	}
	if (char == "<") {
		return next == "="
			? index + 2
			: next == "<"
				? text[index + 2] == "="
					? index + 3
					: index + 2
				: index + 1
	}
	if (char == "=") {
		return next == "=" || next == ">"
			? index + 2
			: index + 1
	}
	if (char == "!" || char == "*" || char == "/" || char == "%" || char == "^" || char == ">") {
		return next == "="
			? index + 2
			: index + 1
	}
	if (char == "+" || char == "&" || char == "|") {
		return next == "=" || next == char
			? index + 2
			: index + 1
	}
	if (char == "-") {
		return next == "=" || next == "-" || next == ">"
			? index + 2
			: index + 1
	}
	const code = text.charCodeAt(index)
	const next_code = text.charCodeAt(index + 1)
	return code >= 0xd800 && code <= 0xdbff && next_code >= 0xdc00 && next_code <= 0xdfff
		? index + 2
		: index + 1
}
/**
 * @param {string} text
 * @param {number} index
 * @returns {{ condition: string, name: string } | undefined}
 */
function read_directive(text, index) {
	let i = skip_whitespace(text, index)
	if (text[i] != "#") return
	i = skip_whitespace(text, i + 1)
	directive_name_regex.lastIndex = i
	const match = directive_name_regex.exec(text)
	if (!match) return
	return {
		condition: text.slice(
			directive_name_regex.lastIndex,
			line_end(text, i)
		),
		name: match[0]
	}
}
/**
 * @param {string} text
 * @param {number} index
 * @returns {import("../../../private.js").RazorToken | undefined}
 */
function scan_token(text, index) {
	const char = text[index]
	if (char === undefined) return
	const next = text[index + 1]
	if (is_whitespace(char)) {
		return {
			end: skip_whitespace(text, index),
			kind: "ws"
		}
	}
	if (is_newline(char)) {
		return {
			end: newline_end(text, index),
			kind: "nl"
		}
	}
	if (char == "/" && next == "/") {
		return {
			end: text[index + 2] == "/" && text[index + 3] != "/"
				? doc_comment_end(text, index)
				: line_end(text, index),
			kind: "comment"
		}
	}
	if (char == "/" && next == "*") {
		const close = text.indexOf("*/", index + 2)
		return {
			end: close < 0
				? text.length
				: close + 2,
			kind: "comment"
		}
	}
	if (char == "#") {
		const end = line_end(text, index)
		const directive_end = end < text.length
			? newline_end(text, end)
			: end
		return is_line_start(text, index)
			? {
				end: disabled_text_end(text, index, directive_end),
				kind: "directive"
			}
			: {
				end: directive_end,
				kind: "comment"
			}
	}
	if ((char == "<" || char == "=" || char == "|") && is_conflict_marker(text, index)) {
		const end = line_end(text, index)
		return {
			end: char == "<" || end == text.length
				? end
				: conflict_disabled_end(text, newline_end(text, end), char),
			kind: "conflict"
		}
	}
	if (char == "@" && next == "*") {
		const close = text.indexOf("*@", index + 2)
		return {
			end: close < 0
				? text.length
				: close + 2,
			kind: "@*"
		}
	}
	if (char == "\\") {
		const escape = unicode_escape(text, index)
		if (escape) {
			return {
				end: identifier_start_regex.test(escape.char)
					? identifier_end(text, escape.end)
					: escape.end,
				kind: "marker"
			}
		}
	}
	if (identifier_start_regex.test(char)) {
		const end = identifier_end(text, index + 1)
		return {
			end,
			kind: keywords.has(text.slice(index, end))
				? "keyword"
				: "identifier"
		}
	}
	if (is_decimal_char(char) || char == "." && is_decimal_char(next ?? "")) {
		return {
			end: char == "." && text[index - 1] == "."
				? index + 1
				: number_end(text, index),
			kind: "number"
		}
	}
	if (char == "@") {
		if (next == "\"" || next == "$" && text[index + 2] == "\"") {
			return {
				end: string_end(text, index),
				kind: "string"
			}
		}
		return { end: index + 1, kind: "@" }
	}
	if (char == "'") {
		return {
			end: string_end(text, index),
			kind: "char"
		}
	}
	if (char == "\"" || char == "$" && (next == "\"" || next == "$" || next == "@" && text[index + 2] == "\"")) {
		return {
			end: string_end(text, index),
			kind: "string"
		}
	}
	if (char == "$" && next == "@") {
		return {
			end: interpolated_end(text, index),
			kind: "marker"
		}
	}
	const end = operator_end(text, index)
	const value = text.slice(index, end)
	return {
		end,
		kind: punctuator_kinds.has(value)
			? value
			: "!%&*+-/<=>?^|~".includes(char)
				? "operator"
				: "marker"
	}
}
/**
 * @param {string} text
 * @param {number} index
 * @returns {number}
 */
function skip_disabled_lines(text, index) {
	let depth = 0
	for (let i = index; i < text.length;) {
		const directive = read_directive(text, i)
		if (directive?.name == "if") {
			depth++
		} else if (directive?.name == "endif") {
			if (!depth) return i
			depth--
		} else if ((directive?.name == "elif" || directive?.name == "else") && !depth) {
			return i
		}
		i = line_end(text, i)
		if (i < text.length) i = newline_end(text, i)
	}
	return text.length
}
/**
 * @param {string} text
 * @param {number} index
 * @param {boolean} real
 * @returns {number}
 */
function suffix_end(text, index, real) {
	const char = text[index]
	if (char == "f" || char == "F" || char == "d" || char == "D" || char == "m" || char == "M") return index + 1
	return real
		? index
		: integer_suffix_end(text, index)
}
/**
 * @param {string} text
 * @param {number} index
 * @returns {{ char: string, end: number } | undefined}
 */
function unicode_escape(text, index) {
	const length = text[index + 1] == "u"
		? 4
		: text[index + 1] == "U"
			? 8
			: 0
	if (!length) return
	const digits = text.slice(index + 2, index + 2 + length)
	if (digits.length < length || !hex_regex.test(digits)) return
	const code = parseInt(digits, 16)
	if (code > 0x10ffff) return
	return {
		char: String.fromCodePoint(code)[0] ?? "",
		end: index + 2 + length
	}
}
/**
 * @param {string} text
 * @param {number} index
 * @returns {import("../../../private.js").RazorToken | undefined}
 */
export default function(text, index) {
	if (cache.index == index && cache.text === text) return cache.token
	const token = scan_token(text, index)
	cache.index = index
	cache.text = text
	cache.token = token
	return token
}