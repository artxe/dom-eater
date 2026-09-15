/** @import { AstNode, AstSyntaxError, Element } from "dom-eater" */
import { check_invariants } from "../helpers.js"
import {
	parseHtml,
	parseJsx,
	parsePug,
	parseRazor,
	parseRazorComponent,
	parseScript
} from "dom-eater"
import { readFileSync } from "node:fs"
import ts from "typescript"
import { assert } from "vitest"
const common_fragments = [
	"\t",
	"\n",
	"\r\n",
	" ",
	"!",
	"\"",
	"#",
	"${",
	"'",
	"(",
	")",
	"*",
	"*/",
	"+",
	",",
	"-",
	"-->",
	".",
	"/",
	"/*",
	"//",
	"/>",
	"0",
	":",
	";",
	"<",
	"<!--",
	"</",
	"=",
	">",
	"?",
	"@",
	"[",
	"\\",
	"]",
	"`",
	"a",
	"class",
	"div",
	"p",
	"x",
	"{",
	"}",
	" ",
	" ",
	"\ud800",
	"﻿",
	"😀"
]
export const entries = {
	parse_html: parseHtml,
	parse_jsx: parseJsx,
	parse_pug: parsePug,
	parse_razor: parseRazor,
	parse_razor_component: parseRazorComponent,
	parse_script: parseScript
}
const razor_fragments = [
	"\"\"\"raw\"\"\"",
	"#endif",
	"#if DEBUG",
	"$\"{a}\"",
	"'c'",
	"<<<<<<< HEAD",
	"</script>",
	"</text>",
	"<script>",
	"<text>",
	">>>>>>> b",
	"@",
	"@\"x\"",
	"@(",
	"@*",
	"@:",
	"@<p>",
	"@@",
	"@DateTime.Now",
	"@Html.Raw(\"",
	"@attribute [A]",
	"@bind-Value=\"v\"",
	"@code {",
	"@do {",
	"@foreach (var x in y) {",
	"@functions {",
	"@helper",
	"@if (a) {",
	"@inherits X",
	"@inject A B",
	"@lock (a) {",
	"@model X",
	"@onclick=\"F\"",
	"@page \"/\"",
	"@section S {",
	"@switch (a) {",
	"@try {",
	"@using X",
	"@x.y[0]",
	"@x?.y",
	"@{",
	"a@b.com",
	"case 1:",
	"} catch (E e) {",
	"} else {",
	"} while (a);",
	"*@"
]
const script_fragments = [
	"\"'\" / 1)",
	"#!",
	"(e / ",
	"++",
	"--",
	"...",
	"/'/.test(q);",
	"/* html */`",
	"/re/",
	"</>",
	"</div>",
	"<>",
	"<Q/>;",
	"<T,>",
	"<a b={c} {...d}>",
	"<div className={",
	"=> ",
	"?.",
	"@dec ",
	"a / b",
	"a ? b : c",
	"as any",
	"async ",
	"await ",
	"case 1:",
	"class C {",
	"const x = ",
	"export default ",
	"for (const x of y) ",
	"function f<T>(",
	"html`",
	"if (a) ",
	"import x from \"y\"\n",
	"interface I {",
	"return ",
	"satisfies X",
	"switch (a) {",
	"template: `",
	"type X = ",
	"x!",
	"yield ",
	"{/* c */}"
]
/** @type {Record<keyof typeof entries, string[]>} */
const fragments = {
	parse_html: [
		"%>",
		"&amp;",
		"</p>",
		"</script>",
		"</style>",
		"</svg>",
		"</template>",
		"<!DOCTYPE html>",
		"<![CDATA[",
		"<%",
		"<?php",
		"<br/>",
		"<div class=\"",
		"<foreignObject>",
		"<input disabled>",
		"<li>",
		"<math>",
		"<p>",
		"<plaintext>",
		"<script>",
		"<select><option>",
		"<style>",
		"<svg>",
		"<table>",
		"<td>",
		"<template lang=\"pug\">",
		"<textarea>",
		"<tr>",
		"=`",
		"?>",
		"@if (a) {",
		"@let x = 1;",
		"]]>",
		"{#if a}",
		"{% endraw %}",
		"{% raw %}",
		"{/if}",
		"{@html x}",
		"{count, plural, =0 {",
		"{{",
		"{{!--",
		"} @else {",
		"}}",
		"--}}"
	],
	parse_jsx: script_fragments,
	parse_pug: [
		"\t",
		"\n",
		"\n  ",
		"\n    ",
		"!= x",
		"!{",
		"#[",
		"#[p ",
		"#id",
		"#{",
		"&attributes(x)",
		"(a=b, c=d)",
		"(class=\"",
		"+mixin(a)",
		"- var x = 1",
		". ",
		".\n",
		"// ",
		"//- ",
		":markdown",
		"<div>",
		"= x",
		"a(href=`x${y}`)",
		"block c",
		"case a",
		"default",
		"div",
		"doctype html",
		"each x in y",
		"else",
		"extends b",
		"if a",
		"include a.pug",
		"mixin m(a)",
		"p(a=/[/]/.test(x))",
		"p.a",
		"tag(",
		"when 1",
		"while a",
		"|"
	],
	parse_razor: razor_fragments,
	parse_razor_component: razor_fragments,
	parse_script: script_fragments
}
const sentence_regex = /^["A-Z][^\n\r\t]*\.$/
/** @type {Map<string, string[]>} */
const test_strings_cache = new Map()
/**
 * @param {string} mode
 * @param {number} count
 * @param {(seed: number) => string} generate
 * @param {(source: string, seed: number) => string[] | undefined} problems_of
 * @returns {void}
 */
export function check_seeds(mode, count, generate, problems_of) {
	/** @type {string[]} */
	const failures = []
	const budget = Number(
		process.env["SIM_BUDGET"] ?? 5000
	)
	for (const seed of sim_seeds(mode, count)) {
		const source = generate(seed)
		const started = Date.now()
		const problems = problems_of(source, seed)
		const spent = Date.now() - started
		if (budget > 0 && spent > budget) {
			failures.push(
				[
					`SIM_MODE=${mode} SIM_SEED=${seed}`,
					`took ${spent} ms, over the ${budget} ms budget`,
					`input: ${JSON.stringify(source)}`
				].join("\n")
			)
		}
		if (!problems?.length) continue
		if (failures.length >= 3) {
			failures.push(
				`SIM_MODE=${mode} SIM_SEED=${seed}`
			)
			continue
		}
		const kind = /** @type {string} */(problems[0]?.split(/["\d]/)[0])/**/
		const minimized = minimize(
			source,
			input => !!problems_of(input, seed)?.some(
				problem => problem.startsWith(kind)
			)
		)
		failures.push(
			[
				`SIM_MODE=${mode} SIM_SEED=${seed}`,
				`minimized: ${JSON.stringify(minimized)}`,
				...(problems_of(minimized, seed) ?? []).slice(0, 5),
				`input: ${JSON.stringify(source)}`,
				...problems.slice(0, 5)
			].join("\n")
		)
	}
	report(failures)
}
/**
 * @param {Element | undefined} element
 * @returns {{ attribute: number | undefined, element: number | undefined }}
 */
export function completion_ends(element) {
	return {
		attribute: element?.attributes[element.attributes.length - 1]?.end,
		element: element?.end
	}
}
/**
 * @param {keyof typeof entries} name
 * @param {string} source
 * @returns {string[]}
 */
export function entry_problems(name, source) {
	const parse = entries[name]
	/** @type {{ ast: AstNode[], errors: AstSyntaxError[] }} */
	let first
	/** @type {{ ast: AstNode[], errors: AstSyntaxError[] }} */
	let plain
	/** @type {{ ast: AstNode[], errors: AstSyntaxError[] }} */
	let again
	try {
		first = parse(source, true)
		plain = parse(source)
		again = parse(source, true)
	} catch (error) {
		return [ `throws ${String(error)}` ]
	}
	/** @type {string[]} */
	const problems = []
	/**
	 * @param {{ ast: AstNode[], errors: AstSyntaxError[] }} result
	 * @param {boolean} include_text
	 * @returns {void}
	 */
	function check(result, include_text) {
		if (Object.keys(result).sort()
			.join() != "ast,errors") problems.push("result keys")
		try {
			check_invariants(source, result, include_text)
		} catch (error) {
			problems.push(String(error))
		}
		for (const error of result.errors) {
			if (typeof error.message != "string" || !sentence_regex.test(error.message)) problems.push(
				`error message ${JSON.stringify(error.message)}`
			)
		}
	}
	check(first, true)
	check(plain, false)
	if (serialize(first, false) != serialize(again, false)) problems.push("nondeterministic")
	if (serialize(first, true) != serialize(plain, false)) problems.push(
		"include_text changes the result"
	)
	return problems
}
/**
 * @param {keyof typeof entries} name
 * @param {number} count
 * @returns {void}
 */
export function fuzz_invariants(name, count) {
	check_seeds(
		"invariants",
		count,
		seed => fuzz_source(name, seed),
		source => entry_problems(name, source)
	)
}
/**
 * @param {keyof typeof entries} name
 * @param {number} seed
 * @returns {string}
 */
export function fuzz_source(name, seed) {
	const next = random(seed)
	const own = /** @type {string[]} */(fragments[name])/**/
	const bases = test_strings(name)
	const mode = next()
	if (mode < 0.3) {
		let source = ""
		const count = 1 + Math.floor(next() * 60)
		for (let i = 0; i < count; i++) source += pick(
			next,
			next() < 0.6 ? own : common_fragments
		)
		return source
	}
	let source = pick(next, bases)
	if (mode < 0.5) return source.slice(
		0,
		Math.floor(next() * (source.length + 1))
	)
	const mutations = 1 + Math.floor(next() * 6)
	for (let i = 0; i < mutations; i++) {
		const at = Math.floor(next() * (source.length + 1))
		const operation = next()
		if (operation < 0.3) {
			source = source.slice(0, at) + pick(next, own) + source.slice(at)
		} else if (operation < 0.45) {
			source = source.slice(0, at) + pick(next, common_fragments) + source.slice(at)
		} else if (operation < 0.6) {
			source = source.slice(0, at) + source.slice(
				at + 1 + Math.floor(next() * 5)
			)
		} else if (operation < 0.8) {
			const other = pick(next, bases)
			const from = Math.floor(next() * other.length)
			source = source.slice(0, at) + other.slice(
				from,
				from + Math.floor(next() * 40)
			) + source.slice(at)
		} else {
			source = source.slice(0, at) + source.slice(
				Math.floor(next() * (source.length + 1))
			)
		}
	}
	return next() < 0.3
		? source.slice(
			0,
			Math.floor(next() * (source.length + 1))
		)
		: source
}
/**
 * @param {AstNode[]} ast
 * @returns {Element | undefined}
 */
export function last_element(ast) {
	/** @type {Element | undefined} */
	let last
	/**
	 * @param {AstNode} node
	 * @returns {void}
	 */
	function visit(node) {
		if (node.type == "Element") {
			if (!last || node.start >= last.start) last = node
			node.attributes.forEach(visit)
			node.children.forEach(visit)
		} else if (node.type == "Attribute") {
			if (node.value !== true) visit(node.value)
		} else if (node.type == "Script") {
			node.strings.forEach(visit)
			if ("elements" in node) node.elements.forEach(visit)
		} else if (node.type == "String") {
			node.scripts.forEach(visit)
		}
	}
	ast.forEach(visit)
	return last
}
/**
 * @param {string} source
 * @param {(source: string) => boolean} fails
 * @returns {string}
 */
export function minimize(source, fails) {
	let current = source
	let parts = 2
	for (let rounds = 0; rounds < 2000 && current.length; rounds++) {
		const size = Math.ceil(current.length / parts)
		let reduced = false
		for (let i = 0; i < current.length; i += size) {
			const candidate = current.slice(0, i) + current.slice(i + size)
			if (fails(candidate)) {
				current = candidate
				parts = Math.max(parts - 1, 2)
				reduced = true
				break
			}
		}
		if (!reduced) {
			if (size == 1) break
			parts = Math.min(parts * 2, current.length)
		}
	}
	return current
}
/**
 * @template T
 * @param {() => number} next
 * @param {readonly T[]} list
 * @returns {T}
 */
export function pick(next, list) {
	return /** @type {T} */(list[Math.floor(next() * list.length)])/**/
}
/**
 * @param {number} seed
 * @returns {() => number}
 */
export function random(seed) {
	let state = seed >>> 0
	return () => {
		state = state + 0x6D2B79F5 >>> 0
		let t = state
		t = Math.imul(t ^ t >>> 15, t | 1)
		t ^= t + Math.imul(t ^ t >>> 7, t | 61)
		return ((t ^ t >>> 14) >>> 0) / 4294967296
	}
}
/**
 * @param {string[]} failures
 * @returns {void}
 */
export function report(failures) {
	assert.deepEqual(
		{
			count: failures.length,
			first: failures.slice(0, 3)
		},
		{ count: 0, first: [] }
	)
}
/**
 * @param {{ ast: AstNode[], errors: AstSyntaxError[] }} result
 * @param {boolean} drop_text
 * @returns {string}
 */
function serialize(result, drop_text) {
	return JSON.stringify(
		result,
		(key, value) => {
			if (drop_text && key == "text") return undefined
			if (value instanceof Error) return [
				value.message,
				Reflect.get(value, "start"),
				Reflect.get(value, "end")
			]
			return value
		}
	)
}
/**
 * @param {string} mode
 * @param {number} count
 * @returns {number[]}
 */
export function sim_seeds(mode, count) {
	const {
		SIM_FROM,
		SIM_MODE,
		SIM_SEED,
		SIM_SEEDS
	} = process.env
	if (SIM_MODE && SIM_MODE != mode) return []
	if (SIM_SEED) return [ Number(SIM_SEED) ]
	const from = Number(SIM_FROM ?? 1)
	return Array.from(
		{
			length: Number(SIM_SEEDS ?? count)
		},
		(_, index) => from + index
	)
}
/**
 * @param {keyof typeof entries} name
 * @returns {string[]}
 */
export function test_strings(name) {
	const cached = test_strings_cache.get(name)
	if (cached) return cached
	const files = [ `${name}.test.js` ]
	if (name == "parse_jsx" || name == "parse_script") files.push("script_syntax_cases.js")
	/** @type {Set<string>} */
	const found = new Set()
	for (const file of files) {
		const source = ts.createSourceFile(
			file,
			readFileSync(
				new URL(`../${file}`, import.meta.url),
				"utf8"
			),
			ts.ScriptTarget.Latest,
			true
		)
		/**
		 * @param {import("typescript").Node} node
		 * @returns {void}
		 */
		function visit(node) {
			if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && node.text.length >= 3) found.add(node.text)
			if (ts.isTemplateExpression(node)) {
				found.add(
					node.head.text + node.templateSpans.map(
						span => `\${x}${span.literal.text}`
					).join("")
				)
			}
			ts.forEachChild(node, visit)
		}
		visit(source)
	}
	const strings = [ ...found ]
	test_strings_cache.set(name, strings)
	return strings
}