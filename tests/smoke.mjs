import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Script } from "node:vm";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const files = await Promise.all(["dist/index.html", "dist/styles.css", "dist/app.js", "dist/analysis.js", ".openai/hosting.json"].map(file => readFile(resolve(root, file), "utf8")));
const [html, css, js, analysis, hosting] = files;
new Script(analysis, { filename: "analysis.js" });
new Script(js, { filename: "app.js" });
const scripts = Array.from(html.matchAll(/<script src="([^"]+)"/g), match => match[1]);
const checks = [
  [html.includes('id="workspace"') && html.includes('id="results"'), "页面缺少工作台或结果区"],
  [html.includes("styles.css") && html.includes("app.js"), "静态资源未正确引用"],
  [html.includes('id="method"') && html.includes("不调用大语言模型"), "缺少方法边界说明"],
  [css.includes("@media (max-width: 860px)") || css.includes("@media(max-width:860px)"), "缺少移动端响应式样式"],
  [scripts.indexOf("analysis.js") >= 0 && scripts.indexOf("analysis.js") < scripts.indexOf("app.js"), "分析模块必须先于交互脚本加载"],
  [!html.includes('type="module"'), "直接打开文件需要使用普通脚本"],
  [JSON.parse(hosting).static.directory === "dist", "托管目录配置错误"]
];
for (const [ok, message] of checks) if (!ok) throw new Error(message);
console.log(`smoke checks passed (${checks.length})`);
