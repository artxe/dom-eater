import accept_until from "./accept_until.js"
import add_error from "./add_error.js"
import balance from "./balance.js"
import csharp_token from "./csharp_token/index.js"
import is_keyword from "./is_keyword.js"
import newline_stops from "./newline_stops.js"
import parse_implicit_expression from "./parse_implicit_expression.js"
import parse_standard_statement from "./parse_standard_statement.js"
import parse_statement from "./parse_statement.js"
import parse_type_name from "./parse_type_name.js"
import skip_tokens from "./skip_tokens.js"
import spacing_all from "./spacing_all.js"
import spacing_comments from "./spacing_comments.js"
import token_end from "./token_end.js"
/**
 * @param {import("../../private.js").RazorContext} ctx
 * @param {number} index
 * @returns {number}
 */
function parse_after_if(ctx, index) {
	const skipped = skip_to_important(ctx, index)
	return is_keyword(
		ctx.text,
		skipped.important,
		"else"
	)
		? parse_else(ctx, skipped.important)
		: skipped.end
}
/**
 * @param {import("../../private.js").RazorContext} ctx
 * @param {number} index
 * @param {boolean} top_level
 * @returns {number}
 */
function parse_await(ctx, index, top_level) {
	const i = skip_tokens(
		ctx,
		token_end(ctx, index),
		spacing_comments
	)
	if (!top_level) return i
	return is_keyword(ctx.text, i, "foreach")
		? parse_conditional_block(ctx, i)
		: parse_implicit_expression(ctx, i)
}
/**
 * @param {import("../../private.js").RazorContext} ctx
 * @param {number} index
 * @returns {number}
 */
function parse_case(ctx, index) {
	const { text } = ctx
	let i = token_end(ctx, index)
	for (let token = csharp_token(text, i); token && token.kind != ":"; token = csharp_token(text, i)) {
		i = token.kind == "{" || token.kind == "(" || token.kind == "["
			? balance(ctx, i, {}).end
			: token.end
	}
	const colon = csharp_token(text, i)
	return colon?.kind == ":"
		? colon.end
		: i
}
/**
 * @param {import("../../private.js").RazorContext} ctx
 * @param {number} index
 * @returns {number}
 */
function parse_catch(ctx, index) {
	const condition = try_parse_condition(
		ctx,
		skip_tokens(
			ctx,
			token_end(ctx, index),
			spacing_all
		)
	)
	if (!condition.ok) return condition.end
	let i = skip_tokens(ctx, condition.end, spacing_all)
	if (is_keyword(ctx.text, i, "when")) {
		const filter = try_parse_condition(
			ctx,
			skip_tokens(
				ctx,
				token_end(ctx, i),
				spacing_all
			)
		)
		if (!filter.ok) return filter.end
		i = skip_tokens(ctx, filter.end, spacing_all)
	}
	return parse_expected_code_block(ctx, i)
}
/**
 * @param {import("../../private.js").RazorContext} ctx
 * @param {number} index
 * @returns {number}
 */
function parse_conditional_block(ctx, index) {
	const condition = try_parse_condition(
		ctx,
		skip_tokens(
			ctx,
			token_end(ctx, index),
			spacing_all
		)
	)
	return condition.ok
		? parse_expected_code_block(
			ctx,
			skip_tokens(ctx, condition.end, spacing_all)
		)
		: condition.end
}
/**
 * @param {import("../../private.js").RazorContext} ctx
 * @param {number} index
 * @returns {number}
 */
function parse_do(ctx, index) {
	const skipped = skip_to_important(
		ctx,
		parse_unconditional_block(ctx, index)
	)
	if (!is_keyword(
		ctx.text,
		skipped.important,
		"while"
	)) return skipped.end
	const condition = try_parse_condition(
		ctx,
		skip_tokens(
			ctx,
			token_end(ctx, skipped.important),
			spacing_all
		)
	)
	const semicolon = csharp_token(ctx.text, condition.end)
	return condition.ok && semicolon?.kind == ";"
		? semicolon.end
		: condition.end
}
/**
 * @param {import("../../private.js").RazorContext} ctx
 * @param {number} index
 * @returns {number}
 */
function parse_else(ctx, index) {
	const i = skip_tokens(
		ctx,
		token_end(ctx, index),
		spacing_all
	)
	if (is_keyword(ctx.text, i, "if")) return parse_after_if(
		ctx,
		parse_conditional_block(ctx, i)
	)
	return csharp_token(ctx.text, i)
		? parse_expected_code_block(ctx, i)
		: i
}
/**
 * @param {import("../../private.js").RazorContext} ctx
 * @param {number} index
 * @returns {number}
 */
