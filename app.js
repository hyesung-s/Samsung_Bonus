const DIVISIONS = {
  memory: { id: "memory", name: "메모리" },
  foundry: { id: "foundry", name: "파운드리" },
  slsi: { id: "slsi", name: "S.LSI" },
  common: { id: "common", name: "공통" },
};

const BUSINESS_DIVISION_IDS = ["memory", "foundry", "slsi"];
const ALL_DIVISION_IDS = ["memory", "common", "foundry", "slsi"];
const JO_WON = 1_000_000_000_000;
const MAN_WON = 10_000;
const EOK_WON = 100_000_000;
const STORAGE_KEY = "samsung-bonus-calculator-state-v3";

const DEFAULT_STATE = {
  userSalaryManwon: 8000,
  userDivision: "memory",
  averageSalaryManwon: 8000,
  opi1RatePercent: 50,
  opi2FundingRatePercent: 10.5,
  equalDistributionRatePercent: 40,
  businessDistributionRatePercent: 60,
  commonPayoutRatePercent: 70,
  commonBusinessPoolSource: "memory",
  memoryProfitJo: 320,
  foundryProfitJo: 0,
  slsiProfitJo: 0,
  memoryHeadcount: 27400,
  foundryHeadcount: 14000,
  slsiHeadcount: 6900,
  commonHeadcount: 29000,
};

let state = { ...DEFAULT_STATE };

const elements = {
  userSalaryManwon: document.getElementById("userSalaryManwon"),
  userDivision: document.getElementById("userDivision"),
  averageSalaryManwon: document.getElementById("averageSalaryManwon"),
  opi1RatePercent: document.getElementById("opi1RatePercent"),
  opi2FundingRatePercent: document.getElementById("opi2FundingRatePercent"),
  equalDistributionRatePercent: document.getElementById("equalDistributionRatePercent"),
  businessDistributionRatePercent: document.getElementById("businessDistributionRatePercent"),
  commonPayoutRatePercent: document.getElementById("commonPayoutRatePercent"),
  commonBusinessPoolSource: document.getElementById("commonBusinessPoolSource"),
  memoryProfitJo: document.getElementById("memoryProfitJo"),
  foundryProfitJo: document.getElementById("foundryProfitJo"),
  slsiProfitJo: document.getElementById("slsiProfitJo"),
  memoryHeadcount: document.getElementById("memoryHeadcount"),
  foundryHeadcount: document.getElementById("foundryHeadcount"),
  slsiHeadcount: document.getElementById("slsiHeadcount"),
  commonHeadcount: document.getElementById("commonHeadcount"),
  opiDetails: document.getElementById("opiDetails"),
  summaryCards: document.getElementById("summaryCards"),
  selectedDivisionTitle: document.getElementById("selectedDivisionTitle"),
  salaryRatioText: document.getElementById("salaryRatioText"),
  comparisonBoard: document.getElementById("comparisonBoard"),
  fundSummary: document.getElementById("fundSummary"),
  distributionWarning: document.getElementById("distributionWarning"),
  equalPoolTableText: document.getElementById("equalPoolTableText"),
  equalPoolFormulaText: document.getElementById("equalPoolFormulaText"),
  memoryBusinessPoolText: document.getElementById("memoryBusinessPoolText"),
  foundryBusinessPoolText: document.getElementById("foundryBusinessPoolText"),
  slsiBusinessPoolText: document.getElementById("slsiBusinessPoolText"),
  commonSourceInfo: document.getElementById("commonSourceInfo"),
  commonWeightedInfo: document.getElementById("commonWeightedInfo"),
  shareButton: document.getElementById("shareButton"),
  resetButton: document.getElementById("resetButton"),
  toast: document.getElementById("toast"),
};

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatInteger(value) {
  return Math.round(value).toLocaleString("ko-KR");
}

function formatDecimal(value, maxDigits = 2) {
  return Number(value).toLocaleString("ko-KR", {
    maximumFractionDigits: maxDigits,
  });
}

