import is_expression_start from "../../script_scanner/is_expression_start.js"
import nested_bracket from "../../script_scanner/nested_bracket.js"
import previous_index from "../../script_scanner/previous_index.js"
import record_literal from "../../script_scanner/record_literal.js"
import record_operand from "../../script_scanner/record_operand.js"
import parse_element from "../parse_element/index.js"
import is_type_parameters from "./is_type_parameters.js"
const close_tag_name_regex = /<\/\s*([^\s/>]*)/g
/** @type {{ names: Set<string>, text: string }} */
let close_tag_names = { names: new Set(), text: "" }
const open_tag_parenthesis_regex = /<((?:const\s+)?[\p{ID_Start}$_][\p{ID_Continue}$]*)>\(/uy
/**
 * @param {string} text
 * @param {number} index
 * @returns {boolean}
 */
function is_shift_end(text, index) {
	let start = index
	while (text[start - 1] == "<") start--
	return (index - start) % 2 == 1
}
/**
 * @param {string} text
 * @param {import("../../../public.js").AstSyntaxError[]} errors
 * @param {number} index
 * @param {import("../../../private.js").ScanState} state
 * @returns {import("../../../public.js").Element | undefined}
 */
function parse_sibling(text, errors, index, state) {
	const previous = state.openings.get(
		previous_index(text, index, state) + 1
	)
	if (previous === undefined || text[previous] != "<") return
	/** @type {import("../../../public.js").AstSyntaxError[]} */
	const candidate_errors = []
	const element = parse_element(
		text,
		candidate_errors,
		index,
		nested_bracket(text, index, true, state)
	)
	if (candidate_errors.length && element.end < text.length) return
	for (const error of candidate_errors) errors.push(error)
	return record_element(element, state)
}
/**
 * @param {import("../../../public.js").Element} element
 * @param {import("../../../private.js").ScanState} state
 * @returns {import("../../../public.js").Element}
 */
function record_element(element, state) {
	record_literal(element, state)
	record_operand(element.end, state)
	return element
}
/**
 * @param {string} text
 * @param {import("../../../public.js").AstSyntaxError[]} errors
 * @param {number} index
 * @param {import("../../../private.js").ScanState} state
 * @returns {import("../../../public.js").Element | undefined}
 */
export default function(text, errors, index, state) {
	if (state.brackets[0]?.script?.jsx === false) return
	if (is_shift_end(text, index) || is_type_parameters(text, index)) return
	if (!is_expression_start(text, index, state)) return parse_sibling(text, errors, index, state)
	open_tag_parenthesis_regex.lastIndex = index
	const match = open_tag_parenthesis_regex.exec(text)
	if (!match) return record_element(
		parse_element(
			text,
			errors,
			index,
			nested_bracket(text, index, true, state)
		),
		state
	)
	if (close_tag_names.text != text) {
		close_tag_names = {
			names: new Set(
				[
					...text.matchAll(close_tag_name_regex)
				].map(found => found[1] ?? "")
			),
			text
		}
	}
	if (!close_tag_names.names.has(match[1] ?? "")) return
	/** @type {import("../../../public.js").AstSyntaxError[]} */
	const candidate_errors = []
	const element = parse_element(
		text,
		candidate_errors,
		index,
		nested_bracket(text, index, true, state)
	)
	return candidate_errors.length
		? undefined
		: record_element(element, state)
}