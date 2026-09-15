import create_ast_syntax_error from "../../../create_ast_syntax_error.js"
import parse_script_block from "../../parse_script_block.js"
import parse_attribute_quotes from "./parse_attribute_quotes.js"
import parse_attribute_unquoted from "./parse_attribute_unquoted.js"
const stop_attribute_name_regex = /[\s=>]|\/>/
const stop_space_regex = /\S/
/**
 * @param {string} text
 * @param {import("../../../../public.js").AstSyntaxError[]} errors
 * @param {number} start
 * @returns {import("../../../../public.js").Attribute}
 */
export default function(text, errors, start) {
	if (text[start] == "{") {
		const node = parse_script_block(text, errors, start)
		return {
			end: node.end,
			name: "",
			start,
			type: "Attribute",
			value: node
		}
	}
	const name_index = text.slice(start + 1).search(stop_attribute_name_regex) + 1
	if (name_index > 0) {
		const name = text.slice(start, start + name_index)
		/** @type {import("../../../../public.js").Attribute} */
		const node = {
			end: start + name_index,
			name,
			start,
			type: "Attribute",
			value: true
		}
		const equals_sign_index = text.slice(start + name_index).search(stop_space_regex)
		if (equals_sign_index < 0 || text[start + name_index + equals_sign_index] != "=") return node
		const value_index = text.slice(
			start + name_index + equals_sign_index + 1
		).search(stop_space_regex) + 1
		if (value_index > 0) {
			const index = start + name_index + equals_sign_index + value_index
			if (text[index] == "'" || text[index] == "\"") {
				const value = parse_attribute_quotes(text, errors, index)
				node.value = value
				node.end = value.end
			} else if (text[index] == "{") {
				const value = parse_script_block(text, errors, index)
				node.value = value
				node.end = value.end
			} else if (text[index] != ">") {
				const value = parse_attribute_unquoted(text, errors, index)
				node.value = value
				node.end = value.end
			} else {
				errors.push(
					create_ast_syntax_error(
						`The "${name}" attribute has no value after "=".`,
						start,
						index
					)
				)
				node.end = index
			}
		} else {
			errors.push(
				create_ast_syntax_error(
					`The "${name}" attribute has no value after "=".`,
					start,
					text.length
				)
			)
			node.end = text.length
		}
		return node
	}
	errors.push(
		create_ast_syntax_error(
			"The attribute name is not finished.",
			start,
			text.length
		)
	)
	return {
		end: text.length,
		name: text.slice(start),
		start: start,
		type: "Attribute",
		value: true
	}
}