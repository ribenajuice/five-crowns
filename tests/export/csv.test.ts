/**
 * `lib/export/csv.ts` — pure RFC 4180 encoding, no database involved.
 */

import { describe, expect, it } from "vitest";

import { buildCsv, csvField, csvRow, CSV_BOM } from "@/lib/export/csv";

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

describe("csvRow", () => {
  it("comma-joins fields with no trailing line ending", () => {
    expect(csvRow(["a", 1, true])).toBe("a,1,true");
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
