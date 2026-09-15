import add_error from "./add_error.js"
import csharp_token from "./csharp_token/index.js"
import is_word from "./is_word.js"
import parse_template from "./parse_template.js"
const markup_block_starts = new Set([ ":", "::", "<" ])
/**
 * @param {string} text
 * @param {import("../../private.js").RazorToken} token
 * @returns {boolean}
 */
function is_embedded_transition(text, token) {
	return token.kind == "@*"
		|| token.kind == "@" && markup_block_starts.has(
			csharp_token(text, token.end)?.kind ?? ""
		)
}
/**
 * @param {import("../../private.js").RazorContext} ctx
 * @param {number} index
 * @param {string} left
 * @param {string} right
 * @param {import("../../private.js").RazorBalance} options
 * @returns {{ end: number, ok: boolean }}
 */
export default function(ctx, index, left, right, options) {
	const { text } = ctx
	const key = `${left}${options.backtrack ? "b" : ""}${options.templates ? "t" : ""}`
	if (ctx.balance_failures.has(`${key}${index}`)) {
		if (!options.no_error) add_error(
			ctx,
			`Expected "${right}".`,
			index,
			text.length
		)
		return {
			end: options.backtrack
				? index
				: text.length,
			ok: false
		}
	}
	let backtrack = index
	let i = index
	let nesting = 1
	/** @type {number[]} */
	let profile = []
	/** @type {[ number, number ][]} */
	let opens = []
	if (csharp_token(text, i)) {
		do {
			let token = csharp_token(text, i)
			if (options.templates && token && is_embedded_transition(text, token)) {
				i = token.kind == "@*"
					? token.end
					: parse_template(ctx, i)
				backtrack = i
				profile = []
				opens = []
				token = csharp_token(text, i)
			}
			if (token?.kind == "@") {
				const next = csharp_token(text, token.end)
				if (next?.kind == "@" && is_word(csharp_token(text, next.end))) {
					i = token.end
					backtrack = i
					profile = []
					opens = []
					continue
				}
				if (is_word(next)) {
					i = /** @type {import("../../private.js").RazorToken} */(next)/**/.end
					continue
				}
			}
			if (token?.kind == left) {
				nesting++
				opens.push([ token.end, profile.length ])
			} else if (token?.kind == right) {
				nesting--
			}
			profile.push(nesting)
			if (nesting > 0 && token) i = token.end
		} while (nesting > 0 && csharp_token(text, i))
	}
	if (nesting > 0) {
		let minimum = Infinity
		const minimums = []
		for (let j = profile.length - 1; j >= 0; j--) {
			minimums[j] = minimum
			minimum = Math.min(
				minimum,
				/** @type {number} */(profile[j])/**/
			)
		}
		for (const [ position, j ] of opens) {
			if (/** @type {number} */(minimums[j])/**/ >= /** @type {number} */(profile[j])/**/) {
				ctx.balance_failures.add(`${key}${position}`)
			}
		}
		if (!options.no_error) add_error(
			ctx,
			`Expected "${right}".`,
			index,
			i
		)
		if (options.backtrack) i = backtrack
	}
	return { end: i, ok: nesting == 0 }
}