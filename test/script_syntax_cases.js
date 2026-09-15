/** @import { String as StringNode } from "dom-eater" */
/** @import { Positionless } from "./helpers.js" */
import { script_node, string_node } from "./helpers.js"
/** @type {[ string, string, Positionless<StringNode>[] ][]} */
export const script_syntax_cases = [
	[
		"collects strings directly inside substitutions",
		"{`${'a' + \"b\"}`}",
		[
			string_node(
				"`${'a' + \"b\"}`",
				"backtick",
				[
					script_node(
						"${'a' + \"b\"}",
						"template",
						[
							string_node("'a'", "single"),
							string_node("\"b\"", "double")
						]
					)
				]
			)
		]
	],
	[
		"divides after a class or function at the start of a block or substitution",
		"{function () {} / 2, z = \"/\", `${class {} / 2, \"/\"}`}",
		[
			string_node("\"/\"", "double"),
			string_node(
				"`${class {} / 2, \"/\"}`",
				"backtick",
				[
					script_node(
						"${class {} / 2, \"/\"}",
						"template",
						[ string_node("\"/\"", "double") ]
					)
				]
			)
		]
	],
	[
		"divides after calls, indexes, object literals and non-null assertions",
		"{x = {} / 2, z = \"/\"; t = typeof {} / 2, z = \"/\"; u = a ? {} : {} / 2, z = \"/\";"
			+ " r = { a: {} / 2, b: \"/\" }; s = [{}] / 2, z = \"/\"; n = e ?? {} / 2, z = \"/\";"
			+ " k = l?.5:{} / 2, z = \"/\"; y = f(a) / 2, z = \"/\"; v = a! / 2, z = \"/\";"
			+ " w = f()! / 2, z = \"/\"; q = c[0]! / 2, z = \"/\"}",
		[
			string_node("\"/\"", "double"),
			string_node("\"/\"", "double"),
			string_node("\"/\"", "double"),
			string_node("\"/\"", "double"),
			string_node("\"/\"", "double"),
			string_node("\"/\"", "double"),
			string_node("\"/\"", "double"),
			string_node("\"/\"", "double"),
			string_node("\"/\"", "double"),
			string_node("\"/\"", "double"),
			string_node("\"/\"", "double")
		]
	],
	[
		"divides after class and function expressions but not declarations",
		"{() => {function f() {} /'/.test(b); class C {} /'/.test(b); async function g() {} /'/.test(b);"
			+ " x = function () {} / 2, z = \"/\"; y = class {} / 2, z = \"/\";"
			+ " w = function (): { a: 1 } {} / 2, z = \"/\"; @a.b(c) class D {} /'/.test(b);"
			+ " v = @e class {} / 2, z = \"/\"}}",
		[
			string_node("\"/\"", "double"),
			string_node("\"/\"", "double"),
			string_node("\"/\"", "double"),
			string_node("\"/\"", "double")
		]
	],
	[
		"divides after regular expressions",
		"{a = /x/ / 2, z = \"/\"}",
		[ string_node("\"/\"", "double") ]
	],
	[
		"divides after type assertions that end with type arguments",
		"{x = y as Map<K, V> / 2, \"/\", z = y satisfies A<B> / 2, \"/\"}",
		[
			string_node("\"/\"", "double"),
			string_node("\"/\"", "double")
		]
	],
	[
		"does not end the block at braces inside strings",
		"{\"}\" + '{' + `}`}",
		[
			string_node("\"}\"", "double"),
			string_node("'{'", "single"),
			string_node("`}`", "backtick")
		]
	],
	[
		"ends a string after an escaped backslash",
		String.raw`{"a\\" + 'b\\'}`,
		[
			string_node(String.raw`"a\\"`, "double"),
			string_node(String.raw`'b\\'`, "single")
		]
	],
	[
		"flattens strings from blocks inside substitutions",
		"{`${ { a: 'b' } }`}",
		[
			string_node(
				"`${ { a: 'b' } }`",
				"backtick",
				[
					script_node(
						"${ { a: 'b' } }",
						"template",
						[ string_node("'b'", "single") ]
					)
				]
			)
		]
	],
	[
		"flattens strings from nested blocks",
		"{a({ b: \"c\" }, 'd')}",
		[
			string_node("\"c\"", "double"),
			string_node("'d'", "single")
		]
	],
	[
		"nests templates inside substitutions",
		"{`a${`b${\"c\"}`}`}",
		[
			string_node(
				"`a${`b${\"c\"}`}`",
				"backtick",
				[
					script_node(
						"${`b${\"c\"}`}",
						"template",
						[
							string_node(
								"`b${\"c\"}`",
								"backtick",
								[
									script_node(
										"${\"c\"}",
										"template",
										[ string_node("\"c\"", "double") ]
									)
								]
							)
						]
					)
				]
			)
		]
	],
	[
		"skips comments, regular expressions and comparisons",
		"{/'/.test(a) /* \" */ + `${b<c / d /* ' */ + /\"/}` // '\n}",
		[
			string_node(
				"`${b<c / d /* ' */ + /\"/}`",
				"backtick",
				[
					script_node(
						"${b<c / d /* ' */ + /\"/}",
						"template"
					)
				]
			)
		]
	],
	[
		"skips escaped backticks and substitutions",
		"{`a\\`b\\${c}`}",
		[
			string_node("`a\\`b\\${c}`", "backtick")
		]
	],
	[
		"skips escaped quotes",
		String.raw`{"a\"b" + 'a\'b'}`,
		[
			string_node(String.raw`"a\"b"`, "double"),
			string_node(String.raw`'a\'b'`, "single")
		]
	],
	[
		"skips markup inside strings",
		"{\"<a>\" + '</b>'}",
		[
			string_node("\"<a>\"", "double"),
			string_node("'</b>'", "single")
		]
	],
	[
		"starts regular expressions after TypeScript declarations at line breaks",
		"{() => {type A = B[keyof C]\n/'/.test(q); type D<T> = T extends string\n? \"a\"\n: { b: 1 }\n/'/.test(q);"
			+ " interface I extends J<{ a: 1 }> {}\n/'/.test(q); class K extends L<{ a: 1 }> {}\n/'/.test(q);"
			+ " let x: Foo<T>\n/'/.test(q); declare function f(): string\n/'/.test(q);"
			+ " declare function g(a)\n/'/.test(q); declare module \"m\" {}\n/'/.test(q);"
			+ " class M { n(): void { function o() {} /'/.test(q) } }}}",
		[
			string_node("\"a\"", "double"),
			string_node("\"m\"", "double")
		]
	],
	[
		"starts regular expressions after bindings without initializers and jump statements at line breaks",
		"{() => {var a\n/'/.test(q); let b = f(c), d\n/'/.test(q);"
			+ " e: for (;;) { break\n/'/.test(q); continue e\n/'/.test(q) }"
			+ " debugger\n/'/.test(q); let g = 1\nh, k\n/ 2, \"/\"; let m = \"x\", n\n/'/.test(q);"
			+ " let o = /x/g, p = `y`, r\n/'/.test(q)}}",
		[
			string_node("\"/\"", "double"),
			string_node("\"x\"", "double"),
			string_node("`y`", "backtick")
		]
	],
	[
		"starts regular expressions after blocks",
		"{() => {if (a) {} /'/.test(b); do {} /'/.test(b); else {} /'/.test(b); class A {} /'/.test(b);"
			+ " {} {} /'/.test(b); a?.b; c: {} /'/.test(b); switch (a) { case 1: {} /'/.test(b) }"
			+ " d = () => {}\n/'/.test(b)}}",
		[]
	],
	[
		"starts regular expressions after control statement parentheses",
		"{() => {for (a) /'/.test(b); for await (a of b) /'/.test(c); while (a) /'/.test(b);"
			+ " with (a) /'/.test(b); if (a) /'/.test(b)}}",
		[]
	],
	[
		"treats await and yield as identifiers only in functions that are not async or generators",
		"{() => {function f() { a = await / 2, z = \"/\", yield / 2, z = \"/\" }"
			+ " async function* g() { await /'/; yield /'/ } async\nfunction h() { a = await / 2, z = \"/\" }"
			+ " function /* c */ * k() { yield /'/ } function m() { o = { async n() { await /'/ } };"
			+ " p = async () => await /'/; function* q() { yield /'/ } }}}",
		[
			string_node("\"/\"", "double"),
			string_node("\"/\"", "double"),
			string_node("\"/\"", "double")
		]
	],
	[
		"treats of as a keyword only in for heads",
		"{() => {for (const x of /'/.exec(s)) {} for await (const y of /'/.exec(s)) {} z = of / 2, w = \"/\";"
			+ " for (const of of /'/.exec(s)) {} for (x of of / 2, \"/\") {}}}",
		[
			string_node("\"/\"", "double"),
			string_node("\"/\"", "double")
		]
	]
]
/** @type {[ string, string, Positionless<StringNode>[], { end: number, message: string, start: number }[] ][]} */
export const script_syntax_error_cases = [
	[
		"an unterminated block",
		"{a",
		[],
		[
			{
				end: 2,
				message: "The {…} block is not closed.",
				start: 0
			}
		]
	],
	[
		"an unterminated block that ends in a line comment",
		"{a // }",
		[],
		[
			{
				end: 7,
				message: "The {…} block is not closed.",
				start: 0
			}
		]
	],
	[
		"an unterminated double quoted string",
		"{\"a",
		[ string_node("\"a", "double") ],
		[
			{
				end: 3,
				message: "The double-quoted string is not closed.",
				start: 1
			},
			{
				end: 3,
				message: "The {…} block is not closed.",
				start: 0
			}
		]
	],
	[
		"an unterminated single quoted string",
		"{'a",
		[ string_node("'a", "single") ],
		[
			{
				end: 3,
				message: "The single-quoted string is not closed.",
				start: 1
			},
			{
				end: 3,
				message: "The {…} block is not closed.",
				start: 0
			}
		]
	],
	[
		"an unterminated substitution",
		"{`${a",
		[
			string_node(
				"`${a",
				"backtick",
				[ script_node("${a", "template") ]
			)
		],
		[
			{
				end: 5,
				message: "The template literal substitution is not closed.",
				start: 2
			},
			{
				end: 5,
				message: "The template literal is not closed.",
				start: 1
			},
			{
				end: 5,
				message: "The {…} block is not closed.",
				start: 0
			}
		]
	],
	[
		"an unterminated template literal",
		"{`a",
		[ string_node("`a", "backtick") ],
		[
			{
				end: 3,
				message: "The template literal is not closed.",
				start: 1
			},
			{
				end: 3,
				message: "The {…} block is not closed.",
				start: 0
			}
		]
	]
]