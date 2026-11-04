import test from "node:test";
import assert from "node:assert/strict";
import { createBrowser, loadAnalysis } from "./helpers.mjs";

const unknown = "小猫趴在窗边晒太阳，小狗在院子里追逐皮球，蝴蝶落在花瓣上。";
function analyzedCity() {
  const browser = createBrowser();
  browser.demo("city");
  browser.click("#analyze");
  assert.equal(browser.el("#results").hidden, false);
  assert.equal(browser.el("#overlap-score").textContent, "45%");
  assert.equal(browser.errors.length, 0);
  return browser;
}

test("valid analysis renders immediately without a delayed result callback", () => {
  const browser = analyzedCity();
  assert.equal(browser.timerCount, 0);
  assert.equal(browser.el("#analyze").disabled, false);
});

test("unmapped input renders coverage guidance without 0% or 0/0", () => {
  const browser = createBrowser();
  browser.input("#text-a", unknown);
  browser.input("#text-b", unknown);
  browser.click("#analyze");
  assert.equal(browser.el("#results").hidden, false);
  assert.equal(browser.el("#overlap-score").textContent, "—");
  assert.equal(browser.el("#overlap-badge").textContent, "—");
  assert.equal(browser.el("#overlap-bar").parentElement.hidden, true);
  assert.match(browser.el("#overlap-label").textContent, /覆盖不足/);
  assert.doesNotMatch(browser.el("#trace-copy").textContent, /0\s*\/\s*0/);
  assert.equal(browser.el("#stance-a").textContent, "未识别");
  assert.match(browser.el("#quote-a").textContent, /未匹配到可引用/);
});

test("one uncovered side does not turn the other side into asserted differences", () => {
  const browser = createBrowser();
  browser.input("#text-a", "The city provides public services for residents.");
  browser.input("#text-b", unknown);
  browser.click("#analyze");
  assert.match(browser.el("#overlap-label").textContent, /观点 B/);
  assert.match(browser.el("#only-a-tags").innerHTML, /暂无法比较差异/);
  assert.doesNotMatch(browser.el("#only-a-tags").innerHTML, /城市/);
  browser.demo("city");
  browser.click("#analyze");
  assert.equal(browser.el("#overlap-bar").parentElement.hidden, false);
  assert.equal(browser.el("#overlap-score").textContent, "45%");
});

test("changing demos invalidates results and subsequent analysis uses the new text", () => {
  const browser = analyzedCity();
  browser.demo("research");
  assert.equal(browser.el("#results").hidden, true);
  assert.equal(browser.chips.find(chip => chip.dataset.demo === "research").getAttribute("aria-pressed"), "true");
  browser.click("#analyze");
  assert.equal(browser.el("#overlap-score").textContent, "90%");
  assert.doesNotMatch(browser.el("#quote-a").textContent, /城市公共空间/);
  assert.equal(Number(browser.el("#count-a").textContent), browser.el("#text-a").value.length);
});

for (const side of ["a", "b"]) {
  test(`editing input ${side.toUpperCase()} invalidates results and demo selection`, () => {
    const browser = analyzedCity();
    browser.input(`#text-${side}`, unknown);
    assert.equal(browser.el("#results").hidden, true);
    assert.equal(Number(browser.el(`#count-${side}`).textContent), unknown.length);
    assert.match(browser.el("#privacy-note").textContent, /重新生成/);
    assert.ok(browser.chips.every(chip => chip.getAttribute("aria-pressed") === "false"));
  });
  test(`changing language ${side.toUpperCase()} invalidates results`, () => {
    const browser = analyzedCity();
    browser.language(side, side === "a" ? "en" : "zh");
    assert.equal(browser.el("#results").hidden, true);
    browser.click("#analyze");
    assert.match(browser.el(`#map-lang-${side}`).textContent, side === "a" ? /English/ : /中文/);
  });
}

test("swap moves both texts and languages, invalidates, then preserves symmetric score", () => {
  const browser = analyzedCity();
  const oldA = browser.el("#text-a").value;
  const oldB = browser.el("#text-b").value;
  browser.click("#swap");
  assert.equal(browser.el("#results").hidden, true);
  assert.equal(browser.el("#text-a").value, oldB);
  assert.equal(browser.el("#text-b").value, oldA);
  assert.equal(browser.el("#lang-a").value, "en");
  assert.equal(browser.el("#lang-b").value, "zh");
  assert.equal(Number(browser.el("#count-a").textContent), oldB.length);
  browser.click("#analyze");
  assert.equal(browser.el("#overlap-score").textContent, "45%");
  assert.match(browser.el("#quote-a").textContent, /^A · [A-Z]/);
});

