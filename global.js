(function () {
  // 🌐 Google Sheets API Configuration
  const sheetID = '1BU8mswQ-wrQn7-taW5lIiSvPH2GzqMWjKNiBvwVOztg';
  const apiKey = 'AIzaSyD7rRtGbkzHRloCXAA8ptJc8bIuGwmjvmE';
  const range = 'Final!A5:AN184';

  // 📦 Data Fetching & Storage Utilities
  const fetchFundData = (sheetID, range, apiKey) => {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetID}/values/${range}?key=${apiKey}`;
    return fetch(url)
      .then(res => res.json())
      .then(data => {
        console.log("📦 Raw response from Sheets API:", data);
        return Array.isArray(data.values) ? data.values : [];
      });
  };

  const saveToLocal = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
  };

  const loadFromLocal = (key) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  };

  // 🧠 Utility Functions
  const getUniqueSorted = (values) => {
    return [...new Set(values)].filter(Boolean).sort();
  };

  const cleanCategoryName = (raw) => {
    return (raw || "").replace(/\*/g, "").replace(/ Fund$/i, "").trim();
  };

  // 🎛️ Category Filter Dropdown Generator
  const populateCategoryFilter = (
    rows,
    selectId,
    columnLabel,
    onChangeCallback,
    defaultLabel = "-- Choose a Category --"
  ) => {
    const select = document.getElementById(selectId);
    if (!select || rows.length < 2) return;

    const categoryIndex = rows[0].indexOf(columnLabel);
    if (categoryIndex === -1) {
      console.warn(`Column "${columnLabel}" not found.`);
      return;
    }

    const categories = getUniqueSorted(
      rows.slice(1).map(r => cleanCategoryName(r[categoryIndex]))
    );

    select.innerHTML = `<option value="">${defaultLabel}</option>`;

    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      select.appendChild(option);
    });

    select.onchange = () => {
      const selected = select.value;
      const header = rows[0];
      const data = rows.slice(1);
      const filtered = selected
        ? data.filter(r => cleanCategoryName(r[categoryIndex]) === selected)
        : data;
      onChangeCallback([header, ...filtered]);
    };
  };

  // 📊 Category Average Calculator
  const getCategoryAverages = (data, header, categoryName, timeRanges, includeAUM = false) => {
    const cleanedTarget = cleanCategoryName(categoryName);

    const categoryRows = data.filter(r => {
      const rawCategory = r[2] || "";
      return cleanCategoryName(rawCategory) === cleanedTarget;
    });

    const startIndex = 5;
    const returnIndices = timeRanges.map((_, i) => startIndex + i);
    const ratioIndices = Array.from({ length: 5 }, (_, i) => 25 + i);

    const indices = [
      ...(includeAUM ? [4] : []),
      ...returnIndices,
      ...ratioIndices
    ];

    return indices.map(idx => {
      const values = categoryRows
        .map(r => {
          const raw = r[idx];
          if (!raw || typeof raw === "string" && raw.trim() === "") return null;

          let parsed = typeof raw === "string"
            ? parseFloat(raw.replace("%", "").replace(",", ""))
            : typeof raw === "number"
            ? raw
            : parseFloat(raw);

          if (isNaN(parsed) || Math.abs(parsed) > 500) return null;
          return parsed;
        })
        .filter(v => v !== null);

      const sum = values.reduce((a, b) => a + b, 0);
      return values.length ? +(sum / values.length).toFixed(2) : null;
    });
  };

  // ⭐ Crisil Rating Renderer
  const renderCrisilStars = (rating) => {
    const maxStars = 5;
    const parsed = parseInt(rating);
    const filled = isNaN(parsed) ? 0 : Math.min(parsed, maxStars);
    const empty = maxStars - filled;

    const stars = [
      ...Array(filled).fill('<span class="star filled">★</span>'),
      ...Array(empty).fill('<span class="star empty">★</span>')
    ];

    return stars.join('');
  };

  // 🔄 Refresh Logic
  const refreshFromSheet = async () => {
    const freshData = await fetchFundData(sheetID, range, apiKey);
    saveToLocal("fundData", freshData);
    localStorage.setItem("fundDataTimestamp", Date.now());
  };

  const shouldRefresh = () => {
    const last = localStorage.getItem("fundDataTimestamp");
    return !last || Date.now() - parseInt(last) > 3600000; // 1 hour
  };

  // 🚀 Expose All Utilities
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
    shouldRefresh
  };

  // ✅ Attach loadFreshData after FundUtils is defined
  FundUtils.loadFreshData = async () => {
    if (FundUtils.shouldRefresh()) {
      await FundUtils.refreshFromSheet();
    }
    const storedData = FundUtils.loadFromLocal("fundData");
    if (!storedData || storedData.length < 2) {
      console.warn("Fund data missing or malformed.");
      return null;
    }
    return storedData;
  };

  // 🌍 Make utilities globally accessible
  window.FundUtils = FundUtils;
})();
