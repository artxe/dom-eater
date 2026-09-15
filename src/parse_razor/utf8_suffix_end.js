/**
 * @param {string} text
 * @param {number} index
 * @returns {number}
 */
export default function(text, index) {
	return (text[index] == "u" || text[index] == "U") && text[index + 1] == "8"
		? index + 2
		: index
}