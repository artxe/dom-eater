import accept_until from "../accept_until.js"
import add_error from "../add_error.js"
import angle_stops from "../angle_stops.js"
import balance from "../balance.js"
import balance_from from "../balance_from.js"
import csharp_token from "../csharp_token/index.js"
import is_keyword from "../is_keyword.js"
import is_word from "../is_word.js"
import keyword_parser from "../keyword_parser.js"
import newline_stops from "../newline_stops.js"
import parse_implicit_expression from "../parse_implicit_expression.js"
import parse_statements from "../parse_statements.js"
import parse_type_name from "../parse_type_name.js"
import record_markup from "../record_markup.js"
import skip_tokens from "../skip_tokens.js"
import spacing_all from "../spacing_all.js"
import spacing_comments from "../spacing_comments.js"
import token_end from "../token_end.js"
import parse_razor_block from "./parse_razor_block.js"
/** @type {Map<string, import("../../../private.js").RazorDirective>} */
const component_directives = new Map(
	[
		[
			"addTagHelper",
			{ kind: "tag_helper", tokens: [] }
		],
		[
			"attribute",
			{
				kind: "single",
				tokens: [ "attribute" ]
			}
		],
		[
			"class",
			{ kind: "reserved", tokens: [] }
		],
		[
			"code",
			{ kind: "code_block", tokens: [] }
		],
		[
			"functions",
			{ kind: "code_block", tokens: [] }
		],
		[
			"implements",
			{
				kind: "single",
				tokens: [ "type" ]
			}
		],
		[
			"inherits",
			{
				kind: "single",
				tokens: [ "type" ]
			}
		],
		[
			"inject",
			{
				kind: "single",
				tokens: [ "type", "member" ]
			}
		],
		[
			"layout",
			{
				kind: "single",
				tokens: [ "type" ]
			}
		],
		[
			"namespace",
			{
				kind: "single",
				tokens: [ "namespace" ]
			}
		],
		[
			"page",
			{
				kind: "single",
				tokens: [ "string" ]
			}
		],
		[
			"preservewhitespace",
			{
				kind: "single",
				tokens: [ "boolean" ]
			}
		],
		[
			"removeTagHelper",
			{ kind: "tag_helper", tokens: [] }
		],
		[
			"rendermode",
			{
				kind: "single",
				tokens: [ "identifier_or_expression" ]
			}
		],
		[
			"tagHelperPrefix",
			{ kind: "tag_helper", tokens: [] }
		],
		[
			"typeparam",
			{
				kind: "single",
				tokens: [
					"member",
					"generic_type_constraint?"
				]
			}
		]
	]
)
const constraint_stops = new Set([ ";", "nl" ])
/** @type {Map<string, import("../../../private.js").RazorDirective>} */
const legacy_directives = new Map(
	[
		[
			"addTagHelper",
			{ kind: "tag_helper", tokens: [] }
		],
		[
			"attribute",
			{
				kind: "single",
				tokens: [ "attribute" ]
			}
		],
		[
			"class",
			{ kind: "reserved", tokens: [] }
		],
		[
			"functions",
			{ kind: "code_block", tokens: [] }
		],
		[
			"implements",
			{
				kind: "single",
				tokens: [ "type" ]
			}
		],
		[
			"inherits",
			{
				kind: "single",
				tokens: [ "type" ]
			}
		],
		[
			"inject",
			{
				kind: "single",
				tokens: [ "type", "member" ]
			}
		],
		[
			"model",
			{
				kind: "single",
				tokens: [ "type" ]
			}
		],
		[
			"namespace",
			{
				kind: "single",
				tokens: [ "namespace" ]
			}
		],
		[
			"page",
			{
				kind: "single",
				tokens: [ "string?" ]
			}
		],
		[
			"removeTagHelper",
			{ kind: "tag_helper", tokens: [] }
		],
		[
			"section",
			{
				kind: "razor_block",
				tokens: [ "member" ]
			}
		],
		[
			"tagHelperPrefix",
			{ kind: "tag_helper", tokens: [] }
		]
	]
)
const spacing = new Set([ "ws" ])
/**
 * @param {import("../../../private.js").RazorContext} ctx
 * @param {number} index
 * @returns {number}
 */
function capture_line_end(ctx, index) {
	if (ctx.nested || ctx.single_line) return index
	const whitespace_end = skip_tokens(ctx, index, spacing)
	const newline = csharp_token(ctx.text, whitespace_end)
	return newline?.kind == "nl"
		? newline.end
		: index
}
/**
 * @param {string} text
 * @param {number} start
 * @param {number} end
 * @returns {boolean}
 */
