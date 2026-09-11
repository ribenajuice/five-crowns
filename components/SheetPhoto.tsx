"use client";

/**
 * `SheetPhoto` — docs/DESIGN-SYSTEM.md § Component inventory.
 *
 * The whole sheet photo, pinch-zoomable and pannable, built on pointer events
 * with no new dependency (PRD criterion 70, `docs/ARCHITECTURE.md` § "the
 * photo must be pinch-zoomable and pannable").
 */

import { useRef, useState } from "react";

const MIN_SCALE = 1;
const MAX_SCALE = 4;

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

export function SheetPhoto({
  url,
  alt,
  width,
  height,
}: {
  url: string;
  alt: string;
  width?: number | null;
  height?: number | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const panStart = useRef<{ x: number; y: number } | null>(null);
  const pinchStart = useRef<{ distance: number; scale: number } | null>(null);

  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });

  function clampPan(scale: number, x: number, y: number): { x: number; y: number } {
    const rect = containerRef.current?.getBoundingClientRect();
    const maxX = rect ? ((scale - 1) * rect.width) / 2 : 0;
    const maxY = rect ? ((scale - 1) * rect.height) / 2 : 0;
    return { x: clamp(x, -maxX, maxX), y: clamp(y, -maxY, maxY) };
  }

  function distanceBetween(a: { x: number; y: number }, b: { x: number; y: number }): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function onPointerDown(event: React.PointerEvent) {
    (event.target as Element).setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.current.size === 1) {
      panStart.current = { x: event.clientX - transform.x, y: event.clientY - transform.y };
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchStart.current = { distance: distanceBetween(a!, b!), scale: transform.scale };
    }
  }

  function onPointerMove(event: React.PointerEvent) {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.current.size === 2 && pinchStart.current) {
      const [a, b] = [...pointers.current.values()];
      const distance = distanceBetween(a!, b!);
      const nextScale = clamp(
        pinchStart.current.scale * (distance / pinchStart.current.distance),
        MIN_SCALE,
        MAX_SCALE,
      );
      setTransform((current) => ({ ...current, scale: nextScale, ...clampPan(nextScale, current.x, current.y) }));
      return;
    }

    if (pointers.current.size === 1 && panStart.current) {
      setTransform((current) => ({
        ...current,
        ...clampPan(current.scale, event.clientX - panStart.current!.x, event.clientY - panStart.current!.y),
      }));
    }
  }

  function endPointer(event: React.PointerEvent) {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
    if (pointers.current.size === 0) panStart.current = null;
  }

  function onWheel(event: React.WheelEvent) {
    event.preventDefault();
    setTransform((current) => {
      const nextScale = clamp(current.scale - event.deltaY * 0.0015, MIN_SCALE, MAX_SCALE);
      return { scale: nextScale, ...clampPan(nextScale, current.x, current.y) };
    });
  }

  function onDoubleClick() {
    setTransform((current) => (current.scale > 1 ? { scale: 1, x: 0, y: 0 } : { scale: 2.5, x: 0, y: 0 }));
  }

  return (
    <div
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onWheel={onWheel}
      onDoubleClick={onDoubleClick}
      className="relative touch-none select-none overflow-hidden rounded-[var(--radius)] border border-line bg-sunk"
      style={{ aspectRatio: width && height ? `${width} / ${height}` : "3 / 4" }}
      role="img"
      aria-label={`${alt}. Pinch or scroll to zoom, drag to pan, double-tap to reset.`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full object-contain"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: "center center",
        }}
      />
    </div>
  );
}
