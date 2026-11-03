const $ = (selector) => document.querySelector(selector);

const DEMO = {
  a: "城市公共空间引入智能设施，能提高服务效率，也能帮助管理者更准确地理解居民需求。但技术应用必须保持透明，并为老年人和儿童保留简单、可靠的线下服务。真正的智慧城市应当让便利与公平同时增长。",
  b: "Smart public infrastructure can make city services faster and more responsive. Yet efficiency alone is not enough: residents need transparency, privacy safeguards, and accessible offline options. A smart city succeeds when technology strengthens community trust instead of excluding vulnerable groups."
};

const DICTIONARY = {
  "城市":"city","公共":"public","空间":"space","智能":"smart","设施":"infrastructure","服务":"service","效率":"efficiency","居民":"residents","需求":"needs","透明":"transparency","老年人":"elderly","儿童":"children","线下":"offline","公平":"fairness","便利":"convenience","技术":"technology","社区":"community","信任":"trust","隐私":"privacy","安全":"safety","包容":"inclusion","弱势":"vulnerable","群体":"groups","发展":"development","创新":"innovation","风险":"risk"
};

const STOP = new Set(["the","a","an","and","or","of","to","in","on","for","is","are","be","can","that","when","with","more","also","alone","not","enough","need","instead","it","this","as","by","from","at","we","they","their","our","its","让","的","了","和","与","也","能","更","在","为","应当","必须","真正","同时","但","并","或","对","把","是","有","中"]);
const POSITIVE = ["提高","便利","公平","可靠","成功","信任","包容","创新","faster","responsive","success","trust","accessible","strengthens","fairness","reliable","benefit"];
const CAUTION = ["风险","必须","隐私","弱势","排除","透明","risk","privacy","vulnerable","excluding","safeguard","yet","must"];

function tokenize(text) {
  const english = (text.toLowerCase().match(/[a-z][a-z-]{2,}/g) || []).filter(w => !STOP.has(w));
  const chinese = Object.keys(DICTIONARY).filter(word => text.includes(word));
  return [...new Set([...english, ...chinese.map(w => DICTIONARY[w])])];
}

function stance(text) {
  const lower = text.toLowerCase();
  const positive = POSITIVE.filter(w => lower.includes(w)).length;
  const caution = CAUTION.filter(w => lower.includes(w)).length;
  if (positive > caution + 1) return { label: "积极", note: "更强调机会与收益" };
  if (caution > positive + 1) return { label: "审慎", note: "更强调边界与风险" };
  return { label: "平衡", note: "机会与风险均有涉及" };
}

function sentence(text) {
  const parts = text.split(/(?<=[。！？.!?])\s*/).filter(s => s.trim().length > 12);
  return (parts.sort((a,b) => b.length - a.length)[0] || text).trim().slice(0, 160);
}

function setTags(target, words, fallback) {
  const list = words.length ? words.slice(0, 6) : fallback;
  target.innerHTML = list.map(word => `<span>${escapeHtml(word)}</span>`).join("");
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
}

function updateCount(side) { $(`#count-${side}`).textContent = $(`#text-${side}`).value.length; }

function loadDemo() {
  $("#text-a").value = DEMO.a;
  $("#text-b").value = DEMO.b;
  $("#lang-a").value = "zh";
  $("#lang-b").value = "en";
  updateCount("a"); updateCount("b");
  $("#workspace").scrollIntoView({ behavior: "smooth" });
}

function analyze() {
  const a = $("#text-a").value.trim();
  const b = $("#text-b").value.trim();
  if (a.length < 20 || b.length < 20) {
    ["#text-a", "#text-b"].forEach(id => { if ($(id).value.trim().length < 20) { $(id).parentElement.classList.add("shake"); setTimeout(() => $(id).parentElement.classList.remove("shake"), 350); }});
    $("#privacy-note").textContent = "每段至少输入 20 个字符后再分析";
    return;
  }
  const wordsA = tokenize(a), wordsB = tokenize(b);
  const shared = wordsA.filter(word => wordsB.includes(word));
  const onlyA = wordsA.filter(word => !wordsB.includes(word));
  const onlyB = wordsB.filter(word => !wordsA.includes(word));
  const union = new Set([...wordsA, ...wordsB]).size || 1;
  const score = Math.max(18, Math.min(96, Math.round((shared.length / union) * 100 + 34)));
  const toneA = stance(a), toneB = stance(b);
  $("#overlap-score").textContent = `${score}%`;
  $("#overlap-bar").style.width = `${score}%`;
  $("#overlap-label").textContent = score > 70 ? "核心议题高度一致" : score > 45 ? "存在清晰共同议题" : "关注重点差异明显";
  $("#stance-a").textContent = toneA.label; $("#stance-a-note").textContent = toneA.note;
  $("#stance-b").textContent = toneB.label; $("#stance-b-note").textContent = toneB.note;
  setTags($("#shared-tags"), shared, ["公共价值", "技术影响"]);
  setTags($("#only-a-tags"), onlyA, ["本地语境"]);
  setTags($("#only-b-tags"), onlyB, ["表达视角"]);
  $("#consensus-copy").textContent = shared.length ? `两段观点都围绕“${shared.slice(0,3).join("、")}”展开，可把这些主题作为沟通的共同起点。` : "两段文本使用了不同表达方式，但都在讨论技术与人的关系。";
  $("#quote-a").textContent = sentence(a);
  $("#quote-b").textContent = sentence(b);
  $("#results").hidden = false;
  $("#privacy-note").textContent = "分析完成，文本未离开当前浏览器";
  $("#results").scrollIntoView({ behavior: "smooth", block: "start" });
}

$("#load-demo").addEventListener("click", loadDemo);
$("#load-demo-top").addEventListener("click", loadDemo);
$("#analyze").addEventListener("click", analyze);
$("#reset").addEventListener("click", () => $("#workspace").scrollIntoView({behavior:"smooth"}));
$("#text-a").addEventListener("input", () => updateCount("a"));
$("#text-b").addEventListener("input", () => updateCount("b"));
$("#swap").addEventListener("click", () => {
  const a = $("#text-a").value, la = $("#lang-a").value;
  $("#text-a").value = $("#text-b").value; $("#lang-a").value = $("#lang-b").value;
  $("#text-b").value = a; $("#lang-b").value = la;
  updateCount("a"); updateCount("b");
});
