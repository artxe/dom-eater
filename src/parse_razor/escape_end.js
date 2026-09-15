import is_decimal_char from "./is_decimal_char.js"
/**
 * @param {string} char
 * @returns {boolean}
 */
function is_hex_char(char) {
	return is_decimal_char(char) || char >= "A" && char <= "F" || char >= "a" && char <= "f"
}
/**
 * @param {string} text
 * @param {number} index
 * @returns {number}
 */
export default function(text, index) {
	const char = text[index + 1]
	if (char === undefined) return index + 1
	if (char == "x" || char == "u" || char == "U") {
		let i = index + 2
		const max = char == "U"
			? 8
			: 4
		while (i < index + 2 + max && is_hex_char(text[i] ?? "")) i++
		return i
	}
	return index + 2
}