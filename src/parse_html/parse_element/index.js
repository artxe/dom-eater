import create_ast_syntax_error from "../../create_ast_syntax_error.js"
import parse_pug_markup from "../../parse_pug/parse_pug_markup.js"
import pug_templates from "../pug_templates.js"
import parse_attribute from "./parse_attribute/index.js"
import parse_script_content from "./parse_script_content.js"
import parse_style_content from "./parse_style_content.js"
import parse_text_content from "./parse_text_content.js"
const end_element_name_regex = /[\s/>]/
const pug_languages = new Set([ "jade", "pug" ])
const stop_element_regex = /[^\s/]/
const template_close_regex = /<\/template[\s/>]/i
const text_content_elements = new Set(
	[
		"iframe",
		"noembed",
		"noframes",
		"textarea",
		"title",
		"xmp"
	]
)
/**
 * @param {string} text
 * @param {import("../../../public.js").Element} node
 * @returns {boolean}
 */
function is_pug_template(text, node) {
	return node.attributes.some(
		attribute => {
			if (attribute.name.toLowerCase() != "lang" || attribute.value === true) return false
			const value = text.slice(
				attribute.value.start,
				attribute.value.end
			)
			return pug_languages.has(
				(attribute.value.subType == "unquoted"
					? value
					: value.slice(1, -1)).toLowerCase()
			)
		}
	)
}
/**
 * @param {string} text
 * @param {import("../../../public.js").AstSyntaxError[]} errors
 * @param {import("../../../public.js").Element} node
 * @param {boolean} foreign
 * @returns {import("../../../public.js").Element}
 */
function parse_content(text, errors, node, foreign) {
	if (node.subType != "open") return node
	const name = node.name.toLowerCase()
	if (name == "plaintext" && !foreign) {
		if (node.end < text.length) node.children.push(
			{
				end: text.length,
				start: node.end,
				type: "Text"
			}
		)
		node.end = text.length
	} else if (name == "script") {
		const text_content = parse_script_content(text, errors, node.end)
		node.children.push(text_content)
		node.end = skip_close_tag(
			text,
			errors,
			text_content.end,
			name,
			foreign
		)
	} else if (name == "style") {
		const text_content = parse_style_content(text, errors, node.end)
		node.children.push(text_content)
		node.end = skip_close_tag(
			text,
			errors,
			text_content.end,
			name,
			foreign
		)
	} else if (name == "template" && !foreign && is_pug_template(text, node)) {
		const close = text.slice(node.end).search(template_close_regex)
		const end = close < 0
			? text.length
			: node.end + close
		const content = parse_pug_markup(
			text.slice(node.end, end),
			undefined,
			node.end,
			true
		)
		for (const error of content.errors) errors.push(error)
		if (close < 0) {
			errors.push(
				create_ast_syntax_error(
					`The "${node.name}" element is not closed.`,
					node.end,
					text.length
				)
			)
		}
		node.children = content.ast
		node.end = skip_close_tag(text, errors, end, name, foreign)
		pug_templates.add(node)
	} else if (text_content_elements.has(name) && !foreign) {
		const text_content = parse_text_content(text, errors, node.end, name)
		node.children = text_content.children
		node.end = skip_close_tag(
			text,
			errors,
			text_content.end,
			name,
			foreign
		)
	}
	return node
}
/**
 * @param {string} text
 * @param {import("../../../public.js").AstSyntaxError[]} errors
 * @param {number} index
 * @param {string} name
 * @param {boolean} foreign
 * @returns {number}
 */
function skip_close_tag(text, errors, index, name, foreign) {
	const end_regex = new RegExp(`<\\/${name}(?=[\\s/>])`, "iy")
	end_regex.lastIndex = index
	return end_regex.test(text)
		? parse_element(text, errors, index, foreign).end
		: text.length
}
/**
 * @param {string} text
 * @param {import("../../../public.js").AstSyntaxError[]} errors
 * @param {number} start
 * @param {boolean} foreign
 * @returns {import("../../../public.js").Element}
 */
function parse_element(text, errors, start, foreign) {
	const name_start = text[start + 1] == "/"
		? start + 2
		: start + 1
	const name_index = text.slice(name_start).search(end_element_name_regex)
	if (name_index >= 0) {
		let child_pre_index = name_start + name_index
		const name = text.slice(name_start, child_pre_index)
		if (text[child_pre_index] == ">") {
			return parse_content(
				text,
				errors,
				{
					attributes: [],
					children: [],
					end: child_pre_index + 1,
					name,
					start,
					subType: text[start + 1] == "/"
						? "close"
						: "open",
					type: "Element"
				},
				foreign
			)
		}
		/** @type {import("../../../public.js").Attribute[]} */
		const attributes = []
		for (;;) {
			const child_index = text.slice(child_pre_index).search(stop_element_regex)
			if (child_index >= 0) {
				const index = child_pre_index + child_index
				if (text[index] == ">") {
					return parse_content(
						text,
						errors,
						{
							attributes,
							children: [],
							end: index + 1,
							name,
							start,
							subType: text[start + 1] == "/"
								? "close"
								: text[index - 1] == "/" && attributes[attributes.length - 1]?.end != index
									? "closed"
									: "open",
							type: "Element"
						},
						foreign
					)
				}
				const node = parse_attribute(text, errors, index)
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
		name: text.slice(name_start),
		start: start,
		subType: "open",
		type: "Element"
	}
}
export default parse_element