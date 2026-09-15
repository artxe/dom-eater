import add_error from "./add_error.js"
import csharp_token from "./csharp_token/index.js"
import keyword_parser from "./keyword_parser.js"
import parse_code_block from "./parse_code_block/index.js"
import parse_markup_in_code from "./parse_markup_in_code/index.js"
import parse_standard_statement from "./parse_standard_statement.js"
import parse_statements from "./parse_statements.js"
import skip_tokens from "./skip_tokens.js"
import spacing_all from "./spacing_all.js"
/**
 * @param {import("../../private.js").RazorContext} ctx
 * @param {number} index
 * @param {boolean} encountered
 * @returns {number}
 */
function parse_embedded_expression(ctx, index, encountered) {
	const next = csharp_token(ctx.text, index + 1)
	if (next?.kind == "@") return parse_standard_statement(ctx, next.end, encountered)
	if (next?.kind == "{") add_error(
		ctx,
		"Unexpected \"{\" after \"@\" in a code block.",
		index,
		next.end
	)
	const nested = ctx.nested
	ctx.nested = true
	const end = parse_code_block(ctx, index)
	ctx.nested = nested
	return end
}
/**
 * @param {import("../../private.js").RazorContext} ctx
 * @param {number} index
 * @param {boolean} encountered
 * @returns {number}
 */
export default function(ctx, index, encountered) {
	const { text } = ctx
	let i = index
	for (;;) {
		i = skip_tokens(ctx, i, spacing_all)
		const token = csharp_token(text, i)
		if (!token) return i
		const next = csharp_token(text, token.end)?.kind
		const single_line = token.kind == "@" && (next == ":" || next == "::")
		if (single_line || token.kind == "<" || token.kind == "@" && next == "<") {
			if (token.kind == "@" && !single_line) add_error(
				ctx,
				"\"@\" in a code block must be followed by \":\", \"(\" or an identifier.",
				i,
				token.end
			)
			return parse_markup_in_code(ctx, i)
		}
		if (token.kind == "@*") {
			i = token.end
			continue
		}
		if (token.kind == "{") {
			const end = parse_statements(ctx, token.end)
			const close = csharp_token(text, end)
			if (!close) {
				add_error(ctx, "Expected \"}\".", i, end)
				return end
			}
			return close.end
		}
		if (token.kind == "keyword") {
			const keyword = keyword_parser(text.slice(i, token.end))
			return keyword
				? keyword(ctx, i, false)
				: parse_standard_statement(ctx, i, encountered)
		}
		if (token.kind == "@") return parse_embedded_expression(ctx, i, encountered)
		if (token.kind == "}") return i
		return parse_standard_statement(ctx, i, encountered)
	}
}