function formatMoney(value) {
  if (!Number.isFinite(value)) return "-";
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);

  if (abs >= JO_WON) {
    const jo = abs / JO_WON;
    return `${sign}${formatDecimal(jo, 2)}조 원`;
  }

  const roundedMan = Math.round(abs / MAN_WON);
  const eok = Math.floor(roundedMan / 10_000);
  const man = roundedMan % 10_000;

  if (eok > 0 && man > 0) return `${sign}${formatInteger(eok)}억 ${formatInteger(man)}만 원`;
  if (eok > 0) return `${sign}${formatInteger(eok)}억 원`;
  if (man > 0) return `${sign}${formatInteger(man)}만 원`;
  return "0원";
}

function formatPercent(value, maxDigits = 1) {
  if (!Number.isFinite(value)) return "-";
  return `${formatDecimal(value, maxDigits)}%`;
}

function formatSalaryPercent(value, salary) {
  if (!Number.isFinite(value) || !Number.isFinite(salary) || salary <= 0) return "연봉 대비 -";
  return `연봉의 ${formatPercent((value / salary) * 100, 1)}`;
}

function getDivisionName(id) {
  return DIVISIONS[id]?.name ?? id;
}

function stateToParams(inputState) {
  const params = new URLSearchParams();
  const keyMap = {
    userSalaryManwon: "s",
    userDivision: "d",
    averageSalaryManwon: "avg",
    opi1RatePercent: "o1",
    opi2FundingRatePercent: "o2",
    equalDistributionRatePercent: "eq",
    businessDistributionRatePercent: "br",
    commonPayoutRatePercent: "cr",
    commonBusinessPoolSource: "cs",
    memoryProfitJo: "mp",
    foundryProfitJo: "fp",
    slsiProfitJo: "lp",
    memoryHeadcount: "mh",
    foundryHeadcount: "fh",
    slsiHeadcount: "lh",
    commonHeadcount: "ch",
  };

  Object.entries(keyMap).forEach(([stateKey, paramKey]) => {
    params.set(paramKey, String(inputState[stateKey]));
  });

  return params.toString();
}

function paramsToState() {
  const params = new URLSearchParams(window.location.search);
  if (![...params.keys()].length) return null;

  const reverseMap = {
    s: "userSalaryManwon",
    d: "userDivision",
    avg: "averageSalaryManwon",
    o1: "opi1RatePercent",
    o2: "opi2FundingRatePercent",
    eq: "equalDistributionRatePercent",
    br: "businessDistributionRatePercent",
    cr: "commonPayoutRatePercent",
    cs: "commonBusinessPoolSource",
    mp: "memoryProfitJo",
    fp: "foundryProfitJo",
    lp: "slsiProfitJo",
    mh: "memoryHeadcount",
    fh: "foundryHeadcount",
    lh: "slsiHeadcount",
    ch: "commonHeadcount",
  };

  const parsed = { ...DEFAULT_STATE };
  Object.entries(reverseMap).forEach(([paramKey, stateKey]) => {
    if (!params.has(paramKey)) return;
    const value = params.get(paramKey);
    if (["userDivision", "commonBusinessPoolSource"].includes(stateKey)) {
      parsed[stateKey] = value;
    } else {
      parsed[stateKey] = toNumber(value, DEFAULT_STATE[stateKey]);
    }
  });

  return sanitizeState(parsed);
}

