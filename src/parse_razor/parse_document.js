import add_error from "./add_error.js"
import close_unclosed from "./close_unclosed.js"
import close_void from "./close_void.js"
import create_root_frame from "./create_root_frame.js"
import current_frame from "./current_frame.js"
import html_token from "./html_token/index.js"
import is_void from "./is_void.js"
import parse_markup_node from "./parse_markup_node.js"
/**
 * @param {import("../../private.js").RazorContext} ctx
 * @returns {import("../../private.js").MarkupNode[]}
 */
export default function(ctx) {
	const frames = [ create_root_frame() ]
	let i = 0
	while (i < ctx.text.length) {
		let end = i
		try {
			end = parse_markup_node(ctx, frames, i, "markup")
		} catch (error) {
			if (!(error instanceof RangeError)) throw error
			add_error(
				ctx,
				"The input is nested too deeply.",
				i,
				ctx.text.length
			)
			break
		}
		i = end > i
			? end
			: html_token(ctx.text, i)?.end ?? i + 1
	}
	while (frames.length > 1) {
		if (is_void(current_frame(frames).name)) {
			close_void(frames)
		} else {
			close_unclosed(ctx, frames, ctx.text.length)
		}
	}
	return current_frame(frames).children
}