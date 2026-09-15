/**
 * @param {import("../../private.js").RazorToken | undefined} token
 * @returns {boolean}
 */
export default function(token) {
	return token?.kind == "identifier" || token?.kind == "keyword"
}