function loadState() {
  const queryState = paramsToState();
  if (queryState) return queryState;

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return { ...DEFAULT_STATE };
    return sanitizeState({ ...DEFAULT_STATE, ...JSON.parse(saved) });
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function sanitizeState(inputState) {
  const sanitized = { ...DEFAULT_STATE, ...inputState };

  sanitized.userSalaryManwon = Math.max(0, toNumber(sanitized.userSalaryManwon, DEFAULT_STATE.userSalaryManwon));
  sanitized.averageSalaryManwon = Math.max(1, toNumber(sanitized.averageSalaryManwon, DEFAULT_STATE.averageSalaryManwon));
  sanitized.opi1RatePercent = Math.max(0, toNumber(sanitized.opi1RatePercent, DEFAULT_STATE.opi1RatePercent));
  sanitized.opi2FundingRatePercent = Math.max(0, toNumber(sanitized.opi2FundingRatePercent, DEFAULT_STATE.opi2FundingRatePercent));
  sanitized.equalDistributionRatePercent = clamp(toNumber(sanitized.equalDistributionRatePercent, DEFAULT_STATE.equalDistributionRatePercent), 0, 100);
  sanitized.businessDistributionRatePercent = clamp(toNumber(sanitized.businessDistributionRatePercent, DEFAULT_STATE.businessDistributionRatePercent), 0, 100);
  sanitized.commonPayoutRatePercent = clamp(toNumber(sanitized.commonPayoutRatePercent, DEFAULT_STATE.commonPayoutRatePercent), 0, 100);

  ["memoryProfitJo", "foundryProfitJo", "slsiProfitJo"].forEach((key) => {
    sanitized[key] = toNumber(sanitized[key], DEFAULT_STATE[key]);
  });

  ["memoryHeadcount", "foundryHeadcount", "slsiHeadcount", "commonHeadcount"].forEach((key) => {
    sanitized[key] = Math.max(0, toNumber(sanitized[key], DEFAULT_STATE[key]));
  });

  if (!ALL_DIVISION_IDS.includes(sanitized.userDivision)) sanitized.userDivision = DEFAULT_STATE.userDivision;
  if (!BUSINESS_DIVISION_IDS.includes(sanitized.commonBusinessPoolSource)) {
    sanitized.commonBusinessPoolSource = DEFAULT_STATE.commonBusinessPoolSource;
  }

  return sanitized;
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 저장이 막힌 브라우저에서는 무시합니다.
  }
}

function syncInputs() {
  Object.entries(elements).forEach(([key, element]) => {
    if (!element || !(key in state)) return;
    element.value = state[key];
  });
}

function readInputs() {
  const next = { ...state };
  Object.entries(elements).forEach(([key, element]) => {
    if (!element || !(key in DEFAULT_STATE)) return;
    if (["userDivision", "commonBusinessPoolSource"].includes(key)) {
      next[key] = element.value;
    } else {
      next[key] = toNumber(element.value, DEFAULT_STATE[key]);
    }
  });
  state = sanitizeState(next);
}

