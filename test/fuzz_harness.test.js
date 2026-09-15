import { check_seeds, sim_seeds } from "./fuzz/fuzz.js"
import { assert, describe, it } from "vitest"
describe(
	"fuzz harness",
	() => {
		/** @type {string[]} */
		const changed = []
		/**
		 * @param {() => void} run
		 * @returns {string}
		 */
		function failure(run) {
			try {
				run()
			} catch (error) {
				for (const name of changed) delete process.env[name]
				changed.length = 0
				const reported = /** @type {{ actual?: { first?: string[] } }} */(error)/**/.actual
				return (reported?.first ?? []).join("\n")
			}
			for (const name of changed) delete process.env[name]
			changed.length = 0
			return assert.fail("No failure was reported")
		}
		/**
		 * @param {string} name
		 * @param {string} value
		 * @returns {void}
		 */
		function set(name, value) {
			changed.push(name)
			process.env[name] = value
		}
		it(
			"keeps quiet within the budget",
			() => {
				set("SIM_SEEDS", "1")
				set("SIM_BUDGET", "10000")
				check_seeds("quick", 1, () => "<p>", () => [])
				for (const name of changed) delete process.env[name]
				changed.length = 0
			}
		)
		it(
			"reports a seed that takes too long",
			() => {
				set("SIM_SEEDS", "1")
				set("SIM_BUDGET", "10")
				const message = failure(
					() => check_seeds(
						"slow",
						1,
						() => "<p>",
						() => {
							const until = Date.now() + 40
							while (Date.now() < until);
							return []
						}
					)
				)
				assert.include(
					message,
					"SIM_MODE=slow SIM_SEED=1"
				)
				assert.include(message, "took")
			}
		)
		it(
			"seeds",
			() => {
				assert.deepEqual(
					sim_seeds("html", 3),
					[ 1, 2, 3 ]
				)
				set("SIM_FROM", "10")
				set("SIM_SEEDS", "2")
				assert.deepEqual(sim_seeds("html", 3), [ 10, 11 ])
				set("SIM_SEED", "77")
				assert.deepEqual(sim_seeds("html", 3), [ 77 ])
				set("SIM_MODE", "other")
				assert.deepEqual(sim_seeds("html", 3), [])
				for (const name of changed) delete process.env[name]
				changed.length = 0
			}
		)
		it(
			"turns the budget off with zero",
			() => {
				set("SIM_SEEDS", "1")
				set("SIM_BUDGET", "0")
				check_seeds(
					"slow",
					1,
					() => "<p>",
					() => {
						const until = Date.now() + 30
						while (Date.now() < until);
						return []
					}
				)
				for (const name of changed) delete process.env[name]
				changed.length = 0
			}
		)
	}
)