test("clear immediately after analyze stays cleared after all timers finish", () => {
  const browser = analyzedCity();
  browser.click("#clear");
  browser.flushTimers();
  assert.equal(browser.el("#results").hidden, true);
  assert.equal(browser.el("#text-a").value, "");
  assert.equal(browser.el("#text-b").value, "");
  assert.equal(Number(browser.el("#count-a").textContent), 0);
  assert.equal(browser.el("#analyze").disabled, false);
  assert.ok(browser.chips.every(chip => !chip.classList.contains("active")));
});

test("invalid submission hides old results, marks fields, and recovers on new input", () => {
  const browser = analyzedCity();
  // Programmatic changes also cannot leave stale output after an invalid submit.
  browser.el("#text-a").value = " ";
  browser.click("#analyze");
  assert.equal(browser.el("#results").hidden, true);
  assert.equal(browser.el("#text-a").getAttribute("aria-invalid"), "true");
  assert.equal(browser.el("#text-b").getAttribute("aria-invalid"), null);
  assert.equal(browser.activeElement, browser.el("#text-a"));
  assert.match(browser.el("#privacy-note").textContent, /20/);
  browser.input("#text-a", unknown);
  assert.equal(browser.el("#text-a").getAttribute("aria-invalid"), null);
  assert.equal(browser.el("#privacy-note").classList.contains("warn"), false);
  browser.click("#clear");
  browser.flushTimers();
  assert.equal(browser.el("#results").hidden, true);
});

test("minimum length uses trimmed text and accepts exactly 20 characters", () => {
  const browser = createBrowser();
  browser.input("#text-a", "城市" + "甲".repeat(17));
  browser.input("#text-b", "城市" + "乙".repeat(18));
  browser.click("#analyze");
  assert.equal(browser.el("#results").hidden, true);
  browser.input("#text-a", "城市" + "甲".repeat(18));
  browser.click("#analyze");
  assert.equal(browser.el("#overlap-score").textContent, "100%");
});

test("keyboard ignores key repeat and composition, and duplicate submit does not recompute", () => {
  let calls = 0;
  const analysis = loadAnalysis();
  const browser = createBrowser({ compareTexts: (...args) => { calls++; return analysis.compareTexts(...args); } });
  browser.demo("city");
  browser.key({ isComposing: true });
  browser.key({ repeat: true });
  assert.equal(calls, 0);
  browser.key({ ctrlKey: false, metaKey: true });
  browser.key();
  browser.click("#analyze");
  assert.equal(calls, 1);
  assert.equal(browser.el("#results").scrolls, 1);
  browser.input("#text-a", browser.el("#text-a").value + " 新内容。");
  browser.key();
  assert.equal(calls, 2);
});

test("back to input permits a fresh analysis of unchanged content", () => {
  const browser = analyzedCity();
  browser.click("#reset");
  assert.equal(browser.el("#results").hidden, true);
  assert.equal(browser.activeElement, browser.el("#text-a"));
  browser.click("#analyze");
  assert.equal(browser.el("#results").hidden, false);
});

test("auto language defaults correctly identify swapped-language inputs", () => {
  const browser = createBrowser();
  browser.input("#text-a", "The city provides public services for residents.");
  browser.input("#text-b", "城市公共服务应该充分考虑居民需求，并且保持透明。");
  browser.click("#analyze");
  assert.match(browser.el("#map-lang-a").textContent, /English/);
  assert.match(browser.el("#map-lang-b").textContent, /中文/);
});

test("source markup remains text when displayed as a quotation", () => {
  const browser = createBrowser();
  const text = '<img src=x onerror="alert(1)"> city services for all residents';
  browser.input("#text-a", text);
  browser.input("#text-b", text);
  browser.click("#analyze");
  assert.match(browser.el("#quote-a").textContent, /<img/);
  assert.doesNotMatch(browser.el("#quote-a").innerHTML, /<img/);
  assert.match(browser.el("#quote-a").innerHTML, /&lt;img/);
});

test("analysis failure hides results and restores submit so a retry can succeed", () => {
  let shouldFail = true;
  const analysis = loadAnalysis();
  const browser = createBrowser({ compareTexts: (...args) => {
    if (shouldFail) throw new Error("simulated analysis failure");
    return analysis.compareTexts(...args);
  } });
  browser.demo("city");
  browser.click("#analyze");
  assert.equal(browser.el("#results").hidden, true);
  assert.equal(browser.el("#analyze").disabled, false);
  assert.match(browser.el("#privacy-note").textContent, /未完成/);
  assert.equal(browser.errors.length, 1);
  shouldFail = false;
  browser.click("#analyze");
  assert.equal(browser.el("#results").hidden, false);
  assert.equal(browser.el("#privacy-note").classList.contains("warn"), false);
});
