import create_ast_syntax_error from "../../create_ast_syntax_error.js"
import is_js_whitespace from "../is_js_whitespace.js"
import create_char_state from "./create_char_state.js"
import is_expression_end from "./is_expression_end.js"
import is_punctuator from "./is_punctuator.js"
import parse_char from "./parse_char.js"
import parse_until from "./parse_until.js"
const append_regex = /(?:block +)?append +([^\n]+)/y
const attribute_whitespace = " \n\t"
const blank_regex = /\n[ \t]*\n/y
const block_regex = /block +([^\n]+)/y
const call_args_regex = / *\(/y
const call_attributes_regex = /^\s*[-\w]+ *=/
const call_regex = /\+(\s*)(([-\w]+)|(#\{))/y
const case_keyword_regex = /case\b/y
const case_regex = /case +([^\n]+)/y
const class_digits_regex = /\.[_a-z0-9-]+/iy
const class_regex = /\.([_a-z0-9-]*[_a-z][_a-z0-9-]*)/iy
const code_regex = /(!?=|-)[ \t]*(?=[^\n])/y
const colon_regex = /: +/y
const comment_regex = /\/\/(-)?[^\n]*/y
const conditional_regex = /(if|unless|else if|else)\b([^\n]*)/y
const default_keyword_regex = /default\b/y
const default_regex = /default/y
const doctype_regex = /doctype *[^\n]*/y
const dot_regex = /\./y
const each_dash_regex = /- *(?:each|for) +[a-zA-Z_$][\w$]*(?: *, *[a-zA-Z_$][\w$]*)? +in +[^\n]+/y
const each_keyword_regex = /(?:each|for)\b/y
const each_of_dash_regex = /- *(?:each|for) +[a-zA-Z_$][\w$]*(?: *, *[a-zA-Z_$][\w$]*)? +of +[^\n]+/y
const each_of_pair_regex = /^\[ *[a-zA-Z_$][\w$]* *, *[a-zA-Z_$][\w$]* *\]$/
const each_of_regex = /(?:each|for) (.*?) of *([^\n]+)/y
const each_regex = /(?:each|for) +[a-zA-Z_$][\w$]*(?: *, *[a-zA-Z_$][\w$]*)? * in *([^\n]+)/y
const end_of_line_regex = /[ \t]*(?:\n|$)/y
const extends_keyword_regex = /extends?\b/y
const extends_regex = /extends?(?= |\n|$)/y
const filter_regex = /:[\w-]+/y
const id_regex = /#[\w-]+/y
const identifier_value_regex = /^[a-zA-Z_$][\w$]*$/
const include_keyword_regex = /include\b/y
const include_regex = /include(?=:| |\n|$)/y
const include_rest_regex = /[^ \n]+/y
const indent_spaces_regex = /\n( *)/y
const indent_tabs_regex = /\n(\t*) */y
const invalid_name_regex = /[^ \t(#.:\n]*/y
const mixin_block_regex = /block/y
const mixin_regex = /mixin +([-\w]+)(?: *\((.*)\))? */y
const path_regex = / ([^\n]+)/y
const prepend_regex = /(?:block +)?prepend +([^\n]+)/y
const slash_regex = /\//y
const tag_regex = /\w(?:[-:\w]*\w)?/y
const when_keyword_regex = /when\b/y
const when_regex = /when +([^:\n]+)/y
const when_rest_regex = /:[^:\n]+/y
const while_keyword_regex = /while\b/y
const while_regex = /while +([^\n]+)/y
const yield_regex = /yield/y
/**
 * @param {import("../../../private.js").PugLexer} lexer
 * @param {string} message
 * @param {number} start
 * @param {number} end
 * @returns {void}
 */
function add_error(lexer, message, start, end) {
	lexer.errors.push(
		create_ast_syntax_error(
			message,
			lexer.base + start,
			lexer.base + end
		)
	)
}
/**
 * @param {import("../../../private.js").PugLexer} lexer
 * @param {"text" | "text-html"} type
 * @param {number} start
 * @param {number} end
 * @returns {void}
 */
function add_text(lexer, type, start, end) {
	const value = lexer.src.slice(start, end)
	const allowed = lexer.interpolation_allowed
	let from = 0
	let text_from = 0
	let close_index = -2
	let escaped_index = -2
	let interpolation_index = -2
	let open_index = -2
	let search = value
	while (from < value.length || text_from < from) {
		if (lexer.interpolated && close_index != -1 && close_index < from) {
			close_index = value.indexOf("]", from)
			escaped_index = -2
			interpolation_index = -2
			open_index = -2
			search = close_index < 0
				? value
				: value.slice(0, close_index)
		}
		if (allowed && open_index != -1 && open_index < from) open_index = search.indexOf("#[", from)
		if (allowed && escaped_index != -1 && escaped_index < from) escaped_index = search.indexOf("\\#[", from)
		if (allowed && interpolation_index != -1 && interpolation_index < from) {
			interpolation_index = string_interpolation_index(lexer, search, from)
		}
		const close = lexer.interpolated && close_index >= 0
			? close_index
			: Infinity
		const open = allowed && open_index >= 0
			? open_index
			: Infinity
		const escaped = allowed && escaped_index >= 0
			? escaped_index
			: Infinity
		const string_interpolation = allowed && interpolation_index >= 0
			? interpolation_index
			: Infinity
		if (escaped < close && escaped < open && escaped < string_interpolation) {
			from = escaped + 3
		} else if (open < close && open < escaped && open < string_interpolation) {
			push_token(
				lexer,
				type,
				start + text_from,
				start + open
			)
			push_token(
				lexer,
				"start-pug-interpolation",
				start + open,
				start + open + 2
			)
			const child = create_lexer(
				value.slice(open + 2),
				lexer.base + start + open + 2,
				lexer
			)
			while (!child.ended) advance(child)
			const child_end = open + 2 + child.index
			if (!child.closed) {
				add_error(
					lexer,
					"End of line was reached with no closing bracket for interpolation.",
					start + open,
					end
				)
			}
			push_token(
				lexer,
				"end-pug-interpolation",
				start + (child.closed
					? child_end - 1
					: child_end),
				start + child_end
			)
			from = child_end
			text_from = child_end
		} else if (close < open && close < escaped && close < string_interpolation) {
			if (close > text_from) push_token(
				lexer,
				type,
				start + text_from,
				start + close
			)
			lexer.closed = true
			lexer.ended = true
			lexer.index = start + close + 1
			return
		} else if (string_interpolation != Infinity) {
			if (value[string_interpolation] == "\\") {
				from = string_interpolation + 3
				continue
			}
			if (string_interpolation > text_from) push_token(
				lexer,
				type,
				start + text_from,
				start + string_interpolation
			)
			const range = parse_until(
				lexer.src,
				start + string_interpolation + 2,
				end,
				"}"
			)
			mismatch_errors(lexer, range.mismatches)
			const code_end = range.end < 0
				? end
				: range.end
			if (range.end < 0) {
				add_error(
					lexer,
					"End of line was reached with no closing bracket for interpolation.",
					start + string_interpolation,
					end
				)
			}
			const token = push_token(
				lexer,
				"interpolated-code",
				start + string_interpolation,
				Math.min(code_end + 1, end)
			)
			set_code(
				lexer,
				token,
				start + string_interpolation + 2,
				code_end
			)
			token.buffer = true
			if (code_end + 1 >= end) return
			from = code_end + 1 - start
			text_from = from
		} else {
			push_token(lexer, type, start + text_from, end)
			return
		}
	}
}
/**
 * @param {import("../../../private.js").PugLexer} lexer
 * @returns {boolean}
 */
function advance(lexer) {
	if (eos(lexer)) return true
	switch (lexer.src[lexer.index]) {
	case "\n":
		return blank(lexer) || indent(lexer)
	case "]":
		return end_interpolation(lexer) || fail(lexer)
	case "#":
		return interpolation(lexer) || id(lexer)
	case "+":
		return call(lexer) || fail(lexer)
	case "-":
		return each_of(lexer) || each(lexer) || block_code(lexer) || code(lexer)
	case "!":
	case "=":
		return code(lexer) || fail(lexer)
	case ".":
		return dot(lexer) || class_name(lexer)
	case "(":
		return attrs(lexer)
	case "&":
		return attributes_block(lexer) || fail(lexer)
	case " ":
	case "|":
		return text(lexer)
	case "<":
		return text_html(lexer)
	case "/":
		return comment(lexer) || slash(lexer)
	case ":":
		return filter(lexer, false) || colon(lexer) || fail(lexer)
	case "a":
		return named_block(lexer, append_regex, "append") || tag(lexer)
	case "b":
		return named_block(lexer, append_regex, "append")
				|| named_block(lexer, prepend_regex, "prepend")
				|| named_block(lexer, block_regex, "replace")
				|| mixin_block(lexer)
				|| tag(lexer)
	case "c":
		return case_keyword(lexer) || tag(lexer)
	case "d":
		return doctype(lexer) || default_keyword(lexer) || tag(lexer)
	case "e":
		return extends_keyword(lexer) || conditional(lexer) || each_of(lexer) || each(lexer) || tag(lexer)
	case "f":
		return each_of(lexer) || each(lexer) || tag(lexer)
	case "i":
		return include(lexer) || conditional(lexer) || tag(lexer)
	case "m":
		return mixin(lexer) || tag(lexer)
	case "p":
		return named_block(lexer, prepend_regex, "prepend") || tag(lexer)
	case "u":
		return conditional(lexer) || tag(lexer)
	case "w":
		return when_keyword(lexer) || while_keyword(lexer) || tag(lexer)
	case "y":
		return yield_keyword(lexer) || tag(lexer)
	default:
		return tag(lexer) || fail(lexer)
	}
}
/**
 * @param {import("../../../private.js").PugLexer} lexer
 * @param {number} start
 * @param {number} end
 * @returns {number}
 */
function attribute(lexer, start, end) {
	const src = lexer.src
	let i = start
	while (i < end && attribute_whitespace.includes(
		/** @type {string} */(src[i])/**/
	)) i++
	if (i == end) return end
	const key_start = i
	const quote = src[i] == "'" || src[i] == "\""
		? /** @type {string} */(src[i])/**/
		: ""
	if (quote) i++
	const name_start = i
	let name_end = -1
	for (; i < end; i++) {
		const char = /** @type {string} */(src[i])/**/
		if (quote) {
			if (char == quote) {
				name_end = i
				i++
				break
			}
		} else if (attribute_whitespace.includes(char) || char == "!" || char == "=" || char == ",") {
			break
		}
	}
	if (name_end < 0) name_end = i
	const key_end = i
	const value = attribute_value(lexer, key_end, end)
	const token = push_token(
		lexer,
		"attribute",
		key_start,
		value.value_end > value.value_start
			? value.value_end
			: value.equals_end < 0
				? key_end
				: value.equals_end
	)
	token.name = src.slice(name_start, name_end)
	token.buffer = quote != ""
	if (value.value_end > value.value_start) {
		token.value_end = lexer.base + value.value_end
		token.value_start = lexer.base + value.value_start
	}
	i = value.remaining
	while (i < end && attribute_whitespace.includes(
		/** @type {string} */(src[i])/**/
	)) i++
	if (i < end && src[i] == ",") i++
	return i
}
/**
 * @param {import("../../../private.js").PugLexer} lexer
 * @param {number} start
 * @param {number} end
 * @returns {{ equals_end: number, remaining: number, value_end: number, value_start: number }}
 */
function attribute_value(lexer, start, end) {
	const src = lexer.src
	let i = start
	while (i < end && attribute_whitespace.includes(
		/** @type {string} */(src[i])/**/
	)) i++
	if (i == end) {
		return {
			equals_end: -1,
			remaining: start,
			value_end: -1,
			value_start: -1
		}
	}
	if (src[i] == "!") {
		if (src[i + 1] != "=") {
			add_error(
				lexer,
				"Expected \"=\" after \"!\".",
				i,
				i + 1
			)
			return {
				equals_end: -1,
				remaining: i + 1,
				value_end: -1,
				value_start: -1
			}
		}
		i++
	}
	if (src[i] != "=") {
		if (i == start && !attribute_whitespace.includes(
			/** @type {string} */(src[i])/**/
		) && src[i] != ",") {
			add_error(
				lexer,
				`Expected "=" after the attribute name, but found "${src[i]}".`,
				i,
				i + 1
			)
		}
		return {
			equals_end: -1,
			remaining: start,
			value_end: -1,
			value_start: -1
		}
	}
	i++
	const equals_end = i
	while (i < end && attribute_whitespace.includes(
		/** @type {string} */(src[i])/**/
	)) i++
	const value_start = i
	const state = create_char_state()
	for (; i < end; i++) {
		const char = /** @type {string} */(src[i])/**/
		if (state.stack.length == 0) {
			if (attribute_whitespace.includes(char)) {
				let done = false
				let x = i
				for (; x < end; x++) {
					const next = /** @type {string} */(src[x])/**/
					if (!attribute_whitespace.includes(next)) {
						const continues = is_punctuator(next) && next != ":" && !src.startsWith("...", x)
						if (!continues && is_expression_end(state)) done = true
						break
					}
				}
				if (done || x == end) break
			}
			if (char == "," && is_expression_end(state)) break
		}
		parse_char(state, char)
	}
	return {
		equals_end,
		remaining: i,
		value_end: i,
		value_start
	}
}
/**
 * @param {import("../../../private.js").PugLexer} lexer
 * @returns {boolean}
 */
function attributes_block(lexer) {
	if (!lexer.src.startsWith("&attributes", lexer.index) || /[\w]/.test(
		lexer.src[lexer.index + 11] ?? ""
	)) {
		return false
	}
	const start = lexer.index
	lexer.index += 11
	if (!"([{".includes(lexer.src[lexer.index] ?? " ")) {
		add_error(
			lexer,
			"The start character must be \"(\", \"{\" or \"[\".",
			lexer.index,
			lexer.index
		)
		push_token(
			lexer,
			"&attributes",
			start,
			lexer.index
		)
		return true
	}
	const close = bracket_expression(lexer, 0)
	const token = push_token(
		lexer,
		"&attributes",
		start,
		Math.min(close + 1, lexer.src.length)
	)
	set_code(lexer, token, lexer.index + 1, close)
	lexer.index = token.end - lexer.base
	return true
}
/**
 * @param {import("../../../private.js").PugLexer} lexer
 * @returns {boolean}
 */
function attrs(lexer) {
	if (lexer.src[lexer.index] != "(") return false
	const start = lexer.index
	const close = bracket_expression(lexer, 0)
	push_token(
		lexer,
		"start-attributes",
		start,
		start + 1
	)
	lexer.index = Math.min(close + 1, lexer.src.length)
	for (let i = start + 1; i < close;) i = attribute(lexer, i, close)
	push_token(
		lexer,
		"end-attributes",
		close,
		lexer.index
	)
	return true
}
/**
 * @param {import("../../../private.js").PugLexer} lexer
 * @returns {boolean}
 */
function blank(lexer) {
	const captures = match(lexer, blank_regex)
	if (!captures) return false
	lexer.index += captures[0].length - 1
	return true
}
/**
 * @param {import("../../../private.js").PugLexer} lexer
 * @returns {boolean}
 */
function block_code(lexer) {
	const result = scan_end_of_line(lexer, /-/y)
	if (!result) return false
	push_token(
		lexer,
		"blockcode",
		result.start,
		result.end
	)
	lexer.interpolation_allowed = false
	pipeless_text(lexer)
	return true
}
/**
 * @param {import("../../../private.js").PugLexer} lexer
 * @param {number} skip
 * @returns {number}
 */
function bracket_expression(lexer, skip) {
	const open = lexer.index + skip
	const close = lexer.src[open] == "("
		? ")"
		: lexer.src[open] == "["
			? "]"
			: "}"
	const range = parse_until(
		lexer.src,
		open + 1,
		lexer.src.length,
		close
	)
	mismatch_errors(lexer, range.mismatches)
	if (range.end >= 0) return range.end
	add_error(
		lexer,
		`The input ended before the closing "${close}".`,
		open,
		lexer.src.length
	)
	return lexer.src.length
}
/**
 * @param {import("../../../private.js").PugLexer} lexer
 * @returns {boolean}
 */
function call(lexer) {
	const captures = match(lexer, call_regex)
	if (!captures) return false
	const start = lexer.index
	let name = ""
	if (captures[3] === undefined) {
		const close = bracket_expression(
			lexer,
			2 + /** @type {string} */(captures[1])/**/.length
		)
		name = `+${lexer.src.slice(start + 1 + /** @type {string} */(captures[1])/**/.length, close + 1)}`
		lexer.index = Math.min(close + 1, lexer.src.length)
	} else {
		name = `+${captures[3]}`
		lexer.index += captures[0].length
	}
	const token = push_token(lexer, "call", start, lexer.index)
	token.name = name
	const args = match(lexer, call_args_regex)
	if (args) {
		const open = lexer.index + args[0].length - 1
		const range = parse_until(
			lexer.src,
			open + 1,
			lexer.src.length,
			")"
		)
		const close = range.end < 0
			? lexer.src.length
			: range.end
		if (!call_attributes_regex.test(
			lexer.src.slice(open + 1, close)
		)) {
			mismatch_errors(lexer, range.mismatches)
			if (range.end < 0) {
				add_error(
					lexer,
					"The input ended before the closing \")\".",
					open,
					close
				)
			}
			set_code(lexer, token, open + 1, close)
			lexer.index = Math.min(close + 1, lexer.src.length)
			token.end = lexer.base + lexer.index
		}
	}
	return true
}
/**
 * @param {import("../../../private.js").PugLexer} lexer
 * @returns {boolean}
 */
function case_keyword(lexer) {
	const result = scan_end_of_line(lexer, case_regex)
	if (result) {
		const token = push_token(
			lexer,
			"case",
			result.start,
			result.end
		)
		const range = group_range(result.captures, 1, result.end)
		set_code(lexer, token, range[0], range[1])
		return true
	}
	if (!match(lexer, case_keyword_regex)) return false
	add_error(
		lexer,
		"\"case\" is missing an expression.",
		lexer.index,
		lexer.index + 4
	)
	push_token(
		lexer,
		"case",
		lexer.index,
		lexer.index + 4
	)
	lexer.index += 4
	return true
}
/**
 * @param {import("../../../private.js").PugLexer} lexer
 * @returns {boolean}
 */
function class_name(lexer) {
	const captures = match(lexer, class_regex)
	if (captures) {
		push_literal(lexer, "class", captures[0].length)
		return true
	}
	const digits = match(lexer, class_digits_regex)
	if (digits) {
		add_error(
			lexer,
			"Class names must contain at least one letter or underscore.",
			lexer.index,
			lexer.index + digits[0].length
		)
		push_literal(lexer, "class", digits[0].length)
		return true
	}
	if (lexer.src[lexer.index] != ".") return false
	const length = invalid_name_length(lexer)
	add_error(
		lexer,
		`"${lexer.src.slice(lexer.index + 1, lexer.index + 1 + length)}" is not a valid class name. `
			+ "Class names can only contain \"_\", \"-\", a-z and 0-9, and must contain at least one of \"_\" or a-z.",
		lexer.index,
		lexer.index + 1 + length
	)
	push_literal(lexer, "class", 1 + length)
	return true
}
/**
 * @param {import("../../../private.js").PugLexer} lexer
 * @returns {boolean}
 */
function code(lexer) {
	const captures = match(lexer, code_regex)
	if (!captures) return false
	const flags = /** @type {string} */(captures[1])/**/
	const code_start = lexer.index + captures[0].length
	const line_end = find_line_end(lexer, code_start)
	let code_end = line_end
	if (lexer.interpolated) {
		const bracket = parse_until(lexer.src, code_start, line_end, "]")
		mismatch_errors(lexer, bracket.mismatches)
		if (bracket.end < 0) {
			add_error(
				lexer,
				"End of line was reached with no closing bracket for interpolation.",
				code_start,
				line_end
			)
		} else {
			code_end = bracket.end
		}
	}
	const token = push_token(lexer, "code", lexer.index, code_end)
	token.buffer = flags[0] == "=" || flags[1] == "="
	set_code(lexer, token, code_start, code_end)
	lexer.index = code_end
	return true
}
/**
 * @param {import("../../../private.js").PugLexer} lexer
 * @returns {boolean}
 */
function colon(lexer) {
	const captures = match(lexer, colon_regex)
	if (!captures) return false
	push_token(
		lexer,
		":",
		lexer.index,
		lexer.index + 1
	)
	lexer.index += captures[0].length
	return true
}
/**
 * @param {import("../../../private.js").PugLexer} lexer
 * @returns {boolean}
 */
function comment(lexer) {
	const captures = match(lexer, comment_regex)
	if (!captures) return false
	const token = push_token(
		lexer,
		"comment",
		lexer.index,
		lexer.index + captures[0].length
	)
	token.buffer = captures[1] === undefined
	lexer.index += captures[0].length
	lexer.interpolation_allowed = token.buffer
	pipeless_text(lexer)
	return true
}
/**
 * @param {import("../../../private.js").PugLexer} lexer
 * @returns {boolean}
 */
function conditional(lexer) {
	const captures = match(lexer, conditional_regex)
	if (!captures) return false
	const keyword = /** @type {string} */(captures[1])/**/
	const range = group_range(
		captures,
		2,
		lexer.index + captures[0].length
	)
	const code_start = skip_js_whitespace(lexer.src, range[0], range[1])
	const code_end = trim_end(lexer.src, code_start, range[1])
	const type = keyword == "unless"
		? "if"
		: keyword == "else if"
			? "else-if"
			: /** @type {"else" | "if"} */(keyword)/**/
	const token = push_token(
		lexer,
		type,
		lexer.index,
		code_end > code_start
			? code_end
			: lexer.index + keyword.length
	)
	if (type == "else") {
		if (code_end > code_start) {
			add_error(
				lexer,
				"\"else\" cannot have a condition; perhaps you meant \"else if\".",
				code_start,
				code_end
			)
		}
	} else {
		set_code(lexer, token, code_start, code_end)
	}
	lexer.index += captures[0].length
	return true
}
/**
 * @param {string} src
 * @param {number} base
 * @param {import("../../../private.js").PugLexer | import("../../../public.js").AstSyntaxError[]} parent
 * @returns {import("../../../private.js").PugLexer}
 */
function create_lexer(src, base, parent) {
	return Array.isArray(parent)
		? {
			base,
			closed: false,
			ended: false,
			errors: parent,
			indent_regex: undefined,
			indent_stack: [ 0 ],
			index: 0,
			interpolated: false,
			interpolation_allowed: true,
			separators: src.includes(String.fromCharCode(8232)) || src.includes(String.fromCharCode(8233)),
			src,
			tokens: []
		}
		: {
			base,
			closed: false,
			ended: false,
			errors: parent.errors,
			indent_regex: undefined,
			indent_stack: [ 0 ],
			index: 0,
			interpolated: true,
			interpolation_allowed: true,
			separators: parent.separators,
			src,
			tokens: parent.tokens
		}
}
/**
 * @param {import("../../../private.js").PugLexer} lexer
 * @returns {boolean}
 */
function default_keyword(lexer) {
	const result = scan_end_of_line(lexer, default_regex)
	if (result) {
		push_token(
			lexer,
			"default",
			result.start,
			result.end
		)
		return true
	}
	if (!match(lexer, default_keyword_regex)) return false
	add_error(
		lexer,
		"\"default\" should not have an expression.",
		lexer.index,
		lexer.index + 7
	)
	push_token(
		lexer,
		"default",
		lexer.index,
		lexer.index + 7
	)
	lexer.index += 7
	return true
}
/**
 * @param {import("../../../private.js").PugLexer} lexer
 * @returns {boolean}
 */
function doctype(lexer) {
	const result = scan_end_of_line(lexer, doctype_regex)
	if (!result) return false
	push_token(
		lexer,
		"doctype",
		result.start,
		result.end
	)
	return true
}
/**
 * @param {import("../../../private.js").PugLexer} lexer
 * @returns {boolean}
 */
function dot(lexer) {
	const result = scan_end_of_line(lexer, dot_regex)
	if (!result) return false
	push_token(
		lexer,
		"dot",
		result.start,
		result.end
	)
	pipeless_text(lexer)
	return true
}
/**
 * @param {import("../../../private.js").PugLexer} lexer
 * @returns {boolean}
 */
function each(lexer) {
	const captures = match(lexer, each_regex)
	if (captures) {
		const range = group_range(
			captures,
			1,
			lexer.index + captures[0].length
		)
		const token = push_token(
			lexer,
			"each",
			lexer.index,
			trim_end(lexer.src, range[0], range[1])
		)
		set_code(lexer, token, range[0], range[1])
		lexer.index += captures[0].length
		return true
	}
	const keyword = match(lexer, each_keyword_regex)
	if (keyword) {
		const name = keyword[0]
		const line_end = find_line_end(lexer, lexer.index)
		add_error(
			lexer,
			`This "${name}" has a syntax error. `
				+ `"${name}" statements should be of the form "${name} VARIABLE_NAME of JS_EXPRESSION".`,
			lexer.index,
			line_end
		)
		const token = push_token(
			lexer,
			"each",
			lexer.index,
			trim_end(
				lexer.src,
				lexer.index + name.length,
				line_end
			)
		)
		set_code(
			lexer,
			token,
			lexer.index + name.length,
			line_end
		)
		lexer.index = line_end
		return true
	}
	if (match(lexer, each_dash_regex)) {
		add_error(
			lexer,
			"Pug each and for should no longer be prefixed with a dash (\"-\"). "
				+ "They are pug keywords and not part of JavaScript.",
			lexer.index,
			find_line_end(lexer, lexer.index)
		)
	}
	return false
}
/**
 * @param {import("../../../private.js").PugLexer} lexer
 * @returns {boolean}
 */
function each_of(lexer) {
	const captures = match(lexer, each_of_regex)
	if (captures) {
		const range = group_range(
			captures,
			2,
			lexer.index + captures[0].length
		)
		const token = push_token(
			lexer,
			"eachOf",
			lexer.index,
			trim_end(lexer.src, range[0], range[1])
		)
		set_code(lexer, token, range[0], range[1])
		const value = /** @type {string} */(captures[1])/**/.trim()
		if (!identifier_value_regex.test(value) && !each_of_pair_regex.test(value)) {
			add_error(
				lexer,
				"The value variable for each must either be a valid identifier (e.g. \"item\") "
					+ "or a pair of identifiers in square brackets (e.g. \"[key, value]\").",
				lexer.index,
				range[0]
			)
		}
		lexer.index += captures[0].length
		return true
	}
	if (match(lexer, each_of_dash_regex)) {
		add_error(
			lexer,
			"Pug each and for should not be prefixed with a dash (\"-\"). "
				+ "They are pug keywords and not part of JavaScript.",
			lexer.index,
			find_line_end(lexer, lexer.index)
		)
	}
	return false
}
/**
 * @param {import("../../../private.js").PugLexer} lexer
 * @returns {boolean}
 */
function end_interpolation(lexer) {
	if (!lexer.interpolated || lexer.src[lexer.index] != "]") return false
	lexer.index++
	lexer.closed = true
	lexer.ended = true
	return true
}
/**
 * @param {import("../../../private.js").PugLexer} lexer
 * @returns {boolean}
 */
function eos(lexer) {
	if (lexer.index < lexer.src.length) return false
	lexer.ended = true
	if (lexer.interpolated) return true
	for (let i = 0; lexer.indent_stack[i]; i++) push_token(
		lexer,
		"outdent",
		lexer.index,
		lexer.index
	)
	push_token(
		lexer,
		"eos",
		lexer.index,
		lexer.index
	)
	return true
}
/**
 * @param {import("../../../private.js").PugLexer} lexer
 * @returns {boolean}
 */
function extends_keyword(lexer) {
	const captures = match(lexer, extends_regex)
	if (captures) {
		push_token(
			lexer,
			"extends",
			lexer.index,
			lexer.index + captures[0].length
		)
		lexer.index += captures[0].length
		if (!path(lexer)) add_error(
			lexer,
			"\"extends\" is missing a path.",
			lexer.index,
			lexer.index
		)
		return true
	}
	const malformed = match(lexer, extends_keyword_regex)
	if (!malformed) return false
	add_error(
		lexer,
		"\"extends\" is malformed.",
		lexer.index,
		lexer.index + malformed[0].length
	)
	push_token(
		lexer,
		"extends",
		lexer.index,
		lexer.index + malformed[0].length
	)
	lexer.index += malformed[0].length
	return true
}
/**
 * @param {import("../../../private.js").PugLexer} lexer
 * @returns {boolean}
 */
function fail(lexer) {
	const line_end = find_line_end(lexer, lexer.index)
	add_error(
		lexer,
		`Unexpected text ${JSON.stringify(lexer.src.slice(lexer.index, lexer.index + 5))}.`,
		lexer.index,
		line_end
	)
	const start = lexer.index
	lexer.index = line_end
	add_text(lexer, "text", start, line_end)
	return true
}
/**
 * @param {import("../../../private.js").PugLexer} lexer
 * @param {boolean} in_include
 * @returns {boolean}
 */
function filter(lexer, in_include) {
	const captures = match(lexer, filter_regex)
	if (!captures) return false
	const token = push_token(
		lexer,
		"filter",
		lexer.index,
		lexer.index + captures[0].length
	)
	token.name = captures[0].slice(1)
	lexer.index += captures[0].length
	attrs(lexer)
	if (!in_include) {
		lexer.interpolation_allowed = false
		pipeless_text(lexer)
	}
	return true
}
/**
 * @param {import("../../../private.js").PugLexer} lexer
 * @param {number} index
 * @returns {number}
 */
function find_line_end(lexer, index) {
	if (lexer.interpolated) return lexer.src.length
	const line_end = lexer.src.indexOf("\n", index)
	return line_end < 0
		? lexer.src.length
		: line_end
}
/**
 * @param {RegExpExecArray} captures
 * @param {number} group
 * @param {number} end
 * @returns {[ number, number ]}
 */
function group_range(captures, group, end) {
	return [
		end - /** @type {string} */(captures[group])/**/.length,
		end
	]
}
/**
 * @param {import("../../../private.js").PugLexer} lexer
 * @returns {boolean}
 */
function id(lexer) {
	const captures = match(lexer, id_regex)
	if (captures) {
		push_literal(lexer, "id", captures[0].length)
		return true
	}
	if (lexer.src[lexer.index] != "#") return false
	const length = invalid_name_length(lexer)
	add_error(
		lexer,
		`"${lexer.src.slice(lexer.index + 1, lexer.index + 1 + length)}" is not a valid ID.`,
		lexer.index,
		lexer.index + 1 + length
	)
	push_literal(lexer, "id", 1 + length)
	return true
}
/**
 * @param {import("../../../private.js").PugLexer} lexer
 * @returns {boolean}
 */
function include(lexer) {
	const captures = match(lexer, include_regex)
	if (captures) {
		push_token(
			lexer,
			"include",
			lexer.index,
			lexer.index + 7
		)
		lexer.index += 7
		while (filter(lexer, true));
		if (!path(lexer)) {
			if (match(lexer, include_rest_regex)) {
				fail(lexer)
			} else {
				add_error(
					lexer,
					"\"include\" is missing a path.",
					lexer.index,
					lexer.index
				)
			}
		}
		return true
	}
	if (!match(lexer, include_keyword_regex)) return false
	add_error(
		lexer,
		"\"include\" is malformed.",
		lexer.index,
		lexer.index + 7
	)
	push_token(
		lexer,
		"include",
		lexer.index,
		lexer.index + 7
	)
	lexer.index += 7
	return true
}
/**
 * @param {import("../../../private.js").PugLexer} lexer
 * @returns {boolean}
 */
function indent(lexer) {
	const captures = scan_indentation(lexer)
	if (!captures) return false
	const line_start = lexer.index + 1
	const indents = /** @type {string} */(captures[1])/**/.length
	lexer.index += indents + 1
	if (lexer.src[lexer.index] == " " || lexer.src[lexer.index] == "\t") {
		const start = lexer.index
		while (lexer.src[lexer.index] == " " || lexer.src[lexer.index] == "\t") lexer.index++
		add_error(
			lexer,
			"Invalid indentation: use tabs or spaces, not both.",
			line_start,
			Math.max(start, lexer.index)
		)
	}
	if (lexer.src[lexer.index] == "\n") {
		lexer.interpolation_allowed = true
		return true
	}
	const stack = lexer.indent_stack
	if (indents < /** @type {number} */(stack[0])/**/) {
		let count = 0
		while (/** @type {number} */(stack[0])/**/ > indents) {
			if (/** @type {number} */(stack[1])/**/ < indents) {
				add_error(
					lexer,
					`Inconsistent indentation. Expecting either ${stack[1]} or ${stack[0]} spaces/tabs.`,
					line_start,
					lexer.index
				)
			}
			count++
			stack.shift()
		}
		if (/** @type {number} */(stack[0])/**/ < indents) {
			count--
			stack.unshift(indents)
		}
		for (; count > 0; count--) push_token(
			lexer,
			"outdent",
			lexer.index,
			lexer.index
		)
		if (stack[0] == indents && lexer.tokens[lexer.tokens.length - 1]?.type != "outdent") {
			push_token(
				lexer,
				"newline",
				lexer.index,
				lexer.index
			)
		}
	} else if (indents && indents != stack[0]) {
		push_token(
			lexer,
			"indent",
			lexer.index,
			lexer.index
		)
		stack.unshift(indents)
	} else {
		push_token(
			lexer,
			"newline",
			lexer.index,
			lexer.index
		)
	}
	lexer.interpolation_allowed = true
	return true
}
/**
 * @param {import("../../../private.js").PugLexer} lexer
 * @returns {boolean}
 */
function interpolation(lexer) {
	if (!lexer.src.startsWith("#{", lexer.index)) return false
	const close = bracket_expression(lexer, 1)
	const token = push_token(
		lexer,
		"interpolation",
		lexer.index,
		Math.min(close + 1, lexer.src.length)
	)
	set_code(lexer, token, lexer.index + 2, close)
	lexer.index = token.end - lexer.base
	return true
}
/**
 * @param {import("../../../private.js").PugLexer} lexer
 * @returns {number}
 */
function invalid_name_length(lexer) {
	invalid_name_regex.lastIndex = lexer.index + 1
	return /** @type {RegExpExecArray} */(invalid_name_regex.exec(lexer.src))/**/[0].length
}
/**
 * @param {import("../../../private.js").PugLexer} lexer
 * @param {RegExp} regex
 * @returns {RegExpExecArray | null}
 */
function match(lexer, regex) {
	regex.lastIndex = lexer.index
	return regex.exec(lexer.src)
}
/**
 * @param {import("../../../private.js").PugLexer} lexer
 * @param {number[]} mismatches
 * @returns {void}
 */
function mismatch_errors(lexer, mismatches) {
	for (const index of mismatches) {
		add_error(
			lexer,
			`Mismatched bracket "${lexer.src[index]}".`,
			index,
			index + 1
		)
	}
}
/**
 * @param {import("../../../private.js").PugLexer} lexer
 * @returns {boolean}
 */
function mixin(lexer) {
	const captures = match(lexer, mixin_regex)
	if (!captures) return false
	const token = push_token(
		lexer,
		"mixin",
		lexer.index,
		trim_end(
			lexer.src,
			lexer.index,
			lexer.index + captures[0].length
		)
	)
	token.name = /** @type {string} */(captures[1])/**/
	if (captures[2] !== undefined) {
		const args_start = lexer.index + captures[0].indexOf("(") + 1
		set_code(
			lexer,
			token,
			args_start,
			args_start + captures[2].length
		)
	}
	lexer.index += captures[0].length
	return true
}
/**
 * @param {import("../../../private.js").PugLexer} lexer
 * @returns {boolean}
 */
function mixin_block(lexer) {
	const result = scan_end_of_line(lexer, mixin_block_regex)
	if (!result) return false
	push_token(
		lexer,
		"mixin-block",
		result.start,
		result.end
	)
	return true
}
/**
 * @param {import("../../../private.js").PugLexer} lexer
 * @param {RegExp} regex
 * @param {string} mode
 * @returns {boolean}
 */
function named_block(lexer, regex, mode) {
	const captures = match(lexer, regex)
	if (!captures) return false
	let name = /** @type {string} */(captures[1])/**/.trim()
	const comment_index = name.indexOf("//")
	const comment_length = comment_index < 0
		? 0
		: name.length - comment_index
	if (comment_index >= 0) name = name.slice(0, comment_index).trim()
	if (!name) return false
	const consumed = captures[0].length - comment_length
	let length = consumed
	while (attribute_whitespace.includes(
		lexer.src[lexer.index + length - 1] ?? ""
	)) length--
	const token = push_token(
		lexer,
		"block",
		lexer.index,
		lexer.index + length
	)
	token.name = mode
	lexer.index += consumed
	return true
}
/**
 * @param {import("../../../private.js").PugLexer} lexer
 * @returns {boolean}
 */
function path(lexer) {
	const result = scan_end_of_line(lexer, path_regex)
	if (!result) return false
	const range = group_range(result.captures, 1, result.end)
	const value = /** @type {string} */(result.captures[1])/**/
	if (!value.trim()) return false
	push_token(lexer, "path", range[0], range[1])
	return true
}
/**
 * @param {import("../../../private.js").PugLexer} lexer
 * @returns {boolean}
 */
function pipeless_text(lexer) {
	while (blank(lexer));
	const captures = scan_indentation(lexer)
	const stack_indents = /** @type {number} */(lexer.indent_stack[0])/**/
	let block_indents = captures
		? /** @type {string} */(captures[1])/**/.length
		: 0
	if (block_indents <= stack_indents) return false
	const src = lexer.src
	const regex = /** @type {RegExp} */(lexer.indent_regex)/**/
	/** @type {[ number, number, number ][]} */
	const lines = []
	for (let pointer = lexer.index; pointer < src.length;) {
		const line_start = pointer + 1
		const line_end = find_line_end(lexer, line_start)
		regex.lastIndex = pointer
		const line_captures = /** @type {RegExpExecArray} */(regex.exec(src))/**/
		const line_indents = /** @type {string} */(line_captures[1])/**/.length
		if (line_indents < block_indents && src.slice(line_start, line_end).trim() != "") {
			if (line_indents <= stack_indents) break
			block_indents = line_indents
		}
		lines.push(
			[ line_start, line_end, line_indents ]
		)
		pointer = line_end
	}
	push_token(
		lexer,
		"start-pipeless-text",
		lexer.index,
		lexer.index
	)
	lexer.index = lines.length > 0
		? /** @type {[ number, number, number ]} */(lines[lines.length - 1])/**/[1]
		: lexer.index
	while (lexer.index == src.length && lines.length > 0) {
		const last = /** @type {[ number, number, number ]} */(lines[lines.length - 1])/**/
		if (last[1] > last[0] + block_indents) break
		lines.pop()
	}
	lines.forEach(
		([ line_start, line_end ], i) => {
			const start = Math.min(
				line_start + block_indents,
				line_end
			)
			if (i > 0) push_token(lexer, "newline", start, start)
			add_text(lexer, "text", start, line_end)
		}
	)
	push_token(
		lexer,
		"end-pipeless-text",
		lexer.index,
		lexer.index
	)
	return true
}
/**
 * @param {import("../../../private.js").PugLexer} lexer
 * @param {"class" | "id"} type
 * @param {number} length
 * @returns {void}
 */
function push_literal(lexer, type, length) {
	const token = push_token(
		lexer,
		type,
		lexer.index,
		lexer.index + length
	)
	if (length > 1) {
		token.value_end = token.end
		token.value_start = token.start + 1
	}
	lexer.index += length
}
/**
 * @param {import("../../../private.js").PugLexer} lexer
 * @param {import("../../../private.js").PugTokenType} type
 * @param {number} start
 * @param {number} end
 * @returns {import("../../../private.js").PugToken}
 */
function push_token(lexer, type, start, end) {
	/** @type {import("../../../private.js").PugToken} */
	const token = {
		buffer: false,
		code_end: -1,
		code_start: -1,
		end: lexer.base + end,
		name: "",
		start: lexer.base + start,
		type,
		value_end: -1,
		value_start: -1
	}
	lexer.tokens.push(token)
	return token
}
/**
 * @param {import("../../../private.js").PugLexer} lexer
 * @param {RegExp} regex
 * @returns {{ captures: RegExpExecArray, end: number, start: number } | undefined}
 */
function scan_end_of_line(lexer, regex) {
	const captures = match(lexer, regex)
	if (!captures) return undefined
	const start = lexer.index + (/^ */.exec(captures[0])?.[0].length ?? 0)
	const end = lexer.index + captures[0].length
	if (lexer.src[end] == ":") {
		lexer.index = end
		return { captures, end, start }
	}
	end_of_line_regex.lastIndex = end
	const rest = end_of_line_regex.exec(lexer.src)
	if (!rest) return undefined
	lexer.index = end
	while (lexer.src[lexer.index] == " " || lexer.src[lexer.index] == "\t") lexer.index++
	return { captures, end, start }
}
/**
 * @param {import("../../../private.js").PugLexer} lexer
 * @returns {RegExpExecArray | null}
 */
function scan_indentation(lexer) {
	if (lexer.indent_regex) return match(lexer, lexer.indent_regex)
	let captures = match(lexer, indent_tabs_regex)
	let regex = indent_tabs_regex
	if (captures && !captures[1]) {
		captures = match(lexer, indent_spaces_regex)
		regex = indent_spaces_regex
	}
	if (captures && captures[1]) lexer.indent_regex = regex
	return captures
}
/**
 * @param {import("../../../private.js").PugLexer} lexer
 * @param {import("../../../private.js").PugToken} token
 * @param {number} start
 * @param {number} end
 * @returns {void}
 */
function set_code(lexer, token, start, end) {
	token.code_end = lexer.base + end
	token.code_start = lexer.base + start
}
/**
 * @param {string} src
 * @param {number} start
 * @param {number} end
 * @returns {number}
 */
function skip_js_whitespace(src, start, end) {
	let index = start
	while (index < end && is_js_whitespace(
		/** @type {string} */(src[index])/**/
	)) index++
	return index
}
/**
 * @param {import("../../../private.js").PugLexer} lexer
 * @returns {boolean}
 */
function slash(lexer) {
	if (!match(lexer, slash_regex)) return false
	push_token(
		lexer,
		"slash",
		lexer.index,
		lexer.index + 1
	)
	lexer.index++
	return true
}
/**
 * @param {import("../../../private.js").PugLexer} lexer
 * @param {string} value
 * @param {number} from
 * @returns {number}
 */
function string_interpolation_index(lexer, value, from) {
	const blocked = lexer.separators
		? Math.max(
			value.lastIndexOf(String.fromCharCode(8232)),
			value.lastIndexOf(String.fromCharCode(8233))
		)
		: -1
	for (let i = value.indexOf("{", from + 1); i >= 0; i = value.indexOf("{", i + 1)) {
		const marker = value[i - 1]
		if (i <= blocked || marker != "#" && marker != "!") continue
		return i - 2 >= from && value[i - 2] == "\\"
			? i - 2
			: i - 1
	}
	return -1
}
/**
 * @param {import("../../../private.js").PugLexer} lexer
 * @returns {boolean}
 */
function tag(lexer) {
	const captures = match(lexer, tag_regex)
	if (!captures) return false
	const token = push_token(
		lexer,
		"tag",
		lexer.index,
		lexer.index + captures[0].length
	)
	token.name = captures[0]
	lexer.index += captures[0].length
	return true
}
/**
 * @param {import("../../../private.js").PugLexer} lexer
 * @returns {boolean}
 */
function text(lexer) {
	const src = lexer.src
	const start = lexer.index
	if (src[start] != " " && src[start] != "|") return false
	const line_end = find_line_end(lexer, start)
	const value_start = src[start] == "|" && src[start + 1] == " " && start + 2 < line_end
		? start + 2
		: start + 1
	if (value_start < line_end) {
		lexer.index = line_end
		add_text(lexer, "text", value_start, line_end)
	} else if (src[start] == " ") {
		lexer.index = start + 1
		add_text(lexer, "text", start, start + 1)
	} else {
		lexer.index = value_start
	}
	return true
}
/**
 * @param {import("../../../private.js").PugLexer} lexer
 * @returns {boolean}
 */
function text_html(lexer) {
	if (lexer.src[lexer.index] != "<") return false
	const start = lexer.index
	lexer.index = find_line_end(lexer, start)
	add_text(
		lexer,
		"text-html",
		start,
		lexer.index
	)
	return true
}
/**
 * @param {string} src
 * @param {number} start
 * @param {number} end
 * @returns {number}
 */
function trim_end(src, start, end) {
	let index = end
	while (index > start && is_js_whitespace(
		/** @type {string} */(src[index - 1])/**/
	)) index--
	return index
}
/**
 * @param {import("../../../private.js").PugLexer} lexer
 * @returns {boolean}
 */
function when_keyword(lexer) {
	const result = scan_end_of_line(lexer, when_regex)
	if (result) {
		const range = group_range(result.captures, 1, result.end)
		let code_end = range[1]
		const state = create_char_state()
		for (let parsed = range[0]; ;) {
			for (; parsed < code_end; parsed++) parse_char(
				state,
				/** @type {string} */(lexer.src[parsed])/**/
			)
			if (state.stack.length == 0) break
			when_rest_regex.lastIndex = lexer.index
			const rest = when_rest_regex.exec(lexer.src)
			if (!rest) break
			code_end = lexer.index + rest[0].length
			lexer.index = code_end
		}
		const token = push_token(
			lexer,
			"when",
			result.start,
			Math.max(result.end, code_end)
		)
		set_code(lexer, token, range[0], code_end)
		return true
	}
	if (!match(lexer, when_keyword_regex)) return false
	add_error(
		lexer,
		"\"when\" is missing an expression.",
		lexer.index,
		lexer.index + 4
	)
	push_token(
		lexer,
		"when",
		lexer.index,
		lexer.index + 4
	)
	lexer.index += 4
	return true
}
/**
 * @param {import("../../../private.js").PugLexer} lexer
 * @returns {boolean}
 */
function while_keyword(lexer) {
	const captures = match(lexer, while_regex)
	if (captures) {
		const range = group_range(
			captures,
			1,
			lexer.index + captures[0].length
		)
		const token = push_token(
			lexer,
			"while",
			lexer.index,
			trim_end(lexer.src, range[0], range[1])
		)
		set_code(lexer, token, range[0], range[1])
		lexer.index += captures[0].length
		return true
	}
	if (!match(lexer, while_keyword_regex)) return false
	add_error(
		lexer,
		"\"while\" is missing an expression.",
		lexer.index,
		lexer.index + 5
	)
	push_token(
		lexer,
		"while",
		lexer.index,
		lexer.index + 5
	)
	lexer.index += 5
	return true
}
/**
 * @param {import("../../../private.js").PugLexer} lexer
 * @returns {boolean}
 */
function yield_keyword(lexer) {
	const result = scan_end_of_line(lexer, yield_regex)
	if (!result) return false
	push_token(
		lexer,
		"yield",
		result.start,
		result.end
	)
	return true
}
/**
 * @param {string} src
 * @param {import("../../../public.js").AstSyntaxError[]} errors
 * @returns {import("../../../private.js").PugToken[]}
 */
export default function(src, errors) {
	const lexer = create_lexer(src, 0, errors)
	while (!lexer.ended) advance(lexer)
	return lexer.tokens
}