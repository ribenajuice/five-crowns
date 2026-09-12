"use client";

/**
 * `PhotoCapture` — docs/DESIGN-SYSTEM.md § Component inventory.
 *
 * `<input type="file" accept="image/*" capture="environment">` opens the
 * phone camera directly (PRD criterion 6); "Choose a photo" is a paired,
 * equal-weight `ghost` button reaching the system picker, not a fallback.
 * Real `<button>`s trigger the (visually hidden but still in the DOM) file
 * inputs, so focus and the visible focus ring land on the control a keyboard
 * or screen-reader user actually interacts with.
 */

import { useRef } from "react";

import { buttonClasses } from "./Button";
import { CAMERA_BUTTON_LABEL, GALLERY_BUTTON_LABEL } from "@/lib/ui/copy";
import { CameraIcon } from "./icons";

export function PhotoCapture({ onFile }: { onFile: (file: File) => void }) {
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) onFile(file);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <button
        type="button"
        onClick={() => cameraInput.current?.click()}
        className={`${buttonClasses("primary")} gap-2`}
      >
        <CameraIcon />
        {CAMERA_BUTTON_LABEL}
      </button>
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        onChange={handleChange}
      />

      <button
        type="button"
        onClick={() => galleryInput.current?.click()}
        className={buttonClasses("ghost")}
      >
        {GALLERY_BUTTON_LABEL}
      </button>
      <input
        ref={galleryInput}
        type="file"
        accept="image/*"
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        onChange={handleChange}
      />
    </div>
  );
}
