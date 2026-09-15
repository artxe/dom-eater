const punctuators = ".();,{}[]:?~%&*+-/<>^|!="
/**
 * @param {string} char
 * @returns {boolean}
 */
export default function(char) {
	return char == "" || punctuators.includes(char)
}