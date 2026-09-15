using System.Collections;
using System.Reflection;
using System.Text.Encodings.Web;
using System.Text.Json;
var relaxed = new JsonSerializerOptions { Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping };
var metadata = typeof(Program).Assembly.GetCustomAttributes<AssemblyMetadataAttribute>().ToDictionary(a => a.Key, a => a.Value);
string[] directories = { metadata["RazorTools"], metadata["RoslynBin"] };
AppDomain.CurrentDomain.AssemblyResolve += (_, e) => {
  var name = new AssemblyName(e.Name).Name + ".dll";
  var path = directories.Select(d => Path.Combine(d, name)).FirstOrDefault(File.Exists);
  return path == null ? null : Assembly.LoadFrom(path);
};
var asm = Assembly.LoadFrom(Path.Combine(directories[0], "Microsoft.CodeAnalysis.Razor.Compiler.dll"));
const BindingFlags Any = BindingFlags.Instance | BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic;
Type T(string n) => asm.GetType(n) ?? throw new Exception("no type " + n);
object Directive(string n) => T(n).GetField("Directive", Any).GetValue(null);
string L = "Microsoft.AspNetCore.Razor.Language.", E = L + "Extensions.", C = L + "Components.", M = "Microsoft.AspNetCore.Mvc.Razor.Extensions.";
string[] mvc = { M + "InjectDirective", M + "ModelDirective", M + "PageDirective", E + "NamespaceDirective", E + "AttributeDirective", E + "FunctionsDirective", E + "ImplementsDirective", E + "InheritsDirective", E + "SectionDirective" };
string[] component = { C + "ComponentCodeDirective", C + "ComponentConstrainedTypeParamDirective", C + "ComponentInjectDirective", C + "ComponentLayoutDirective", C + "ComponentPageDirective", C + "ComponentPreserveWhitespaceDirective", C + "ComponentRenderModeDirective", E + "AttributeDirective", E + "FunctionsDirective", E + "ImplementsDirective", E + "InheritsDirective", E + "NamespaceDirective" };
var descriptorType = T(L + "DirectiveDescriptor");
var versionType = T(L + "RazorLanguageVersion");
var latest = versionType.GetProperty("Latest", Any)?.GetValue(null) ?? versionType.GetMethod("Parse").Invoke(null, new object[] { "Latest" });
var builderType = T(L + "RazorParserOptions+Builder");
object Options(bool isComponent) {
  var builder = Activator.CreateInstance(builderType, Any, null, new[] { latest, Enum.Parse(T(L + "RazorFileKind"), isComponent ? "Component" : "Legacy") }, null);
  var names = isComponent ? component : mvc;
  var array = Array.CreateInstance(descriptorType, names.Length);
  for (var i = 0; i < names.Length; i++) array.SetValue(Directive(names[i]), i);
  var create = typeof(System.Collections.Immutable.ImmutableArray).GetMethods().First(m => m.Name == "Create" && m.GetParameters().Length == 1 && m.GetParameters()[0].ParameterType.IsArray).MakeGenericMethod(descriptorType);
  builderType.GetProperty("Directives").SetValue(builder, create.Invoke(null, new object[] { array }));
  builderType.GetProperty("UseRoslynTokenizer").SetValue(builder, true);
  return builderType.GetMethod("ToOptions", Any).Invoke(builder, null);
}
var mvcOptions = Options(false);
var componentOptions = Options(true);
var createSource = T(L + "RazorSourceDocument").GetMethods().First(m => m.Name == "Create" && m.GetParameters().Select(p => p.ParameterType).SequenceEqual(new[] { typeof(string), typeof(string) }));
var parse = T(L + "RazorSyntaxTree").GetMethod("Parse", Any);
int Int(object o, string p) => (int)o.GetType().GetProperty(p, Any).GetValue(o);
object Get(object o, string p) {
  for (var t = o?.GetType(); t != null; t = t.BaseType) {
    var property = t.GetProperty(p, Any | BindingFlags.DeclaredOnly);
    if (property != null) return property.GetValue(o);
  }
  return null;
}
bool Missing(object token) => token == null || (bool)Get(token, "IsMissing") || (int)Get(token, "Width") == 0;
for (var line = Console.In.ReadLine(); line != null; line = Console.In.ReadLine()) {
  var input = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(line);
  var text = input["text"].GetString();
  var isComponent = input["component"].GetBoolean();
  var items = new List<string>();
  string error = null;
  var diagnostics = 0;
  try {
    var tree = parse.Invoke(null, new[] { createSource.Invoke(null, new object[] { text, isComponent ? "x.razor" : "x.cshtml" }), isComponent ? componentOptions : mvcOptions, CancellationToken.None });
    diagnostics = ((IEnumerable)Get(tree, "Diagnostics")).Cast<object>().Count();
    var stack = new Stack<object>();
    stack.Push(Get(tree, "Root"));
    while (stack.Count > 0) {
      var node = stack.Pop();
      var kind = node.GetType().Name;
      if (kind == "MarkupElementSyntax") {
        var start = Get(node, "StartTag");
        var end = Get(node, "EndTag");
        var name = (string)Get(Get(start ?? end, "Name"), "Content") ?? "";
        var sub = start == null ? "close" : !Missing(Get(start, "ForwardSlash")) ? "closed" : "open";
        items.Add($"element {Int(node, "Position")}-{Int(node, "EndPosition")} {sub} {JsonSerializer.Serialize(name, relaxed)}");
        if (start != null && Missing(Get(start, "CloseAngle"))) items.Add($"unclosed-start {Int(start, "Position")}");
      } else if (kind == "MarkupAttributeBlockSyntax" || kind == "MarkupMinimizedAttributeBlockSyntax") {
        var name = Get(node, "Name");
        var start = Int(name, "Position");
        items.Add($"attribute {start}-{Int(node, "EndPosition")} {JsonSerializer.Serialize(text.Substring(start, Int(name, "EndPosition") - start), relaxed)}");
      }
      foreach (var token in (IEnumerable)node.GetType().GetMethod("ChildTokens", Any, Type.EmptyTypes).Invoke(node, null)) {
        var tokenKind = Get(token, "Kind").ToString();
        if (tokenKind.Contains("String") || tokenKind.Contains("Literal") && tokenKind.Contains("Char")) items.Add($"token {tokenKind} {Int(token, "Position")}-{Int(token, "EndPosition")}");
      }
      var children = ((IEnumerable)node.GetType().GetMethod("ChildNodes", Any, Type.EmptyTypes).Invoke(node, null)).Cast<object>().ToList();
      for (var i = children.Count - 1; i >= 0; i--) stack.Push(children[i]);
    }
  } catch (Exception e) {
    error = (e.InnerException ?? e).ToString().Split('\n')[0];
  }
  Console.Out.WriteLine(JsonSerializer.Serialize(new { diagnostics, error, items }));
}
