document.addEventListener("DOMContentLoaded", () => {
  (async function initDashboard() {
    const storedData = await FundUtils.loadFreshData();
    if (!storedData || storedData.length < 2) {
      console.warn("Fund data missing or malformed.");
      return;
    }

    const header = storedData[0];
    const data = storedData.slice(1);

    // 🔧 DOM Elements
    const categorySelect = document.getElementById("categoryFilter");
    const fundSelect = document.getElementById("fundFilter");
    const fundIdentity = document.getElementById("fundIdentity");
    const fundMetrics = document.getElementById("fundMetrics");
    const selectors = document.getElementById("selectors");
    const categoryLabel = document.querySelector('label[for="categoryFilter"]');
    const fundLabel = document.querySelector('label[for="fundFilter"]');
    const viewSection = document.getElementById("view-section");
    const chartContainer = document.getElementById("chart-container");
    const tableContainer = document.getElementById("table-container");
    const toggleChartBtn = document.getElementById("toggle-chart");
    const toggleTableBtn = document.getElementById("toggle-table");
    const cardContainer = document.getElementById("card-container");
    const comparisonWrapper = document.getElementById("comparison-wrapper");
    const peerComparison = document.getElementById("peer-comparison");
    const peerReturns = document.getElementById("peer-returns");
    const peerRanks = document.getElementById("peer-ranks");
    const peerRatios = document.getElementById("peer-ratios");

    // 🧭 Peer tab toggle logic
    document.querySelectorAll(".peer-tab").forEach(tab => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".peer-tab").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        const selected = tab.dataset.tab;
        document.querySelectorAll(".peer-content").forEach(content => {
          content.style.display = content.id === `peer-${selected}` ? "block" : "none";
        });
      });
    });

    // 🎛️ Populate category dropdown
    FundUtils.populateCategoryFilter(
      storedData,
      "categoryFilter",
      "Category Name",
      filteredRows => {
        updateFundDropdown(filteredRows);
        viewSection.style.display = "none";
      },
      "-- Choose a Category --"
    );

    // 🔄 Update fund dropdown based on selected category
    function updateFundDropdown(filteredRows) {
      const fundNames = FundUtils.getUniqueSorted(filteredRows.slice(1).map(r => r[0]));
      fundSelect.innerHTML = "";
      fundSelect.appendChild(new Option("-- Choose a Fund --", ""));
      fundNames.forEach(name => fundSelect.appendChild(new Option(name, name)));
      fundSelect.disabled = false;
    }

    // 📈 Initialize chart
    const ctx = document.getElementById("fundVsCategoryChart").getContext("2d");
    const fundVsCategoryChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: ['1W', '1M', '3M', '6M', 'YTD', '1Y', '2Y', '3Y', '5Y', '10Y'],
        datasets: [
          {
            label: "Selected Fund",
            data: [],
            borderColor: "#4a90e2",
            backgroundColor: "rgba(74, 144, 226, 0.1)",
            tension: 0.3
          },
          {
            label: "Category Average",
            data: [],
            borderColor: "#f5a623",
            backgroundColor: "rgba(245, 166, 35, 0.1)",
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: "top" },
          title: { display: true, text: "Performance: Fund vs Category Average" }
        },
        scales: {
          y: {
            title: { display: true, text: "% Change" },
            beginAtZero: true
          }
        }
      }
    });

    // 📋 Fund selection logic
    fundSelect.addEventListener("change", () => {
      const selectedFund = fundSelect.value;
      if (!selectedFund) return;

      let row = data.find(r => r[0] === selectedFund);
      if (!row) {
        console.warn("Selected fund not found in data.");
        return;
      }

      while (row.length < 30) row.push("");

      const fundName = row[0];
      const rawCategory = row[2];
      const assetType = "Equity";
      const cleanedCategory = rawCategory.replace(/\*/g, "").replace(/ Fund$/i, "").trim();
      const oneWeekChange = row[5] || "N/A";
      const oneWeekRank = row[15] || "N/A";
      const aum = row[4] || "N/A";
      const crisilRating = row[3] || "";
      const formattedAUM = `₹${parseFloat(aum).toLocaleString()} Cr`;

      // 🧾 Render fund identity card
      fundIdentity.innerHTML = `
        <h3 class="fund-title">${fundName}</h3>
        <div class="fund-tags-row">
          <div class="fund-tags">
            <span class="tag">${assetType}</span>
            <span class="tag">${cleanedCategory}</span>
          </div>
          <div class="metric-inline">
            <label>1W Change</label>
            <div class="metric-value change-cell">${oneWeekChange} <small>(Rank: ${oneWeekRank})</small></div>
          </div>
          <div class="metric-inline">
            <label>AUM</label>
            <div class="metric-value">${formattedAUM}</div>
          </div>
          <div class="metric-inline">
            <label>Rating (CRISIL)</label>
            <div class="metric-value">${FundUtils.renderCrisilStars(crisilRating)}</div>
          </div>
        </div>
      `;

      // 🎨 Apply change color
      const changeCell = document.querySelector(".change-cell");
      const numericChange = parseFloat(oneWeekChange);
      const changeClass = numericChange > 0
        ? "change-positive"
        : numericChange < 0
          ? "change-negative"
          : "change-neutral";
      if (changeCell) changeCell.classList.add(changeClass);

      // 🧼 Hide selectors, show dashboard
      categorySelect.style.display = "none";
      fundSelect.style.display = "none";
      if (fundLabel) fundLabel.style.display = "none";
      fundIdentity.style.display = "block";

      updateChart(row);
      viewSection.style.display = "block";
      renderPeerComparison(row, cleanedCategory);
      peerComparison.style.display = "block";
    });

    // 🖱️ Hover to reveal selectors
    categoryLabel.addEventListener("mouseenter", () => {
      categorySelect.style.display = "inline-block";
      fundSelect.style.display = "inline-block";
      if (fundLabel) fundLabel.style.display = "inline-block";
    });

    // 🔁 Toggle chart/table views
    toggleChartBtn.addEventListener("click", () => {
      chartContainer.style.display = "block";
      comparisonWrapper.style.display = "none";
      toggleChartBtn.classList.add("active");
      toggleTableBtn.classList.remove("active");
    });

    toggleTableBtn.addEventListener("click", () => {
      chartContainer.style.display = "none";
      comparisonWrapper.style.display = "flex";
      toggleTableBtn.classList.add("active");
      toggleChartBtn.classList.remove("active");
    });

    // 🧼 Normalize row to 30 columns
    function normalizeRow(r) {
      const padded = [...r];
      if (padded.length > 30) padded.length = 30;
      while (padded.length < 30) padded.push("—");
      return padded;
    }

    // 🧠 Render peer comparison tables
    function renderPeerComparison(selectedRow, category) {
      const peers = data.filter(r => {
        const cat = r[2]?.replace(/\*/g, "").replace(/ Fund$/i, "").trim();
        return cat === category;
      });

      const peerRows = peers
        .map(r => {
          const padded = normalizeRow(r);
          return {
            name: padded[0],
            returns: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map(i => padded[i] || "—"),
            ranks: [15, 16, 17, 18, 19, 20, 21, 22, 23, 24].map(i => padded[i] || "—"),
            ratios: [25, 26, 27, 28, 29].map(i => padded[i] || "—"),
            oneY: parseFloat(padded[10]),
            isSelected: padded[0] === selectedRow[0]
          };
        })
        .filter(p => !isNaN(p.oneY))
        .sort((a, b) => b.oneY - a.oneY);

      const topPeers = peerRows.slice(0, 4);
      const selectedInPeers = topPeers.some(p => p.isSelected);

      if (!selectedInPeers) {
        const selectedPeer = peerRows.find(p => p.isSelected);
        if (selectedPeer) topPeers.push(selectedPeer);
      }

      renderPeerTable(peerReturns, topPeers, "returns", [
        "1W", "1M", "3M", "6M", "YTD", "1Y", "2Y", "3Y", "5Y", "10Y"
      ]);

      renderPeerTable(peerRanks, topPeers, "ranks", [
        "1W", "1M", "3M", "6M", "YTD", "1Y", "2Y", "3Y", "5Y", "10Y"
      ]);

      renderPeerTable(peerRatios, topPeers, "ratios", [
        "Std Dev", "Beta", "Sharpe", "Alpha", "Treynor's Ratio"
      ]);
    }

    // 📊 Calculate category averages for peer table
    function calculateCategoryAverages(peers, key) {
      const values = peers.map(p => p[key]);
      const count = values.length;
      const averages = [];

      if (!count) return averages;

      const columnCount = values[0].length;
      for (let i = 0; i < columnCount; i++) {
        let sum = 0, valid = 0;
        for (let j = 0; j < count; j++) {
          const val = parseFloat(values[j][i]);
          if (!isNaN(val)) {
            sum += val;
            valid++;
          }
        }

        const avg = valid ? (sum / valid).toFixed(2) : "—";
        averages.push(key === "ratios" ? avg : avg + "%");
      }

      return averages;
    }

    // 🧩 Render peer table with optional average row
    function renderPeerTable(container, peers, key, labels) {
      const expectedCount = labels.length;
      const showAverage = key !== "ranks";
      const averages = showAverage ? calculateCategoryAverages(peers, key) : [];

      container.innerHTML = `
    <table class="metrics-table peer-comparison">
      <thead>
        <tr>
          <th>Fund Name</th>
          ${labels.map(label => `<th>${label}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${peers.map(p => {
        const cells = Array.isArray(p[key]) ? [...p[key]] : [];
        while (cells.length < expectedCount) cells.push("—");

        const rowCells = cells.map((val, i) => {
          const fundVal = parseFloat(val);
          const avgVal = parseFloat(averages[i]);
          let diffClass = "";

          if (showAverage && !isNaN(fundVal) && !isNaN(avgVal)) {
            if (key === "ratios") {
              const label = labels[i]?.toLowerCase().replace(/[^a-z]/g, "");
              const lowerIsBetter = ["stddev", "beta"].includes(label);

              diffClass = lowerIsBetter
                ? (fundVal < avgVal ? "positive" : "negative")
                : (fundVal > avgVal ? "positive" : "negative");
            } else {
              diffClass = fundVal > avgVal ? "positive" : fundVal < avgVal ? "negative" : "";
            }
          }

          return `<td><span class="${diffClass}">${val || "—"}</span></td>`;
        }).join("");

        return `
            <tr class="${p.isSelected ? 'selected-fund' : ''}">
              <td><div class="nowrap-cell" title="${p.name}">${p.name}</div></td>
              ${rowCells}
            </tr>
          `;
      }).join("")}

        ${showAverage ? `
          <tr class="category-average">
            <td>Category Average</td>
            ${averages.map(val => `<td>${val}</td>`).join("")}
          </tr>
        ` : ""}
      </tbody>
    </table>
  `;
    }


    // 📋 Render comparison table
    function renderTable(timeLabels, fundValues, categoryValues) {
      const tbody = document.getElementById("metrics-table-body");
      tbody.innerHTML = "";

      timeLabels.forEach((label, i) => {
        const fund = fundValues[i] != null ? `${fundValues[i].toFixed(2)}%` : "—";
        const category = categoryValues[i] != null ? `${categoryValues[i].toFixed(2)}%` : "—";
        const row = document.createElement("tr");
        row.innerHTML = `<td>${label}</td><td>${fund}</td><td>${category}</td>`;
        tbody.appendChild(row);
      });
    }

    // 🧾 Render metric cards
    function renderCards(timeLabels, fundValues, categoryValues) {
      cardContainer.innerHTML = "";

      timeLabels.forEach((label, i) => {
        const fund = fundValues[i] != null ? `${fundValues[i].toFixed(2)}%` : "—";
        const category = categoryValues[i] != null ? `${categoryValues[i].toFixed(2)}%` : "—";

        const card = document.createElement("div");
        card.className = "metric-card";
        card.innerHTML = `
          <div class="label">${label} Return</div>
          <div class="values">
            <span class="fund">${fund}</span> vs <span class="category">${category}</span>
          </div>
        `;
        cardContainer.appendChild(card);
      });
    }

    // 📈 Update chart and comparison views
    function updateChart(row) {
      const timeLabels = ['1W', '1M', '3M', '6M', 'YTD', '1Y', '2Y', '3Y', '5Y', '10Y'];
      const fundValues = Array.from({ length: 10 }, (_, i) => {
        const raw = row[5 + i];
        const num = parseFloat(raw);
        return isNaN(num) ? null : num;
      });

      const rawCategory = row[2];
      const cleanedCategory = rawCategory.replace(/\*/g, "").replace(/ Fund$/i, "").trim();
      const fullCategoryValues = FundUtils.getCategoryAverages(data, header, cleanedCategory, timeLabels, true);
      const categoryValues = fullCategoryValues.slice(1, 11); // skip AUM

      if (!Array.isArray(categoryValues) || categoryValues.length !== 10) {
        console.warn("Category averages missing or malformed for:", row[0]);
        return;
      }

      fundVsCategoryChart.data.labels = timeLabels;
      fundVsCategoryChart.data.datasets[0].label = row[0];
      fundVsCategoryChart.data.datasets[0].data = fundValues;
      fundVsCategoryChart.data.datasets[1].data = categoryValues;
      fundVsCategoryChart.update();

      renderTable(timeLabels, fundValues, categoryValues);
      renderCards(timeLabels, fundValues, categoryValues);
    }

  })();
});
