const $ = (selector) => document.querySelector(selector);
const { compareTexts, detectLang, bestSentence } = InsightBridgeAnalysis;

const DEMOS = {
  city: {
    a: "城市公共空间引入智能设施，能提高服务效率，也能帮助管理者更准确地理解居民需求。但技术应用必须保持透明，并为老年人和儿童保留简单、可靠的线下服务。真正的智慧城市应当让便利与公平同时增长。",
    b: "Smart public infrastructure can make city services faster and more responsive. Yet efficiency alone is not enough: residents need transparency, privacy safeguards, and accessible offline options. A smart city succeeds when technology strengthens community trust instead of excluding vulnerable groups.",
    langA: "zh",
    langB: "en"
  },
  research: {
    a: "这篇摘要指出，跨语言文献综述应同时比较中英文研究的数据来源、模型假设与政策建议。共同主题往往集中在气候风险与能源转型，但中文文献更强调治理落地，英文文献更关注证据标准与可复现实验。",
    b: "This abstract argues that multilingual literature reviews should compare data sources, model assumptions, and policy claims. Climate risk and energy transition appear in both corpora, while English papers stress evidence standards and reproducibility, and Chinese papers focus more on governance implementation.",
    langA: "zh",
    langB: "en"
  },
  trade: {
    a: "湾区企业出海时，外贸单证、产品说明与售后内容需要本地化。跨文化风险不只来自语言差异，还来自对隐私、安全和客户信任的不同理解。多语言物料应保留核心卖点，同时避免直接照搬国内市场话术。",
    b: "When Guangdong-Hong Kong-Macao Greater Bay Area firms go overseas, trade documents and product copy need localization. Cross-cultural risk is not only linguistic: privacy, safety, and customer trust are framed differently. Multilingual materials should keep the core offer without copying domestic market slogans.",
    langA: "zh",
    langB: "en"
  }
};

const PRIVACY_NOTE = "无需上传 · 无需登录 · 浏览器本地完成";
let lastAnalysisKey = null;
let isAnalyzing = false;

