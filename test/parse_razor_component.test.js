import {
	attribute_node,
	check_non_string_input,
	class_attributes,
	element_names,
	element_node,
	razor_component,
	razor_items,
	razor_node,
	string_node,
	text_node
} from "./helpers.js"
import { parseRazorComponent } from "dom-eater"
import { describe, expect, it } from "vitest"
describe(
	"parseRazorComponent",
	() => {
		describe(
			"agreement with the Razor compiler",
			() => {
				it.each(
					[
						[
							"<!p class=\"a\">x</!p>",
							[
								"attribute 4-13 \"class\" 10-13",
								"element 0-20 open \"p\""
							]
						],
						[
							"</p x><p></P>",
							[
								"element 0-4 close \"p\"",
								"element 6-13 open \"p\""
							]
						],
						[
							"<<<<<<< HEAD\n@code { int a; }\n=======\n@code { int b; }\n>>>>>>> b\n<p/>",
							[
								"attribute 13-18 \"@code\" true",
								"attribute 19-20 \"{\" true",
								"attribute 21-24 \"int\" true",
								"attribute 25-27 \"a;\" true",
								"attribute 28-31 \"}\" true",
								"attribute 8-12 \"HEAD\" true",
								"element 0-1 open \"\"",
								"element 1-2 open \"\"",
								"element 2-3 open \"\"",
								"element 3-4 open \"\"",
								"element 4-5 open \"\"",
								"element 5-6 open \"\"",
								"element 6-69 open \"\"",
								"element 65-69 closed \"p\"",
								"script 38-54"
							]
						],
						[
							"<EditForm Model=\"@model\"><p>@model.Name</p></EditForm>",
							[
								"attribute 10-24 \"Model\" 16-24",
								"element 0-54 open \"EditForm\"",
								"element 25-43 open \"p\"",
								"script 17-23",
								"script 28-39"
							]
						],
						[
							"<div><br></div>",
							[
								"element 0-15 open \"div\"",
								"element 5-9 open \"br\""
							]
						],
						[
							"<input @@*bind=\"name\" />",
							[
								"attribute 7-21 \"@@*bind\" 15-21",
								"element 0-24 closed \"input\""
							]
						],
						[
							"<input disabled><p/ >",
							[
								"attribute 7-15 \"disabled\" true",
								"element 0-16 open \"input\"",
								"element 16-19 closed \"p\""
							]
						],
						[
							"<p @attrs @(cond ? \"x\" : \"\")>",
							[
								"attribute 10-16 \"@(cond\" true",
								"attribute 17-18 \"?\" true",
								"attribute 19-22 \"\\\"x\\\"\" true",
								"attribute 23-24 \":\" true",
								"attribute 25-28 \"\\\"\\\")\" true",
								"attribute 3-9 \"@attrs\" true",
								"element 0-29 open \"p\""
							]
						],
						[
							"<p @onclick=\"x\" @bind-Value:event=\"y\">",
							[
								"attribute 16-37 \"@bind-Value:event\" 34-37",
								"attribute 3-15 \"@onclick\" 12-15",
								"element 0-38 open \"p\""
							]
						],
						[
							"<p class= x>",
							[
								"attribute 10-11 \"x\" true",
								"attribute 3-9 \"class\" true",
								"element 0-12 open \"p\""
							]
						],
						[
							"<p class=\"@(a ? \"b",
							[
								"attribute 3-18 \"class\" 9-18",
								"element 0-18 open \"p\"",
								"script 10-18",
								"string 16-18"
							]
						],
						[
							"<p class=\"@(a ? \"b\" : \"c\") d\">",
							[
								"attribute 3-29 \"class\" 9-29",
								"element 0-30 open \"p\"",
								"script 10-26",
								"string 16-19",
								"string 22-25"
							]
						],
						[
							"<p class=\"a @b\">@c.d</p>",
							[
								"attribute 3-15 \"class\" 9-15",
								"element 0-24 open \"p\"",
								"script 12-14",
								"script 16-20"
							]
						],
						[
							"<p class=\"x\" @* c *@ id=\"y\">",
							[
								"attribute 13-20 \"@* c *@\" true",
								"attribute 21-27 \"id\" 24-27",
								"attribute 3-12 \"class\" 9-12",
								"element 0-28 open \"p\""
							]
						],
						[
							"<p class=@x>",
							[
								"attribute 3-11 \"class\" 9-11",
								"element 0-12 open \"p\"",
								"script 9-11"
							]
						],
						[
							"<p class=a\"b>",
							[
								"attribute 10-12 \"\\\"b\" true",
								"attribute 3-10 \"class\" 9-10",
								"element 0-13 open \"p\""
							]
						],
						[
							"<p>@(a</p>",
							[
								"element 0-10 open \"p\"",
								"script 3-6"
							]
						],
						[
							"<p>a<p>b</p>",
							[
								"element 0-12 open \"p\"",
								"element 4-12 open \"p\""
							]
						],
						[
							"<script src=\"a\" /><p class=\"b\"></p></script>",
							[
								"attribute 8-15 \"src\" 12-15",
								"element 0-44 closed \"script\""
							]
						],
						[
							"<script type=\"text/html\"><p class=\"a\"></p></script>",
							[
								"attribute 28-37 \"class\" 34-37",
								"attribute 8-24 \"type\" 13-24",
								"element 0-51 open \"script\"",
								"element 25-42 open \"p\""
							]
						],
						[
							"<script>var a = \"<p>\"; @x</script><p/>",
							[
								"element 0-34 open \"script\"",
								"element 34-38 closed \"p\"",
								"script 23-25"
							]
						],
						[
							"<script>x",
							[ "element 0-8 open \"script\"" ]
						],
						[
							"<style>@@media x { .a { } }</style>",
							[ "element 0-35 open \"style\"" ]
						],
						[
							"<textarea><p></p></textarea>",
							[
								"element 0-28 open \"textarea\"",
								"element 10-17 open \"p\""
							]
						],
						[
							"<ul>@foreach (var i in l) { <li>@i</li> }</ul>",
							[
								"element 0-46 open \"ul\"",
								"element 28-39 open \"li\"",
								"script 32-34",
								"script 4-41"
							]
						],
						[
							"=======\n@x <p/>",
							[
								"element 11-15 closed \"p\"",
								"script 8-10"
							]
						],
						[
							"@(\"a\" + @\"b\"\"c\" + $\"d{e}f\" + $@\"g{h}\" + "
										+ "\"\"\"i\"\"\" + $$\"\"\"j{{k}}\"\"\" + \"l\"u8 + 'm')",
							[
								"script 0-79",
								"string 19-26",
								"string 2-5",
								"string 31-37",
								"string 40-47",
								"string 52-64",
								"string 67-70",
								"string 9-15"
							]
						],
						[
							"@($\"\\{\" ",
							[ "script 0-7", "string 3-7" ]
						],
						[
							"@($\"\\{{\" ",
							[ "script 0-8", "string 3-8" ]
						],
						[
							"@(a) @(a <p>b</p>",
							[
								"element 9-17 open \"p\"",
								"script 0-4",
								"script 5-8"
							]
						],
						[
							"@* c *@<p/>",
							[
								"comment 0-7",
								"element 7-11 closed \"p\""
							]
						],
						[
							"@@x <p>@@y</p>",
							[ "element 4-14 open \"p\"" ]
						],
						[
							"@a.b()\n<<<<<<< HEAD\n<p/>",
							[
								"attribute 15-19 \"HEAD\" true",
								"element 10-11 open \"\"",
								"element 11-12 open \"\"",
								"element 12-13 open \"\"",
								"element 13-20 open \"\"",
								"element 20-24 closed \"p\"",
								"element 7-8 open \"\"",
								"element 8-9 open \"\"",
								"element 9-10 open \"\"",
								"script 0-6"
							]
						],
						[
							"@a.b.c @a.b. @a(b).c[d] @a?.b @a!.b @a<b>() @await Foo() @a-b",
							[
								"element 38-61 open \"b\"",
								"script 0-6",
								"script 13-23",
								"script 24-29",
								"script 30-35",
								"script 36-38",
								"script 44-56",
								"script 57-59",
								"script 7-11"
							]
						],
						[
							"@code { void M() { <p/> } }",
							[
								"element 19-23 closed \"p\"",
								"script 0-27"
							]
						],
						[
							"@for (var i = 0; i < n; i++) { <p/> } @while (a) { <b/> } @do { <i/> } while (a);",
							[
								"element 31-35 closed \"p\"",
								"element 51-55 closed \"b\"",
								"element 64-68 closed \"i\"",
								"script 0-37",
								"script 38-57",
								"script 58-81"
							]
						],
						[
							"@helper x @class",
							[ "script 0-7", "script 10-16" ]
						],
						[
							"@if (a) { <p class=\"",
							[
								"attribute 13-20 \"class\" 19-20",
								"element 10-20 open \"p\"",
								"script 0-20"
							]
						],
						[
							"@if (a) { <p/> } else if (b) { <b/> } else { <i/> }",
							[
								"element 10-14 closed \"p\"",
								"element 31-35 closed \"b\"",
								"element 45-49 closed \"i\"",
								"script 0-51"
							]
						],
						[
							"@if(@</>\n<",
							[
								"element 5-8 close \"\"",
								"script 0-10"
							]
						],
						[
							"@layout L\n@rendermode InteractiveServer\n@typeparam T where T : class\n<p/>",
							[
								"element 69-73 closed \"p\"",
								"script 0-9",
								"script 10-39",
								"script 40-68"
							]
						],
						[
							"@page \"/x\"\n@inject IFoo Foo\n@attribute [A(\"x\")]\n"
										+ "@namespace A.B\n@addTagHelper *, A\n<p/>",
							[
								"element 82-86 closed \"p\"",
								"script 0-10",
								"script 11-27",
								"script 28-47",
								"script 48-62",
								"script 63-81",
								"string 42-45",
								"string 6-10"
							]
						],
						[
							"@switch (a) { case 1: <p/> break; default: <b/> break; }",
							[
								"element 22-26 closed \"p\"",
								"element 43-47 closed \"b\"",
								"script 0-56"
							]
						],
						[
							"@try { <p/> } catch (E e) when (x) { <b/> } finally { <i/> }",
							[
								"element 37-41 closed \"b\"",
								"element 54-58 closed \"i\"",
								"element 7-11 closed \"p\"",
								"script 0-60"
							]
						],
						[
							"@using (a) { <p/> } @lock (a) { <b/> }",
							[
								"element 13-17 closed \"p\"",
								"element 32-36 closed \"b\"",
								"script 0-19",
								"script 20-38"
							]
						],
						[
							"@using System.Linq\n<p/>",
							[
								"element 19-23 closed \"p\"",
								"script 0-18"
							]
						],
						[
							"@{\n#if DEBUG\n<p/>\n#else\n<b/>\n#endif\n}",
							[
								"element 24-28 closed \"b\"",
								"script 0-37"
							]
						],
						[
							"@{ // c <p>\n <b/> /* <i> */ <u/> }",
							[
								"element 13-17 closed \"b\"",
								"element 28-32 closed \"u\"",
								"script 0-34"
							]
						],
						[
							"@{ <br> <p/> }",
							[
								"element 3-7 open \"br\"",
								"element 8-12 closed \"p\"",
								"script 0-14"
							]
						],
						[
							"@{ <br></br> }",
							[
								"element 3-12 open \"br\"",
								"script 0-14"
							]
						],
						[
							"@{ <p",
							[
								"element 3-5 open \"p\"",
								"script 0-5"
							]
						],
						[
							"@{ <p>unclosed }",
							[
								"element 3-16 open \"p\"",
								"script 0-16"
							]
						],
						[
							"@{ <text>t</text> } @{ @: a @b\n}",
							[
								"element 3-17 open \"text\"",
								"script 0-19",
								"script 20-32"
							]
						],
						[
							"@{ Func<int, object> f = @<p>@item</p>; }",
							[
								"element 26-38 open \"p\"",
								"script 0-41",
								"script 29-34"
							]
						],
						[
							"@{ List<int> a = new(); <p/> }",
							[
								"element 24-28 closed \"p\"",
								"script 0-30"
							]
						],
						[
							"@{ var a = \"x\"; <p>@a</p> }",
							[
								"element 16-25 open \"p\"",
								"script 0-27",
								"script 19-21",
								"string 11-14"
							]
						],
						[
							"@{ var s = $\"x\\{y\"; <p/> }",
							[
								"element 20-24 closed \"p\"",
								"script 0-26",
								"string 12-18"
							]
						],
						[
							"@{ var x = y switch { 1 => \"a\", _ => \"b\" }; <p/> }",
							[
								"element 44-48 closed \"p\"",
								"script 0-50",
								"string 27-30",
								"string 37-40"
							]
						],
						[
							"a@b.com <p>x@y @z</p>",
							[
								"element 8-21 open \"p\"",
								"script 15-17"
							]
						]
					]
				)(
					"%j",
					(source, expected) => {
						expect(
							razor_items(source, parseRazorComponent)
						).toStrictEqual(expected)
					}
				)
			}
		)
		describe(
			"attributes",
			() => {
				it(
					"reads directive attributes as attributes in components",
					() => {
						expect(
							razor_component(
								"<button class=\"btn\" @onclick=\"Toggle\" @onclick:preventDefault>+</button>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<button class=\"btn\" @onclick=\"Toggle\" @onclick:preventDefault>+</button>",
										"button",
										"open",
										[
											attribute_node(
												"class=\"btn\"",
												"class",
												string_node("\"btn\"", "double")
											),
											attribute_node(
												"@onclick=\"Toggle\"",
												"@onclick",
												string_node("\"Toggle\"", "double")
											),
											attribute_node(
												"@onclick:preventDefault",
												"@onclick:preventDefault"
											)
										],
										[ text_node("+") ]
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
					"parses the code block of a component",
					() => {
						expect(
							razor_component(
								"@code {\n\tstring cls = \"a\";\n}"
							)
						).toStrictEqual(
							{
								ast: [
									razor_node(
										"@code {\n\tstring cls = \"a\";\n}",
										[ string_node("\"a\"", "double") ]
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
			"frameworks",
			() => {
				it(
					"Blazor",
					() => {
						const result = razor_component(
							"@page \"/counter\"\n@rendermode InteractiveServer\n<h1 class=\"title\">Counter</h1>\n"
								+ "<button class=\"btn @(count > 5 ? \"btn-danger\" : \"btn-primary\")\" "
								+ "@onclick=\"Increment\">"
								+ "Clicked @count times</button>\n"
								+ "@if (count > 0)\n{\n\t<p class=\"count\">It's @count</p>\n}\n"
								+ "@code {\n\tprivate int count = 0;\n\tprivate void Increment() => count++;\n}"
						)
						expect(result.errors).toStrictEqual([])
						expect(element_names(result.ast)).toStrictEqual([ "h1", "button", "p" ])
						expect(class_attributes(result.ast)).toStrictEqual(
							[
								"class=\"title\"",
								"class=\"btn @(count > 5 ? \"btn-danger\" : \"btn-primary\")\"",
								"class=\"count\""
							]
						)
					}
				)
			}
		)
		it(
			"reports input that is not a string instead of throwing",
			() => {
				check_non_string_input(parseRazorComponent)
			}
		)
	}
)