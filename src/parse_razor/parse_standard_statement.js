import accept_until from "./accept_until.js"
import add_error from "./add_error.js"
import balance from "./balance.js"
import csharp_token from "./csharp_token/index.js"
import is_word from "./is_word.js"
import parse_template from "./parse_template.js"
const recovery_stops = new Set([ "<", "}" ])
const standard_statement_stops = new Set(
	[
		"(",
		";",
		"@",
		"@*",
		"[",
		"keyword",
		"{",
		"}"
	]
)
const statement_recovery_stops = new Set([ "<", "{", "}" ])
/**
 * @param {import("../../private.js").RazorContext} ctx
 * @param {number} index
 * @returns {{ end: number, ok: boolean }}
 */
function try_balance_block(ctx, index) {
	const result = balance(
		ctx,
		index,
		{ backtrack: true, templates: true }
	)
	if (!result.ok) {
		return {
			end: accept_until(ctx, result.end, recovery_stops),
			ok: false
		}
	}
	const close = csharp_token(ctx.text, result.end)
	return {
		end: close?.kind == "}"
			? close.end
			: result.end,
		ok: true
	}
}
/**
 * @param {import("../../private.js").RazorContext} ctx
 * @param {number} index
 * @param {boolean} encountered
 * @returns {number}
 */
export default function(ctx, index, encountered) {
	const { text } = ctx
	let i = index
	while (i < text.length) {
		const bookmark = i
		if (ctx.statement_ends.has(i)) return accept_until(
			ctx,
			bookmark,
			statement_recovery_stops
		)
		/** @type {number[]} */
		const starts = []
		let token = csharp_token(text, i)
		while (token && !standard_statement_stops.has(token.kind)) {
			starts.push(i)
			i = token.end
			token = csharp_token(text, i)
		}
		if (!token) {
			for (const start of starts) ctx.statement_ends.add(start)
			return accept_until(
				ctx,
				bookmark,
				statement_recovery_stops
			)
		}
		if (token.kind == "(" || token.kind == "[") {
			const result = try_balance_block(ctx, i)
			i = result.end
			if (!result.ok) return i
		} else if (token.kind == "{" || token.kind == "}") {
			return i
		} else if (token.kind == ";") {
			return token.end
		} else if (token.kind == "@*") {
			i = token.end
		} else if (token.kind == "@") {
			const next = csharp_token(text, token.end)
			const after = next && csharp_token(text, next.end)
			if (next?.kind == "<" || next?.kind == ":") {
				i = parse_template(ctx, i)
			} else if (next?.kind == "keyword" && encountered) {
				return i
			} else if (next && is_word(next)) {
				i = next.end
			} else if (next?.kind == "@" && after && is_word(after)) {
				i = after.end
			} else {
				add_error(
					ctx,
					"\"@\" in a code block must be followed by \":\", \"(\" or an identifier.",
					i,
					token.end
				)
				i = token.end
			}
		} else if (text.slice(i, token.end) == "switch") {
			i = accept_until(ctx, i, new Set([ "{" ]))
			if (!csharp_token(text, i)) return i
			const result = try_balance_block(ctx, i)
			i = result.end
			if (!result.ok) return i
		} else {
			i = token.end
		}
	}
	return i
}