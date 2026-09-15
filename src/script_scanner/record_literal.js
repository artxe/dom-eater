/**
 * @param {{ end: number, start: number }} node
 * @param {import("../../private.js").ScanState} state
 * @returns {void}
 */
export default function(node, state) {
	state.openings.set(node.end, node.start)
}