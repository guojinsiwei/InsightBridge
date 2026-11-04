import { readFileSync } from "node:fs";
import vm from "node:vm";

export const html = readFileSync(new URL("../dist/index.html", import.meta.url), "utf8");
const analysisSource = readFileSync(new URL("../dist/analysis.js", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../dist/app.js", import.meta.url), "utf8");

export function loadAnalysis(globals = {}) {
  const context = vm.createContext(globals);
  vm.runInContext(analysisSource, context, { filename: "analysis.js" });
  return context.InsightBridgeAnalysis;
}

// A small DOM adapter for event/state regression tests, not a layout engine.
// IDs and controls are read from the real page so missing markup fails tests.
export function createBrowser({ compareTexts } = {}) {
  const elements = new Map();
  const timers = [];
  const errors = [];
  const documentHandlers = new Map();
  let activeElement = null;
  class Element {
    constructor(attributes = "") {
      this.attributes = new Map(Array.from(attributes.matchAll(/([\w-]+)="([^"]*)"/g), m => [m[1], m[2]]));
      this.classes = new Set((this.attributes.get("class") || "").split(/\s+/).filter(Boolean));
      this.classList = {
        add: name => this.classes.add(name),
        remove: name => this.classes.delete(name),
        contains: name => this.classes.has(name),
        toggle: (name, force) => force ? this.classes.add(name) : this.classes.delete(name)
      };
      this.value = "";
      this._textContent = "";
      this._innerHTML = null;
      this.hidden = /\bhidden(?:\s|$)/.test(attributes);
      this.disabled = false;
      this.style = {};
      this.dataset = { demo: this.attributes.get("data-demo") };
      this.handlers = new Map();
      this.scrolls = 0;
    }
    get textContent() { return this._textContent; }
    set textContent(value) { this._textContent = String(value); this._innerHTML = null; }
    get innerHTML() {
      return this._innerHTML ?? this._textContent.replace(/[&<>]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[char]));
    }
    set innerHTML(value) { this._innerHTML = String(value); this._textContent = ""; }
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    getAttribute(name) { return this.attributes.get(name) ?? null; }
    removeAttribute(name) { this.attributes.delete(name); }
    addEventListener(type, handler) { this.handlers.set(type, handler); }
    dispatch(type, event = {}) { this.handlers.get(type)?.(event); }
    querySelector(selector) { return selector === "span" ? this.span : null; }
    scrollIntoView() { this.scrolls++; }
    focus() { activeElement = this; }
  }
  for (const match of html.matchAll(/<[a-z][\w-]*\b([^>]*\bid="([^"]+)"[^>]*)>/gi)) {
    elements.set(`#${match[2]}`, new Element(match[1]));
  }
  const chips = Array.from(html.matchAll(/<button\b([^>]*\bdata-demo="[^"]+"[^>]*)>/g), m => new Element(m[1]));
  for (const match of html.matchAll(/<select\b[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)) {
    const options = Array.from(match[2].matchAll(/<option value="([^"]+)"([^>]*)>/g));
    elements.get(`#${match[1]}`).value = (options.find(option => /selected/.test(option[2])) || options[0])[1];
  }
  for (const side of ["a", "b"]) elements.get(`#text-${side}`).parentElement = elements.get(`#panel-${side}`);
  elements.get("#overlap-bar").parentElement = new Element();
  elements.get("#analyze").span = new Element();
  const document = {
    querySelector: selector => elements.get(selector) || null,
    querySelectorAll: selector => selector === ".chip" ? chips : [],
    addEventListener: (type, handler) => documentHandlers.set(type, handler)
  };
  const setTimeout = callback => { timers.push(callback); return timers.length; };
  const context = vm.createContext({ document, setTimeout, window: { setTimeout }, console: { error: (...args) => errors.push(args) } });
  vm.runInContext(analysisSource, context, { filename: "analysis.js" });
  if (compareTexts) context.InsightBridgeAnalysis = { ...context.InsightBridgeAnalysis, compareTexts };
  vm.runInContext(appSource, context, { filename: "app.js" });
  return {
    el: selector => elements.get(selector), chips, errors,
    click: selector => elements.get(selector).dispatch("click"),
    demo: name => chips.find(chip => chip.dataset.demo === name).dispatch("click"),
    input(selector, value) { const element = elements.get(selector); element.value = value; element.dispatch("input"); },
    language(side, value) { const element = elements.get(`#lang-${side}`); element.value = value; element.dispatch("change"); },
    key(event = {}) {
      documentHandlers.get("keydown")({ key: "Enter", ctrlKey: true, preventDefault() {}, ...event });
    },
    flushTimers() { while (timers.length) timers.shift()(); },
    get activeElement() { return activeElement; },
    get timerCount() { return timers.length; }
  };
}
