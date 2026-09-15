const operand_ends = ")]}\"'`"
const reserved_words = new Set(
	[
		"break",
		"case",
		"catch",
		"class",
		"const",
		"continue",
		"debugger",
		"default",
		"delete",
		"do",
		"else",
		"enum",
		"export",
		"extends",
		"finally",
		"for",
		"function",
		"if",
		"import",
		"in",
		"instanceof",
		"new",
		"return",
		"super",
		"switch",
		"throw",
		"try",
		"typeof",
		"var",
		"void",
		"while",
		"with"
	]
)
/**
 * @param {import("../../../private.js").PugCharState} state
 * @returns {boolean}
 */
export default function(state) {
	if (state.last == "") return false
	if (state.last_operand || operand_ends.includes(state.last)) return true
	if (state.ident == "") return false
	if (state.ident_before == "." || /^\d/.test(state.ident)) return true
	return !reserved_words.has(state.ident)
}