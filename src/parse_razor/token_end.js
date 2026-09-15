import csharp_token from "./csharp_token/index.js"
/**
 * @param {import("../../private.js").RazorContext} ctx
 * @param {number} index
 * @returns {number}
 */
export default function(ctx, index) {
	return csharp_token(ctx.text, index)?.end ?? index
}