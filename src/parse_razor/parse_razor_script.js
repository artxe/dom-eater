import csharp_token from "./csharp_token/index.js"
import interpolated_end from "./interpolated_end.js"
import is_newline from "./is_newline.js"
import is_whitespace from "./is_whitespace.js"
import parse_code_block from "./parse_code_block/index.js"
/**
 * @param {string} char
 * @returns {boolean}
 */
function is_space(char) {
	return is_whitespace(char) || is_newline(char)
}
/**
 * @param {string} text
 * @param {number} start
 * @param {number} end
 * @returns {import("../../public.js").String}
 */
function parse_string(text, start, end) {
	const quote = text.indexOf("\"", start)
	/** @type {[ number, number, number, number ][]} */
	const holes = []
	if (text[start] == "$" || text[quote - 1] == "$") interpolated_end(text, start, holes)
	const suffix = end - quote > 3 && /"[Uu]8$/.test(text.slice(end - 3, end))
	return {
		end: suffix
			? end - 2
			: end,
		scripts: holes.map(
			(
				[
					hole_start,
					content_start,
					content_end,
					hole_end
				]
			) => (
				{
					elements: [],
					end: hole_end,
					start: hole_start,
					strings: scan_code(text, content_start, content_end, []).strings,
					subType: "razor",
					type: "Script"
				}
			)
		),
		start: quote,
		subType: "double",
		type: "String"
	}
}
/**
 * @param {string} text
 * @param {number} start
 * @param {number} end
 * @param {[ number, number, number ][]} markup
 * @returns {{ last: number, strings: import("../../public.js").String[] }}
 */
function scan_code(text, start, end, markup) {
	/** @type {import("../../public.js").String[]} */
	const strings = []
	const ranges = [ ...markup ].sort((a, b) => a[0] - b[0])
	let last = start
	let range = 0
	for (let i = start; i < end;) {
		while (range < ranges.length && /** @type {[ number, number, number ]} */(ranges[range])/**/[1] <= i) range++
		const next_range = ranges[range]
		if (next_range && next_range[0] <= i) {
			let markup_end = next_range[1]
			while (markup_end > next_range[0] && is_space(text[markup_end - 1] ?? "")) markup_end--
			last = Math.max(last, markup_end, next_range[2])
			i = next_range[1]
			continue
		}
		const limit = next_range
			? Math.min(end, next_range[0])
			: end
		const token = csharp_token(text, i)
		if (!token) break
		if (token.kind == "string" && token.end <= limit && text.slice(i, token.end).includes("\"")) strings.push(
			parse_string(text, i, token.end)
		)
		if (token.kind != "ws" && token.kind != "nl") last = Math.max(last, Math.min(token.end, limit))
		i = token.end
	}
	return { last, strings }
}
/**
 * @param {import("../../private.js").RazorContext} ctx
 * @param {number} index
 * @returns {{ end: number, node: import("../../public.js").Script & { subType: "razor" } }}
 */
export default function(ctx, index) {
	const { text } = ctx
	const parent = ctx.script
	const nested = ctx.nested
	/** @type {import("../../private.js").RazorScript} */
	const script = {
		elements: [],
		markup: [],
		strings: []
	}
	ctx.script = script
	ctx.nested = false
	const end = parse_code_block(ctx, index)
	ctx.script = parent
	ctx.nested = nested
	const code = scan_code(text, index, end, script.markup)
	const strings = [
		...code.strings,
		...script.strings
	].sort((a, b) => a.start - b.start)
	let node_end = Math.max(index + 1, code.last)
	script.elements.sort((a, b) => a.start - b.start)
	for (const child of [ ...script.elements, ...strings ]) node_end = Math.max(node_end, child.end)
	return {
		end,
		node: {
			elements: script.elements,
			end: node_end,
			start: index,
			strings,
			subType: "razor",
			type: "Script"
		}
	}
}