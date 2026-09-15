import add_error from "./add_error.js"
import create_root_frame from "./create_root_frame.js"
import current_frame from "./current_frame.js"
import html_token from "./html_token/index.js"
import is_hyphen from "./is_hyphen.js"
import is_newline from "./is_newline.js"
import is_whitespace from "./is_whitespace.js"
import parse_markup_element from "./parse_markup_element.js"
import parse_markup_nodes from "./parse_markup_nodes.js"
import parse_razor_script from "./parse_razor_script.js"
import parser_state from "./parser_state.js"
import skip_html_whitespace from "./skip_html_whitespace.js"
/**
 * @param {string} text
 * @param {number} index
 * @returns {boolean}
 */
function is_line_start(text, index) {
	let i = index
	while (i > 0 && is_whitespace(text[i - 1] ?? "")) i--
	return i == 0 || is_newline(text[i - 1] ?? "")
}
/**
 * @param {import("../../private.js").RazorContext} ctx
 * @param {import("../../private.js").RazorFrame[]} frames
 * @param {number} index
 * @returns {number}
 */
function parse_comment(ctx, frames, index) {
	const { text } = ctx
	let i = index + 4
	const ignored = [ create_root_frame() ]
	while (i < text.length) {
		i = parse_markup_nodes(
			ctx,
			ignored,
			i,
			"text",
			token => token.kind == "--"
		)
		if (i >= text.length) break
		let last = i
		while (html_token(text, last + 2)?.kind == "--") last += 2
		let after = last + 2
		const hyphen = html_token(text, after)
		if (is_hyphen(text, after, hyphen)) after++
		if (html_token(text, after)?.kind == ">") {
			current_frame(frames).children.push(
				{
					end: after + 1,
					start: index,
					type: "Comment"
				}
			)
			return after + 1
		}
		i = after
	}
	current_frame(frames).children.push(
		{
			end: text.length,
			start: index,
			type: "Comment"
		}
	)
	return text.length
}
/**
 * @param {import("../../private.js").RazorContext} ctx
 * @param {import("../../private.js").RazorFrame} root
 * @param {number} index
 * @param {string[]} sequence
 * @returns {number}
 */
function parse_until(ctx, root, index, sequence) {
	const { text } = ctx
	const frame = {
		...create_root_frame(),
		flushed: root.flushed
	}
	const ignored = [ frame ]
	let i = index
	while (i < text.length) {
		i = parse_markup_nodes(
			ctx,
			ignored,
			i,
			"text",
			token => token.kind == sequence[0]
		)
		let matched = true
		for (const kind of sequence) {
			const token = html_token(text, i)
			if (token?.kind != kind) {
				matched = false
				break
			}
			i = token.end
		}
		if (matched) break
	}
	root.flushed = frame.flushed
	return i
}
/**
 * @param {string} text
 * @param {number} index
 * @returns {number}
 */
function skip_spaces(text, index) {
	let i = index
	for (let token = html_token(text, i); token?.kind == "ws"; token = html_token(text, i)) i = token.end
	return i
}
/**
 * @param {import("../../private.js").RazorContext} ctx
 * @param {import("../../private.js").RazorFrame[]} frames
 * @param {number} index
 * @param {"code" | "markup" | "text"} mode
 * @returns {number}
 */
export default function(ctx, frames, index, mode) {
	const { text } = ctx
	const state = parser_state(ctx, index, mode)
	const start = skip_html_whitespace(text, index)
	const root = /** @type {import("../../private.js").RazorFrame} */(frames[0])/**/
	if (state == "eof") return index
	if (ctx.null_generate && (state == "misc" || state == "razor_comment" || state == "code_transition")) {
		ctx.null_generate = false
		let whitespace_end = index
		whitespace_end = skip_spaces(text, whitespace_end)
		const newline = html_token(text, whitespace_end)
		root.flushed = newline?.kind == "nl"
			? newline.end
			: whitespace_end
	}
	if (state == "misc") return start
	if (state == "markup_text" || state == "unknown") return html_token(text, index)?.end ?? index + 1
	if (state == "tag") {
		root.flushed = parse_markup_element(
			ctx,
			frames,
			index,
			mode == "code"
				? "code"
				: "markup"
		)
		return root.flushed
	}
	if (state == "markup_comment") {
		root.flushed = parse_comment(ctx, frames, index)
		return root.flushed
	}
	if (state == "special_tag" || state == "xml_pi" || state == "cdata") {
		if (state == "special_tag") root.flushed = index
		const end = state == "special_tag"
			? parse_until(ctx, root, index, [ ">" ])
			: state == "xml_pi"
				? parse_until(ctx, root, index + 2, [ "?", ">" ])
				: parse_until(
					ctx,
					root,
					index + 9,
					[ "]", "]", ">" ]
				)
		current_frame(frames).children.push(
			{ end, start: index, type: "Comment" }
		)
		return end
	}
	if (state == "razor_comment") {
		const end = html_token(text, start)?.end ?? text.length
		if (!text.startsWith("*@", end - 2) || end - start < 4) add_error(
			ctx,
			"The Razor comment is not closed.",
			start,
			end
		)
		current_frame(frames).children.push(
			{ end, start, type: "Comment" }
		)
		root.flushed = end
		if (is_line_start(text, start)) {
			let whitespace_end = end
			whitespace_end = skip_spaces(text, whitespace_end)
			const newline = html_token(text, whitespace_end)
			if (newline?.kind == "nl") root.flushed = newline.end
		}
		return root.flushed
	}
	if (state == "double_transition") {
		root.flushed = start + 1
		return start + 2
	}
	const script = parse_razor_script(ctx, start)
	current_frame(frames).children.push(script.node)
	root.flushed = script.end
	return script.end
}