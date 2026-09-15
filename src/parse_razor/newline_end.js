/**
 * @param {string} text
 * @param {number} index
 * @returns {number}
 */
export default function(text, index) {
	return text[index] == "\r" && text[index + 1] == "\n"
		? index + 2
		: index + 1
}