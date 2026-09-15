import {
	attribute_node,
	check_invariants,
	check_non_string_input,
	class_attributes,
	collect,
	comment_node,
	element_names,
	element_node,
	html,
	readme_example,
	script_node,
	string_node,
	style_node,
	text_node
} from "./helpers.js"
import {
	script_syntax_cases,
	script_syntax_error_cases
} from "./script_syntax_cases.js"
import { parseHtml } from "dom-eater"
import { describe, expect, it } from "vitest"
const closes_rt = [ "rb", "rp", "rt" ]
const closes_ruby = [ "rb", "rp", "rt", "rtc" ]
const closes_table_cell = [ "caption", "colgroup", "td", "th" ]
const closes_table_section = [
	"caption",
	"colgroup",
	"tbody",
	"td",
	"tfoot",
	"th",
	"thead",
	"tr"
]
/** @type {[ string, string ][]} */
const implied_end_tag_cases = /** @type {[ string, string[] ][]} */([
	[ "body", [ "head" ] ],
	[ "caption", closes_table_section ],
	[ "colgroup", closes_table_section ],
	[ "dd", [ "dd", "dt", "p" ] ],
	[ "dt", [ "dd", "dt", "p" ] ],
	[ "li", [ "li", "p" ] ],
	[
		"optgroup",
		[ "optgroup", "option" ]
	],
	[ "option", [ "option" ] ],
	[ "rb", closes_ruby ],
	[ "rp", closes_rt ],
	[ "rt", closes_rt ],
	[ "rtc", closes_ruby ],
	[ "tbody", closes_table_section ],
	[ "td", closes_table_cell ],
	[ "tfoot", closes_table_section ],
	[ "th", closes_table_cell ],
	[ "thead", closes_table_section ],
	[
		"tr",
		[
			"caption",
			"colgroup",
			"td",
			"th",
			"tr"
		]
	]
])/**/.flatMap(
	([ start_tag, closed ]) => closed.map(
		name => /** @type {[ string, string ]} */([ name, start_tag ])/**/
	)
)
const text_content_elements = [
	"iframe",
	"noembed",
	"noframes",
	"plaintext",
	"textarea",
	"title",
	"xmp"
]
const void_elements = [
	"area",
	"base",
	"br",
	"col",
	"embed",
	"hr",
	"img",
	"input",
	"link",
	"meta",
	"param",
	"source",
	"track",
	"wbr"
]
describe(
	"parseHtml",
	() => {
		describe(
			"angular",
			() => {
				it(
					"keeps Angular control flow block headers as text",
					() => {
						expect(
							html(
								"@if (a == \"\\\")\") {<p>b</p>} @else if (c) {d} @if (e)"
							)
						).toStrictEqual(
							{
								ast: [
									text_node("@if (a == \"\\\")\") {"),
									element_node(
										"<p>b</p>",
										"p",
										"open",
										[],
										[ text_node("b") ]
									),
									text_node("} @else if (c) {d} @if (e)")
								],
								errors: []
							}
						)
					}
				)
				it(
					"keeps a @let declaration as text up to its semicolon",
					() => {
						expect(
							html(
								"@let a = b < c ? \"x;\" : '}';<p>d</p>"
							)
						).toStrictEqual(
							{
								ast: [
									text_node(
										"@let a = b < c ? \"x;\" : '}';"
									),
									element_node(
										"<p>d</p>",
										"p",
										"open",
										[],
										[ text_node("d") ]
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
							"a function expression",
							"@let f = (function () { b; return {c}; })();"
						],
						[
							"a name starting with $",
							"@let $a = {b};"
						],
						[
							"a name starting with _",
							"@let _a = {b};"
						],
						[
							"a name with $ after its first character",
							"@let a$ = {b};"
						],
						[
							"a one-letter name",
							"@let x = {b};"
						],
						[
							"a two-letter name",
							"@let xy = {b};"
						],
						[
							"an array",
							"@let f = [(b)].map(c => { d; return {e}; });"
						],
						[
							"backslashes in strings",
							"@let a = \"\\\";{b}\";"
						],
						[
							"brackets and blocks",
							"@let f = () => { const a = [b]; return {c}; };"
						],
						[
							"quotes",
							"@let a = \";{x}\" + ';{x}' + `;{x}`;"
						]
					]
				)(
					"keeps a @let declaration with %s as text up to its semicolon",
					(_, declaration) => {
						expect(html(`${declaration}<p></p>`)).toStrictEqual(
							{
								ast: [
									text_node(declaration),
									element_node("<p></p>", "p", "open")
								],
								errors: []
							}
						)
					}
				)
				it(
					"keeps markup after @let without = or a semicolon",
					() => {
						expect(
							html(
								"@let a<b></b>@let c = d <i></i>"
							)
						).toStrictEqual(
							{
								ast: [
									text_node("@let a"),
									element_node("<b></b>", "b", "open"),
									text_node("@let c = d "),
									element_node("<i></i>", "i", "open")
								],
								errors: []
							}
						)
					}
				)
				it.each(
					[
						[
							"{ , plural, x}",
							[
								script_node("{ , plural, x}", "block")
							]
						],
						[
							"{,, plural, x}",
							[
								script_node("{,, plural, x}", "block")
							]
						],
						[
							"{f(a, b, plural, c)}",
							[
								script_node("{f(a, b, plural, c)}", "block")
							]
						],
						[
							"{f({ a, plural, b })}",
							[
								script_node("{f({ a, plural, b })}", "block")
							]
						],
						[
							"{x}, plural, {y}",
							[
								script_node("{x}", "block"),
								text_node(", plural, "),
								script_node("{y}", "block")
							]
						],
						[
							"{{ f(a, plural, b) }}",
							[
								script_node("{{ f(a, plural, b) }}", "block")
							]
						],
						[
							"{}, plural, {x}",
							[
								script_node("{}", "block"),
								text_node(", plural, "),
								script_node("{x}", "block")
							]
						]
					]
				)(
					"parses %j, which is not an ICU expression, as Script blocks",
					(code, ast) => {
						expect(html(code)).toStrictEqual({ ast, errors: [] })
					}
				)
				it(
					"parses a block right after an @",
					() => {
						expect(html("a@{b}")).toStrictEqual(
							{
								ast: [
									text_node("a@"),
									script_node("{b}", "block")
								],
								errors: []
							}
						)
					}
				)
				it(
					"parses a block with commas that is not an ICU expression as a Script",
					() => {
						expect(html("{a, plural}{b, c, d}")).toStrictEqual(
							{
								ast: [
									script_node("{a, plural}", "block"),
									script_node("{b, c, d}", "block")
								],
								errors: []
							}
						)
					}
				)
				it(
					"parses an Angular block header without whitespace before {",
					() => {
						expect(html("@if (a){<p>b</p>}")).toStrictEqual(
							{
								ast: [
									text_node("@if (a){"),
									element_node(
										"<p>b</p>",
										"p",
										"open",
										[],
										[ text_node("b") ]
									),
									text_node("}")
								],
								errors: []
							}
						)
					}
				)
				it(
					"parses curly braces after an @ that does not start a control flow block",
					() => {
						expect(
							html(
								"a@b {c} @if x {d} @for (e {f}"
							)
						).toStrictEqual(
							{
								ast: [
									text_node("a@b "),
									script_node("{c}", "block"),
									text_node(" @if x "),
									script_node("{d}", "block"),
									text_node(" @for (e "),
									script_node("{f}", "block")
								],
								errors: []
							}
						)
					}
				)
				it(
					"parses the cases of an ICU expression as markup",
					() => {
						expect(
							html(
								"{n, plural, =0 {<b>none</b>} other {{{ n }} <i title=\"}\">x</i>}}"
							)
						).toStrictEqual(
							{
								ast: [
									text_node("{n, plural, =0 {"),
									element_node(
										"<b>none</b>",
										"b",
										"open",
										[],
										[ text_node("none") ]
									),
									text_node("} other {"),
									script_node("{{ n }}", "block"),
									text_node(" "),
									element_node(
										"<i title=\"}\">x</i>",
										"i",
										"open",
										[
											attribute_node(
												"title=\"}\"",
												"title",
												string_node("\"}\"", "double")
											)
										],
										[ text_node("x") ]
									),
									text_node("}}")
								],
								errors: []
							}
						)
					}
				)
				it(
					"parses the cases of nested ICU expressions as markup",
					() => {
						expect(
							html(
								"{a, select, x {{b, selectordinal, other {<i></i>}}} other {c}}"
							)
						).toStrictEqual(
							{
								ast: [
									text_node(
										"{a, select, x {{b, selectordinal, other {"
									),
									element_node("<i></i>", "i", "open"),
									text_node("}}} other {c}}")
								],
								errors: []
							}
						)
					}
				)
				it(
					"parses the cases of nested ICU expressions that start with an interpolation",
					() => {
						expect(
							html(
								"{count, plural, =1 {{gender, select, male {{{name}} is <b>here</b>}"
										+ " other {<i>they</i>}}} other {<u>x</u>}}"
							)
						).toStrictEqual(
							{
								ast: [
									text_node(
										"{count, plural, =1 {{gender, select, male {"
									),
									script_node("{{name}}", "block"),
									text_node(" is "),
									element_node(
										"<b>here</b>",
										"b",
										"open",
										[],
										[ text_node("here") ]
									),
									text_node("} other {"),
									element_node(
										"<i>they</i>",
										"i",
										"open",
										[],
										[ text_node("they") ]
									),
									text_node("}}} other {"),
									element_node(
										"<u>x</u>",
										"u",
										"open",
										[],
										[ text_node("x") ]
									),
									text_node("}}")
								],
								errors: []
							}
						)
					}
				)
				it(
					"skips backtick strings in Angular block conditions",
					() => {
						expect(html("@if (`)`) {<i/>}")).toStrictEqual(
							{
								ast: [
									text_node("@if (`)`) {"),
									element_node("<i/>", "i", "closed"),
									text_node("}")
								],
								errors: []
							}
						)
					}
				)
				it(
					"skips braces in tags, comments and interpolations in the cases of an ICU expression",
					() => {
						expect(
							html(
								"{n, plural, =0 {<b title=\"}\">x</b>} =1 {<B title=\"a>}\">y</B>} =2 {<!-- } -->}"
										+ " =3 {<?x } ?>} =4 {{{\"}}\" }}} =5 {a {b} c}"
										+ " =6 {{{ '}}' }}{{ `}}` }}{{ a // \"\n}}} other {<i></i>}}"
							)
						).toStrictEqual(
							{
								ast: [
									text_node("{n, plural, =0 {"),
									element_node(
										"<b title=\"}\">x</b>",
										"b",
										"open",
										[
											attribute_node(
												"title=\"}\"",
												"title",
												string_node("\"}\"", "double")
											)
										],
										[ text_node("x") ]
									),
									text_node("} =1 {"),
									element_node(
										"<B title=\"a>}\">y</B>",
										"B",
										"open",
										[
											attribute_node(
												"title=\"a>}\"",
												"title",
												string_node("\"a>}\"", "double")
											)
										],
										[ text_node("y") ]
									),
									text_node("} =2 {"),
									comment_node("<!-- } -->"),
									text_node("} =3 {"),
									comment_node("<?x } ?>"),
									text_node("} =4 {"),
									script_node(
										"{{\"}}\" }}",
										"block",
										[
											string_node("\"}}\"", "double")
										]
									),
									text_node("} =5 {a "),
									script_node("{b}", "block"),
									text_node(" c} =6 {"),
									script_node(
										"{{ '}}' }}",
										"block",
										[ string_node("'}}'", "single") ]
									),
									script_node(
										"{{ `}}` }}",
										"block",
										[
											string_node("`}}`", "backtick")
										]
									),
									script_node("{{ a // \"\n}}", "block"),
									text_node("} other {"),
									element_node("<i></i>", "i", "open"),
									text_node("}}")
								],
								errors: []
							}
						)
					}
				)
			}
		)
		describe(
			"attributes",
			() => {
				it(
					"does not treat backslashes as escapes in quoted values",
					() => {
						expect(
							html(
								String.raw`<a b="x\" c='y\'>d</a>`
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										String.raw`<a b="x\" c='y\'>d</a>`,
										"a",
										"open",
										[
											attribute_node(
												String.raw`b="x\"`,
												"b",
												string_node(String.raw`"x\"`, "double")
											),
											attribute_node(
												String.raw`c='y\'`,
												"c",
												string_node(String.raw`'y\'`, "single")
											)
										],
										[ text_node("d") ]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"ends a block that is never closed at the closing quote of the value",
					() => {
						expect(
							html(
								"<a title=\"{it's}\">x</a><b class=\"c\"></b>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<a title=\"{it's}\">x</a>",
										"a",
										"open",
										[
											attribute_node(
												"title=\"{it's}\"",
												"title",
												string_node(
													"\"{it's}\"",
													"double",
													[ script_node("{it's}", "block") ]
												)
											)
										],
										[ text_node("x") ]
									),
									element_node(
										"<b class=\"c\"></b>",
										"b",
										"open",
										[
											attribute_node(
												"class=\"c\"",
												"class",
												string_node("\"c\"", "double")
											)
										]
									)
								],
								errors: [
									{
										end: 16,
										message: "The {…} block is not closed.",
										start: 10
									}
								]
							}
						)
					}
				)
				it(
					"ends a boolean attribute name before />",
					() => {
						expect(html("<input disabled/>")).toStrictEqual(
							{
								ast: [
									element_node(
										"<input disabled/>",
										"input",
										"closed",
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
					"ends an unquoted attribute value right after a block",
					() => {
						expect(html("<a b=x{c} d></a>")).toStrictEqual(
							{
								ast: [
									element_node(
										"<a b=x{c} d></a>",
										"a",
										"open",
										[
											attribute_node(
												"b=x{c}",
												"b",
												string_node(
													"x{c}",
													"unquoted",
													[ script_node("{c}", "block") ]
												)
											),
											attribute_node("d", "d")
										]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"keeps PHP and ERB tags inside quoted values",
					() => {
						const source = "<p class=\"a <?= $b ? \"c\" : \"d\" ?>\" title='<%= e ? 'f' : 'g' %>'"
								+ " data-x=\"1 < 2 <% 3\"></p>"
						expect(html(source)).toStrictEqual(
							{
								ast: [
									element_node(
										source,
										"p",
										"open",
										[
											attribute_node(
												"class=\"a <?= $b ? \"c\" : \"d\" ?>\"",
												"class",
												string_node(
													"\"a <?= $b ? \"c\" : \"d\" ?>\"",
													"double"
												)
											),
											attribute_node(
												"title='<%= e ? 'f' : 'g' %>'",
												"title",
												string_node(
													"'<%= e ? 'f' : 'g' %>'",
													"single"
												)
											),
											attribute_node(
												"data-x=\"1 < 2 <% 3\"",
												"data-x",
												string_node("\"1 < 2 <% 3\"", "double")
											)
										]
									)
								],
								errors: []
							}
						)
						expect(
							html("<a title=\"<?\">x<?php ?>")
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<a title=\"<?\">",
										"a",
										"open",
										[
											attribute_node(
												"title=\"<?\"",
												"title",
												string_node("\"<?\"", "double")
											)
										]
									),
									text_node("x"),
									comment_node("<?php ?>")
								],
								errors: [
									{
										end: 14,
										message: "The \"a\" element is not closed.",
										start: 0
									}
								]
							}
						)
					}
				)
				it(
					"parses block values and nameless spread blocks",
					() => {
						expect(html("<a b={c} {...d}></a>")).toStrictEqual(
							{
								ast: [
									element_node(
										"<a b={c} {...d}></a>",
										"a",
										"open",
										[
											attribute_node(
												"b={c}",
												"b",
												script_node("{c}", "block")
											),
											attribute_node(
												"{...d}",
												"",
												script_node("{...d}", "block")
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
					"parses boolean attributes",
					() => {
						expect(html("<input a b>")).toStrictEqual(
							{
								ast: [
									element_node(
										"<input a b>",
										"input",
										"open",
										[
											attribute_node("a", "a"),
											attribute_node("b", "b")
										]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"parses curly braces inside quoted values as Script blocks",
					() => {
						expect(
							html(
								"<a b=\"x{y}z\" c='{\"}\"}'></a>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<a b=\"x{y}z\" c='{\"}\"}'></a>",
										"a",
										"open",
										[
											attribute_node(
												"b=\"x{y}z\"",
												"b",
												string_node(
													"\"x{y}z\"",
													"double",
													[ script_node("{y}", "block") ]
												)
											),
											attribute_node(
												"c='{\"}\"}'",
												"c",
												string_node(
													"'{\"}\"}'",
													"single",
													[
														script_node(
															"{\"}\"}",
															"block",
															[ string_node("\"}\"", "double") ]
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
					"parses double and single quoted values with whitespace and newlines around =",
					() => {
						expect(
							html("<a b = \"c\" d=\n'e'></a>")
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<a b = \"c\" d=\n'e'></a>",
										"a",
										"open",
										[
											attribute_node(
												"b = \"c\"",
												"b",
												string_node("\"c\"", "double")
											),
											attribute_node(
												"d=\n'e'",
												"d",
												string_node("'e'", "single")
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
					"parses unquoted attribute values",
					() => {
						expect(
							html(
								"<a id=foo class=a{b}c href=/x/>d</a>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<a id=foo class=a{b}c href=/x/>d</a>",
										"a",
										"open",
										[
											attribute_node(
												"id=foo",
												"id",
												string_node("foo", "unquoted")
											),
											attribute_node(
												"class=a{b}c",
												"class",
												string_node(
													"a{b}c",
													"unquoted",
													[ script_node("{b}", "block") ]
												)
											),
											attribute_node(
												"href=/x/",
												"href",
												string_node("/x/", "unquoted")
											)
										],
										[ text_node("d") ]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"reports a missing value at the end of input",
					() => {
						expect(html("<a b=")).toStrictEqual(
							{
								ast: [
									element_node(
										"<a b=",
										"a",
										"open",
										[ attribute_node("b=", "b") ]
									)
								],
								errors: [
									{
										end: 5,
										message: "The \"b\" attribute has no value after \"=\".",
										start: 3
									},
									{
										end: 5,
										message: "The start tag is not closed.",
										start: 0
									},
									{
										end: 5,
										message: "The \"a\" element is not closed.",
										start: 0
									}
								]
							}
						)
					}
				)
				it(
					"reports a value that does not start with a quote or brace",
					() => {
						expect(html("<a b=>c</a>")).toStrictEqual(
							{
								ast: [
									element_node(
										"<a b=>c</a>",
										"a",
										"open",
										[ attribute_node("b=", "b") ],
										[ text_node("c") ]
									)
								],
								errors: [
									{
										end: 5,
										message: "The \"b\" attribute has no value after \"=\".",
										start: 3
									}
								]
							}
						)
					}
				)
				it(
					"reports an attribute name cut off by the end of input",
					() => {
						expect(html("<a b")).toStrictEqual(
							{
								ast: [
									element_node(
										"<a b",
										"a",
										"open",
										[ attribute_node("b", "b") ]
									)
								],
								errors: [
									{
										end: 4,
										message: "The attribute name is not finished.",
										start: 3
									},
									{
										end: 4,
										message: "The start tag is not closed.",
										start: 0
									},
									{
										end: 4,
										message: "The \"a\" element is not closed.",
										start: 0
									}
								]
							}
						)
					}
				)
				it(
					"reports an unquoted attribute value cut off by the end of input",
					() => {
						expect(html("<a b=c")).toStrictEqual(
							{
								ast: [
									element_node(
										"<a b=c",
										"a",
										"open",
										[
											attribute_node(
												"b=c",
												"b",
												string_node("c", "unquoted")
											)
										]
									)
								],
								errors: [
									{
										end: 6,
										message: "The start tag is not closed.",
										start: 0
									},
									{
										end: 6,
										message: "The \"a\" element is not closed.",
										start: 0
									}
								]
							}
						)
					}
				)
				it(
					"reports an unterminated block inside an open tag",
					() => {
						expect(html("<a {></a>")).toStrictEqual(
							{
								ast: [
									element_node(
										"<a {></a>",
										"a",
										"open",
										[
											attribute_node(
												"{></a>",
												"",
												script_node("{></a>", "block")
											)
										]
									)
								],
								errors: [
									{
										end: 9,
										message: "The {…} block is not closed.",
										start: 3
									},
									{
										end: 9,
										message: "The start tag is not closed.",
										start: 0
									},
									{
										end: 9,
										message: "The \"a\" element is not closed.",
										start: 0
									}
								]
							}
						)
					}
				)
				it(
					"reports unterminated double and single quoted values",
					() => {
						expect(html("<a b=\"c>").errors).toStrictEqual(
							[
								{
									end: 8,
									message: "The double-quoted attribute value is not closed.",
									start: 5
								},
								{
									end: 8,
									message: "The start tag is not closed.",
									start: 0
								},
								{
									end: 8,
									message: "The \"a\" element is not closed.",
									start: 0
								}
							]
						)
						expect(html("<a b='c>").errors).toStrictEqual(
							[
								{
									end: 8,
									message: "The single-quoted attribute value is not closed.",
									start: 5
								},
								{
									end: 8,
									message: "The start tag is not closed.",
									start: 0
								},
								{
									end: 8,
									message: "The \"a\" element is not closed.",
									start: 0
								}
							]
						)
					}
				)
				it(
					"splits attributes that touch without whitespace",
					() => {
						expect(html("<a b={c}{d}></a>")).toStrictEqual(
							{
								ast: [
									element_node(
										"<a b={c}{d}></a>",
										"a",
										"open",
										[
											attribute_node(
												"b={c}",
												"b",
												script_node("{c}", "block")
											),
											attribute_node(
												"{d}",
												"",
												script_node("{d}", "block")
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
			"blocks",
			() => {
				it(
					"keeps a block that is never closed as Text, with the markup after it",
					() => {
						expect(
							html(
								"<p>{</p><p>don't</p><div class=\"later\"></div>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<p>{</p>",
										"p",
										"open",
										[],
										[ text_node("{") ]
									),
									element_node(
										"<p>don't</p>",
										"p",
										"open",
										[],
										[ text_node("don't") ]
									),
									element_node(
										"<div class=\"later\"></div>",
										"div",
										"open",
										[
											attribute_node(
												"class=\"later\"",
												"class",
												string_node("\"later\"", "double")
											)
										]
									)
								],
								errors: [
									{
										end: 4,
										message: "The {…} block is not closed.",
										start: 3
									}
								]
							}
						)
						expect(
							html(
								"```js\nconst o = {\n```\n\nIt's here.\n<p></p>"
							)
						).toStrictEqual(
							{
								ast: [
									text_node(
										"```js\nconst o = {\n```\n\nIt's here.\n"
									),
									element_node("<p></p>", "p", "open")
								],
								errors: [
									{
										end: 17,
										message: "The {…} block is not closed.",
										start: 16
									}
								]
							}
						)
					}
				)
				it(
					"keeps template comments and raw blocks as text",
					() => {
						const text = "{{!-- a {b} --}}{{! c' }}{# d' #}{% raw %}{{ e' }}{% endraw %}"
								+ "{%- comment \"x\" -%}<p class=\"y\">{% endcomment %}"
						expect(html(`${text}<i></i>`)).toStrictEqual(
							{
								ast: [
									text_node(text),
									element_node("<i></i>", "i", "open")
								],
								errors: []
							}
						)
						expect(html("{{!-- open' <b>")).toStrictEqual(
							{
								ast: [ text_node("{{!-- open' <b>") ],
								errors: []
							}
						)
						expect(
							html("<p>{#if a}{{!a}}{/if}</p>")
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<p>{#if a}{{!a}}{/if}</p>",
										"p",
										"open",
										[],
										[
											script_node("{#if a}", "block"),
											script_node("{{!a}}", "block"),
											script_node("{/if}", "block")
										]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"parses top-level curly braces as Script blocks between Text",
					() => {
						expect(html("a{b}c")).toStrictEqual(
							{
								ast: [
									text_node("a"),
									script_node("{b}", "block"),
									text_node("c")
								],
								errors: []
							}
						)
					}
				)
				it(
					"reports a block comment that is never closed",
					() => {
						expect(html("{a /* b}c")).toStrictEqual(
							{
								ast: [ text_node("{a /* b}c") ],
								errors: [
									{
										end: 1,
										message: "The {…} block is not closed.",
										start: 0
									}
								]
							}
						)
						expect(html("<p a=\"{a /* b}\">")).toStrictEqual(
							{
								ast: [
									element_node(
										"<p a=\"{a /* b}\">",
										"p",
										"open",
										[
											attribute_node(
												"a=\"{a /* b}\"",
												"a",
												string_node(
													"\"{a /* b}\"",
													"double",
													[
														script_node("{a /* b}", "block")
													]
												)
											)
										]
									)
								],
								errors: [
									{
										end: 14,
										message: "The {…} block is not closed.",
										start: 6
									}
								]
							}
						)
					}
				)
				it(
					"skips Mustache and Handlebars section close tags at the start of a block",
					() => {
						expect(
							html(
								"{{#unless a}}<p></p>{{/unless}}{{/admin.panel}}"
							)
						).toStrictEqual(
							{
								ast: [
									script_node("{{#unless a}}", "block"),
									element_node("<p></p>", "p", "open"),
									script_node("{{/unless}}", "block"),
									script_node("{{/admin.panel}}", "block")
								],
								errors: []
							}
						)
					}
				)
			}
		)
		describe(
			"elements",
			() => {
				it(
					"accepts whitespace before > in a close tag",
					() => {
						expect(html("<a></a >")).toStrictEqual(
							{
								ast: [
									element_node("<a></a >", "a", "open")
								],
								errors: []
							}
						)
					}
				)
				it(
					"closes an element at a close tag with a trailing slash",
					() => {
						expect(html("<p>a</p/>b")).toStrictEqual(
							{
								ast: [
									element_node(
										"<p>a</p/>",
										"p",
										"open",
										[],
										[ text_node("a") ]
									),
									text_node("b")
								],
								errors: []
							}
						)
					}
				)
				it.each(void_elements)(
					"does not look for a close tag after void element <%s>",
					name => {
						expect(html(`<div><${name}>a</div>`)).toStrictEqual(
							{
								ast: [
									element_node(
										`<div><${name}>a</div>`,
										"div",
										"open",
										[],
										[
											element_node(`<${name}>`, name, "open"),
											text_node("a")
										]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"ends a tag name at a newline or tab",
					() => {
						expect(
							html("<div\n\tclass=\"a\">b</div>")
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<div\n\tclass=\"a\">b</div>",
										"div",
										"open",
										[
											attribute_node(
												"class=\"a\"",
												"class",
												string_node("\"a\"", "double")
											)
										],
										[ text_node("b") ]
									)
								],
								errors: []
							}
						)
						expect(html("<p\tid=\"a\"></p\n>")).toStrictEqual(
							{
								ast: [
									element_node(
										"<p\tid=\"a\"></p\n>",
										"p",
										"open",
										[
											attribute_node(
												"id=\"a\"",
												"id",
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
					"implies the end of a p when another p starts",
					() => {
						expect(html("<p>a<p>b</p>")).toStrictEqual(
							{
								ast: [
									element_node(
										"<p>a",
										"p",
										"open",
										[],
										[ text_node("a") ]
									),
									element_node(
										"<p>b</p>",
										"p",
										"open",
										[],
										[ text_node("b") ]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"marks self-closed elements as closed with or without a space",
					() => {
						expect(html("<div/><p />")).toStrictEqual(
							{
								ast: [
									element_node("<div/>", "div", "closed"),
									element_node("<p />", "p", "closed")
								],
								errors: []
							}
						)
					}
				)
				it(
					"matches void elements case-insensitively",
					() => {
						expect(html("<div><BR>a</div>")).toStrictEqual(
							{
								ast: [
									element_node(
										"<div><BR>a</div>",
										"div",
										"open",
										[],
										[
											element_node("<BR>", "BR", "open"),
											text_node("a")
										]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"nests children between open and close tags",
					() => {
						expect(
							html(
								"<ul><li>a</li><li>b</li></ul>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<ul><li>a</li><li>b</li></ul>",
										"ul",
										"open",
										[],
										[
											element_node(
												"<li>a</li>",
												"li",
												"open",
												[],
												[ text_node("a") ]
											),
											element_node(
												"<li>b</li>",
												"li",
												"open",
												[],
												[ text_node("b") ]
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
					"nests elements that share a name, matching close tags case-insensitively",
					() => {
						expect(
							html("<DIV><div>a</DIV></div>")
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<DIV><div>a</DIV></div>",
										"DIV",
										"open",
										[],
										[
											element_node(
												"<div>a</DIV>",
												"div",
												"open",
												[],
												[ text_node("a") ]
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
					"reports a close tag without an open tag",
					() => {
						expect(html("a</div>")).toStrictEqual(
							{
								ast: [
									text_node("a"),
									element_node("</div>", "div", "close")
								],
								errors: [
									{
										end: 7,
										message: "The \"div\" close tag has no open element.",
										start: 1
									}
								]
							}
						)
					}
				)
				it(
					"reports a tag name cut off by the end of input",
					() => {
						expect(html("<div")).toStrictEqual(
							{
								ast: [
									element_node("<div", "div", "open")
								],
								errors: [
									{
										end: 4,
										message: "The start tag is not closed.",
										start: 0
									},
									{
										end: 4,
										message: "The \"div\" element is not closed.",
										start: 0
									}
								]
							}
						)
					}
				)
				it(
					"reports an element that is never closed",
					() => {
						expect(html("<div>a")).toStrictEqual(
							{
								ast: [
									element_node("<div>", "div", "open"),
									text_node("a")
								],
								errors: [
									{
										end: 5,
										message: "The \"div\" element is not closed.",
										start: 0
									}
								]
							}
						)
					}
				)
				it(
					"reports an open tag cut off by the end of input",
					() => {
						expect(html("<div a  ")).toStrictEqual(
							{
								ast: [
									element_node(
										"<div a  ",
										"div",
										"open",
										[ attribute_node("a", "a") ]
									)
								],
								errors: [
									{
										end: 8,
										message: "The start tag is not closed.",
										start: 0
									},
									{
										end: 8,
										message: "The \"div\" element is not closed.",
										start: 0
									}
								]
							}
						)
					}
				)
				it(
					"splits a tag name at a slash",
					() => {
						expect(html("<a/href=x>b</a>")).toStrictEqual(
							{
								ast: [
									element_node(
										"<a/href=x>b</a>",
										"a",
										"open",
										[
											attribute_node(
												"href=x",
												"href",
												string_node("x", "unquoted")
											)
										],
										[ text_node("b") ]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"treats <!DOCTYPE> as a void element with attributes",
					() => {
						expect(
							html(
								"<!DOCTYPE html>\n<html></html>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<!DOCTYPE html>",
										"!DOCTYPE",
										"open",
										[ attribute_node("html", "html") ]
									),
									text_node("\n"),
									element_node("<html></html>", "html", "open")
								],
								errors: []
							}
						)
						expect(html("<!doctype><p></p>")).toStrictEqual(
							{
								ast: [
									element_node("<!doctype>", "!doctype", "open"),
									element_node("<p></p>", "p", "open")
								],
								errors: []
							}
						)
					}
				)
				it(
					"treats a < that does not start a tag as text",
					() => {
						expect(html("<p>a < b <= c </ d</p>")).toStrictEqual(
							{
								ast: [
									element_node(
										"<p>a < b <= c </ d</p>",
										"p",
										"open",
										[],
										[ text_node("a < b <= c </ d") ]
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
			"foreign content",
			() => {
				it(
					"keeps foreign content in and after svg elements that are not integration points",
					() => {
						expect(
							html(
								"<svg><g><![CDATA[a]]></g><![CDATA[b]]></svg>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<svg><g><![CDATA[a]]></g><![CDATA[b]]></svg>",
										"svg",
										"open",
										[],
										[
											element_node(
												"<g><![CDATA[a]]></g>",
												"g",
												"open",
												[],
												[ text_node("<![CDATA[a]]>") ]
											),
											text_node("<![CDATA[b]]>")
										]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"keeps script and style as raw text inside svg",
					() => {
						expect(
							html(
								"<svg><style>a{b:c}</style><script>a<b</script></svg>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<svg><style>a{b:c}</style><script>a<b</script></svg>",
										"svg",
										"open",
										[],
										[
											element_node(
												"<style>a{b:c}</style>",
												"style",
												"open",
												[],
												[ style_node("a{b:c}") ]
											),
											element_node(
												"<script>a<b</script>",
												"script",
												"open",
												[],
												[ script_node("a<b", "content") ]
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
					[ "math", "svg" ].flatMap(
						root => text_content_elements.map(name => [ name, root ])
					)
				)(
					"parses markup in <%s> inside <%s>",
					(name, root) => {
						const content = `<${name}><b></b></${name}>`
						expect(
							html(
								`<${root}>${content}</${root}>`
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										`<${root}>${content}</${root}>`,
										root,
										"open",
										[],
										[
											element_node(
												content,
												name,
												"open",
												[],
												[
													element_node("<b></b>", "b", "open")
												]
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
					"parses markup in text content elements inside annotation-xml without an HTML encoding",
					() => {
						expect(
							html(
								"<math><annotation-xml encoding=x><xmp><b/></xmp></annotation-xml></math>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<math><annotation-xml encoding=x><xmp><b/></xmp></annotation-xml></math>",
										"math",
										"open",
										[],
										[
											element_node(
												"<annotation-xml encoding=x><xmp><b/></xmp></annotation-xml>",
												"annotation-xml",
												"open",
												[
													attribute_node(
														"encoding=x",
														"encoding",
														string_node("x", "unquoted")
													)
												],
												[
													element_node(
														"<xmp><b/></xmp>",
														"xmp",
														"open",
														[],
														[
															element_node("<b/>", "b", "closed")
														]
													)
												]
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
							"math",
							"annotation-xml",
							" encoding=\"text/html\"",
							[
								attribute_node(
									"encoding=\"text/html\"",
									"encoding",
									string_node("\"text/html\"", "double")
								)
							]
						],
						[
							"math",
							"annotation-xml",
							" encoding=TEXT/HTML",
							[
								attribute_node(
									"encoding=TEXT/HTML",
									"encoding",
									string_node("TEXT/HTML", "unquoted")
								)
							]
						],
						[
							"math",
							"annotation-xml",
							" encoding='application/xhtml+xml'",
							[
								attribute_node(
									"encoding='application/xhtml+xml'",
									"encoding",
									string_node(
										"'application/xhtml+xml'",
										"single"
									)
								)
							]
						],
						[ "math", "mi", "", [] ],
						[ "math", "mn", "", [] ],
						[ "math", "mo", "", [] ],
						[ "math", "ms", "", [] ],
						[ "math", "mtext", "", [] ],
						[ "svg", "desc", "", [] ],
						[ "svg", "foreignObject", "", [] ],
						[ "svg", "title", "", [] ]
					]
				)(
					"parses text content elements as raw text inside <%s><%s%s>",
					(
						root,
						name,
						attributes,
						attribute_nodes
					) => {
						const content = `<${name}${attributes}><xmp><b></xmp></${name}>`
						expect(
							html(
								`<${root}>${content}</${root}>`
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										`<${root}>${content}</${root}>`,
										root,
										"open",
										[],
										[
											element_node(
												content,
												name,
												"open",
												attribute_nodes,
												[
													element_node(
														"<xmp><b></xmp>",
														"xmp",
														"open",
														[],
														[ text_node("<b>") ]
													)
												]
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
					"returns to HTML content when svg and math close",
					() => {
						expect(
							html(
								"<svg><svg></svg><title><b/></title></svg><title><i></title>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<svg><svg></svg><title><b/></title></svg>",
										"svg",
										"open",
										[],
										[
											element_node("<svg></svg>", "svg", "open"),
											element_node(
												"<title><b/></title>",
												"title",
												"open",
												[],
												[
													element_node("<b/>", "b", "closed")
												]
											)
										]
									),
									element_node(
										"<title><i></title>",
										"title",
										"open",
										[],
										[ text_node("<i>") ]
									)
								],
								errors: []
							}
						)
						expect(
							html(
								"<MATH></math><title><u></title>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node("<MATH></math>", "MATH", "open"),
									element_node(
										"<title><u></title>",
										"title",
										"open",
										[],
										[ text_node("<u>") ]
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
			"frameworks",
			() => {
				it(
					"Alpine.js",
					() => {
						const result = html(
							"<div x-data=\"{ open: false, items: [ 1, 2 ] }\" class=\"a\" :class=\"{ 'b': open }\" "
								+ "@click.outside=\"open = false\">\n"
								+ "\t<template x-for=\"i in items\" :key=\"i\"><li class=\"c\" x-text=\"i\"></li></template>\n"
								+ "\t<p x-show=\"open && items.length > 1\" class=\"d\"></p>\n</div>"
						)
						expect(result.errors).toStrictEqual([])
						expect(element_names(result.ast)).toStrictEqual(
							[ "div", "template", "li", "p" ]
						)
						expect(class_attributes(result.ast)).toStrictEqual(
							[
								"class=\"a\"",
								"class=\"c\"",
								"class=\"d\""
							]
						)
					}
				)
				it(
					"Angular ICU expressions and @let",
					() => {
						const result = html(
							"@let total = items.length < 10 ? 'few' : \"many; really\";\n"
								+ "<span i18n>{count, plural, =0 {<b class=\"a\">none</b>} other {{{ count }} <i "
								+ "class=\"b\">items</i>}}</span>"
						)
						expect(result.errors).toStrictEqual([])
						expect(element_names(result.ast)).toStrictEqual([ "span", "b", "i" ])
						expect(class_attributes(result.ast)).toStrictEqual(
							[ "class=\"a\"", "class=\"b\"" ]
						)
					}
				)
				it(
					"Angular control flow",
					() => {
						const result = html(
							"@if (user.isLoggedIn) {\n\t<p class=\"a\">Hi {{ user.name }}</p>\n} @else {\n\t<p>Guest</p>\n}\n"
								+ "@for (item of items; track item.id) {\n\t<li>{{ item }}</li>\n}"
						)
						expect(element_names(result.ast)).toStrictEqual([ "p", "p", "li" ])
					}
				)
				it(
					"Blade",
					() => {
						const result = html(
							"@section('content')\n"
								+ "<div class=\"card {{ $active ? 'is-active' : '' }}\">\n"
								+ "\t@if ($user->isAdmin() && count($items) > 0)\n"
								+ "\t\t<span class=\"badge\">{{ __(\"Admin's panel\") }}</span>\n"
								+ "\t@endif\n"
								+ "\t@foreach ($items as $key => $item)\n"
								+ "\t\t<x-item class=\"item\" wire:key=\"{{ $key }}\">{!! $item->html !!}</x-item>\n"
								+ "\t@endforeach\n"
								+ "</div>\n"
								+ "@endsection"
						)
						expect(result.errors).toStrictEqual([])
						expect(element_names(result.ast)).toStrictEqual([ "div", "span", "x-item" ])
						expect(class_attributes(result.ast)).toStrictEqual(
							[
								"class=\"card {{ $active ? 'is-active' : '' }}\"",
								"class=\"badge\"",
								"class=\"item\""
							]
						)
					}
				)
				it(
					"ERB",
					() => {
						const result = html(
							"<% if @user.admin? && @items.size > 0 %>\n"
								+ "\t<div class=\"panel <%= @active ? \"on\" : \"off\" %>\">\n"
								+ "\t\t<%= link_to \"<b>Don't</b>\", root_path, class: \"btn\" %>\n"
								+ "\t\t<% @items.each do |item| %><li class=\"item\"><%= item.name %></li><% end %>\n"
								+ "\t</div>\n"
								+ "<% end %>\n"
								+ "<p class=\"footer\"><%# it's a comment %></p>"
						)
						expect(result.errors).toStrictEqual([])
						expect(element_names(result.ast)).toStrictEqual([ "div", "li", "p" ])
						expect(class_attributes(result.ast)).toStrictEqual(
							[
								"class=\"panel <%= @active ? \"on\" : \"off\" %>\"",
								"class=\"item\"",
								"class=\"footer\""
							]
						)
					}
				)
				it(
					"HTMX",
					() => {
						const result = html(
							"<button hx-post=\"/clicked\" hx-vals='{\"a\": 1}' hx-target=\"#out\" class=\"a\">Go</button>\n"
								+ "<div id=\"out\" hx-on::after-request=\"this.classList.add('x')\" class=\"b\"></div>"
						)
						expect(result.errors).toStrictEqual([])
						expect(element_names(result.ast)).toStrictEqual([ "button", "div" ])
						expect(class_attributes(result.ast)).toStrictEqual(
							[ "class=\"a\"", "class=\"b\"" ]
						)
					}
				)
				it(
					"Handlebars",
					() => {
						const result = html(
							"{{!-- it's a comment --}}\n"
								+ "<ul class=\"list\">\n"
								+ "\t{{#each items as |item|}}\n"
								+ "\t\t<li class=\"{{#if item.done}}done{{else}}todo{{/if}}\">{{item.name}}</li>\n"
								+ "\t{{else}}\n"
								+ "\t\t<li class=\"empty\">{{! don't show }}{{t \"none\"}}</li>\n"
								+ "\t{{/each}}\n"
								+ "</ul>\n"
								+ "<p class=\"after\">{{{raw_html}}}</p>"
						)
						expect(result.errors).toStrictEqual([])
						expect(element_names(result.ast)).toStrictEqual([ "ul", "li", "li", "p" ])
						expect(class_attributes(result.ast)).toStrictEqual(
							[
								"class=\"list\"",
								"class=\"{{#if item.done}}done{{else}}todo{{/if}}\"",
								"class=\"empty\"",
								"class=\"after\""
							]
						)
					}
				)
				it(
					"Hugo",
					() => {
						const result = html(
							"{{/* it's a comment */}}\n"
								+ "<article class=\"post\">\n"
								+ "\t{{- range .Pages -}}\n"
								+ "\t\t<h2 class=\"title\">{{ .Title | markdownify }}</h2>\n"
								+ "\t\t{{ with .Params.image }}<img class=\"cover\" src=\"{{ . }}\">{{ end }}\n"
								+ "\t{{- end -}}\n"
								+ "</article>"
						)
						expect(result.errors).toStrictEqual([])
						expect(element_names(result.ast)).toStrictEqual([ "article", "h2", "img" ])
						expect(class_attributes(result.ast)).toStrictEqual(
							[
								"class=\"post\"",
								"class=\"title\"",
								"class=\"cover\""
							]
						)
					}
				)
				it(
					"Jinja",
					() => {
						const result = html(
							"{# it's a comment #}\n"
								+ "<nav class=\"nav {{ 'active' if page == 'home' }}\">\n"
								+ "\t{% for item in items if item.visible %}\n"
								+ "\t\t<a class=\"link\" href=\"{{ url_for('page', slug=item.slug) }}\">"
								+ "{{ item.title|e }}</a>\n"
								+ "\t{% endfor %}\n"
								+ "\t{% raw %}{{ it's raw }}{% endraw %}\n"
								+ "</nav>\n"
								+ "{% set ratio = a / b %}<p class=\"ratio\">{{ ratio }}</p>"
						)
						expect(result.errors).toStrictEqual([])
						expect(element_names(result.ast)).toStrictEqual([ "nav", "a", "p" ])
						expect(class_attributes(result.ast)).toStrictEqual(
							[
								"class=\"nav {{ 'active' if page == 'home' }}\"",
								"class=\"link\"",
								"class=\"ratio\""
							]
						)
					}
				)
				it(
					"Liquid",
					() => {
						const result = html(
							"{% comment %} it's <p class=\"hidden\"> {% endcomment %}\n"
								+ "<div class=\"product {% if product.available %}in-stock{% endif %}\">\n"
								+ "\t{% assign price = product.price | divided_by: 100 %}\n"
								+ "\t<span class=\"price\">{{ price | money_with_currency }}</span>\n"
								+ "\t{% for variant in product.variants limit: 3 %}\n"
								+ "\t\t<button class=\"variant\" data-id=\"{{ variant.id }}\">{{ variant.title }}</button>\n"
								+ "\t{% endfor %}\n"
								+ "</div>"
						)
						expect(result.errors).toStrictEqual([])
						expect(element_names(result.ast)).toStrictEqual([ "div", "span", "button" ])
						expect(class_attributes(result.ast)).toStrictEqual(
							[
								"class=\"product {% if product.available %}in-stock{% endif %}\"",
								"class=\"price\"",
								"class=\"variant\""
							]
						)
					}
				)
				it(
					"PHP",
					() => {
						const result = html(
							"<?php\n"
								+ "$items = ['a' => 1, 'b' => 2];\n"
								+ "$html = \"<span class=\\\"inside-php\\\">\";\n"
								+ "?>\n"
								+ "<div class=\"wrap <?= $active ? \"on\" : \"off\" ?>\">\n"
								+ "\t<?php foreach ($items as $key => $value): ?>\n"
								+ "\t\t<li class=\"item\"><?= htmlspecialchars($value) ?></li>\n"
								+ "\t<?php endforeach; ?>\n"
								+ "\t<?php if ($a->b > 1): ?><p class=\"big\">x</p><?php endif; ?>\n"
								+ "</div>"
						)
						expect(result.errors).toStrictEqual([])
						expect(element_names(result.ast)).toStrictEqual([ "div", "li", "p" ])
						expect(class_attributes(result.ast)).toStrictEqual(
							[
								"class=\"wrap <?= $active ? \"on\" : \"off\" ?>\"",
								"class=\"item\"",
								"class=\"big\""
							]
						)
					}
				)
				it(
					"Svelte 5",
					() => {
						const result = html(
							"<script>\n\tlet { items, footer } = $props()\n</script>\n"
								+ "{#each items as item (item.id)}\n"
								+ "\t<li class=\"a {item.cls}\" class:active={item.on}>{item.name}</li>\n"
								+ "{:else}\n\t<p>none</p>\n{/each}\n"
								+ "{@render footer?.()}"
						)
						expect(result.errors).toStrictEqual([])
						expect(element_names(result.ast)).toStrictEqual([ "script", "li", "p" ])
						expect(
							collect(result.ast, "Attribute").map(node => node.text)
						).toStrictEqual(
							[
								"class=\"a {item.cls}\"",
								"class:active={item.on}"
							]
						)
					}
				)
				it(
					"Twig",
					() => {
						const result = html(
							"{# it's a comment #}\n"
								+ "<ul class=\"menu {{ app.request.get('_route') == 'home' ? 'is-home' }}\">\n"
								+ "\t{% for item in items|filter(i => i.visible) %}\n"
								+ "\t\t<li class=\"{{ loop.first ? 'first' }}\">{{ item.label|trans }}</li>\n"
								+ "\t{% endfor %}\n"
								+ "\t{% verbatim %}{{ it's verbatim }}{% endverbatim %}\n"
								+ "</ul>\n"
								+ "<p class=\"date\">{{ 'now'|date('Y/m/d') }}</p>"
						)
						expect(result.errors).toStrictEqual([])
						expect(element_names(result.ast)).toStrictEqual([ "ul", "li", "p" ])
						expect(class_attributes(result.ast)).toStrictEqual(
							[
								"class=\"menu {{ app.request.get('_route') == 'home' ? 'is-home' }}\"",
								"class=\"{{ loop.first ? 'first' }}\"",
								"class=\"date\""
							]
						)
					}
				)
				it(
					"Vue SFC",
					() => {
						const result = html(
							"<template>\n"
								+ "\t<div :class=\"{ active: isOn }\" v-if=\"a > b\" @click=\"go('x')\">{{ msg }}</div>\n"
								+ "</template>\n"
								+ "<script setup lang=\"ts\">\nconst msg = ref<string>('hi')\n</script>"
						)
						expect(result.errors).toStrictEqual([])
						expect(element_names(result.ast)).toStrictEqual(
							[ "template", "div", "script" ]
						)
						expect(
							collect(result.ast, "Attribute").map(node => node.name)
						).toStrictEqual(
							[
								":class",
								"v-if",
								"@click",
								"setup",
								"lang"
							]
						)
					}
				)
				it(
					"Vue SFC with Pug",
					() => {
						const result = html(
							"<template lang=\"pug\">\n"
								+ "  div.app(:class=\"{ active: isOn }\")\n"
								+ "    p(class=\"lead\" v-if=\"a > b\") {{ msg }}\n"
								+ "</template>\n"
								+ "<script setup>\nconst msg = ref('hi')\n</script>"
						)
						expect(result.errors).toStrictEqual([])
						expect(element_names(result.ast)).toStrictEqual(
							[ "template", "div", "p", "script" ]
						)
						expect(class_attributes(result.ast)).toStrictEqual([ ".app", "class=\"lead\"" ])
					}
				)
			}
		)
		describe(
			"input",
			() => {
				it(
					"builds deep element trees without recursion",
					() => {
						const depth = 20000
						const result = parseHtml(
							"<div>".repeat(depth) + "</div>".repeat(depth),
							true
						)
						expect(result.errors).toStrictEqual([])
						let levels = 0
						for (let node = result.ast[0]; node?.type == "Element"; node = node.children[0]) levels++
						expect(levels).toBe(depth)
					}
				)
				it(
					"omits text on every node unless include_text is set",
					() => {
						const source = "<a b=\"{c}\" {d}>'{`${e}`}'<script>\"f\"</script><style>g</style></a>"
						const result = parseHtml(source)
						check_invariants(source, result, false)
						expect(result.errors).toStrictEqual([])
					}
				)
				it(
					"reports every element of a deep unclosed tree as a sibling",
					() => {
						const depth = 20000
						const result = parseHtml("<div>".repeat(depth))
						expect(result.ast).toHaveLength(depth)
						expect(result.errors).toHaveLength(depth)
					}
				)
				it(
					"reports exact start/end for every node",
					() => {
						expect(
							parseHtml("a<p x=\"{y}\">b</p>")
						).toStrictEqual(
							{
								ast: [
									{ end: 1, start: 0, type: "Text" },
									{
										attributes: [
											{
												end: 11,
												name: "x",
												start: 4,
												type: "Attribute",
												value: {
													end: 11,
													scripts: [
														{
															end: 10,
															start: 7,
															strings: [],
															subType: "block",
															type: "Script"
														}
													],
													start: 6,
													subType: "double",
													type: "String"
												}
											}
										],
										children: [
											{ end: 13, start: 12, type: "Text" }
										],
										end: 17,
										name: "p",
										start: 1,
										subType: "open",
										type: "Element"
									}
								],
								errors: []
							}
						)
					}
				)
				it(
					"reports input nested too deeply instead of throwing, keeping the nodes before it",
					() => {
						expect(
							html(`<p></p>${"{".repeat(100000)}`)
						).toStrictEqual(
							{
								ast: [
									element_node("<p></p>", "p", "open"),
									text_node("{".repeat(100000))
								],
								errors: [
									{
										end: 100007,
										message: "The input is nested too deeply.",
										start: 7
									}
								]
							}
						)
					}
				)
				it(
					"reports input that is not a string instead of throwing",
					() => {
						check_non_string_input(parseHtml)
					}
				)
				it(
					"returns a single Text for plain text",
					() => {
						expect(html("hello\nworld")).toStrictEqual(
							{
								ast: [ text_node("hello\nworld") ],
								errors: []
							}
						)
					}
				)
				it(
					"returns nothing for empty input",
					() => {
						expect(html("")).toStrictEqual({ ast: [], errors: [] })
					}
				)
			}
		)
		describe(
			"markup declarations",
			() => {
				it(
					"parses PHP and ERB tags as comments that end at ?> and %>",
					() => {
						expect(
							html(
								"<?php $a->b ?><% if a > b %>x<%= \"<p>\" %><i></i><?php $c = ['d' => '<e>'];"
							)
						).toStrictEqual(
							{
								ast: [
									comment_node("<?php $a->b ?>"),
									comment_node("<% if a > b %>"),
									text_node("x"),
									comment_node("<%= \"<p>\" %>"),
									element_node("<i></i>", "i", "open"),
									comment_node("<?php $c = ['d' => '<e>'];")
								],
								errors: []
							}
						)
						expect(html("a <% b > c")).toStrictEqual(
							{
								ast: [ text_node("a <% b > c") ],
								errors: []
							}
						)
					}
				)
				it(
					"parses comments as Comment nodes",
					() => {
						expect(
							html(
								"<!-- <div> it's {x -->\n<p><!----><!--></p>"
							)
						).toStrictEqual(
							{
								ast: [
									comment_node("<!-- <div> it's {x -->"),
									text_node("\n"),
									element_node(
										"<p><!----><!--></p>",
										"p",
										"open",
										[],
										[
											comment_node("<!---->"),
											comment_node("<!-->")
										]
									)
								],
								errors: []
							}
						)
						expect(html("<!-- a --!>b")).toStrictEqual(
							{
								ast: [
									comment_node("<!-- a --!>"),
									text_node("b")
								],
								errors: []
							}
						)
					}
				)
				it(
					"parses processing instructions, bogus comments and HTML CDATA as Comment and SVG CDATA as Text",
					() => {
						expect(
							html(
								"<?xml version=\"1.0\"?><!foo bar><b><![CDATA[a > b]]></b>"
										+ "<svg><![CDATA[a < b > c]]></svg><!doctype html>"
							)
						).toStrictEqual(
							{
								ast: [
									comment_node("<?xml version=\"1.0\"?>"),
									comment_node("<!foo bar>"),
									element_node(
										"<b><![CDATA[a > b]]></b>",
										"b",
										"open",
										[],
										[
											comment_node("<![CDATA[a >"),
											text_node(" b]]>")
										]
									),
									element_node(
										"<svg><![CDATA[a < b > c]]></svg>",
										"svg",
										"open",
										[],
										[
											text_node("<![CDATA[a < b > c]]>")
										]
									),
									element_node(
										"<!doctype html>",
										"!doctype",
										"open",
										[ attribute_node("html", "html") ]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"reports CDATA and bogus comments that are never closed",
					() => {
						expect(html("<![CDATA[x")).toStrictEqual(
							{
								ast: [ comment_node("<![CDATA[x") ],
								errors: [
									{
										end: 10,
										message: "The comment is not closed with \">\".",
										start: 0
									}
								]
							}
						)
						expect(html("<svg><![CDATA[x>")).toStrictEqual(
							{
								ast: [
									element_node("<svg>", "svg", "open"),
									text_node("<![CDATA[x>")
								],
								errors: [
									{
										end: 16,
										message: "The CDATA section is not closed with \"]]>\".",
										start: 5
									},
									{
										end: 5,
										message: "The \"svg\" element is not closed.",
										start: 0
									}
								]
							}
						)
						expect(html("<?x")).toStrictEqual(
							{
								ast: [ comment_node("<?x") ],
								errors: [
									{
										end: 3,
										message: "The comment is not closed with \">\".",
										start: 0
									}
								]
							}
						)
					}
				)
				it(
					"reports a comment that is never closed",
					() => {
						expect(html("<p><!-- a")).toStrictEqual(
							{
								ast: [
									element_node(
										"<p><!-- a",
										"p",
										"open",
										[],
										[ comment_node("<!-- a") ]
									)
								],
								errors: [
									{
										end: 9,
										message: "The comment is not closed with \"-->\".",
										start: 3
									}
								]
							}
						)
					}
				)
			}
		)
		it(
			"matches the README example",
			() => {
				const { expected, source } = readme_example("parseHtml")
				expect(
					JSON.parse(
						JSON.stringify(parseHtml(source))
					)
				).toStrictEqual(expected)
			}
		)
		describe(
			"optional end tags",
			() => {
				it.each(implied_end_tag_cases)(
					"closes an open <%s> when <%s> starts",
					(name, start_tag) => {
						const source = `<x-root><${name}>a<${start_tag}>b</x-root>`
						expect(html(source)).toStrictEqual(
							{
								ast: [
									element_node(
										source,
										"x-root",
										"open",
										[],
										[
											element_node(
												`<${name}>a`,
												name,
												"open",
												[],
												[ text_node("a") ]
											),
											element_node(
												`<${start_tag}>b`,
												start_tag,
												"open",
												[],
												[ text_node("b") ]
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
						"address",
						"article",
						"aside",
						"blockquote",
						"center",
						"details",
						"dialog",
						"dir",
						"div",
						"dl",
						"fieldset",
						"figcaption",
						"figure",
						"footer",
						"form",
						"h1",
						"h2",
						"h3",
						"h4",
						"h5",
						"h6",
						"header",
						"hgroup",
						"hr",
						"listing",
						"main",
						"menu",
						"nav",
						"ol",
						"p",
						"plaintext",
						"pre",
						"search",
						"section",
						"summary",
						"table",
						"ul",
						"xmp"
					]
				)(
					"closes an open p when <%s> starts",
					name => {
						const element = name == "hr" || name == "plaintext"
							? `<${name}>`
							: `<${name}></${name}>`
						expect(html(`<p>a${element}`)).toStrictEqual(
							{
								ast: [
									element_node(
										"<p>a",
										"p",
										"open",
										[],
										[ text_node("a") ]
									),
									element_node(element, name, "open")
								],
								errors: []
							}
						)
					}
				)
				it(
					"closes an open p or li when a self-closed element starts",
					() => {
						expect(html("<p>a<hr/>b")).toStrictEqual(
							{
								ast: [
									element_node(
										"<p>a",
										"p",
										"open",
										[],
										[ text_node("a") ]
									),
									element_node("<hr/>", "hr", "closed"),
									text_node("b")
								],
								errors: []
							}
						)
						expect(html("<ul><li>a<li/>b</ul>")).toStrictEqual(
							{
								ast: [
									element_node(
										"<ul><li>a<li/>b</ul>",
										"ul",
										"open",
										[],
										[
											element_node(
												"<li>a",
												"li",
												"open",
												[],
												[ text_node("a") ]
											),
											element_node("<li/>", "li", "closed"),
											text_node("b")
										]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"closes definition terms and descriptions",
					() => {
						expect(
							html("<dl><dt>a<dd>b<dt>c</dl>")
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<dl><dt>a<dd>b<dt>c</dl>",
										"dl",
										"open",
										[],
										[
											element_node(
												"<dt>a",
												"dt",
												"open",
												[],
												[ text_node("a") ]
											),
											element_node(
												"<dd>b",
												"dd",
												"open",
												[],
												[ text_node("b") ]
											),
											element_node(
												"<dt>c",
												"dt",
												"open",
												[],
												[ text_node("c") ]
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
					"closes elements with optional end tags at the end of the input",
					() => {
						expect(html("<ul><li>a")).toStrictEqual(
							{
								ast: [
									element_node("<ul>", "ul", "open"),
									element_node(
										"<li>a",
										"li",
										"open",
										[],
										[ text_node("a") ]
									)
								],
								errors: [
									{
										end: 4,
										message: "The \"ul\" element is not closed.",
										start: 0
									}
								]
							}
						)
					}
				)
				it(
					"closes head, body and html",
					() => {
						expect(
							html(
								"<html><head><title>t</title><body><p>x</html>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<html><head><title>t</title><body><p>x</html>",
										"html",
										"open",
										[],
										[
											element_node(
												"<head><title>t</title>",
												"head",
												"open",
												[],
												[
													element_node(
														"<title>t</title>",
														"title",
														"open",
														[],
														[ text_node("t") ]
													)
												]
											),
											element_node(
												"<body><p>x",
												"body",
												"open",
												[],
												[
													element_node(
														"<p>x",
														"p",
														"open",
														[],
														[ text_node("x") ]
													)
												]
											)
										]
									)
								],
								errors: []
							}
						)
						expect(html("<html><body>a")).toStrictEqual(
							{
								ast: [
									element_node(
										"<html><body>a",
										"html",
										"open",
										[],
										[
											element_node(
												"<body>a",
												"body",
												"open",
												[],
												[ text_node("a") ]
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
					"closes list items, including inside nested lists",
					() => {
						expect(
							html(
								"<ul><li>a<ul><li>b</ul><li>c</ul>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<ul><li>a<ul><li>b</ul><li>c</ul>",
										"ul",
										"open",
										[],
										[
											element_node(
												"<li>a<ul><li>b</ul>",
												"li",
												"open",
												[],
												[
													text_node("a"),
													element_node(
														"<ul><li>b</ul>",
														"ul",
														"open",
														[],
														[
															element_node(
																"<li>b",
																"li",
																"open",
																[],
																[ text_node("b") ]
															)
														]
													)
												]
											),
											element_node(
												"<li>c",
												"li",
												"open",
												[],
												[ text_node("c") ]
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
					"closes options and option groups",
					() => {
						const source = "<select><optgroup><option>a<option>b<optgroup><option>c</select>"
						expect(html(source)).toStrictEqual(
							{
								ast: [
									element_node(
										source,
										"select",
										"open",
										[],
										[
											element_node(
												"<optgroup><option>a<option>b",
												"optgroup",
												"open",
												[],
												[
													element_node(
														"<option>a",
														"option",
														"open",
														[],
														[ text_node("a") ]
													),
													element_node(
														"<option>b",
														"option",
														"open",
														[],
														[ text_node("b") ]
													)
												]
											),
											element_node(
												"<optgroup><option>c",
												"optgroup",
												"open",
												[],
												[
													element_node(
														"<option>c",
														"option",
														"open",
														[],
														[ text_node("c") ]
													)
												]
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
					"closes ruby annotations, keeping rtc open across rp and rt",
					() => {
						expect(
							html(
								"<ruby>a<rb>b<rt>c<rtc>d<rp>e</ruby>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<ruby>a<rb>b<rt>c<rtc>d<rp>e</ruby>",
										"ruby",
										"open",
										[],
										[
											text_node("a"),
											element_node(
												"<rb>b",
												"rb",
												"open",
												[],
												[ text_node("b") ]
											),
											element_node(
												"<rt>c",
												"rt",
												"open",
												[],
												[ text_node("c") ]
											),
											element_node(
												"<rtc>d<rp>e",
												"rtc",
												"open",
												[],
												[
													text_node("d"),
													element_node(
														"<rp>e",
														"rp",
														"open",
														[],
														[ text_node("e") ]
													)
												]
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
					"closes table rows and cells when a caption starts",
					() => {
						expect(
							html(
								"<table><tr><td>a<caption>b</table>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<table><tr><td>a<caption>b</table>",
										"table",
										"open",
										[],
										[
											element_node(
												"<tr><td>a",
												"tr",
												"open",
												[],
												[
													element_node(
														"<td>a",
														"td",
														"open",
														[],
														[ text_node("a") ]
													)
												]
											),
											element_node(
												"<caption>b",
												"caption",
												"open",
												[],
												[ text_node("b") ]
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
					"closes table rows, cells and sections",
					() => {
						const source = "<table><caption>a<colgroup><thead><tr><th>b<td>c"
								+ "<tbody><tr><td>d<th>e<tfoot><tr><td>f</table>"
						expect(html(source)).toStrictEqual(
							{
								ast: [
									element_node(
										source,
										"table",
										"open",
										[],
										[
											element_node(
												"<caption>a",
												"caption",
												"open",
												[],
												[ text_node("a") ]
											),
											element_node("<colgroup>", "colgroup", "open"),
											element_node(
												"<thead><tr><th>b<td>c",
												"thead",
												"open",
												[],
												[
													element_node(
														"<tr><th>b<td>c",
														"tr",
														"open",
														[],
														[
															element_node(
																"<th>b",
																"th",
																"open",
																[],
																[ text_node("b") ]
															),
															element_node(
																"<td>c",
																"td",
																"open",
																[],
																[ text_node("c") ]
															)
														]
													)
												]
											),
											element_node(
												"<tbody><tr><td>d<th>e",
												"tbody",
												"open",
												[],
												[
													element_node(
														"<tr><td>d<th>e",
														"tr",
														"open",
														[],
														[
															element_node(
																"<td>d",
																"td",
																"open",
																[],
																[ text_node("d") ]
															),
															element_node(
																"<th>e",
																"th",
																"open",
																[],
																[ text_node("e") ]
															)
														]
													)
												]
											),
											element_node(
												"<tfoot><tr><td>f",
												"tfoot",
												"open",
												[],
												[
													element_node(
														"<tr><td>f",
														"tr",
														"open",
														[],
														[
															element_node(
																"<td>f",
																"td",
																"open",
																[],
																[ text_node("f") ]
															)
														]
													)
												]
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
					"keeps a p open across an element whose end tag is required",
					() => {
						expect(
							html("<p><b>c<div>d</div></b></p>")
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<p><b>c<div>d</div></b></p>",
										"p",
										"open",
										[],
										[
											element_node(
												"<b>c<div>d</div></b>",
												"b",
												"open",
												[],
												[
													text_node("c"),
													element_node(
														"<div>d</div>",
														"div",
														"open",
														[],
														[ text_node("d") ]
													)
												]
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
					"reports elements without optional end tags left open when an outer element closes",
					() => {
						expect(html("<div><span>a<b>b</div>")).toStrictEqual(
							{
								ast: [
									element_node(
										"<div><span>a<b>b</div>",
										"div",
										"open",
										[],
										[
											element_node("<span>", "span", "open"),
											text_node("a"),
											element_node("<b>", "b", "open"),
											text_node("b")
										]
									)
								],
								errors: [
									{
										end: 15,
										message: "The \"b\" element is not closed.",
										start: 12
									},
									{
										end: 11,
										message: "The \"span\" element is not closed.",
										start: 5
									}
								]
							}
						)
					}
				)
			}
		)
		describe(
			"pug templates",
			() => {
				it(
					"keeps other template languages as HTML",
					() => {
						expect(
							html(
								"<template lang=\"html\"><p>a</p></template>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<template lang=\"html\"><p>a</p></template>",
										"template",
										"open",
										[
											attribute_node(
												"lang=\"html\"",
												"lang",
												string_node("\"html\"", "double")
											)
										],
										[
											element_node(
												"<p>a</p>",
												"p",
												"open",
												[],
												[ text_node("a") ]
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
					"maps positions in CRLF input and reports errors inside the template",
					() => {
						expect(
							html(
								"<template lang=\"pug\">\r\n  p(class=\"a\r\n</template>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<template lang=\"pug\">\r\n  p(class=\"a\r\n</template>",
										"template",
										"open",
										[
											attribute_node(
												"lang=\"pug\"",
												"lang",
												string_node("\"pug\"", "double")
											)
										],
										[
											element_node(
												"p(class=\"a\r\n",
												"p",
												"open",
												[
													attribute_node(
														"class=\"a\r\n",
														"class",
														string_node("\"a\r\n", "double")
													)
												]
											)
										]
									)
								],
								errors: [
									{
										end: 37,
										message: "The input ended before the closing \")\".",
										start: 26
									},
									{
										end: 37,
										message: "The double-quoted string is not closed.",
										start: 33
									}
								]
							}
						)
					}
				)
				it(
					"parses the content as Pug after removing its common indentation",
					() => {
						expect(
							html(
								"<template lang=\"pug\">\n  ul.list\n    li(class=\"a\") b\n</template>\n<p>c</p>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<template lang=\"pug\">\n  ul.list\n    li(class=\"a\") b\n</template>",
										"template",
										"open",
										[
											attribute_node(
												"lang=\"pug\"",
												"lang",
												string_node("\"pug\"", "double")
											)
										],
										[
											element_node(
												"ul.list\n    li(class=\"a\") b",
												"ul",
												"open",
												[
													attribute_node(
														".list",
														"class",
														string_node("list", "unquoted")
													)
												],
												[
													element_node(
														"li(class=\"a\") b",
														"li",
														"open",
														[
															attribute_node(
																"class=\"a\"",
																"class",
																string_node("\"a\"", "double")
															)
														],
														[ text_node("b") ]
													)
												]
											)
										]
									),
									text_node("\n"),
									element_node(
										"<p>c</p>",
										"p",
										"open",
										[],
										[ text_node("c") ]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"reads jade and unquoted or uppercase lang attributes",
					() => {
						expect(
							html(
								"<template LANG=Jade>\np.x</template>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<template LANG=Jade>\np.x</template>",
										"template",
										"open",
										[
											attribute_node(
												"LANG=Jade",
												"LANG",
												string_node("Jade", "unquoted")
											)
										],
										[
											element_node(
												"p.x",
												"p",
												"open",
												[
													attribute_node(
														".x",
														"class",
														string_node("x", "unquoted")
													)
												]
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
					"reports a pug template that is never closed",
					() => {
						expect(
							html(
								"<template lang=\"pug\">\np hi"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<template lang=\"pug\">\np hi",
										"template",
										"open",
										[
											attribute_node(
												"lang=\"pug\"",
												"lang",
												string_node("\"pug\"", "double")
											)
										],
										[
											element_node(
												"p hi",
												"p",
												"open",
												[],
												[ text_node("hi") ]
											)
										]
									)
								],
								errors: [
									{
										end: 26,
										message: "The \"template\" element is not closed.",
										start: 21
									}
								]
							}
						)
					}
				)
			}
		)
		describe(
			"script and style elements",
			() => {
				it(
					"collects strings and templates from script content",
					() => {
						const content = "let a = 'b' + \"c\" + `d${e ? \"f\" : 'g'}`"
						expect(
							html(`<script>${content}</script>`)
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
												[
													string_node("'b'", "single"),
													string_node("\"c\"", "double"),
													string_node(
														"`d${e ? \"f\" : 'g'}`",
														"backtick",
														[
															script_node(
																"${e ? \"f\" : 'g'}",
																"template",
																[
																	string_node("\"f\"", "double"),
																	string_node("'g'", "single")
																]
															)
														]
													)
												]
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
					"does not read content after a self-closed script element",
					() => {
						expect(html("<script/><p>a</p>")).toStrictEqual(
							{
								ast: [
									element_node("<script/>", "script", "closed"),
									element_node(
										"<p>a</p>",
										"p",
										"open",
										[],
										[ text_node("a") ]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"does not track braces in script content",
					() => {
						expect(
							html("<script>{</script><p>a</p>")
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<script>{</script>",
										"script",
										"open",
										[],
										[ script_node("{", "content") ]
									),
									element_node(
										"<p>a</p>",
										"p",
										"open",
										[],
										[ text_node("a") ]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"ends script content at the first </script>, even inside a string or comment",
					() => {
						expect(
							html(
								"<script>a = \"</script>\"</script>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<script>a = \"</script>",
										"script",
										"open",
										[],
										[
											script_node(
												"a = \"",
												"content",
												[ string_node("\"", "double") ]
											)
										]
									),
									text_node("\""),
									element_node("</script>", "script", "close")
								],
								errors: [
									{
										end: 13,
										message: "The double-quoted string is not closed.",
										start: 12
									},
									{
										end: 32,
										message: "The \"script\" close tag has no open element.",
										start: 23
									}
								]
							}
						)
						expect(html("<script>// </script>")).toStrictEqual(
							{
								ast: [
									element_node(
										"<script>// </script>",
										"script",
										"open",
										[],
										[ script_node("// ", "content") ]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"flattens strings from nested blocks in script content",
					() => {
						expect(
							html(
								"<script>function f() { return { a: \"b\" } }</script>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<script>function f() { return { a: \"b\" } }</script>",
										"script",
										"open",
										[],
										[
											script_node(
												"function f() { return { a: \"b\" } }",
												"content",
												[ string_node("\"b\"", "double") ]
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
					"keeps markup-like text in script content out of the tree",
					() => {
						expect(
							html(
								"<div><script>a = \"</div>\" < b</script></div>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<div><script>a = \"</div>\" < b</script></div>",
										"div",
										"open",
										[],
										[
											element_node(
												"<script>a = \"</div>\" < b</script>",
												"script",
												"open",
												[],
												[
													script_node(
														"a = \"</div>\" < b",
														"content",
														[
															string_node("\"</div>\"", "double")
														]
													)
												]
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
					"keeps style content as a single Style node",
					() => {
						const content = ".a { content: \"}\" } [b] main:after { c: '{' }"
						expect(
							html(`<style>${content}</style>`)
						).toStrictEqual(
							{
								ast: [
									element_node(
										`<style>${content}</style>`,
										"style",
										"open",
										[],
										[ style_node(content) ]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"parses attributes on script elements",
					() => {
						expect(
							html(
								"<script type=\"module\">a</script>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<script type=\"module\">a</script>",
										"script",
										"open",
										[
											attribute_node(
												"type=\"module\"",
												"type",
												string_node("\"module\"", "double")
											)
										],
										[ script_node("a", "content") ]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"parses attributes on style elements",
					() => {
						expect(
							html(
								"<style media=\"print\">a{}</style>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<style media=\"print\">a{}</style>",
										"style",
										"open",
										[
											attribute_node(
												"media=\"print\"",
												"media",
												string_node("\"print\"", "double")
											)
										],
										[ style_node("a{}") ]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"produces an empty Style for an empty style element",
					() => {
						expect(html("<style></style>")).toStrictEqual(
							{
								ast: [
									element_node(
										"<style></style>",
										"style",
										"open",
										[],
										[ style_node("") ]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"produces an empty content Script for an empty script element",
					() => {
						expect(html("<script></script>")).toStrictEqual(
							{
								ast: [
									element_node(
										"<script></script>",
										"script",
										"open",
										[],
										[ script_node("", "content") ]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"reports script and style content that is never closed",
					() => {
						expect(html("<script>let a = \"b\"")).toStrictEqual(
							{
								ast: [
									element_node(
										"<script>let a = \"b\"",
										"script",
										"open",
										[],
										[
											script_node(
												"let a = \"b\"",
												"content",
												[ string_node("\"b\"", "double") ]
											)
										]
									)
								],
								errors: [
									{
										end: 19,
										message: "The \"script\" element is not closed.",
										start: 8
									}
								]
							}
						)
						expect(html("<style>a{}")).toStrictEqual(
							{
								ast: [
									element_node(
										"<style>a{}",
										"style",
										"open",
										[],
										[ style_node("a{}") ]
									)
								],
								errors: [
									{
										end: 10,
										message: "The \"style\" element is not closed.",
										start: 7
									}
								]
							}
						)
					}
				)
				it(
					"reports stray script and style close tags",
					() => {
						expect(html("</script></style>")).toStrictEqual(
							{
								ast: [
									element_node("</script>", "script", "close"),
									element_node("</style>", "style", "close")
								],
								errors: [
									{
										end: 9,
										message: "The \"script\" close tag has no open element.",
										start: 0
									},
									{
										end: 17,
										message: "The \"style\" close tag has no open element.",
										start: 9
									}
								]
							}
						)
					}
				)
				it(
					"skips HTML-like comments in classic script content",
					() => {
						const content = "<!-- don't\nvar a = \"b\";\n--> it's\nc = d-->0 / \"'\"\ne = f-->\"'\""
						expect(
							html(
								`<script>${content}</script><p>x</p>`
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
												[
													string_node("\"b\"", "double"),
													string_node("\"'\"", "double"),
													string_node("\"'\"", "double")
												]
											)
										]
									),
									element_node(
										"<p>x</p>",
										"p",
										"open",
										[],
										[ text_node("x") ]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"skips JS comments and regular expressions in script content",
					() => {
						const content = "// don't\n/* it's */ let a = /\"[/']/g, b = c / d / \"e\""
						expect(
							html(
								`<script>${content}</script><p>a</p>`
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
												[ string_node("\"e\"", "double") ]
											)
										]
									),
									element_node(
										"<p>a</p>",
										"p",
										"open",
										[],
										[ text_node("a") ]
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
			"script syntax",
			() => {
				it.each(script_syntax_cases)(
					"%s",
					(_, code, strings) => {
						expect(html(code)).toStrictEqual(
							{
								ast: [
									script_node(code, "block", strings)
								],
								errors: []
							}
						)
					}
				)
				it.each(script_syntax_error_cases)(
					"reports %s",
					(_, code, strings, errors) => {
						const source = `<a ${code}`
						expect(html(source)).toStrictEqual(
							{
								ast: [
									element_node(
										source,
										"a",
										"open",
										[
											attribute_node(
												code,
												"",
												script_node(code, "block", strings)
											)
										]
									)
								],
								errors: [
									...errors.map(
										error => ({
											...error,
											end: error.end + 3,
											start: error.start + 3
										})
									),
									{
										end: source.length,
										message: "The start tag is not closed.",
										start: 0
									},
									{
										end: source.length,
										message: "The \"a\" element is not closed.",
										start: 0
									}
								]
							}
						)
					}
				)
			}
		)
		describe(
			"svelte",
			() => {
				it(
					"parses block tags followed by markup on the same line",
					() => {
						expect(
							html(
								"<ul>{#each items as item, i (item.id)}<li>{item}</li>{/each}</ul>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<ul>{#each items as item, i (item.id)}<li>{item}</li>{/each}</ul>",
										"ul",
										"open",
										[],
										[
											script_node(
												"{#each items as item, i (item.id)}",
												"block"
											),
											element_node(
												"<li>{item}</li>",
												"li",
												"open",
												[],
												[ script_node("{item}", "block") ]
											),
											script_node("{/each}", "block")
										]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"parses blocks, values and strings with empty curly braces in attributes",
					() => {
						expect(
							html(
								"<custom {} a={} b=\"{}\">x</custom>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<custom {} a={} b=\"{}\">x</custom>",
										"custom",
										"open",
										[
											attribute_node(
												"{}",
												"",
												script_node("{}", "block")
											),
											attribute_node(
												"a={}",
												"a",
												script_node("{}", "block")
											),
											attribute_node(
												"b=\"{}\"",
												"b",
												string_node(
													"\"{}\"",
													"double",
													[ script_node("{}", "block") ]
												)
											)
										],
										[ text_node("x") ]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"parses directives and attachments with JavaScript values",
					() => {
						const source = "<input pattern={/^[']+$/}"
								+ " on:input={e => v = e.target.value.replace(/'/g, \"\")}"
								+ " class:active={a > b} {@attach tip} style:--c={\"x\"} use:act={{ a: '}' }} />"
						expect(html(source)).toStrictEqual(
							{
								ast: [
									element_node(
										source,
										"input",
										"closed",
										[
											attribute_node(
												"pattern={/^[']+$/}",
												"pattern",
												script_node("{/^[']+$/}", "block")
											),
											attribute_node(
												"on:input={e => v = e.target.value.replace(/'/g, \"\")}",
												"on:input",
												script_node(
													"{e => v = e.target.value.replace(/'/g, \"\")}",
													"block",
													[ string_node("\"\"", "double") ]
												)
											),
											attribute_node(
												"class:active={a > b}",
												"class:active",
												script_node("{a > b}", "block")
											),
											attribute_node(
												"{@attach tip}",
												"",
												script_node("{@attach tip}", "block")
											),
											attribute_node(
												"style:--c={\"x\"}",
												"style:--c",
												script_node(
													"{\"x\"}",
													"block",
													[ string_node("\"x\"", "double") ]
												)
											),
											attribute_node(
												"use:act={{ a: '}' }}",
												"use:act",
												script_node(
													"{{ a: '}' }}",
													"block",
													[ string_node("'}'", "single") ]
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
				it.each(
					[
						"#await",
						"#each",
						"#if",
						"#key",
						"#snippet",
						"/await",
						"/each",
						"/if",
						"/key",
						"/snippet",
						":catch",
						":else",
						":else if",
						":then",
						"@attach",
						"@const",
						"@debug",
						"@html",
						"@render"
					]
				)(
					"starts an expression right after the {%s tag",
					tag => {
						expect(html(`{${tag} /'/}<p/>`)).toStrictEqual(
							{
								ast: [
									script_node(`{${tag} /'/}`, "block"),
									element_node("<p/>", "p", "closed")
								],
								errors: []
							}
						)
					}
				)
			}
		)
		describe(
			"text content elements",
			() => {
				it(
					"ends raw text at close tags in any case and with trailing whitespace",
					() => {
						expect(
							html(
								"<Script>a</SCRIPT ><STYLE>b</style\n><p>c</p>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<Script>a</SCRIPT >",
										"Script",
										"open",
										[],
										[ script_node("a", "content") ]
									),
									element_node(
										"<STYLE>b</style\n>",
										"STYLE",
										"open",
										[],
										[ style_node("b") ]
									),
									element_node(
										"<p>c</p>",
										"p",
										"open",
										[],
										[ text_node("c") ]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"ends raw text at close tags with attributes or a slash",
					() => {
						expect(
							html(
								"<script>a</script foo=\"x>y\">b<title>c</title/>d<textarea>e</textarea x>f"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<script>a</script foo=\"x>y\">",
										"script",
										"open",
										[],
										[ script_node("a", "content") ]
									),
									text_node("b"),
									element_node(
										"<title>c</title/>",
										"title",
										"open",
										[],
										[ text_node("c") ]
									),
									text_node("d"),
									element_node(
										"<textarea>e</textarea x>",
										"textarea",
										"open",
										[],
										[ text_node("e") ]
									),
									text_node("f")
								],
								errors: []
							}
						)
					}
				)
				it(
					"ends textarea content at the first close tag, even inside a block",
					() => {
						expect(html("<textarea>{</textarea>")).toStrictEqual(
							{
								ast: [
									element_node(
										"<textarea>{</textarea>",
										"textarea",
										"open",
										[],
										[ script_node("{", "block") ]
									)
								],
								errors: [
									{
										end: 11,
										message: "The {…} block is not closed.",
										start: 10
									}
								]
							}
						)
					}
				)
				it.each(
					[
						"iframe",
						"noembed",
						"noframes",
						"xmp"
					]
				)(
					"keeps markup in <%s> as text but parses blocks",
					name => {
						const element = `<${name}><b>{c}</${name.toUpperCase()}>`
						expect(html(`${element}<p>x</p>`)).toStrictEqual(
							{
								ast: [
									element_node(
										element,
										name,
										"open",
										[],
										[
											text_node("<b>"),
											script_node("{c}", "block")
										]
									),
									element_node(
										"<p>x</p>",
										"p",
										"open",
										[],
										[ text_node("x") ]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"keeps markup in textarea and title as text but parses blocks",
					() => {
						expect(
							html(
								"<textarea><b>{c}</TEXTAREA><title>{d} <i></title>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<textarea><b>{c}</TEXTAREA>",
										"textarea",
										"open",
										[],
										[
											text_node("<b>"),
											script_node("{c}", "block")
										]
									),
									element_node(
										"<title>{d} <i></title>",
										"title",
										"open",
										[],
										[
											script_node("{d}", "block"),
											text_node(" <i>")
										]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"keeps the rest of the input as the text of plaintext",
					() => {
						expect(
							html("<plaintext><b></plaintext>x")
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<plaintext><b></plaintext>x",
										"plaintext",
										"open",
										[],
										[ text_node("<b></plaintext>x") ]
									)
								],
								errors: []
							}
						)
						expect(html("<plaintext>")).toStrictEqual(
							{
								ast: [
									element_node("<plaintext>", "plaintext", "open")
								],
								errors: []
							}
						)
					}
				)
				it(
					"parses an empty textarea",
					() => {
						expect(
							html(
								"<textarea></textarea><p>a</p>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<textarea></textarea>",
										"textarea",
										"open"
									),
									element_node(
										"<p>a</p>",
										"p",
										"open",
										[],
										[ text_node("a") ]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"reports textarea content that is never closed",
					() => {
						expect(html("<textarea>a")).toStrictEqual(
							{
								ast: [
									element_node(
										"<textarea>a",
										"textarea",
										"open",
										[],
										[ text_node("a") ]
									)
								],
								errors: [
									{
										end: 11,
										message: "The \"textarea\" element is not closed.",
										start: 10
									}
								]
							}
						)
					}
				)
			}
		)
	}
)