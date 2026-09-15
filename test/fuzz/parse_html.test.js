import {
	check_seeds,
	completion_ends,
	fuzz_invariants,
	last_element,
	random
} from "./fuzz.js"
import {
	completion_problems,
	html_document,
	parse5_problems
} from "./parse5.js"
import { parseHtml } from "dom-eater"
import { describe, expect, it } from "vitest"
describe(
	"parseHtml fuzzing",
	() => {
		it(
			"agrees with parse5 on generated documents",
			() => {
				check_seeds(
					"parse5",
					300,
					html_document,
					parse5_problems
				)
			},
			600000
		)
		it(
			"ends the element and attribute being typed at the cursor",
			() => {
				for (const source of [
					"<div class=\"a b",
					"<div class='a",
					"<div class=a",
					"<div class=\"{x ? 'a",
					"<div\n  class=\"a",
					"<p><div class=\"x",
					"<svg><g class=\"",
					"<template lang=\"pug\">\n  div(class=\"a",
					"<div class=\"a {b}",
					"<div :class=\"{ a: b, '",
					"<div class=\"{{ a }} b",
					"<div class=\"<?php echo $a ?> b",
					"{#if a}<div class=\"x",
					"@if (a) {<div class=\"x",
					"<textarea class=\"a",
					"<table><tr><td class=\"a"
				]) {
					expect(
						completion_ends(
							last_element(parseHtml(source).ast)
						),
						source
					).toStrictEqual(
						{
							attribute: source.length,
							element: source.length
						}
					)
				}
				check_seeds(
					"completion",
					300,
					html_document,
					(source, seed) => completion_problems(source, random(seed))
				)
			},
			600000
		)
		it(
			"keeps the invariants on generated input",
			() => {
				fuzz_invariants("parse_html", 300)
			},
			600000
		)
	}
)