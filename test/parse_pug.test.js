/** @import { AstNode } from "dom-eater" */
import {
	attribute_node,
	check_invariants,
	check_non_string_input,
	class_attributes,
	comment_node,
	element_names,
	element_node,
	pug,
	pug_node,
	script_node,
	string_node,
	text_node
} from "./helpers.js"
import { parsePug } from "dom-eater"
import { describe, expect, it } from "vitest"
/**
 * @param {string} source
 * @returns {string[]}
 */
function pug_items(source) {
	const result = parsePug(source, true)
	check_invariants(source, result, true)
	/** @type {string[]} */
	const items = []
	/** @type {[ AstNode, number, boolean ][]} */
	const pending = result.ast.map(node => [ node, -1, false ])
	for (let entry = pending.pop(); entry; entry = pending.pop()) {
		const [ node, parent, in_value ] = entry
		if (node.type == "Element") {
			items.push(
				`element ${node.start} ${JSON.stringify(node.name)} parent=${parent}`
			)
			for (const attribute of node.attributes) {
				const value = attribute.value === true
					? "true"
					: `${attribute.value.start}-${attribute.value.end}`
				const name = JSON.stringify(attribute.name)
				items.push(
					`attribute ${attribute.start}-${attribute.end} ${name} ${value} owner=${node.start}`
				)
				if (attribute.value !== true && attribute.value.subType != "unquoted") pending.push(
					[ attribute.value, node.start, true ]
				)
			}
			for (const child of node.children) pending.push([ child, node.start, false ])
		} else if (node.type == "Script") {
			if (!in_value) items.push(
				`script ${node.start}-${node.end}`
			)
			for (const string of node.strings) pending.push([ string, parent, true ])
		} else if (node.type == "String") {
			items.push(
				`string ${node.start}-${node.end}`
			)
			for (const script of node.scripts) pending.push([ script, parent, true ])
		} else {
			items.push(
				`${node.type.toLowerCase()} ${node.start}-${node.end}`
			)
		}
	}
	return items.sort()
}
describe(
	"parsePug",
	() => {
		describe(
			"agreement with the Pug lexer and parser",
			() => {
				it.each(
					[
						[
							"#main.wrap",
							[
								"attribute 0-5 \"id\" 1-5 owner=0",
								"attribute 5-10 \"class\" 6-10 owner=0",
								"element 0 \"div\" parent=-1"
							]
						],
						[
							"#{tag}(class=\"a\") text",
							[
								"attribute 7-16 \"class\" 13-16 owner=0",
								"element 0 \"#{tag}\" parent=-1",
								"string 13-16",
								"text 18-22"
							]
						],
						[
							"+#{name}(\"x\")",
							[
								"attribute 8-13 \"\" 8-13 owner=0",
								"element 0 \"+#{name}\" parent=-1",
								"string 9-12"
							]
						],
						[
							"-\n  var a = \"x\"\n  var b = 'y'\np= a",
							[
								"element 30 \"p\" parent=-1",
								"script 0-29",
								"script 31-34",
								"string 12-15",
								"string 26-29"
							]
						],
						[
							"- if (a) {\n  p yes\n- }",
							[
								"element 13 \"p\" parent=-1",
								"script 0-10",
								"script 19-22",
								"text 15-18"
							]
						],
						[
							"- var list = [\"a\", 'b']\nul\n  each item, i in list\n"
								+ "    li(class=\"item-\" + i)= item",
							[
								"attribute 57-74 \"class\" 63-74 owner=54",
								"element 24 \"ul\" parent=-1",
								"element 54 \"li\" parent=24",
								"script 0-23",
								"script 29-49",
								"script 75-81",
								"string 14-17",
								"string 19-22",
								"string 63-70"
							]
						],
						[
							"- var s = `t ${\"u\"}`",
							[
								"script 0-20",
								"string 10-20",
								"string 15-18"
							]
						],
						[
							".a\n  .b\n    .c text",
							[
								"attribute 0-2 \"class\" 1-2 owner=0",
								"attribute 12-14 \"class\" 13-14 owner=12",
								"attribute 5-7 \"class\" 6-7 owner=5",
								"element 0 \"div\" parent=-1",
								"element 12 \"div\" parent=5",
								"element 5 \"div\" parent=0",
								"text 15-19"
							]
						],
						[
							".card(class=cond ? \"on\" : \"off\")",
							[
								"attribute 0-5 \"class\" 1-5 owner=0",
								"attribute 6-31 \"class\" 12-31 owner=0",
								"element 0 \"div\" parent=-1",
								"string 19-23",
								"string 26-31"
							]
						],
						[
							"// shown\n  also shown\np after",
							[
								"comment 0-21",
								"element 22 \"p\" parent=-1",
								"text 24-29"
							]
						],
						[
							"//- hidden\n  still hidden #{x}\np visible",
							[
								"comment 0-30",
								"element 31 \"p\" parent=-1",
								"text 33-40"
							]
						],
						[
							":markdown-it\n  # Title #{x}\n  body",
							[ "text 15-27", "text 30-34" ]
						],
						[
							"<div class=\"raw\">\n  p inner\n</div>",
							[
								"element 20 \"p\" parent=-1",
								"text 0-17",
								"text 22-27",
								"text 28-34"
							]
						],
						[
							"a(href=\"/\" + page, class='link')= label",
							[
								"attribute 19-31 \"class\" 25-31 owner=0",
								"attribute 2-17 \"href\" 7-17 owner=0",
								"element 0 \"a\" parent=-1",
								"script 32-39",
								"string 25-31",
								"string 7-10"
							]
						],
						[
							"a(href=\"x\"): img(src=\"y\")",
							[
								"attribute 17-24 \"src\" 21-24 owner=13",
								"attribute 2-10 \"href\" 7-10 owner=0",
								"element 0 \"a\" parent=-1",
								"element 13 \"img\" parent=0",
								"string 21-24",
								"string 7-10"
							]
						],
						[
							"a.b.c(d=\"e\").f(g)#h",
							[
								"attribute 1-3 \"class\" 2-3 owner=0",
								"attribute 12-14 \"class\" 13-14 owner=0",
								"attribute 15-16 \"g\" true owner=0",
								"attribute 17-19 \"id\" 18-19 owner=0",
								"attribute 3-5 \"class\" 4-5 owner=0",
								"attribute 6-11 \"d\" 8-11 owner=0",
								"element 0 \"a\" parent=-1",
								"string 8-11"
							]
						],
						[
							"block content // comment",
							[ "comment 14-24" ]
						],
						[
							"case kind\n  when \"a\"\n    p.a A\n  when \"b\": p.b B\n  when \"c:d\"\n    p c\n"
								+ "  default\n    p.d D",
							[
								"attribute 26-28 \"class\" 27-28 owner=25",
								"attribute 44-46 \"class\" 45-46 owner=43",
								"attribute 85-87 \"class\" 86-87 owner=84",
								"element 25 \"p\" parent=-1",
								"element 43 \"p\" parent=-1",
								"element 66 \"p\" parent=-1",
								"element 84 \"p\" parent=-1",
								"script 0-9",
								"script 12-20",
								"script 33-41",
								"script 51-61",
								"script 72-79",
								"string 17-20",
								"string 38-41",
								"string 56-61",
								"text 29-30",
								"text 47-48",
								"text 68-69",
								"text 88-89"
							]
						],
						[
							"div\n\tp tab\n\t\tspan deeper",
							[
								"element 0 \"div\" parent=-1",
								"element 13 \"span\" parent=5",
								"element 5 \"p\" parent=0",
								"text 18-24",
								"text 7-10"
							]
						],
						[
							"div\n    p four\n        span eight",
							[
								"element 0 \"div\" parent=-1",
								"element 23 \"span\" parent=8",
								"element 8 \"p\" parent=0",
								"text 10-14",
								"text 28-33"
							]
						],
						[
							"div(class=[\"a\", b], style={color: \"red\"})",
							[
								"attribute 20-40 \"style\" 26-40 owner=0",
								"attribute 4-18 \"class\" 10-18 owner=0",
								"element 0 \"div\" parent=-1",
								"string 11-14",
								"string 34-39"
							]
						],
						[
							"doctype html\nhtml(lang=\"en\")\n  head\n    title= pageTitle\n  body\n"
								+ "    h1.title Hello #{name}",
							[
								"attribute 18-27 \"lang\" 23-27 owner=13",
								"attribute 70-76 \"class\" 71-76 owner=68",
								"element 13 \"html\" parent=-1",
								"element 31 \"head\" parent=13",
								"element 40 \"title\" parent=31",
								"element 59 \"body\" parent=13",
								"element 68 \"h1\" parent=59",
								"script 45-56",
								"script 83-90",
								"string 23-27",
								"text 77-83"
							]
						],
						[
							"each value of values\n  p= value",
							[
								"element 23 \"p\" parent=-1",
								"script 0-20",
								"script 24-31"
							]
						],
						[
							"for [k, v] of map\n  p(title=k)= v",
							[
								"attribute 22-29 \"title\" 28-29 owner=20",
								"element 20 \"p\" parent=-1",
								"script 0-17",
								"script 30-33"
							]
						],
						[
							"if a\n  p one\n//- between\nelse\n  p two",
							[
								"comment 13-24",
								"element 32 \"p\" parent=-1",
								"element 7 \"p\" parent=-1",
								"script 0-4",
								"script 25-29",
								"text 34-37",
								"text 9-12"
							]
						],
						[
							"if user\n  p.a= user.name\nelse if guest\n  p.b guest\nelse\n  p.c anonymous",
							[
								"attribute 11-13 \"class\" 12-13 owner=10",
								"attribute 42-44 \"class\" 43-44 owner=41",
								"attribute 59-61 \"class\" 60-61 owner=58",
								"element 10 \"p\" parent=-1",
								"element 41 \"p\" parent=-1",
								"element 58 \"p\" parent=-1",
								"script 0-7",
								"script 13-24",
								"script 25-38",
								"script 51-55",
								"text 45-50",
								"text 62-71"
							]
						],
						[ "if-x", [ "script 0-4" ] ],
						[
							"iframe(src=\"x\")\nifx a",
							[
								"attribute 7-14 \"src\" 11-14 owner=0",
								"element 0 \"iframe\" parent=-1",
								"element 16 \"ifx\" parent=-1",
								"string 11-14",
								"text 20-21"
							]
						],
						[
							"img(src=\"a.png\")/",
							[
								"attribute 4-15 \"src\" 8-15 owner=0",
								"element 0 \"img\" parent=-1",
								"string 8-15"
							]
						],
						[
							"include ./header.pug\nextends layout\nblock content\n  p.a content\n"
								+ "block append scripts\n  script(src=\"x.js\")\nprepend head\n  meta",
							[
								"attribute 53-55 \"class\" 54-55 owner=52",
								"attribute 94-104 \"src\" 98-104 owner=87",
								"element 121 \"meta\" parent=-1",
								"element 52 \"p\" parent=-1",
								"element 87 \"script\" parent=-1",
								"string 98-104",
								"text 56-63"
							]
						],
						[ "include:markdown ./a.md", [] ],
						[
							"input(type=\"checkbox\" checked disabled=false)",
							[
								"attribute 22-29 \"checked\" true owner=0",
								"attribute 30-44 \"disabled\" 39-44 owner=0",
								"attribute 6-21 \"type\" 11-21 owner=0",
								"element 0 \"input\" parent=-1",
								"string 11-21"
							]
						],
						[
							"mixin button(label, cls=\"primary\")\n  button(class=cls)= label\n"
								+ "+button(\"Save\", \"btn\")(class=\"extra\")",
							[
								"attribute 44-53 \"class\" 50-53 owner=37",
								"attribute 69-84 \"\" 69-84 owner=62",
								"attribute 85-98 \"class\" 91-98 owner=62",
								"element 37 \"button\" parent=-1",
								"element 62 \"+button\" parent=-1",
								"script 0-34",
								"script 54-61",
								"string 24-33",
								"string 70-76",
								"string 78-83",
								"string 91-98"
							]
						],
						[
							"mixin item\n  li&attributes(attributes)\n    block\n+item.active(data-id=\"1\") text\n"
								+ "  span nested",
							[
								"attribute 15-38 \"\" 15-38 owner=13",
								"attribute 54-61 \"class\" 55-61 owner=49",
								"attribute 62-73 \"data-id\" 70-73 owner=49",
								"element 13 \"li\" parent=-1",
								"element 49 \"+item\" parent=-1",
								"element 82 \"span\" parent=49",
								"script 0-10",
								"string 70-73",
								"text 75-79",
								"text 87-93"
							]
						],
						[
							"my-element(v-if=\"show\" :class=\"{ a: b }\")",
							[
								"attribute 11-22 \"v-if\" 16-22 owner=0",
								"attribute 23-40 \":class\" 30-40 owner=0",
								"element 0 \"my-element\" parent=-1",
								"string 16-22",
								"string 30-40"
							]
						],
						[
							"p\n\n  span blank line",
							[
								"element 0 \"p\" parent=-1",
								"element 5 \"span\" parent=0",
								"text 10-20"
							]
						],
						[
							"p\n  //- inner\n  span a\n  //- last",
							[
								"comment 25-33",
								"comment 4-13",
								"element 0 \"p\" parent=-1",
								"element 16 \"span\" parent=0",
								"text 21-22"
							]
						],
						[
							"p\n  :cdata inline text",
							[
								"element 0 \"p\" parent=-1",
								"text 11-22"
							]
						],
						[
							"p\n  <b class=\"x\">#{y}</b>",
							[
								"element 0 \"p\" parent=-1",
								"script 17-21",
								"text 21-25",
								"text 4-17"
							]
						],
						[
							"p\n  | a\n  |\n  | b",
							[
								"element 0 \"p\" parent=-1",
								"text 16-17",
								"text 6-7"
							]
						],
						[
							"p\n  | piped #{a}\n  | again",
							[
								"element 0 \"p\" parent=-1",
								"script 12-16",
								"text 21-26",
								"text 6-12"
							]
						],
						[
							"p !{raw} and #{a ? 'b' : 'c'}",
							[
								"element 0 \"p\" parent=-1",
								"script 13-29",
								"script 2-8",
								"string 19-22",
								"string 25-28",
								"text 8-13"
							]
						],
						[
							"p #[- var x = 'y]']z",
							[
								"element 0 \"p\" parent=-1",
								"script 4-18",
								"string 14-18",
								"text 19-20"
							]
						],
						[
							"p #[a(href=\"x\") link] and #[em= y]",
							[
								"attribute 6-14 \"href\" 11-14 owner=4",
								"element 0 \"p\" parent=-1",
								"element 28 \"em\" parent=0",
								"element 4 \"a\" parent=0",
								"script 30-33",
								"string 11-14",
								"text 16-20",
								"text 21-26"
							]
						],
						[
							"p #[i.c #{x}] end",
							[
								"attribute 5-7 \"class\" 6-7 owner=4",
								"element 0 \"p\" parent=-1",
								"element 4 \"i\" parent=0",
								"script 8-12",
								"text 13-17"
							]
						],
						[
							"p #[span]",
							[
								"element 0 \"p\" parent=-1",
								"element 4 \"span\" parent=0"
							]
						],
						[
							"p #[strong= '[foo]']",
							[
								"element 0 \"p\" parent=-1",
								"element 4 \"strong\" parent=0",
								"script 10-19",
								"string 12-19"
							]
						],
						[
							"p a]b",
							[
								"element 0 \"p\" parent=-1",
								"text 2-5"
							]
						],
						[
							"p escaped \\#{a} \\#[b] and #{\"}\"}",
							[
								"element 0 \"p\" parent=-1",
								"script 26-32",
								"string 28-31",
								"text 2-26"
							]
						],
						[
							"p hello #[strong.x(title=\"t\") bold] world",
							[
								"attribute 16-18 \"class\" 17-18 owner=10",
								"attribute 19-28 \"title\" 25-28 owner=10",
								"element 0 \"p\" parent=-1",
								"element 10 \"strong\" parent=0",
								"string 25-28",
								"text 2-8",
								"text 30-34",
								"text 35-41"
							]
						],
						[
							"p text   \n  span",
							[
								"element 0 \"p\" parent=-1",
								"element 12 \"span\" parent=0",
								"text 2-9"
							]
						],
						[
							"p!= \"<b>\"",
							[
								"element 0 \"p\" parent=-1",
								"script 1-9",
								"string 4-9"
							]
						],
						[
							"p&attributes({class: \"x\"})",
							[
								"attribute 1-26 \"\" 1-26 owner=0",
								"element 0 \"p\" parent=-1",
								"string 21-24"
							]
						],
						[
							"p(\n  a=\"b\",\n  c=\"d\",\n)",
							[
								"attribute 14-19 \"c\" 16-19 owner=0",
								"attribute 5-10 \"a\" 7-10 owner=0",
								"element 0 \"p\" parent=-1",
								"string 16-19",
								"string 7-10"
							]
						],
						[
							"p(\"quoted key\"=\"v\" 'other'=1)",
							[
								"attribute 19-28 \"other\" 27-28 owner=0",
								"attribute 2-18 \"quoted key\" 15-18 owner=0",
								"element 0 \"p\" parent=-1",
								"string 15-18"
							]
						],
						[
							"p((click)=\"go()\" [prop]=\"x\" @event=\"y\" :bind=\"z\")",
							[
								"attribute 2-27 \"(click)\" 10-27 owner=0",
								"attribute 28-38 \"@event\" 35-38 owner=0",
								"attribute 39-48 \":bind\" 45-48 owner=0",
								"element 0 \"p\" parent=-1",
								"string 10-16",
								"string 24-27",
								"string 35-38",
								"string 45-48"
							]
						],
						[
							"p(a = \"b\" c = 'd')",
							[
								"attribute 10-17 \"c\" 14-17 owner=0",
								"attribute 2-9 \"a\" 6-9 owner=0",
								"element 0 \"p\" parent=-1",
								"string 14-17",
								"string 6-9"
							]
						],
						[
							"p(a!=\"<b>\")",
							[
								"attribute 2-10 \"a\" 5-10 owner=0",
								"element 0 \"p\" parent=-1",
								"string 5-10"
							]
						],
						[
							"p(a=\"b\"\n  c=\"d\"\n)",
							[
								"attribute 10-15 \"c\" 12-15 owner=0",
								"attribute 2-7 \"a\" 4-7 owner=0",
								"element 0 \"p\" parent=-1",
								"string 12-15",
								"string 4-7"
							]
						],
						[
							"p(a=\"b\",, c)",
							[
								"attribute 10-11 \"c\" true owner=0",
								"attribute 2-7 \"a\" 4-7 owner=0",
								"element 0 \"p\" parent=-1",
								"string 4-7"
							]
						],
						[
							"p(a=\"x\")(b=\"y\")",
							[
								"attribute 2-7 \"a\" 4-7 owner=0",
								"attribute 9-14 \"b\" 11-14 owner=0",
								"element 0 \"p\" parent=-1",
								"string 11-14",
								"string 4-7"
							]
						],
						[
							"p(a='it\\'s' b)",
							[
								"attribute 12-13 \"b\" true owner=0",
								"attribute 2-11 \"a\" 4-11 owner=0",
								"element 0 \"p\" parent=-1",
								"string 4-11"
							]
						],
						[
							"p(a=(x) => \"y\" b)",
							[
								"attribute 15-16 \"b\" true owner=0",
								"attribute 2-14 \"a\" 4-14 owner=0",
								"element 0 \"p\" parent=-1",
								"string 11-14"
							]
						],
						[
							"p(a=++ b)",
							[
								"attribute 2-8 \"a\" 4-8 owner=0",
								"element 0 \"p\" parent=-1"
							]
						],
						[
							"p(a=/re/g b)",
							[
								"attribute 10-11 \"b\" true owner=0",
								"attribute 2-9 \"a\" 4-9 owner=0",
								"element 0 \"p\" parent=-1"
							]
						],
						[
							"p(a=1. b=2)",
							[
								"attribute 2-6 \"a\" 4-6 owner=0",
								"attribute 7-10 \"b\" 9-10 owner=0",
								"element 0 \"p\" parent=-1"
							]
						],
						[
							"p(a=async b)",
							[
								"attribute 10-11 \"b\" true owner=0",
								"attribute 2-9 \"a\" 4-9 owner=0",
								"element 0 \"p\" parent=-1"
							]
						],
						[
							"p(a=b c=d)",
							[
								"attribute 2-5 \"a\" 4-5 owner=0",
								"attribute 6-9 \"c\" 8-9 owner=0",
								"element 0 \"p\" parent=-1"
							]
						],
						[
							"p(a=b, c=\"d\")",
							[
								"attribute 2-5 \"a\" 4-5 owner=0",
								"attribute 7-12 \"c\" 9-12 owner=0",
								"element 0 \"p\" parent=-1",
								"string 9-12"
							]
						],
						[
							"p(a=function () { return \"x\" } b)",
							[
								"attribute 2-30 \"a\" 4-30 owner=0",
								"attribute 31-32 \"b\" true owner=0",
								"element 0 \"p\" parent=-1",
								"string 25-28"
							]
						],
						[
							"p(a=new Date b)",
							[
								"attribute 13-14 \"b\" true owner=0",
								"attribute 2-12 \"a\" 4-12 owner=0",
								"element 0 \"p\" parent=-1"
							]
						],
						[
							"p(a=x\n  b=\"y\")",
							[
								"attribute 2-5 \"a\" 4-5 owner=0",
								"attribute 8-13 \"b\" 10-13 owner=0",
								"element 0 \"p\" parent=-1",
								"string 10-13"
							]
						],
						[
							"p(a=x\n) text",
							[
								"attribute 2-5 \"a\" 4-5 owner=0",
								"element 0 \"p\" parent=-1",
								"text 8-12"
							]
						],
						[
							"p(a=x + y z=1)",
							[
								"attribute 10-13 \"z\" 12-13 owner=0",
								"attribute 2-9 \"a\" 4-9 owner=0",
								"element 0 \"p\" parent=-1"
							]
						],
						[
							"p(a=x /* c */ b)",
							[
								"attribute 14-15 \"b\" true owner=0",
								"attribute 2-13 \"a\" 4-13 owner=0",
								"element 0 \"p\" parent=-1"
							]
						],
						[
							"p(a=x ? y : z w)",
							[
								"attribute 14-15 \"w\" true owner=0",
								"attribute 2-13 \"a\" 4-13 owner=0",
								"element 0 \"p\" parent=-1"
							]
						],
						[
							"p(a=x++ b)",
							[
								"attribute 2-7 \"a\" 4-7 owner=0",
								"attribute 8-9 \"b\" true owner=0",
								"element 0 \"p\" parent=-1"
							]
						],
						[
							"p(a=x++, b)",
							[
								"attribute 2-7 \"a\" 4-7 owner=0",
								"attribute 9-10 \"b\" true owner=0",
								"element 0 \"p\" parent=-1"
							]
						],
						[
							"p(class=\"a\") #[b(class=\"c\")]",
							[
								"attribute 17-26 \"class\" 23-26 owner=15",
								"attribute 2-11 \"class\" 8-11 owner=0",
								"element 0 \"p\" parent=-1",
								"element 15 \"b\" parent=0",
								"string 23-26",
								"string 8-11"
							]
						],
						[
							"p(class=\"a\")&attributes(attributes).b",
							[
								"attribute 12-35 \"\" 12-35 owner=0",
								"attribute 2-11 \"class\" 8-11 owner=0",
								"attribute 35-37 \"class\" 36-37 owner=0",
								"element 0 \"p\" parent=-1",
								"string 8-11"
							]
						],
						[
							"p(class=typeof x z)",
							[
								"attribute 17-18 \"z\" true owner=0",
								"attribute 2-16 \"class\" 8-16 owner=0",
								"element 0 \"p\" parent=-1"
							]
						],
						[
							"p(data-x=`a ${b ? \"c\" : \"d\"} e`)",
							[
								"attribute 2-31 \"data-x\" 9-31 owner=0",
								"element 0 \"p\" parent=-1",
								"string 18-21",
								"string 24-27",
								"string 9-31"
							]
						],
						[
							"p.\n    four\n  two",
							[
								"element 0 \"p\" parent=-1",
								"text 14-17",
								"text 5-11"
							]
						],
						[
							"p.\n  a\n    b\n  c",
							[
								"element 0 \"p\" parent=-1",
								"text 15-16",
								"text 5-6",
								"text 9-12"
							]
						],
						[
							"p.\n  line #{a}\n  line two",
							[
								"element 0 \"p\" parent=-1",
								"script 10-14",
								"text 17-25",
								"text 5-10"
							]
						],
						[
							"p.: span.x text",
							[ "element 0 \"p\" parent=-1" ]
						],
						[
							"p.a.b#c(class=\"d\") text",
							[
								"attribute 1-3 \"class\" 2-3 owner=0",
								"attribute 3-5 \"class\" 4-5 owner=0",
								"attribute 5-7 \"id\" 6-7 owner=0",
								"attribute 8-17 \"class\" 14-17 owner=0",
								"element 0 \"p\" parent=-1",
								"string 14-17",
								"text 19-23"
							]
						],
						[
							"p/",
							[ "element 0 \"p\" parent=-1" ]
						],
						[
							"p: span.a: b text",
							[
								"attribute 7-9 \"class\" 8-9 owner=3",
								"element 0 \"p\" parent=-1",
								"element 11 \"b\" parent=3",
								"element 3 \"span\" parent=0",
								"text 13-17"
							]
						],
						[
							"p= \"text\" + value",
							[
								"element 0 \"p\" parent=-1",
								"script 1-17",
								"string 3-9"
							]
						],
						[
							"p= a\n  | text",
							[
								"element 0 \"p\" parent=-1",
								"script 1-4",
								"text 9-13"
							]
						],
						[
							"script.\n  var a = \"#{b}\";\n  if (a) {}",
							[
								"element 0 \"script\" parent=-1",
								"script 19-23",
								"text 10-19",
								"text 23-25",
								"text 28-37"
							]
						],
						[
							"svg:rect(x=\"1\")",
							[
								"attribute 9-14 \"x\" 11-14 owner=0",
								"element 0 \"svg:rect\" parent=-1",
								"string 11-14"
							]
						],
						[
							"template(v-for=\"item in items\")\n  li(:key=\"item.id\" class=\"row\") {{ item.name }}",
							[
								"attribute 37-51 \":key\" 42-51 owner=34",
								"attribute 52-63 \"class\" 58-63 owner=34",
								"attribute 9-30 \"v-for\" 15-30 owner=0",
								"element 0 \"template\" parent=-1",
								"element 34 \"li\" parent=0",
								"string 15-30",
								"string 42-51",
								"string 58-63",
								"text 65-80"
							]
						],
						[
							"ul\n  each item in items\n    li= item\n  else\n    li.empty none",
							[
								"attribute 50-56 \"class\" 51-56 owner=48",
								"element 0 \"ul\" parent=-1",
								"element 28 \"li\" parent=0",
								"element 48 \"li\" parent=0",
								"script 30-36",
								"script 39-43",
								"script 5-23",
								"text 57-61"
							]
						],
						[
							"unless ok\n  p.error(class=\"x\") bad",
							[
								"attribute 13-19 \"class\" 14-19 owner=12",
								"attribute 20-29 \"class\" 26-29 owner=12",
								"element 12 \"p\" parent=-1",
								"script 0-9",
								"string 26-29",
								"text 31-34"
							]
						],
						[
							"whenever\nelsewhere\neachother(class=\"a\")",
							[
								"attribute 29-38 \"class\" 35-38 owner=19",
								"element 0 \"whenever\" parent=-1",
								"element 19 \"eachother\" parent=-1",
								"element 9 \"elsewhere\" parent=-1",
								"string 35-38"
							]
						],
						[
							"while n < 3\n  p= n++",
							[
								"element 14 \"p\" parent=-1",
								"script 0-11",
								"script 15-20"
							]
						],
						[
							"yield\ndoctype\np after",
							[
								"element 14 \"p\" parent=-1",
								"text 16-21"
							]
						]
					]
				)(
					"%j",
					(source, expected) => {
						expect(pug_items(source)).toStrictEqual(expected)
					}
				)
			}
		)
		describe(
			"attributes",
			() => {
				it(
					"ends expression values where the Pug lexer ends them",
					() => {
						expect(pug("p(a=x + y z=1 b=c++, d)")).toStrictEqual(
							{
								ast: [
									element_node(
										"p(a=x + y z=1 b=c++, d)",
										"p",
										"open",
										[
											attribute_node("a=x + y", "a", pug_node("x + y")),
											attribute_node("z=1", "z", pug_node("1")),
											attribute_node("b=c++", "b", pug_node("c++")),
											attribute_node("d", "d")
										]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"reads class and id literals as attributes",
					() => {
						expect(pug("a.btn#main(class=\"x\")")).toStrictEqual(
							{
								ast: [
									element_node(
										"a.btn#main(class=\"x\")",
										"a",
										"open",
										[
											attribute_node(
												".btn",
												"class",
												string_node("btn", "unquoted")
											),
											attribute_node(
												"#main",
												"id",
												string_node("main", "unquoted")
											),
											attribute_node(
												"class=\"x\"",
												"class",
												string_node("\"x\"", "double")
											)
										]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"reads mixin arguments and &attributes as attributes without a name",
					() => {
						expect(
							pug(
								"+btn(\"a\")(class=\"b\")&attributes({class: \"c\"})"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"+btn(\"a\")(class=\"b\")&attributes({class: \"c\"})",
										"+btn",
										"open",
										[
											attribute_node(
												"(\"a\")",
												"",
												pug_node(
													"(\"a\")",
													[ string_node("\"a\"", "double") ]
												)
											),
											attribute_node(
												"class=\"b\"",
												"class",
												string_node("\"b\"", "double")
											),
											attribute_node(
												"&attributes({class: \"c\"})",
												"",
												pug_node(
													"&attributes({class: \"c\"})",
													[ string_node("\"c\"", "double") ]
												)
											)
										]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"reads quoted string values as strings and other values as scripts",
					() => {
						expect(
							pug(
								"p(class='a' title=`b ${c}` data-x=[\"d\", e])"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"p(class='a' title=`b ${c}` data-x=[\"d\", e])",
										"p",
										"open",
										[
											attribute_node(
												"class='a'",
												"class",
												string_node("'a'", "single")
											),
											attribute_node(
												"title=`b ${c}`",
												"title",
												pug_node(
													"`b ${c}`",
													[
														string_node(
															"`b ${c}`",
															"backtick",
															[
																script_node("${c}", "template")
															]
														)
													]
												)
											),
											attribute_node(
												"data-x=[\"d\", e]",
												"data-x",
												pug_node(
													"[\"d\", e]",
													[ string_node("\"d\"", "double") ]
												)
											)
										]
									)
								],
								errors: []
							}
						)
					}
				)
			}
		)
		describe(
			"code",
			() => {
				it(
					"finds the strings of case, when and each lines",
					() => {
						expect(
							pug(
								"case kind\n  when \"a\": p.a\n  default\n    each item in [\"b\"]\n      p= item"
							)
						).toStrictEqual(
							{
								ast: [
									pug_node("case kind"),
									pug_node(
										"when \"a\"",
										[ string_node("\"a\"", "double") ]
									),
									element_node(
										"p.a",
										"p",
										"open",
										[
											attribute_node(
												".a",
												"class",
												string_node("a", "unquoted")
											)
										]
									),
									pug_node("default"),
									pug_node(
										"each item in [\"b\"]",
										[ string_node("\"b\"", "double") ]
									),
									element_node(
										"p= item",
										"p",
										"open",
										[],
										[ pug_node("= item") ]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"keeps the nodes of logic blocks in the enclosing element",
					() => {
						expect(
							pug(
								"ul\n  if a\n    li.x one\n  else\n    li two"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"ul\n  if a\n    li.x one\n  else\n    li two",
										"ul",
										"open",
										[],
										[
											pug_node("if a"),
											element_node(
												"li.x one",
												"li",
												"open",
												[
													attribute_node(
														".x",
														"class",
														string_node("x", "unquoted")
													)
												],
												[ text_node("one") ]
											),
											pug_node("else"),
											element_node(
												"li two",
												"li",
												"open",
												[],
												[ text_node("two") ]
											)
										]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"parses code lines, interpolations and block code",
					() => {
						expect(
							pug(
								"- var a = \"b\"\np= a\n  | #{c ? \"d\" : \"e\"}\n-\n  var f = 'g'"
							)
						).toStrictEqual(
							{
								ast: [
									pug_node(
										"- var a = \"b\"",
										[ string_node("\"b\"", "double") ]
									),
									element_node(
										"p= a\n  | #{c ? \"d\" : \"e\"}",
										"p",
										"open",
										[],
										[
											pug_node("= a"),
											pug_node(
												"#{c ? \"d\" : \"e\"}",
												[
													string_node("\"d\"", "double"),
													string_node("\"e\"", "double")
												]
											)
										]
									),
									pug_node(
										"-\n  var f = 'g'",
										[ string_node("'g'", "single") ]
									)
								],
								errors: []
							}
						)
					}
				)
			}
		)
		describe(
			"errors",
			() => {
				it(
					"drops a comment cut off inside a tag interpolation",
					() => {
						expect(pug("p #[//- x]")).toStrictEqual(
							{
								ast: [
									element_node("p #[//- x]", "p", "open")
								],
								errors: [
									{
										end: 10,
										message: "End of line was reached with no closing bracket for interpolation.",
										start: 2
									},
									{
										end: 10,
										message: "Did not expect \"]\" here.",
										start: 10
									},
									{
										end: 10,
										message: "Expected \"]\", but found the end of the input.",
										start: 10
									}
								]
							}
						)
					}
				)
				it(
					"ends an element typed at the end of the text there",
					() => {
						expect(pug("ul\n  li(class=\"a")).toStrictEqual(
							{
								ast: [
									element_node(
										"ul\n  li(class=\"a",
										"ul",
										"open",
										[],
										[
											element_node(
												"li(class=\"a",
												"li",
												"open",
												[
													attribute_node(
														"class=\"a",
														"class",
														string_node("\"a", "double")
													)
												]
											)
										]
									)
								],
								errors: [
									{
										end: 16,
										message: "The input ended before the closing \")\".",
										start: 7
									},
									{
										end: 16,
										message: "The double-quoted string is not closed.",
										start: 14
									}
								]
							}
						)
					}
				)
				it(
					"reports inconsistent indentation and goes on",
					() => {
						expect(pug("div\n    p a\n  span b")).toStrictEqual(
							{
								ast: [
									element_node(
										"div\n    p a\n  span b",
										"div",
										"open",
										[],
										[
											element_node(
												"p a",
												"p",
												"open",
												[],
												[ text_node("a") ]
											),
											element_node(
												"span b",
												"span",
												"open",
												[],
												[ text_node("b") ]
											)
										]
									)
								],
								errors: [
									{
										end: 14,
										message: "Inconsistent indentation. Expecting either 0 or 4 spaces/tabs.",
										start: 12
									}
								]
							}
						)
					}
				)
				it(
					"reports input nested too deeply instead of throwing, keeping the nodes before it",
					() => {
						expect(
							pug(`i\n${"a: ".repeat(10000)}b`)
						).toStrictEqual(
							{
								ast: [ element_node("i", "i", "open") ],
								errors: [
									{
										end: 30003,
										message: "The input is nested too deeply.",
										start: 2
									}
								]
							}
						)
					}
				)
				it(
					"reports parser errors as sentences without token names",
					() => {
						expect(pug("case a\n  p").errors).toStrictEqual(
							[
								{
									end: 10,
									message: "Expected \"when\", \"default\" or a line break, but found a tag.",
									start: 9
								}
							]
						)
						expect(pug("mixin m\np").errors).toStrictEqual(
							[
								{
									end: 7,
									message: "The mixin \"m\" is declared without a body.",
									start: 0
								}
							]
						)
					}
				)
			}
		)
		describe(
			"frameworks",
			() => {
				it(
					"Pug",
					() => {
						const result = pug(
							"doctype html\nhtml\n  head\n    title= title\n  body\n"
								+ "    nav.navbar(class=dark ? \"navbar-dark\" : \"navbar-light\")\n"
								+ "      each link in links\n        a.nav-link(href=link.url class=\"px-2\")= link.text\n"
								+ "    +card(\"Title\")(class=\"shadow\")\n"
								+ "    p #[strong.hl bold] and #{name}"
						)
						expect(result.errors).toStrictEqual([])
						expect(element_names(result.ast)).toStrictEqual(
							[
								"html",
								"head",
								"title",
								"body",
								"nav",
								"a",
								"+card",
								"p",
								"strong"
							]
						)
						expect(class_attributes(result.ast)).toStrictEqual(
							[
								".navbar",
								"class=dark ? \"navbar-dark\" : \"navbar-light\"",
								".nav-link",
								"class=\"px-2\"",
								"class=\"shadow\"",
								".hl"
							]
						)
					}
				)
			}
		)
		describe(
			"markup",
			() => {
				it(
					"hides the content of comments",
					() => {
						expect(
							pug(
								"//- a #{b}\n  c(class=\"d\")\np e\n// f\n  g"
							)
						).toStrictEqual(
							{
								ast: [
									comment_node("//- a #{b}\n  c(class=\"d\")"),
									element_node(
										"p e",
										"p",
										"open",
										[],
										[ text_node("e") ]
									),
									comment_node("// f\n  g")
								],
								errors: []
							}
						)
					}
				)
				it(
					"parses tag interpolations and piped text",
					() => {
						expect(
							pug("p a #[b.c d] e\n  | f #{g}")
						).toStrictEqual(
							{
								ast: [
									element_node(
										"p a #[b.c d] e\n  | f #{g}",
										"p",
										"open",
										[],
										[
											text_node("a "),
											element_node(
												"b.c d",
												"b",
												"open",
												[
													attribute_node(
														".c",
														"class",
														string_node("c", "unquoted")
													)
												],
												[ text_node("d") ]
											),
											text_node(" e"),
											text_node("f "),
											pug_node("#{g}")
										]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"reads dot blocks and inline HTML as text",
					() => {
						expect(
							pug(
								"script.\n  var a = \"b\"\n<div class=\"c\"></div>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"script.\n  var a = \"b\"",
										"script",
										"open",
										[],
										[ text_node("var a = \"b\"") ]
									),
									text_node("<div class=\"c\"></div>")
								],
								errors: []
							}
						)
					}
				)
			}
		)
		describe(
			"positions",
			() => {
				it(
					"maps positions in CRLF input to the original text",
					() => {
						expect(
							pug(
								"ul\r\n  li(class=\"a\") b\r\n  li c"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"ul\r\n  li(class=\"a\") b\r\n  li c",
										"ul",
										"open",
										[],
										[
											element_node(
												"li(class=\"a\") b",
												"li",
												"open",
												[
													attribute_node(
														"class=\"a\"",
														"class",
														string_node("\"a\"", "double")
													)
												],
												[ text_node("b") ]
											),
											element_node(
												"li c",
												"li",
												"open",
												[],
												[ text_node("c") ]
											)
										]
									)
								],
								errors: []
							}
						)
					}
				)
			}
		)
		it(
			"reports input that is not a string instead of throwing",
			() => {
				check_non_string_input(parsePug)
			}
		)
	}
)