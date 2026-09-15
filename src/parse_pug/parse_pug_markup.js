import create_ast_syntax_error from "../create_ast_syntax_error.js"
import set_text from "../set_text.js"
import is_js_whitespace from "./is_js_whitespace.js"
import lex from "./lex/index.js"
import scan_code from "./scan_code.js"
const content_less_tokens = new Set(
	[
		"end-pipeless-text",
		"eos",
		"indent",
		"newline",
		"outdent",
		"start-pipeless-text"
	]
)
const pug_path_regex = /\.(?:jade|pug)$/
const tag_end_tokens = new Set(
	[
		"end-pug-interpolation",
		"eos",
		"indent",
		"newline",
		"outdent",
		"start-pipeless-text"
	]
)
/** @type {Record<import("../../private.js").PugTokenType, string>} */
const token_descriptions = {
	"&attributes": "\"&attributes\"",
	":": "\":\"",
	attribute: "an attribute",
	block: "\"block\"",
	blockcode: "a code block",
	call: "a mixin call",
	case: "\"case\"",
	class: "a class name",
	code: "code",
	comment: "a comment",
	default: "\"default\"",
	doctype: "\"doctype\"",
	dot: "\".\"",
	each: "\"each\"",
	eachOf: "\"each\"",
	else: "\"else\"",
	"else-if": "\"else if\"",
	"end-attributes": "\")\"",
	"end-pipeless-text": "the end of a text block",
	"end-pug-interpolation": "\"]\"",
	eos: "the end of the input",
	extends: "\"extends\"",
	filter: "a filter",
	id: "an ID",
	if: "\"if\"",
	include: "\"include\"",
	indent: "an indented line",
	"interpolated-code": "interpolated code",
	interpolation: "an interpolated tag name",
	mixin: "\"mixin\"",
	"mixin-block": "\"block\"",
	newline: "a line break",
	outdent: "the end of an indented block",
	path: "a path",
	slash: "\"/\"",
	"start-attributes": "\"(\"",
	"start-pipeless-text": "a text block",
	"start-pug-interpolation": "\"#[\"",
	tag: "a tag",
	text: "text",
	"text-html": "HTML",
	when: "\"when\"",
	while: "\"while\"",
	yield: "\"yield\""
}
/**
 * @param {import("../../private.js").PugParser} parser
 * @param {string} message
 * @param {import("../../private.js").PugToken} token
 * @returns {void}
 */
function add_error(parser, message, token) {
	parser.errors.push(
		create_ast_syntax_error(message, token.start, token.end)
	)
}
/**
 * @param {import("../../private.js").PugParser} parser
 * @returns {import("../../private.js").PugToken}
 */
function advance(parser) {
	const token = peek(parser)
	if (token.type != "eos") parser.index++
	if (!content_less_tokens.has(token.type)) parser.last_end = Math.max(parser.last_end, token.end)
	return token
}
/**
 * @param {import("../../private.js").PugParser} parser
 * @param {import("../../private.js").PugToken} token
 * @returns {import("../../public.js").Attribute}
 */
function attribute_node(parser, token) {
	if (token.value_start < 0) {
		return {
			end: token.end,
			name: token.name,
			start: token.start,
			type: "Attribute",
			value: true
		}
	}
	const strings = scan_code(
		parser.src,
		parser.errors,
		token.value_start,
		token.value_end,
		false
	)
	const string = strings[0]
	return {
		end: token.end,
		name: token.name,
		start: token.start,
		type: "Attribute",
		value: strings.length == 1
			&& string
			&& string.start == token.value_start
			&& string.end == token.value_end
			&& string.subType != "backtick"
			? /** @type {import("../../public.js").String & { subType: "double" | "single" }} */(string)/**/
			: {
				end: token.value_end,
				start: token.value_start,
				strings,
				subType: "pug",
				type: "Script"
			}
	}
}
/**
 * @param {import("../../private.js").PugParser} parser
 * @param {import("../../public.js").Element} element
 * @param {Set<string>} names
 * @returns {void}
 */
function attrs(parser, element, names) {
	advance(parser)
	for (let token = peek(parser); token.type == "attribute"; token = peek(parser)) {
		advance(parser)
		if (token.name != "class") {
			if (names.has(token.name)) add_error(
				parser,
				`Duplicate attribute "${token.name}" is not allowed.`,
				token
			)
			names.add(token.name)
		}
		if (token.name != "" || token.buffer || token.value_start >= 0) {
			element.attributes.push(attribute_node(parser, token))
		}
	}
	expect(parser, "end-attributes")
}
/**
 * @param {import("../../private.js").PugParser} parser
 * @param {import("../../private.js").MarkupNode[]} sink
 * @returns {void}
 */
