document.addEventListener("DOMContentLoaded", () => {
  (async function initDashboard() {
    console.log("🚀 Metrics page initializing…");

    // Load object-based data from global.js
    const data = await FundUtils.loadFreshData();
    console.log("📦 Loaded fund objects:", data);

    if (!Array.isArray(data) || data.length === 0) {
      console.warn("❌ No fund data available.");
      return;
    }

    // DOM elements
    const categorySelect = document.getElementById("categoryFilter");
    const fundSelect = document.getElementById("fundFilter");
    const fundIdentity = document.getElementById("fundIdentity");
    const viewSection = document.getElementById("view-section");
    const chartContainer = document.getElementById("chart-container");
    const comparisonWrapper = document.getElementById("comparison-wrapper");
    const toggleChartBtn = document.getElementById("toggle-chart");
    const toggleTableBtn = document.getElementById("toggle-table");
    const cardContainer = document.getElementById("card-container");
    const peerComparison = document.getElementById("peer-comparison");
    const peerReturns = document.getElementById("peer-returns");
    const peerRanks = document.getElementById("peer-ranks");
    const peerRatios = document.getElementById("peer-ratios");

    const fundLabel = document.querySelector('label[for="fundFilter"]');
    const categoryLabel = document.querySelector('label[for="categoryFilter"]');

    const timeFields = ["1W","1M","3M","6M","YTD","1Y","2Y","3Y","5Y","10Y"];
    const ratioFields = ["SD","Beta","Sharpe","Sortino","Treynor","Up Capture","Down Capture"];

    // ⭐ Restore peer tab toggle logic
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

    // Populate category dropdown
    FundUtils.populateCategoryFilter(
      data,
      "categoryFilter",
      filtered => {
        updateFundDropdown(filtered);
        viewSection.style.display = "none";
      }
    );

    // Update fund dropdown
    function updateFundDropdown(filtered) {
      const fundNames = FundUtils.getUniqueSorted(
        filtered.map(f => f["Scheme Name"])
      );

      fundSelect.innerHTML = "";
      fundSelect.appendChild(new Option("-- Choose a Fund --", ""));

      fundNames.forEach(name => {
        fundSelect.appendChild(new Option(name, name));
      });

      fundSelect.disabled = false;
    }

    // Chart initialization
    const ctx = document.getElementById("fundVsCategoryChart").getContext("2d");
    const fundVsCategoryChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: timeFields,
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

    // Fund selection
    fundSelect.addEventListener("change", () => {
      const selectedName = fundSelect.value;
      if (!selectedName) return;

      const fund = data.find(f => f["Scheme Name"] === selectedName);
      if (!fund) {
        console.warn("❌ Fund not found:", selectedName);
        return;
      }

      console.log("📌 Selected fund:", fund);

      const cleanedCategory = FundUtils.cleanCategoryName(fund["Category"]);

      renderIdentityCard(fund, cleanedCategory);
      updateChart(fund, cleanedCategory);
      renderPeerComparison(fund, cleanedCategory);

      viewSection.style.display = "block";
      peerComparison.style.display = "block";

     // Hide ONLY the fund dropdown after selecting a fund
fundSelect.style.display = "none";

// Keep labels visible
if (fundLabel) fundLabel.style.display = "inline-block";
if (categoryLabel) categoryLabel.style.display = "inline-block";

// Category dropdown should remain visible
categorySelect.style.display = "inline-block";

    });

    // Hover on Fund label should ONLY show fund dropdown
fundLabel.addEventListener("click", () => {
  fundSelect.style.display = "inline-block";

    });

    // Identity card renderer
    function renderIdentityCard(fund, cleanedCategory) {
      fundIdentity.style.display = "block";

      document.getElementById("fi-name").textContent = fund["Scheme Name"];
      document.getElementById("fi-category").textContent = fund["Category"];

      // 1W Change + Rank
      const oneW = fund["1W"] ?? "—";
      const oneWRank = fund["1W Rank"] ?? "—";
      const oneWCell = document.getElementById("fi-1w");
      oneWCell.innerHTML = `${oneW} <small>(Rank: ${oneWRank})</small>`;

      const num = parseFloat(oneW);
      oneWCell.classList.remove("change-positive","change-negative","change-neutral");
      if (!isNaN(num)) {
        oneWCell.classList.add(
          num > 0 ? "change-positive" :
          num < 0 ? "change-negative" :
          "change-neutral"
        );
      }

      // AUM
      document.getElementById("fi-aum").textContent =
        fund["AuM (Cr)"] != null ? `₹${Number(fund["AuM (Cr)"]).toLocaleString()} Cr` : "—";

      // NAV
      document.getElementById("fi-nav").textContent =
        fund["NAV"] != null ? `₹${fund["NAV"]}` : "—";

      // Expense Ratio
      document.getElementById("fi-exp").textContent =
        fund["Exp Ratio"] != null ? `${fund["Exp Ratio"]}%` : "—";

      // ⭐ MStar Rating (gold stars)
      const rating = Number(fund["MStar Rating"]);
      let starsHTML = "";
      for (let i = 1; i <= 5; i++) {
        starsHTML += `<span class="star ${i <= rating ? "filled" : "empty"}">★</span>`;
      }
      document.getElementById("fi-mstar").innerHTML = starsHTML;
    }

    // Chart + table update
    function updateChart(fund, cleanedCategory) {
      const fundValues = timeFields.map(f => {
        const num = parseFloat(fund[f]);
        return isNaN(num) ? null : num;
      });

      const categoryValues = FundUtils.getCategoryAverages(
        data,
        cleanedCategory,
        timeFields
      );

      fundVsCategoryChart.data.datasets[0].data = fundValues;
      fundVsCategoryChart.data.datasets[1].data = categoryValues;
      fundVsCategoryChart.update();

      renderTable(timeFields, fundValues, categoryValues);
      renderCards(timeFields, fundValues, categoryValues);
    }

    // Table renderer
    function renderTable(labels, fundValues, categoryValues) {
      const tbody = document.getElementById("metrics-table-body");
      tbody.innerHTML = "";

      labels.forEach((label, i) => {
        const fund = fundValues[i] != null ? `${fundValues[i].toFixed(2)}%` : "—";
        const cat = categoryValues[i] != null ? `${categoryValues[i].toFixed(2)}%` : "—";

        const row = document.createElement("tr");
        row.innerHTML = `<td>${label}</td><td>${fund}</td><td>${cat}</td>`;
        tbody.appendChild(row);
      });
    }

    // Cards renderer
    function renderCards(labels, fundValues, categoryValues) {
      cardContainer.innerHTML = "";

      labels.forEach((label, i) => {
        const fund = fundValues[i] != null ? `${fundValues[i].toFixed(2)}%` : "—";
        const cat = categoryValues[i] != null ? `${categoryValues[i].toFixed(2)}%` : "—";

        const card = document.createElement("div");
        card.className = "metric-card";
        card.innerHTML = `
          <div class="label">${label} Return</div>
          <div class="values">
            <span class="fund">${fund}</span> vs <span class="category">${cat}</span>
          </div>
        `;
        cardContainer.appendChild(card);
      });
    }

    // ⭐ Calculate category averages for peer table
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

    // ⭐ Peer comparison
    function renderPeerComparison(selectedFund, category) {
      const peers = data.filter(f => FundUtils.cleanCategoryName(f["Category"]) === category);

      const peerRows = peers.map(f => ({
        name: f["Scheme Name"],
        returns: timeFields.map(t => f[t] ?? "—"),
        ranks: timeFields.map(t => f[`${t} Rank`] ?? "—"),
        ratios: ratioFields.map(r => f[r] ?? "—"),
        oneY: parseFloat(f["1Y"]),
        isSelected: f["Scheme Name"] === selectedFund["Scheme Name"]
      }))
      .filter(p => !isNaN(p.oneY))
      .sort((a, b) => b.oneY - a.oneY);

      const topPeers = peerRows.slice(0, 4);
      if (!topPeers.some(p => p.isSelected)) {
        const selected = peerRows.find(p => p.isSelected);
        if (selected) topPeers.push(selected);
      }

      renderPeerTable(peerReturns, topPeers, "returns", timeFields);
      renderPeerTable(peerRanks, topPeers, "ranks", timeFields);
      renderPeerTable(peerRatios, topPeers, "ratios", ratioFields);
    }

    // ⭐ Render peer table with category average row
    function renderPeerTable(container, peers, key, labels) {
      const expectedCount = labels.length;
      const showAverage = key !== "ranks";
      const averages = showAverage ? calculateCategoryAverages(peers, key) : [];

      container.innerHTML = `
        <table class="metrics-table peer-comparison">
          <thead>
            <tr>
              <th>Fund Name</th>
              ${labels.map(l => `<th>${l}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${peers.map(p => {
              const cells = [...p[key]];
              while (cells.length < expectedCount) cells.push("—");

              const rowCells = cells.map((val, i) => {
                const fundVal = parseFloat(val);
                const avgVal = parseFloat(averages[i]);
                let diffClass = "";

                if (showAverage && !isNaN(fundVal) && !isNaN(avgVal)) {
                  if (key === "ratios") {
                    const label = labels[i]?.toLowerCase().replace(/[^a-z]/g, "");
                    const lowerIsBetter = ["sd","beta"].includes(label);

                    diffClass = lowerIsBetter
                      ? (fundVal < avgVal ? "positive" : "negative")
                      : (fundVal > avgVal ? "positive" : "negative");
                  } else {
                    diffClass = fundVal > avgVal ? "positive" : fundVal < avgVal ? "negative" : "";
                  }
                }

                return `<td><span class="${diffClass}">${val}</span></td>`;
              }).join("");

              return `
                <tr class="${p.isSelected ? 'selected-fund' : ''}">
                  <td>${p.name}</td>
                  ${rowCells}
                </tr>
              `;
            }).join("")}

            ${showAverage ? `
              <tr class="category-average">
                <td>Category Average</td>
                ${averages.map(v => `<td>${v}</td>`).join("")}
              </tr>
            ` : ""}
          </tbody>
        </table>
      `;
    }

    // Toggle chart/table
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

  })();
});
