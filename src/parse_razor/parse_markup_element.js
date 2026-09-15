import add_error from "./add_error.js"
import close_unclosed from "./close_unclosed.js"
import close_void from "./close_void.js"
import create_root_frame from "./create_root_frame.js"
import current_frame from "./current_frame.js"
import equals_ignore_case from "./equals_ignore_case.js"
import html_token from "./html_token/index.js"
import is_bang_escape from "./is_bang_escape.js"
import is_void from "./is_void.js"
import parse_markup_nodes from "./parse_markup_nodes.js"
import parse_razor_script from "./parse_razor_script.js"
import skip_html_whitespace from "./skip_html_whitespace.js"
const attribute_name_invalid_starts = new Set(
	[ "/", "<", "=", ">", "nl", "ws" ]
)
const end_tag_stops = new Set([ "<", ">" ])
const literal_value_stops = new Set([ "@", "nl", "ws" ])
const misc_attribute_stops = new Set([ "\"", "'", "/", "<", ">" ])
const text_tag_stops = new Set([ ">", "nl" ])
const type_attribute_suffixes = " \t\r\n\f="
const unquoted_value_stops = new Set(
	[ "\"", "'", "<", "=", ">", "nl", "ws" ]
)
/**
 * @param {import("../../private.js").RazorContext} ctx
 * @param {import("../../private.js").RazorFrame[]} frames
 * @param {number} end_tag_start
 * @param {number} end_tag_end
 * @returns {void}
 */
function close_with_end_tag(
	ctx,
	frames,
	end_tag_start,
	end_tag_end
) {
	const frame = /** @type {import("../../private.js").RazorFrame} */(frames.pop())/**/
	const element = /** @type {import("../../public.js").Element} */(frame.element)/**/
	element.children = frame.children
	ctx.bodies.set(
		element,
		[ element.end, end_tag_start ]
	)
	element.end = end_tag_end
}
/**
 * @param {string} name
 * @returns {string}
 */
function element_name(name) {
	return name[0] == "!"
		? name.slice(1)
		: name
}
/**
 * @param {string} text
 * @param {number} index
 * @param {import("../../private.js").RazorToken} token
 * @param {boolean} legacy
 * @returns {boolean}
 */
function is_attribute_name_end(text, index, token, legacy) {
	return token.kind == "ws"
		|| token.kind == "nl"
		|| token.kind == "="
		|| token.kind == ">"
		|| token.kind == "<"
		|| legacy && token.kind == "@"
		|| token.kind == "/" && html_token(text, index + 1)?.kind == ">"
}
/**
 * @param {string} text
 * @param {number} index
 * @param {string} quote
 * @returns {boolean}
 */
function is_end_of_attribute_value(text, index, quote) {
	const token = html_token(text, index)
	if (!token) return true
	if (quote) return token.kind == quote
	return unquoted_value_stops.has(token.kind) || token.kind == "/" && html_token(text, index + 1)?.kind == ">"
}
/**
 * @param {string} text
 * @param {number} index
 * @returns {boolean}
 */
function is_end_of_tag(text, index) {
	const token = html_token(text, index)
	if (token?.kind == "/") {
		const next = html_token(text, index + 1)?.kind
		if (next == ">" || next == "<") return true
	}
	return token?.kind == ">" || token?.kind == "<"
}
/**
 * @param {import("../../private.js").RazorContext} ctx
 * @param {number} index
 * @param {import("../../public.js").Attribute[]} attributes
 * @returns {number}
 */
function parse_attribute(ctx, index, attributes) {
	const { text } = ctx
	const start = skip_html_whitespace(text, index)
	const token = html_token(text, start)
	if (token?.kind == "@" && !ctx.component) {
		if (text[start + 1] == "@") return parse_attribute_name(
			ctx,
			start + 1,
			read_attribute_name(text, start + 2, true),
			attributes
		)
		const script = parse_razor_script(ctx, start)
		attributes.push(
			{
				end: script.node.end,
				name: "",
				start,
				type: "Attribute",
				value: script.node
			}
		)
		return script.end
	}
	if (token?.kind == "@*" && !ctx.component) return token.end
	if (token && !attribute_name_invalid_starts.has(token.kind)) {
		return parse_attribute_name(
			ctx,
			start,
			read_attribute_name(text, start, !ctx.component),
			attributes
		)
	}
	return parse_misc_attribute(ctx, start, attributes)
}
/**
 * @param {import("../../private.js").RazorContext} ctx
 * @param {number} name_start
 * @param {number} name_end
 * @param {import("../../public.js").Attribute[]} attributes
 * @returns {number}
 */
