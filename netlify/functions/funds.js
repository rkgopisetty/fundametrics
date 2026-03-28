exports.handler = async function (event) {
  try {
    // Correct category names (strict Moneycontrol values)
    const CATEGORY_MAP = {
      "midcap": "Mid-Cap",
      "smallcap": "Small-Cap",
      "largecap": "Large-Cap",
      "flexicap": "Flexi-Cap",
      "multicap": "Multi-Cap",
      "contra": "Contra"
    };

    // Read ?category= param
    const queryCategory = event.queryStringParameters?.category;
    const isAll = !queryCategory || queryCategory.toLowerCase() === "all";

    // Build list of categories to fetch
    const categoriesToFetch = isAll
      ? Object.values(CATEGORY_MAP)
      : [CATEGORY_MAP[queryCategory.toLowerCase()]];

    // If invalid category
    if (categoriesToFetch.includes(undefined)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid category" })
      };
    }

    // Safe JSON parser (prevents crashes)
    const safeFetchJSON = async (url) => {
      const res = await fetch(url);
      const text = await res.text();

      try {
        return JSON.parse(text);
      } catch (e) {
        console.log("Invalid JSON from:", url);
        console.log("Response snippet:", text.slice(0, 200));
        return null;
      }
    };

    // Fetch all pages for a tab
    const fetchAllPages = async (category, tab) => {
      // Flexi-Cap must NOT include schemePlan
      const schemePlanParam =
        category === "Flexi-Cap" ? "" : "&schemePlan=Direct+Plan";

      const BASE =
        `https://api.moneycontrol.com/swiftapi/v1/mutualfunds/getSchemeCollection` +
        `?responseType=json&deviceType=W&collection=ALL&invType=Equity` +
        `&invCategory=${category}${schemePlanParam}`;

      const firstJson = await safeFetchJSON(`${BASE}&tab=${tab}&page=1&pageSize=25`);
      if (!firstJson) return [];

      const totalSize = firstJson.data.page.totalSize;
      const pageSize = firstJson.data.page.pageSize;
      const totalPages = Math.ceil(totalSize / pageSize);

      let all = [...firstJson.data.schemeList];

      for (let p = 2; p <= totalPages; p++) {
        const json = await safeFetchJSON(`${BASE}&tab=${tab}&page=${p}&pageSize=${pageSize}`);
        if (!json) continue;
        all.push(...json.data.schemeList);
      }

      return all;
    };

    let finalData = [];

    // Loop through each category
    for (const category of categoriesToFetch) {
      console.log("Fetching category:", category);

      const [returnsSchemes, riskSchemes, snapshotSchemes] = await Promise.all([
        fetchAllPages(category, "RETURNS"),
        fetchAllPages(category, "RISK_RATIO"),
        fetchAllPages(category, "SNAPSHOT")
      ]);

      const riskByCode = new Map();
      riskSchemes.forEach((s) => riskByCode.set(s.schemeCode, s));

      const snapByCode = new Map();
      snapshotSchemes.forEach((s) => snapByCode.set(s.schemeCode, s));

      const merged = returnsSchemes.map((item) => {
        const trailing = item.trailingReturns || [];
        const getReturn = (freq) =>
          trailing.find((r) => r.frequency === freq)?.annualisedReturn ?? null;

        const risk = riskByCode.get(item.schemeCode);
        const rr = risk?.riskRatioList?.[0] || {};

        const snap = snapByCode.get(item.schemeCode);
        const s = snap?.snapshot || {};

        return {
          Category: category,
          Scheme: item.schemeName,
          Code: item.schemeCode,

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
          NAV: s.navValue ?? null,
          NAVDate: s.navDate ?? null,
          AUM: s.aum ?? null,
          ExpenseRatio: s.expenseRatio ?? null,
          TurnoverRatio: s.turnoverRatio ?? null,
          ExitLoad: s.exitLoadRate ?? null,
          InceptionDate: s.inceptionDate ?? null,

          // Rating + Rank
          Rating: snap?.rating ?? null,
          Rank: snap?.rank ?? null
        };
      });

      finalData.push(...merged);
    }

    return {
      statusCode: 200,
      body: JSON.stringify(finalData)
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
