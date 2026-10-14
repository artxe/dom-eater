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
	return balance_from(
		ctx,
		token.end,
		token.kind,
		right,
		options
	)
}