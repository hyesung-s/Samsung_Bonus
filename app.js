(() => {
  "use strict";

  const DIVISIONS = {
    memory: { id: "memory", name: "메모리" },
    foundry: { id: "foundry", name: "파운드리" },
    slsi: { id: "slsi", name: "S.LSI" },
    common: { id: "common", name: "공통" },
  };

  const BUSINESS_DIVISION_IDS = ["memory", "foundry", "slsi"];
  const RESULT_DIVISION_IDS = ["memory", "foundry", "slsi", "common"];
  const JO_WON = 1_000_000_000_000;
  const EOK_WON = 100_000_000;
  const MAN_WON = 10_000;
  const LOCAL_INCOME_TAX_RATE = 0.1;
  const NATIONAL_PENSION_RATE = 0.0475;
  const HEALTH_INSURANCE_RATE = 0.03595;
  const LONG_TERM_CARE_RATE = 0.1314;
  const EMPLOYMENT_INSURANCE_RATE = 0.009;
  const STORAGE_KEY = "samsung-bonus-calculator-state-v25-2027-monthly-net";
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
    stockVwapPriceWon: 286149,
    stockVwapDate: "",
    stockClosePriceWon: 349000,
    stockCloseDate: "",
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

  const STATE_KEYS = Object.keys(DEFAULT_STATE);
  const STRING_STATE_KEYS = new Set(["userDivision", "commonBusinessPoolSource", "stockVwapDate", "stockCloseDate"]);
  let state = { ...DEFAULT_STATE };
  let stockDetailsExpanded = false;

  const $ = (id) => document.getElementById(id);

  const elements = {
    userSalaryManwon: $("userSalaryManwon"),
    userDivision: $("userDivision"),
    averageSalaryManwon: $("averageSalaryManwon"),
    opi1RatePercent: $("opi1RatePercent"),
    opi2FundingRatePercent: $("opi2FundingRatePercent"),
    sectorDistributionRatePercent: $("sectorDistributionRatePercent"),
    businessDistributionRatePercent: $("businessDistributionRatePercent"),
    commonPayoutRatePercent: $("commonPayoutRatePercent"),
    commonBusinessPoolSource: $("commonBusinessPoolSource"),
    memoryProfitJo: $("memoryProfitJo"),
    foundryProfitJo: $("foundryProfitJo"),
    slsiProfitJo: $("slsiProfitJo"),
    memoryHeadcount: $("memoryHeadcount"),
    foundryHeadcount: $("foundryHeadcount"),
    slsiHeadcount: $("slsiHeadcount"),
    commonHeadcount: $("commonHeadcount"),
    stockVwapPriceWon: $("stockVwapPriceWon"),
    stockVwapDate: $("stockVwapDate"),
    stockClosePriceWon: $("stockClosePriceWon"),
    stockCloseDate: $("stockCloseDate"),
    refreshStockButton: $("refreshStockButton"),
    stockFetchStatus: $("stockFetchStatus"),
    summaryCards: $("summaryCards"),
    taxNote: $("taxNote"),
    selectedDivisionTitle: $("selectedDivisionTitle"),
    salaryRatioText: $("salaryRatioText"),
    sectorPoolText: $("sectorPoolText"),
    memoryBusinessPoolText: $("memoryBusinessPoolText"),
    foundryBusinessPoolText: $("foundryBusinessPoolText"),
    slsiBusinessPoolText: $("slsiBusinessPoolText"),
    commonShareText: $("commonShareText"),
    divisionComparison: $("divisionComparison"),
    fundSummary: $("fundSummary"),
    distributionWarning: $("distributionWarning"),
    shareButton: $("shareButton"),
    resetButton: $("resetButton"),
    toast: $("toast"),
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
    return `${(normalizeZero(value) / EOK_WON).toLocaleString("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}억원`;
  }

  function formatJo(value) {
    if (!Number.isFinite(value)) return "-";
    return `${(normalizeZero(value) / JO_WON).toLocaleString("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}조원`;
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
    return `${value.toLocaleString("ko-KR", { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;
  }

  function getDivisionName(id) {
    return DIVISIONS[id]?.name ?? id;
  }

  function sanitizeDateString(value) {
    return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
  }

  function calculateNationalIncomeTax(taxableIncome) {
    const taxable = Math.max(0, taxableIncome);
    const bracket = TAX_BRACKETS.find((item) => taxable <= item.max) ?? TAX_BRACKETS[TAX_BRACKETS.length - 1];
    return Math.max(0, taxable * bracket.rate - bracket.deduction);
  }

  function calculateTaxBundle(taxableIncome) {
    const incomeTax = calculateNationalIncomeTax(taxableIncome);
    const localIncomeTax = incomeTax * LOCAL_INCOME_TAX_RATE;
    return { incomeTax, localIncomeTax, totalTax: incomeTax + localIncomeTax };
  }

  function calculateIncrementalTax(baseTaxableIncome, payment) {
    if (!Number.isFinite(payment) || payment <= 0) {
      return { incomeTax: 0, localIncomeTax: 0, totalTax: 0, netPayment: payment || 0, effectiveRate: 0 };
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
      effectiveRate: (totalTax / payment) * 100,
    };
  }

  function calculateNextYearMonthlyTakeHome(annualSalary, priorYearTotalIncome) {
    const salaryIncome = Math.max(0, annualSalary || 0);
    const insuranceBasisIncome = Math.max(0, priorYearTotalIncome || 0);
    const salaryTax = calculateTaxBundle(salaryIncome);
    const healthInsuranceAnnual = insuranceBasisIncome * HEALTH_INSURANCE_RATE;
    const longTermCareAnnual = healthInsuranceAnnual * LONG_TERM_CARE_RATE;
    const nationalPensionAnnual = insuranceBasisIncome * NATIONAL_PENSION_RATE;
    const employmentInsuranceAnnual = insuranceBasisIncome * EMPLOYMENT_INSURANCE_RATE;
    const totalDeductions =
      salaryTax.incomeTax +
      salaryTax.localIncomeTax +
      healthInsuranceAnnual +
      longTermCareAnnual +
      nationalPensionAnnual +
      employmentInsuranceAnnual;
    const annualNet = Math.max(0, salaryIncome - totalDeductions);
    return {
      annualGross: salaryIncome,
      salaryIncome,
      insuranceBasisIncome,
      earnedIncomeTax: salaryTax.incomeTax,
      localIncomeTax: salaryTax.localIncomeTax,
      healthInsuranceAnnual,
      longTermCareAnnual,
      nationalPensionAnnual,
      employmentInsuranceAnnual,
      totalDeductions,
      monthlyDeductions: totalDeductions / 12,
      annualNet,
      monthlyNet: annualNet / 12,
    };
  }

  function buildStockGrant(netOpi2Payment, vwapPrice, closePrice) {
    const stockBaseAmount = Math.max(0, netOpi2Payment);
    const cleanVwap = Math.max(1, vwapPrice || 0);
    const cleanClose = Math.max(0, closePrice || 0);
    const totalShares = Math.floor(stockBaseAmount / cleanVwap);
    const baseThird = Math.floor(totalShares / 3);
    const remainder = totalShares % 3;
    const immediateShares = baseThird;
    const oneYearShares = baseThird;
    const twoYearShares = baseThird + remainder;
    const closeValue = totalShares * cleanClose;
    return {
      stockBaseAmount,
      totalShares,
      immediateShares,
      oneYearShares,
      twoYearShares,
      closeValue,
      residualCash: stockBaseAmount - totalShares * cleanVwap,
      vesting: [
        { label: "즉시", shares: immediateShares, value: immediateShares * cleanClose },
        { label: "1년↓", shares: oneYearShares, value: oneYearShares * cleanClose },
        { label: "2년↓", shares: twoYearShares, value: twoYearShares * cleanClose },
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
      effectiveRate: divisionResult.totalBonus > 0 ? ((opi1Tax.totalTax + opi2Tax.totalTax) / divisionResult.totalBonus) * 100 : 0,
    };
    const monthlyTakeHome = calculateNextYearMonthlyTakeHome(salary, salary + divisionResult.totalBonus);
    const stockGrant = buildStockGrant(opi2Tax.netPayment, stockVwapPriceWon, stockClosePriceWon);
    const finalReceipt = Math.max(0, opi1Tax.netPayment) + stockGrant.closeValue;
    return { opi1Tax, opi2Tax, totalBonusTax, stockGrant, finalReceipt, monthlyTakeHome };
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
        return [id, { ...item, opi2Total, totalBonus }];
      }),
    );

    const receipts = Object.fromEntries(
      RESULT_DIVISION_IDS.map((id) => [id, buildReceiptForDivision(divisionResults[id], salary, input.stockVwapPriceWon, input.stockClosePriceWon)]),
    );

    return {
      salary,
      averageSalary,
      salaryRatio,
      selected: divisionResults[input.userDivision] ?? divisionResults.memory,
      selectedReceipt: receipts[input.userDivision] ?? receipts.memory,
      divisionResults,
      receipts,
      profits,
      headcounts,
      totalBusinessProfit,
      sectorPool,
      businessPools,
      commonWeightedHeadcount,
      sectorWeightedHeadcount,
      businessWeightedHeadcounts,
      businessBasePayouts,
      sectorBasePayout,
      rates: { opi1Rate, opi2FundingRate, sectorRate, businessRate, commonPayoutRate },
      stockBasis: {
        stockVwapPriceWon: input.stockVwapPriceWon,
        stockClosePriceWon: input.stockClosePriceWon,
      },
    };
  }

  function sanitizeState(raw) {
    const merged = { ...DEFAULT_STATE, ...(raw || {}) };
    const sanitized = {};
    STATE_KEYS.forEach((key) => {
      if (STRING_STATE_KEYS.has(key)) sanitized[key] = String(merged[key] ?? DEFAULT_STATE[key]);
      else sanitized[key] = toNumber(merged[key], DEFAULT_STATE[key]);
    });

    sanitized.userDivision = DIVISIONS[sanitized.userDivision] ? sanitized.userDivision : DEFAULT_STATE.userDivision;
    sanitized.commonBusinessPoolSource = BUSINESS_DIVISION_IDS.includes(sanitized.commonBusinessPoolSource)
      ? sanitized.commonBusinessPoolSource
      : DEFAULT_STATE.commonBusinessPoolSource;
    sanitized.userSalaryManwon = Math.max(0, sanitized.userSalaryManwon);
    sanitized.averageSalaryManwon = Math.max(1, sanitized.averageSalaryManwon);
    sanitized.opi1RatePercent = clamp(sanitized.opi1RatePercent, 0, 200);
    sanitized.opi2FundingRatePercent = clamp(sanitized.opi2FundingRatePercent, 0, 100);
    sanitized.sectorDistributionRatePercent = clamp(sanitized.sectorDistributionRatePercent, -100, 200);
    sanitized.businessDistributionRatePercent = clamp(sanitized.businessDistributionRatePercent, 0, 200);
    sanitized.commonPayoutRatePercent = clamp(sanitized.commonPayoutRatePercent, 0, 200);
    ["memoryHeadcount", "foundryHeadcount", "slsiHeadcount", "commonHeadcount"].forEach((key) => {
      sanitized[key] = Math.max(0, Math.round(sanitized[key]));
    });
    sanitized.stockVwapPriceWon = Math.max(1, Math.round(sanitized.stockVwapPriceWon));
    sanitized.stockClosePriceWon = Math.max(0, Math.round(sanitized.stockClosePriceWon));
    sanitized.stockVwapDate = sanitizeDateString(sanitized.stockVwapDate);
    sanitized.stockCloseDate = sanitizeDateString(sanitized.stockCloseDate);
    return sanitized;
  }

  function loadState() {
    const fromUrl = parseStateFromUrl();
    if (fromUrl) return fromUrl;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return sanitizeState(JSON.parse(stored));
    } catch (error) {
      console.warn("저장된 설정을 불러오지 못했습니다.", error);
    }
    return sanitizeState(DEFAULT_STATE);
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn("설정을 저장하지 못했습니다.", error);
    }
  }

  function makeShareUrl() {
    const params = new URLSearchParams();
    const shortKeys = {
      userSalaryManwon: "s",
      userDivision: "d",
      averageSalaryManwon: "a",
      opi1RatePercent: "o1",
      opi2FundingRatePercent: "o2",
      sectorDistributionRatePercent: "sr",
      businessDistributionRatePercent: "br",
      commonPayoutRatePercent: "cw",
      commonBusinessPoolSource: "cs",
      memoryProfitJo: "mp",
      foundryProfitJo: "fp",
      slsiProfitJo: "lp",
      memoryHeadcount: "mh",
      foundryHeadcount: "fh",
      slsiHeadcount: "lh",
      commonHeadcount: "ch",
      stockVwapPriceWon: "vp",
      stockClosePriceWon: "cp",
    };
    Object.entries(shortKeys).forEach(([key, short]) => {
      const value = state[key];
      if (value !== DEFAULT_STATE[key]) params.set(short, String(value));
    });
    const url = new URL(window.location.href);
    url.search = params.toString();
    return url.toString();
  }

  function parseStateFromUrl() {
    const params = new URLSearchParams(window.location.search);
    if ([...params.keys()].length === 0) return null;
    const map = {
      s: "userSalaryManwon",
      d: "userDivision",
      a: "averageSalaryManwon",
      o1: "opi1RatePercent",
      o2: "opi2FundingRatePercent",
      sr: "sectorDistributionRatePercent",
      br: "businessDistributionRatePercent",
      cw: "commonPayoutRatePercent",
      cs: "commonBusinessPoolSource",
      mp: "memoryProfitJo",
      fp: "foundryProfitJo",
      lp: "slsiProfitJo",
      mh: "memoryHeadcount",
      fh: "foundryHeadcount",
      lh: "slsiHeadcount",
      ch: "commonHeadcount",
      vp: "stockVwapPriceWon",
      cp: "stockClosePriceWon",
    };
    const next = { ...DEFAULT_STATE };
    Object.entries(map).forEach(([short, key]) => {
      if (!params.has(short)) return;
      next[key] = STRING_STATE_KEYS.has(key) ? params.get(short) : Number(params.get(short));
    });
    return sanitizeState(next);
  }

  function setInputsFromState() {
    STATE_KEYS.forEach((key) => {
      const element = elements[key];
      if (!element) return;
      element.value = state[key];
    });
  }

  function collectStateFromInputs() {
    const next = { ...state };
    STATE_KEYS.forEach((key) => {
      const element = elements[key];
      if (!element) return;
      next[key] = STRING_STATE_KEYS.has(key) ? element.value : Number(element.value);
    });
    return sanitizeState(next);
  }

  function updateStateFromInputs() {
    state = collectStateFromInputs();
    saveState();
    render();
  }

  function showToast(message) {
    if (!elements.toast) return;
    elements.toast.textContent = message;
    elements.toast.classList.add("show");
    window.setTimeout(() => elements.toast.classList.remove("show"), 2400);
  }

  function moneyPairHtml(gross, net) {
    return `
      <div class="money-pair">
        <div><span>세전</span><strong>${formatEok(gross)}</strong></div>
        <div><span>세후</span><strong>${formatEok(net)}</strong></div>
      </div>
    `;
  }

  function insurancePairHtml(annual, monthly) {
    return `
      <div class="money-pair insurance-pair">
        <div><span>연간 총금액</span><strong>${formatEok(annual)}</strong></div>
        <div><span>월별 납부액</span><strong>${formatManwonFromWon(monthly)}</strong></div>
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
        <div class="stock-evaluation-inline">
          <span>주식 평가액</span>
          <strong>${formatEok(grant.closeValue)}</strong>
          <em>최근 종가 ${formatWon(stockBasis.stockClosePriceWon)} 기준</em>
          <button type="button" class="stock-toggle-button" data-stock-toggle aria-expanded="${stockDetailsExpanded ? "true" : "false"}" aria-controls="stockVestingPanel">
            ${toggleLabel} <span aria-hidden="true">${arrow}</span>
          </button>
        </div>
      </div>
    `;
  }

  function stockVestingHtml(grant, stockBasis) {
    return `
      <div id="stockVestingPanel" class="stock-vesting-panel ${stockDetailsExpanded ? "" : "is-hidden"}">
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
                  <span>${item.label}</span>
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
    return `
      <div class="money-pair final-receipt-pair">
        <div><span>현금 OPI1</span><strong>${formatEok(Math.max(0, receipt.opi1Tax.netPayment))}</strong></div>
        <div><span>자사주 OPI2</span><strong>${formatEok(receipt.stockGrant.closeValue)}</strong></div>
        <div class="final-receipt-total"><span>세후 최종 수령액</span><strong>${formatEok(receipt.finalReceipt)}</strong></div>
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
        html: `${opi2PaymentHtml(selected.opi2Total, receipt.opi2Tax.netPayment, receipt.stockGrant, result.stockBasis)}${stockVestingHtml(receipt.stockGrant, result.stockBasis)}`,
        sub: `세금 ${formatEok(receipt.opi2Tax.totalTax)} · 실효세율 ${formatPercent(receipt.opi2Tax.effectiveRate)}`,
      },
      {
        label: "총 성과급",
        ratio: formatPercent((selected.totalBonus / Math.max(salary, 1)) * 100),
        html: moneyPairHtml(selected.totalBonus, receipt.totalBonusTax.netPayment),
        sub: `세금 ${formatEok(receipt.totalBonusTax.totalTax)} · 실효세율 ${formatPercent(receipt.totalBonusTax.effectiveRate)}`,
      },
      {
        label: "세후 최종 수령액",
        html: finalReceiptHtml(result),
        sub: `현금 ${formatEok(Math.max(0, receipt.opi1Tax.netPayment))} + 주식 ${formatEok(receipt.stockGrant.closeValue)}(종가기준)`,
        primary: true,
      },
      {
        label: "내년도 월별 실수령액",
        html: `<div class="single-money">${formatManwonFromWon(receipt.monthlyTakeHome.monthlyNet)}</div>`,
        sub: `2027 연봉 ${formatManwonFromWon(receipt.monthlyTakeHome.salaryIncome)} 기준 · 보험료 2026 총소득 ${formatEok(receipt.monthlyTakeHome.insuranceBasisIncome)} 기준`,
        cardClass: "monthly-net-card",
      },
    ];

    elements.summaryCards.innerHTML = cardData.map((card) => `
      <article class="summary-card ${card.primary ? "primary-card" : ""} ${card.cardClass || ""}">
        <div class="card-head">
          <span class="label">${card.label}</span>
          ${card.ratio ? `<span class="ratio-chip">연봉 대비 ${card.ratio}</span>` : ""}
        </div>
        <div class="value-block">${card.html}</div>
        <p class="sub">${card.sub}</p>
      </article>
    `).join("");

    if (elements.taxNote) {
      elements.taxNote.innerHTML = `
        <strong>세후·자사주 계산 기준:</strong>
        OPI1은 세후 현금으로, OPI2는 <em>세후 OPI2 ÷ VWAP 기준가</em>를 FLOOR 처리해 지급 자사주 수를 추정했습니다.
        OPI2 자사주는 1/3 즉시 매도 가능, 1/3 1년 뒤, 1/3 2년 뒤 매도 가능으로 나누며,
        나머지 주식은 2년 뒤 매도 가능 구간에 포함했습니다. 세후 최종 수령액은 OPI1 세후 현금과 최근 삼성전자 종가 기준 OPI2 자사주 평가액의 합계입니다.
        세후액은 근로소득공제·세액공제·비과세 항목을 반영하지 않은 간이 계산입니다.
        내년도 월별 실수령액은 2027년 연봉에서 연봉 기준 근로소득세와 지방소득세를 차감하고, 건강보험료·장기요양료·국민연금 보험료·고용보험료는 2026년 총소득(연봉 + OPI1 + OPI2)을 기준으로 차감해 12개월로 나눈 값입니다.
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
        <small>공통 ${formatInteger(result.headcounts.common)}명 × 가중치 ${commonRateLabel}</small>
      `;
    }

    const totalDistribution = state.sectorDistributionRatePercent + state.businessDistributionRatePercent;
    if (elements.distributionWarning) {
      if (Math.abs(totalDistribution - 100) > 0.001) {
        elements.distributionWarning.hidden = false;
        elements.distributionWarning.textContent = `OPI2 부문 배율과 사업부 배분 비율의 합계가 ${formatPercent(totalDistribution)}입니다. 일반적으로 100%가 되도록 맞추는 것을 권장합니다.`;
      } else {
        elements.distributionWarning.hidden = true;
        elements.distributionWarning.textContent = "";
      }
    }
  }

  function renderFundSummary(result) {
    if (!elements.fundSummary) return;
    const businessPoolTotal = BUSINESS_DIVISION_IDS.reduce((sum, id) => sum + result.businessPools[id], 0);
    const totalOpi2Pool = result.sectorPool + businessPoolTotal;
    const estimatedPayout = result.sectorBasePayout * result.sectorWeightedHeadcount + BUSINESS_DIVISION_IDS.reduce(
      (sum, id) => sum + result.businessBasePayouts[id] * result.businessWeightedHeadcounts[id],
      0,
    );
    const fundGap = totalOpi2Pool - estimatedPayout;
    const sourceName = getDivisionName(state.commonBusinessPoolSource);

    const stats = [
      ["전체 영업이익 합계", formatJo(result.totalBusinessProfit)],
      ["OPI2 부문 재원", formatJo(result.sectorPool)],
      ["OPI2 사업부 재원 합계", formatJo(businessPoolTotal)],
      ["공통 가중인원", `${formatInteger(result.commonWeightedHeadcount)}명`],
      ["부문 가중인원", `${formatInteger(result.sectorWeightedHeadcount)}명`],
      [`${sourceName} 사업부 가중인원`, `${formatInteger(result.businessWeightedHeadcounts[state.commonBusinessPoolSource] || 0)}명`],
      ["재원 잔액", formatJo(Math.abs(fundGap) < 1 ? 0 : fundGap)],
    ];

    elements.fundSummary.innerHTML = stats.map(([label, value]) => `
      <div class="stat-item">
        <div class="stat-label">${label}</div>
        <div class="stat-value">${value}</div>
      </div>
    `).join("");
  }

  function metricRowHtml(metric, maxAbsValue, salary) {
    const width = Math.min(100, (Math.abs(metric.value) / maxAbsValue) * 100);
    const percent = (metric.value / Math.max(salary, 1)) * 100;
    const negativeClass = metric.value < 0 ? " negative" : "";
    return `
      <div class="metric-row ${metric.emphasis ? "emphasis" : ""}${metric.final ? " final" : ""}${negativeClass}">
        <div class="metric-line">
          <span>${metric.label}</span>
          <strong>${metric.display ?? formatEok(metric.value)}</strong>
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
      return [
        item.opi1,
        item.opi2Sector,
        item.opi2Business,
        item.opi2Total,
        item.totalBonus,
        receipt.totalBonusTax.netPayment,
        receipt.finalReceipt,
        receipt.monthlyTakeHome.monthlyNet,
      ];
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
          label: "총 성과급 세후",
          value: receipt.totalBonusTax.netPayment,
          note: `세금 ${formatEok(receipt.totalBonusTax.totalTax)} · 실효세율 ${formatPercent(receipt.totalBonusTax.effectiveRate)}`,
        },
        {
          label: "세후 최종 수령액",
          value: receipt.finalReceipt,
          final: true,
          percentText: `자사주 ${formatShares(receipt.stockGrant.totalShares)}`,
          note: `현금 ${formatEok(Math.max(0, receipt.opi1Tax.netPayment))} + 주식 ${formatEok(receipt.stockGrant.closeValue)}(종가기준)`,
        },
        {
          label: "내년도 월별 실수령액",
          value: receipt.monthlyTakeHome.monthlyNet,
          display: formatManwonFromWon(receipt.monthlyTakeHome.monthlyNet),
          percentText: `연간 ${formatManwonFromWon(receipt.monthlyTakeHome.annualNet)}`,
          note: `소득세 연봉 ${formatManwonFromWon(receipt.monthlyTakeHome.salaryIncome)} 기준 · 보험료 2026 총소득 ${formatEok(receipt.monthlyTakeHome.insuranceBasisIncome)} 기준`,
        },
      ];

      return `
        <article class="division-card${selectedClass}">
          <div class="division-card-title">
            <h3>${item.divisionName}</h3>
            ${id === state.userDivision ? `<span>내 사업부</span>` : ""}
          </div>
          <div class="metric-list">${metrics.map((metric) => metricRowHtml(metric, maxAbsValue, salary)).join("")}</div>
        </article>
      `;
    }).join("");
  }

  function render() {
    setInputsFromState();
    const result = calculate(state);
    renderAssumptions(result);
    renderFundSummary(result);
    renderSummary(result);
    renderComparison(result);
  }

  function parseNumbersFromText(text) {
    const matches = String(text || "").match(/[+-]?\d[\d,]*(?:\.\d+)?/g) || [];
    return matches.map((raw) => Number(raw.replace(/,/g, ""))).filter((value) => Number.isFinite(value));
  }

  function findHistoryTable(documentObject) {
    const headings = [...documentObject.querySelectorAll("h2")];
    const historyHeading = headings.find((heading) => heading.textContent.trim().toLowerCase() === "history");
    if (!historyHeading) return null;
    let cursor = historyHeading.nextElementSibling;
    while (cursor) {
      if (cursor.matches("table")) return cursor;
      const nested = cursor.querySelector?.("table");
      if (nested) return nested;
      cursor = cursor.nextElementSibling;
    }
    return documentObject.querySelector("table");
  }

  async function fetchLatestVwap() {
    const response = await fetch(SAMPSUNG_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`SamPSUng 응답 오류 ${response.status}`);
    const html = await response.text();
    const parsed = new DOMParser().parseFromString(html, "text/html");
    const table = findHistoryTable(parsed);
    const row = table?.querySelector("tbody tr");
    if (!row) throw new Error("History 표의 최신 행을 찾지 못했습니다.");
    const cells = [...row.querySelectorAll("th,td")].map((cell) => cell.textContent.trim());
    const candidates = cells.flatMap(parseNumbersFromText).filter((value) => value >= 1000);
    const latestVwap = candidates[candidates.length - 1];
    if (!latestVwap) throw new Error("VWAP 값을 찾지 못했습니다.");
    const dateText = cells.find((cell) => /\d{4}[-./]\d{1,2}[-./]\d{1,2}/.test(cell));
    const date = dateText ? dateText.match(/\d{4}[-./]\d{1,2}[-./]\d{1,2}/)?.[0]?.replace(/[./]/g, "-") : "";
    return { price: Math.round(latestVwap), date: sanitizeDateString(date) };
  }

  async function fetchLatestClose() {
    const response = await fetch(YAHOO_CHART_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`종가 응답 오류 ${response.status}`);
    const json = await response.json();
    const result = json?.chart?.result?.[0];
    const closes = result?.indicators?.quote?.[0]?.close || [];
    const timestamps = result?.timestamp || [];
    for (let index = closes.length - 1; index >= 0; index -= 1) {
      const close = closes[index];
      if (Number.isFinite(close) && close > 0) {
        const date = timestamps[index] ? new Date(timestamps[index] * 1000).toISOString().slice(0, 10) : "";
        return { price: Math.round(close), date };
      }
    }
    throw new Error("최근 종가를 찾지 못했습니다.");
  }

  async function refreshStockPrices() {
    if (elements.stockFetchStatus) elements.stockFetchStatus.textContent = "VWAP/종가를 불러오는 중입니다...";
    const updates = {};
    const errors = [];

    try {
      const vwap = await fetchLatestVwap();
      updates.stockVwapPriceWon = vwap.price;
      updates.stockVwapDate = vwap.date;
    } catch (error) {
      console.warn(error);
      errors.push("VWAP");
    }

    try {
      const close = await fetchLatestClose();
      updates.stockClosePriceWon = close.price;
      updates.stockCloseDate = close.date;
    } catch (error) {
      console.warn(error);
      errors.push("종가");
    }

    state = sanitizeState({ ...state, ...updates });
    saveState();
    render();

    if (elements.stockFetchStatus) {
      if (errors.length === 0) elements.stockFetchStatus.textContent = "VWAP/종가를 최신값으로 반영했습니다.";
      else if (Object.keys(updates).length > 0) elements.stockFetchStatus.textContent = `${errors.join(", ")} 자동 조회는 실패했지만 나머지 값은 반영했습니다. 실패한 값은 직접 입력해 주세요.`;
      else elements.stockFetchStatus.textContent = "자동 조회에 실패했습니다. 입력칸에 값을 직접 넣어 계산할 수 있습니다.";
    }
  }

  function attachEvents() {
    STATE_KEYS.forEach((key) => {
      const element = elements[key];
      if (!element) return;
      const eventName = element.tagName === "SELECT" ? "change" : "input";
      element.addEventListener(eventName, updateStateFromInputs);
    });

    elements.refreshStockButton?.addEventListener("click", refreshStockPrices);

    elements.shareButton?.addEventListener("click", async () => {
      const url = makeShareUrl();
      try {
        await navigator.clipboard.writeText(url);
        showToast("설정 링크를 복사했습니다.");
      } catch (error) {
        window.prompt("아래 링크를 복사하세요.", url);
      }
    });

    elements.resetButton?.addEventListener("click", () => {
      state = sanitizeState(DEFAULT_STATE);
      stockDetailsExpanded = false;
      saveState();
      render();
      showToast("기본값으로 복원했습니다.");
    });

    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-stock-toggle]");
      if (!button) return;
      stockDetailsExpanded = !stockDetailsExpanded;
      render();
    });
  }

  state = loadState();
  attachEvents();
  render();
})();
