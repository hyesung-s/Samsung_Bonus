const DIVISIONS = {
  memory: { id: "memory", name: "메모리" },
  foundry: { id: "foundry", name: "파운드리" },
  slsi: { id: "slsi", name: "S.LSI" },
  common: { id: "common", name: "공통" },
};

const BUSINESS_DIVISION_IDS = ["memory", "foundry", "slsi"];
const RESULT_DIVISION_IDS = ["memory", "foundry", "slsi", "common"];
const ALL_DIVISION_IDS = ["memory", "foundry", "slsi", "common"];
const JO_WON = 1_000_000_000_000;
const EOK_WON = 100_000_000;
const MAN_WON = 10_000;
const LOCAL_INCOME_TAX_RATE = 0.1;
const STORAGE_KEY = "samsung-bonus-calculator-state-v10";
const SAMPSUNG_URL = "https://sampsung.vercel.app/";
const YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart/005930.KS?range=10d&interval=1d";

const DEFAULT_STATE = {
  userSalaryManwon: 8000,
  userDivision: "memory",
  averageSalaryManwon: 8000,
  opi1RatePercent: 50,
  opi2FundingRatePercent: 10.5,
  sectorDistributionRatePercent: 40,
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
  stockVwapPriceWon: 276963,
  stockVwapDate: "2026-05-29",
  stockClosePriceWon: 349000,
  stockCloseDate: "2026-06-01",
};

const TAX_BRACKETS = [
  { max: 14_000_000, rate: 0.06, deduction: 0 },
  { max: 50_000_000, rate: 0.15, deduction: 1_260_000 },
  { max: 88_000_000, rate: 0.24, deduction: 5_760_000 },
  { max: 150_000_000, rate: 0.35, deduction: 15_440_000 },
  { max: 300_000_000, rate: 0.38, deduction: 19_940_000 },
  { max: 500_000_000, rate: 0.4, deduction: 25_940_000 },
  { max: 1_000_000_000, rate: 0.42, deduction: 35_940_000 },
  { max: Infinity, rate: 0.45, deduction: 65_940_000 },
];

const STRING_STATE_KEYS = ["userDivision", "commonBusinessPoolSource", "stockVwapDate", "stockCloseDate"];

let state = { ...DEFAULT_STATE };
let stockDetailsExpanded = false;

const elements = {
  userSalaryManwon: document.getElementById("userSalaryManwon"),
  userDivision: document.getElementById("userDivision"),
  averageSalaryManwon: document.getElementById("averageSalaryManwon"),
  opi1RatePercent: document.getElementById("opi1RatePercent"),
  opi2FundingRatePercent: document.getElementById("opi2FundingRatePercent"),
  sectorDistributionRatePercent: document.getElementById("sectorDistributionRatePercent"),
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
  stockVwapPriceWon: document.getElementById("stockVwapPriceWon"),
  stockVwapDate: document.getElementById("stockVwapDate"),
  stockClosePriceWon: document.getElementById("stockClosePriceWon"),
  stockCloseDate: document.getElementById("stockCloseDate"),
  refreshStockButton: document.getElementById("refreshStockButton"),
  stockFetchStatus: document.getElementById("stockFetchStatus"),
  summaryCards: document.getElementById("summaryCards"),
  taxNote: document.getElementById("taxNote"),
  selectedDivisionTitle: document.getElementById("selectedDivisionTitle"),
  salaryRatioText: document.getElementById("salaryRatioText"),
  sectorPoolText: document.getElementById("sectorPoolText"),
  memoryBusinessPoolText: document.getElementById("memoryBusinessPoolText"),
  foundryBusinessPoolText: document.getElementById("foundryBusinessPoolText"),
  slsiBusinessPoolText: document.getElementById("slsiBusinessPoolText"),
  commonShareText: document.getElementById("commonShareText"),
  divisionComparison: document.getElementById("divisionComparison"),
  fundSummary: document.getElementById("fundSummary"),
  distributionWarning: document.getElementById("distributionWarning"),
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

function safeDivide(numerator, denominator) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return 0;
  return numerator / denominator;
}

function normalizeZero(value) {
  return Math.abs(value) < 0.5 ? 0 : value;
}

function formatEok(value) {
  if (!Number.isFinite(value)) return "-";
  return `${(normalizeZero(value) / EOK_WON).toLocaleString("ko-KR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}억원`;
}

function formatJo(value) {
  if (!Number.isFinite(value)) return "-";
  return `${(normalizeZero(value) / JO_WON).toLocaleString("ko-KR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}조원`;
}

function formatManwonFromWon(value) {
  if (!Number.isFinite(value)) return "-";
  return `${Math.round(value / MAN_WON).toLocaleString("ko-KR")}만원`;
}

