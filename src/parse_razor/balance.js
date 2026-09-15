import add_error from "./add_error.js"
import balance_from from "./balance_from.js"
import csharp_token from "./csharp_token/index.js"
/**
 * @param {import("../../private.js").RazorContext} ctx
 * @param {number} index
 * @param {import("../../private.js").RazorBalance} options
 * @returns {{ end: number, ok: boolean }}
 */
export default function(ctx, index, options) {
	const token = /** @type {import("../../private.js").RazorToken} */(csharp_token(ctx.text, index))/**/
	const right = token.kind == "("
		? ")"
		: token.kind == "["
			? "]"
			: token.kind == "{"
				? "}"
				: ">"
	if (token.end >= ctx.text.length && !options.no_error) add_error(
		ctx,
		`Expected "${right}".`,
		index,
		token.end
	)
	return balance_from(
		ctx,
		token.end,
		token.kind,
		right,
		options
	)
}