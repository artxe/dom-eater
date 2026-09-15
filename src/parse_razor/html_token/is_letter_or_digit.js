const letter_or_digit_regex = /[\p{L}\p{Nd}]/u
/**
 * @param {string} char
 * @returns {boolean}
 */
export default function(char) {
	return letter_or_digit_regex.test(char)
}