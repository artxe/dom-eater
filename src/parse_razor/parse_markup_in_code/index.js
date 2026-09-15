import record_markup from "../record_markup.js"
import parse_markup_block from "./parse_markup_block.js"
/**
 * @param {import("../../../private.js").RazorContext} ctx
 * @param {number} index
 * @returns {import("../../../private.js").RazorMarkup["end"]}
 */
export default function(ctx, index) {
	const markup = parse_markup_block(ctx, index)
	record_markup(ctx, index, markup)
	return markup.end
}