function calculate(input) {
  const salary = input.userSalaryManwon * MAN_WON;
  const averageSalary = input.averageSalaryManwon * MAN_WON;
  const salaryRatio = averageSalary > 0 ? salary / averageSalary : 0;
  const opi1Rate = input.opi1RatePercent / 100;
  const opi2FundingRate = input.opi2FundingRatePercent / 100;
  const equalRate = input.equalDistributionRatePercent / 100;
  const businessRate = input.businessDistributionRatePercent / 100;
  const commonPayoutRate = input.commonPayoutRatePercent / 100;

  const headcounts = {
    memory: input.memoryHeadcount,
    foundry: input.foundryHeadcount,
    slsi: input.slsiHeadcount,
    common: input.commonHeadcount,
  };

  const operatingProfits = {
    memory: input.memoryProfitJo * JO_WON,
    foundry: input.foundryProfitJo * JO_WON,
    slsi: input.slsiProfitJo * JO_WON,
  };

  const totalOperatingProfit = BUSINESS_DIVISION_IDS.reduce((sum, id) => sum + operatingProfits[id], 0);

  // 부문 재원은 사업부 전체 손익 합계를 그대로 반영합니다. 적자도 반영됩니다.
  const equalPool = totalOperatingProfit * opi2FundingRate * equalRate;

  // 사업부 재원은 각 사업부별 흑자분만 반영합니다.
  const businessPools = Object.fromEntries(
    BUSINESS_DIVISION_IDS.map((id) => [
      id,
      Math.max(operatingProfits[id], 0) * opi2FundingRate * businessRate,
    ])
  );
  const totalBusinessPool = BUSINESS_DIVISION_IDS.reduce((sum, id) => sum + businessPools[id], 0);
  const calculatedOpi2Fund = equalPool + totalBusinessPool;

  const commonWeightedHeadcount = headcounts.common * commonPayoutRate;
  const equalWeightedHeadcount =
    headcounts.memory + headcounts.foundry + headcounts.slsi + commonWeightedHeadcount;
  const equalBaseAverage = equalWeightedHeadcount > 0 ? equalPool / equalWeightedHeadcount : 0;

  const businessWeightedHeadcounts = Object.fromEntries(
    BUSINESS_DIVISION_IDS.map((id) => [
      id,
      headcounts[id] + (input.commonBusinessPoolSource === id ? commonWeightedHeadcount : 0),
    ])
  );

  const businessBaseAverage = Object.fromEntries(
    BUSINESS_DIVISION_IDS.map((id) => [
      id,
      businessWeightedHeadcounts[id] > 0 ? businessPools[id] / businessWeightedHeadcounts[id] : 0,
    ])
  );

  const averageResults = {};
  BUSINESS_DIVISION_IDS.forEach((id) => {
    averageResults[id] = {
      id,
      name: getDivisionName(id),
      opi1: averageSalary * opi1Rate,
      opi2Equal: equalBaseAverage,
      opi2Business: businessBaseAverage[id],
    };
  });

  const selectedBusinessBaseAverage = businessBaseAverage[input.commonBusinessPoolSource] ?? 0;
  averageResults.common = {
    id: "common",
    name: getDivisionName("common"),
    opi1: averageSalary * opi1Rate,
    opi2Equal: equalBaseAverage * commonPayoutRate,
    opi2Business: selectedBusinessBaseAverage * commonPayoutRate,
  };

  const userResults = Object.fromEntries(
    ALL_DIVISION_IDS.map((id) => {
      const averageResult = averageResults[id];
      const opi1 = salary * opi1Rate;
      const opi2Equal = averageResult.opi2Equal * salaryRatio;
      const opi2Business = averageResult.opi2Business * salaryRatio;
      const opi2Total = opi2Equal + opi2Business;
      const totalBonus = opi1 + opi2Total;
      const totalCompensation = salary + totalBonus;

      return [
        id,
        {
          ...averageResult,
          opi1,
          opi2Equal,
          opi2Business,
          opi2Total,
          totalBonus,
          totalCompensation,
        },
      ];
    })
  );

  const estimatedAverageOpi2Payout =
    equalBaseAverage * equalWeightedHeadcount +
    BUSINESS_DIVISION_IDS.reduce((sum, id) => sum + businessBaseAverage[id] * businessWeightedHeadcounts[id], 0);

  return {
    salary,
    averageSalary,
    salaryRatio,
    headcounts,
    operatingProfits,
    totalOperatingProfit,
    equalPool,
    businessPools,
    totalBusinessPool,
    calculatedOpi2Fund,
    commonWeightedHeadcount,
    equalWeightedHeadcount,
    businessWeightedHeadcounts,
    equalBaseAverage,
    businessBaseAverage,
    estimatedAverageOpi2Payout,
    results: userResults,
  };
}

function render() {
  const result = calculate(state);
  const selected = result.results[state.userDivision];
  const selectedName = getDivisionName(state.userDivision);

  elements.selectedDivisionTitle.textContent = `${selectedName} 기준 예상 성과급`;
  elements.salaryRatioText.textContent = `연봉 보정계수 ${formatDecimal(result.salaryRatio, 2)}배`;

  elements.summaryCards.innerHTML = [
    summaryCard("OPI1", selected.opi1, formatSalaryPercent(selected.opi1, result.salary)),
    summaryCard("OPI2 부문", selected.opi2Equal, formatSalaryPercent(selected.opi2Equal, result.salary)),
    summaryCard("OPI2 사업부", selected.opi2Business, formatSalaryPercent(selected.opi2Business, result.salary)),
    summaryCard("OPI2 합계", selected.opi2Total, formatSalaryPercent(selected.opi2Total, result.salary)),
    summaryCard("총 성과급", selected.totalBonus, formatSalaryPercent(selected.totalBonus, result.salary), true),
    summaryCard("예상 총보상", selected.totalCompensation, `연봉 포함 ${formatSalaryPercent(selected.totalCompensation, result.salary).replace("연봉의 ", "")}`),
  ].join("");

  renderSimulationTableValues(result);
  renderDistributionWarning();
  renderComparison(result);
  renderFundSummary(result);
}

