import is_whitespace from "./is_whitespace.js"
/**
 * @param {string} text
 * @param {number} index
 * @returns {number}
 */
export default function(text, index) {
	let i = index
	while (i < text.length && is_whitespace(text[i] ?? "")) i++
	return i
}