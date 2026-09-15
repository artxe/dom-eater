import create_ast_syntax_error from "../../create_ast_syntax_error.js"
import skip_type_arguments from "../../script_scanner/skip_type_arguments.js"
import parse_script_block from "../parse_script_block.js"
import parse_attribute from "./parse_attribute/index.js"
const block_content_regex = /^\s*\{[\s\S]*\}\s*$/
const close_tag_regex = /<\/(?:\s*(?:\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\/|\/\/[^\n\r]*[\n\r]))*\s*([^\s/>]*)(?:\s*(?:\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\/|\/\/[^\n\r]*[\n\r]))*\s*>/y
const end_element_name_regex = /[\s<>]|\/[*/]/
const raw_text_close_regex = /<\/\s*(script|style)\s*>/g
const slash_regex = /^\/|\/$/
const stop_element_content_regex = /[{<]/
const stop_element_regex = /\S/
const type_arguments_regex = /\s*</y
/**
 * @param {string} text
 * @param {import("../../../public.js").AstSyntaxError[]} errors
 * @param {number} start
 * @param {import("../../../private.js").Bracket} [bracket]
 * @returns {import("../../../public.js").Element}
 */
function parse_element(text, errors, start, bracket) {
	const err = errors.length
	const node = parse_open_tag(text, errors, start, bracket)
	if (errors.length > err || node.subType == "closed") return node
	if ((node.name == "script" || node.name == "style") && parse_raw_text(text, errors, node)) return node
	let child_pre_index = node.end
	for (;;) {
		const child_index = text.slice(child_pre_index).search(stop_element_content_regex)
		if (child_index >= 0) {
			const index = child_pre_index + child_index
			if (child_index) {
				node.children.push(
					{
						end: index,
						start: child_pre_index,
						type: "Text"
					}
				)
			}
			if (text.startsWith("<!--", index)) {
				const close = text.indexOf("-->", index + 4)
				if (close < 0) errors.push(
					create_ast_syntax_error(
						"The comment is not closed with \"-->\".",
						index,
						text.length
					)
				)
				child_pre_index = close < 0
					? text.length
					: close + 3
				node.children.push(
					{
						end: child_pre_index,
						start: index,
						type: "Comment"
					}
				)
			} else if (text[index] == "<") {
				if (text[index + 1] == "/") {
					close_tag_regex.lastIndex = index
					const match = close_tag_regex.exec(text)
					if (match?.[1] == node.name) {
						node.end = close_tag_regex.lastIndex
					} else {
						errors.push(
							create_ast_syntax_error(
								`The close tag does not match the "${node.name}" element.`,
								start,
								text.length
							)
						)
						node.end = text.length
					}
					return node
				} else {
					const child = parse_element(text, errors, index, bracket)
					node.children.push(child)
					child_pre_index = child.end
				}
			} else {
				const child = parse_script_block(text, errors, index, bracket)
				node.children.push(child)
				child_pre_index = child.end
			}
		} else {
			if (child_pre_index < text.length) {
				node.children.push(
					{
						end: text.length,
						start: child_pre_index,
						type: "Text"
					}
				)
			}
			errors.push(
				create_ast_syntax_error(
					`The "${node.name}" element is not closed.`,
					start,
					text.length
				)
			)
			node.end = text.length
			return node
		}
	}
}
/**
 * @param {string} text
 * @param {import("../../../public.js").AstSyntaxError[]} errors
 * @param {number} start
 * @param {import("../../../private.js").Bracket} [bracket]
 * @returns {import("../../../public.js").Element}
 */
function parse_open_tag(text, errors, start, bracket) {
	const name_index = text.slice(start + 1).search(end_element_name_regex) + 1
	if (name_index > 0) {
		let child_pre_index = start + name_index
		const name = text.slice(start + 1, child_pre_index).replace(slash_regex, "")
		type_arguments_regex.lastIndex = child_pre_index
		if (type_arguments_regex.test(text)) child_pre_index = skip_type_arguments(
			text,
			type_arguments_regex.lastIndex - 1
		)
		if (text[child_pre_index] == ">") {
			/** @type {import("../../../public.js").Element} */
			const node = {
				attributes: [],
				children: [],
				end: child_pre_index + 1,
				name,
				start,
				subType: text[child_pre_index - 1] == "/"
					? "closed"
					: "open",
				type: "Element"
			}
			return node
		}
		/** @type {import("../../../public.js").Attribute[]} */
		const attributes = []
		let closing = text[child_pre_index - 1] == "/"
		for (;;) {
			const child_index = text.slice(child_pre_index).search(stop_element_regex)
			if (child_index >= 0) {
				const index = child_pre_index + child_index
				if (text[index] == ">") {
					/** @type {import("../../../public.js").Element} */
					const node = {
						attributes,
						children: [],
						end: index + 1,
						name,
						start,
						subType: closing
							? "closed"
							: "open",
						type: "Element"
					}
					return node
				}
				if (text[index] == "/" && text[index + 1] != "*" && text[index + 1] != "/") {
					closing = true
					child_pre_index = index + 1
					continue
				}
				if (text[index] == "/") {
					const close = text[index + 1] == "*"
						? text.indexOf("*/", index + 2) + 2
						: text.indexOf("\n", index) + 1
					child_pre_index = close > 1
						? close
						: text.length
					continue
				}
				closing = false
				const node = parse_attribute(text, errors, index, bracket)
				attributes.push(node)
				child_pre_index = node.end
			} else {
				errors.push(
					create_ast_syntax_error(
						"The start tag is not closed.",
						start,
						text.length
					)
				)
				return {
					attributes,
					children: [],
					end: text.length,
					name,
					start,
					subType: "open",
					type: "Element"
				}
			}
		}
	}
	errors.push(
		create_ast_syntax_error(
			"The start tag is not closed.",
			start,
			text.length
		)
	)
	return {
		attributes: [],
		children: [],
		end: text.length,
		name: text.slice(start + 1).replace(slash_regex, ""),
		start: start,
		subType: "open",
		type: "Element"
	}
}
/**
 * @param {string} text
 * @param {import("../../../public.js").AstSyntaxError[]} errors
 * @param {import("../../../public.js").Element} element
 * @returns {boolean}
 */
function parse_raw_text(text, errors, element) {
	raw_text_close_regex.lastIndex = element.end
	let match = raw_text_close_regex.exec(text)
	while (match && match[1] != element.name) match = raw_text_close_regex.exec(text)
	const content_end = match
		? match.index
		: text.length
	if (block_content_regex.test(
		text.slice(element.end, content_end)
	)) return false
	if (content_end > element.end) {
		element.children.push(
			{
				end: content_end,
				start: element.end,
				type: element.name == "style"
					? "Style"
					: "Text"
			}
		)
	}
	if (match) {
		element.end = raw_text_close_regex.lastIndex
	} else {
		errors.push(
			create_ast_syntax_error(
				`The "${element.name}" element is not closed.`,
				element.start,
				text.length
			)
		)
		element.end = text.length
	}
	return true
}
export default parse_element