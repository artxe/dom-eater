/** @type {import("../../private.js").Bracket} */
const script_bracket = {
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
	kind: "block",
	members: false,
	script: undefined,
	start: -1,
	ternaries: 0,
	type_end: -1,
	yield_keyword: false
}
export default script_bracket