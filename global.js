(function () {
  // 🌐 Google Sheets API Configuration
  const sheetID = '1BU8mswQ-wrQn7-taW5lIiSvPH2GzqMWjKNiBvwVOztg';
  const apiKey = 'AIzaSyD7rRtGbkzHRloCXAA8ptJc8bIuGwmjvmE';

  // FUND DATA RANGE (unchanged)
  const range = 'FinalV2!A6:AG194';

  // 🧱 FUND SCHEMA
  const FUND_SCHEMA = [
    "Scheme Name", "Category", "MStar Rating", "NAV", "Exp Ratio", "AuM (Cr)",
    "1W", "1M", "3M", "6M", "YTD", "1Y", "2Y", "3Y", "5Y", "10Y",
    "1W Rank", "1M Rank", "3M Rank", "6M Rank", "YTD Rank", "1Y Rank",
    "2Y Rank", "3Y Rank", "5Y Rank", "10Y Rank",
    "SD", "Beta", "Sharpe", "Sortino", "Treynor",
    "Up Capture", "Down Capture"
  ];

  const CATEGORY_FIELD = "Category";

  // 📦 Fetch any range
  const fetchFundData = (sheetID, range, apiKey) => {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetID}/values/${range}?key=${apiKey}`;
    return fetch(url)
      .then(res => res.json())
      .then(data => Array.isArray(data.values) ? data.values : []);
  };

  const saveToLocal = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const loadFromLocal = (key) => JSON.parse(localStorage.getItem(key) || "null");

  // 🧠 Utility Functions
  const getUniqueSorted = (values) => [...new Set(values)].filter(Boolean).sort();
  const cleanCategoryName = (raw) => (raw || "").replace(/\*/g, "").replace(/ Fund$/i, "").trim();

  const populateCategoryFilter = (rows, selectId, onChangeCallback, defaultLabel = "-- Choose a Category --") => {
    const select = document.getElementById(selectId);
    if (!select || rows.length === 0) return;

    const categories = getUniqueSorted(rows.map(r => cleanCategoryName(r[CATEGORY_FIELD])));
    select.innerHTML = `<option value="">${defaultLabel}</option>`;

    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      select.appendChild(option);
    });

    select.onchange = () => {
      const selected = select.value;
      const filtered = selected
        ? rows.filter(r => cleanCategoryName(r[CATEGORY_FIELD]) === selected)
        : rows;
      onChangeCallback(filtered);
    };
  };

  const getCategoryAverages = (data, categoryName, fields) => {
    const cleaned = cleanCategoryName(categoryName);
    const rows = data.filter(r => cleanCategoryName(r[CATEGORY_FIELD]) === cleaned);

    return fields.map(field => {
      const values = rows
        .map(r => parseFloat((r[field] || "").toString().replace("%", "")))
        .filter(v => !isNaN(v));

      if (!values.length) return null;
      return +(values.reduce((a, b) => a + b, 0) / values.length).toFixed(2);
    });
  };

  const renderCrisilStars = (rating) => {
    const maxStars = 5;
    const parsed = parseInt(rating);
    const filled = isNaN(parsed) ? 0 : Math.min(parsed, maxStars);
    const empty = maxStars - filled;

    return [
      ...Array(filled).fill('<span class="star filled">★</span>'),
      ...Array(empty).fill('<span class="star empty">★</span>')
    ].join('');
  };

  // 🔄 Refresh Logic (funds only)
  const refreshFromSheet = async () => {
    const freshData = await fetchFundData(sheetID, range, apiKey);
    saveToLocal("fundData", freshData);
    localStorage.setItem("fundDataTimestamp", Date.now());
  };

  const shouldRefresh = () => {
    const last = localStorage.getItem("fundDataTimestamp");
    return !last || Date.now() - parseInt(last) > 3600000;
  };

  // 🚀 Expose Utilities
  const FundUtils = {
    sheetID,
    apiKey,
    range,
    fetchFundData,
    saveToLocal,
    loadFromLocal,
    getUniqueSorted,
    cleanCategoryName,
    renderCrisilStars,
    getCategoryAverages,
    populateCategoryFilter,
    refreshFromSheet,
    shouldRefresh,
    CATEGORY_FIELD
  };

  // ⭐ 1️⃣ Main loader: returns ONLY funds
  FundUtils.loadFreshData = async () => {
    if (FundUtils.shouldRefresh()) {
      await FundUtils.refreshFromSheet();
    }

    const storedData = FundUtils.loadFromLocal("fundData");
    if (!storedData || storedData.length < 1) return [];

    return storedData.map(row => {
      const obj = {};
      FUND_SCHEMA.forEach((key, i) => obj[key] = row[i] ?? null);
      return obj;
    });
  };

  // ⭐ 2️⃣ New loader: INDEX DATA (Indian + US)
  FundUtils.loadIndexData = async () => {
    // Indian block
    const indianRaw = await fetchFundData(sheetID, 'FinalV2!AI5:AL9', apiKey);

    // US block
    const usRaw = await fetchFundData(sheetID, 'FinalV2!AN5:AQ9', apiKey);

    const final = [];

    // Convert Indian block
    if (indianRaw && indianRaw.length > 1) {
      const headers = indianRaw[0];
      const rows = indianRaw.slice(1);

      rows.forEach(row => {
        const obj = {};
        headers.forEach((h, i) => obj[h] = row[i] ?? null);
        final.push(obj);
      });
    }

    // Convert US block
    if (usRaw && usRaw.length > 1) {
      const headers = usRaw[0];
      const rows = usRaw.slice(1);

      rows.forEach(row => {
        const obj = {};
        headers.forEach((h, i) => obj[h] = row[i] ?? null);
        final.push(obj);
      });
    }

    return final;
  };

  // 🌍 Make utilities globally accessible
  window.FundUtils = FundUtils;
})();