function block(parser, sink) {
	if (!expect(parser, "indent")) return
	for (let token = peek(parser); token.type != "outdent" && token.type != "eos"; token = peek(parser)) {
		if (token.type == "newline") {
			advance(parser)
		} else if (token.type == "text-html") {
			parse_text_html(parser, sink)
		} else {
			parse_expr(parser, sink)
		}
	}
	flush(parser, sink)
	expect(parser, "outdent")
}
/**
 * @param {string} src
 * @param {Int32Array | undefined} offsets
 * @returns {{ offsets: Int32Array, src: string } | undefined}
 */
function dedent_lines(src, offsets) {
	const lines = src.split("\n")
	let indent = Infinity
	for (const line of lines) {
		if (line.trim() != "") indent = Math.min(
			indent,
			line.length - line.trimStart().length
		)
	}
	if (indent == 0 || indent == Infinity) return undefined
	const dedented_offsets = new Int32Array(src.length + 1)
	let length = 0
	let line_start = 0
	for (const line of lines) {
		if (line_start > 0) dedented_offsets[length++] = line_start - 1
		for (let i = line_start + Math.min(indent, line.length); i < line_start + line.length; i++) {
			dedented_offsets[length++] = i
		}
		line_start += line.length + 1
	}
	dedented_offsets[length] = src.length
	if (offsets) {
		for (let i = 0; i <= length; i++) {
			dedented_offsets[i] = /** @type {number} */(offsets[/** @type {number} */(dedented_offsets[i])/**/])/**/
		}
	}
	return {
		offsets: dedented_offsets.subarray(0, length + 1),
		src: lines.map(line => line.slice(indent)).join("\n")
	}
}
/**
 * @param {import("../../private.js").PugParser} parser
 * @param {import("../../private.js").PugTokenType} type
 * @returns {boolean}
 */
function expect(parser, type) {
	const token = peek(parser)
	if (token.type == type) {
		advance(parser)
		return true
	}
	add_error(
		parser,
		`Expected ${token_descriptions[type]}, but found ${token_descriptions[token.type]}.`,
		token
	)
	return false
}
/**
 * @param {import("../../private.js").PugParser} parser
 * @param {import("../../private.js").MarkupNode[]} sink
 * @returns {void}
 */
function flush(parser, sink) {
	let end = sink[sink.length - 1]?.end ?? 0
	for (const comment of parser.pending) {
		if (comment.start < end) continue
		sink.push(comment)
		end = comment.end
	}
	parser.pending = []
}
/**
 * @param {string} text
 * @returns {string}
 */
function normalize(text) {
	return (text.charCodeAt(0) == 65279
		? text.slice(1)
		: text).replace(/\r\n?/g, "\n")
}
/**
 * @param {string} text
 * @returns {Int32Array | undefined}
 */
function normalize_offsets(text) {
	const bom = text.charCodeAt(0) == 65279
	let carriage_return = text.indexOf("\r")
	if (!bom && carriage_return < 0) return undefined
	const offsets = new Int32Array(text.length + 1)
	let length = 0
	let i = bom
		? 1
		: 0
	for (; carriage_return >= 0; carriage_return = text.indexOf("\r", i)) {
		for (; i <= carriage_return; i++) offsets[length++] = i
		if (text.charCodeAt(i) == 10) i++
	}
	for (; i < text.length; i++) offsets[length++] = i
	offsets[length] = text.length
	return offsets.subarray(0, length + 1)
}
/**
 * @param {import("../../private.js").PugParser} parser
 * @param {import("../../private.js").MarkupNode[]} sink
 * @returns {void}
 */
