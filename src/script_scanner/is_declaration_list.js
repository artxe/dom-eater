import declaration_keywords from "./declaration_keywords.js"
import ends_operand from "./ends_operand.js"
import next_index from "./next_index.js"
import previous_token from "./previous_token.js"
import starts_operand from "./starts_operand.js"
import statement_words from "./statement_words.js"
const binding_start_regex = /[\p{ID_Start}$_[{]/u
/**
 * @param {string} text
 * @param {number} index
 * @param {import("../../private.js").ScanState} state
 * @returns {boolean}
 */
export default function(text, index, state) {
	const commas = [ index ]
	let i = index
	let operand_after = false
	/** @type {boolean | undefined} */
	let result = state.declaration_lists.get(index)
	while (result === undefined) {
		const token = previous_token(text, i, state)
		const stops = token.kind == ""
			|| token.kind == "punctuator" && "()[]{};".includes(token.value)
			|| token.kind == "word" && statement_words.has(token.value)
			|| token.kind == "bracket" && state.expression_after.get(token.end) == true
			|| ends_operand(token) && operand_after
		const declaration = token.kind == "word"
			&& declaration_keywords.has(token.value)
			&& binding_start_regex.test(
				text[next_index(text, token.end)] ?? ""
			)
		if (declaration) {
			result = true
		} else if (stops) {
			result = false
		} else if (token.value == "," && token.kind == "punctuator") {
			result = state.declaration_lists.get(token.start)
			commas.push(token.start)
		}
		operand_after = starts_operand(token)
		i = token.start
	}
	for (const comma of commas) state.declaration_lists.set(comma, result)
	return result
}