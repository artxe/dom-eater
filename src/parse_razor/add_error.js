import create_ast_syntax_error from "../create_ast_syntax_error.js"
/**
 * @param {import("../../private.js").RazorContext} ctx
 * @param {string} message
 * @param {number} start
 * @param {number} end
 * @returns {void}
 */
export default function(ctx, message, start, end) {
	ctx.errors.push(
		create_ast_syntax_error(message, start, end)
	)
}