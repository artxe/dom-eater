import {
	completion_ends,
	fuzz_invariants,
	last_element
} from "./fuzz.js"
import { razor_differential } from "./razor.js"
import { parseRazorComponent } from "dom-eater"
import { describe, expect, it } from "vitest"
describe(
	"parseRazorComponent fuzzing",
	() => {
		it(
			"agrees with the Razor compiler on mutated pages",
			() => {
				razor_differential(true, 300)
			},
			3600000
		)
		it(
			"ends the element and attribute being typed at the cursor",
			() => {
				for (const source of [
					"<MudButton Class=\"a",
					"<div class=\"a\" @onclick=\"F\" id=\"",
					"@code { RenderFragment f = @<p class=\"a"
				]) {
					expect(
						completion_ends(
							last_element(
								parseRazorComponent(source).ast
							)
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
				fuzz_invariants("parse_razor_component", 300)
			},
			600000
		)
	}
)