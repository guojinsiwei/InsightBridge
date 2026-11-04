/* Plain scripts keep file:// use working without a build step. */
(() => {
  "use strict";

  const CONCEPTS = [
    { id: "city", zh: ["城市", "都市"], en: ["city", "urban", "cities"], label: "城市 / city" },
    { id: "public", zh: ["公共"], en: ["public"], label: "公共 / public" },
    { id: "space", zh: ["空间"], en: ["space", "spaces"], label: "空间 / space" },
    { id: "smart", zh: ["智能", "智慧"], en: ["smart", "intelligent"], label: "智能 / smart" },
    { id: "infra", zh: ["设施", "基础设施"], en: ["infrastructure", "facilities"], label: "设施 / infrastructure" },
    { id: "service", zh: ["服务"], en: ["service", "services"], label: "服务 / service" },
    { id: "efficiency", zh: ["效率", "高效"], en: ["efficiency", "efficient", "faster"], label: "效率 / efficiency" },
    { id: "residents", zh: ["居民", "市民"], en: ["residents", "citizens"], label: "居民 / residents" },
    { id: "needs", zh: ["需求"], en: ["needs", "demand"], label: "需求 / needs" },
    { id: "transparency", zh: ["透明"], en: ["transparency", "transparent"], label: "透明 / transparency" },
    { id: "elderly", zh: ["老年人", "老人"], en: ["elderly", "older"], label: "老年人 / elderly" },
    { id: "children", zh: ["儿童", "孩子"], en: ["children", "kids"], label: "儿童 / children" },
    { id: "offline", zh: ["线下"], en: ["offline"], label: "线下 / offline" },
    { id: "fairness", zh: ["公平"], en: ["fairness", "fair", "equity"], label: "公平 / fairness" },
    { id: "convenience", zh: ["便利", "便捷"], en: ["convenience", "convenient"], label: "便利 / convenience" },
    { id: "technology", zh: ["技术", "科技"], en: ["technology", "tech"], label: "技术 / technology" },
    { id: "community", zh: ["社区", "社群"], en: ["community"], label: "社区 / community" },
    { id: "trust", zh: ["信任"], en: ["trust"], label: "信任 / trust" },
    { id: "privacy", zh: ["隐私"], en: ["privacy"], label: "隐私 / privacy" },
    { id: "safety", zh: ["安全"], en: ["safety", "security", "secure"], label: "安全 / safety" },
    { id: "inclusion", zh: ["包容", "普惠"], en: ["inclusion", "inclusive", "accessible"], label: "包容 / inclusion" },
    { id: "vulnerable", zh: ["弱势"], en: ["vulnerable"], label: "弱势 / vulnerable" },
    { id: "groups", zh: ["群体"], en: ["groups"], label: "群体 / groups" },
    { id: "development", zh: ["发展"], en: ["development", "growth"], label: "发展 / development" },
    { id: "innovation", zh: ["创新"], en: ["innovation", "innovative"], label: "创新 / innovation" },
    { id: "risk", zh: ["风险"], en: ["risk", "risks"], label: "风险 / risk" },
    { id: "research", zh: ["研究", "科研"], en: ["research", "study"], label: "研究 / research" },
    { id: "paper", zh: ["论文", "文献", "摘要"], en: ["paper", "papers", "abstract", "literature"], label: "文献 / literature" },
    { id: "data", zh: ["数据"], en: ["data", "dataset"], label: "数据 / data" },
    { id: "model", zh: ["模型"], en: ["model", "models"], label: "模型 / model" },
    { id: "climate", zh: ["气候", "碳排放", "低碳", "碳中和", "碳足迹", "脱碳", "减碳"], en: ["climate", "carbon"], label: "气候 / climate" },
    { id: "energy", zh: ["能源", "电力"], en: ["energy", "power"], label: "能源 / energy" },
    { id: "health", zh: ["健康", "医疗"], en: ["health", "medical"], label: "健康 / health" },
    { id: "education", zh: ["教育", "学习"], en: ["education", "learning"], label: "教育 / education" },
    { id: "policy", zh: ["政策", "治理"], en: ["policy", "governance"], label: "政策 / policy" },
    { id: "trade", zh: ["外贸", "贸易", "出口"], en: ["trade", "export", "exports"], label: "贸易 / trade" },
    { id: "crossborder", zh: ["跨境", "出海"], en: ["cross-border", "overseas", "global"], label: "跨境 / cross-border" },
    { id: "localization", zh: ["本地化"], en: ["localization", "localised", "localized"], label: "本地化 / localization" },
    { id: "culture", zh: ["文化", "跨文化"], en: ["culture", "cultural", "intercultural"], label: "文化 / culture" },
    { id: "language", zh: ["语言", "多语言", "双语"], en: ["language", "languages", "bilingual", "multilingual"], label: "语言 / language" },
    { id: "market", zh: ["市场", "客户"], en: ["market", "markets", "customer"], label: "市场 / market" },
    { id: "finance", zh: ["金融", "资产", "理财"], en: ["finance", "financial", "asset"], label: "金融 / finance" },
    { id: "ai", zh: ["人工智能", "大模型"], en: ["artificial intelligence", "ai", "llm", "llms"], label: "人工智能 / AI" },
    { id: "evidence", zh: ["证据", "引用"], en: ["evidence", "citation"], label: "证据 / evidence" }
  ];

  const POSITIVE = ["提高", "便利", "公平", "可靠", "成功", "信任", "包容", "创新", "增长", "faster", "responsive", "success", "successful", "trust", "accessible", "strengthens", "fairness", "reliable", "benefit", "benefits", "improve", "improves", "opportunity", "opportunities"];
  const CAUTION = ["风险", "必须", "隐私", "弱势", "排除", "审慎", "挑战", "失败", "不可靠", "不公平", "不信任", "risk", "risks", "privacy", "vulnerable", "excluding", "safeguard", "safeguards", "must", "challenge", "challenges", "limit", "limits", "unreliable", "inaccessible", "unsuccessful", "distrust"];
  const patterns = new Map();

  function detectLang(text) {
    const cjk = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    return cjk / Math.max(text.length, 1) > 0.12 ? "zh" : "en";
  }

  function findMatches(text, term) {
    if (!patterns.has(term)) {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const expression = /^[a-z]/i.test(term)
        ? `\\b${escaped.replace(/[- ]+/g, "[-\\s]+")}\\b`
        : escaped;
      patterns.set(term, new RegExp(expression, "gi"));
    }
    return Array.from(text.matchAll(patterns.get(term)), match => ({
      term, word: match[0], start: match.index, end: match.index + match[0].length
    }));
  }

  function extractConcepts(text) {
    const candidates = CONCEPTS.flatMap(concept =>
      [...concept.zh, ...concept.en].flatMap(term =>
        findMatches(text, term).map(match => ({ ...match, id: concept.id }))
      )
    ).sort((a, b) => (b.end - b.start) - (a.end - a.start) || a.start - b.start);
    // Prefer a specific phrase over a shorter concept inside that same occurrence.
    // A separate occurrence of the shorter concept still counts.
    const accepted = [];
    for (const match of candidates) {
      if (!accepted.some(other => other.start <= match.start && other.end >= match.end &&
        other.end - other.start > match.end - match.start)) {
        accepted.push(match);
      }
    }
    return CONCEPTS.flatMap(concept => {
      const matches = accepted.filter(match => match.id === concept.id)
        .sort((a, b) => a.start - b.start);
      return matches.length ? [{ ...concept, matches }] : [];
    });
  }

  function negatedExpression(text, match) {
    // Deliberately local rules: reset at punctuation and contrast words. Do not
    // infer that a negated caution word is positive, or vice versa.
    let prefix = text.slice(0, match.start).split(/[。！？.!?，,;；:\n]/).pop();
    prefix = prefix.split(/\b(?:but|however|yet)\b|但是|然而|不过/iu).pop();
    prefix = prefix.replace(/\bnot\s+only\b/giu, "").replace(/不仅|不只|不单/gu, "");
    const negation = /^[a-z]/i.test(match.term)
      ? prefix.match(/\b(?:not|never|no|without|cannot|(?:isn|aren|wasn|weren|don|doesn|didn|can|couldn|won|wouldn|shouldn|hasn|haven|hadn)['’]t)\s+(?:[a-z]+\s+){0,3}$/iu)
      : prefix.match(/(?:不是|并非|不|没有|没|未能|未|无法|无|谈不上|不能)(?:很|太|够|更|再|真正|完全|任何|带来|具有|实现|值得|获得){0,3}$/u);
    return negation ? `${negation[0]}${match.word}` : null;
  }

  function stance(text) {
    const negated = new Set();
    function countTerms(terms) {
      return terms.filter(term => {
        const matches = findMatches(text, term);
        let affirmed = false;
        for (const match of matches) {
          const expression = negatedExpression(text, match);
          if (expression) negated.add(expression);
          else affirmed = true;
        }
        return affirmed;
      });
    }
    const positive = countTerms(POSITIVE);
    const caution = countTerms(CAUTION);
    let label = "混合";
    if (!positive.length && !caution.length) label = "未识别";
    else if (!caution.length || positive.length > caution.length + 1) label = "积极";
    else if (!positive.length || caution.length > positive.length + 1) label = "审慎";
    const describe = terms => terms.length ? terms.join("、") : "无";
    const note = (label === "未识别" ? "未识别到明显倾向。" : "") +
      `积极词 ${positive.length}：${describe(positive)}；审慎词 ${caution.length}：${describe(caution)}` +
      (negated.size ? `；已排除否定表达：${[...negated].join("、")}` : "");
    return { label, note, positive, caution, negated: [...negated] };
  }

  function splitSentences(text) {
    if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
      const segments = Array.from(new Intl.Segmenter("en", { granularity: "sentence" }).segment(text),
        part => part.segment).filter(segment => segment.trim());
      const sentences = [];
      for (const segment of segments) {
        if (sentences.length && /\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr)\.\s*$/i.test(sentences[sentences.length - 1])) {
          sentences[sentences.length - 1] += segment;
        } else sentences.push(segment);
      }
      return sentences.map(sentence => sentence.trim());
    }
    // Conservative fallback for older browsers: keep decimals and common English
    // abbreviations intact, even if that means retaining a longer sentence.
    const sentences = [];
    const punctuation = /[。！？!?]+[”’"')）\]]*|\.+[”’"')）\]]*|\n+/g;
    let start = 0;
    for (const match of text.matchAll(punctuation)) {
      const end = match.index + match[0].length;
      if (match[0].startsWith(".")) {
        const before = text.slice(start, end);
        const after = text.slice(end);
        if (/\d\.$/.test(before) && /^\d/.test(after)) continue;
        if (after.trim() && /\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|e\.g|i\.e|(?:[A-Z]\.)*[A-Z])\.$/i.test(before)) continue;
        if (after && !/^\s/.test(after)) continue;
      }
      const sentence = text.slice(start, end).trim();
      if (sentence) sentences.push(sentence);
      start = end;
    }
    const rest = text.slice(start).trim();
    if (rest) sentences.push(rest);
    return sentences;
  }

  function bestSentence(text, concepts) {
    const ids = new Set(concepts.map(concept => concept.id));
    const scored = splitSentences(text).map(sentence => ({
      sentence,
      hits: extractConcepts(sentence).filter(concept => ids.has(concept.id)).length
    })).filter(item => item.hits > 0);
    scored.sort((a, b) => b.hits - a.hits);
    // Keep the full source sentence so a late matching word is not truncated away.
    return scored.length ? scored[0].sentence : null;
  }

  function compareTexts(a, b) {
    const conceptsA = extractConcepts(a);
    const conceptsB = extractConcepts(b);
    const idsA = new Set(conceptsA.map(concept => concept.id));
    const idsB = new Set(conceptsB.map(concept => concept.id));
    const shared = conceptsA.filter(concept => idsB.has(concept.id));
    const onlyA = conceptsA.filter(concept => !idsB.has(concept.id));
    const onlyB = conceptsB.filter(concept => !idsA.has(concept.id));
    const union = shared.length + onlyA.length + onlyB.length;
    const canCompare = conceptsA.length > 0 && conceptsB.length > 0;
    const missing = !conceptsA.length && !conceptsB.length ? "两段文本" : !conceptsA.length ? "观点 A" : "观点 B";
    return {
      a, b, conceptsA, conceptsB, shared, onlyA, onlyB, union, canCompare,
      score: canCompare ? Math.round(shared.length / union * 100) : null,
      coverageNote: canCompare
        ? "重合度仅描述已识别的概念，不代表立场一致或全文语义相似。"
        : `${missing}未识别到概念，词表覆盖不足，暂无法判断重合度。`,
      toneA: stance(a), toneB: stance(b)
    };
  }

  globalThis.InsightBridgeAnalysis = Object.freeze({
    detectLang, extractConcepts, stance, splitSentences, bestSentence, compareTexts
  });
})();