function parse_block_code(parser, sink) {
	const token = advance(parser)
	let code_start = -1
	let code_end = -1
	if (peek(parser).type == "start-pipeless-text") {
		advance(parser)
		for (let next = peek(parser); next.type != "end-pipeless-text" && next.type != "eos"; next = peek(parser)) {
			advance(parser)
			if (next.type == "text") {
				if (code_start < 0) code_start = next.start
				code_end = next.end
			} else if (next.type != "newline") {
				add_error(
					parser,
					`Did not expect ${token_descriptions[next.type]} here.`,
					next
				)
			}
		}
		expect(parser, "end-pipeless-text")
	}
	const end = code_start < 0
		? token.end
		: trim_end(parser.src, token.start, code_end)
	push_script(
		parser,
		sink,
		{
			...token,
			code_end,
			code_start,
			end: Math.max(end, token.end),
			type: "code"
		}
	)
}
/**
 * @param {import("../../private.js").PugParser} parser
 * @param {import("../../private.js").MarkupNode[]} sink
 * @returns {void}
 */
function parse_block_expansion(parser, sink) {
	if (peek(parser).type == ":") {
		advance(parser)
		parse_expr(parser, sink)
	} else {
		block(parser, sink)
	}
}
/**
 * @param {import("../../private.js").PugParser} parser
 * @param {import("../../private.js").MarkupNode[]} sink
 * @returns {void}
 */
function parse_call(parser, sink) {
	const token = advance(parser)
	const element = push_element(parser, sink, token, token.name)
	if (token.code_start >= 0) {
		element.attributes.push(
			{
				end: token.end,
				name: "",
				start: token.code_start - 1,
				type: "Attribute",
				value: {
					end: token.end,
					start: token.code_start - 1,
					strings: scan_code(
						parser.src,
						parser.errors,
						token.code_start,
						token.code_end,
						false
					),
					subType: "pug",
					type: "Script"
				}
			}
		)
	}
	tag(parser, element, false)
}
/**
 * @param {import("../../private.js").PugParser} parser
 * @param {import("../../private.js").MarkupNode[]} sink
 * @returns {void}
 */
function parse_case(parser, sink) {
	push_script(parser, sink, advance(parser))
	if (!expect(parser, "indent")) return
	for (let token = peek(parser); token.type != "outdent" && token.type != "eos"; token = peek(parser)) {
		if (token.type == "comment") {
			parse_comment(parser, sink)
		} else if (token.type == "newline") {
			advance(parser)
		} else if (token.type == "when") {
			push_script(parser, sink, advance(parser))
			if (peek(parser).type != "newline") parse_block_expansion(parser, sink)
		} else if (token.type == "default") {
			push_script(parser, sink, advance(parser))
			parse_block_expansion(parser, sink)
		} else {
			add_error(
				parser,
				`Expected "when", "default" or a line break, but found ${token_descriptions[token.type]}.`,
				token
			)
			parse_expr(parser, sink)
		}
	}
	flush(parser, sink)
	expect(parser, "outdent")
}
/**
 * @param {import("../../private.js").PugParser} parser
 * @param {import("../../private.js").MarkupNode[]} sink
 * @returns {void}
 */
function parse_comment(parser, sink) {
	flush(parser, sink)
	const token = advance(parser)
	if (peek(parser).type == "start-pipeless-text") {
		advance(parser)
		for (let next = peek(parser); next.type != "end-pipeless-text" && next.type != "eos"; next = peek(parser)) {
			if (next.type == "start-pug-interpolation") {
				advance(parser)
				parse_expr(parser, [])
				expect(parser, "end-pug-interpolation")
			} else {
				advance(parser)
				if (next.type != "text" && next.type != "newline" && next.type != "interpolated-code") {
					add_error(
						parser,
						`Did not expect ${token_descriptions[next.type]} here.`,
						next
					)
				}
			}
		}
		expect(parser, "end-pipeless-text")
	}
	push_node(
		parser,
		sink,
		{
			end: trim_end(
				parser.src,
				token.start,
				parser.last_end
			),
			start: token.start,
			type: "Comment"
		}
	)
}
/**
 * @param {import("../../private.js").PugParser} parser
 * @param {import("../../private.js").MarkupNode[]} sink
 * @returns {void}
 */
function parse_conditional(parser, sink) {
	push_script(parser, sink, advance(parser))
	if (peek(parser).type == "indent") block(parser, sink)
	for (;;) {
		const token = peek(parser)
		if (token.type == "newline") {
			advance(parser)
		} else if (token.type == "else-if") {
			push_script(parser, sink, advance(parser))
			if (peek(parser).type == "indent") block(parser, sink)
		} else if (token.type == "else") {
			push_script(parser, sink, advance(parser))
			if (peek(parser).type == "indent") block(parser, sink)
			break
		} else {
			break
		}
	}
}
/**
 * @param {import("../../private.js").PugParser} parser
 * @param {import("../../private.js").MarkupNode[]} sink
 * @returns {void}
 */
