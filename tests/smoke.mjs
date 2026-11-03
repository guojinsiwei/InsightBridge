import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const files = await Promise.all(["dist/index.html", "dist/styles.css", "dist/app.js", ".openai/hosting.json"].map(file => readFile(resolve(root, file), "utf8")));
const [html, css, js, hosting] = files;
const checks = [
  [html.includes('id="workspace"') && html.includes('id="results"'), "页面缺少工作台或结果区"],
  [html.includes("styles.css") && html.includes("app.js"), "静态资源未正确引用"],
  [css.includes("@media(max-width:860px)"), "缺少移动端响应式样式"],
  [js.includes("function analyze()") && js.includes("function tokenize(text)"), "核心分析逻辑缺失"],
  [JSON.parse(hosting).static.directory === "dist", "托管目录配置错误"]
];
for (const [ok, message] of checks) if (!ok) throw new Error(message);
console.log(`smoke checks passed (${checks.length})`);
