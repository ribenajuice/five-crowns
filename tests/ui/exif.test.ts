import { describe, expect, it } from "vitest";

import { DEFAULT_ORIENTATION, parseJpegOrientation } from "@/lib/ui/exif";

/**
 * Builds a minimal JPEG buffer: SOI, an APP1/Exif segment carrying a single
 * Orientation entry, then EOI. Enough for {@link parseJpegOrientation} to
 * find what it's looking for without a real photo.
 */
function buildJpegWithOrientation(
  orientation: number,
  { littleEndian = true }: { littleEndian?: boolean } = {},
): ArrayBuffer {
  const little = littleEndian;

  // One IFD entry: tag(2) type(2) count(4) value/offset(4) = 12 bytes.
  const ifdEntryCount = 1;
  const ifd = new Uint8Array(2 + 12 + 4); // count + one entry + next-IFD offset
  const ifdView = new DataView(ifd.buffer);
  ifdView.setUint16(0, ifdEntryCount, little);
  ifdView.setUint16(2, 0x0112, little); // tag: Orientation
  ifdView.setUint16(4, 3, little); // type: SHORT
  ifdView.setUint32(6, 1, little); // count: 1
  ifdView.setUint16(10, orientation, little); // value (fits in 2 of the 4 bytes)
  ifdView.setUint32(14, 0, little); // next IFD offset: none

  const tiff = new Uint8Array(8 + ifd.length);
  const tiffView = new DataView(tiff.buffer);
  tiffView.setUint16(0, little ? 0x4949 : 0x4d4d, false);
  tiffView.setUint16(2, 42, little);
  tiffView.setUint32(4, 8, little); // IFD0 offset, right after the header
  tiff.set(ifd, 8);

  const exifHeader = new Uint8Array([0x45, 0x78, 0x69, 0x66, 0x00, 0x00]); // "Exif\0\0"
  const app1Payload = new Uint8Array(exifHeader.length + tiff.length);
  app1Payload.set(exifHeader, 0);
  app1Payload.set(tiff, exifHeader.length);

  const app1Length = app1Payload.length + 2; // length field includes itself
  const app1 = new Uint8Array(2 + 2 + app1Payload.length);
  const app1View = new DataView(app1.buffer);
  app1View.setUint8(0, 0xff);
  app1View.setUint8(1, 0xe1);
  app1View.setUint16(2, app1Length, false); // JPEG segment lengths are always big-endian
  app1.set(app1Payload, 4);

  const soi = new Uint8Array([0xff, 0xd8]);
  const eoi = new Uint8Array([0xff, 0xd9]);

  const out = new Uint8Array(soi.length + app1.length + eoi.length);
  out.set(soi, 0);
  out.set(app1, soi.length);
  out.set(eoi, soi.length + app1.length);
  return out.buffer;
}

describe("parseJpegOrientation", () => {
  it("defaults to 1 (upright) for a buffer with no JPEG signature", () => {
    expect(parseJpegOrientation(new ArrayBuffer(0))).toBe(DEFAULT_ORIENTATION);
    expect(parseJpegOrientation(new Uint8Array([1, 2, 3, 4]).buffer)).toBe(
      DEFAULT_ORIENTATION,
    );
  });

  it("defaults to 1 for a JPEG with no APP1/Exif segment", () => {
    const buffer = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]).buffer;
    expect(parseJpegOrientation(buffer)).toBe(DEFAULT_ORIENTATION);
  });

  for (const orientation of [1, 2, 3, 4, 5, 6, 7, 8]) {
    it(`reads orientation ${orientation} from a little-endian (Intel) TIFF header`, () => {
      const buffer = buildJpegWithOrientation(orientation, { littleEndian: true });
      expect(parseJpegOrientation(buffer)).toBe(orientation);
    });

    it(`reads orientation ${orientation} from a big-endian (Motorola) TIFF header`, () => {
      const buffer = buildJpegWithOrientation(orientation, { littleEndian: false });
      expect(parseJpegOrientation(buffer)).toBe(orientation);
    });
  }

  it("sheet-02 is the sideways case: orientation 6 means a 90° rotation is needed", () => {
    // Confirms the value this app actually cares about round-trips cleanly —
    // the PRD's "written along the long edge, photographed sideways" sheet.
    const buffer = buildJpegWithOrientation(6);
    expect(parseJpegOrientation(buffer)).toBe(6);
  });
});
