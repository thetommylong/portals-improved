// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { modeFromPointerType, type PointerMode } from "./pointer";

export type { PointerMode } from "./pointer";
export { modeFromPointerType } from "./pointer";

function seedMode(): PointerMode {
  return window.matchMedia("(pointer: coarse)").matches ? "coarse" : "fine";
}

class PointerStore {
  mode = $state<PointerMode>(seedMode());
  #started = false;

  setMode(mode: PointerMode): void {
    if (this.mode !== mode) this.mode = mode;
    this.#syncRoot();
  }

  /** Idempotent: seed from `(pointer: coarse)`, then follow last pointerType. */
  start(): void {
    this.#syncRoot();
    if (this.#started) return;
    this.#started = true;

    const mq = window.matchMedia("(pointer: coarse)");
    mq.addEventListener("change", (e) => {
      this.setMode(e.matches ? "coarse" : "fine");
    });

    window.addEventListener(
      "pointerdown",
      (e) => {
        const next = modeFromPointerType(e.pointerType);
        if (next) this.setMode(next);
      },
      { passive: true, capture: true },
    );
  }

  #syncRoot(): void {
    const root = document.getElementById("fsp-qol-root");
    if (!root) return;
    root.dataset.pointerMode = this.mode;
  }
}

export const pointer = new PointerStore();
