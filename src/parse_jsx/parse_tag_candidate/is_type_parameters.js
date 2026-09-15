const type_parameters_regex = /<(?:const\s+)?[\p{ID_Start}$_][\p{ID_Continue}$]*\s*(?:,|=|extends\s)/uy
/**
 * @param {string} text
 * @param {number} index
 * @returns {boolean}
 */
export default function(text, index) {
	type_parameters_regex.lastIndex = index
	return type_parameters_regex.test(text)
}