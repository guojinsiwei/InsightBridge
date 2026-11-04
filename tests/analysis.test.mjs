import test from "node:test";
import assert from "node:assert/strict";
import { loadAnalysis } from "./helpers.mjs";

const analysis = loadAnalysis();
const unknown = "小猫趴在窗边晒太阳，小狗在院子里追逐皮球，蝴蝶落在花瓣上。";
const ids = text => Array.from(analysis.extractConcepts(text), c => c.id).sort();

test("identical unmapped text has insufficient coverage, not zero similarity", () => {
  const result = analysis.compareTexts(unknown, unknown);
  assert.equal(result.score, null);
  assert.equal(result.canCompare, false);
  assert.equal(result.union, 0);
  assert.match(result.coverageNote, /两段文本.*覆盖不足/);
});

test("either missing side prevents a misleading comparison", () => {
  for (const [a, b, missing] of [[unknown, "city", "A"], ["city", unknown, "B"]]) {
    const result = analysis.compareTexts(a, b);
    assert.equal(result.score, null);
    assert.match(result.coverageNote, new RegExp(`观点 ${missing}`));
  }
});

test("mapped identical and disjoint concepts retain real 100% and 0% scores", () => {
  assert.equal(analysis.compareTexts("城市服务", "city services").score, 100);
  assert.equal(analysis.compareTexts("城市", "health").score, 0);
});

test("Jaccard counts unique concepts and is symmetric", () => {
  const forward = analysis.compareTexts("城市城市服务", "city privacy");
  const reverse = analysis.compareTexts("city privacy", "城市城市服务");
  assert.equal(forward.score, 33);
  assert.equal(forward.union, 3);
  assert.equal(forward.shared.length, 1);
  assert.equal(forward.score, reverse.score);
  assert.deepEqual(Array.from(forward.onlyA, c => c.id), Array.from(reverse.onlyB, c => c.id));
});

test("AI synonyms normalize consistently without counting a nested smart concept", () => {
  for (const text of ["人工智能", "大模型", "artificial intelligence", "AI", "ai", "LLM", "LLMs"]) {
    assert.deepEqual(ids(text), ["ai"]);
  }
  assert.deepEqual(ids("artificial flowers and human intelligence"), []);
});

test("longest phrase matching preserves independent shorter occurrences", () => {
  assert.deepEqual(ids("人工智能与智能设施"), ["ai", "infra", "smart"]);
  assert.deepEqual(ids("碳酸饮料"), []);
  assert.deepEqual(ids("低碳城市与碳排放"), ["city", "climate"]);
});

test("English boundaries and cross-border spelling are consistent", () => {
  assert.deepEqual(ids("capacity powered railway"), []);
  assert.deepEqual(ids("cross-border"), ["crossborder"]);
  assert.deepEqual(ids("cross border"), ["crossborder"]);
});

test("concept matches retain accurate offsets for evidence", () => {
  const text = "城市与 CITY 讨论 artificial intelligence。";
  for (const concept of analysis.extractConcepts(text)) {
    for (const match of concept.matches) assert.equal(text.slice(match.start, match.end), match.word);
  }
});

test("zero stance hits are unidentified rather than balanced", () => {
  const result = analysis.stance(unknown);
  assert.equal(result.label, "未识别");
  assert.match(result.note, /未识别到明显倾向/);
});

test("negative English words do not contain positive word hits", () => {
  const result = analysis.stance("This approach is unreliable, inaccessible and unsuccessful, causing distrust.");
  assert.equal(result.label, "审慎");
  assert.equal(result.positive.length, 0);
  assert.equal(result.caution.length, 4);
});

test("common Chinese negation excludes positive words", () => {
  const result = analysis.stance("这个方案不可靠，也不公平，更谈不上成功。");
  assert.equal(result.positive.length, 0);
  assert.equal(result.label, "审慎");
  assert.ok(result.negated.includes("谈不上成功"));
});

test("explicit English negation and contractions are excluded", () => {
  for (const text of ["not reliable", "never reliable", "not at all reliable", "isn't reliable", "isn’t reliable", "without benefit"]) {
    assert.equal(analysis.stance(text).positive.length, 0, text);
    assert.ok(analysis.stance(text).negated.length > 0, text);
  }
});

test("negated caution is not automatically reinterpreted as positive", () => {
  for (const text of ["没有风险，也没有挑战。", "There is no risk. There is no challenge."]) {
    const result = analysis.stance(text);
    assert.equal(result.caution.length, 0);
    assert.equal(result.positive.length, 0);
    assert.equal(result.label, "未识别");
  }
});

test("contrast boundaries, not-only expressions, and later affirmative mentions survive", () => {
  assert.deepEqual(Array.from(analysis.stance("not reliable but accessible").positive), ["accessible"]);
  assert.equal(analysis.stance("not only reliable but accessible").positive.length, 2);
  assert.equal(analysis.stance("不仅可靠，而且公平。").positive.length, 2);
  assert.deepEqual(Array.from(analysis.stance("not reliable. A reliable option exists.").positive), ["reliable"]);
});

test("mixed lexical evidence is labelled mixed", () => {
  const result = analysis.stance("reliable but risk");
  assert.equal(result.label, "混合");
  assert.match(result.note, /reliable/);
  assert.match(result.note, /risk/);
});

test("representative sentence does not mistake capacity for city", () => {
  const text = "The city thrives. The capacity of this laboratory remains completely unchanged during the entire observation period.";
  assert.equal(analysis.bestSentence(text, analysis.extractConcepts(text)), "The city thrives.");
  assert.equal(analysis.bestSentence(unknown, []), null);
});

test("representative sentence retains late evidence and full source wording", () => {
  const text = `${"A long introduction without mapped concepts ".repeat(6)}ends with city.`;
  assert.equal(analysis.bestSentence(text, analysis.extractConcepts(text)), text);
});

for (const [name, engine] of [["native segmenter", analysis], ["fallback segmenter", loadAnalysis({ Intl: {} })]]) {
  test(`${name} preserves decimals and common abbreviations`, () => {
    assert.deepEqual(Array.from(engine.splitSentences("The model scored 3.14 points in the U.S. trial. Dr. Smith agrees.")), [
      "The model scored 3.14 points in the U.S. trial.", "Dr. Smith agrees."
    ]);
    assert.deepEqual(Array.from(engine.splitSentences("城市服务。隐私风险！")), ["城市服务。", "隐私风险！"]);
    assert.deepEqual(Array.from(engine.splitSentences("Dr.   Smith studies the city.")), ["Dr.   Smith studies the city."]);
  });
}
