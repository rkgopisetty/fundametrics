exports.handler = async function () {
  try {
    // CHANGE THIS TO TEST ANY SCHEME
    const schemeCode = "FS0000HSH0"; // WhiteOak Midcap

    const BASE =
      "https://api.moneycontrol.com/swiftapi/v1/mutualfunds/getSchemeCollection?responseType=json&deviceType=W&collection=ALL&invType=Equity&invCategory=Mid-Cap";

    // Helper to fetch a single scheme from a tab
    const fetchSingle = async (tab) => {
      const url = `${BASE}&tab=${tab}&page=1&pageSize=200`;
      const res = await fetch(url);
      const json = await res.json();
      return json.data.schemeList.find((s) => s.schemeCode === schemeCode);
    };

    // Fetch all 3 datasets
    const returnsData = await fetchSingle("RETURNS");
    const riskData = await fetchSingle("RISK_RATIO");
    const snapshotData = await fetchSingle("SNAPSHOT");

    // Extract snapshot JSON
    const snap = snapshotData?.snapshot || {};

    // Build final merged object
    const trailing = returnsData?.trailingReturns || [];
    const getReturn = (freq) =>
      trailing.find((r) => r.frequency === freq)?.annualisedReturn ?? null;

    const rr = riskData?.riskRatioList?.[0] || {};

    const final = {
      Scheme: returnsData?.schemeName,
      Code: schemeCode,

      // Returns
      "1W": getReturn("1W"),
      "1M": getReturn("1M"),
      "3M": getReturn("3M"),
      "6M": getReturn("6M"),
      YTD: getReturn("YTD"),
      "1Y": getReturn("1Y"),
      "2Y": getReturn("2Y"),
      "3Y": getReturn("3Y"),
      "5Y": getReturn("5Y"),
      "10Y": getReturn("10Y"),
      INCEPTION: getReturn("INCEPTION"),

      // Risk ratios
      Beta: rr.beta ?? null,
      Sharpe: rr.sharpeRatio ?? null,
      Treynor: rr.treynorRatio ?? null,
      StdDev: rr.standardDeviation ?? null,
      Sortino: rr.sortino ?? null,
      UpCap: rr.upsideCaptureRatio ?? null,
      DownCap: rr.downsideCaptureRatio ?? null,

      // Snapshot
      NAV: snap.navValue ?? null,
      NAVDate: snap.navDate ?? null,
      AUM: snap.aum ?? null,
      ExpenseRatio: snap.expenseRatio ?? null,
      TurnoverRatio: snap.turnoverRatio ?? null,
      ExitLoad: snap.exitLoadRate ?? null,
      InceptionDate: snap.inceptionDate ?? null,

      // Rating + Rank
      Rating: snapshotData?.rating ?? null,
      Rank: snapshotData?.rank ?? null
    };

    return {
      statusCode: 200,
      body: JSON.stringify(
        {
          rawSnapshot: snapshotData,
          extractedSnapshot: snap,
          mergedFinal: final
        },
        null,
        2
      )
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
