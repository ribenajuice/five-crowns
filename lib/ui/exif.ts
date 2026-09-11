/**
 * EXIF orientation, parsed by hand.
 *
 * `docs/PRD.md` criterion 7: `sheet-01` photographed portrait must appear
 * upright with no rotation needed, which means reading the orientation tag a
 * phone camera writes rather than assuming every photo arrives the right way
 * up. Pure and dependency-free — no image library, just the JPEG/TIFF byte
 * layout.
 *
 * JPEG: a sequence of markers starting `FFD8`. The orientation lives in the
 * `APP1` marker (`FFE1`) that carries an `Exif\0\0` block followed by a TIFF
 * header and an IFD (image file directory) of 12-byte entries. Tag `0x0112`
 * is orientation, values 1–8.
 */

/** No EXIF found, or nothing usable — treat the photo as already upright. */
export const DEFAULT_ORIENTATION = 1;

const APP1_MARKER = 0xe1;
const START_OF_SCAN_MARKER = 0xda;
const ORIENTATION_TAG = 0x0112;

export function parseJpegOrientation(buffer: ArrayBuffer): number {
  if (buffer.byteLength < 4) return DEFAULT_ORIENTATION;
  const view = new DataView(buffer);
  if (view.getUint16(0) !== 0xffd8) return DEFAULT_ORIENTATION;

  let offset = 2;
  while (offset + 4 <= view.byteLength) {
    if (view.getUint8(offset) !== 0xff) break;
    const marker = view.getUint8(offset + 1);

    // Markers with no length-prefixed payload: SOI, EOI, TEM, RSTn.
    if (
      marker === 0xd8 ||
      marker === 0xd9 ||
      marker === 0x01 ||
      (marker >= 0xd0 && marker <= 0xd7)
    ) {
      offset += 2;
      continue;
    }

    const length = view.getUint16(offset + 2);
    if (marker === APP1_MARKER) {
      const orientation = readExifOrientation(view, offset + 4, length - 2);
      if (orientation !== null) return orientation;
    }

    // Compressed image data follows; no more markers worth reading.
    if (marker === START_OF_SCAN_MARKER) break;

    offset += 2 + length;
  }

  return DEFAULT_ORIENTATION;
}

function readExifOrientation(
  view: DataView,
  segmentStart: number,
  segmentLength: number,
): number | null {
  if (segmentLength < 8 || segmentStart + 6 > view.byteLength) return null;

  // "Exif\0\0"
  const signature = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00];
  for (let i = 0; i < signature.length; i += 1) {
    if (view.getUint8(segmentStart + i) !== signature[i]) return null;
  }

  const tiffStart = segmentStart + 6;
  if (tiffStart + 8 > view.byteLength) return null;

  const byteOrderMark = view.getUint16(tiffStart);
  const little = byteOrderMark === 0x4949; // "II"
  if (!little && byteOrderMark !== 0x4d4d) return null; // not "MM" either

  const ifdOffset = view.getUint32(tiffStart + 4, little);
  const ifdStart = tiffStart + ifdOffset;
  if (ifdStart + 2 > view.byteLength) return null;

  const entryCount = view.getUint16(ifdStart, little);
  for (let i = 0; i < entryCount; i += 1) {
    const entryStart = ifdStart + 2 + i * 12;
    if (entryStart + 12 > view.byteLength) break;

    const tag = view.getUint16(entryStart, little);
    if (tag === ORIENTATION_TAG) {
      const value = view.getUint16(entryStart + 8, little);
      return value >= 1 && value <= 8 ? value : null;
    }
  }

  return null;
}