function parse_expr(parser, sink) {
	const token = peek(parser)
	switch (token.type) {
	case "tag":
		advance(parser)
		tag(
			parser,
			push_element(parser, sink, token, token.name),
			true
		)
		break
	case "mixin":
		push_script(parser, sink, advance(parser))
		if (peek(parser).type == "indent") {
			parser.in_mixin++
			block(parser, sink)
			parser.in_mixin--
		} else {
			add_error(
				parser,
				`The mixin "${token.name}" is declared without a body.`,
				token
			)
		}
		break
	case "block":
		advance(parser)
		if (peek(parser).type == "indent") block(parser, sink)
		break
	case "mixin-block":
		advance(parser)
		if (!parser.in_mixin) add_error(
			parser,
			"Anonymous blocks are not allowed unless they are part of a mixin.",
			token
		)
		break
	case "case":
		parse_case(parser, sink)
		break
	case "extends":
		advance(parser)
		expect(parser, "path")
		break
	case "include":
		parse_include(parser, sink)
		break
	case "doctype":
	case "yield":
		advance(parser)
		break
	case "filter":
		parse_filter(parser, sink)
		break
	case "comment":
		parse_comment(parser, sink)
		break
	case "text":
	case "interpolated-code":
	case "start-pug-interpolation":
		parse_text(parser, sink, true)
		break
	case "text-html":
		parse_text_html(parser, sink)
		break
	case "dot":
		advance(parser)
		parse_text_block(parser, sink)
		break
	case "each":
		push_script(parser, sink, advance(parser))
		block(parser, sink)
		if (peek(parser).type == "else") {
			push_script(parser, sink, advance(parser))
			block(parser, sink)
		}
		break
	case "eachOf":
		push_script(parser, sink, advance(parser))
		block(parser, sink)
		break
	case "code":
		push_script(parser, sink, advance(parser))
		if (peek(parser).type == "indent") {
			if (token.buffer) add_error(
				parser,
				"Buffered code cannot have a block attached to it.",
				peek(parser)
			)
			block(parser, sink)
		}
		break
	case "blockcode":
		parse_block_code(parser, sink)
		break
	case "if":
		parse_conditional(parser, sink)
		break
	case "while":
		push_script(parser, sink, advance(parser))
		if (peek(parser).type == "indent") block(parser, sink)
		break
	case "call":
		parse_call(parser, sink)
		break
	case "interpolation":
		advance(parser)
		tag(
			parser,
			push_element(
				parser,
				sink,
				token,
				parser.src.slice(token.start, token.end)
			),
			true
		)
		break
	case "id":
	case "class":
		tag(
			parser,
			push_element(
				parser,
				sink,
				{ ...token, end: token.start },
				"div"
			),
			true
		)
		break
	default:
		parse_unexpected(parser, sink)
	}
}
/**
 * @param {import("../../private.js").PugParser} parser
 * @param {import("../../private.js").MarkupNode[]} sink
 * @returns {void}
 */
function parse_filter(parser, sink) {
	advance(parser)
	skip_attrs(parser)
	const token = peek(parser)
	if (token.type == "text") {
		advance(parser)
		push_text(parser, sink, token)
	} else if (token.type == "filter") {
		parse_filter(parser, sink)
	} else {
		parse_text_block(parser, sink)
	}
}
/**
 * @param {import("../../private.js").PugParser} parser
 * @param {import("../../private.js").MarkupNode[]} sink
 * @returns {void}
 */
function parse_include(parser, sink) {
	advance(parser)
	let filters = 0
	while (peek(parser).type == "filter") {
		advance(parser)
		skip_attrs(parser)
		filters++
	}
	const path = peek(parser)
	if (!expect(parser, "path")) return
	if (pug_path_regex.test(
		parser.src.slice(path.start, path.end).trim()
	) && !filters) {
		if (peek(parser).type == "indent") block(parser, sink)
	} else if (peek(parser).type == "indent") {
		add_error(
			parser,
			"Raw inclusion cannot contain a block.",
			peek(parser)
		)
		block(parser, sink)
	}
}
/**
 * @param {import("../../private.js").PugParser} parser
 * @param {import("../../private.js").MarkupNode[]} sink
 * @param {boolean} block_text
 * @returns {void}
 */
