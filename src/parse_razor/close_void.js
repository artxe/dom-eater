import current_frame from "./current_frame.js"
/**
 * @param {import("../../private.js").RazorFrame[]} frames
 * @returns {void}
 */
export default function(frames) {
	const frame = /** @type {import("../../private.js").RazorFrame} */(frames.pop())/**/
	for (const child of frame.children) {
		current_frame(frames).children.push(child)
	}
}