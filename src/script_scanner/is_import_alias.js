import identifier_part_regex from "./identifier_part_regex.js"
import previous_index from "./previous_index.js"
import previous_word from "./previous_word.js"
/**
 * @param {string} text
 * @param {number} index
 * @param {import("../../private.js").ScanState} state
 * @returns {boolean}
 */
export default function(text, index, state) {
	let i = index
	while (text[i] == ".") {
		const end = previous_index(text, i, state)
		let start = end
		while (identifier_part_regex.test(text[start] ?? "")) start--
		if (start == end) return false
		i = previous_index(text, start + 1, state)
	}
	if (text[i] != "=") return false
	const name_end = previous_index(text, i, state)
	const name = previous_word(text, name_end)
	if (!name) return false
	const keyword_end = previous_index(
		text,
		name_end - name.length + 1,
		state
	)
	const keyword = previous_word(text, keyword_end)
	return keyword == "import"
		|| keyword == "type" && previous_word(
			text,
			previous_index(text, keyword_end - 3, state)
		) == "import"
}