function parse_text(parser, sink, block_text) {
	for (let token = peek(parser); ; token = peek(parser)) {
		if (token.type == "text") {
			advance(parser)
			push_text(parser, sink, token)
		} else if (token.type == "interpolated-code") {
			push_script(parser, sink, advance(parser))
		} else if (token.type == "newline" && block_text) {
			advance(parser)
		} else if (token.type == "start-pug-interpolation") {
			advance(parser)
			parse_expr(parser, sink)
			expect(parser, "end-pug-interpolation")
		} else {
			break
		}
	}
}
/**
 * @param {import("../../private.js").PugParser} parser
 * @param {import("../../private.js").MarkupNode[]} sink
 * @returns {void}
 */
function parse_text_block(parser, sink) {
	if (peek(parser).type != "start-pipeless-text") return
	advance(parser)
	for (let token = peek(parser); token.type != "end-pipeless-text" && token.type != "eos"; token = peek(parser)) {
		if (token.type == "start-pug-interpolation") {
			advance(parser)
			parse_expr(parser, sink)
			expect(parser, "end-pug-interpolation")
		} else if (token.type == "interpolated-code") {
			push_script(parser, sink, advance(parser))
		} else {
			advance(parser)
			if (token.type == "text") {
				push_text(parser, sink, token)
			} else if (token.type != "newline") {
				add_error(
					parser,
					`Did not expect ${token_descriptions[token.type]} here.`,
					token
				)
			}
		}
	}
	expect(parser, "end-pipeless-text")
}
/**
 * @param {import("../../private.js").PugParser} parser
 * @param {import("../../private.js").MarkupNode[]} sink
 * @returns {void}
 */
function parse_text_html(parser, sink) {
	for (let token = peek(parser); ; token = peek(parser)) {
		if (token.type == "text-html") {
			advance(parser)
			push_text(parser, sink, token)
		} else if (token.type == "indent") {
			block(parser, sink)
		} else if (token.type == "code") {
			push_script(parser, sink, advance(parser))
		} else if (token.type == "newline") {
			advance(parser)
		} else {
			break
		}
	}
}
/**
 * @param {import("../../private.js").PugParser} parser
 * @param {import("../../private.js").MarkupNode[]} sink
 * @returns {void}
 */
function parse_unexpected(parser, sink) {
	const token = peek(parser)
	add_error(
		parser,
		`Did not expect ${token_descriptions[token.type]} here.`,
		token
	)
	if (token.type == "indent") {
		block(parser, sink)
	} else if (token.type == "else" || token.type == "else-if" || token.type == "when" || token.type == "default") {
		push_script(parser, sink, advance(parser))
		if (peek(parser).type == "indent" || peek(parser).type == ":") parse_block_expansion(parser, sink)
	} else if (token.type == "start-pipeless-text") {
		parse_text_block(parser, sink)
	} else if (token.type == "start-attributes") {
		skip_attrs(parser)
	} else if (token.type != "eos" && token.type != "newline" && token.type != "outdent") {
		advance(parser)
	}
}
/**
 * @param {import("../../private.js").PugParser} parser
 * @returns {import("../../private.js").PugToken}
 */
function peek(parser) {
	const token = /** @type {import("../../private.js").PugToken} */(parser.tokens[parser.index])/**/
	const comments = parser.comments.get(token)
	if (comments) {
		for (const comment of comments) parser.pending.push(comment)
		parser.comments.delete(token)
	}
	return token
}
/**
 * @param {import("../../private.js").PugParser} parser
 * @param {import("../../private.js").MarkupNode[]} sink
 * @param {import("../../private.js").PugToken} token
 * @param {string} name
 * @returns {import("../../public.js").Element}
 */
function push_element(parser, sink, token, name) {
	/** @type {import("../../public.js").Element} */
	const element = {
		attributes: [],
		children: [],
		end: token.end,
		name,
		start: token.start,
		subType: "open",
		type: "Element"
	}
	push_node(parser, sink, element)
	return element
}
/**
 * @param {import("../../private.js").PugParser} parser
 * @param {import("../../private.js").MarkupNode[]} sink
 * @param {import("../../private.js").MarkupNode} node
 * @returns {void}
 */
function push_node(parser, sink, node) {
	flush(parser, sink)
	sink.push(node)
}
/**
 * @param {import("../../private.js").PugParser} parser
 * @param {import("../../private.js").MarkupNode[]} sink
 * @param {import("../../private.js").PugToken} token
 * @returns {import("../../public.js").Script & { subType: "pug" }}
 */
