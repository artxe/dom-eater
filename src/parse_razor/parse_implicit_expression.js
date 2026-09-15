import accept_until from "./accept_until.js"
import angle_stops from "./angle_stops.js"
import balance from "./balance.js"
import csharp_token from "./csharp_token/index.js"
import is_word from "./is_word.js"
/**
 * @param {import("../../private.js").RazorContext} ctx
 * @param {number} index
 * @returns {{ end: number, more: boolean }}
 */
function parse_member_access(ctx, index) {
	const { text } = ctx
	let i = index
	for (;;) {
		const token = csharp_token(text, i)
		if (!token) {
			return { end: i, more: false }
		}
		if (token.kind == "(" || token.kind == "[") {
			const right = token.kind == "("
				? ")"
				: "]"
			const result = balance(
				ctx,
				i,
				{ backtrack: true, templates: true }
			)
			i = result.ok
				? result.end
				: accept_until(ctx, result.end, angle_stops)
			const close = csharp_token(text, i)
			if (close?.kind == right) i = close.end
			continue
		}
		const next = csharp_token(text, token.end)
		if (token.kind == "?") {
			if (next?.kind == ".") {
				return {
					end: next.end,
					more: is_word(csharp_token(text, next.end))
				}
			}
			if (next?.kind == "[") {
				i = token.end
				continue
			}
		} else if (token.kind == "!" && next) {
			if (next.kind == "." && is_word(csharp_token(text, next.end))) {
				return { end: next.end, more: true }
			}
			if (next.kind == "?") {
				return { end: token.end, more: true }
			}
			if (next.kind == "[" || next.kind == "(") {
				i = token.end
				continue
			}
		} else if (token.kind == ".") {
			if (is_word(next)) {
				return { end: token.end, more: true }
			}
			if (ctx.nested) i = token.end
		}
		return { end: i, more: false }
	}
}
/**
 * @param {import("../../private.js").RazorContext} ctx
 * @param {number} index
 * @returns {number}
 */
export default function(ctx, index) {
	let i = index
	for (;;) {
		const token = csharp_token(ctx.text, i)
		if (token && is_word(token)) i = token.end
		const result = parse_member_access(ctx, i)
		i = result.end
		if (!result.more) return i
	}
}