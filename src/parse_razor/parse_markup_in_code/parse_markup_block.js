import add_error from "../add_error.js"
import close_unclosed from "../close_unclosed.js"
import create_root_frame from "../create_root_frame.js"
import current_frame from "../current_frame.js"
import html_token from "../html_token/index.js"
import parse_markup_element from "../parse_markup_element.js"
import parse_markup_node from "../parse_markup_node.js"
import parse_markup_nodes from "../parse_markup_nodes.js"
import parser_state from "../parser_state.js"
/**
 * @param {import("../../../private.js").RazorContext} ctx
 * @param {number} index
 * @returns {import("../../../private.js").RazorMarkup}
 */
function parse_markup_in_code(ctx, index) {
	const frames = [ create_root_frame() ]
	let i = index
	do {
		const state = parser_state(ctx, i, "code")
		if (state == "tag") {
			i = parse_markup_element(ctx, frames, i, "code")
		} else {
			i = parse_markup_node(
				ctx,
				frames,
				i,
				state == "cdata" || state == "markup_comment" || state == "special_tag" || state == "xml_pi"
					? "code"
					: "text"
			)
		}
	} while (i < ctx.text.length && frames.length > 1)
	while (frames.length > 1) {
		const outer = frames.length == 2
		const frame = current_frame(frames)
		close_unclosed(ctx, frames, i)
		if (outer && frame.well_formed && frame.element) {
			add_error(
				ctx,
				`The "${frame.name}" element is not closed.`,
				frame.element.start,
				i
			)
		}
	}
	const space = html_token(ctx.text, i)
	const newline = html_token(
		ctx.text,
		space?.kind == "ws"
			? space.end
			: i
	)
	return {
		end: newline?.kind == "nl"
			? newline.end
			: i,
		nodes: current_frame(frames).children
	}
}
/**
 * @param {import("../../../private.js").RazorContext} ctx
 * @param {number} index
 * @returns {import("../../../private.js").RazorMarkup}
 */
function parse_single_line_markup(ctx, index) {
	const { text } = ctx
	const frames = [ create_root_frame() ]
	const single_line = ctx.single_line
	ctx.single_line = true
	let i = index
	do {
		i = parse_markup_nodes(
			ctx,
			frames,
			i,
			"text",
			token => token.kind == "ws" || token.kind == "nl"
		)
		const token = html_token(text, i)
		if (token?.kind == "ws") {
			i = token.end
		}
	} while (i < text.length && html_token(text, i)?.kind != "nl")
	ctx.null_generate = false
	ctx.null_generate_dirty = false
	ctx.single_line = single_line
	return {
		end: html_token(text, i)?.end ?? i,
		nodes: current_frame(frames).children
	}
}
/**
 * @param {import("../../../private.js").RazorContext} ctx
 * @param {number} index
 * @returns {import("../../../private.js").RazorMarkup}
 */
export default function(ctx, index) {
	const { text } = ctx
	if (text[index] == "<") {
		return parse_markup_in_code(ctx, index)
	}
	if (text[index + 1] == ":") {
		return parse_single_line_markup(
			ctx,
			/** @type {import("../../../private.js").RazorToken} */(html_token(text, index + 1))/**/.end
		)
	}
	return parse_markup_in_code(ctx, index + 1)
}