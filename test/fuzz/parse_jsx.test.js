import {
	completion_ends,
	fuzz_invariants,
	last_element
} from "./fuzz.js"
import {
	typescript_corpus,
	typescript_differential
} from "./typescript.js"
import { parseJsx } from "dom-eater"
import { describe, expect, it } from "vitest"
describe(
	"parseJsx fuzzing",
	() => {
		it(
			"agrees with the TypeScript parser on generated programs",
			() => {
				typescript_differential(true, 150)
			},
			600000
		)
		it(
			"agrees with the TypeScript parser on the node_modules corpus",
			() => {
				typescript_corpus(true)
			},
			3600000
		)
		it(
			"ends the element and attribute being typed at the cursor",
			() => {
				for (const source of [
					"x = <div className=\"a",
					"x = <div className={cn(\"a",
					"x = <div className={`a ${b} c",
					"x = html`<p class=\"a",
					"x = <Foo.Bar className=\"",
					"x = <div {...p} className=\"",
					"items.map(x => <li className=\"",
					"x = <div className='a",
					"function A() { return <><div className=\"a",
					"x = <a.b.c d=\"",
					"x = <div\n  className=\"a"
				]) {
					expect(
						completion_ends(
							last_element(parseJsx(source).ast)
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
				fuzz_invariants("parse_jsx", 300)
			},
			600000
		)
	}
)