function formatWon(value) {
  if (!Number.isFinite(value)) return "-";
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function formatShares(value) {
  if (!Number.isFinite(value)) return "-";
  return `${Math.max(0, Math.floor(value)).toLocaleString("ko-KR")}주`;
}

function formatInteger(value) {
  return Math.round(value).toLocaleString("ko-KR");
}

function formatPercent(value, digits = 1) {
  if (!Number.isFinite(value)) return "-";
  return `${value.toLocaleString("ko-KR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
}

function getDivisionName(id) {
  return DIVISIONS[id]?.name ?? id;
}

function sanitizeDateString(value, fallback) {
  if (typeof value !== "string") return fallback;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;
}

function calculateNationalIncomeTax(taxableIncome) {
  const taxable = Math.max(0, taxableIncome);
  const bracket = TAX_BRACKETS.find((item) => taxable <= item.max) ?? TAX_BRACKETS[TAX_BRACKETS.length - 1];
  return Math.max(0, taxable * bracket.rate - bracket.deduction);
}

function calculateTaxBundle(taxableIncome) {
  const incomeTax = calculateNationalIncomeTax(taxableIncome);
  const localIncomeTax = incomeTax * LOCAL_INCOME_TAX_RATE;
  return {
    incomeTax,
    localIncomeTax,
    totalTax: incomeTax + localIncomeTax,
  };
}

function calculateIncrementalTax(baseTaxableIncome, payment) {
  if (payment <= 0) {
    return {
      incomeTax: 0,
      localIncomeTax: 0,
      totalTax: 0,
      netPayment: payment,
      effectiveRate: 0,
    };
  }

  const before = calculateTaxBundle(baseTaxableIncome);
  const after = calculateTaxBundle(baseTaxableIncome + payment);
  const incomeTax = Math.max(0, after.incomeTax - before.incomeTax);
  const localIncomeTax = Math.max(0, after.localIncomeTax - before.localIncomeTax);
  const totalTax = incomeTax + localIncomeTax;

  return {
    incomeTax,
    localIncomeTax,
    totalTax,
    netPayment: payment - totalTax,
    effectiveRate: payment > 0 ? (totalTax / payment) * 100 : 0,
  };
}

function buildStockGrant(netOpi2Payment, vwapPrice, closePrice) {
  const stockBaseAmount = Math.max(0, netOpi2Payment);
  const totalShares = vwapPrice > 0 ? Math.floor(stockBaseAmount / vwapPrice) : 0;
  const baseThird = Math.floor(totalShares / 3);
  const remainder = totalShares % 3;
  const immediateShares = baseThird;
  const oneYearShares = baseThird;
  const twoYearShares = baseThird + remainder;
  const closeValue = totalShares * Math.max(0, closePrice);
  const residualCash = stockBaseAmount - totalShares * vwapPrice;

  return {
    stockBaseAmount,
    totalShares,
    immediateShares,
    oneYearShares,
    twoYearShares,
    closeValue,
    residualCash,
    vesting: [
      { label: "즉시", suffix: "", shares: immediateShares, value: immediateShares * Math.max(0, closePrice) },
      { label: "1년", suffix: "↓", shares: oneYearShares, value: oneYearShares * Math.max(0, closePrice) },
      { label: "2년", suffix: "↓", shares: twoYearShares, value: twoYearShares * Math.max(0, closePrice) },
    ],
  };
}

function buildReceiptForDivision(divisionResult, salary, stockVwapPriceWon, stockClosePriceWon) {
  const opi1Tax = calculateIncrementalTax(salary, divisionResult.opi1);
  const opi2Tax = calculateIncrementalTax(salary + Math.max(0, divisionResult.opi1), divisionResult.opi2Total);
  const totalBonusTax = {
    incomeTax: opi1Tax.incomeTax + opi2Tax.incomeTax,
    localIncomeTax: opi1Tax.localIncomeTax + opi2Tax.localIncomeTax,
    totalTax: opi1Tax.totalTax + opi2Tax.totalTax,
    netPayment: divisionResult.totalBonus - opi1Tax.totalTax - opi2Tax.totalTax,
    effectiveRate: divisionResult.totalBonus > 0
      ? ((opi1Tax.totalTax + opi2Tax.totalTax) / divisionResult.totalBonus) * 100
      : 0,
  };
  const stockGrant = buildStockGrant(opi2Tax.netPayment, stockVwapPriceWon, stockClosePriceWon);
  const finalReceipt = Math.max(0, opi1Tax.netPayment) + stockGrant.closeValue;

  return {
    opi1Tax,
    opi2Tax,
    totalBonusTax,
    stockGrant,
    finalReceipt,
  };
}

function calculate(input) {
  const salary = input.userSalaryManwon * MAN_WON;
  const averageSalary = input.averageSalaryManwon * MAN_WON;
  const salaryRatio = averageSalary > 0 ? salary / averageSalary : 0;
  const opi1Rate = input.opi1RatePercent / 100;
  const opi2FundingRate = input.opi2FundingRatePercent / 100;
  const sectorRate = input.sectorDistributionRatePercent / 100;
  const businessRate = input.businessDistributionRatePercent / 100;
  const commonPayoutRate = input.commonPayoutRatePercent / 100;

  const headcounts = {
    memory: input.memoryHeadcount,
    foundry: input.foundryHeadcount,
    slsi: input.slsiHeadcount,
    common: input.commonHeadcount,
  };

  const profits = {
    memory: input.memoryProfitJo * JO_WON,
    foundry: input.foundryProfitJo * JO_WON,
    slsi: input.slsiProfitJo * JO_WON,
  };

  const totalBusinessProfit = BUSINESS_DIVISION_IDS.reduce((sum, id) => sum + profits[id], 0);
  const sectorPool = totalBusinessProfit * opi2FundingRate * sectorRate;
  const businessPools = Object.fromEntries(
    BUSINESS_DIVISION_IDS.map((id) => [id, Math.max(profits[id], 0) * opi2FundingRate * businessRate]),
  );

  const commonWeightedHeadcount = headcounts.common * commonPayoutRate;
  const sectorWeightedHeadcount = headcounts.memory + headcounts.foundry + headcounts.slsi + commonWeightedHeadcount;
  const sectorBasePayout = safeDivide(sectorPool, sectorWeightedHeadcount);

  const businessWeightedHeadcounts = Object.fromEntries(
    BUSINESS_DIVISION_IDS.map((id) => [
      id,
      headcounts[id] + (input.commonBusinessPoolSource === id ? commonWeightedHeadcount : 0),
    ]),
  );

  const businessBasePayouts = Object.fromEntries(
    BUSINESS_DIVISION_IDS.map((id) => [id, safeDivide(businessPools[id], businessWeightedHeadcounts[id])]),
  );

  const opi1 = salary * opi1Rate;
  const averageResults = {};

  BUSINESS_DIVISION_IDS.forEach((id) => {
    averageResults[id] = {
      divisionId: id,
      divisionName: getDivisionName(id),
      opi1,
      opi2Sector: sectorBasePayout * salaryRatio,
      opi2Business: businessBasePayouts[id] * salaryRatio,
    };
  });

  averageResults.common = {
    divisionId: "common",
    divisionName: getDivisionName("common"),
    opi1,
    opi2Sector: sectorBasePayout * commonPayoutRate * salaryRatio,
    opi2Business: businessBasePayouts[input.commonBusinessPoolSource] * commonPayoutRate * salaryRatio,
  };

  const divisionResults = Object.fromEntries(
    RESULT_DIVISION_IDS.map((id) => {
      const item = averageResults[id];
      const opi2Total = item.opi2Sector + item.opi2Business;
      const totalBonus = item.opi1 + opi2Total;
      return [
        id,
        {
          ...item,
          opi2Total,
          totalBonus,
        },
      ];
    }),
  );

  const receipts = Object.fromEntries(
    RESULT_DIVISION_IDS.map((id) => [
      id,
      buildReceiptForDivision(divisionResults[id], salary, input.stockVwapPriceWon, input.stockClosePriceWon),
    ]),
  );

  const selected = divisionResults[input.userDivision];
  const selectedReceipt = receipts[input.userDivision];

  return {
    salary,
    averageSalary,
    salaryRatio,
    rates: {
      opi1Rate,
      opi2FundingRate,
      sectorRate,
      businessRate,
      commonPayoutRate,
    },
    headcounts,
    profits,
    totalBusinessProfit,
    sectorPool,
    businessPools,
    commonWeightedHeadcount,
    sectorWeightedHeadcount,
    sectorBasePayout,
    businessWeightedHeadcounts,
    businessBasePayouts,
    divisionResults,
    receipts,
    selected,
    selectedReceipt,
    stockBasis: {
      stockVwapPriceWon: input.stockVwapPriceWon,
      stockVwapDate: input.stockVwapDate,
      stockClosePriceWon: input.stockClosePriceWon,
      stockCloseDate: input.stockCloseDate,
    },
  };
}

function stateToParams(inputState) {
  const params = new URLSearchParams();
  const keyMap = {
    userSalaryManwon: "s",
    userDivision: "d",
    averageSalaryManwon: "avg",
    opi1RatePercent: "o1",
    opi2FundingRatePercent: "o2",
    sectorDistributionRatePercent: "sr",
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
    stockVwapPriceWon: "svp",
    stockVwapDate: "svd",
    stockClosePriceWon: "scp",
    stockCloseDate: "scd",
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
    sr: "sectorDistributionRatePercent",
    eq: "sectorDistributionRatePercent",
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
    svp: "stockVwapPriceWon",
    svd: "stockVwapDate",
    scp: "stockClosePriceWon",
    scd: "stockCloseDate",
    vp: "stockVwapPriceWon",
    vd: "stockVwapDate",
    cp: "stockClosePriceWon",
    cd: "stockCloseDate",
  };

  const parsed = { ...DEFAULT_STATE };
  Object.entries(reverseMap).forEach(([paramKey, stateKey]) => {
    if (!params.has(paramKey)) return;
    const value = params.get(paramKey);
    parsed[stateKey] = STRING_STATE_KEYS.includes(stateKey) ? value : toNumber(value, DEFAULT_STATE[stateKey]);
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
  const migrated = { ...inputState };
  if (migrated.equalDistributionRatePercent !== undefined && migrated.sectorDistributionRatePercent === undefined) {
    migrated.sectorDistributionRatePercent = migrated.equalDistributionRatePercent;
  }
  if (migrated.vwapPriceWon !== undefined && migrated.stockVwapPriceWon === undefined) {
    migrated.stockVwapPriceWon = migrated.vwapPriceWon;
  }
  if (migrated.vwapReferenceDate !== undefined && migrated.stockVwapDate === undefined) {
    migrated.stockVwapDate = migrated.vwapReferenceDate;
  }

  const sanitized = { ...DEFAULT_STATE, ...migrated };

  sanitized.userSalaryManwon = Math.max(0, toNumber(sanitized.userSalaryManwon, DEFAULT_STATE.userSalaryManwon));
  sanitized.averageSalaryManwon = Math.max(1, toNumber(sanitized.averageSalaryManwon, DEFAULT_STATE.averageSalaryManwon));
  sanitized.opi1RatePercent = Math.max(0, toNumber(sanitized.opi1RatePercent, DEFAULT_STATE.opi1RatePercent));
  sanitized.opi2FundingRatePercent = Math.max(0, toNumber(sanitized.opi2FundingRatePercent, DEFAULT_STATE.opi2FundingRatePercent));
  sanitized.sectorDistributionRatePercent = clamp(
    toNumber(sanitized.sectorDistributionRatePercent, DEFAULT_STATE.sectorDistributionRatePercent),
    0,
    100,
  );
  sanitized.businessDistributionRatePercent = clamp(
    toNumber(sanitized.businessDistributionRatePercent, 100 - sanitized.sectorDistributionRatePercent),
    0,
    100,
  );
  sanitized.commonPayoutRatePercent = clamp(
    toNumber(sanitized.commonPayoutRatePercent, DEFAULT_STATE.commonPayoutRatePercent),
    0,
    100,
  );

  ["memoryProfitJo", "foundryProfitJo", "slsiProfitJo"].forEach((key) => {
    sanitized[key] = toNumber(sanitized[key], DEFAULT_STATE[key]);
  });

  ["memoryHeadcount", "foundryHeadcount", "slsiHeadcount", "commonHeadcount"].forEach((key) => {
    sanitized[key] = Math.max(0, toNumber(sanitized[key], DEFAULT_STATE[key]));
  });

  sanitized.stockVwapPriceWon = Math.max(1, toNumber(sanitized.stockVwapPriceWon, DEFAULT_STATE.stockVwapPriceWon));
  sanitized.stockVwapDate = sanitizeDateString(sanitized.stockVwapDate, DEFAULT_STATE.stockVwapDate);
  sanitized.stockClosePriceWon = Math.max(0, toNumber(sanitized.stockClosePriceWon, DEFAULT_STATE.stockClosePriceWon));
  sanitized.stockCloseDate = sanitizeDateString(sanitized.stockCloseDate, DEFAULT_STATE.stockCloseDate);

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
    // 로컬 저장이 막힌 환경에서는 무시합니다.
  }
}

function syncInputs() {
  Object.entries(elements).forEach(([key, element]) => {
    if (!element || !(key in state)) return;
    element.value = state[key];
  });
}

function updateStateFromInput(event) {
  const key = event.target.id;
  if (!(key in DEFAULT_STATE)) return;

  const next = { ...state };
  next[key] = STRING_STATE_KEYS.includes(key) ? event.target.value : toNumber(event.target.value, DEFAULT_STATE[key]);

  if (key === "sectorDistributionRatePercent") {
    next.sectorDistributionRatePercent = clamp(next.sectorDistributionRatePercent, 0, 100);
    next.businessDistributionRatePercent = 100 - next.sectorDistributionRatePercent;
    if (elements.businessDistributionRatePercent) elements.businessDistributionRatePercent.value = next.businessDistributionRatePercent;
  }

  if (key === "businessDistributionRatePercent") {
    next.businessDistributionRatePercent = clamp(next.businessDistributionRatePercent, 0, 100);
    next.sectorDistributionRatePercent = 100 - next.businessDistributionRatePercent;
    if (elements.sectorDistributionRatePercent) elements.sectorDistributionRatePercent.value = next.sectorDistributionRatePercent;
  }

  state = sanitizeState(next);
  saveState();
  render();
}

function moneyPairHtml(gross, net) {
  return `
    <div class="money-pair">
      <div><span>세전</span><strong>${formatEok(gross)}</strong></div>
      <div><span>세후</span><strong>${formatEok(net)}</strong></div>
    </div>
  `;
}

function opi2PaymentHtml(gross, net, grant, stockBasis) {
  const toggleLabel = stockDetailsExpanded ? "지급 주식수 접기" : "지급 주식수 보기";
  const arrow = stockDetailsExpanded ? "▲" : "▼";
  return `
    <div class="money-pair opi2-stock-money-pair">
      <div><span>세전</span><strong>${formatEok(gross)}</strong></div>
      <div><span>세후</span><strong>${formatEok(net)}</strong></div>
      <div class="stock-evaluation-embedded">
        <span>주식 평가액</span>
        <strong>${formatEok(grant.closeValue)}</strong>
        <em>최근 종가 ${formatWon(stockBasis.stockClosePriceWon)} 기준</em>
        <button
          type="button"
          class="stock-toggle-button"
          data-stock-toggle
          aria-expanded="${stockDetailsExpanded ? "true" : "false"}"
          aria-controls="stockVestingPanel"
        >${toggleLabel} <span aria-hidden="true">${arrow}</span></button>
      </div>
    </div>
  `;
}

function stockVestingHtml(grant, stockBasis) {
  return `
    <div id="stockVestingPanel" class="stock-vesting-panel compact-stock-panel ${stockDetailsExpanded ? "" : "is-hidden"}">
      <div class="stock-total-row">
        <span>총 주식 수</span>
        <strong>${formatShares(grant.totalShares)}</strong>
        <em>VWAP ${formatWon(stockBasis.stockVwapPriceWon)} 기준</em>
      </div>
      <table class="stock-lock-table" aria-label="매도제한 기간별 주식 수">
        <caption>매도제한 기간별 주식 수</caption>
        <tbody>
          <tr>
            ${grant.vesting.map((item) => `
              <td>
                <span>${item.label}${item.suffix}</span>
                <strong>${formatShares(item.shares)}</strong>
              </td>
            `).join("")}
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

function finalReceiptHtml(result) {
  const receipt = result.selectedReceipt;
  const opi1Cash = Math.max(0, receipt.opi1Tax.netPayment);
  const stockGrant = receipt.stockGrant;
  return `
    <div class="money-pair final-receipt-pair">
      <div><span>현금 OPI1</span><strong>${formatEok(opi1Cash)}</strong></div>
      <div><span>자사주 OPI2</span><strong>${formatEok(stockGrant.closeValue)}</strong></div>
      <div class="final-receipt-total"><span>최종 수령액</span><strong>${formatEok(receipt.finalReceipt)}</strong></div>
    </div>
  `;
}

function renderSummary(result) {
  if (!elements.summaryCards) return;
  const selected = result.selected;
  const receipt = result.selectedReceipt;
  const salary = result.salary;

  elements.selectedDivisionTitle.textContent = `${selected.divisionName} 기준 예상 수령액`;
  elements.salaryRatioText.textContent = `평균연봉 대비 ${result.salaryRatio.toFixed(2)}배`;

  const cardData = [
    {
      label: "연봉",
      html: `<div class="single-money">${formatManwonFromWon(salary)}</div>`,
      sub: "세금 계산의 기준 소득으로 사용",
    },
    {
      label: "OPI1 현금",
      ratio: formatPercent((selected.opi1 / Math.max(salary, 1)) * 100),
      html: moneyPairHtml(selected.opi1, receipt.opi1Tax.netPayment),
      sub: `세금 ${formatEok(receipt.opi1Tax.totalTax)} · 실효세율 ${formatPercent(receipt.opi1Tax.effectiveRate)}`,
    },
    {
      label: "OPI2 자사주",
      ratio: formatPercent((selected.opi2Total / Math.max(salary, 1)) * 100),
      html: `
        ${opi2PaymentHtml(selected.opi2Total, receipt.opi2Tax.netPayment, receipt.stockGrant, result.stockBasis)}
        ${stockVestingHtml(receipt.stockGrant, result.stockBasis)}
      `,
      sub: `세금 ${formatEok(receipt.opi2Tax.totalTax)} · 실효세율 ${formatPercent(receipt.opi2Tax.effectiveRate)}`,
    },
    {
      label: "총 성과급",
      ratio: formatPercent((selected.totalBonus / Math.max(salary, 1)) * 100),
      html: moneyPairHtml(selected.totalBonus, receipt.totalBonusTax.netPayment),
      sub: `세금 ${formatEok(receipt.totalBonusTax.totalTax)} · 실효세율 ${formatPercent(receipt.totalBonusTax.effectiveRate)}`,
    },
    {
      label: "최종 수령액",
      html: finalReceiptHtml(result),
      sub: `현금 ${formatEok(Math.max(0, receipt.opi1Tax.netPayment))} + 주식 ${formatEok(receipt.stockGrant.closeValue)}(종가기준)`,
      primary: true,
    },
  ];

  elements.summaryCards.innerHTML = cardData
    .map((card) => `
      <article class="summary-card ${card.primary ? "primary-card" : ""}">
        <div class="card-head">
          <span class="label">${card.label}</span>
          ${card.ratio ? `<span class="ratio-chip">연봉 대비 ${card.ratio}</span>` : ""}
        </div>
        <div class="value-block">${card.html}</div>
        <p class="sub">${card.sub}</p>
      </article>
    `)
    .join("");

  if (elements.taxNote) {
    elements.taxNote.innerHTML = `
      <strong>세후·자사주 계산 기준:</strong>
      OPI1은 세후 현금으로, OPI2는 <em>세후 OPI2 ÷ VWAP 기준가</em>를 FLOOR 처리해 지급 자사주 수를 추정했습니다.
      OPI2 자사주는 1/3 즉시 매도 가능, 1/3 1년 뒤, 1/3 2년 뒤 매도 가능으로 나누며,
      나머지 주식은 2년 뒤 매도 가능 구간에 포함했습니다. 최종 수령액은 OPI1 세후 현금과 최근 삼성전자 종가 기준 OPI2 자사주 평가액의 합계입니다.
      세후액은 근로소득공제·세액공제·4대보험·비과세 항목을 반영하지 않은 간이 계산입니다.
    `;
  }
}

function renderAssumptions(result) {
  const fundingRateLabel = formatPercent(result.rates.opi2FundingRate * 100, 1);
  const sectorRateLabel = formatPercent(result.rates.sectorRate * 100, 1);
  const businessRateLabel = formatPercent(result.rates.businessRate * 100, 1);
  const commonRateLabel = formatPercent(result.rates.commonPayoutRate * 100, 1);
  const sourceName = getDivisionName(state.commonBusinessPoolSource);

  if (elements.sectorPoolText) {
    elements.sectorPoolText.innerHTML = `
      <strong>${formatJo(result.sectorPool)}</strong>
      <small>사업부 영업이익 합계 ${formatJo(result.totalBusinessProfit)} × ${fundingRateLabel} × ${sectorRateLabel}</small>
    `;
  }

  BUSINESS_DIVISION_IDS.forEach((id) => {
    const poolElement = elements[`${id}BusinessPoolText`];
    if (!poolElement) return;
    const reflectedProfit = Math.max(result.profits[id], 0);
    poolElement.innerHTML = `
      <strong>${formatJo(result.businessPools[id])}</strong>
      <small>반영 영업이익 ${formatJo(reflectedProfit)} × ${fundingRateLabel} × ${businessRateLabel}</small>
    `;
  });

  if (elements.commonShareText) {
    elements.commonShareText.innerHTML = `
      <strong>${sourceName}</strong>
      <small>공통 인원 ${formatInteger(result.headcounts.common)}명 × 가중치 ${commonRateLabel}</small>
    `;
  }

  const totalDistribution = state.sectorDistributionRatePercent + state.businessDistributionRatePercent;
  if (!elements.distributionWarning) return;
  if (Math.abs(totalDistribution - 100) > 0.001) {
    elements.distributionWarning.hidden = false;
    elements.distributionWarning.textContent = `OPI2 부문 배율과 사업부 배율의 합계가 ${formatPercent(totalDistribution)}입니다. 일반적으로 100%가 되도록 맞추는 것을 권장합니다.`;
  } else {
    elements.distributionWarning.hidden = true;
    elements.distributionWarning.textContent = "";
  }
}

function metricRowHtml(metric, maxAbsValue, salary) {
  const width = Math.min(100, (Math.abs(metric.value) / maxAbsValue) * 100);
  const percent = (metric.value / Math.max(salary, 1)) * 100;
  const negativeClass = metric.value < 0 ? " negative" : "";
  return `
    <div class="metric-row ${metric.emphasis ? "emphasis" : ""}${metric.final ? " final" : ""}${negativeClass}">
      <div class="metric-line">
        <span>${metric.label}</span>
        <strong>${formatEok(metric.value)}</strong>
        <em>${metric.percentText ?? formatPercent(percent)}</em>
      </div>
      ${metric.note ? `<p class="metric-note">${metric.note}</p>` : ""}
      <div class="bar-track"><i style="--w: ${width}%"></i></div>
    </div>
  `;
}

function renderComparison(result) {
  if (!elements.divisionComparison) return;
  const salary = result.salary;
  const allMetrics = RESULT_DIVISION_IDS.flatMap((id) => {
    const item = result.divisionResults[id];
    const receipt = result.receipts[id];
    return [item.opi1, item.opi2Sector, item.opi2Business, item.opi2Total, item.totalBonus, receipt.finalReceipt];
  });
  const maxAbsValue = Math.max(...allMetrics.map((value) => Math.abs(value)), 1);

  elements.divisionComparison.innerHTML = RESULT_DIVISION_IDS.map((id) => {
    const item = result.divisionResults[id];
    const receipt = result.receipts[id];
    const selectedClass = id === state.userDivision ? " selected" : "";
    const metrics = [
      { label: "OPI1", value: item.opi1 },
      { label: "OPI2 부문", value: item.opi2Sector },
      { label: "OPI2 사업부", value: item.opi2Business },
      { label: "OPI2 합계", value: item.opi2Total },
      { label: "총 성과급", value: item.totalBonus, emphasis: true },
      {
        label: "최종 수령액",
        value: receipt.finalReceipt,
        final: true,
        percentText: `자사주 ${formatShares(receipt.stockGrant.totalShares)}`,
        note: `현금 ${formatEok(Math.max(0, receipt.opi1Tax.netPayment))} + 주식 ${formatEok(receipt.stockGrant.closeValue)}(종가기준)`,
      },
    ];

    return `
      <article class="division-card${selectedClass}">
        <div class="division-card-title">
          <h3>${item.divisionName}</h3>
          ${id === state.userDivision ? `<span>내 사업부</span>` : ""}
        </div>
        <div class="metric-list">
          ${metrics.map((metric) => metricRowHtml(metric, maxAbsValue, salary)).join("")}
        </div>
      </article>
    `;
  }).join("");
}

function renderFundSummary(result) {
  if (!elements.fundSummary) return;

  const sourceName = getDivisionName(state.commonBusinessPoolSource);
  const selectedBusinessWeightedHeadcount = result.businessWeightedHeadcounts[state.commonBusinessPoolSource] ?? 0;
  const businessPoolTotal = BUSINESS_DIVISION_IDS.reduce((sum, id) => sum + result.businessPools[id], 0);
  const totalOpi2Pool = result.sectorPool + businessPoolTotal;
  const estimatedPayout = result.sectorBasePayout * result.sectorWeightedHeadcount + BUSINESS_DIVISION_IDS.reduce(
    (sum, id) => sum + result.businessBasePayouts[id] * result.businessWeightedHeadcounts[id],
    0,
  );
  const fundGap = totalOpi2Pool - estimatedPayout;

  const stats = [
    ["전체 영업이익 합계", formatJo(result.totalBusinessProfit)],
    ["OPI2 부문 재원", formatJo(result.sectorPool)],
    ["OPI2 사업부 재원 합계", formatJo(businessPoolTotal)],
    ["전체 OPI2 재원", formatJo(totalOpi2Pool)],
    ["공통 가중인원", `${formatInteger(result.commonWeightedHeadcount)}명`],
    ["부문 가중인원", `${formatInteger(result.sectorWeightedHeadcount)}명`],
    [`${sourceName} 사업부 가중인원`, `${formatInteger(selectedBusinessWeightedHeadcount)}명`],
    ["평균연봉 기준 지급액 검증", formatJo(estimatedPayout)],
    ["재원 잔액", formatJo(Math.abs(fundGap) < 1 ? 0 : fundGap)],
  ];

  elements.fundSummary.innerHTML = stats.map(([label, value]) => `
    <div class="stat-item">
      <div class="stat-label">${label}</div>
      <div class="stat-value">${value}</div>
    </div>
  `).join("");
}

function renderStockStatus(result) {
  if (!elements.stockFetchStatus) return;
  elements.stockFetchStatus.dataset.type = elements.stockFetchStatus.dataset.type || "info";
  elements.stockFetchStatus.innerHTML = `현재 적용값 · VWAP ${formatWon(result.stockBasis.stockVwapPriceWon)}${result.stockBasis.stockVwapDate ? ` (${result.stockBasis.stockVwapDate})` : ""} · 종가 ${formatWon(result.stockBasis.stockClosePriceWon)}${result.stockBasis.stockCloseDate ? ` (${result.stockBasis.stockCloseDate})` : ""}`;
}

function parseCommaNumber(value) {
  if (typeof value !== "string") return NaN;
  const cleaned = value.replace(/,/g, "").replace(/[^0-9.-]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : NaN;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 7000) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

async function fetchTextWithFallback(url) {
  try {
    const response = await fetchWithTimeout(url, { cache: "no-store" });
    if (response.ok) return await response.text();
  } catch {
    // CORS 또는 네트워크 제한이 있으면 공개 프록시를 시도합니다.
  }

  const proxyUrls = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  ];

  for (const proxyUrl of proxyUrls) {
    try {
      const proxyResponse = await fetchWithTimeout(proxyUrl, { cache: "no-store" });
      if (proxyResponse.ok) return await proxyResponse.text();
    } catch {
      // 다음 프록시를 시도합니다.
    }
  }

  throw new Error("외부 데이터를 불러오지 못했습니다.");
}

async function fetchJsonWithFallback(url) {
  try {
    const response = await fetchWithTimeout(url, { cache: "no-store" });
    if (response.ok) return await response.json();
  } catch {
    // CORS 또는 네트워크 제한이 있으면 텍스트 프록시를 시도합니다.
  }

  const text = await fetchTextWithFallback(url);
  return JSON.parse(text);
}

function extractHistoryRowFromTable(table) {
  const rows = Array.from(table.querySelectorAll("tbody tr, tr"));
  for (const row of rows) {
    const cells = Array.from(row.querySelectorAll("th,td")).map((cell) => cell.textContent.trim()).filter(Boolean);
    if (cells.length < 2) continue;
    const dateCell = cells.find((cell) => /\d{4}-\d{2}-\d{2}/.test(cell));
    if (!dateCell) continue;
    const date = dateCell.match(/\d{4}-\d{2}-\d{2}/)[0];
    const dateIndex = cells.indexOf(dateCell);
    const priceCandidate = cells[dateIndex + 1] ?? cells.find((cell, index) => index !== dateIndex && /[0-9][0-9,]*/.test(cell));
    const priceText = priceCandidate?.match(/[0-9][0-9,]*/)?.[0] ?? "";
    const price = parseCommaNumber(priceText);
    if (Number.isFinite(price) && price > 0) {
      return { stockVwapPriceWon: Math.round(price), stockVwapDate: date };
    }
  }
  return null;
}

function parseSampsungVwap(htmlText) {
  if (typeof DOMParser !== "undefined") {
    const doc = new DOMParser().parseFromString(htmlText, "text/html");
    const historyHeading = Array.from(doc.querySelectorAll("h2")).find(
      (heading) => heading.textContent.trim().toLowerCase() === "history",
    );

    if (historyHeading) {
      let sibling = historyHeading.nextElementSibling;
      while (sibling && sibling.tagName?.toLowerCase() !== "table") {
        sibling = sibling.nextElementSibling;
      }
      if (sibling) {
        const parsed = extractHistoryRowFromTable(sibling);
        if (parsed) return parsed;
      }
    }

    const fallbackTable = Array.from(doc.querySelectorAll("table")).map(extractHistoryRowFromTable).find(Boolean);
    if (fallbackTable) return fallbackTable;
  }

  const historyIndex = htmlText.toLowerCase().indexOf("history");
  const historyText = historyIndex >= 0 ? htmlText.slice(historyIndex) : htmlText;
  const rowMatch = historyText.match(/(\d{4}-\d{2}-\d{2})[\s,|]+([0-9][0-9,]*)/);
  if (rowMatch) {
    const stockVwapPriceWon = parseCommaNumber(rowMatch[2]);
    if (Number.isFinite(stockVwapPriceWon) && stockVwapPriceWon > 0) {
      return { stockVwapPriceWon: Math.round(stockVwapPriceWon), stockVwapDate: rowMatch[1] };
    }
  }

  const slashMatch = htmlText.match(/([0-9][0-9,]*)\s*\/\s*([0-9][0-9,]*)\s*\(/);
  const stockVwapPriceWon = slashMatch ? parseCommaNumber(slashMatch[2]) : NaN;
  const dateMatch = htmlText.match(/Base price at\s*([0-9]{4}-[0-9]{2}-[0-9]{2})?\s*\/\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/i);
  const stockVwapDate = dateMatch?.[1] || dateMatch?.[2] || state.stockVwapDate;

  if (!Number.isFinite(stockVwapPriceWon) || stockVwapPriceWon <= 0) {
    throw new Error("VWAP 기준가를 찾지 못했습니다.");
  }

  return { stockVwapPriceWon: Math.round(stockVwapPriceWon), stockVwapDate };
}

async function fetchSampsungVwap() {
  const text = await fetchTextWithFallback(SAMPSUNG_URL);
  return parseSampsungVwap(text);
}

async function fetchSamsungClose() {
  const json = await fetchJsonWithFallback(YAHOO_CHART_URL);
  const chart = json?.chart?.result?.[0];
  const timestamps = chart?.timestamp ?? [];
  const closes = chart?.indicators?.quote?.[0]?.close ?? [];

  for (let i = closes.length - 1; i >= 0; i -= 1) {
    const close = closes[i];
    const timestamp = timestamps[i];
    if (!Number.isFinite(close) || !Number.isFinite(timestamp)) continue;
    const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
    return { stockClosePriceWon: Math.round(close), stockCloseDate: date };
  }

  throw new Error("최근 종가를 찾지 못했습니다.");
}

async function refreshStockData({ silent = false } = {}) {
  if (!elements.stockFetchStatus) return;
  if (!silent) {
    elements.stockFetchStatus.dataset.type = "";
    elements.stockFetchStatus.textContent = "VWAP 기준가와 최근 종가를 불러오는 중입니다.";
  }

  const next = { ...state };
  const messages = [];
  const failures = [];

  try {
    Object.assign(next, await fetchSampsungVwap());
    messages.push("VWAP 기준가 업데이트");
  } catch {
    failures.push("VWAP 기준가");
  }

  try {
    Object.assign(next, await fetchSamsungClose());
    messages.push("최근 종가 업데이트");
  } catch {
    failures.push("최근 종가");
  }

  state = sanitizeState(next);
  syncInputs();
  saveState();
  render();

  if (messages.length) {
    elements.stockFetchStatus.dataset.type = failures.length ? "warn" : "success";
    elements.stockFetchStatus.textContent = failures.length
      ? `${messages.join(" · ")} 완료, ${failures.join(" · ")}는 직접 확인이 필요합니다. 현재 입력값을 함께 사용합니다.`
      : `${messages.join(" · ")} 완료 · VWAP ${formatWon(state.stockVwapPriceWon)}${state.stockVwapDate ? ` (${state.stockVwapDate})` : ""} · 종가 ${formatWon(state.stockClosePriceWon)}${state.stockCloseDate ? ` (${state.stockCloseDate})` : ""}`;
  } else {
    elements.stockFetchStatus.dataset.type = "warn";
    elements.stockFetchStatus.textContent = "외부 데이터를 불러오지 못했습니다. 기준가와 종가를 직접 입력해 주세요.";
  }

  if (!silent) showToast(elements.stockFetchStatus.textContent);
}

function render() {
  const result = calculate(state);
  renderAssumptions(result);
  renderSummary(result);
  renderComparison(result);
  renderFundSummary(result);
  renderStockStatus(result);
}

function showToast(message) {
  if (!elements.toast) return;
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    elements.toast.classList.remove("show");
  }, 2200);
}

function copyShareLink() {
  const url = `${window.location.origin}${window.location.pathname}?${stateToParams(state)}`;
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(url).then(
      () => showToast("현재 설정 링크를 복사했습니다."),
      () => fallbackCopy(url),
    );
  } else {
    fallbackCopy(url);
  }
}

