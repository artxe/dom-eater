import {
	completion_ends,
	fuzz_invariants,
	last_element
} from "./fuzz.js"
import { razor_differential } from "./razor.js"
import { parseRazor } from "dom-eater"
import { describe, expect, it } from "vitest"
describe(
	"parseRazor fuzzing",
	() => {
		it(
			"agrees with the Razor compiler on mutated pages",
			() => {
				razor_differential(false, 300)
			},
			3600000
		)
		it(
			"ends the element and attribute being typed at the cursor",
			() => {
				for (const source of [
					"<div class=\"a",
					"<div class=\"@(x ? \"a",
					"@if (a) { <div class=\"a",
					"@{ <p class=\"",
					"@foreach (var i in l) { <li class=\"a",
					"<div class=\"a @b c"
				]) {
					expect(
						completion_ends(
							last_element(parseRazor(source).ast)
						),
						source
					).toStrictEqual(
						{
							attribute: source.length,
							element: source.length
						}
					)
				}
			},
			600000
		)
		it(
			"keeps the invariants on generated input",
			() => {
				fuzz_invariants("parse_razor", 300)
			},
			600000
		)
	}
)