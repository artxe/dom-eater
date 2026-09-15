/**
 * @param {string} text
 * @param {import("../public.js").AstNode[]} nodes
 * @returns {void}
 */
export default function(text, nodes) {
	const pending = [ ...nodes ]
	for (let node = pending.pop(); node; node = pending.pop()) {
		node.text = text.slice(node.start, node.end)
		if (node.type == "Attribute") {
			if (node.value !== true) pending.push(node.value)
		} else if (node.type == "Element") {
			for (const attr of node.attributes) pending.push(attr)
			for (const child of node.children) pending.push(child)
		} else if (node.type == "Script") {
			for (const string of node.strings) pending.push(string)
			if ("elements" in node) {
				for (const element of node.elements) pending.push(element)
			}
		} else if (node.type == "String") {
			for (const script of node.scripts) pending.push(script)
		}
	}
}