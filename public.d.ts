export type AstNode =
	Attribute
	| Comment
	| Element
	| Script
	| String
	| Style
	| Text
/**
 * A syntax error in `errors`: `instanceof Error`, with `name`, `message` and the `start` and `end` offsets of the
 * problem as its own enumerable properties and no `stack`, so `JSON.stringify`, `structuredClone` and `postMessage`
 * keep all four. A copy made by `structuredClone` or `postMessage` is a plain object, no longer `instanceof Error`.
 */
export type AstSyntaxError = Error & {
	end: number
	name: "AstSyntaxError"
	start: number
}
export type Attribute = {
	name: string
	type: "Attribute"
	value: true | MarkupString | ScriptWithElements & { subType: "jsx" | "razor" } | ScriptWithoutElements & { subType: "block" | "pug" }
} & BaseAstNode
type BaseAstNode = {
	end: number
	start: number
	text?: string
}
type CodeString = {
	scripts: TemplateLiteralScript[]
	subType: "backtick"
	type: "String"
} & BaseAstNode
export type Comment = {
	type: "Comment"
} & BaseAstNode
export type Element = {
	attributes: Attribute[]
	children: MarkupNode[]
	name: string
	subType: "close" | "closed" | "open"
	type: "Element"
} & BaseAstNode
type MarkupNode = Comment | Element | ScriptWithElements | ScriptWithoutElements | Style | Text
type MarkupString = {
	scripts: (ScriptWithElements | ScriptWithoutElements & { subType: "block" })[]
	subType: "double" | "single" | "unquoted"
	type: "String"
} & BaseAstNode
export type Script = ScriptWithElements | ScriptWithoutElements | TemplateLiteralScript
type ScriptWithElements = {
	elements: Element[]
	strings: String[]
	subType: "jsx" | "razor" | "template"
	type: "Script"
} & BaseAstNode
type ScriptWithoutElements = {
	strings: String[]
	subType: "block" | "content" | "pug"
	type: "Script"
} & BaseAstNode
export type String = CodeString | MarkupString
export type Style = {
	type: "Style"
} & BaseAstNode
type TemplateLiteralScript = {
	strings: String[]
	subType: "template"
	type: "Script"
} & BaseAstNode
export type Text = {
	type: "Text"
} & BaseAstNode