function parse_attribute_name(
	ctx,
	name_start,
	name_end,
	attributes
) {
	const { text } = ctx
	/** @type {import("../../public.js").Attribute} */
	const node = {
		end: name_end,
		name: text.slice(name_start, name_end),
		start: name_start,
		type: "Attribute",
		value: true
	}
	attributes.push(node)
	const equals = skip_html_whitespace(text, name_end)
	if (html_token(text, equals)?.kind != "=") return name_end
	let i = equals + 1
	node.end = i
	const value_start = skip_html_whitespace(text, i)
	const quote_token = html_token(text, value_start)?.kind ?? ""
	const quote = quote_token == "\"" || quote_token == "'"
		? quote_token
		: ""
	if (!quote && value_start > i) return i
	/** @type {import("../../private.js").MarkupScript[]} */
	const scripts = []
	const content_start = quote
		? value_start + 1
		: i
	i = content_start
	while (i < text.length && !is_end_of_attribute_value(text, i, quote)) {
		i = parse_attribute_value(ctx, i, quote, scripts)
	}
	if (quote && html_token(text, i)?.kind == quote) i++
	if (quote || i > content_start) {
		node.value = {
			end: i,
			scripts,
			start: quote
				? value_start
				: content_start,
			subType: quote == "'"
				? "single"
				: quote
					? "double"
					: "unquoted",
			type: "String"
		}
		node.end = i
	}
	return i
}
/**
 * @param {import("../../private.js").RazorContext} ctx
 * @param {number} index
 * @param {string} quote
 * @param {import("../../public.js").Script[]} scripts
 * @returns {number}
 */
function parse_attribute_value(ctx, index, quote, scripts) {
	const { text } = ctx
	const start = skip_html_whitespace(text, index)
	if (html_token(text, start)?.kind == "@") {
		if (text[start + 1] == "@") return start + 2
		const script = parse_razor_script(ctx, start)
		scripts.push(script.node)
		return script.end
	}
	let i = start
	for (let token = html_token(text, i); token; token = html_token(text, i)) {
		if (literal_value_stops.has(token.kind) || is_end_of_attribute_value(text, i, quote)) break
		i = token.end
	}
	return i
}
/**
 * @param {import("../../private.js").RazorContext} ctx
 * @param {number} index
 * @param {import("../../public.js").Attribute[]} attributes
 * @returns {number}
 */
function parse_attributes(ctx, index, attributes) {
	const { text } = ctx
	const token = html_token(text, index)
	if (token?.kind != "ws" && token?.kind != "nl") return parse_misc_attribute(ctx, index, attributes)
	let i = index
	while (i < text.length && !is_end_of_tag(text, i)) {
		if (text[i] == "/") i++
		i = parse_attribute(ctx, i, attributes)
	}
	return i
}
/**
 * @param {import("../../private.js").RazorContext} ctx
 * @param {import("../../private.js").RazorFrame[]} frames
 * @param {number} index
 * @param {"code" | "markup"} mode
 * @returns {number}
 */
function parse_end_tag_element(ctx, frames, index, mode) {
	const { text } = ctx
	let i = index + 2
	let bang = false
	if (is_bang_escape(text, i)) {
		bang = true
		i++
	}
	let name = ""
	const name_token = html_token(text, i)
	if (name_token?.kind == "text") {
		name = `${
			bang
				? "!"
				: ""
		}${text.slice(i, name_token.end)}`
		if (
			mode == "code"
			&& equals_ignore_case(name, "text")
			&& frames.filter(
				frame => equals_ignore_case(frame.name, "text")
			).length == 1
			&& equals_ignore_case(frames[1]?.name ?? "", "text")
		) {
			i = name_token.end
			if (html_token(text, i)?.kind == ">") {
				i++
			} else {
				add_error(
					ctx,
					"The \"text\" tag cannot contain attributes.",
					index,
					i
				)
				i = skip_html_until(text, i, text_tag_stops)
				if (html_token(text, i)?.kind == ">") i++
			}
		} else {
			i = name_token.end
			for (let token = html_token(text, i); token?.kind == "ws"; token = html_token(text, i)) i = token.end
			if (mode == "code") {
				i = skip_html_until(text, i, end_tag_stops)
			}
			if (html_token(text, i)?.kind == ">") i++
		}
	} else {
		for (let token = html_token(text, i); token?.kind == "ws"; token = html_token(text, i)) i = token.end
		if (mode == "code") {
			i = skip_html_until(text, i, end_tag_stops)
		}
		if (html_token(text, i)?.kind == ">") i++
	}
	if (frames.length > 1 && equals_ignore_case(current_frame(frames).name, name)) {
		close_with_end_tag(ctx, frames, index, i)
		return i
	}
	while (
		frames.length > 1
		&& !equals_ignore_case(current_frame(frames).name, name)
		&& is_void(current_frame(frames).name)
	) {
		close_void(frames)
	}
	let match = frames.length - 1
	while (match > 0 && !equals_ignore_case(frames[match]?.name ?? "", name)) match--
	if (match > 0) {
		while (frames.length - 1 > match) close_unclosed(ctx, frames, index)
		close_with_end_tag(ctx, frames, index, i)
		return i
	}
	current_frame(frames).children.push(
		{
			attributes: [],
			children: [],
			end: i,
			name: element_name(name),
			start: index,
			subType: "close",
			type: "Element"
		}
	)
	if (mode == "code") {
		if (frames.length == 1) {
			add_error(
				ctx,
				`The end tag "${name}" has no start tag.`,
				index,
				i
			)
		}
		while (frames.length > 1) {
			const outer = frames.length == 2
			const frame = current_frame(frames)
			close_unclosed(ctx, frames, i)
			if (outer && frame.element) add_error(
				ctx,
				`The "${frame.name}" element is not closed.`,
				frame.element.start,
				i
			)
		}
	}
	return i
}
/**
 * @param {import("../../private.js").RazorContext} ctx
 * @param {number} index
 * @param {import("../../public.js").Attribute[]} attributes
 * @returns {number}
 */
