/**
 * @param {string} text
 * @param {number} index
 * @returns {number}
 */
export default function(text, index) {
	for (let i = index + 1; i < text.length; i++) {
		if (text[i] == "\\") i++
		else if (text[i] == text[index]) return i + 1
	}
	return text.length
}