function resolveLang(selectId, text) {
  const chosen = $(selectId).value;
  return chosen === "auto" ? detectLang(text) : chosen;
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

function setTags(target, concepts, fallback) {
  target.innerHTML = concepts.length
    ? concepts.slice(0, 8).map(c => `<span>${escapeHtml(c.label)}</span>`).join("")
    : `<span class="empty">${escapeHtml(fallback)}</span>`;
}

function updateCount(side) {
  $(`#count-${side}`).textContent = $(`#text-${side}`).value.length;
}

function setActiveDemo(name) {
  document.querySelectorAll(".chip").forEach(chip => {
    const active = chip.dataset.demo === name;
    chip.classList.toggle("active", active);
    chip.setAttribute("aria-pressed", String(active));
  });
}

function invalidateResults(message = PRIVACY_NOTE) {
  lastAnalysisKey = null;
  $("#results").hidden = true;
  $("#privacy-note").textContent = message;
  $("#privacy-note").classList.remove("warn");
  ["a", "b"].forEach(side => {
    $(`#text-${side}`).removeAttribute("aria-invalid");
    $(`#text-${side}`).parentElement.classList.remove("shake");
  });
}

function inputChanged() {
  invalidateResults("输入已更新，请重新生成观点地图 · 文本仍在本地");
  setActiveDemo(null);
}

function setDemo(name) {
  const demoName = Object.prototype.hasOwnProperty.call(DEMOS, name) ? name : "city";
  const demo = DEMOS[demoName];
  invalidateResults();
  $("#text-a").value = demo.a;
  $("#text-b").value = demo.b;
  $("#lang-a").value = demo.langA;
  $("#lang-b").value = demo.langB;
  updateCount("a");
  updateCount("b");
  setActiveDemo(demoName);
}

function loadDemo() {
  setDemo("city");
  $("#workspace").scrollIntoView({ behavior: "smooth" });
}

function clearAll() {
  $("#text-a").value = "";
  $("#text-b").value = "";
  updateCount("a");
  updateCount("b");
  invalidateResults();
  setActiveDemo(null);
}

function renderResults(payload) {
  const { a, b, langA, langB, shared, onlyA, onlyB, score, toneA, toneB, canCompare, union, coverageNote } = payload;
  const scoreText = canCompare ? `${score}%` : "—";
  $("#overlap-score").textContent = scoreText;
  $("#overlap-badge").textContent = scoreText;
  $("#overlap-bar").style.width = canCompare ? `${score}%` : "0%";
  $("#overlap-bar").parentElement.hidden = !canCompare;
  $("#overlap-label").textContent = canCompare
    ? `${shared.length} / ${union} 个已识别概念重合 · ` +
      (score > 55 ? "已识别概念重合较多" : score > 0 ? "部分已识别概念重合" : "已识别概念暂无重合")
    : coverageNote;
  $("#stance-a").textContent = toneA.label;
  $("#stance-a-note").textContent = toneA.note;
  $("#stance-b").textContent = toneB.label;
  $("#stance-b-note").textContent = toneB.note;
  $("#map-lang-a").textContent = langA === "zh" ? "观点 A · 中文" : "观点 A · English";
  $("#map-lang-b").textContent = langB === "zh" ? "观点 B · 中文" : "观点 B · English";
  setTags($("#shared-tags"), shared, "未匹配到共同概念标签");
  // Missing vocabulary coverage is not evidence that the other text lacks a topic.
  setTags($("#only-a-tags"), canCompare ? onlyA : [], canCompare ? "暂无独有标签" : "覆盖不足，暂无法比较差异");
  setTags($("#only-b-tags"), canCompare ? onlyB : [], canCompare ? "暂无独有标签" : "覆盖不足，暂无法比较差异");
  $("#bridge-dots").innerHTML = shared.slice(0, 4).map(c => `<span>${escapeHtml(c.label.split(" / ")[0])}</span>`).join("");
  $("#consensus-copy").textContent = !canCompare ? coverageNote : shared.length
    ? `两段文本都命中了 ${shared.slice(0, 3).map(c => c.label).join("、")}。共同标签不代表立场一致，可结合原文核对。`
    : "在当前词表已识别的概念中，未找到共同标签。";
  $("#quote-a").textContent = `A · ${bestSentence(a, payload.conceptsA) || "未匹配到可引用的概念句。"}`;
  $("#quote-b").textContent = `B · ${bestSentence(b, payload.conceptsB) || "未匹配到可引用的概念句。"}`;
  $("#trace-copy").textContent =
    (canCompare ? `重合度按 Jaccard 计算：|A∩B| / |A∪B| = ${shared.length} / ${union}。` : coverageNote) +
    `已识别概念：A=${payload.conceptsA.length}，B=${payload.conceptsB.length}。` +
    `语言设置：A=${langA === "zh" ? "中文" : "英文"}，B=${langB === "zh" ? "中文" : "英文"}。` +
    (canCompare ? coverageNote : "");
  $("#results").hidden = false;
  $("#privacy-note").textContent = "分析完成，文本未离开当前浏览器";
  $("#privacy-note").classList.remove("warn");
  $("#results").scrollIntoView({ behavior: "smooth", block: "start" });
}

function analyze() {
  if (isAnalyzing) return;
  const a = $("#text-a").value.trim();
  const b = $("#text-b").value.trim();
  const invalidSides = ["a", "b"].filter(side => $(`#text-${side}`).value.trim().length < 20);
  if (invalidSides.length) {
    invalidateResults("每段至少输入 20 个字符后再分析");
    invalidSides.forEach(side => {
      const field = $(`#text-${side}`);
      field.setAttribute("aria-invalid", "true");
      field.parentElement.classList.add("shake");
      setTimeout(() => field.parentElement.classList.remove("shake"), 350);
    });
    $("#privacy-note").classList.add("warn");
    $(`#text-${invalidSides[0]}`).focus();
    return;
  }

  const langA = resolveLang("#lang-a", a);
  const langB = resolveLang("#lang-b", b);
  const key = JSON.stringify([a, b, langA, langB]);
  if (lastAnalysisKey === key && !$("#results").hidden) return;
  const button = $("#analyze");
  isAnalyzing = true;
  button.disabled = true;
  try {
    invalidateResults();
    renderResults({ ...compareTexts(a, b), langA, langB });
    lastAnalysisKey = key;
  } catch (error) {
    invalidateResults("本次分析未完成，请重试");
    $("#privacy-note").classList.add("warn");
    console.error("观点分析失败", error);
  } finally {
    isAnalyzing = false;
    button.disabled = false;
  }
}

$("#load-demo").addEventListener("click", loadDemo);
$("#load-demo-top").addEventListener("click", loadDemo);
$("#analyze").addEventListener("click", analyze);
$("#clear").addEventListener("click", clearAll);
$("#reset").addEventListener("click", () => {
  invalidateResults();
  $("#workspace").scrollIntoView({ behavior: "smooth" });
  $("#text-a").focus({ preventScroll: true });
});
["a", "b"].forEach(side => {
  $(`#text-${side}`).addEventListener("input", () => {
    updateCount(side);
    inputChanged();
  });
  $(`#lang-${side}`).addEventListener("change", inputChanged);
});
$("#swap").addEventListener("click", () => {
  const a = $("#text-a").value;
  const la = $("#lang-a").value;
  $("#text-a").value = $("#text-b").value;
  $("#lang-a").value = $("#lang-b").value;
  $("#text-b").value = a;
  $("#lang-b").value = la;
  updateCount("a");
  updateCount("b");
  inputChanged();
});
document.querySelectorAll(".chip").forEach(chip => {
  chip.addEventListener("click", () => {
    setDemo(chip.dataset.demo);
    $("#workspace").scrollIntoView({ behavior: "smooth" });
  });
});
document.addEventListener("keydown", event => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && !event.isComposing) {
    event.preventDefault();
    if (!event.repeat) analyze();
  }
});
