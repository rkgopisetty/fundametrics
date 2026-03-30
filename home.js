(async () => {
  // Load index data (Indian + US merged)
  const indices = await window.FundUtils.loadIndexData();
  if (!indices || indices.length === 0) {
    console.warn("No index data found");
    return;
  }

  // Define which indices belong to which table
  const indianList = [
    "NIFTY 50",
    "SENSEX",
    "NIFTY BANK",
    "NIFTY IT"
    // NIFTY Auto excluded
  ];

  const globalList = [
    "DOW JONES",
    "NASDAQ",
    "S&P 500",
    "USD INDEX"
  ];

  const indianIndices = indices.filter(i => indianList.includes(i["Index"]));
  const globalIndices = indices.filter(i => globalList.includes(i["Index"]));

  function renderTable(targetId, rows) {
    const headers = ["Index", "Price", "Change", "%Chg"];

    document.getElementById(targetId).innerHTML = `
      <table>
        <thead>
          <tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows.map(row => {
            const change = parseFloat(row["Change"]);
            const pct = parseFloat(row["%Chg"]);

            const changeColor = isNaN(change) ? "" : change > 0 ? "green" : "red";
            const pctColor = isNaN(pct) ? "" : pct > 0 ? "green" : "red";

            return `
              <tr>
                <td>${row["Index"]}</td>
                <td>${row["Price"]}</td>
                <td style="color:${changeColor}">${row["Change"]}</td>
                <td style="color:${pctColor}">${row["%Chg"]}</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    `;
  }

  renderTable("homepage-fund-slice", indianIndices);
  renderTable("homepage-global-slice", globalIndices);
})();
