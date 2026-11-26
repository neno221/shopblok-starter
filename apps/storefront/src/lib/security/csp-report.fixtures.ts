// The two report formats with a token in each URL, shared by `csp-report.test.ts` and the route's
// test (a plain module, so importing them runs no test twice).

export const LEGACY = {
  "csp-report": {
    "document-uri": "https://shop.example.com/us/account/reset?token=abc#top",
    referrer: "https://mail.example.com/inbox?id=42",
    "violated-directive": "script-src-elem",
    "effective-directive": "script-src-elem",
    "original-policy": "default-src 'self'; report-uri /next/csp-report",
    disposition: "enforce",
    "blocked-uri": "https://evil.example.com/x.js?session=s3cret",
    "line-number": 12,
    "column-number": 7,
    "source-file": "https://shop.example.com/_next/static/chunks/a.js?v=1",
    "status-code": 200,
    "script-sample": "",
  },
};

export const REPORTING_API = [
  {
    type: "csp-violation",
    age: 10,
    url: "https://shop.example.com/us?code=123",
    user_agent: "Mozilla/5.0",
    body: {
      documentURL: "https://shop.example.com/us?code=123",
      referrer: "",
      blockedURL: "inline",
      effectiveDirective: "script-src-elem",
      originalPolicy: "default-src 'self'",
      sourceFile: "https://shop.example.com/us?code=123",
      sample: "alert(1)",
      disposition: "report",
      statusCode: 200,
      lineNumber: 3,
      columnNumber: 1,
    },
  },
  { type: "deprecation", url: "https://shop.example.com/", body: { id: "x" } },
];
