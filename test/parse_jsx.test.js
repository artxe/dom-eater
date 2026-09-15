import {
	attribute_node,
	check_invariants,
	check_non_string_input,
	class_attributes,
	comment_node,
	element_names,
	element_node,
	jsx,
	jsx_node,
	script_node,
	string_node,
	style_node,
	template_node,
	text_node
} from "./helpers.js"
import {
	script_syntax_cases,
	script_syntax_error_cases
} from "./script_syntax_cases.js"
import {
	dom_eater_ranges,
	typescript_ranges
} from "./typescript_ranges.js"
import { parseJsx } from "dom-eater"
import { describe, expect, it } from "vitest"
describe(
	"parseJsx",
	() => {
		describe(
			"agreement with the TypeScript parser",
			() => {
				describe(
					"async functions and generators",
					() => {
						it.each(
							[
								"async\nfunction f() { a = await / 2, \"/\" }",
								"async function f() { await /'/ }",
								"async function f() { class A { static { await /'/ } x = await / 2 + \"/\" } }",
								"async function f() { const g = x => x\nawait /'/ }",
								"async function f() { const o = { m() { await / 2, \"/\" } } }",
								"async function f() { g(async () => 1, await /'/) }",
								"async function f() { let h: () => void = await /'/ }",
								"async function f() { return () => await / 2, \"/\" }",
								"async function f() { return (x) => (await / 2, \"/\") }",
								"async function f() { return async x => `${await /'/}` }",
								"async function f() { return await (a) / 2, \"/\" }",
								"async function f(): Promise<void> { await /'/ }",
								"class A { *class() { yield /'/ } }",
								"class A { async interface() { await /'/ } }",
								"class A { async m(): Promise<void> { await /'/ } *n(): any { yield /'/ } }",
								"const f = (x): T => await / 2 + \"/\"",
								"const f = async (x): Promise<T> => await /'/",
								"const f = async <T,>(x: T) => (y) => await / 2 + \"/\"",
								"const f = async <T,>(x: T) => (y): T => await / 2 + \"/\"",
								"const f = async <T,>(x: T) => await /'/",
								"export {}; await /'/.test(q)",
								"function /* c */ * f() { yield /'/ }",
								"function f() { a = await / 2, \"/\", yield / 2, \"/\" }",
								"function f() { const o = { async m() { await /'/ }, *n() { yield /'/ } } }",
								"function f() { g(async () => 1, await / 2, \"/\") }",
								"function f() { return <a>{await / 2}{\"/\"}</a> }",
								"function f() { return async x => <a b={await /'/}>{await /'/}</a> }",
								"function f() { return async x => { await /'/ } }",
								"function f() { return x => { await / 2, \"/\" } }",
								"function* f() { const o = { *[k]() { yield /'/ }, async \"s\"() { await /'/ } } }",
								"function* f() { return () => <a>{yield / 2}{\"/\"}</a> }",
								"function* f() { return () => [yield / 2, \"/\"] }",
								"function* f() { return () => yield / 2, \"/\" }",
								"function* f() { return <a>{yield <b/>}</a> }",
								"import $x = y.z; await / 2, \"/\"",
								"import _x = y.z; await / 2, \"/\"",
								"import x = y.z; await / 2, \"/\"",
								"import x$ = y.z; await / 2, \"/\"",
								"import(\"x\"); await / 2, \"/\"",
								"import.meta; await /'/.test(q)",
								"x = { *function() { yield /'/ } }",
								"x = { *interface() { yield /'/ } }",
								"x = { abstract: a, b: async (c) => await /'/ }",
								"x = { async class() { await /'/ } }",
								"yield / 2, \"/\""
							]
						)(
							"%j",
							code => {
								expect(dom_eater_ranges(code, true)).toStrictEqual(typescript_ranges(code, true))
							}
						)
					}
				)
				describe(
					"operands",
					() => {
						it.each(
							[
								"!function () {} / 2, \"/\"",
								"+a++ / 2, \"/\"",
								"a++ / 2, \"/\"",
								"class C {} /'/.test(q)",
								"do /'/.test(q); while (a)",
								"for ([a] of /'/.exec(s)) {}",
								"for (const of of /'/.exec(s)) {}",
								"for (x of of / 2 + \"/\") {}",
								"function f() { return function () {} / 2, \"/\" }",
								"function f() { return!/'/.test(q) }",
								"function f() { return!<Q/> }",
								"function f() {} /'/.test(q)",
								"if (a) /'/.test(q)",
								"if (a)!/'/.test(q)",
								"if (a?.[0]) /'/.test(q)",
								"label: {} /'/.test(b)",
								"switch (a) { case 1: {} /'/.test(b) }",
								"switch (a) { case!/'/.test(q): }",
								"throw!/'/.test(q)",
								"while (a) /'/.test(q)",
								"x = 's'! /c/\n/'/.test(q)",
								"x = ++/'/.lastIndex",
								"x = /a/ / 2, \"/\"",
								"x = /a/! /c/\n/'/.test(q)",
								"x = <a b={{} / 2}>{\"/\"}</a>",
								"x = <a/> << <b/>; y = <c/><<<d/>; z = e<<f",
								"x = <p/> / <i/>",
								"x = <p>{a <function () {} / 2}{\"/\"}</p>",
								"x = [...async function () {} / 2, \"/\"]",
								"x = [...function () {} / 2, \"/\"]",
								"x = `${a <function () {} / 2}${\"/\"}`; y = <p/>",
								"x = `${function () {} / 2, \"/\"}`",
								"x = a !/b/\n/'/.test(q)",
								"x = a <function () {} / 2, \"/\"",
								"x = a ? b : class {} / 2, \"/\"",
								"x = a ? {} : {} / 2, \"/\"",
								"x = a in!/'/.test(q)",
								"x = a! / 2, \"/\"",
								"x = a++ / 2, \"/\"",
								"x = a=>\"'\"",
								"x = a??\"'\"",
								"x = class {} / 2, \"/\"",
								"x = f()! / 2, \"/\"",
								"x = f(async function () {} / 2, \"/\")",
								"x = function () {} / 2, \"/\"",
								"x = function(){} / 2, \"/\"",
								"x = require(\"a\") / 2, \"/\"",
								"x = typeof /'/",
								"x = typeof!/'/.test(q)",
								"x = { a: class {} / 2, b: \"/\" }",
								"x = { a: y = function () {} / 2, b: \"/\" }",
								"x = { a: {} / 2, b: \"/\" }",
								"x = { const: a, b: (c) => c / 2, d: \"/\" }"
							]
						)(
							"%j",
							code => {
								expect(dom_eater_ranges(code, true)).toStrictEqual(typescript_ranges(code, true))
							}
						)
					}
				)
				describe(
					"statement ends",
					() => {
						it.each(
							[
								"'s'\n{}\n/'/.test(q)",
								"'s'\n{}\n<Q/>",
								"'use strict'\n{ let a = 1 }\n/'/.test(q)",
								"/x/\n{}\n/'/.test(q)",
								"@a.b(c) class D {} /'/.test(q)",
								"`s`\n{}\n/'/.test(q)",
								"a: for (;;) { break a\n/'/.test(q) }",
								"a: for (;;) { continue a\n/'/.test(q) }",
								"a[0]\n{}\n/'/.test(q)",
								"as: for (;;) { break as\n/'/.test(q) }",
								"class A extends B<{ a: 1 }> {}\n/'/.test(q)",
								"class M { n(): void { function o() {} /'/.test(q) } }",
								"const a = 1; l: function f() {} /'/.test(q)",
								"debugger\n/'/.test(q)",
								"declare function f(): string\n/'/.test(q)",
								"declare function f(a)\n/'/.test(q)",
								"declare function f(a)\r/'/.test(q)",
								"declare function f(a) /'/.test(q)",
								"declare function f(a) /'/.test(q)",
								"declare module \"m\"\n/'/.test(q)",
								"declare module \"m\"\nfunction f() {} /'/.test(q)",
								"declare module \"m\" {}\n/'/.test(q)",
								"declare module 'm'\nclass C {} /'/.test(q)",
								"export as namespace N\n/'/.test(q)",
								"export declare function f(): void\nfunction q() {} /'/.test(q)",
								"export default async function f() {} /'/.test(q)",
								"export default class {} <D/>",
								"export import a = h\n/'/.test(q)",
								"for (;;) { break\n/'/.test(q) }",
								"function f() { return\nfunction g() {} /'/.test(q) }",
								"function f(a): void;\nfunction f(a) {}\n/'/.test(q)",
								"function* f() { yield\nfunction g() {} /'/.test(q) }",
								"if (a) function f() {} /'/.test(q)",
								"if (a) {}\nb, c\n/ 2, \"/\"",
								"import \"b\"\n<A/>",
								"import a = h\n/'/.test(q)",
								"import a = h . b\n/'/.test(q)",
								"import a = h.b.c\n<Q/>",
								"import a = require(\"b\")\n/'/.test(q)",
								"import a from \"b\"\n/'/.test(q)",
								"import type a = h\n/'/.test(q)",
								"import type a = require(\"b\")\n/'/.test(q)",
								"interface I extends J<{ a: 1 }> {}\n/'/.test(q)",
								"let a = \"x\", b\n/'/.test(q)",
								"let a = /x/g, b\n/'/.test(q)",
								"let a = 1\nb, c\n/ 2, \"/\"",
								"let a = <p/>, b\n/'/.test(q)",
								"let a = async () => b, c\n/'/.test(q)",
								"let a = b as T, c\n/'/.test(q)",
								"let a = class {}, b\n/'/.test(q)",
								"let a = f(b), c\n/'/.test(q)",
								"let a = f`x`, b\n/'/.test(q)",
								"let a = function () {}, b\n/'/.test(q)",
								"let a = typeof b, c\n/'/.test(q)",
								"let a: keyof B, c\n/'/.test(q)",
								"namespace N.M {}\n/'/.test(q)",
								"var a\n/'/.test(q)",
								"x = \"a\"\nb, c\n/ 2, \"/\"",
								"x = \"a\"\nfunction f() {} /'/.test(q)",
								"x = 5.\nfunction f() {} /'/.test(q)",
								"x = @e class {} / 2, \"/\"",
								"x = a\nfunction f() {} /'/.test(q)",
								"x = a ?? b\nl: function f() {} /'/.test(q)",
								"x = a!\nclass C {} <D/>",
								"x = async\nfunction f() {} /'/.test(q)",
								"x = f(a)\n/ 2, \"/\"",
								"x = f(a)\nb, c\n/ 2, \"/\"",
								"x = {}\nb, c\n/ 2, \"/\"",
								"{ { a: function f() {} /'/.test(q) } }"
							]
						)(
							"%j",
							code => {
								expect(dom_eater_ranges(code, true)).toStrictEqual(typescript_ranges(code, true))
							}
						)
					}
				)
				describe(
					"tags",
					() => {
						it.each(
							[
								"x = <\n><A/></\n>",
								"x = < /* c */ /* d */ ><A/></>",
								"x = < /* c */ ><A/></ /* c */ >",
								"x = < // c\n><A/></ // c\n>",
								"x = < ><A/></>",
								"x = <><A/></ >",
								"x = <A b/ /* c */>",
								"x = <A/\n>",
								"x = <A/ >",
								"x = <A></A >"
							]
						)(
							"%j",
							code => {
								expect(dom_eater_ranges(code, true)).toStrictEqual(typescript_ranges(code, true))
							}
						)
					}
				)
				describe(
					"types",
					() => {
						it.each(
							[
								"function f<T extends { a: 1 }>(): T {}\n/'/.test(q)",
								"interface I { <T>(x: T): T }\nx = <T>(a)</T >",
								"interface I { <T>(x: T): T }\nx = <T>(a)</T>",
								"interface J { new <T>(x: T): J }",
								"interface K { m?<T>(x: T): T }",
								"let a: { /* } */ b: 1 }\n/'/.test(q)",
								"let a: { /* } */ b: 1 } = c / 2, d = \"/\"",
								"let a: { // }\n b: 1 }\n/'/.test(q)",
								"let x: Foo<T>\n/'/.test(q)",
								"type A = \"a\" | \"b\"\n/'/.test(q)",
								"type A = -1\n/'/.test(q)",
								"type A = B[keyof C]\n/'/.test(q)",
								"type A = `a${B}`\n/'/.test(q)",
								"type A = | \"a\" | \"b\"\n/'/.test(q)",
								"type A<T = string> = T extends `${infer U}x` ? U : never\n/'/.test(q)",
								"type A<T> = T extends string\n? \"a\"\n: { b: 1 }\n/'/.test(q)",
								"type F = <T>(x: T) => T\n/'/.test(q)",
								"type F = new (...args: any[]) => object\n/'/.test(q)",
								"type G = abstract new () => object\n/'/.test(q)",
								"type P = typeof import(\"x\")\n/'/.test(q)",
								"type S = unique symbol\n/'/.test(q)",
								"type U = asserts this is T\n/'/.test(q)",
								"x = <A <T,>>{\"/\"}</A>; y = /'/",
								"x = <A<{ a: \"}\" }> b={c} />; y = /'/",
								"x = <b>{a?.<b>(c)}</b>",
								"x = a?.<b>(c) / 2, \"/\"",
								"x = function (): { a: 1 } {} / 2, \"/\"",
								"x = y as Map<(a: K) => V, W> / 2, \"/\"",
								"x = y as Map<K, V> / 2, \"/\"",
								"x = y as Map<{ k: 1 }, V> / 2, \"/\"",
								"x = y satisfies A<B> / 2, \"/\""
							]
						)(
							"%j",
							code => {
								expect(dom_eater_ranges(code, true)).toStrictEqual(typescript_ranges(code, true))
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
					"allows whitespace and newlines around = and inside blocks",
					() => {
						expect(
							jsx(
								"<p a = \"b\" c=\n'd' e={ f }/>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<p a = \"b\" c=\n'd' e={ f }/>",
										"p",
										"closed",
										[
											attribute_node(
												"a = \"b\"",
												"a",
												string_node("\"b\"", "double")
											),
											attribute_node(
												"c=\n'd'",
												"c",
												string_node("'d'", "single")
											),
											attribute_node("e={ f }", "e", jsx_node("{ f }"))
										]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"does not treat backslashes as escapes in attribute values",
					() => {
						expect(
							jsx(
								String.raw`x = <p a="x\" b='y\'/>`
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										String.raw`<p a="x\" b='y\'/>`,
										"p",
										"closed",
										[
											attribute_node(
												String.raw`a="x\"`,
												"a",
												string_node(String.raw`"x\"`, "double")
											),
											attribute_node(
												String.raw`b='y\'`,
												"b",
												string_node(String.raw`'y\'`, "single")
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
					"ends a boolean attribute name before />",
					() => {
						expect(jsx("<input disabled/>")).toStrictEqual(
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
					"extracts class strings from a component",
					() => {
						const class_template = "`:hover/c=--primary-50;bold\n\t\t\tc=red bg=blue\n\t\t\t"
								+ "@dark@c=white\n\t\t\t:active/tf=scale(1.2)\n\t\t\t${is_active ?? \"bold;fs=1.2\"}`"
						const style = "style=\"color: red; background: blue;\""
						const div = `<div {...props} ${style}\n\t\t\tclassName={${class_template}}>`
								+ "\n\t\t\t{a}\n\t\t\t{text}\n\t\t</div>"
						const source = "\nvar n = 5\nlet a = <a>{n}</a>\nlet text = \"<div></div>\"\nlet props = {}\n\n"
								+ `export function App() {\n\tlet is_active = false\n\treturn (\n\t\t${div}\n\t)\n}\n`
						expect(jsx(source)).toStrictEqual(
							{
								ast: [
									element_node(
										"<a>{n}</a>",
										"a",
										"open",
										[],
										[ jsx_node("{n}") ]
									),
									element_node(
										div,
										"div",
										"open",
										[
											attribute_node(
												"{...props}",
												"",
												jsx_node("{...props}")
											),
											attribute_node(
												style,
												"style",
												string_node(
													"\"color: red; background: blue;\"",
													"double"
												)
											),
											attribute_node(
												`className={${class_template}}`,
												"className",
												jsx_node(
													`{${class_template}}`,
													[
														string_node(
															class_template,
															"backtick",
															[
																script_node(
																	"${is_active ?? \"bold;fs=1.2\"}",
																	"template",
																	[
																		string_node("\"bold;fs=1.2\"", "double")
																	]
																)
															]
														)
													]
												)
											)
										],
										[
											text_node("\n\t\t\t"),
											jsx_node("{a}"),
											text_node("\n\t\t\t"),
											jsx_node("{text}"),
											text_node("\n\t\t")
										]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"parses curly braces inside quoted values as jsx Scripts",
					() => {
						expect(jsx("<p a=\"x{y}\" b='{z}'/>")).toStrictEqual(
							{
								ast: [
									element_node(
										"<p a=\"x{y}\" b='{z}'/>",
										"p",
										"closed",
										[
											attribute_node(
												"a=\"x{y}\"",
												"a",
												string_node(
													"\"x{y}\"",
													"double",
													[ jsx_node("{y}") ]
												)
											),
											attribute_node(
												"b='{z}'",
												"b",
												string_node(
													"'{z}'",
													"single",
													[ jsx_node("{z}") ]
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
					"parses elements and fragments as attribute values without braces",
					() => {
						expect(
							jsx("x = <A b=<p/> c=<>d</> />")
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<A b=<p/> c=<>d</> />",
										"A",
										"closed",
										[
											attribute_node(
												"b=<p/>",
												"b",
												jsx_node(
													"<p/>",
													[],
													[
														element_node("<p/>", "p", "closed")
													]
												)
											),
											attribute_node(
												"c=<>d</>",
												"c",
												jsx_node(
													"<>d</>",
													[],
													[
														element_node(
															"<>d</>",
															"",
															"open",
															[],
															[ text_node("d") ]
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
					"parses elements passed as attribute values",
					() => {
						expect(jsx("<A b={<p>c</p>}/>")).toStrictEqual(
							{
								ast: [
									element_node(
										"<A b={<p>c</p>}/>",
										"A",
										"closed",
										[
											attribute_node(
												"b={<p>c</p>}",
												"b",
												jsx_node(
													"{<p>c</p>}",
													[],
													[
														element_node(
															"<p>c</p>",
															"p",
															"open",
															[],
															[ text_node("c") ]
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
					"parses empty and brace-first quoted values",
					() => {
						expect(
							jsx("<p a=\"\" b=\"{c}\" d='' />")
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<p a=\"\" b=\"{c}\" d='' />",
										"p",
										"closed",
										[
											attribute_node(
												"a=\"\"",
												"a",
												string_node("\"\"", "double")
											),
											attribute_node(
												"b=\"{c}\"",
												"b",
												string_node(
													"\"{c}\"",
													"double",
													[ jsx_node("{c}") ]
												)
											),
											attribute_node(
												"d=''",
												"d",
												string_node("''", "single")
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
					"parses spread, block and boolean attributes",
					() => {
						expect(
							jsx(
								"<input {...a} b={c} disabled />"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<input {...a} b={c} disabled />",
										"input",
										"closed",
										[
											attribute_node("{...a}", "", jsx_node("{...a}")),
											attribute_node("b={c}", "b", jsx_node("{c}")),
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
					"reports a value or name cut off by the end of input",
					() => {
						expect(jsx("<p a=")).toStrictEqual(
							{
								ast: [
									element_node(
										"<p a=",
										"p",
										"open",
										[ attribute_node("a=", "a") ]
									)
								],
								errors: [
									{
										end: 5,
										message: "The \"a\" attribute has no value after \"=\".",
										start: 3
									},
									{
										end: 5,
										message: "The start tag is not closed.",
										start: 0
									}
								]
							}
						)
						expect(jsx("<p a")).toStrictEqual(
							{
								ast: [
									element_node(
										"<p a",
										"p",
										"open",
										[ attribute_node("a", "a") ]
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
									}
								]
							}
						)
					}
				)
				it(
					"reports unterminated double and single quoted values",
					() => {
						expect(jsx("<p a=\"b>c</p>")).toStrictEqual(
							{
								ast: [
									element_node(
										"<p a=\"b>c</p>",
										"p",
										"open",
										[
											attribute_node(
												"a=\"b>c</p>",
												"a",
												string_node("\"b>c</p>", "double")
											)
										]
									)
								],
								errors: [
									{
										end: 13,
										message: "The double-quoted attribute value is not closed.",
										start: 5
									},
									{
										end: 13,
										message: "The start tag is not closed.",
										start: 0
									}
								]
							}
						)
						expect(jsx("<p a='b>c</p>").errors).toStrictEqual(
							[
								{
									end: 13,
									message: "The single-quoted attribute value is not closed.",
									start: 5
								},
								{
									end: 13,
									message: "The start tag is not closed.",
									start: 0
								}
							]
						)
					}
				)
				it(
					"skips comments between attributes",
					() => {
						expect(
							jsx(
								"x = <div /* it's */ a=\"b\" // don't\n c={d}>e</div>;"
										+ " y = <i/* c */></i>; z = <u /* c *//>;"
										+ " w = <b // c\n>f</b>; v = <s /*/ t=\"u\" */ /**/ />"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<div /* it's */ a=\"b\" // don't\n c={d}>e</div>",
										"div",
										"open",
										[
											attribute_node(
												"a=\"b\"",
												"a",
												string_node("\"b\"", "double")
											),
											attribute_node("c={d}", "c", jsx_node("{d}"))
										],
										[ text_node("e") ]
									),
									element_node("<i/* c */></i>", "i", "open"),
									element_node("<u /* c *//>", "u", "closed"),
									element_node(
										"<b // c\n>f</b>",
										"b",
										"open",
										[],
										[ text_node("f") ]
									),
									element_node(
										"<s /*/ t=\"u\" */ /**/ />",
										"s",
										"closed"
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"stops at an open tag error without reading children",
					() => {
						expect(jsx("<p a=>b</p>")).toStrictEqual(
							{
								ast: [
									element_node(
										"<p a=>",
										"p",
										"open",
										[ attribute_node("a=", "a") ]
									)
								],
								errors: [
									{
										end: 5,
										message: "The \"a\" attribute has no value after \"=\".",
										start: 3
									}
								]
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
					"allows whitespace around the name of a close tag",
					() => {
						expect(
							jsx(
								"x = <div>a</ div >; y = <b></b\n>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<div>a</ div >",
										"div",
										"open",
										[],
										[ text_node("a") ]
									),
									element_node("<b></b\n>", "b", "open")
								],
								errors: []
							}
						)
					}
				)
				it(
					"collects elements from nested blocks",
					() => {
						expect(
							jsx(
								"<ul>{items.map(i => { return <li/> })}</ul>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<ul>{items.map(i => { return <li/> })}</ul>",
										"ul",
										"open",
										[],
										[
											jsx_node(
												"{items.map(i => { return <li/> })}",
												[],
												[
													element_node("<li/>", "li", "closed")
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
					"collects elements from template literal substitutions",
					() => {
						const template = "`${c ? <i/> : \"\"}`"
						expect(
							jsx(
								`<a b={${template}}/>; s = \`\${ { a: <u/> } }\``
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										`<a b={${template}}/>`,
										"a",
										"closed",
										[
											attribute_node(
												`b={${template}}`,
												"b",
												jsx_node(
													`{${template}}`,
													[
														string_node(
															template,
															"backtick",
															[
																script_node(
																	"${c ? <i/> : \"\"}",
																	"template",
																	[ string_node("\"\"", "double") ]
																)
															]
														)
													],
													[
														element_node("<i/>", "i", "closed")
													]
												)
											)
										]
									),
									element_node("<u/>", "u", "closed")
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
							jsx(
								"<div\n\tclassName=\"a\">b</div>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<div\n\tclassName=\"a\">b</div>",
										"div",
										"open",
										[
											attribute_node(
												"className=\"a\"",
												"className",
												string_node("\"a\"", "double")
											)
										],
										[ text_node("b") ]
									)
								],
								errors: []
							}
						)
						expect(jsx("<p\tid=\"a\"/>")).toStrictEqual(
							{
								ast: [
									element_node(
										"<p\tid=\"a\"/>",
										"p",
										"closed",
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
					"keeps HTML comments and the raw text of script and style elements",
					() => {
						expect(
							jsx(
								"x = <div><!-- a<b --><script>a < b</script><style>.a{}</style></div>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<div><!-- a<b --><script>a < b</script><style>.a{}</style></div>",
										"div",
										"open",
										[],
										[
											comment_node("<!-- a<b -->"),
											element_node(
												"<script>a < b</script>",
												"script",
												"open",
												[],
												[ text_node("a < b") ]
											),
											element_node(
												"<style>.a{}</style>",
												"style",
												"open",
												[],
												[ style_node(".a{}") ]
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
					"keeps member, namespaced and custom element names",
					() => {
						expect(
							element_names(
								jsx(
									"<Foo.Bar></Foo.Bar>; <svg:rect/>; <my-el></my-el>"
								).ast
							)
						).toStrictEqual(
							[ "Foo.Bar", "svg:rect", "my-el" ]
						)
					}
				)
				it(
					"keeps quotes and > in children as text",
					() => {
						expect(jsx("<p>Don't > \"stop\"</p>")).toStrictEqual(
							{
								ast: [
									element_node(
										"<p>Don't > \"stop\"</p>",
										"p",
										"open",
										[],
										[ text_node("Don't > \"stop\"") ]
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
						expect(jsx("<br/>; <Foo />")).toStrictEqual(
							{
								ast: [
									element_node("<br/>", "br", "closed"),
									element_node("<Foo />", "Foo", "closed")
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
							jsx(
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
					"nests elements that share a name",
					() => {
						expect(jsx("<div><div>a</div></div>")).toStrictEqual(
							{
								ast: [
									element_node(
										"<div><div>a</div></div>",
										"div",
										"open",
										[],
										[
											element_node(
												"<div>a</div>",
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
					"parses a fragment inside children as an element without a name",
					() => {
						expect(jsx("<div><>a</></div>")).toStrictEqual(
							{
								ast: [
									element_node(
										"<div><>a</></div>",
										"div",
										"open",
										[],
										[
											element_node(
												"<>a</>",
												"",
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
					"parses elements returned from blocks in children",
					() => {
						expect(
							jsx(
								"<ul>{items.map(i => <li key={i}>{i}</li>)}</ul>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<ul>{items.map(i => <li key={i}>{i}</li>)}</ul>",
										"ul",
										"open",
										[],
										[
											jsx_node(
												"{items.map(i => <li key={i}>{i}</li>)}",
												[],
												[
													element_node(
														"<li key={i}>{i}</li>",
														"li",
														"open",
														[
															attribute_node("key={i}", "key", jsx_node("{i}"))
														],
														[ jsx_node("{i}") ]
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
					"parses every element of a conditional expression",
					() => {
						expect(
							jsx("<p>{a ? <b/> : <i/>}</p>")
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<p>{a ? <b/> : <i/>}</p>",
										"p",
										"open",
										[],
										[
											jsx_node(
												"{a ? <b/> : <i/>}",
												[],
												[
													element_node("<b/>", "b", "closed"),
													element_node("<i/>", "i", "closed")
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
					"parses fragments at the top level and inside blocks",
					() => {
						expect(
							jsx(
								"x = <><p>{a && <>b</>}</p></>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<><p>{a && <>b</>}</p></>",
										"",
										"open",
										[],
										[
											element_node(
												"<p>{a && <>b</>}</p>",
												"p",
												"open",
												[],
												[
													jsx_node(
														"{a && <>b</>}",
														[],
														[
															element_node(
																"<>b</>",
																"",
																"open",
																[],
																[ text_node("b") ]
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
					"parses the markup of html templates in blocks, keeping elements of substitutions in them",
					() => {
						const template = "`<b class=\"c\">${<i/>}</b>`"
						const substitution = template_node(
							"${<i/>}",
							[],
							[
								element_node("<i/>", "i", "closed")
							]
						)
						expect(
							jsx(`x = <p>{html${template}}</p>`)
						).toStrictEqual(
							{
								ast: [
									element_node(
										`<p>{html${template}}</p>`,
										"p",
										"open",
										[],
										[
											jsx_node(
												`{html${template}}`,
												[
													string_node(
														template,
														"backtick",
														[ substitution ]
													)
												],
												[
													element_node(
														"<b class=\"c\">${<i/>}</b>",
														"b",
														"open",
														[
															attribute_node(
																"class=\"c\"",
																"class",
																string_node("\"c\"", "double")
															)
														],
														[ substitution ]
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
			}
		)
		describe(
			"errors",
			() => {
				it(
					"keeps the text of an element that is never closed",
					() => {
						expect(jsx("<p>hi")).toStrictEqual(
							{
								ast: [
									element_node(
										"<p>hi",
										"p",
										"open",
										[],
										[ text_node("hi") ]
									)
								],
								errors: [
									{
										end: 5,
										message: "The \"p\" element is not closed.",
										start: 0
									}
								]
							}
						)
					}
				)
				it(
					"reports a block comment that is never closed",
					() => {
						expect(jsx("x = <p>{/* a</p>")).toStrictEqual(
							{
								ast: [
									element_node(
										"<p>{/* a</p>",
										"p",
										"open",
										[],
										[ jsx_node("{/* a</p>") ]
									)
								],
								errors: [
									{
										end: 16,
										message: "The block comment is not closed.",
										start: 8
									},
									{
										end: 16,
										message: "The {…} block is not closed.",
										start: 7
									},
									{
										end: 16,
										message: "The \"p\" element is not closed.",
										start: 4
									}
								]
							}
						)
					}
				)
				it(
					"reports a block that is never closed",
					() => {
						expect(jsx("<p>{a</p>").errors).toStrictEqual(
							[
								{
									end: 9,
									message: "The {…} block is not closed.",
									start: 3
								},
								{
									end: 9,
									message: "The \"p\" element is not closed.",
									start: 0
								}
							]
						)
					}
				)
				it(
					"reports a close tag that does not match the open tag",
					() => {
						expect(jsx("<p><b></p>")).toStrictEqual(
							{
								ast: [
									element_node(
										"<p><b></p>",
										"p",
										"open",
										[],
										[
											element_node("<b></p>", "b", "open")
										]
									)
								],
								errors: [
									{
										end: 10,
										message: "The close tag does not match the \"b\" element.",
										start: 3
									},
									{
										end: 10,
										message: "The \"p\" element is not closed.",
										start: 0
									}
								]
							}
						)
					}
				)
				it(
					"reports a comment inside a tag that is never closed",
					() => {
						expect(jsx("<div /* a")).toStrictEqual(
							{
								ast: [
									element_node("<div /* a", "div", "open")
								],
								errors: [
									{
										end: 9,
										message: "The start tag is not closed.",
										start: 0
									}
								]
							}
						)
						expect(jsx("<div // a")).toStrictEqual(
							{
								ast: [
									element_node("<div // a", "div", "open")
								],
								errors: [
									{
										end: 9,
										message: "The start tag is not closed.",
										start: 0
									}
								]
							}
						)
					}
				)
				it(
					"reports a tag name cut off by the end of input",
					() => {
						expect(jsx("<div")).toStrictEqual(
							{
								ast: [
									element_node("<div", "div", "open")
								],
								errors: [
									{
										end: 4,
										message: "The start tag is not closed.",
										start: 0
									}
								]
							}
						)
					}
				)
				it(
					"reports unterminated top-level strings",
					() => {
						expect(jsx("a = \"b").errors).toStrictEqual(
							[
								{
									end: 6,
									message: "The double-quoted string is not closed.",
									start: 4
								}
							]
						)
						expect(jsx("a = 'b").errors).toStrictEqual(
							[
								{
									end: 6,
									message: "The single-quoted string is not closed.",
									start: 4
								}
							]
						)
						expect(jsx("a = `b").errors).toStrictEqual(
							[
								{
									end: 6,
									message: "The template literal is not closed.",
									start: 4
								}
							]
						)
						expect(jsx("a = `${b").errors).toStrictEqual(
							[
								{
									end: 8,
									message: "The template literal substitution is not closed.",
									start: 5
								},
								{
									end: 8,
									message: "The template literal is not closed.",
									start: 4
								}
							]
						)
					}
				)
			}
		)
		describe(
			"frameworks",
			() => {
				it(
					"Astro",
					() => {
						const result = jsx(
							"---\nconst title = \"It's me\"\nconst items = [ 1, 2 ]\n---\n"
								+ "<ul class:list={[ \"a\", { b: true } ]}>{items.map(i => <li>{i}</li>)}</ul>"
						)
						expect(result.errors).toStrictEqual([])
						expect(element_names(result.ast)).toStrictEqual([ "ul", "li" ])
						const markup = jsx(
							"---\n---\n<div>\n\t<!-- don't -->\n\t<p class=\"a\">x</p>\n</div>\n"
								+ "<script>if (a < b) { x() }</script>\n<style>.a { content: \"}\" }</style>\n<footer class=\"f\"></footer>"
						)
						expect(markup.errors).toStrictEqual([])
						expect(element_names(markup.ast)).toStrictEqual(
							[
								"div",
								"p",
								"script",
								"style",
								"footer"
							]
						)
					}
				)
				it(
					"Preact",
					() => {
						const result = jsx(
							"export function App() {\n\tconst [ x ] = useState(0)\n\treturn <div class=\"a\">{x > 0 && "
								+ "<p className=\"b\"/>}</div>\n}"
						)
						expect(result.errors).toStrictEqual([])
						expect(element_names(result.ast)).toStrictEqual([ "div", "p" ])
						expect(class_attributes(result.ast)).toStrictEqual(
							[ "class=\"a\"", "className=\"b\"" ]
						)
					}
				)
				it(
					"Qwik",
					() => {
						const result = jsx(
							"export default component$(() => {\n\tconst s = useSignal(0)\n\treturn <div class=\"a\" "
								+ "onClick$={() => s.value++}><p class=\"b\"/></div>\n})"
						)
						expect(result.errors).toStrictEqual([])
						expect(element_names(result.ast)).toStrictEqual([ "div", "p" ])
						expect(class_attributes(result.ast)).toStrictEqual(
							[ "class=\"a\"", "class=\"b\"" ]
						)
					}
				)
				it(
					"React",
					() => {
						const result = jsx(
							"export default function App<T,>({ items }: Props<T>) {\n"
								+ "\treturn <ul className={cn(\"a\", ok && \"b\")}>{items.map(i => <li key={i} "
								+ "className=\"c\"/>)}</ul>\n}"
						)
						expect(result.errors).toStrictEqual([])
						expect(element_names(result.ast)).toStrictEqual([ "ul", "li" ])
						expect(class_attributes(result.ast)).toStrictEqual(
							[
								"className={cn(\"a\", ok && \"b\")}",
								"className=\"c\""
							]
						)
					}
				)
				it(
					"Solid",
					() => {
						const result = jsx(
							"export const App = () => (\n"
								+ "\t<Show when={a() < b()} fallback={<p>no</p>}>\n"
								+ "\t\t<For each={list()}>{x => <li classList={{ on: x.on }}>{x.n}</li>}</For>\n"
								+ "\t</Show>\n)"
						)
						expect(result.errors).toStrictEqual([])
						expect(element_names(result.ast)).toStrictEqual([ "Show", "p", "For", "li" ])
					}
				)
				it(
					"Stencil",
					() => {
						const result = jsx(
							"@Component({ tag: 'my-x', shadow: true })\nexport class MyX {\n\t@Prop() first: string\n"
								+ "\t@State() open = false\n"
								+ "\trender() {\n\t\treturn <Host class=\"a\"><div class={{ b: this.open }}><slot "
								+ "/></div></Host>\n\t}\n}"
						)
						expect(result.errors).toStrictEqual([])
						expect(element_names(result.ast)).toStrictEqual([ "Host", "div", "slot" ])
						expect(class_attributes(result.ast)).toStrictEqual(
							[
								"class=\"a\"",
								"class={{ b: this.open }}"
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
						const source = "<a b={<i c=\"{d}\"/>}>{e && <u>{`${'f'}`}</u>}</a>"
						const result = parseJsx(source)
						check_invariants(source, result, false)
						expect(result.errors).toStrictEqual([])
					}
				)
				it(
					"reports exact start/end for every node",
					() => {
						expect(parseJsx("x = <p a={b}>c</p>")).toStrictEqual(
							{
								ast: [
									{
										attributes: [
											{
												end: 12,
												name: "a",
												start: 7,
												type: "Attribute",
												value: {
													elements: [],
													end: 12,
													start: 9,
													strings: [],
													subType: "jsx",
													type: "Script"
												}
											}
										],
										children: [
											{ end: 14, start: 13, type: "Text" }
										],
										end: 18,
										name: "p",
										start: 4,
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
					"reports input nested too deeply instead of throwing",
					() => {
						const message = "The input is nested too deeply."
						expect(jsx("<p>".repeat(100000))).toStrictEqual(
							{
								ast: [],
								errors: [
									{ end: 300000, message, start: 0 }
								]
							}
						)
						expect(
							jsx(`<a>${"{".repeat(100000)}`)
						).toStrictEqual(
							{
								ast: [],
								errors: [
									{ end: 100003, message, start: 0 }
								]
							}
						)
						expect(
							jsx(
								`x = <p/>; y = ${"<a>{".repeat(100000)}`
							)
						).toStrictEqual(
							{
								ast: [
									element_node("<p/>", "p", "closed")
								],
								errors: [
									{ end: 400014, message, start: 8 }
								]
							}
						)
					}
				)
				it(
					"reports input that is not a string instead of throwing",
					() => {
						check_non_string_input(parseJsx)
					}
				)
				it(
					"returns nothing for empty input",
					() => {
						expect(jsx("")).toStrictEqual({ ast: [], errors: [] })
					}
				)
				it(
					"skips a hashbang line",
					() => {
						expect(
							jsx(
								"#!/usr/bin/env -S node --title=don't\nx = <p/>"
							)
						).toStrictEqual(
							{
								ast: [
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
			"script scanning",
			() => {
				it.each(
					[
						"const c = <const T,>(x: T) => x",
						"const d = <T = unknown,>(x: T) => x",
						"const f = <T,>(x: T) => x",
						"const g = <T extends object>(x: T) => x",
						"const h = <$TItem,>(x: $TItem) => x",
						"const k = <_T$,>(x: _T$) => x",
						"const y = a as Array<number>",
						"function f<T>(x: T) {}",
						"interface I { <T>(x: T): T }",
						"interface J { new <T>(x: T): J }",
						"interface K { m?<T>(x: T): T }",
						"let m: <T>(x: T) => T",
						"type A = <T>(x: \")\") => T",
						"type B = <$TItem>(x: $TItem) => $TItem",
						"type C = <_T$>(x: _T$)=> _T$",
						"type D = <const T>(x: T) => T",
						"useState<string>(\"\")"
					]
				)(
					"does not parse TypeScript generics as tags: %s",
					code => {
						expect(
							jsx(`${code}\nconst el = <p/>`)
						).toStrictEqual(
							{
								ast: [
									element_node("<p/>", "p", "closed")
								],
								errors: []
							}
						)
					}
				)
				it(
					"does not parse comparisons as tags",
					() => {
						expect(
							jsx(
								"for (let i = 0; i<n; i++) {}\nconst x = a++<b ? <i/> : null, y = <p>{a<b ? 1 : 2}</p>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node("<i/>", "i", "closed"),
									element_node(
										"<p>{a<b ? 1 : 2}</p>",
										"p",
										"open",
										[],
										[ jsx_node("{a<b ? 1 : 2}") ]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"ignores JavaScript outside JSX, including < before a non-letter",
					() => {
						expect(
							jsx(
								"const a = 1\nif (a < 2 && a <= 3 || a<0) {}"
							)
						).toStrictEqual({ ast: [], errors: [] })
					}
				)
				it(
					"keeps a tag followed by parentheses that are not a function type",
					() => {
						expect(
							jsx(
								"x = <b>(a)</b>; y = <i>(c</i>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<b>(a)</b>",
										"b",
										"open",
										[],
										[ text_node("(a)") ]
									),
									element_node(
										"<i>(c</i>",
										"i",
										"open",
										[],
										[ text_node("(c") ]
									)
								],
								errors: []
							}
						)
					}
				)
				it.each(
					[
						"case",
						"default",
						"delete",
						"do",
						"else",
						"extends",
						"in",
						"instanceof",
						"new",
						"return",
						"throw",
						"typeof",
						"void"
					]
				)(
					"parses a tag after the keyword %s but not after an identifier ending in it",
					keyword => {
						expect(
							jsx(
								`${keyword} <p/>; x${keyword} <i/>`
							)
						).toStrictEqual(
							{
								ast: [
									element_node("<p/>", "p", "closed")
								],
								errors: []
							}
						)
					}
				)
				it(
					"parses tags after await and yield only where they are keywords",
					() => {
						expect(
							jsx(
								"function f() { await <a; yield <b }"
										+ " async function g() { await <p/> } function* h() { yield <i/> }"
							)
						).toStrictEqual(
							{
								ast: [
									element_node("<p/>", "p", "closed"),
									element_node("<i/>", "i", "closed")
								],
								errors: []
							}
						)
						expect(
							jsx(
								"import a from \"b\"\nawait <p/>; yield <i"
							)
						).toStrictEqual(
							{
								ast: [
									element_node("<p/>", "p", "closed")
								],
								errors: []
							}
						)
						expect(jsx("await <a; yield <b")).toStrictEqual({ ast: [], errors: [] })
					}
				)
				it(
					"parses tags after control statement parentheses but not after calls or object literals",
					() => {
						expect(
							jsx(
								"if (a) <A/>\nwhile (b) <B/>\nf(c) <d; x = {} <e; y = <p/>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node("<A/>", "A", "closed"),
									element_node("<B/>", "B", "closed"),
									element_node("<p/>", "p", "closed")
								],
								errors: []
							}
						)
					}
				)
				it(
					"parses tags after keywords but not after member names",
					() => {
						expect(
							jsx(
								"function f() { return /'/.test(s) ? <a/> : <b/> }\nconst c = d.in<e>f</e>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node("<a/>", "a", "closed"),
									element_node("<b/>", "b", "closed")
								],
								errors: []
							}
						)
					}
				)
				it(
					"parses tags after module names and statements that a line break ends",
					() => {
						expect(
							jsx(
								"import a from \"b\"\n<A/>;\nimport \"c\"\n<B/>;"
										+ "\nimport d = require(\"e\")\n<C/>;\nvar f\n<D/>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node("<A/>", "A", "closed"),
									element_node("<B/>", "B", "closed"),
									element_node("<C/>", "C", "closed"),
									element_node("<D/>", "D", "closed")
								],
								errors: []
							}
						)
					}
				)
				it.each(
					[
						[
							"a block comment starting with a slash",
							"x = /*/ <b/> */ <p/>"
						],
						[
							"a quote before the closing slash",
							"x = /a'/, y = <p/>"
						],
						[
							"a quote right after a division",
							"x = a/\"'\", y = <p/>"
						],
						[
							"a regular expression candidate cut by a newline",
							"x = /\"\n\"; y = <p/>"
						],
						[
							"a regular expression ending in an operator",
							"x = /a=/, y = <p/>"
						],
						[
							"a slash inside a character class",
							"x = /[a/']/, y = <p/>"
						],
						[
							"an empty block comment",
							"x = /**/ <p/> /* */"
						],
						[
							"an empty line comment",
							"//\nx = <p/>"
						]
					]
				)(
					"scans past %s",
					(_, code) => {
						expect(jsx(code)).toStrictEqual(
							{
								ast: [
									element_node("<p/>", "p", "closed")
								],
								errors: []
							}
						)
					}
				)
				it(
					"skips comments",
					() => {
						expect(
							jsx(
								"// don't <b/>\n/* it's <i/> */ x = /* c */ <p>{/* don't */}<span/></p>;"
										+ " y = a/* c */<b"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<p>{/* don't */}<span/></p>",
										"p",
										"open",
										[],
										[
											jsx_node("{/* don't */}"),
											element_node("<span/>", "span", "closed")
										]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"skips top-level strings even when they contain markup",
					() => {
						expect(
							jsx(
								"a = \"<p>\"; b = '<i>'; c = `<b>${\"<u>\"}`; d = <s/>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node("<s/>", "s", "closed")
								],
								errors: []
							}
						)
					}
				)
				it(
					"tells regular expressions from divisions",
					() => {
						expect(
							jsx(
								"const r = /[/\"]\\/'/g, x = a / 2, y = \"'\", z = <p/>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node("<p/>", "p", "closed")
								],
								errors: []
							}
						)
					}
				)
				it(
					"treats $, zero-width joiners and a leading identifier as the end of an operand",
					() => {
						expect(jsx("a<b")).toStrictEqual({ ast: [], errors: [] })
						expect(
							jsx(
								"x = a$ <b; y = c‌ <d; z = e‍ <f; w = <p/>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node("<p/>", "p", "closed")
								],
								errors: []
							}
						)
					}
				)
				it(
					"treats regular expressions, elements and class and function expressions as operands",
					() => {
						expect(
							jsx(
								"x = /a/ <b; y = <p/> / <i/>; z = function () {} <u; w = class {} <s;"
										+ "\nfunction f() {} <A/>\nclass C {} <B/>\nexport default class {} <D/>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node("<p/>", "p", "closed"),
									element_node("<i/>", "i", "closed"),
									element_node("<A/>", "A", "closed"),
									element_node("<B/>", "B", "closed"),
									element_node("<D/>", "D", "closed")
								],
								errors: []
							}
						)
						expect(
							jsx(
								"x = <a>{function () {} <b}</a>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<a>{function () {} <b}</a>",
										"a",
										"open",
										[],
										[
											jsx_node("{function () {} <b}")
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
			"script syntax",
			() => {
				it.each(script_syntax_cases)(
					"%s",
					(_, code, strings) => {
						expect(jsx(`<a>${code}</a>`)).toStrictEqual(
							{
								ast: [
									element_node(
										`<a>${code}</a>`,
										"a",
										"open",
										[],
										[ jsx_node(code, strings) ]
									)
								],
								errors: []
							}
						)
					}
				)
				it.each(script_syntax_error_cases)(
					"reports %s",
					(_, code, strings, errors) => {
						const offset = 3
						expect(jsx(`<a>${code}`)).toStrictEqual(
							{
								ast: [
									element_node(
										`<a>${code}`,
										"a",
										"open",
										[],
										[ jsx_node(code, strings) ]
									)
								],
								errors: [
									...errors.map(
										error => ({
											...error,
											end: error.end + offset,
											start: error.start + offset
										})
									),
									{
										end: code.length + offset,
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
			"tag names",
			() => {
				it(
					"skips the type arguments of generic components",
					() => {
						expect(
							jsx(
								"x = <Select<Option> value={a}>b</Select>; y = <A <T,>/>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<Select<Option> value={a}>b</Select>",
										"Select",
										"open",
										[
											attribute_node(
												"value={a}",
												"value",
												jsx_node("{a}")
											)
										],
										[ text_node("b") ]
									),
									element_node("<A <T,>/>", "A", "closed")
								],
								errors: []
							}
						)
					}
				)
				it(
					"starts tags with any identifier start character at the top level",
					() => {
						expect(
							jsx(
								"x = <_A/>, y = <$b/>, z = <Ünï/>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node("<_A/>", "_A", "closed"),
									element_node("<$b/>", "$b", "closed"),
									element_node("<Ünï/>", "Ünï", "closed")
								],
								errors: []
							}
						)
					}
				)
				it(
					"starts tags with any identifier start character inside blocks",
					() => {
						expect(
							jsx(
								"<a>{b && <Foo/>}{c && <_d/>}{e && <$f/>}{<>g</>}</a>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<a>{b && <Foo/>}{c && <_d/>}{e && <$f/>}{<>g</>}</a>",
										"a",
										"open",
										[],
										[
											jsx_node(
												"{b && <Foo/>}",
												[],
												[
													element_node("<Foo/>", "Foo", "closed")
												]
											),
											jsx_node(
												"{c && <_d/>}",
												[],
												[
													element_node("<_d/>", "_d", "closed")
												]
											),
											jsx_node(
												"{e && <$f/>}",
												[],
												[
													element_node("<$f/>", "$f", "closed")
												]
											),
											jsx_node(
												"{<>g</>}",
												[],
												[
													element_node(
														"<>g</>",
														"",
														"open",
														[],
														[ text_node("g") ]
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
					"starts tags with any identifier start character inside template literals",
					() => {
						expect(
							jsx(
								"x = `${<G/>}${<_h/>}${<$i/>}${<>j</>}`"
							)
						).toStrictEqual(
							{
								ast: [
									element_node("<G/>", "G", "closed"),
									element_node("<_h/>", "_h", "closed"),
									element_node("<$i/>", "$i", "closed"),
									element_node(
										"<>j</>",
										"",
										"open",
										[],
										[ text_node("j") ]
									)
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