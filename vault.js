// 🔗 Import utilities from FundUtils
const {
  loadFreshData,
  populateCategoryFilter,
  renderCrisilStars,
  cleanCategoryName
} = FundUtils;

// ------------------------------
// ⭐ FIELD GROUPS (NEW SCHEMA)
// ------------------------------
const LEFT_FIELDS = [
  "Scheme Name",
  "Category",
  "MStar Rating",
  "NAV",
  "Exp Ratio",
  "AuM (Cr)"
];

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

const ALL_FIELDS = [
  ...LEFT_FIELDS,
  ...RETURN_FIELDS,
  ...RANK_FIELDS,
  ...RATIO_FIELDS
];

// ------------------------------
// ⭐ GLOBAL STATE
// ------------------------------
let allFunds = [];
let filteredFunds = [];
let sortedField = null;
let sortAscending = true;

// ------------------------------
// ⭐ RENDER TABLE
// ------------------------------
function renderTable(funds) {
  const thead = document.querySelector("#fundTable thead");
  const tbody = document.querySelector("#fundTable tbody");

  thead.innerHTML = "";
  tbody.innerHTML = "";

  // ------------------------------
  // 1️⃣ HEADER ROW (column labels)
  // ------------------------------
  const headerRow = document.createElement("tr");

  ALL_FIELDS.forEach(field => {
    const th = document.createElement("th");

    // Display label overrides
    let label = field;

    // Remove "Rank"
    if (RANK_FIELDS.includes(field)) {
      label = field.replace(" Rank", "");
    }

    // Shorten ratio labels
    if (field === "Up Capture") label = "Up Cap";
    if (field === "Down Capture") label = "Down Cap";

    th.textContent = label;
    th.className = "top-header";

    if (sortedField === field) {
      th.classList.add(sortAscending ? "sorted-asc" : "sorted-desc");
    }

    th.onclick = () => {
      sortedField = field;
      sortAscending = !sortAscending;
      sortTable();
    };

    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);

  // ------------------------------
  // 2️⃣ SECTION HEADER ROW (colspans)
  // ------------------------------
  const sectionRow = document.createElement("tr");
  sectionRow.className = "section-header";

  // Left section
  const leftTh = document.createElement("th");
  leftTh.colSpan = LEFT_FIELDS.length;
  leftTh.className = "blank-header";
  sectionRow.appendChild(leftTh);

  // Returns
  const returnsTh = document.createElement("th");
  returnsTh.colSpan = RETURN_FIELDS.length;
  returnsTh.className = "grouped-header returns-bg";
  returnsTh.innerHTML = `<span class="group-label">Returns</span>`;
  sectionRow.appendChild(returnsTh);

  // Ranks
  const ranksTh = document.createElement("th");
  ranksTh.colSpan = RANK_FIELDS.length;
  ranksTh.className = "grouped-header ranks-bg";
  ranksTh.innerHTML = `<span class="group-label">Ranks</span>`;
  sectionRow.appendChild(ranksTh);

  // Ratios
  const ratiosTh = document.createElement("th");
  ratiosTh.colSpan = RATIO_FIELDS.length;
  ratiosTh.className = "grouped-header ratios-bg";
  ratiosTh.innerHTML = `<span class="group-label">Ratios</span>`;
  sectionRow.appendChild(ratiosTh);

  thead.appendChild(sectionRow);

  // ------------------------------
  // 3️⃣ CATEGORY AVERAGE ROW
  // ------------------------------
  const avgRow = document.createElement("tr");
  avgRow.className = "category-average";

  ALL_FIELDS.forEach(field => {
    const th = document.createElement("th");

    if (LEFT_FIELDS.includes(field)) {
      th.innerHTML = field === "NAV" ? "<strong>Cat. Avg:</strong>" : "";
    } else if (RETURN_FIELDS.includes(field) || RATIO_FIELDS.includes(field)) {
      th.innerHTML = `<span id="avg-${field.replace(/\s+/g, '')}">--</span>`;
    }

    avgRow.appendChild(th);
  });

  thead.appendChild(avgRow);

  // ------------------------------
  // 4️⃣ FUND ROWS
  // ------------------------------
  funds.forEach((fund, rowIndex) => {
    const tr = document.createElement("tr");
    tr.className = rowIndex % 2 === 0 ? "even-row" : "odd-row";

    ALL_FIELDS.forEach(field => {
      const td = document.createElement("td");
      const value = fund[field] ?? "";

      if (field === "MStar Rating") {
        td.innerHTML = renderCrisilStars(value);
      } else {
        td.textContent = value;
      }

      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  calculateAverages();
}

// ------------------------------
// ⭐ SORTING
// ------------------------------
function sortTable() {
  filteredFunds.sort((a, b) => {
    const A = parseFloat((a[sortedField] || "").toString().replace(/[^\d.-]/g, ""));
    const B = parseFloat((b[sortedField] || "").toString().replace(/[^\d.-]/g, ""));

    if (isNaN(A) && isNaN(B)) return 0;
    if (isNaN(A)) return 1;
    if (isNaN(B)) return -1;

    return sortAscending ? A - B : B - A;
  });

  renderTable(filteredFunds);
}

// ------------------------------
// ⭐ CATEGORY AVERAGES
// ------------------------------
function calculateAverages() {
  const selected = document.getElementById("categoryFilter").value;

  if (!selected) {
    RETURN_FIELDS.concat(RATIO_FIELDS).forEach(field => {
      const span = document.getElementById(`avg-${field.replace(/\s+/g, '')}`);
      if (span) span.textContent = "--";
    });
    return;
  }

  const rows = filteredFunds;

  const sums = {};
  const counts = {};

  RETURN_FIELDS.concat(RATIO_FIELDS).forEach(field => {
    sums[field] = 0;
    counts[field] = 0;
  });

  rows.forEach(fund => {
    RETURN_FIELDS.concat(RATIO_FIELDS).forEach(field => {
      const raw = (fund[field] || "").toString().replace(/[^\d.-]/g, "");
      const val = parseFloat(raw);
      if (!isNaN(val)) {
        sums[field] += val;
        counts[field]++;
      }
    });
  });

  RETURN_FIELDS.concat(RATIO_FIELDS).forEach(field => {
    const avg = counts[field] ? (sums[field] / counts[field]) : null;
    const span = document.getElementById(`avg-${field.replace(/\s+/g, '')}`);
    if (span) span.textContent = avg !== null ? avg.toFixed(2) : "--";
  });
}

// ------------------------------
// ⭐ CATEGORY FILTER
// ------------------------------
function handleCategoryChange(updated) {
  filteredFunds = updated;
  renderTable(filteredFunds);
}

// ------------------------------
// ⭐ INIT
// ------------------------------
function initVault() {
  loadFreshData().then(funds => {
    allFunds = funds;
    filteredFunds = funds;

    renderTable(filteredFunds);

    populateCategoryFilter(
      allFunds,
      "categoryFilter",
      handleCategoryChange,
      "-- All Categories --"
    );
  });
}

document.addEventListener("DOMContentLoaded", initVault);
