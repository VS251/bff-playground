const BRIDGE_URL = "ws://localhost:8888";
const TOKEN = "bff-alpha-token";

const EXAMPLES = {
    javascript: `// Node.js (Local)\nconst os = require('os');\nreturn { lang: "Node.js", platform: os.platform() };`,
    typescript: `// TypeScript (Cloud)\nconst msg: string = "Hello from TS";\nconsole.log(JSON.stringify({ msg }));`,
    python: `# Python 3 (Cloud)\nimport json\nprint(json.dumps({"lang": "Python"}))`,
    go: `package main\nimport ("encoding/json"; "fmt")\nfunc main() { fmt.Println("{\\\"lang\\\": \\\"Go\\\"}") }`,
    rust: `fn main() { println!("{{\\\"lang\\\": \\\"Rust\\\"}}"); }`,
    java: `public class Main { public static void main(String[] a) { System.out.println("{\\\"lang\\\": \\\"Java\\\"}"); } }`,
    csharp: `using System; class P { static void Main() { Console.WriteLine("{\\\"lang\\\": \\\"C#\\\"}"); } }`
};

window.backendData = {};

require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' }});
        