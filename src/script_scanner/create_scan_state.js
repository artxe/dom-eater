/** @type {import("../../private.js").Bracket} */
const expression_bracket = {
	arrow: -1,
	arrow_async: false,
	arrow_inside: -1,
	await_keyword: true,
	body: "",
	body_declaration: false,
	body_keywords: "",
	body_start: -1,
	expression_after: true,
	for_head: false,
	kind: "(",
	members: false,
	script: undefined,
	start: -1,
	ternaries: 0,
	type_end: -1,
	yield_keyword: false
}
/**
 * @param {import("../../private.js").Bracket} [bracket]
 * @returns {import("../../private.js").ScanState}
 */
export default function(bracket = expression_bracket) {
	return {
		arrows: new Map(),
		brackets: [
			{
				...bracket,
				arrow: -1,
				body: "",
				for_head: false,
				ternaries: 0,
				type_end: -1
			}
		],
		colons: new Map(),
		comments: new Map(),
		declaration_lists: new Map(),
		expression_after: new Map(),
		openings: new Map()
	}
}