function parse_misc_attribute(ctx, index, attributes) {
	const { text } = ctx
	const frames = [ create_root_frame() ]
	let i = index
	while (i < text.length) {
		i = parse_markup_nodes(
			ctx,
			frames,
			i,
			"text",
			token => misc_attribute_stops.has(token.kind)
		)
		const token = html_token(text, i)
		if (!token || token.kind == ">" || token.kind == "/" || token.kind == "<") break
		i = parse_markup_nodes(
			ctx,
			frames,
			token.end,
			"text",
			next => next.kind == token.kind
		)
		if (i < text.length) i++
	}
	for (const node of current_frame(frames).children) {
		if (node.type == "Script") {
			attributes.push(
				{
					end: node.end,
					name: "",
					start: node.start,
					type: "Attribute",
					value: /** @type {import("../../public.js").Script & { subType: "razor" }} */(node)/**/
				}
			)
		}
	}
	return i
}
/**
 * @param {import("../../private.js").RazorContext} ctx
 * @param {import("../../public.js").Element} element
 * @returns {number}
 */
function parse_script_element(ctx, element) {
	const { text } = ctx
	const frames = [ create_root_frame() ]
	const body_start = element.end
	let i = body_start
	while (i < text.length) {
		i = parse_markup_nodes(
			ctx,
			frames,
			i,
			"text",
			token => token.kind == "<"
		)
		if (i >= text.length) break
		const name = html_token(text, i + 2)
		if (text[i + 1] == "/" && name?.kind == "text" && equals_ignore_case(
			text.slice(i + 2, name.end),
			"script"
		)) {
			const end_tag_start = i
			i = name.end
			i = skip_html_until(text, i, end_tag_stops)
			if (html_token(text, i)?.kind == ">") {
				i++
			} else {
				add_error(
					ctx,
					"The \"script\" end tag is not finished.",
					end_tag_start,
					i
				)
			}
			element.children = current_frame(frames).children
			ctx.bodies.set(
				element,
				[ body_start, end_tag_start ]
			)
			element.end = i
			return i
		}
		i++
	}
	const body_end = Math.max(
		body_start,
		frames[0]?.flushed ?? 0
	)
	element.children = current_frame(frames).children
	ctx.bodies.set(
		element,
		[ body_start, body_end ]
	)
	element.end = body_end
	return i
}
/**
 * @param {import("../../private.js").RazorContext} ctx
 * @param {import("../../private.js").RazorFrame[]} frames
 * @param {number} index
 * @param {"code" | "markup"} mode
 * @returns {import("../../private.js").RazorStartTag}
 */