function renderSimulationTableValues(result) {
  const sourceName = getDivisionName(state.commonBusinessPoolSource);
  const fundingRate = formatPercent(state.opi2FundingRatePercent, 1);
  const equalRate = formatPercent(state.equalDistributionRatePercent, 1);
  const businessRate = formatPercent(state.businessDistributionRatePercent, 1);

  elements.equalPoolTableText.textContent = formatMoney(result.equalPool);
  elements.equalPoolFormulaText.textContent =
    `영업이익 합계 ${formatMoney(result.totalOperatingProfit)} × ${fundingRate} × 부문 ${equalRate}`;

  elements.memoryBusinessPoolText.textContent = formatMoney(result.businessPools.memory);
  elements.foundryBusinessPoolText.textContent = formatMoney(result.businessPools.foundry);
  elements.slsiBusinessPoolText.textContent = formatMoney(result.businessPools.slsi);

  elements.commonSourceInfo.textContent = `${sourceName} 재원 공유`;
  elements.commonWeightedInfo.textContent =
    `공통 가중인원 ${formatDecimal(result.commonWeightedHeadcount, 1)}명 · 사업부 배분 ${businessRate}`;
}

function renderDistributionWarning() {
  const distributionTotal = state.equalDistributionRatePercent + state.businessDistributionRatePercent;
  if (Math.abs(distributionTotal - 100) > 0.001) {
    elements.distributionWarning.hidden = false;
    elements.distributionWarning.textContent =
      `현재 부문 + 사업부 배분 비율 합계가 ${formatDecimal(distributionTotal, 1)}%입니다. 일반적으로 100%가 되도록 입력하세요.`;
    if (elements.opiDetails) elements.opiDetails.open = true;
  } else {
    elements.distributionWarning.hidden = true;
  }
}

function summaryCard(label, value, sub, primary = false) {
  const negativeClass = value < 0 ? " negative-card" : "";
  return `
    <article class="summary-card ${primary ? "primary-card" : ""}${negativeClass}">
      <div class="label">${label}</div>
      <div class="value">${formatMoney(value)}</div>
      <div class="sub">${sub}</div>
    </article>
  `;
}

function renderComparison(result) {
  const metrics = [
    { key: "opi1", label: "OPI1" },
    { key: "opi2Equal", label: "OPI2 부문" },
    { key: "opi2Business", label: "OPI2 사업부" },
    { key: "opi2Total", label: "OPI2 합계" },
    { key: "totalBonus", label: "총 성과급" },
  ];

  const maxAbsByMetric = Object.fromEntries(
    metrics.map((metric) => [
      metric.key,
      Math.max(...ALL_DIVISION_IDS.map((id) => Math.abs(result.results[id][metric.key])), 1),
    ])
  );

  elements.comparisonBoard.innerHTML = ALL_DIVISION_IDS.map((id) => {
    const row = result.results[id];
    const selectedClass = id === state.userDivision ? " selected-comparison" : "";
    const metricCards = metrics.map((metric) => {
      const value = row[metric.key];
      const width = Math.max(2, (Math.abs(value) / maxAbsByMetric[metric.key]) * 100);
      const negativeClass = value < 0 ? " negative" : "";
      return `
        <div class="metric-card${negativeClass}">
          <div class="metric-top">
            <span>${metric.label}</span>
            <strong>${formatMoney(value)}</strong>
          </div>
          <div class="metric-sub">${formatSalaryPercent(value, result.salary)}</div>
          <div class="mini-track" aria-hidden="true">
            <div class="mini-fill" style="width: ${width}%"></div>
          </div>
        </div>
      `;
    }).join("");

    return `
      <article class="comparison-card${selectedClass}">
        <div class="comparison-head">
          <div>
            <h3>${row.name}</h3>
            <p>예상 총보상 ${formatMoney(row.totalCompensation)}</p>
          </div>
          ${id === state.userDivision ? "<span class=\"selected-badge\">선택</span>" : ""}
        </div>
        <div class="metric-grid">${metricCards}</div>
      </article>
    `;
  }).join("");
}

