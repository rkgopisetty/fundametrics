document.addEventListener("DOMContentLoaded", () => {
  const fund1 = document.getElementById("fund1-select");
  const fund2 = document.getElementById("fund2-select");
  const fund3 = document.getElementById("fund3-select");
  const submitBtn = document.getElementById("submit-funds");
  const categoryFilter = document.getElementById("categoryFilter");
  const chartToggle = document.getElementById("chartToggle");
  const tableToggle = document.getElementById("tableToggle");

  const chartSection = document.getElementById("chart-section");
  const tableSection = document.getElementById("fund-cross-tab");

  // ------------------------------
  // ⭐ FIELD GROUPS (NEW SCHEMA)
  // ------------------------------
  const RETURN_FIELDS = [
    "1W", "1M", "3M", "6M", "YTD",
    "1Y", "2Y", "3Y", "5Y", "10Y"
  ];

  const RANK_FIELDS = [
    "1W Rank", "1M Rank", "3M Rank", "6M Rank", "YTD Rank",
    "1Y Rank", "2Y Rank", "3Y Rank", "5Y Rank", "10Y Rank"
  ];

  const RATIO_FIELDS = [
    "SD", "Beta", "Sharpe", "Sortino", "Treynor",
    "Up Capture", "Down Capture"
  ];

  const OVERVIEW_FIELDS = [
    "Category",
    "NAV",
    "MStar Rating",
    "Exp Ratio",
    "AuM (Cr)"
  ];

  let allFunds = [];
  let filteredFunds = [];
  let fundChart = null;

  // ------------------------------
  // ⭐ INITIALIZE DROPDOWNS
  // ------------------------------
  [fund1, fund2, fund3].forEach(select => {
    select.innerHTML = "";
    select.disabled = true;
    select.appendChild(new Option("-- Choose a Fund --", ""));
  });

  // ------------------------------
  // ⭐ LOAD DATA
  // ------------------------------
  FundUtils.loadFreshData()
    .then(funds => {
      allFunds = funds;
      filteredFunds = allFunds;

      updateFundDropdowns();

      FundUtils.populateCategoryFilter(
        allFunds,
        "categoryFilter",
        updated => {
          filteredFunds = updated;
          fund1.value = "";
          fund2.value = "";
          fund3.value = "";
          submitBtn.disabled = true;
          updateFundDropdowns();
        },
        "-- Choose a Category --"
      );

      submitBtn.addEventListener("click", handleCompare);
    })
    .catch(err => console.error("❌ Failed to load fund data:", err));

  // ------------------------------
  // ⭐ UPDATE FUND DROPDOWNS
  // ------------------------------
  function updateFundDropdowns() {
    const names = [...new Set(filteredFunds.map(f => f["Scheme Name"]))].sort();
    const selected = getSelectedFundNames();

    [fund1, fund2, fund3].forEach((select, index) => {
      const otherSelected = selected.filter((_, i) => i !== index);
      const currentValue = select.value;

      select.innerHTML = "";
      select.appendChild(new Option("-- Choose a Fund --", ""));

      names.forEach(name => {
        if (!otherSelected.includes(name)) {
          select.appendChild(new Option(name, name));
        }
      });

      select.disabled = false;
      if (currentValue && !otherSelected.includes(currentValue)) {
        select.value = currentValue;
      }
    });

    checkFundSelection();
  }

  function checkFundSelection() {
    submitBtn.disabled = !(fund1.value && fund2.value);
  }

  // ⭐ FIX — update dropdowns when any fund changes
  [fund1, fund2, fund3].forEach(select => {
    select.addEventListener("change", () => {
      checkFundSelection();
      updateFundDropdowns();
    });
  });

  function getSelectedFundNames() {
    return [fund1.value, fund2.value, fund3.value].filter(Boolean);
  }

  // ------------------------------
  // ⭐ HANDLE COMPARE
  // ------------------------------
  function handleCompare() {
    const selectedFunds = getSelectedFundNames();
    const selectedCategory = categoryFilter.value;

    const datasets = selectedFunds.map((name, i) => {
      const fund = filteredFunds.find(f => f["Scheme Name"] === name);
      if (!fund) return null;

      const values = RETURN_FIELDS.map(f => parseFloat(fund[f]) || 0);

      const colors = ["#fd7e14", "#007bff", "#6f42c1"];
      const negColors = ["#e8590c", "#0056b3", "#5a32a3"];

      return {
        label: name,
        data: values,
        backgroundColor: values.map(v => v < 0 ? negColors[i] : colors[i]),
        borderColor: colors[i],
        borderWidth: 1
      };
    }).filter(Boolean);

    // Category averages
    const categoryFunds = filteredFunds.filter(f => f["Category"] === selectedCategory);
    const categoryAverages = RETURN_FIELDS.map(field => {
      const nums = categoryFunds.map(f => parseFloat(f[field])).filter(n => !isNaN(n));
      if (!nums.length) return 0;
      return (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2);
    });

    datasets.push({
      label: `${selectedCategory} Average`,
      data: categoryAverages,
      backgroundColor: "#6c757d",
      borderColor: "#6c757d",
      borderWidth: 1
    });

    const allValues = datasets.flatMap(ds => ds.data);
    const yMin = Math.floor(Math.min(...allValues) / 10) * 10;
    const yMax = Math.ceil(Math.max(...allValues) / 10) * 10;

    renderChart({ labels: RETURN_FIELDS, datasets }, yMin, yMax);
    updateCrossTabHeaders();
    populateCrossTabTable();

    document.getElementById("view-toggle").style.display = "flex";
  }

  // ------------------------------
  // ⭐ RENDER CHART
  // ------------------------------
  function renderChart(fundData, yMin, yMax) {
    const canvas = document.getElementById("fund-comparison-chart");
    const ctx = canvas.getContext("2d");

    if (fundChart) fundChart.destroy();

    fundChart = new Chart(ctx, {
      type: "bar",
      data: fundData,
      options: {
        responsive: true,
        plugins: {
          legend: { position: "top" },
          title: { display: true, text: "Fund Performance Across Time Periods" }
        },
        scales: {
          y: {
            min: yMin,
            max: yMax,
            ticks: { callback: v => `${v}%` }
          }
        }
      }
    });
  }

  // ------------------------------
  // ⭐ UPDATE CROSS-TAB HEADERS
  // ------------------------------
  function updateCrossTabHeaders() {
    const clean = n => n.replace(/\s*-.*$/, "").trim();

    document.getElementById("fund1-header").textContent =
      fund1.value ? clean(fund1.value) : "Fund 1";

    document.getElementById("fund2-header").textContent =
      fund2.value ? clean(fund2.value) : "Fund 2";

    document.getElementById("fund3-header").textContent =
      fund3.value ? clean(fund3.value) : "Fund 3";
  }

  // ------------------------------
  // ⭐ POPULATE CROSS-TAB TABLE
  // ------------------------------
  function populateCrossTabTable() {
    const selectedFunds = getSelectedFundNames();
    const selectedCategory = categoryFilter.value;

    let fundRows = selectedFunds.map(name =>
      filteredFunds.find(f => f["Scheme Name"] === name) || {}
    );

    // ⭐ Always pad to 3 columns
    while (fundRows.length < 3) {
      fundRows.push({});
    }

    const categoryFunds = filteredFunds.filter(f => f["Category"] === selectedCategory);

    const categoryAvg = field => {
      const nums = categoryFunds.map(f => parseFloat(f[field])).filter(n => !isNaN(n));
      if (!nums.length) return "";
      return (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2);
    };

    function fillRows(group, labels, fields, formatter = v => v) {
      labels.forEach((label, i) => {
        const row = Array.from(document.querySelectorAll(`.group-row.${group}`))
          .find(r => r.querySelector("td")?.textContent.trim() === label);

        if (!row) return;

        const cells = row.querySelectorAll("td");

        // ⭐ Fill fund columns
        fundRows.forEach((fund, j) => {
          if (!fund || Object.keys(fund).length === 0) {
            cells[j + 1].innerHTML = "-"; // missing fund
          } else {
            const v = fund[fields[i]];
            cells[j + 1].innerHTML = formatter(v, fields[i], fund);
          }
        });

        // ⭐ Category Average Logic
        if (fields[i] === "MStar Rating") {
          cells[4].innerHTML = ""; // No average for Rating
        } else if (group === "ranks") {
          cells[4].innerHTML = ""; // No average for Ranks
        } else {
          const avg = categoryAvg(fields[i]);
          cells[4].innerHTML = formatter(avg, fields[i], null);
        }
      });
    }

    // Overview
    fillRows(
      "overview",
      ["Category", "NAV", "Rating", "Exp Ratio", "AUM"],
      ["Category", "NAV", "MStar Rating", "Exp Ratio", "AuM (Cr)"],
      (v, f) => f === "MStar Rating" ? FundUtils.renderCrisilStars(v) : v
    );

    // Returns
    fillRows(
      "returns",
      RETURN_FIELDS.map(f => `${f} Returns`),
      RETURN_FIELDS,
      v => isNaN(parseFloat(v)) ? v : `${parseFloat(v).toFixed(2)}%`
    );

    // Ranks
    fillRows(
      "ranks",
      RANK_FIELDS,
      RANK_FIELDS
    );

    // Ratios
    fillRows(
      "ratios",
      ["SD", "Beta", "Sharpe", "Sortino", "Treynor", "Up Cap", "Down Cap"],
      RATIO_FIELDS,
      v => isNaN(parseFloat(v)) ? v : parseFloat(v).toFixed(2)
    );
  }

  // ------------------------------
  // ⭐ TOGGLE LOGIC
  // ------------------------------
  chartToggle.addEventListener("click", () => {
    chartSection.style.display = "block";
    tableSection.style.display = "none";
    chartToggle.classList.add("active");
    tableToggle.classList.remove("active");
  });

  tableToggle.addEventListener("click", () => {
    chartSection.style.display = "none";
    tableSection.style.display = "block";
    tableToggle.classList.add("active");
    chartToggle.classList.remove("active");

    // ⭐ Expand Overview by default
    const overviewHeader = document.querySelector('.group-header[data-group="overview"]');
    const overviewRows = document.querySelectorAll('.group-row.overview');

    overviewRows.forEach(r => r.classList.remove("hidden"));
    overviewHeader.querySelector("td").textContent = "▼ Overview";
  });

  // ------------------------------
  // ⭐ EXPAND/COLLAPSE GROUPS
  // ------------------------------
  document.querySelectorAll(".group-header").forEach(header => {
    header.addEventListener("click", () => {
      const group = header.dataset.group;
      const rows = document.querySelectorAll(`.group-row.${group}`);
      const isHidden = rows[0].classList.contains("hidden");

      rows.forEach(r => r.classList.toggle("hidden", !isHidden));
      header.querySelector("td").textContent = isHidden
        ? `▼ ${group.charAt(0).toUpperCase() + group.slice(1)}`
        : `▶ ${group.charAt(0).toUpperCase() + group.slice(1)}`;
    });
  });
});