function fallbackCopy(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand("copy");
    showToast("현재 설정 링크를 복사했습니다.");
  } catch {
    showToast("복사에 실패했습니다. 주소창의 URL을 직접 복사해 주세요.");
  } finally {
    document.body.removeChild(textarea);
  }
}

function resetState() {
  state = { ...DEFAULT_STATE };
  syncInputs();
  saveState();
  render();
  showToast("기본값으로 복원했습니다.");
  refreshStockData({ silent: true });
}

function bindEvents() {
  Object.entries(elements).forEach(([key, element]) => {
    if (!element || !(key in DEFAULT_STATE)) return;
    element.addEventListener("input", updateStateFromInput);
    element.addEventListener("change", updateStateFromInput);
  });

  elements.shareButton?.addEventListener("click", copyShareLink);
  elements.resetButton?.addEventListener("click", resetState);
  elements.refreshStockButton?.addEventListener("click", () => refreshStockData());
  elements.summaryCards?.addEventListener("click", (event) => {
    const toggle = event.target.closest("[data-stock-toggle]");
    if (!toggle) return;
    stockDetailsExpanded = !stockDetailsExpanded;
    render();
  });
}

function init() {
  state = loadState();
  syncInputs();
  bindEvents();
  render();
  if (elements.stockFetchStatus) {
    elements.stockFetchStatus.dataset.type = "info";
    elements.stockFetchStatus.textContent = `현재 입력값 · VWAP ${formatWon(state.stockVwapPriceWon)}${state.stockVwapDate ? ` (${state.stockVwapDate})` : ""} · 종가 ${formatWon(state.stockClosePriceWon)}${state.stockCloseDate ? ` (${state.stockCloseDate})` : ""}`;
  }
  window.setTimeout(() => refreshStockData({ silent: true }), 300);
}

init();