function is_complete_string(text, start, end) {
	const value = text.slice(start, end)
	let prefix = ""
	let postfix = "\""
	if (value.startsWith("@$\"") || value.startsWith("$@\"")) {
		prefix = value.slice(0, 3)
	} else if (value.startsWith("@\"")) {
		prefix = "@\""
	} else if (value == "\"\"" || value == "$\"\"") {
		prefix = value.slice(0, -1)
	} else {
		const match = /^(\$*)("*)/.exec(value)
		const opening = match?.[0] ?? ""
		if (opening.length == value.length) return false
		prefix = opening
		postfix = match?.[2] ?? ""
	}
	if (value == prefix) return false
	return value.endsWith(postfix)
		|| value.length >= postfix.length + 2 && /[Uu]8$/.test(value) && value.slice(0, -2).endsWith(postfix)
}
/**
 * @param {import("../../../private.js").RazorContext} ctx
 * @param {number} index
 * @param {import("../../../private.js").RazorDirective} directive
 * @returns {number}
 */
function parse_directive(ctx, index, directive) {
	const { text } = ctx
	let i = token_end(ctx, index)
	if (directive.kind == "tag_helper") {
		i = skip_tokens(ctx, i, spacing)
		const token = csharp_token(text, i)
		if (!token || token.kind == "nl") {
			add_error(
				ctx,
				"The directive must have a value.",
				index,
				i
			)
			return capture_line_end(ctx, i)
		}
		return capture_line_end(
			ctx,
			accept_until(ctx, i, newline_stops)
		)
	}
	if (directive.kind == "reserved") {
		add_error(
			ctx,
			"\"class\" is a reserved word.",
			index,
			i
		)
		return capture_line_end(ctx, i)
	}
	let member = ""
	for (const descriptor of directive.tokens) {
		const optional = descriptor.endsWith("?")
		const kind = optional
			? descriptor.slice(0, -1)
			: descriptor
		const separator = csharp_token(text, i)
		if (separator && separator.kind != "ws" && separator.kind != "nl" && separator.kind != ";") {
			add_error(
				ctx,
				"Directive tokens must be separated by whitespace.",
				i,
				separator.end
			)
			return i
		}
		if (separator?.kind == "ws") i = skip_tokens(ctx, i, spacing_comments)
		const token = csharp_token(text, i)
		if (optional && (!token || token.kind == "nl")) break
		if (!token) {
			add_error(
				ctx,
				"Unexpected end of file after the directive.",
				index,
				i
			)
			return i
		}
		const word = text.slice(i, token.end)
		if (kind == "type") {
			const type = parse_type_name(ctx, i)
			if (!type.ok) {
				add_error(
					ctx,
					"The directive expects a type name.",
					i,
					token.end
				)
				return type.end
			}
			i = type.end
		} else if (kind == "namespace") {
			const end = parse_qualified_identifier(ctx, i)
			if (end < 0) {
				add_error(
					ctx,
					"The directive expects a namespace name.",
					i,
					token.end
				)
				return i
			}
			i = end
		} else if (kind == "member") {
			if (token.kind != "identifier") {
				add_error(
					ctx,
					"The directive expects an identifier.",
					i,
					token.end
				)
				return i
			}
			member = word
			i = token.end
		} else if (kind == "string") {
			if (token.kind != "string" || !is_complete_string(text, i, token.end)) {
				add_error(
					ctx,
					"The directive expects a quoted string.",
					i,
					token.end
				)
				return i
			}
			i = token.end
		} else if (kind == "boolean") {
			if (token.kind != "keyword" || word != "true" && word != "false") {
				add_error(
					ctx,
					"The directive expects a boolean.",
					i,
					token.end
				)
				return i
			}
			i = token.end
		} else if (kind == "attribute") {
			if (token.kind != "[") {
				add_error(
					ctx,
					"The directive expects a C# attribute.",
					i,
					token.end
				)
				return i
			}
			const result = balance(ctx, i, { no_error: true })
			i = result.end
			const close = csharp_token(text, i)
			if (result.ok && close?.kind == "]") i = close.end
		} else if (kind == "generic_type_constraint") {
			if (token.kind == "keyword" && word == "where") {
				i = skip_tokens(ctx, token.end, spacing)
				const name = csharp_token(text, i)
				if (!name || text.slice(i, name.end) != member) {
					add_error(
						ctx,
						"The type parameter of the constraint does not match.",
						i,
						name?.end ?? i
					)
					return i
				}
				i = accept_until(ctx, i, constraint_stops)
			} else if (token.kind != ";") {
				add_error(
					ctx,
					"Expected \"where\".",
					i,
					token.end
				)
				return i
			}
		} else if (token.kind == "@" && csharp_token(text, token.end)?.kind == "(") {
			i = parse_explicit_expression(ctx, token.end)
		} else {
			const end = parse_qualified_identifier(ctx, i)
			if (end < 0) {
				add_error(
					ctx,
					"The directive expects an identifier or an expression.",
					i,
					token.end
				)
				return i
			}
			i = end
		}
	}
	i = skip_tokens(ctx, i, spacing_comments)
	if (directive.kind == "single") {
		const semicolon = csharp_token(text, i)
		if (semicolon?.kind == ";") i = skip_tokens(
			ctx,
			semicolon.end,
			spacing_comments
		)
		const end = csharp_token(text, i)
		if (end?.kind == "nl") return end.end
		if (end) add_error(
			ctx,
			"Unexpected text after the directive.",
			i,
			end.end
		)
		return i
	}
	i = skip_tokens(ctx, i, spacing_all)
	const open = csharp_token(text, i)
	if (open?.kind != "{") {
		add_error(
			ctx,
			"Expected \"{\" after the directive.",
			index,
			open?.end ?? i
		)
		return capture_line_end(ctx, i)
	}
	if (directive.kind == "razor_block") {
		const markup = parse_razor_block(ctx, open.end)
		record_markup(ctx, open.end, markup)
		i = markup.end
	} else {
		i = parse_statements(ctx, open.end)
	}
	const close = csharp_token(text, i)
	if (close?.kind == "}") return capture_line_end(ctx, close.end)
	add_error(
		ctx,
		"Expected \"}\".",
		open.end - 1,
		i
	)
	return capture_line_end(ctx, i)
}
/**
 * @param {import("../../../private.js").RazorContext} ctx
 * @param {number} index
 * @returns {number}
 */
function parse_explicit_expression(ctx, index) {
	const result = balance_from(
		ctx,
		index + 1,
		"(",
		")",
		{
			backtrack: true,
			no_error: true,
			templates: true
		}
	)
	let i = result.end
	if (!result.ok) {
		i = accept_until(ctx, i, angle_stops)
		add_error(
			ctx,
			"The explicit expression is missing a closing \")\".",
			index,
			i
		)
	}
	const close = csharp_token(ctx.text, i)
	return close?.kind == ")"
		? close.end
		: i
}
/**
 * @param {import("../../../private.js").RazorContext} ctx
 * @param {number} index
 * @returns {number}
 */
function parse_qualified_identifier(ctx, index) {
	let i = index
	let expecting_dot = false
	for (let token = csharp_token(ctx.text, i); token; token = csharp_token(ctx.text, i)) {
		if (expecting_dot ? token.kind != "." : token.kind != "identifier") {
			if (token.kind != "ws" && token.kind != "nl") return -1
			break
		}
		expecting_dot = !expecting_dot
		i = token.end
	}
	return expecting_dot
		? i
		: -1
}
/**
 * @param {import("../../../private.js").RazorContext} ctx
 * @param {number} index
 * @returns {number}
 */
function parse_statement_body(ctx, index) {
	const end = parse_statements(ctx, index + 1)
	const close = csharp_token(ctx.text, end)
	if (!close) add_error(
		ctx,
		"The code block is missing a closing \"}\".",
		index,
		end
	)
	const block_end = close?.kind == "}"
		? close.end
		: end
	if (!ctx.nested) {
		const after = csharp_token(ctx.text, block_end)
		if (after?.kind == "nl" || after?.kind == "ws" && csharp_token(ctx.text, after.end)?.kind == "nl") {
			ctx.null_generate = true
		}
	}
	return block_end
}
/**
 * @param {import("../../../private.js").RazorContext} ctx
 * @param {number} index
 * @returns {number}
 */
export default function(ctx, index) {
	const { text } = ctx
	let i = skip_tokens(ctx, index, spacing_all)
	const transition = csharp_token(text, i)
	if (!transition) return i
	if (transition.kind == "string" && text[i] == "@") {
		i++
	} else if (transition.kind == "@") {
		i = transition.end
	}
	const token = csharp_token(text, i)
	if (token?.kind == "{") return parse_statement_body(ctx, i)
	if (token?.kind == "(") return parse_explicit_expression(ctx, i)
	if (token && is_word(token)) {
		const word = text.slice(i, token.end)
		const directive = (
			ctx.component
				? component_directives
				: legacy_directives
		).get(word)
		if (directive) return parse_directive(ctx, i, directive)
		const keyword = token.kind == "keyword"
			? keyword_parser(word)
			: undefined
		if (keyword) {
			const end = keyword(ctx, i, true)
			return word == "case" || word == "default" || word == "await" && !is_keyword(
				text,
				skip_tokens(ctx, token.end, spacing_comments),
				"foreach"
			)
				? end
				: capture_line_end(ctx, end)
		}
		if (word == "helper") add_error(
			ctx,
			"The \"helper\" directive is not supported.",
			i,
			token.end
		)
		return parse_implicit_expression(ctx, i)
	}
	add_error(
		ctx,
		"Expected a code block, an expression or an identifier after \"@\".",
		i,
		token?.end ?? i
	)
	return i
}