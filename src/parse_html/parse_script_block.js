import create_ast_syntax_error from "../create_ast_syntax_error.js"
import close_bracket from "../script_scanner/close_bracket.js"
import create_scan_state from "../script_scanner/create_scan_state.js"
import nested_bracket from "../script_scanner/nested_bracket.js"
import open_block from "../script_scanner/open_block.js"
import parse_script_quotes from "../script_scanner/parse_script_quotes.js"
import record_literal from "../script_scanner/record_literal.js"
import scan_punctuator from "../script_scanner/scan_punctuator.js"
import script_stop_pattern from "../script_scanner/script_stop_pattern.js"
import skip_slash from "../script_scanner/skip_slash.js"
import parse_script_backticks from "./parse_script_backticks/index.js"
import unclosed_blocks from "./unclosed_blocks.js"
const stop_script_block_regex = new RegExp(script_stop_pattern, "u")
const svelte_tag_names = [
	"#await",
	"#each",
	"#if",
	"#key",
	"#snippet",
	"/await",
	"/each",
	"/if",
	"/key",
	"/snippet",
	":catch",
	":else(?:\\s+if)?",
	":then",
	"@attach",
	"@const",
	"@debug",
	"@html",
	"@render"
]
const svelte_tag_regex = new RegExp(
	`(?:${svelte_tag_names.join("|")})\\b|/[\\p{ID_Start}$_][\\p{ID_Continue}$.-]*(?=\\s*\\})`,
	"uy"
)
/** @type {{ errors: import("../../public.js").AstSyntaxError[], starts: Set<number>, text: string }} */
const unclosed_starts = {
	errors: [],
	starts: new Set(),
	text: ""
}
/**
 * @param {string} text
 * @param {import("../../public.js").AstSyntaxError[]} errors
 * @param {number} start
 * @param {import("../../private.js").Bracket} [bracket]
 * @returns {import("../../public.js").Script & { subType: "block" }}
 */
function parse_script_block(text, errors, start, bracket) {
	if (unclosed_starts.errors !== errors || unclosed_starts.text !== text) {
		unclosed_starts.errors = errors
		unclosed_starts.starts.clear()
		unclosed_starts.text = text
	}
	if (unclosed_starts.starts.has(start)) return unclosed_block(text, errors, start, [])
	let child_pre_index = start + 1
	const state = create_scan_state(bracket)
	svelte_tag_regex.lastIndex = child_pre_index
	if (svelte_tag_regex.test(text)) {
		state.comments.set(
			svelte_tag_regex.lastIndex,
			child_pre_index
		)
		child_pre_index = svelte_tag_regex.lastIndex
	}
	/** @type {import("../../public.js").String[]} */
	const strings = []
	for (;;) {
		const child_index = text.slice(child_pre_index).search(stop_script_block_regex)
		if (child_index < 0) break
		const index = child_pre_index + child_index
		if (text[index] == "}") {
			return {
				end: index + 1,
				start,
				strings,
				subType: "block",
				type: "Script"
			}
		} else if (text[index] == "{") {
			const node = parse_script_block(
				text,
				errors,
				index,
				open_block(text, index, state)
			)
			for (const str of node.strings) {
				strings.push(str)
			}
			close_bracket(node.end - 1, state)
			child_pre_index = node.end
		} else if (text[index] == "/") {
			child_pre_index = skip_slash(text, errors, index, state)
		} else if (text[index] == "'" || text[index] == "\"") {
			const node = parse_script_quotes(text, errors, index)
			strings.push(node)
			record_literal(node, state)
			child_pre_index = node.end
		} else if (text[index] == "`") {
			const node = parse_script_backticks(
				text,
				errors,
				index,
				nested_bracket(text, index, false, state)
			)
			strings.push(node)
			record_literal(node, state)
			child_pre_index = node.end
		} else {
			child_pre_index = scan_punctuator(text, index, state)
		}
	}
	unclosed_starts.starts.add(start)
	return unclosed_block(text, errors, start, strings)
}
/**
 * @param {string} text
 * @param {import("../../public.js").AstSyntaxError[]} errors
 * @param {number} start
 * @param {import("../../public.js").String[]} strings
 * @returns {import("../../public.js").Script & { subType: "block" }}
 */
function unclosed_block(text, errors, start, strings) {
	errors.push(
		create_ast_syntax_error(
			"The {…} block is not closed.",
			start,
			text.length
		)
	)
	/** @type {import("../../public.js").Script & { subType: "block" }} */
	const node = {
		end: text.length,
		start,
		strings,
		subType: "block",
		type: "Script"
	}
	unclosed_blocks.add(node)
	return node
}
export default parse_script_block