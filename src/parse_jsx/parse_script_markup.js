import create_ast_syntax_error from "../create_ast_syntax_error.js"
import create_scan_state from "../script_scanner/create_scan_state.js"
import nested_bracket from "../script_scanner/nested_bracket.js"
import parse_script_quotes from "../script_scanner/parse_script_quotes.js"
import record_literal from "../script_scanner/record_literal.js"
import scan_punctuator from "../script_scanner/scan_punctuator.js"
import script_bracket from "../script_scanner/script_bracket.js"
import script_stop_pattern from "../script_scanner/script_stop_pattern.js"
import skip_line_comment from "../script_scanner/skip_line_comment.js"
import skip_slash from "../script_scanner/skip_slash.js"
import set_text from "../set_text.js"
import is_markup_template from "./is_markup_template.js"
import parse_markup_template from "./parse_markup_template.js"
import parse_script_backticks from "./parse_script_backticks/index.js"
import parse_tag_candidate from "./parse_tag_candidate/index.js"
import tag_start_pattern from "./tag_start_pattern.js"
const stop_jsx_regex = new RegExp(
	`${script_stop_pattern}|${tag_start_pattern}`,
	"u"
)
/**
 * @param {string} text
 * @param {import("../../public.js").AstSyntaxError[]} errors
 * @param {import("../../public.js").Element[]} ast_nodes
 * @param {boolean} jsx
 * @param {boolean} module
 * @returns {import("../../private.js").ScriptInfo}
 */
function scan(text, errors, ast_nodes, jsx, module) {
	/** @type {import("../../private.js").ScriptInfo} */
	const script = {
		jsx,
		module,
		module_syntax: false,
		top_level_await: false
	}
	const state = create_scan_state(
		{
			...script_bracket,
			await_keyword: undefined,
			script
		}
	)
	let start = text.startsWith("#!")
		? skip_line_comment(text, 0, state)
		: 0
	for (;;) {
		const child_index = text.slice(start).search(stop_jsx_regex)
		if (child_index < 0) break
		const index = start + child_index
		if (text[index] == "<") {
			const node = parse_tag_candidate(text, errors, index, state)
			if (node) {
				ast_nodes.push(node)
				start = node.end
			} else {
				start = index + 1
			}
		} else if (text[index] == "/") {
			start = skip_slash(text, errors, index, state)
		} else if (text[index] == "'" || text[index] == "\"") {
			const node = parse_script_quotes(text, errors, index)
			record_literal(node, state)
			start = node.end
		} else if (text[index] == "`") {
			const markup = is_markup_template(text, index, state)
			const node = parse_script_backticks(
				text,
				errors,
				index,
				markup
					? undefined
					: ast_nodes,
				nested_bracket(text, index, false, state)
			)
			if (markup) {
				for (const element of parse_markup_template(text, errors, node)) ast_nodes.push(element)
			}
			record_literal(node, state)
			start = node.end
		} else {
			start = scan_punctuator(text, index, state)
		}
	}
	return script
}
/**
 * @param {string} text
 * @param {boolean | undefined} include_text
 * @param {boolean} jsx
 * @returns {{
 *   ast: import("../../public.js").Element[]
 *   errors: import("../../public.js").AstSyntaxError[]
 * }}
 */
export default function(text, include_text, jsx) {
	/** @type {import("../../public.js").AstSyntaxError[]} */
	let errors = []
	/** @type {import("../../public.js").Element[]} */
	let ast_nodes = []
	try {
		const script = scan(text, errors, ast_nodes, jsx, true)
		if (script.top_level_await && !script.module_syntax) {
			errors = []
			ast_nodes = []
			scan(text, errors, ast_nodes, jsx, false)
		}
		if (include_text) set_text(text, ast_nodes)
	} catch (error) {
		if (!(error instanceof RangeError)) throw error
		errors.push(
			create_ast_syntax_error(
				"The input is nested too deeply.",
				ast_nodes[ast_nodes.length - 1]?.end ?? 0,
				text.length
			)
		)
		if (include_text) set_text(text, ast_nodes)
	}
	return { ast: ast_nodes, errors }
}