function push_script(parser, sink, token) {
	const end = trim_end(parser.src, token.start, token.end)
	/** @type {import("../../public.js").Script & { subType: "pug" }} */
	const script = {
		end,
		start: token.start,
		strings: token.code_start < 0
			? []
			: scan_code(
				parser.src,
				parser.errors,
				token.code_start,
				Math.min(token.code_end, end),
				token.type == "code" && !token.buffer
			),
		subType: "pug",
		type: "Script"
	}
	push_node(parser, sink, script)
	return script
}
/**
 * @param {import("../../private.js").PugParser} parser
 * @param {import("../../private.js").MarkupNode[]} sink
 * @param {import("../../private.js").PugToken} token
 * @returns {void}
 */
function push_text(parser, sink, token) {
	if (token.end > token.start) {
		push_node(
			parser,
			sink,
			{
				end: token.end,
				start: token.start,
				type: "Text"
			}
		)
	}
}
/**
 * @param {import("../../public.js").AstNode[]} ast
 * @param {import("../../public.js").AstSyntaxError[]} errors
 * @param {Int32Array | undefined} offsets
 * @param {number} base
 * @returns {void}
 */
function remap(ast, errors, offsets, base) {
	/**
	 * @param {number} index
	 * @returns {number}
	 */
	function position(index) {
		return base + (offsets
			? /** @type {number} */(offsets[index])/**/
			: index)
	}
	for (const error of errors) {
		error.end = position(error.end)
		error.start = position(error.start)
	}
	const pending = [ ...ast ]
	for (let node = pending.pop(); node; node = pending.pop()) {
		node.end = position(node.end)
		node.start = position(node.start)
		if (node.type == "Attribute") {
			if (node.value !== true) pending.push(node.value)
		} else if (node.type == "Element") {
			for (const attribute of node.attributes) pending.push(attribute)
			for (const child of node.children) pending.push(child)
		} else if (node.type == "Script") {
			for (const string of node.strings) pending.push(string)
		} else if (node.type == "String") {
			for (const script of node.scripts) pending.push(script)
		}
	}
}
/**
 * @param {import("../../private.js").PugParser} parser
 * @returns {void}
 */
function skip_attrs(parser) {
	if (peek(parser).type != "start-attributes") return
	advance(parser)
	while (peek(parser).type == "attribute") advance(parser)
	expect(parser, "end-attributes")
}
/**
 * @param {string} src
 * @param {import("../../private.js").PugToken[]} tokens
 * @param {import("../../public.js").AstSyntaxError[]} errors
 * @returns {import("../../private.js").PugParser}
 */
function strip_comments(src, tokens, errors) {
	/** @type {Map<import("../../private.js").PugToken, import("../../public.js").Comment[]>} */
	const comments = new Map()
	/** @type {import("../../private.js").PugToken[]} */
	const kept = []
	/** @type {import("../../public.js").Comment[]} */
	let pending = []
	/** @type {import("../../public.js").Comment | undefined} */
	let comment
	let in_pipeless_text = false
	for (const token of tokens) {
		if (comment) {
			if (token.type == "start-pipeless-text") {
				in_pipeless_text = true
				continue
			}
			if (token.type == "end-pipeless-text") {
				comment = undefined
				in_pipeless_text = false
				continue
			}
			if (token.type == "text" || in_pipeless_text) {
				comment.end = Math.max(
					comment.end,
					trim_end(src, comment.start, token.end)
				)
				continue
			}
			comment = undefined
		}
		if (token.type == "comment" && !token.buffer) {
			comment = {
				end: trim_end(src, token.start, token.end),
				start: token.start,
				type: "Comment"
			}
			pending.push(comment)
			continue
		}
		if (pending.length > 0) {
			comments.set(token, pending)
			pending = []
		}
		kept.push(token)
	}
	return {
		comments,
		errors,
		in_mixin: 0,
		index: 0,
		last_end: 0,
		pending: [],
		src,
		tokens: kept
	}
}
/**
 * @param {import("../../private.js").PugParser} parser
 * @param {import("../../public.js").Element} element
 * @param {boolean} self_closing_allowed
 * @returns {void}
 */
