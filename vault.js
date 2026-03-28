// 🔗 Import utilities from FundUtils
const {
  sheetID,
  apiKey,
  range,
  fetchFundData,
  saveToLocal,
  loadFromLocal,
  getUniqueSorted,
  renderCrisilStars,
  populateCategoryFilter
} = FundUtils;

// 🧠 Global state
let allRows = [];
let filteredRows = [];
let columnAverages = {};
let sortedColumn = null;
let sortAscending = true;

// 🎯 Columns to calculate averages and apply formatting
const targetColumns = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 25, 26, 27, 28, 29];
const maxColIndex = 29; // Restrict to AD

// 📋 Render full table: headers, section labels, averages, and fund rows
function renderTable(rows) {
  const thead = document.querySelector('#fundTable thead');
  const tbody = document.querySelector('#fundTable tbody');
  if (!thead || !tbody || !rows || rows.length < 2) return;

  thead.innerHTML = '';
  tbody.innerHTML = '';

  const header = rows[0].slice(0, maxColIndex + 1);
  const crisilIndex = header.indexOf("Crisil Rating");

  // 1️⃣ Column Header Row
  const headerRow = document.createElement('tr');
  header.forEach((label, i) => {
    const th = document.createElement('th');
    th.textContent = label;
    th.dataset.index = i;
    th.className = 'top-header';
    if (sortedColumn === i) {
      th.classList.add(sortAscending ? 'sorted-asc' : 'sorted-desc');
    }
    th.onclick = () => {
      sortedColumn = i;
      sortAscending = sortedColumn === i ? !sortAscending : true;
      sortTable(sortedColumn, sortAscending);
    };
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);

  // 2️⃣ Section Header Row
  const sectionRow = document.createElement('tr');
  sectionRow.className = 'section-header';
  header.forEach((_, index) => {
    const th = document.createElement('th');
    if (index <= 3) {
      th.className = 'blank-header';
    } else if (index >= 4 && index <= 14) {
      th.className = 'grouped-header returns-bg';
      if (index === 9) th.innerHTML = '<div class="group-label">Returns</div>';
    } else if (index >= 15 && index <= 24) {
      th.className = 'grouped-header ranks-bg';
      if (index === 19) th.innerHTML = '<div class="group-label">Ranks</div>';
    } else if (index >= 25 && index <= 29) {
      th.className = 'grouped-header ratios-bg';
      if (index === 27) th.innerHTML = '<div class="group-label">Ratios</div>';
    } else {
      th.className = 'grouped-header neutral-bg';
    }
    sectionRow.appendChild(th);
  });
  thead.appendChild(sectionRow);

  // 3️⃣ Category Average Row
  const avgRow = document.createElement('tr');
  avgRow.className = 'category-average';
  header.forEach((_, index) => {
    const th = document.createElement('th');
    if (index <= 3) {
      th.className = 'avg-blank';
    } else if (index === 4) {
      th.className = 'avg-start';
      th.innerHTML = `<strong>Cat. Avg:</strong>`;
    } else if (targetColumns.includes(index)) {
      th.className = 'avg-cell';
      th.innerHTML = `<span id="avg${index}">--</span>`;
    } else {
      th.className = 'avg-cell';
    }
    avgRow.appendChild(th);
  });
  thead.appendChild(avgRow);

  // 4️⃣ Fund Rows
  rows.slice(1).forEach((row, rowIndex) => {
    const tr = document.createElement('tr');
    tr.className = rowIndex % 2 === 0 ? 'even-row' : 'odd-row';
    row.slice(0, maxColIndex + 1).forEach((cell, colIndex) => {
      const td = document.createElement('td');
      td.innerHTML = (colIndex === crisilIndex && cell)
        ? renderCrisilStars(cell)
        : cell ?? '';
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  calculateAverages();
}

// 📐 Calculate category averages for target columns
function calculateAverages() {
  const selectedCategory = document.getElementById("categoryFilter")?.value;
  if (!selectedCategory || selectedCategory === "All Categories") {
    targetColumns.forEach(i => {
      const span = document.getElementById(`avg${i}`);
      if (span) span.textContent = "N/A";
    });
    return;
  }

  const rows = filteredRows.slice(1);
  const sums = {};
  const counts = {};
  columnAverages = {};

  targetColumns.forEach(i => {
    sums[i] = 0;
    counts[i] = 0;
  });

  rows.forEach(row => {
    targetColumns.forEach(i => {
      const raw = row[i]?.replace(/[^\d.-]/g, '').trim();
      const val = parseFloat(raw);
      if (!isNaN(val)) {
        sums[i] += val;
        counts[i]++;
      }
    });
  });

  targetColumns.forEach(i => {
    const avg = counts[i] > 0 ? sums[i] / counts[i] : null;
    columnAverages[i] = avg;
    const span = document.getElementById(`avg${i}`);
    if (span) {
      const isPercent = i >= 5 && i <= 14;
      span.textContent = avg !== null
        ? (isPercent ? avg.toFixed(2) + '%' : avg.toFixed(2))
        : 'N/A';
    }
  });

  applyConditionalFormatting();
}

// 🎨 Apply green/red formatting based on comparison with category average
function applyConditionalFormatting() {
  const rows = document.querySelectorAll('#fundTable tbody tr');
  rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    targetColumns.forEach(i => {
      if (i >= cells.length || i < 0) return;
      const cell = cells[i];
      const val = parseFloat(cell?.textContent.replace('%', ''));
      const avg = columnAverages[i];
      if (!isNaN(val) && avg !== undefined) {
        let isBetter;
        if (i === 25 || i === 26) {
          isBetter = val < avg;
        } else if (i === 27 || i === 28 || i === 29) {
          isBetter = val >= avg;
        } else {
          isBetter = val >= avg;
        }
        cell.style.color = isBetter ? 'green' : 'red';
        cell.style.fontWeight = 'bold';
      } else {
        cell.style.color = '';
        cell.style.fontWeight = '';
      }
    });
  });
}

// 🔀 Sort table by column index
function sortTable(index, ascending = false) {
  if (index > maxColIndex) return;
  const header = filteredRows[0];
  const data = filteredRows.slice(1);
  const isNumericColumn = data.every(row => {
    const raw = (row[index] || '').replace(/[^\d.-]/g, '').trim();
    return !isNaN(parseFloat(raw));
  });

  data.sort((a, b) => {
    const rawA = (a[index] || '').replace(/[^\d.-]/g, '').trim();
    const rawB = (b[index] || '').replace(/[^\d.-]/g, '').trim();
    const numA = parseFloat(rawA);
    const numB = parseFloat(rawB);
    const isValidA = !isNaN(numA);
    const isValidB = !isNaN(numB);
    if (!isValidA && !isValidB) return 0;
    if (!isValidA) return 1;
    if (!isValidB) return -1;
    return ascending ? numA - numB : numB - numA;
  });

  filteredRows = [header, ...data];
  renderTable(filteredRows);
}

// 🚀 Initialize vault view
function initVault() {
  const defaultLabel = "All Categories";

  const handleCategoryChange = updatedRows => {
    filteredRows = updatedRows;
    renderTable(filteredRows);
  };

  FundUtils.loadFreshData()
    .then(data => {
      if (!data || data.length < 2) {
        console.warn("⚠️ No valid data returned from sheet.");
        return;
      }

      allRows = data;
      filteredRows = allRows;

      renderTable(filteredRows);
      populateCategoryFilter(allRows, "categoryFilter", "Category Name", handleCategoryChange, defaultLabel);
      applyDropdownHighlighting();
    })
    .catch(err => {
      console.error("❌ Failed to load fund data:", err);
    });
}

// 📦 Run vault logic on page load
document.addEventListener("DOMContentLoaded", initVault);
