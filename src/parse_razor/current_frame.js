/**
 * @param {import("../../private.js").RazorFrame[]} frames
 * @returns {import("../../private.js").RazorFrame}
 */
export default function(frames) {
	return /** @type {import("../../private.js").RazorFrame} */(frames[frames.length - 1])/**/
}