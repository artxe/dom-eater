/**
 * @param {string} char
 * @returns {boolean}
 */
export default function(char) {
	const code = char.charCodeAt(0)
	return code == 10 || code == 13 || code == 0x85 || code == 0x2028 || code == 0x2029
}