function parse_expected_code_block(ctx, index) {
	const { text } = ctx
	const token = csharp_token(text, index)
	if (!token) return index
	const next = csharp_token(text, token.end)?.kind
	const encountered = token.kind == "<" || token.kind == "@" && (next == ":" || next == "@")
	if (encountered) add_error(
		ctx,
		"Single-line control flow statements cannot contain markup.",
		index,
		token.end
	)
	return parse_statement(ctx, index, encountered)
}
/**
 * @param {import("../../private.js").RazorContext} ctx
 * @param {number} index
 * @returns {number}
 */
function parse_if(ctx, index) {
	return parse_after_if(
		ctx,
		parse_conditional_block(ctx, index)
	)
}
/**
 * @param {import("../../private.js").RazorContext} ctx
 * @param {number} index
 * @returns {number}
 */
function parse_try(ctx, index) {
	let i = parse_unconditional_block(ctx, index)
	for (;;) {
		const skipped = skip_to_important(ctx, i)
		if (is_keyword(
			ctx.text,
			skipped.important,
			"catch"
		)) {
			i = parse_catch(ctx, skipped.important)
		} else if (is_keyword(
			ctx.text,
			skipped.important,
			"finally"
		)) {
			return parse_unconditional_block(ctx, skipped.important)
		} else {
			return skipped.end
		}
	}
}
/**
 * @param {import("../../private.js").RazorContext} ctx
 * @param {number} index
 * @returns {number}
 */
function parse_unconditional_block(ctx, index) {
	return parse_expected_code_block(
		ctx,
		skip_tokens(
			ctx,
			token_end(ctx, index),
			spacing_all
		)
	)
}
/**
 * @param {import("../../private.js").RazorContext} ctx
 * @param {number} index
 * @param {boolean} top_level
 * @returns {number}
 */
function parse_using(ctx, index, top_level) {
	const { text } = ctx
	const after = skip_tokens(
		ctx,
		token_end(ctx, index),
		spacing_comments
	)
	const token = csharp_token(text, after)
	if (token?.kind == "(") {
		const condition = try_parse_condition(ctx, after)
		return condition.ok
			? parse_expected_code_block(
				ctx,
				skip_tokens(ctx, condition.end, spacing_all)
			)
			: condition.end
	}
	const global = is_keyword(text, after, "global")
	const static_using = is_keyword(text, after, "static")
	if (token?.kind != "identifier" && !global && !static_using) return after
	if (!top_level) return parse_standard_statement(ctx, after, false)
	let i = after
	if (static_using) {
		i = parse_type_name(
			ctx,
			skip_tokens(
				ctx,
				token_end(ctx, i),
				spacing_comments
			)
		).end
	} else {
		i = parse_type_name(ctx, i).end
		const equals = skip_tokens(ctx, i, spacing_all)
		const assign = csharp_token(text, equals)
		if (assign?.kind == "=") i = parse_type_name(
			ctx,
			skip_tokens(ctx, assign.end, spacing_all)
		).end
	}
	const semicolon = csharp_token(text, i)
	return semicolon?.kind == ";"
		? semicolon.end
		: i
}
/**
 * @param {import("../../private.js").RazorContext} ctx
 * @param {number} index
 * @returns {{ end: number, important: number }}
 */
function skip_to_important(ctx, index) {
	let end = index
	for (let i = index; ;) {
		i = skip_tokens(ctx, i, spacing_all)
		const token = csharp_token(ctx.text, i)
		if (token?.kind != "@*") {
			return { end, important: i }
		}
		i = token.end
		end = i
	}
}
/**
 * @param {import("../../private.js").RazorContext} ctx
 * @param {number} index
 * @returns {{ end: number, ok: boolean }}
 */
function try_parse_condition(ctx, index) {
	const token = csharp_token(ctx.text, index)
	if (token?.kind != "(") {
		return { end: index, ok: true }
	}
	const result = balance(
		ctx,
		index,
		{ backtrack: true, templates: true }
	)
	if (!result.ok) {
		return {
			end: accept_until(ctx, result.end, newline_stops),
			ok: false
		}
	}
	const close = csharp_token(ctx.text, result.end)
	return {
		end: close?.kind == ")"
			? close.end
			: result.end,
		ok: true
	}
}
/**
 * @param {string} word
 * @returns {((ctx: import("../../private.js").RazorContext, index: number, top_level: boolean) => number) | undefined}
 */
export default function(word) {
	return word == "await"
		? parse_await
		: word == "case" || word == "default"
			? parse_case
			: word == "do"
				? parse_do
				: word == "if"
					? parse_if
					: word == "try"
						? parse_try
						: word == "using"
							? parse_using
							: word == "for" || word == "foreach" || word == "lock" || word == "switch" || word == "while"
								? parse_conditional_block
								: undefined
}