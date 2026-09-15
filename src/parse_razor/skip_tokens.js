import csharp_token from "./csharp_token/index.js"
/**
 * @param {import("../../private.js").RazorContext} ctx
 * @param {number} index
 * @param {Set<string>} kinds
 * @returns {number}
 */
export default function(ctx, index, kinds) {
	let i = index
	for (let token = csharp_token(ctx.text, i); token && kinds.has(token.kind); token = csharp_token(ctx.text, i)) {
		i = token.end
	}
	return i
}