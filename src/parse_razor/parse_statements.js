import csharp_token from "./csharp_token/index.js"
import parse_statement from "./parse_statement.js"
/**
 * @param {import("../../private.js").RazorContext} ctx
 * @param {number} index
 * @returns {number}
 */
export default function(ctx, index) {
	let i = index
	for (let token = csharp_token(ctx.text, i); token && token.kind != "}"; token = csharp_token(ctx.text, i)) {
		const end = parse_statement(ctx, i, false)
		i = end > i
			? end
			: token.end
	}
	return i
}