import add_error from "./add_error.js"
import parse_markup_in_code from "./parse_markup_in_code/index.js"
/**
 * @param {import("../../private.js").RazorContext} ctx
 * @param {number} index
 * @returns {number}
 */
export default function(ctx, index) {
	if (ctx.in_template) add_error(
		ctx,
		"Inline markup blocks cannot be nested.",
		index,
		index + 1
	)
	ctx.in_template = true
	const end = parse_markup_in_code(ctx, index)
	ctx.in_template = false
	return end
}