function parse_start_tag(ctx, frames, index, mode) {
	const { text } = ctx
	let i = index + 1
	let bang = false
	if (is_bang_escape(text, i)) {
		bang = true
		i++
	}
	let name = ""
	const name_token = html_token(text, i)
	if (name_token?.kind == "text") {
		name = `${
			bang
				? "!"
				: ""
		}${text.slice(i, name_token.end)}`
		if (mode == "code" && frames.length == 1 && equals_ignore_case(name, "text")) {
			return parse_text_tag(ctx, i, name_token.end)
		}
		i = name_token.end
	}
	/** @type {import("../../public.js").Attribute[]} */
	const attributes = []
	i = parse_attributes(ctx, i, attributes)
	/** @type {import("../../private.js").RazorStartTag["mode"]} */
	let tag_mode = "normal"
	const self_closing = html_token(text, i)?.kind == "/"
	if (self_closing) {
		tag_mode = "self_closing"
		i++
	}
	let closed = false
	if (mode == "code") {
		if (html_token(text, i)?.kind != ">") {
			add_error(
				ctx,
				`The "${name}" tag is not finished.`,
				index,
				i
			)
		} else {
			i++
			closed = true
			if (tag_mode != "self_closing" && is_void(name)) {
				const end_tag = skip_html_whitespace(text, i)
				const end_name = html_token(text, end_tag + 2)
				if (
					text[end_tag] != "<"
					|| text[end_tag + 1] != "/"
					|| end_name?.kind != "text"
					|| !equals_ignore_case(
						text.slice(end_tag + 2, end_name.end),
						name
					)
				) {
					tag_mode = "void"
				}
			}
		}
	} else if (html_token(text, i)?.kind == ">") {
		i++
		closed = true
	}
	if (equals_ignore_case(name, "script") && !script_expects_html(text, attributes)) tag_mode = "script"
	if (name_token?.kind != "text" && !closed) tag_mode = "invalid"
	return {
		attributes,
		end: i,
		mode: tag_mode,
		name,
		self_closing,
		well_formed: closed
	}
}
/**
 * @param {import("../../private.js").RazorContext} ctx
 * @param {number} name_start
 * @param {number} name_end
 * @returns {import("../../private.js").RazorStartTag}
 */
function parse_text_tag(ctx, name_start, name_end) {
	const { text } = ctx
	let i = name_end
	for (let token = html_token(text, i); token?.kind == "ws"; token = html_token(text, i)) i = token.end
	/** @type {import("../../private.js").RazorStartTag["mode"]} */
	let mode = "normal"
	const token = html_token(text, i)
	if (token?.kind == ">" || token?.kind == "/" && html_token(text, i + 1)?.kind == ">") {
		if (token.kind == "/") {
			mode = "self_closing"
			i++
		}
		i++
	} else {
		add_error(
			ctx,
			"The \"text\" tag cannot contain attributes.",
			name_start - 1,
			i
		)
		i = skip_html_until(text, i, text_tag_stops)
		if (html_token(text, i)?.kind == ">") i++
	}
	return {
		attributes: [],
		end: i,
		mode,
		name: text.slice(name_start, name_end),
		self_closing: mode == "self_closing",
		well_formed: true
	}
}
/**
 * @param {string} text
 * @param {number} index
 * @param {boolean} legacy
 * @returns {number}
 */
function read_attribute_name(text, index, legacy) {
	let i = index
	for (
		let token = html_token(text, i);
		token && !is_attribute_name_end(text, i, token, legacy);
		token = html_token(text, i)
	) {
		i = !legacy && token.kind == "@" && text[i + 1] == "@"
			? i + 2
			: token.end
	}
	return i
}
/**
 * @param {string} text
 * @param {import("../../public.js").Attribute[]} attributes
 * @returns {boolean}
 */
function script_expects_html(text, attributes) {
	for (const attribute of attributes) {
		const value = attribute.value
		if (value === true || value.type != "String" || !equals_ignore_case(
			attribute.name.slice(0, 4),
			"type"
		)) continue
		if (attribute.name.length > 4 && !type_attribute_suffixes.includes(attribute.name[4] ?? "")) continue
		const quoted = value.subType != "unquoted"
		const content_end = quoted && value.end - value.start > 1 && text[value.end - 1] == text[value.start]
			? value.end - 1
			: value.end
		const content_start = quoted
			? value.start + 1
			: value.start
		if (content_end <= content_start) continue
		return equals_ignore_case(
			text.slice(content_start, content_end).trim(),
			"text/html"
		)
	}
	return false
}
/**
 * @param {string} text
 * @param {number} index
 * @param {Set<string>} stops
 * @returns {number}
 */
function skip_html_until(text, index, stops) {
	let i = index
	for (let token = html_token(text, i); token && !stops.has(token.kind); token = html_token(text, i)) i = token.end
	return i
}
/**
 * @param {import("../../private.js").RazorContext} ctx
 * @param {import("../../private.js").RazorFrame[]} frames
 * @param {number} index
 * @param {"code" | "markup"} mode
 * @returns {number}
 */
export default function(ctx, frames, index, mode) {
	const { text } = ctx
	if (text[index + 1] == "/") return parse_end_tag_element(ctx, frames, index, mode)
	const tag = parse_start_tag(ctx, frames, index, mode)
	/** @type {import("../../public.js").Element} */
	const element = {
		attributes: tag.attributes,
		children: [],
		end: tag.end,
		name: element_name(tag.name),
		start: index,
		subType: tag.self_closing
			? "closed"
			: "open",
		type: "Element"
	}
	current_frame(frames).children.push(element)
	if (tag.mode == "script") return parse_script_element(ctx, element)
	if (tag.mode == "normal") {
		frames.push(
			{
				children: [],
				element,
				flushed: 0,
				name: tag.name,
				well_formed: tag.well_formed
			}
		)
	}
	return tag.end
}