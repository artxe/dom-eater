import {
	AstSyntaxError,
	Attribute,
	Comment,
	Element,
	String
} from "./public.js"
export type Bracket = {
	arrow: number
	arrow_async: boolean
	arrow_inside: number
	await_keyword: boolean | undefined
	body: "" | "class" | "function"
	body_declaration: boolean
	body_keywords: "" | "await" | "await yield" | "yield"
	body_start: number
	expression_after: boolean
	for_head: boolean
	kind: "(" | "[" | "block" | "{"
	members: boolean
	script: ScriptInfo | undefined
	start: number
	ternaries: number
	type_end: number
	yield_keyword: boolean
}
export type MarkupNode = Element["children"][number]
export type MarkupScript = Exclude<String, { subType: "backtick" }>["scripts"][number]
export type NamespaceElement = {
	name: string
	namespace: "html" | "math" | "svg"
}
export type OpenElement = {
	children: MarkupNode[]
	element?: Element
	name: string
}
export type PugCharState = {
	escaped: boolean
	has_dollar: boolean
	ident: string
	ident_before: string
	last: string
	last_char: string
	last_operand: boolean
	line_comment: boolean
	operand_before: boolean
	recent: string
	recent_kind: number
	regexp_start: boolean
	separated: boolean
	stack: string[]
	ternaries: number
	undo_ident: string
	undo_ident_before: string
	undo_last: string
	undo_last_operand: boolean
	undo_recent: string
	undo_recent_kind: number
	undo_separated: boolean
	undo_word: string
	word: string
}
export type PugLexer = {
	base: number
	closed: boolean
	ended: boolean
	errors: AstSyntaxError[]
	indent_regex: RegExp | undefined
	indent_stack: number[]
	index: number
	interpolated: boolean
	interpolation_allowed: boolean
	separators: boolean
	src: string
	tokens: PugToken[]
}
export type PugParser = {
	comments: Map<PugToken, Comment[]>
	errors: AstSyntaxError[]
	in_mixin: number
	index: number
	last_end: number
	pending: Comment[]
	src: string
	tokens: PugToken[]
}
export type PugToken = {
	buffer: boolean
	code_end: number
	code_start: number
	end: number
	name: string
	start: number
	type: PugTokenType
	value_end: number
	value_start: number
}
export type PugTokenType =
	"&attributes"
	| ":"
	| "attribute"
	| "block"
	| "blockcode"
	| "call"
	| "case"
	| "class"
	| "code"
	| "comment"
	| "default"
	| "doctype"
	| "dot"
	| "each"
	| "eachOf"
	| "else"
	| "else-if"
	| "end-attributes"
	| "end-pipeless-text"
	| "end-pug-interpolation"
	| "eos"
	| "extends"
	| "filter"
	| "id"
	| "if"
	| "include"
	| "indent"
	| "interpolated-code"
	| "interpolation"
	| "mixin"
	| "mixin-block"
	| "newline"
	| "outdent"
	| "path"
	| "slash"
	| "start-attributes"
	| "start-pipeless-text"
	| "start-pug-interpolation"
	| "tag"
	| "text"
	| "text-html"
	| "when"
	| "while"
	| "yield"
export type RazorBalance = {
	backtrack?: boolean
	no_error?: boolean
	templates?: boolean
}
export type RazorContext = {
	balance_failures: Set<string>
	bodies: Map<Element, [ number, number ]>
	component: boolean
	errors: AstSyntaxError[]
	in_template: boolean
	nested: boolean
	null_generate: boolean
	script: RazorScript | undefined
	single_line: boolean
	statement_ends: Set<number>
	text: string
}
export type RazorDirective = {
	kind: "code_block" | "razor_block" | "reserved" | "single" | "tag_helper"
	tokens: string[]
}
export type RazorFrame = {
	children: MarkupNode[]
	element?: Element
	flushed: number
	name: string
	well_formed: boolean
}
export type RazorMarkup = {
	end: number
	nodes: MarkupNode[]
}
export type RazorParserState =
	"cdata"
	| "code_transition"
	| "double_transition"
	| "eof"
	| "markup_comment"
	| "markup_text"
	| "misc"
	| "razor_comment"
	| "special_tag"
	| "tag"
	| "unknown"
	| "xml_pi"
export type RazorScript = {
	elements: Element[]
	markup: [ number, number, number ][]
	strings: String[]
}
export type RazorStartTag = {
	attributes: Attribute[]
	end: number
	mode: "invalid" | "normal" | "script" | "self_closing" | "void"
	name: string
	self_closing: boolean
	well_formed: boolean
}
export type RazorToken = {
	end: number
	kind: string
}
export type ScanState = {
	arrows: Map<number, boolean>
	brackets: Bracket[]
	colons: Map<number, boolean>
	comments: Map<number, number>
	declaration_lists: Map<number, boolean>
	expression_after: Map<number, boolean>
	openings: Map<number, number>
}
export type ScriptInfo = {
	jsx: boolean
	module: boolean
	module_syntax: boolean
	top_level_await: boolean
}
export type TemplateLiteralScript = Extract<String, { subType: "backtick" }>["scripts"][number]
export type Token = {
	end: number
	kind: "" | "bracket" | "literal" | "punctuator" | "word"
	start: number
	value: string
}