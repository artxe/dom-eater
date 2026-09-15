import current_bracket from "./current_bracket.js"
import ends_operand from "./ends_operand.js"
import previous_token from "./previous_token.js"
import starts_operand from "./starts_operand.js"
import statement_words from "./statement_words.js"
/**
 * @param {string} text
 * @param {number} index
 * @param {boolean} operand_start
 * @param {import("../../private.js").ScanState} state
 * @returns {boolean | undefined}
 */
export default function(text, index, operand_start, state) {
	const bracket = current_bracket(state)
	if (bracket.arrow < 0) return undefined
	let i = index
	let operand_after = operand_start
	for (;;) {
		if (i <= bracket.arrow_inside) break
		const token = previous_token(text, i, state)
		if (token.kind == "punctuator" && token.start == bracket.arrow + 1) break
		const ends = token.start < bracket.arrow
			|| (token.kind == "punctuator"
				? ",;".includes(token.value)
				: token.kind == "word" && statement_words.has(token.value) || ends_operand(token) && operand_after)
		if (ends) {
			bracket.arrow = -1
			return undefined
		}
		operand_after = starts_operand(token)
		i = token.start
	}
	bracket.arrow_inside = index
	return bracket.arrow_async
}