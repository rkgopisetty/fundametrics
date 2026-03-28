document.addEventListener("DOMContentLoaded", () => {
  const fund1 = document.getElementById("fund1-select");
  const fund2 = document.getElementById("fund2-select");
  const fund3 = document.getElementById("fund3-select");
  const submitBtn = document.getElementById("submit-funds");
  const categoryFilter = document.getElementById("categoryFilter");
  const chartToggle = document.getElementById("chartToggle");
  const tableToggle = document.getElementById("tableToggle");
  const chartSection = document.getElementById("fund-comparison-chart");
  const tableSection = document.getElementById("fund-cross-tab");

  const timeRanges = ["1W", "1M", "3M", "6M", "YTD", "1Y", "2Y", "3Y", "5Y", "10Y"];

  let fundChart;
  let header = [];
  let data = [];

  [fund1, fund2, fund3].forEach(select => {
    select.innerHTML = "";
    select.disabled = true;
    select.appendChild(new Option("-- Choose a Fund --", ""));
  });

  FundUtils.loadFreshData()
    .then(storedData => {
      if (!storedData || storedData.length < 2) return console.warn("Fund data not found or malformed.");

      header = storedData[0];
      data = storedData.slice(1);

      FundUtils.populateCategoryFilter(
        storedData,
        "categoryFilter",
        "Category Name",
        filteredRows => updateFundDropdowns(filteredRows),
        "-- Choose a Category --"
      );

      [fund1, fund2, fund3].forEach(select => {
        select.addEventListener("change", () => {
          const selectedCategory = categoryFilter.value;
          const filtered = selectedCategory
            ? data.filter(r => FundUtils.cleanCategoryName(r[2]) === selectedCategory)
            : data;
          const filteredRows = [header, ...filtered];
          updateFundDropdowns(filteredRows);
        });
      });

      submitBtn.addEventListener("click", () => {
        const selectedFunds = getSelectedFundNames();
        const selectedCategory = categoryFilter.value;
        const cleanedCategory = FundUtils.cleanCategoryName(selectedCategory);
        const rangeIndices = timeRanges.map(label => header.indexOf(label));

        const baseColors = ["#fd7e14", "#007bff", "#6f42c1"];
        const negativeShades = ["#e8590c", "#0056b3", "#5a32a3"];

        const datasets = selectedFunds.map((name, i) => {
          const row = data.find(r => r[0].trim() === name.trim());
          if (!row) return null;

          const values = rangeIndices.map(idx => {
            const raw = row[idx];
            return typeof raw === "string" && raw.includes("%")
              ? parseFloat(raw.replace("%", ""))
              : typeof raw === "number" ? raw : parseFloat(raw) || 0;
          });

          return {
            label: name,
            data: values,
            backgroundColor: values.map(v => v < 0 ? negativeShades[i] : baseColors[i]),
            borderColor: baseColors[i],
            borderWidth: 1
          };
        }).filter(Boolean);

        const fullCategoryAverages = FundUtils.getCategoryAverages(data, header, cleanedCategory, timeRanges, true);
        const categoryAverages = fullCategoryAverages.slice(1); // exclude AUM for chart



        datasets.push({
          label: `${selectedCategory} Average`,
          data: categoryAverages,
          backgroundColor: "#6c757d",
          borderColor: "#6c757d",
          borderWidth: 1
        });


        const allValues = datasets.flatMap(ds => ds.data);
        const minValue = Math.min(...allValues);
        const maxValue = Math.max(...allValues);
        const roundedMin = Math.floor(minValue / 10) * 10;
        const roundedMax = Math.ceil(maxValue / 10) * 10;

        renderFundChart({ labels: timeRanges, datasets }, roundedMin, roundedMax);
        updateCrossTabHeaders();
        populateCrossTabTable();
        document.getElementById("view-toggle").style.display = "flex";
      });
    })
    .catch(err => console.error("❌ Failed to load fund data:", err));

  function updateFundDropdowns(filteredRows) {
    const dataSubset = filteredRows.slice(1);
    const allFundNames = FundUtils.getUniqueSorted(dataSubset.map(r => r[0]));
    const selected = getSelectedFundNames();

    [fund1, fund2, fund3].forEach((select, index) => {
      const otherSelected = selected.filter((_, i) => i !== index);
      const currentValue = select.value;

      select.innerHTML = "";
      select.appendChild(new Option("-- Choose a Fund --", ""));

      allFundNames.forEach(name => {
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

  function getSelectedFundNames() {
    return [fund1.value, fund2.value, fund3.value].filter(Boolean);
  }

  function updateCrossTabHeaders() {
    const cleanName = name => name.replace(/\s*-.*$/, "").trim();

    document.getElementById("fund1-header").textContent = cleanName(fund1.value) || "Fund 1";
    document.getElementById("fund2-header").textContent = cleanName(fund2.value) || "Fund 2";
    document.getElementById("fund3-header").textContent = cleanName(fund3.value) || "Fund 3";

  }

  function populateCrossTabTable() {
    const selectedFunds = getSelectedFundNames();
    const selectedCategory = categoryFilter.value;
    const cleanedCategory = FundUtils.cleanCategoryName(selectedCategory);

    const fundRows = selectedFunds.map(name =>
      data.find(r => r[0].trim() === name.trim()) || []
    );

    const fullCategoryAvg = FundUtils.getCategoryAverages(data, header, cleanedCategory, timeRanges, true);
    console.log("fullCategoryAvg:", fullCategoryAvg);


    const getByIndex = (row, index) => row?.[index] ?? "";

    const setRowByIndex = (groupClass, labels, indices, renderCell, showCategoryAvgFor = [], avgIndices = []) => {
      labels.forEach((label, i) => {
        const row = Array.from(document.querySelectorAll(`.group-row.${groupClass}`))
          .find(r => r.querySelector("td")?.textContent.trim() === label);
        if (!row) return;

        const cells = row.querySelectorAll("td");
        cells[0].textContent = label;

        fundRows.forEach((r, j) => {
          const value = getByIndex(r, indices[i]);
          const avgValue = getByIndex(fullCategoryAvg, avgIndices[i]);
          cells[j + 1].innerHTML = renderCell ? renderCell(label, value, j, avgValue) : value;
        });


        const shouldShowAvg = showCategoryAvgFor.includes(label);
        const avgIdx = avgIndices[i];
        const avgValue = getByIndex(fullCategoryAvg, avgIdx);
        cells[4].innerHTML = shouldShowAvg && avgIdx !== null
          ? (renderCell ? renderCell(label, avgValue) : avgValue)
          : "";
      });
    };

    // Overview
    const overviewLabels = ["Category", "Crisil", "AUM"];
    const overviewIndices = [2, 3, 4];
    const overviewAvgIndices = [null, null, 0];

    setRowByIndex("overview", overviewLabels, overviewIndices, (label, value) => {
      if (label === "Crisil") return FundUtils.renderCrisilStars(value);
      return value;
    }, ["AUM"], overviewAvgIndices);

    // Returns
    const returnLabels = [
      "1W Returns", "1M Returns", "3M Returns", "6M Returns", "YTD Returns",
      "1Y Returns", "2Y Returns", "3Y Returns", "5Y Returns", "10Y Returns"
    ];
    const returnIndices = Array.from({ length: 10 }, (_, i) => 5 + i);
    const returnAvgIndices = Array.from({ length: 10 }, (_, i) => 1 + i); // skip AUM

    setRowByIndex(
      "returns",
      returnLabels,
      returnIndices,
      (label, value, fundIdx, avgValue) => {
        const num = parseFloat(value);
        const avg = parseFloat(avgValue);
        const formatted = isNaN(num) ? value : `${num}%`;

        if (!isNaN(num) && !isNaN(avg)) {
          const cls = num > avg ? "cell-better" : num < avg ? "cell-worse" : "";
          return `<span class="${cls}">${formatted}</span>`;
        }

        return formatted;
      },
      returnLabels,
      returnAvgIndices
    );



    // Ranks
    const rankLabels = [
      "1W Rank", "1M Rank", "3M Rank", "6M Rank", "YTD Rank",
      "1Y Rank", "2Y Rank", "3Y Rank", "5Y Rank", "10Y Rank"
    ];
    const rankIndices = Array.from({ length: 10 }, (_, i) => 15 + i);
    const rankAvgIndices = Array(rankLabels.length).fill(null);

    setRowByIndex("ranks", rankLabels, rankIndices, null, [], rankAvgIndices);

    // Ratios
    const ratioLabels = ["Std. Dev", "Beta", "Sharpe", "Alpha", "Treynor's Ratio"];
    const ratioIndices = Array.from({ length: 5 }, (_, i) => 25 + i);
    const ratioAvgIndices = Array.from({ length: 5 }, (_, i) => 11 + i);


    setRowByIndex(
      "ratios",
      ratioLabels,
      ratioIndices,
      (label, value, fundIdx, avgValue) => {
        const num = parseFloat(value);
        const avg = parseFloat(avgValue);
        const formatted = isNaN(num) ? value : num.toFixed(2);

        const lowerIsBetter = ["Std. Dev", "Beta"].includes(label);

        if (!isNaN(num) && !isNaN(avg)) {
          const isBetter = lowerIsBetter ? num < avg : num > avg;
          const cls = isBetter ? "cell-better" : num === avg ? "" : "cell-worse";
          return `<span class="${cls}">${formatted}</span>`;
        }

        return formatted;
      },
      ratioLabels,
      ratioAvgIndices
    );


    // Unhide all rows
    document.querySelectorAll(".group-row").forEach(row => {
      const isOverview = row.classList.contains("overview");
      row.classList.toggle("hidden", !isOverview);
    });
  }



  function renderFundChart(fundData, yMin, yMax) {
    const canvas = document.getElementById("fund-comparison-chart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (fundChart) fundChart.destroy();

    fundChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: fundData.labels,
        datasets: fundData.datasets
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: "top" },
          title: {
            display: true,
            text: "Fund Performance Across Time Periods"
          }
        },
        scales: {
          y: {
            min: yMin,
            max: yMax,
            title: {
              display: true,
              text: "Performance (%)"
            },
            ticks: {
              callback: value => `${value}%`
            }
          },
          x: {
            title: {
              display: true,
              text: "Time Range"
            }
          }
        }
      }
    });
  }

  // 🔁 Toggle logic
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
  });

  // 🔽 Expand/collapse logic
  document.querySelectorAll(".group-header").forEach(header => {
    header.addEventListener("click", () => {
      const group = header.dataset.group;
      const rows = document.querySelectorAll(`.group-row.${group}`);
      const isHidden = rows[0].classList.contains("hidden");

      rows.forEach(row => row.classList.toggle("hidden", !isHidden));
      header.querySelector("td").textContent = isHidden
        ? `▼ ${group.charAt(0).toUpperCase() + group.slice(1)}`
        : `▶ ${group.charAt(0).toUpperCase() + group.slice(1)}`;
    });
  });
});
