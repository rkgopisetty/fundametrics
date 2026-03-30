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

      // ⭐ Clean category mapping (HTML → Backend)
      const categoryMap = {
        LargeCap: "Large-Cap",
        MidCap: "Mid-Cap",
        SmallCap: "Small-Cap",
        MultiCap: "Multi-Cap",
        FlexiCap: "Flexi-Cap",
        Contra: "Contra"
      };

      // ⭐ Category descriptions
      const descriptions = {
        "Large-Cap": "Large-cap mutual funds invest in India’s top 100 companies by market capitalization—trusted household brands that most Indians interact with daily.",
        "Mid-Cap": "Mid-cap funds invest in medium-sized companies with high growth potential and moderate risk.",
        "Small-Cap": "Small-cap funds target emerging companies with aggressive growth strategies, often with higher volatility.",
        "Flexi-Cap": "Flexi-cap funds dynamically invest across large, mid, and small-cap segments, offering flexible exposure.",
        "Contra": "Contra funds follow a contrarian strategy, investing in undervalued sectors or stocks against prevailing market trends.",
        "Multi-Cap": "Multicap funds allocate at least 25% to large, mid, and small-cap stocks—offering balanced exposure across market segments."
      };

      // ⭐ Default Top Funds (1Y)
      renderDefaultTopFunds("1Y");

      // ============================================================
      // ⭐ FIXED: Default Time Toggle — isolated, safe
      // ============================================================
      document.querySelectorAll('#TopDefault-ranges button').forEach(button => {
        button.addEventListener('click', (e) => {
          e.stopPropagation();

          const rangeKey = button.dataset.range;

          document.querySelectorAll('#TopDefault-ranges button')
            .forEach(btn => btn.classList.remove('active'));

          button.classList.add('active');

          renderDefaultTopFunds(rangeKey);

          document.getElementById("TopDefault-section").classList.remove("hidden");
        });
      });

      // ============================================================
      // ⭐ Render Top 10 Across All Categories
      // ============================================================
      function renderDefaultTopFunds(rangeKey = "1Y") {
        const validFunds = fundData
          .filter(f => !isNaN(parseFloat(f[rangeKey])))
          .sort((a, b) => parseFloat(b[rangeKey]) - parseFloat(a[rangeKey]))
          .slice(0, 10);

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

        heading.innerHTML = `Top 10 Funds Across All Categories <span class="highlight-range">(${rangeLabels[rangeKey]})</span>`;

        tbody.innerHTML = "";
        thead.innerHTML = "";

        const headerRow = document.createElement("tr");
        const headers = [
          "Rank",
          "Scheme Name",
          "Category",
          "NAV",
          "Exp Ratio",
          "AUM (Cr)",
          "MStar Rating",
          "Up Cap",
          "Down Cap",
          `${rangeKey} Return ↓`
        ];

        headers.forEach(h => {
          const th = document.createElement("th");
          th.textContent = h;
          headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);

        validFunds.forEach((fund, index) => {
          const tr = document.createElement("tr");

          tr.innerHTML = `
            <td>
              <span class="medal-badge rank-${index + 1}">
                ${getMedal(index)}
              </span>
            </td>

            <td>${fund["Scheme Name"]}</td>
            <td>${fund["Category"]}</td>

            <td>${fund["NAV"] ?? "—"}</td>
            <td>${fund["Exp Ratio"] ? fund["Exp Ratio"] + "%" : "—"}</td>
            <td>₹${Number(fund["AuM (Cr)"]).toLocaleString()}</td>

            <td>${renderStars(fund["MStar Rating"])}</td>

            <td>${fund["Up Capture"] ? fund["Up Capture"] + "%" : "—"}</td>
            <td>${fund["Down Capture"] ? fund["Down Capture"] + "%" : "—"}</td>

            <td>${parseFloat(fund[rangeKey]).toFixed(2)}%</td>
          `;

          tbody.appendChild(tr);
        });
      }

      // ============================================================
      // ⭐ Category Card Click
      // ============================================================
      document.querySelectorAll(".category-card").forEach(card => {
        card.addEventListener("click", e => {
          e.preventDefault();

          const key = card.dataset.category;
          const backendCategory = categoryMap[key];

          document.querySelectorAll(".category-card").forEach(c => c.classList.remove("active"));
          card.classList.add("active");

          const descBox = document.getElementById("categoryDescription");
          descBox.textContent = descriptions[backendCategory] || "";
          descBox.style.display = "block";
          descBox.style.opacity = "1";

          document.querySelectorAll(".fund-table").forEach(section => section.classList.add("hidden"));

          renderCategoryTable(key, "1Y");

          const section = document.getElementById(`${key}-section`);
          if (section) {
            section.classList.remove("hidden");
            section.scrollIntoView({ behavior: "smooth" });
          }

          document.getElementById("TopDefault-section")?.classList.add("hidden");
        });
      });

      // ============================================================
      // ⭐ FIXED: Category Time Toggles — explicit, safe
      // ============================================================
      const categoryKeys = ["FlexiCap", "MidCap", "SmallCap", "Contra", "MultiCap", "LargeCap"];

      categoryKeys.forEach(key => {
        const rangeContainer = document.getElementById(`${key}-ranges`);
        if (!rangeContainer) return;

        rangeContainer.querySelectorAll("button").forEach(button => {
          button.addEventListener("click", () => {
            const range = button.dataset.range;

            rangeContainer.querySelectorAll("button").forEach(btn => btn.classList.remove("active"));
            button.classList.add("active");

            renderCategoryTable(key, range);
          });
        });
      });

      // ============================================================
      // ⭐ Render Category Table
      // ============================================================
      function renderCategoryTable(key, rangeKey = "1Y") {
        const backendCategory = categoryMap[key];

        const heading = document.getElementById(`${key}-heading`);
        if (heading) {
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

          heading.innerHTML = `Top 10 Funds in ${backendCategory} <span class="highlight-range">(${rangeLabels[rangeKey]})</span>`;
        }

        const rows = fundData
          .filter(f => f["Category"] === backendCategory && !isNaN(parseFloat(f[rangeKey])))
          .sort((a, b) => parseFloat(b[rangeKey]) - parseFloat(a[rangeKey]))
          .slice(0, 10);

        const tbody = document.getElementById(`${key}-table`);
        const thead = document.getElementById(`${key}-thead`);

        if (!tbody || !thead) return;

        tbody.innerHTML = "";
        thead.innerHTML = "";

        const headerRow = document.createElement("tr");
        const headers = [
          "Rank",
          "Scheme Name",
          "Category",
          "NAV",
          "Exp Ratio",
          "AUM (Cr)",
          "MStar Rating",
          "Up Cap",
          "Down Cap",
          `${rangeKey} Return ↓`
        ];

        headers.forEach(h => {
          const th = document.createElement("th");
          th.textContent = h;
          headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);

        rows.forEach((fund, index) => {
          const tr = document.createElement("tr");

          tr.innerHTML = `
            <td>
              <span class="medal-badge rank-${index + 1}">
                ${getMedal(index)}
              </span>
            </td>

            <td>${fund["Scheme Name"]}</td>
            <td>${fund["Category"]}</td>

            <td>${fund["NAV"] ?? "—"}</td>
            <td>${fund["Exp Ratio"] ? fund["Exp Ratio"] + "%" : "—"}</td>
            <td>₹${Number(fund["AuM (Cr)"]).toLocaleString()}</td>

            <td>${renderStars(fund["MStar Rating"])}</td>

            <td>${fund["Up Capture"] ? fund["Up Capture"] + "%" : "—"}</td>
            <td>${fund["Down Capture"] ? fund["Down Capture"] + "%" : "—"}</td>

            <td>${parseFloat(fund[rangeKey]).toFixed(2)}%</td>
          `;

          tbody.appendChild(tr);
        });
      }

      // ============================================================
      // ⭐ Helpers
      // ============================================================
      function getMedal(index) {
        const medals = ["🥇", "🥈", "🥉"];
        return medals[index] || index + 1;
      }

      function renderStars(rating) {
        const r = Number(rating);
        if (isNaN(r)) return "—";

        let html = "";
        for (let i = 1; i <= 5; i++) {
          html += `<span class="star ${i <= r ? "filled" : "empty"}">★</span>`;
        }
        return html;
      }

    })
    .catch(err => {
      console.error("❌ Failed to load fund data:", err);
    });
});
