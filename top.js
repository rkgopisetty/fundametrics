document.addEventListener("DOMContentLoaded", () => {
  FundUtils.loadFreshData()
    .then(fundData => {
      if (!Array.isArray(fundData) || fundData.length === 0) {
        const tableContainer = document.querySelector(".top-fund-tables");
        if (tableContainer) {
          tableContainer.innerHTML = `
            <p style="color:red; font-weight:bold;">
              No data available. Please visit the Explore Funds page first to load fund data.
            </p>`;
        }
        return;
      }

      const categoryMap = {
        LargeCap: "*Large Cap Fund*",
        MidCap: "*Mid Cap Fund*",
        SmallCap: "*Small Cap Fund*",
        FlexiCap: "*Flexi Cap Fund*",
        Contra: "*Contra Fund*",
        MultiCap: "*Multi Cap Fund*"
      };

      const descriptions = {
        LargeCap: "Large-cap mutual funds invest in India’s top 100 companies by market capitalization—trusted household brands that most Indians interact with daily.",
        MidCap: "Mid-cap funds invest in medium-sized companies with high growth potential and moderate risk.",
        SmallCap: "Small-cap funds target emerging companies with aggressive growth strategies, often with higher volatility.",
        FlexiCap: "Flexi-cap funds dynamically invest across large, mid, and small-cap segments, offering flexible exposure.",
        Contra: "Contra funds follow a contrarian strategy, investing in undervalued sectors or stocks against prevailing market trends.",
        MultiCap: "Multicap funds allocate at least 25% to large, mid, and small-cap stocks—offering balanced exposure across market segments."
      };

      const rangeColumnMap = {
        "1W": 5, "1M": 6, "3M": 7, "6M": 8, "YTD": 9,
        "1Y": 10, "2Y": 11, "3Y": 12, "5Y": 13, "10Y": 14
      };

      function getMedal(index) {
        const medals = ["🥇", "🥈", "🥉"];
        return medals[index] || index + 1;
      }

      // 🔥 Render default top funds (1Y)
      renderDefaultTopFunds("1Y");

      // ⏱️ Time toggle for TopDefault-section
      document.querySelectorAll('#TopDefault-ranges button').forEach(button => {
        button.addEventListener('click', () => {
          const rangeKey = button.dataset.range;

          document.querySelectorAll('#TopDefault-ranges button').forEach(btn => btn.classList.remove('active'));
          button.classList.add('active');

          renderDefaultTopFunds(rangeKey);
        });
      });

      function renderDefaultTopFunds(rangeKey = "1Y") {
        const colIndex = rangeColumnMap[rangeKey];
        if (colIndex === undefined) return;

        const validRows = fundData
          .filter((row, i) => i > 0 && !isNaN(parseFloat(row[colIndex])))
          .sort((a, b) => parseFloat(b[colIndex]) - parseFloat(a[colIndex]))
          .slice(0, 10)
          .map(row => {
            const newRow = [...row];
            newRow[10] = row[colIndex];
            return newRow;
          });

        const tbody = document.getElementById("TopDefault-table");
        const thead = document.getElementById("TopDefault-thead");
        const heading = document.getElementById("TopDefault-heading");
        if (!tbody || !thead || !heading) return;

        const rangeLabels = {
          "1W": "1 Week",
          "1M": "1 Month",
          "3M": "3 Months",
          "6M": "6 Months",
          "YTD": "Year to Date",
          "1Y": "1 Year",
          "2Y": "2 Years",
          "3Y": "3 Years",
          "5Y": "5 Years",
          "10Y": "10 Years"
        };

        const readableRange = rangeLabels[rangeKey] || rangeKey;
        heading.innerHTML = `Top 10 Funds Across All Categories <span class="highlight-range">(${readableRange})</span>`;


        tbody.innerHTML = "";
        thead.innerHTML = "";

        const headerIndexes = [0, 1, 2, 3, 4, 10];
        const headerRow = document.createElement("tr");

        headerIndexes.forEach(i => {
          const th = document.createElement("th");
          th.dataset.index = i;
          th.textContent = i === 10 ? `${rangeKey} Return ↓` : fundData[0][i] || `Column ${i + 1}`;
          headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        renderSortedRows(validRows, tbody, headerIndexes);
      }

      document.querySelectorAll(".category-card").forEach(card => {
        card.addEventListener("click", e => {
          e.preventDefault();
          const key = card.dataset.category;

          document.querySelectorAll(".category-card").forEach(c => c.classList.remove("active"));
          card.classList.add("active");

          const descBox = document.getElementById("categoryDescription");
          if (descBox) {
            const description = descriptions[key];
            descBox.textContent = description || "";
            descBox.style.display = description ? "block" : "none";
            descBox.style.opacity = description ? "1" : "0";
          }

          document.querySelectorAll(".fund-table").forEach(section => section.classList.add("hidden"));
          document.querySelectorAll(".fund-table tbody").forEach(tbody => tbody.innerHTML = "");
          document.querySelectorAll(".fund-table thead").forEach(thead => thead.innerHTML = "");

          renderCategoryTable(key, "1Y");

          const section = document.getElementById(`${key}-section`);
          if (section) {
            section.classList.remove("hidden");
            section.scrollIntoView({ behavior: "smooth" });
          }

          document.getElementById("TopDefault-section")?.classList.add("hidden");
        });
      });

      document.querySelectorAll(".time-range-selector button").forEach(button => {
        button.addEventListener("click", () => {
          const range = button.dataset.range;
          const section = button.closest(".fund-table");
          const categoryKey = section.id.replace("-section", "");

          section.classList.remove("hidden");
          section.querySelectorAll("button").forEach(btn => btn.classList.remove("active"));
          button.classList.add("active");

          renderCategoryTable(categoryKey, range);
        });
      });

      function renderCategoryTable(key, rangeKey = "1Y") {
        const heading = document.getElementById(`${key}-heading`);
        if (heading) {
          const readableLabel = categoryMap[key].replace(/\*/g, "");
          const rangeLabels = {
            "1W": "1 Week",
            "1M": "1 Month",
            "3M": "3 Months",
            "6M": "6 Months",
            "YTD": "Year to Date",
            "1Y": "1 Year",
            "2Y": "2 Years",
            "3Y": "3 Years",
            "5Y": "5 Years",
            "10Y": "10 Years"
          };

          const readableRange = rangeLabels[rangeKey] || rangeKey;
          heading.innerHTML = `Top 10 Funds in ${readableLabel} <span class="highlight-range">(${readableRange})</span>`;


        }

        const rows = getFundDataForRange(key, rangeKey);
        const tbody = document.getElementById(`${key}-table`);
        const thead = document.getElementById(`${key}-thead`);
        if (!tbody || !thead || rows.length === 0) return;

        tbody.innerHTML = "";
        thead.innerHTML = "";

        const headerIndexes = [0, 1, 2, 3, 4, 10];
        const headerRow = document.createElement("tr");

        headerIndexes.forEach(i => {
          const th = document.createElement("th");
          th.dataset.index = i;
          th.textContent = i === 10 ? `${rangeKey} Return ↓` : fundData[0][i] || `Column ${i + 1}`;
          headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        renderSortedRows(rows, tbody, headerIndexes);
      }

      function getFundDataForRange(categoryKey, rangeKey) {
        const colIndex = rangeColumnMap[rangeKey];
        if (colIndex === undefined) return [];

        return fundData
          .filter(row => row[2] === categoryMap[categoryKey] && !isNaN(parseFloat(row[colIndex])))
          .sort((a, b) => parseFloat(b[colIndex]) - parseFloat(a[colIndex]))
          .slice(0, 10)
          .map(row => {
            const newRow = [...row];
            newRow[10] = row[colIndex];
            return newRow;
          });
      }

      function renderSortedRows(data, tbody, headerIndexes) {
        const crisilIndex = headerIndexes.includes(3) ? 3 : -1;

        data.forEach((row, rowIndex) => {
          const tr = document.createElement("tr");
          tr.className = rowIndex % 2 === 0 ? "even-row" : "odd-row";

          headerIndexes.forEach(i => {
            const td = document.createElement("td");
            td.dataset.index = i;

            if (i === crisilIndex) {
              const rating = parseInt(row[i]);
              td.innerHTML = isNaN(rating)
                ? '<span class="star empty">★</span>'.repeat(5)
                : FundUtils.renderCrisilStars(rating);
            } else if (i === 0) {
              const medal = getMedal(rowIndex);
              td.innerHTML = `<span class="medal-badge rank-${rowIndex + 1}">${medal}</span> ${row[i]}`;
            } else {
              td.textContent = i === 10
                ? `${parseFloat(row[i]).toFixed(2)}%`
                : row[i];
            }

            tr.appendChild(td);
          });

          tbody.appendChild(tr);
        });
      }

    })
    .catch(err => {
      console.error("❌ Failed to load fund data:", err);
    });
});
``