function tag(
	parser,
	element,
	self_closing_allowed
) {
	/** @type {Set<string>} */
	const names = new Set()
	for (let token = peek(parser); ; token = peek(parser)) {
		if (token.type == "id" || token.type == "class") {
			advance(parser)
			if (token.type == "id") {
				if (names.has("id")) add_error(
					parser,
					"Duplicate attribute \"id\" is not allowed.",
					token
				)
				names.add("id")
			}
			element.attributes.push(
				{
					end: token.end,
					name: token.type,
					start: token.start,
					type: "Attribute",
					value: token.value_start < 0
						? true
						: {
							end: token.value_end,
							scripts: [],
							start: token.value_start,
							subType: "unquoted",
							type: "String"
						}
				}
			)
		} else if (token.type == "start-attributes") {
			attrs(parser, element, names)
		} else if (token.type == "&attributes") {
			advance(parser)
			element.attributes.push(
				{
					end: token.end,
					name: "",
					start: token.start,
					type: "Attribute",
					value: {
						end: token.end,
						start: token.start,
						strings: token.code_start < 0
							? []
							: scan_code(
								parser.src,
								parser.errors,
								token.code_start,
								token.code_end,
								false
							),
						subType: "pug",
						type: "Script"
					}
				}
			)
		} else {
			break
		}
	}
	const text_only = peek(parser).type == "dot"
	if (text_only) advance(parser)
	const token = peek(parser)
	if (token.type == "text" || token.type == "interpolated-code") {
		parse_text(parser, element.children, false)
	} else if (token.type == "code") {
		push_script(
			parser,
			element.children,
			advance(parser)
		)
	} else if (token.type == ":") {
		advance(parser)
		parse_expr(parser, element.children)
	} else if (token.type == "slash" && self_closing_allowed) {
		advance(parser)
		element.subType = "closed"
	} else if (!tag_end_tokens.has(token.type)) {
		add_error(
			parser,
			`Expected text, code, ":"${self_closing_allowed ? ", \"/\"" : ""}, a line break or the end of the input`
				+ ` after the tag, but found ${token_descriptions[token.type]}.`,
			token
		)
	}
	while (peek(parser).type == "newline") advance(parser)
	if (text_only) {
		element.children.length = 0
		parse_text_block(parser, element.children)
	} else if (peek(parser).type == "indent") {
		block(parser, element.children)
	}
	element.end = Math.max(
		element.end,
		parser.last_end,
		element.children[element.children.length - 1]?.end ?? 0
	)
}
/**
 * @param {string} src
 * @param {number} start
 * @param {number} end
 * @returns {number}
 */
function trim_end(src, start, end) {
	let index = end
	while (index > start && is_js_whitespace(
		/** @type {string} */(src[index - 1])/**/
	)) index--
	return index
}
/**
 * @param {string} text
 * @param {boolean | undefined} include_text
 * @param {number} base
 * @param {boolean} dedent
 * @returns {{
 *   ast: import("../../private.js").MarkupNode[]
 *   errors: import("../../public.js").AstSyntaxError[]
 * }}
 */
export default function(text, include_text, base, dedent) {
	/** @type {import("../../public.js").AstSyntaxError[]} */
	const errors = []
	try {
		let offsets = normalize_offsets(text)
		let src = offsets
			? normalize(text)
			: text
		const dedented = dedent
			? dedent_lines(src, offsets)
			: undefined
		if (dedented) {
			offsets = dedented.offsets
			src = dedented.src
		}
		const parser = strip_comments(src, lex(src, errors), errors)
		/** @type {import("../../private.js").MarkupNode[]} */
		const ast = []
		for (let token = peek(parser); token.type != "eos"; token = peek(parser)) {
			if (token.type == "newline" || token.type == "outdent") {
				advance(parser)
				continue
			}
			const node_count = ast.length
			try {
				if (token.type == "text-html") {
					parse_text_html(parser, ast)
				} else {
					parse_expr(parser, ast)
				}
			} catch (error) {
				if (!(error instanceof RangeError)) throw error
				ast.length = node_count
				parser.pending = []
				errors.push(
					create_ast_syntax_error(
						"The input is nested too deeply.",
						token.start,
						src.length
					)
				)
				break
			}
		}
		flush(parser, ast)
		if (offsets || base) remap(ast, errors, offsets, base)
		if (include_text) set_text(text, ast)
		return { ast, errors }
	} catch (error) {
		if (!(error instanceof RangeError)) throw error
		return {
			ast: [],
			errors: [
				create_ast_syntax_error(
					"The input is nested too deeply.",
					base,
					base + text.length
				)
			]
		}
	}
}