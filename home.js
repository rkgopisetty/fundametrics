(async () => {
    const data = await window.FundUtils.loadFreshData();
    if (!data || data.length < 6) return;

    const startRow = 1; // Skip header row
    const endRow = 5;
    console.log("Last few headers:", data[0].slice(26, 41));

    // 🇮🇳 Indian Market Table (AF to AI = 30 to 33)
    const indianStartCol = 31;
    const indianEndCol = 35;
    const indianHeader = data[0].slice(indianStartCol, indianEndCol);
    const indianSlice = data.slice(startRow, endRow).map(row => row.slice(indianStartCol, indianEndCol));

    document.getElementById("homepage-fund-slice").innerHTML = `
  <table>
    <thead><tr>${indianHeader.map(h => `<th>${h || "—"}</th>`).join("")}</tr></thead>
    <tbody>
      ${indianSlice.map(row => `<tr>${row.map((cell, colIndex) => {
        const cleaned = cell?.replace(/\(.*?\)/g, "").trim();
        const value = parseFloat(cleaned?.replace(/[^0-9.-]/g, ""));
        let color = "";

        // Apply color to Change (index 2) and %Chg (index 3)
        if (colIndex === 2 || colIndex === 3) {
            if (!isNaN(value)) {
                color = value > 0 ? "green" : value < 0 ? "red" : "";
            }
        }

        return `<td style="color:${color}">${cleaned || "—"}</td>`;
    }).join("")
        }</tr>`).join("")}
    </tbody>
  </table>
`;


    // 🌐 Global Market Table (AK to AN = 35 to 39)
    const globalStartCol = 36;
    const globalEndCol = 41;
    const globalHeader = data[0].slice(globalStartCol, globalEndCol);
    const globalSlice = data.slice(startRow, endRow).map(row => row.slice(globalStartCol, globalEndCol));

    document.getElementById("homepage-global-slice").innerHTML = `
  <table>
    <thead><tr>${globalHeader.map(h => `<th>${h || "—"}</th>`).join("")}</tr></thead>
    <tbody>
      ${globalSlice.map(row => `<tr>${row.map((cell, colIndex) => {
        const cleaned = cell?.replace(/\(.*?\)/g, "").trim();
        const value = parseFloat(cleaned?.replace(/[^0-9.-]/g, ""));
        let color = "";

        // Apply color to Change (index 2) and %Chg (index 3)
        if (colIndex === 2 || colIndex === 3) {
            if (!isNaN(value)) {
                color = value > 0 ? "green" : value < 0 ? "red" : "";
            }
        }

        return `<td style="color:${color}">${cleaned || "—"}</td>`;
    }).join("")
        }</tr>`).join("")}
    </tbody>
  </table>
`;

})();
