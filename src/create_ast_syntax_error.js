const error_prototype = Error.prototype
/**
 * Creates an error in the shape the parsers return in `errors`, for tools that report their own problems next to
 * them: an `Error` with `name: "AstSyntaxError"` and the `start` and `end` offsets of the problem in the parsed text.
 * All four fields are own enumerable properties, so `JSON.stringify`, `structuredClone` and `postMessage` keep them.
 * @param {string} message what is wrong, as a sentence
 * @param {number} start the offset where the problem starts
 * @param {number} end the offset after the problem
 * @returns {import("../public.js").AstSyntaxError}
 * @example
 * const error = createAstSyntaxError("The class attribute is empty.", 3, 11)
 * error instanceof Error // true
 * JSON.stringify(error) // '{"end":11,"message":"The class attribute is empty.","name":"AstSyntaxError","start":3}'
 */
export default function(message, start, end) {
	const error = {
		__proto__: error_prototype,
		end,
		message,
		name: "AstSyntaxError",
		start
	}
	return /** @type {import("../public.js").AstSyntaxError} */(error)/**/
}