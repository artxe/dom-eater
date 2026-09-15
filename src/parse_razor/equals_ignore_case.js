/**/
/**/
/**
 * @param {string} left
 * @param {string} right
 * @returns {boolean}
 */
export default function(left, right) {
	return left.length == right.length && left.toUpperCase() == right.toUpperCase()
}