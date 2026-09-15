import {
	attribute_node,
	check_non_string_input,
	class_attributes,
	element_names,
	element_node,
	script,
	script_node,
	string_node,
	template_node,
	text_node
} from "./helpers.js"
import {
	dom_eater_ranges,
	typescript_ranges
} from "./typescript_ranges.js"
import { parseScript } from "dom-eater"
import { describe, expect, it } from "vitest"
const b_element = element_node(
	"<b class=\"x\"></b>",
	"b",
	"open",
	[
		attribute_node(
			"class=\"x\"",
			"class",
			string_node("\"x\"", "double")
		)
	]
)
describe(
	"parseScript",
	() => {
		describe(
			"agreement with the TypeScript parser",
			() => {
				it.each(
					[
						"const a = <const>[\"/\"]",
						"const g = <T>(a: T) => a / 2 + \"/\"",
						"f(<any>a, \"/\")",
						"if (<boolean>x) /'/.test(q)",
						"let a: Map<string, /* > */ number> = \"'\" / b",
						"x = <T,>(a: T): T => a; y = /'/",
						"x = <T>(y) / 2, \"/\"",
						"x = <T>y / 2, \"/\"",
						"x = a < b; y = c > /'/.test(q)",
						"x = a as \"t\" << b / 2, \"/\""
					]
				)(
					"%j",
					code => {
						expect(dom_eater_ranges(code, false)).toStrictEqual(typescript_ranges(code, false))
					}
				)
			}
		)
		describe(
			"errors",
			() => {
				it(
					"keeps a substitution being typed after another substitution",
					() => {
						expect(script("x = html`${a}<p>${b")).toStrictEqual(
							{
								ast: [
									element_node(
										"<p>${b",
										"p",
										"open",
										[],
										[ template_node("${b") ]
									)
								],
								errors: [
									{
										end: 19,
										message: "The template literal substitution is not closed.",
										start: 16
									},
									{
										end: 19,
										message: "The template literal is not closed.",
										start: 8
									}
								]
							}
						)
					}
				)
				it(
					"keeps the element being typed last in an unterminated template",
					() => {
						expect(
							script(
								"x = html`<div class=\"a\"><p class=\""
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<div class=\"a\">",
										"div",
										"open",
										[
											attribute_node(
												"class=\"a\"",
												"class",
												string_node("\"a\"", "double")
											)
										]
									),
									element_node(
										"<p class=\"",
										"p",
										"open",
										[
											attribute_node(
												"class=\"",
												"class",
												string_node("\"", "double")
											)
										]
									)
								],
								errors: [
									{
										end: 34,
										message: "The template literal is not closed.",
										start: 8
									},
									{
										end: 34,
										message: "The double-quoted attribute value is not closed.",
										start: 33
									},
									{
										end: 34,
										message: "The start tag is not closed.",
										start: 24
									},
									{
										end: 24,
										message: "The \"div\" element is not closed.",
										start: 9
									}
								]
							}
						)
					}
				)
				it(
					"reports errors in the code of a substitution only once",
					() => {
						expect(
							script("x = html`<p>${'a}</p>`")
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<p>${'a}</p>`",
										"p",
										"open",
										[],
										[
											template_node(
												"${'a}</p>`",
												[
													string_node("'a}</p>`", "single")
												]
											)
										]
									)
								],
								errors: [
									{
										end: 22,
										message: "The single-quoted string is not closed.",
										start: 14
									},
									{
										end: 22,
										message: "The template literal substitution is not closed.",
										start: 12
									},
									{
										end: 22,
										message: "The template literal is not closed.",
										start: 8
									}
								]
							}
						)
					}
				)
				it(
					"reports markup errors after a substitution",
					() => {
						expect(script("x = html`${a}<div>`")).toStrictEqual(
							{
								ast: [
									element_node("<div>", "div", "open")
								],
								errors: [
									{
										end: 18,
										message: "The \"div\" element is not closed.",
										start: 13
									}
								]
							}
						)
					}
				)
			}
		)
		describe(
			"frameworks",
			() => {
				it(
					"Angular inline template",
					() => {
						const result = script(
							"@Component({\n\tselector: 'app-x',\n\ttemplate: `\n"
								+ "\t\t@if (user) {<p class=\"a\" [class.b]=\"on\">{{ user.name }}</p>}\n"
								+ "\t\t@for (item of items; track item.id) {<li class=\"c\">{{ item }}</li>}\n\t`\n})\n"
								+ "export class X {\n\t@Input() user?: User\n\titems = signal<string[]>([])\n}"
						)
						expect(result.errors).toStrictEqual([])
						expect(element_names(result.ast)).toStrictEqual([ "p", "li" ])
						expect(class_attributes(result.ast)).toStrictEqual(
							[ "class=\"a\"", "class=\"c\"" ]
						)
					}
				)
				it(
					"Lit",
					() => {
						const result = script(
							"@customElement('x-list')\nexport class XList extends LitElement {\n"
								+ "\tstatic styles = css`:host { display: block }`\n"
								+ "\trender() {\n\t\treturn html`<ul class=\"a ${classMap(this.c)}\">${this.items.map(i "
								+ "=> html`<li class=\"b\" @click=${() => this.pick(i)}>${i}</li>`)}</ul>`\n\t}\n}"
						)
						expect(result.errors).toStrictEqual([])
						expect(element_names(result.ast)).toStrictEqual([ "ul", "li" ])
						expect(class_attributes(result.ast)).toStrictEqual(
							[
								"class=\"a ${classMap(this.c)}\"",
								"class=\"b\""
							]
						)
					}
				)
			}
		)
		describe(
			"input",
			() => {
				it(
					"omits text on every node unless include_text is set",
					() => {
						const { ast } = parseScript(
							"html`<p class=\"a ${b}\">${c}</p>`"
						)
						expect(JSON.stringify(ast)).not.toContain("\"text\"")
					}
				)
				it(
					"reports input that is not a string instead of throwing",
					() => {
						check_non_string_input(parseScript)
					}
				)
				it(
					"returns nothing for code without markup templates",
					() => {
						expect(
							script(
								"const a = <T>b; if (a < b && c > d) {} e = `<b></b>`"
							)
						).toStrictEqual({ ast: [], errors: [] })
					}
				)
			}
		)
		describe(
			"markup templates",
			() => {
				it(
					"ignores other template literals",
					() => {
						expect(
							script(
								"a = `<b></b>`; b = xhtml`<b></b>`; c = { title: `<b></b>` };"
										+ " d = x ? template : `<b></b>`; e = /* css */ `<b></b>`; f = html.x`<b></b>`"
							)
						).toStrictEqual({ ast: [], errors: [] })
					}
				)
				it(
					"keeps boolean attributes",
					() => {
						expect(
							script("html`<input disabled>`")
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<input disabled>",
										"input",
										"open",
										[
											attribute_node("disabled", "disabled")
										]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"keeps escaped backticks in script content as text",
					() => {
						const content = "a = \\`b\\` + \"c\""
						expect(
							script(
								`html\`<script>${content}</script>\``
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										`<script>${content}</script>`,
										"script",
										"open",
										[],
										[
											script_node(
												content,
												"content",
												[ string_node("\"c\"", "double") ]
											)
										]
									)
								],
								errors: []
							}
						)
						expect(
							script(
								"html`<script>\\`${c}</script>`"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<script>\\`${c}</script>",
										"script",
										"open",
										[],
										[
											script_node("\\`${c}", "content")
										]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"keeps the closing backtick out of an element that is not closed",
					() => {
						expect(
							script("html`<p class=\"a\">`")
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<p class=\"a\">",
										"p",
										"open",
										[
											attribute_node(
												"class=\"a\"",
												"class",
												string_node("\"a\"", "double")
											)
										]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"keeps the elements after an interpolation at the top level",
					() => {
						expect(
							script(
								"@Component({ template: `{{ title }}<p></p>` })"
							)
						).toStrictEqual(
							{
								ast: [
									element_node("<p></p>", "p", "open")
								],
								errors: []
							}
						)
					}
				)
				it(
					"parses Angular control flow and ICU expressions in an inline template",
					() => {
						expect(
							script(
								"@Component({ template: `@if (a) {<p>{{ c }}</p>} {n, plural, =1 {<i></i>}}` })"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<p>{{ c }}</p>",
										"p",
										"open",
										[],
										[
											script_node("{{ c }}", "block")
										]
									),
									element_node("<i></i>", "i", "open")
								],
								errors: []
							}
						)
					}
				)
				it(
					"parses strings in interpolations",
					() => {
						expect(
							script(
								"@Component({ template: `<p>{{ 'a' }}</p>` })"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<p>{{ 'a' }}</p>",
										"p",
										"open",
										[],
										[
											script_node(
												"{{ 'a' }}",
												"block",
												[ string_node("'a'", "single") ]
											)
										]
									)
								],
								errors: []
							}
						)
					}
				)
				it.each(
					[
						[
							"a /* html */ comment",
							"const t = /* html */ `<b class=\"x\"></b>`"
						],
						[
							"a /*SVG*/ comment",
							"const t = /*SVG*/`<b class=\"x\"></b>`"
						],
						[
							"a member html tag",
							"const t = lit.html`<b class=\"x\"></b>`"
						],
						[
							"a quoted template key",
							"c = { \"template\": `<b class=\"x\"></b>` }"
						],
						[
							"a svg tag",
							"const t = svg`<b class=\"x\"></b>`"
						],
						[
							"a template key",
							"@Component({ template: `<b class=\"x\"></b>` })"
						],
						[
							"an html tag before a line break",
							"const t = html\n`<b class=\"x\"></b>`"
						]
					]
				)(
					"parses the markup of a template literal marked by %s",
					(_, code) => {
						expect(script(code)).toStrictEqual(
							{ ast: [ b_element ], errors: [] }
						)
					}
				)
			}
		)
		describe(
			"substitutions",
			() => {
				it(
					"collects the elements of top-level substitutions",
					() => {
						expect(
							script(
								"html`${a}<b></b>${c ? html`<i></i>` : \"\"}`"
							)
						).toStrictEqual(
							{
								ast: [
									element_node("<b></b>", "b", "open"),
									element_node("<i></i>", "i", "open")
								],
								errors: []
							}
						)
					}
				)
				it(
					"keeps a substitution in text as a Script without its $ in the Text before it",
					() => {
						expect(
							script("html`<p>a ${b} $${c}</p>`")
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<p>a ${b} $${c}</p>",
										"p",
										"open",
										[],
										[
											text_node("a "),
											template_node("${b}"),
											text_node(" $"),
											template_node("${c}")
										]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"keeps a substitution whose code has a string with a brace",
					() => {
						expect(
							script("html`<p>${'}'}</p><i></i>`")
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<p>${'}'}</p>",
										"p",
										"open",
										[],
										[
											template_node(
												"${'}'}",
												[ string_node("'}'", "single") ]
											)
										]
									),
									element_node("<i></i>", "i", "open")
								],
								errors: []
							}
						)
					}
				)
				it(
					"keeps substitutions in quoted and unquoted attribute values",
					() => {
						expect(
							script(
								"html`<p class=\"a ${b}\" id=${c ? \"d\" : 'e'}></p>`"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<p class=\"a ${b}\" id=${c ? \"d\" : 'e'}></p>",
										"p",
										"open",
										[
											attribute_node(
												"class=\"a ${b}\"",
												"class",
												string_node(
													"\"a ${b}\"",
													"double",
													[ template_node("${b}") ]
												)
											),
											attribute_node(
												"id=${c ? \"d\" : 'e'}",
												"id",
												string_node(
													"${c ? \"d\" : 'e'}",
													"unquoted",
													[
														template_node(
															"${c ? \"d\" : 'e'}",
															[
																string_node("\"d\"", "double"),
																string_node("'e'", "single")
															]
														)
													]
												)
											)
										]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"keeps the elements of templates nested in a substitution",
					() => {
						const inner = "html`<li>${i}</li>`"
						const outer = `\${items.map(i => ${inner})}`
						const li = element_node(
							"<li>${i}</li>",
							"li",
							"open",
							[],
							[ template_node("${i}") ]
						)
						expect(
							script(`html\`<ul>${outer}</ul>\``)
						).toStrictEqual(
							{
								ast: [
									element_node(
										`<ul>${outer}</ul>`,
										"ul",
										"open",
										[],
										[
											template_node(
												outer,
												[
													string_node(
														"`<li>${i}</li>`",
														"backtick",
														[ template_node("${i}") ]
													)
												],
												[ li ]
											)
										]
									)
								],
								errors: []
							}
						)
					}
				)
			}
		)
		describe(
			"typescript",
			() => {
				it(
					"keeps markup templates after type assertions and type parameters",
					() => {
						expect(
							script(
								"const a = <HTMLElement>b; const f = <T,>(d: T) => d < e; render(html`<i></i>`)"
							)
						).toStrictEqual(
							{
								ast: [
									element_node("<i></i>", "i", "open")
								],
								errors: []
							}
						)
					}
				)
			}
		)
	}
)