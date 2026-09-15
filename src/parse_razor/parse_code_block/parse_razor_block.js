import close_unclosed from "../close_unclosed.js"
import create_root_frame from "../create_root_frame.js"
import current_frame from "../current_frame.js"
import html_token from "../html_token/index.js"
import parse_markup_node from "../parse_markup_node.js"
import parse_markup_nodes from "../parse_markup_nodes.js"
/**
 * @param {import("../../../private.js").RazorContext} ctx
 * @param {number} index
 * @returns {import("../../../private.js").RazorMarkup}
 */
export default function(ctx, index) {
	const { text } = ctx
	const frames = [ create_root_frame() ]
	let nesting = 1
	let i = index
	while (nesting > 0 && i < text.length) {
		i = parse_markup_nodes(
			ctx,
			frames,
			i,
			"text",
			token => token.kind == "text" || token.kind == "<"
		)
		const token = html_token(text, i)
		if (token?.kind == "text") {
			while (i < token.end) {
				const char = text[i]
				if (char == "{") nesting++
				if (char == "}" && !--nesting) break
				i++
			}
		} else if (token) {
			i = parse_markup_node(ctx, frames, i, "markup")
		} else {
			/** @type {import("../../../private.js").RazorFrame} */(frames[0])/**/.flushed = i
		}
	}
	while (frames.length > 1) {
		const element = /** @type {import("../../../public.js").Element} */(current_frame(frames).element)/**/
		close_unclosed(
			ctx,
			frames,
			Math.max(
				element.end,
				frames[0]?.flushed ?? 0
			)
		)
	}
	return {
		end: i,
		nodes: current_frame(frames).children
	}
}