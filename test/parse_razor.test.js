import {
	attribute_node,
	check_non_string_input,
	class_attributes,
	comment_node,
	element_names,
	element_node,
	razor,
	razor_items,
	razor_node,
	readme_example,
	string_node,
	text_node
} from "./helpers.js"
import { parseRazor } from "dom-eater"
import { describe, expect, it } from "vitest"
describe(
	"parseRazor",
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
							"<<<<<<< HEAD\n@model A\n=======\n@model B\n>>>>>>> b\n<p/>",
							[
								"attribute 8-12 \"HEAD\" true",
								"element 0-1 open \"\"",
								"element 1-2 open \"\"",
								"element 2-3 open \"\"",
								"element 3-4 open \"\"",
								"element 4-5 open \"\"",
								"element 49-53 closed \"p\"",
								"element 5-6 open \"\"",
								"element 6-53 open \"\"",
								"script 13-21",
								"script 30-38"
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
								"element 0-29 open \"p\"",
								"script 10-28",
								"script 3-9",
								"string 19-22",
								"string 25-27"
							]
						],
						[
							"<p @onclick=\"x\" @bind-Value:event=\"y\">",
							[
								"element 0-38 open \"p\"",
								"script 16-21",
								"script 3-11"
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
							"<pre>\nTitle\n=======\n@Model.Body</pre>",
							[
								"element 0-37 open \"pre\"",
								"script 20-31"
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
							"@functions { void M() { <p/> } }",
							[
								"element 24-28 closed \"p\"",
								"script 0-32"
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
							"@model List<Foo>\n<p/>",
							[
								"element 17-21 closed \"p\"",
								"script 0-16"
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
							"@section S { <div>x",
							[
								"element 13-18 open \"div\"",
								"script 0-19"
							]
						],
						[
							"@section S { <p/> @if (a) { <b class=\"c\"/> } }",
							[
								"attribute 31-40 \"class\" 37-40",
								"element 13-17 closed \"p\"",
								"element 28-42 closed \"b\"",
								"script 0-46"
							]
						],
						[
							"@section S {<a<?x?>}\n<p/>",
							[
								"element 12-14 open \"a\"",
								"element 21-25 closed \"p\"",
								"script 0-20"
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
							"@{ var a = 1;\n=======\r\nvar b = \"x;\r\n>>>>>>> b\r\n}<p/>",
							[
								"element 48-52 closed \"p\"",
								"script 0-48"
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
						],
						[
							"|||||||\n@x <p/>",
							[
								"element 11-15 closed \"p\"",
								"script 8-10"
							]
						]
					]
				)(
					"%j",
					(source, expected) => {
						expect(
							razor_items(source, parseRazor)
						).toStrictEqual(expected)
					}
				)
			}
		)
		describe(
			"attributes",
			() => {
				it(
					"keeps C# expressions with quotes inside quoted values",
					() => {
						expect(
							razor(
								"<p class=\"btn @(active ? \"on\" : \"off\")\">x</p>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<p class=\"btn @(active ? \"on\" : \"off\")\">x</p>",
										"p",
										"open",
										[
											attribute_node(
												"class=\"btn @(active ? \"on\" : \"off\")\"",
												"class",
												string_node(
													"\"btn @(active ? \"on\" : \"off\")\"",
													"double",
													[
														razor_node(
															"@(active ? \"on\" : \"off\")",
															[
																string_node("\"on\"", "double"),
																string_node("\"off\"", "double")
															]
														)
													]
												)
											)
										],
										[ text_node("x") ]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"parses C# in the attribute area of views and unquoted code values",
					() => {
						expect(
							razor("<p @attrs class=@cls id= x>")
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<p @attrs class=@cls id= x>",
										"p",
										"open",
										[
											attribute_node("@attrs", "", razor_node("@attrs")),
											attribute_node(
												"class=@cls",
												"class",
												string_node(
													"@cls",
													"unquoted",
													[ razor_node("@cls") ]
												)
											),
											attribute_node("id=", "id"),
											attribute_node("x", "x")
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
					"collects C# string literals with interpolation holes",
					() => {
						expect(
							razor(
								"@($\"btn btn-{size}\" + @\"a\"\"b\" + \"\"\"raw\"\"\")"
							)
						).toStrictEqual(
							{
								ast: [
									razor_node(
										"@($\"btn btn-{size}\" + @\"a\"\"b\" + \"\"\"raw\"\"\")",
										[
											string_node(
												"\"btn btn-{size}\"",
												"double",
												[ razor_node("{size}") ]
											),
											string_node("\"a\"\"b\"", "double"),
											string_node("\"\"\"raw\"\"\"", "double")
										]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"ends an implicit expression before a trailing punctuation mark",
					() => {
						expect(razor("<p>@user.Name!</p>")).toStrictEqual(
							{
								ast: [
									element_node(
										"<p>@user.Name!</p>",
										"p",
										"open",
										[],
										[
											razor_node("@user.Name"),
											text_node("!")
										]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"finds markup at statement starts in control flow blocks",
					() => {
						expect(
							razor(
								"<ul>@foreach (var item in items) { <li class=\"item\">@item</li> }</ul>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<ul>@foreach (var item in items) { <li class=\"item\">@item</li> }</ul>",
										"ul",
										"open",
										[],
										[
											razor_node(
												"@foreach (var item in items) { <li class=\"item\">@item</li> }",
												[],
												[
													element_node(
														"<li class=\"item\">@item</li>",
														"li",
														"open",
														[
															attribute_node(
																"class=\"item\"",
																"class",
																string_node("\"item\"", "double")
															)
														],
														[ razor_node("@item") ]
													)
												]
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
					"hoists the elements of code inside a section into the section",
					() => {
						expect(
							razor(
								"@section S { <script src=\"a.js\"></script> @if (d) { <b class=\"x\"></b> } }"
							)
						).toStrictEqual(
							{
								ast: [
									razor_node(
										"@section S { <script src=\"a.js\"></script> @if (d) { <b class=\"x\"></b> } }",
										[],
										[
											element_node(
												"<script src=\"a.js\"></script>",
												"script",
												"open",
												[
													attribute_node(
														"src=\"a.js\"",
														"src",
														string_node("\"a.js\"", "double")
													)
												]
											),
											element_node(
												"<b class=\"x\"></b>",
												"b",
												"open",
												[
													attribute_node(
														"class=\"x\"",
														"class",
														string_node("\"x\"", "double")
													)
												]
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
					"keeps an element typed at the end of the text in its script",
					() => {
						expect(razor("<p class=\"@(a ? \"b")).toStrictEqual(
							{
								ast: [
									element_node(
										"<p class=\"@(a ? \"b",
										"p",
										"open",
										[
											attribute_node(
												"class=\"@(a ? \"b",
												"class",
												string_node(
													"\"@(a ? \"b",
													"double",
													[
														razor_node(
															"@(a ? \"b",
															[ string_node("\"b", "double") ]
														)
													]
												)
											)
										]
									)
								],
								errors: [
									{
										end: 18,
										message: "The explicit expression is missing a closing \")\".",
										start: 11
									}
								]
							}
						)
					}
				)
				it(
					"reads text tags and single-line markup in code blocks",
					() => {
						expect(
							razor(
								"@{ <text>@a</text> @: b @c\n}"
							)
						).toStrictEqual(
							{
								ast: [
									razor_node(
										"@{ <text>@a</text> @: b @c\n}",
										[],
										[
											element_node(
												"<text>@a</text>",
												"text",
												"open",
												[],
												[ razor_node("@a") ]
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
			"frameworks",
			() => {
				it(
					"ASP.NET Core Razor Pages",
					() => {
						const result = razor(
							"@page\n@model IndexModel\n@{\n\tViewData[\"Title\"] = \"Home\";\n}\n"
								+ "<div class=\"text-center @(Model.Dark ? \"dark\" : \"light\")\">\n"
								+ "\t<h1 class=\"display-4\">@ViewData[\"Title\"]</h1>\n"
								+ "\t@foreach (var item in Model.Items)\n\t{\n\t\t<p class=\"item @item.Css\">@item.Name</p>\n"
								+ "\t}\n</div>\n"
								+ "@section Scripts {\n\t<script src=\"~/js/site.js\"></script>\n}"
						)
						expect(result.errors).toStrictEqual([])
						expect(element_names(result.ast)).toStrictEqual([ "div", "h1", "p", "script" ])
						expect(class_attributes(result.ast)).toStrictEqual(
							[
								"class=\"text-center @(Model.Dark ? \"dark\" : \"light\")\"",
								"class=\"display-4\"",
								"class=\"item @item.Css\""
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
					"keeps escaped transitions, email addresses and razor comments out of code",
					() => {
						expect(
							razor("@* note *@ a@b.com @@x")
						).toStrictEqual(
							{
								ast: [
									comment_node("@* note *@"),
									text_node(" a@b.com @@x")
								],
								errors: []
							}
						)
					}
				)
				it(
					"parses a razor comment that is never closed to the end",
					() => {
						expect(razor("<p/>@* a")).toStrictEqual(
							{
								ast: [
									element_node("<p/>", "p", "closed"),
									comment_node("@* a")
								],
								errors: [
									{
										end: 8,
										message: "The Razor comment is not closed.",
										start: 4
									}
								]
							}
						)
					}
				)
				it(
					"parses transitions inside script content",
					() => {
						expect(
							razor(
								"<script>var a = \"@b\";</script>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<script>var a = \"@b\";</script>",
										"script",
										"open",
										[],
										[
											text_node("var a = \""),
											razor_node("@b"),
											text_node("\";")
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
			"matches the README example",
			() => {
				const { expected, source } = readme_example("parseRazor")
				expect(
					JSON.parse(
						JSON.stringify(parseRazor(source))
					)
				).toStrictEqual(expected)
			}
		)
		it(
			"reports input nested too deeply instead of throwing, keeping the nodes before it",
			() => {
				expect(
					razor(
						`<i></i>${"@if (a) {".repeat(3000)}`
					)
				).toStrictEqual(
					{
						ast: [
							element_node("<i></i>", "i", "open"),
							text_node("@if (a) {".repeat(3000))
						],
						errors: [
							{
								end: 27007,
								message: "The input is nested too deeply.",
								start: 7
							}
						]
					}
				)
			}
		)
		it(
			"reports input that is not a string instead of throwing",
			() => {
				check_non_string_input(parseRazor)
			}
		)
	}
)