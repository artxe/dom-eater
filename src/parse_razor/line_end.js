import is_newline from "./is_newline.js"
/**
 * @param {string} text
 * @param {number} index
 * @returns {number}
 */
export default function(text, index) {
	let i = index
	while (i < text.length && !is_newline(text[i] ?? "")) i++
	return i
}