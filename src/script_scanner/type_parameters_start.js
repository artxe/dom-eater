/**
 * @param {string} text
 * @param {number} end
 * @returns {number}
 */
export default function(text, end) {
	let depth = 0
	for (let i = end; i >= 0; i--) {
		if (text[i] == ">" && text[i - 1] != "=") depth++
		else if (text[i] == "<" && !--depth) return i
	}
	return -1
}