function renderFundSummary(result) {
  const sourceName = getDivisionName(state.commonBusinessPoolSource);
  const selectedBusinessWeighted = result.businessWeightedHeadcounts[state.commonBusinessPoolSource] ?? 0;
  const fundGap = result.calculatedOpi2Fund - result.estimatedAverageOpi2Payout;

  const stats = [
    ["사업부 영업이익 합계", formatMoney(result.totalOperatingProfit)],
    ["OPI2 부문 재원", formatMoney(result.equalPool)],
    ["메모리 OPI2 사업부 재원", formatMoney(result.businessPools.memory)],
    ["파운드리 OPI2 사업부 재원", formatMoney(result.businessPools.foundry)],
    ["S.LSI OPI2 사업부 재원", formatMoney(result.businessPools.slsi)],
    ["OPI2 산출 재원 합계", formatMoney(result.calculatedOpi2Fund)],
    ["공통 제원 공유 사업부", sourceName],
    ["공통 가중인원", `${formatDecimal(result.commonWeightedHeadcount, 1)}명`],
    ["부문 가중인원", `${formatDecimal(result.equalWeightedHeadcount, 1)}명`],
    [`${sourceName} 사업부 가중인원`, `${formatDecimal(selectedBusinessWeighted, 1)}명`],
    ["평균연봉 기준 OPI2 지급 검증", `${formatMoney(result.estimatedAverageOpi2Payout)} 지급`],
    ["재원 잔액", formatMoney(Math.abs(fundGap) < 1 ? 0 : fundGap)],
  ];

  elements.fundSummary.innerHTML = stats.map(([label, value]) => `
    <div class="stat-item">
      <div class="stat-label">${label}</div>
      <div class="stat-value">${value}</div>
    </div>
  `).join("");
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    elements.toast.classList.remove("show");
  }, 2200);
}

function updateUrlSilently() {
  const query = stateToParams(state);
  const nextUrl = `${window.location.pathname}?${query}`;
  window.history.replaceState(null, "", nextUrl);
}

async function copyShareLink() {
  const query = stateToParams(state);
  const url = `${window.location.origin}${window.location.pathname}?${query}`;

  try {
    await navigator.clipboard.writeText(url);
    showToast("현재 설정 링크를 복사했습니다.");
  } catch {
    window.prompt("아래 링크를 복사하세요.", url);
  }
}

function resetState() {
  state = { ...DEFAULT_STATE };
  syncInputs();
  saveState();
  updateUrlSilently();
  render();
  showToast("기본값으로 복원했습니다.");
}

function onInputChange(event) {
  readInputs();

  if (event?.target?.id === "equalDistributionRatePercent") {
    state.businessDistributionRatePercent = clamp(100 - state.equalDistributionRatePercent, 0, 100);
    elements.businessDistributionRatePercent.value = state.businessDistributionRatePercent;
  }

  if (event?.target?.id === "businessDistributionRatePercent") {
    state.equalDistributionRatePercent = clamp(100 - state.businessDistributionRatePercent, 0, 100);
    elements.equalDistributionRatePercent.value = state.equalDistributionRatePercent;
  }

  state = sanitizeState(state);
  saveState();
  updateUrlSilently();
  render();
}

function bindEvents() {
  Object.entries(elements).forEach(([key, element]) => {
    if (!element || !(key in DEFAULT_STATE)) return;
    element.addEventListener("input", onInputChange);
    element.addEventListener("change", onInputChange);
  });

  elements.shareButton.addEventListener("click", copyShareLink);
  elements.resetButton.addEventListener("click", resetState);
}

function init() {
  state = loadState();
  syncInputs();
  bindEvents();
  updateUrlSilently();
  render();
}

init();
