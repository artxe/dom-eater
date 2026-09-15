import balance from "./balance.js"
import csharp_token from "./csharp_token/index.js"
import is_word from "./is_word.js"
import token_end from "./token_end.js"
/**
 * @param {import("../../private.js").RazorContext} ctx
 * @param {number} index
 * @returns {{ end: number, ok: boolean }}
 */
function parse_type_name(ctx, index) {
	const { text } = ctx
	const token = csharp_token(text, index)
	if (token?.kind == "(") {
		let i = token.end
		for (let current = csharp_token(text, i); current; current = csharp_token(text, i)) {
			if (current.kind == ")") {
				i = current.end
				break
			}
			if (current.kind == "ws") i = current.end
			const inner = parse_type_name(ctx, i)
			if (!inner.ok) return inner
			i = inner.end
			for (const kind of [ "ws", "identifier", "ws", "," ]) {
				const next = csharp_token(text, i)
				if (next?.kind == kind) i = next.end
			}
		}
		return {
			end: skip_nullable(ctx, i),
			ok: true
		}
	}
	if (!is_word(token)) {
		return { end: index, ok: false }
	}
	let i = token_end(ctx, index)
	const colons = csharp_token(text, i)
	if (colons?.kind == "::") {
		i = colons.end
		const name = csharp_token(text, i)
		if (is_word(name)) i = /** @type {import("../../private.js").RazorToken} */(name)/**/.end
	}
	if (csharp_token(text, i)?.kind == "<") {
		i = balance(ctx, i, {}).end
		const close = csharp_token(text, i)
		if (close?.kind == ">") i = close.end
	}
	const dot = csharp_token(text, i)
	if (dot?.kind == ".") i = parse_type_name(ctx, dot.end).end
	i = skip_nullable(ctx, i)
	const whitespace = csharp_token(text, i)
	if (whitespace?.kind == "ws" && csharp_token(text, whitespace.end)?.kind == "[") i = whitespace.end
	while (csharp_token(text, i)?.kind == "[") {
		i = balance(ctx, i, {}).end
		const close = csharp_token(text, i)
		if (close?.kind == "]") i = close.end
	}
	return { end: i, ok: true }
}
/**
 * @param {import("../../private.js").RazorContext} ctx
 * @param {number} index
 * @returns {number}
 */
function skip_nullable(ctx, index) {
	const { text } = ctx
	let i = index
	const whitespace = csharp_token(text, i)
	if (whitespace?.kind == "ws" && csharp_token(text, whitespace.end)?.kind == "?") i = whitespace.end
	const question = csharp_token(text, i)
	return question?.kind == "?"
		? question.end
		: i
}
export default parse_type_name