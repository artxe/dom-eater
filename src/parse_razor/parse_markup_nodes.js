import html_token from "./html_token/index.js"
import parse_markup_node from "./parse_markup_node.js"
/**
 * @param {import("../../private.js").RazorContext} ctx
 * @param {import("../../private.js").RazorFrame[]} frames
 * @param {number} index
 * @param {"code" | "markup" | "text"} mode
 * @param {(token: import("../../private.js").RazorToken) => boolean} stop
 * @returns {number}
 */
export default function(ctx, frames, index, mode, stop) {
	let i = index
	while (i < ctx.text.length) {
		const token = html_token(ctx.text, i)
		if (token && stop(token)) break
		const end = parse_markup_node(ctx, frames, i, mode)
		i = end > i
			? end
			: token?.end ?? i + 1
	}
	return i
}