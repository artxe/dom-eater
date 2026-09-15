/**
 * @param {string} char
 * @returns {boolean}
 */
export default function(char) {
	const code = char.charCodeAt(0)
	return code < 128
		? code == 32 || code == 9 || code == 11 || code == 12 || code == 26
		: code == 0xa0
			|| code == 0x1680
			|| code >= 0x2000 && code <= 0x200a
			|| code == 0x202f
			|| code == 0x205f
			|| code == 0x3000
			|| code == 0xfeff
}