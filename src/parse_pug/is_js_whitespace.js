const whitespace_codes = new Set(
	[
		9,
		10,
		11,
		12,
		13,
		32,
		160,
		5760,
		8232,
		8233,
		8239,
		8287,
		12288,
		65279
	]
)
/**
 * @param {string} char
 * @returns {boolean}
 */
export default function(char) {
	const code = char.charCodeAt(0)
	return whitespace_codes.has(code) || code >= 8192 && code <= 8202
}