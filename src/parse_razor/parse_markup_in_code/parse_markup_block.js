import add_error from "../add_error.js"
import close_unclosed from "../close_unclosed.js"
import create_root_frame from "../create_root_frame.js"
import current_frame from "../current_frame.js"
import html_token from "../html_token/index.js"
import parse_markup_element from "../parse_markup_element.js"
import parse_markup_node from "../parse_markup_node.js"
import parse_markup_nodes from "../parse_markup_nodes.js"
import parser_state from "../parser_state.js"
import skip_html_whitespace from "../skip_html_whitespace.js"
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
		if (state == "eof") break
		const start = i
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
		if (i <= start) break
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
		if (token?.kind == "ws") i = token.end
	} while (i < text.length && html_token(text, i)?.kind != "nl")
	ctx.null_generate = false
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
	const i = skip_html_whitespace(text, index)
	const token = html_token(text, i)
	if (token?.kind == "<") return parse_markup_in_code(ctx, i)
	if (token?.kind == "@") {
		const next = html_token(text, i + 1)
		if (next?.kind == "text" && text[i + 1] == ":") return parse_single_line_markup(ctx, next.end)
		if (next?.kind == "<") return parse_markup_in_code(ctx, i + 1)
		return { end: i + 1, nodes: [] }
	}
	if (token) add_error(
		ctx,
		"Markup in a code block must start with a tag.",
		i,
		token.end
	)
	return { end: i, nodes: [] }
}