import {
	type AstNode,
	type AstSyntaxError,
	type Attribute,
	type Comment,
	type Element,
	type Script,
	type String as StringNode,
	createAstSyntaxError,
	parseHtml,
	parseJsx,
	parsePug,
	parseRazor,
	parseRazorComponent,
	parseScript
} from "dom-eater"
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
	? true
	: false
declare const include_text: boolean
declare const node: AstNode
declare const child: Element["children"][number]
declare const string_node: StringNode
for (const parse of [
	parseHtml,
	parseJsx,
	parsePug,
	parseRazor,
	parseRazorComponent,
	parseScript
]) {
	parse("")
	parse("", true)
	parse("", false)
	parse("", include_text)
	/** @ts-expect-error */
	parse("", "true")
	/** @ts-expect-error */
	parse(0)
}
if (child.type == "Script" && child.subType == "template") child.elements.map(element => element.name)
if (node.type == "Script" && node.subType == "template") {
	/** @ts-expect-error */
	node.elements.map(element => element.name)
	if ("elements" in node) node.elements.map(element => element.name)
}
if (string_node.subType == "backtick") {
	for (const script of string_node.scripts) {
		/** @ts-expect-error */
		script.elements.map(element => element.name)
	}
} else {
	for (const script of string_node.scripts) if (script.subType == "template") script.elements.map(element => element.name)
}
export const attribute_script: Equal<
	Extract<Attribute["value"], { type: "Script" }>["subType"],
	"block" | "jsx" | "pug" | "razor"
> = true
export const attribute_string: Equal<
	Extract<Attribute["value"], { type: "String" }>["subType"],
	"double" | "single" | "unquoted"
> = true
export const children: Equal<Element["children"][number]["type"], "Comment" | "Element" | "Script" | "Style" | "Text"> = true
export const comment: Equal<Extract<AstNode, { type: "Comment" }>, Comment> = true
export const error_range: Equal<ReturnType<typeof createAstSyntaxError>["start"], number> = true
export const html_ast: Equal<ReturnType<typeof parseHtml>["ast"], Element["children"]> = true
export const jsx_ast: Equal<ReturnType<typeof parseJsx>["ast"], Element[]> = true
export const public_error: Equal<AstSyntaxError, Error & { end: number, name: "AstSyntaxError", start: number }> = true
/** @ts-expect-error */
export const public_error_is_not_any: AstSyntaxError = { unrelated: true }
export const pug_ast: Equal<ReturnType<typeof parsePug>["ast"], Element["children"]> = true
export const razor_ast: Equal<ReturnType<typeof parseRazor>["ast"], Element["children"]> = true
export const razor_component_ast: Equal<ReturnType<typeof parseRazorComponent>["ast"], Element["children"]> = true
export const script_ast: Equal<ReturnType<typeof parseScript>["ast"], Element[]> = true
export const script_elements: Equal<
	Extract<Script, { elements: Element[] }>["subType"],
	"jsx" | "razor" | "template"
> = true
export const script_subtypes: Equal<Script["subType"], "block" | "content" | "jsx" | "pug" | "razor" | "template"> = true