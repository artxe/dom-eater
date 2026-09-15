import current_frame from "./current_frame.js"
/**
 * @param {import("../../private.js").RazorContext} ctx
 * @param {import("../../private.js").RazorFrame[]} frames
 * @param {number} body_end
 * @returns {void}
 */
export default function(ctx, frames, body_end) {
	const frame = /** @type {import("../../private.js").RazorFrame} */(frames.pop())/**/
	const element = /** @type {import("../../public.js").Element} */(frame.element)/**/
	const { children } = frame
	let kept = children.length
	while (kept > 0 && /** @type {import("../../public.js").AstNode} */(children[kept - 1])/**/.end > body_end) kept--
	element.children = children.slice(0, kept)
	ctx.bodies.set(
		element,
		[ element.end, body_end ]
	)
	element.end = body_end
	const siblings = current_frame(frames).children
	for (let i = kept; i < children.length; i++) {
		siblings.push(
			/** @type {import("../../private.js").MarkupNode} */(children[i])/**/
		)
	}
}