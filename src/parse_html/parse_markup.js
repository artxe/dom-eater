import create_ast_syntax_error from "../create_ast_syntax_error.js"
import normalize_nodes from "./normalize_nodes.js"
import parse_comment from "./parse_comment.js"
import parse_element from "./parse_element/index.js"
import parse_script_block from "./parse_script_block.js"
import skip_parentheses from "./skip_parentheses.js"
import unclosed_blocks from "./unclosed_blocks.js"
const angular_block_regex = /@(?:case|default|defer|else(?:\s+if)?|empty|error|for|if|loading|placeholder|switch)\b\s*/y
const doctype_regex = /<!doctype[\s>]/iy
const html_encoding_regex = /^(["']?)(?:application\/xhtml\+xml|text\/html)\1$/i
const icu_regex = /\{\s*[^\s{},][^{},]*,\s*(?:plural|select|selectordinal)\s*,/y
const let_declaration_regex = /@let\s+[\p{ID_Start}$_][\p{ID_Continue}$]*\s*=(?!=)/uy
const mathml_text_integration_points = new Set(
	[ "mi", "mn", "mo", "ms", "mtext" ]
)
const stop_text_regex = /[{@]|<[!%?A-Za-z]|<\/[A-Za-z]/
const svelte_block_regex = /\{#(?:await|each|if|key|snippet)\b/y
const svg_html_integration_points = new Set(
	[ "desc", "foreignobject", "title" ]
)
const tag_start_regex = /[!/?A-Za-z]/
const template_raw_end_regex = /\{%-?\s*end(comment|raw|verbatim)\b[^%]*%\}/g
const template_raw_regex = /\{%-?\s*(comment|raw|verbatim)\b[^%]*%\}/y
const whitespace_regex = /\s/
/**
 * @param {string} text
 * @param {number} index
 * @param {Set<number>} brace_starts
 * @returns {boolean}
 */
function add_icu_brace_starts(text, index, brace_starts) {
	icu_regex.lastIndex = index
	if (!icu_regex.test(text)) return false
	const case_depths = [ 1 ]
	let depth = 1
	for (let i = icu_regex.lastIndex; depth && i < text.length; i++) {
		const char = text[i]
		const case_depth = case_depths[case_depths.length - 1] ?? 0
		if (depth > case_depth && char == "{" && text[i + 1] == "{") {
			i = interpolation_end(text, i) - 1
		} else if (depth > case_depth && char == "<" && tag_start_regex.test(text[i + 1] ?? "")) {
			i = tag_end(text, i)
		} else if (char == "{") {
			depth++
			if (depth == case_depth + 1) {
				brace_starts.add(i)
			} else {
				icu_regex.lastIndex = i
				if (icu_regex.test(text)) {
					brace_starts.add(i)
					case_depths.push(depth)
				}
			}
		} else if (char == "}") {
			depth--
			if (depth < case_depth) case_depths.pop()
		}
	}
	return true
}
/**
 * @param {string} text
 * @param {number} index
 * @returns {number}
 */
function interpolation_end(text, index) {
	let comment = false
	/** @type {string | undefined} */
	let quote
	for (let i = index + 2; i < text.length; i++) {
		const char = text[i]
		if (!quote && text.startsWith("}}", i)) return i + 2
		if (!quote && text.startsWith("//", i)) comment = true
		if (char == "\\") i++
		else if (char == quote) quote = undefined
		else if (!comment && !quote && (char == "\"" || char == "'" || char == "`")) quote = char
	}
	return text.length
}
/**
 * @param {string} text
 * @param {import("../../public.js").Element} element
 * @returns {boolean}
 */
function is_html_encoding(text, element) {
	return element.attributes.some(
		attribute => attribute.name.toLowerCase() == "encoding"
			&& attribute.value !== true
			&& html_encoding_regex.test(
				text.slice(
					attribute.value.start,
					attribute.value.end
				)
			)
	)
}
/**
 * @param {string} text
 * @param {number} index
 * @returns {number}
 */
function let_declaration_end(text, index) {
	let depth = 0
	/** @type {string | undefined} */
	let quote
	for (let i = index; i < text.length; i++) {
		const char = text[i]
		if (quote) {
			if (char == "\\") i++
			else if (char == quote) quote = undefined
		} else if (char == "\"" || char == "'" || char == "`") {
			quote = char
		} else if (char == "(" || char == "[" || char == "{") {
			depth++
		} else if (char == ")" || char == "]" || char == "}") {
			depth--
		} else if (char == ";" && depth <= 0) {
			return i + 1
		}
	}
	return -1
}
/**
 * @param {string} text
 * @param {import("../../public.js").AstSyntaxError[]} errors
 * @param {number} index
 * @param {boolean} foreign
 * @returns {import("../../private.js").MarkupNode}
 */
function parse_markup_node(text, errors, index, foreign) {
	if (text[index] == "{") return parse_script_block(text, errors, index)
	doctype_regex.lastIndex = index
	return (text[index + 1] == "!" || text[index + 1] == "%" || text[index + 1] == "?") && !doctype_regex.test(text)
		? parse_comment(text, errors, index, foreign)
		: parse_element(text, errors, index, foreign)
}
/**
 * @param {string} text
 * @param {number} start
 * @param {number} last_parenthesis
 * @param {number} last_semicolon
 * @returns {number}
 */
function skip_angular_syntax(
	text,
	start,
	last_parenthesis,
	last_semicolon
) {
	let_declaration_regex.lastIndex = start
	if (let_declaration_regex.test(text)) {
		return let_declaration_regex.lastIndex > last_semicolon
			? -1
			: let_declaration_end(
				text,
				let_declaration_regex.lastIndex
			)
	}
	angular_block_regex.lastIndex = start
	if (!angular_block_regex.test(text)) return -1
	let index = angular_block_regex.lastIndex
	if (text[index] == "(") {
		index = index > last_parenthesis
			? -1
			: skip_parentheses(text, index)
		if (index < 0) return -1
		while (whitespace_regex.test(text[index] ?? "")) index++
	}
	return text[index] == "{"
		? index + 1
		: -1
}
/**
 * @param {string} text
 * @param {number} start
 * @returns {number}
 */
function tag_end(text, start) {
	/** @type {string | undefined} */
	let quote
	for (let i = start + 1; i < text.length; i++) {
		const char = text[i]
		if (quote) {
			if (char == quote) quote = undefined
		} else if (char == "\"" || char == "'") {
			quote = char
		} else if (char == ">") {
			return i
		}
	}
	return text.length
}
/**
 * @param {string} text
 * @param {number} index
 * @returns {number}
 */
function template_text_end(text, index) {
	if (text.startsWith("{{!--", index)) {
		const close = text.indexOf("--}}", index + 5)
		return close < 0
			? text.length
			: close + 4
	}
	if (text.startsWith("{{!", index) && whitespace_regex.test(text[index + 3] ?? "")) {
		const close = text.indexOf("}}", index + 3)
		return close < 0
			? text.length
			: close + 2
	}
	svelte_block_regex.lastIndex = index
	if (text.startsWith("{#", index) && !svelte_block_regex.test(text)) {
		const close = text.indexOf("#}", index + 2)
		return close < 0
			? -1
			: close + 2
	}
	template_raw_regex.lastIndex = index
	const raw = template_raw_regex.exec(text)
	if (!raw) return -1
	template_raw_end_regex.lastIndex = template_raw_regex.lastIndex
	for (let end = template_raw_end_regex.exec(text); end; end = template_raw_end_regex.exec(text)) {
		if (end[1] == raw[1]) return template_raw_end_regex.lastIndex
	}
	return text.length
}
/**
 * @param {string} text
 * @param {import("../../public.js").AstNode} node
 * @param {import("../../private.js").NamespaceElement[]} namespaces
 * @returns {void}
 */
function track_namespace(text, node, namespaces) {
	if (node.type != "Element") return
	const name = node.name.toLowerCase()
	if (node.subType == "close") {
		let index = namespaces.length - 1
		while (index >= 0 && namespaces[index]?.name != name) index--
		if (index >= 0) namespaces.length = index
		return
	}
	if (node.subType != "open") return
	const namespace = namespaces[namespaces.length - 1]?.namespace ?? "html"
	if (name == "math" || name == "svg") {
		namespaces.push({ name, namespace: name })
	} else if (
		namespace == "math" && mathml_text_integration_points.has(name)
		|| namespace == "math" && name == "annotation-xml" && is_html_encoding(text, node)
		|| namespace == "svg" && svg_html_integration_points.has(name)
	) {
		namespaces.push({ name, namespace: "html" })
	}
}
/**
 * @param {string} text
 * @param {import("../../public.js").AstSyntaxError[]} errors
 * @param {Set<number>} [substitution_starts]
 * @returns {import("../../private.js").MarkupNode[]}
 */
export default function(text, errors, substitution_starts) {
	/** @type {import("../../private.js").MarkupNode[]} */
	const ast_nodes = []
	/** @type {Set<import("../../public.js").AstNode>} */
	const foreign_nodes = new Set()
	/** @type {Set<number>} */
	const icu_brace_starts = new Set()
	/** @type {import("../../private.js").NamespaceElement[]} */
	const namespaces = []
	let text_start = 0
	let search_start = 0
	const last_parenthesis = text.lastIndexOf(")")
	const last_semicolon = text.lastIndexOf(";")
	const template_close = text.lastIndexOf("%>")
	for (;;) {
		const child_index = text.slice(search_start).search(stop_text_regex)
		const index = child_index < 0
			? text.length
			: search_start + child_index
		if (text[index] == "@") {
			const end = skip_angular_syntax(
				text,
				index,
				last_parenthesis,
				last_semicolon
			)
			search_start = end < 0
				? index + 1
				: end
			continue
		}
		if (text[index] == "<" && text[index + 1] == "%" && template_close < index + 2) {
			search_start = index + 1
			continue
		}
		if (text[index] == "{") {
			const end = template_text_end(text, index)
			if (end >= 0) {
				search_start = end
				continue
			}
		}
		if (text[index] == "{" && (icu_brace_starts.has(index) || add_icu_brace_starts(text, index, icu_brace_starts))) {
			search_start = index + 1
			continue
		}
		const error_count = errors.length
		const foreign = (namespaces[namespaces.length - 1]?.namespace ?? "html") != "html"
		/** @type {import("../../private.js").MarkupNode | undefined} */
		let node
		try {
			if (child_index >= 0) node = parse_markup_node(text, errors, index, foreign)
		} catch (error) {
			if (!(error instanceof RangeError)) throw error
			errors.length = error_count
			errors.push(
				create_ast_syntax_error(
					"The input is nested too deeply.",
					index,
					text.length
				)
			)
			ast_nodes.push(
				{
					end: text.length,
					start: text_start,
					type: "Text"
				}
			)
			break
		}
		if (node?.type == "Script" && unclosed_blocks.has(node) && !substitution_starts?.has(index)) {
			errors.length = error_count
			errors.push(
				create_ast_syntax_error(
					"The {…} block is not closed.",
					index,
					index + 1
				)
			)
			search_start = index + 1
			continue
		}
		if (index > text_start) {
			ast_nodes.push(
				{
					end: index,
					start: text_start,
					type: "Text"
				}
			)
		}
		if (!node) break
		if (foreign) foreign_nodes.add(node)
		track_namespace(text, node, namespaces)
		ast_nodes.push(node)
		text_start = search_start = node.end
	}
	return normalize_nodes(ast_nodes, errors, foreign_nodes)
}