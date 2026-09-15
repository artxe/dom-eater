const void_elements = new Set(
	[
		"AREA",
		"BASE",
		"BR",
		"COL",
		"COMMAND",
		"EMBED",
		"HR",
		"IMG",
		"INPUT",
		"KEYGEN",
		"LINK",
		"META",
		"PARAM",
		"SOURCE",
		"TRACK",
		"WBR"
	]
)
/**
 * @param {string} name
 * @returns {boolean}
 */
export default function(name) {
	return void_elements.has(
		(
			name.startsWith("!")
				? name.slice(1)
				: name
		).toUpperCase()
	)
}