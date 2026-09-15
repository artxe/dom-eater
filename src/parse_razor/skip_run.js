/**
 * @param {string} text
 * @param {number} index
 * @param {string} char
 * @returns {number}
 */
export default function(text, index, char) {
	let i = index
	while (text[i] == char) i++
	return i
}