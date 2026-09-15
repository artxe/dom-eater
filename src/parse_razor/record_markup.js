/**
 * @param {import("../../private.js").RazorContext} ctx
 * @param {number} index
 * @param {import("../../private.js").RazorMarkup} markup
 * @returns {void}
 */
export default function(ctx, index, markup) {
	const script = ctx.script
	if (!script) return
	for (const node of markup.nodes) {
		if (node.type == "Element") {
			script.elements.push(node)
		} else if (node.type == "Script" && "elements" in node) {
			for (const element of node.elements) script.elements.push(element)
			for (const string of node.strings) script.strings.push(string)
		}
	}
	let nodes_end = index
	for (const node of markup.nodes) {
		if (node.type != "Comment") nodes_end = Math.max(nodes_end, node.end)
	}
	script.markup.push(
		[ index, markup.end, nodes_end ]
	)
}