/**
 * @returns {import("../../../private.js").PugCharState}
 */
export default function() {
	return {
		escaped: false,
		has_dollar: false,
		ident: "",
		ident_before: "",
		last: "",
		last_char: "",
		last_operand: false,
		line_comment: false,
		operand_before: false,
		recent: "",
		recent_kind: 0,
		regexp_start: false,
		separated: false,
		stack: [],
		ternaries: 0,
		undo_ident: "",
		undo_ident_before: "",
		undo_last: "",
		undo_last_operand: false,
		undo_recent: "",
		undo_recent_kind: 0,
		undo_separated: false,
		undo_word: "",
		word: ""
	}
}