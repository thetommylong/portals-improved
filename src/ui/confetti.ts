// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

const COLORS = ["#89b4fa", "#a6e3a1", "#f9e2af", "#f5c2e7", "#cba6f7", "#94e2d5"];

/** Short burst. Pass `host` to stack under a sibling (e.g. overview panel). */
export function burstConfetti(x: number, y: number, host?: HTMLElement): void {
  const doc =
    typeof unsafeWindow !== "undefined" ? unsafeWindow.document : document;
  const win = doc.defaultView ?? window;
  if (win.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const dpr = win.devicePixelRatio || 1;
  const w = win.innerWidth;
  const h = win.innerHeight;
  const canvas = doc.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    zIndex: host ? "0" : "2147483646",
  });
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(dpr, dpr);

  const parts = Array.from({ length: 48 }, (_, i) => {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.2 * Math.PI;
    const s = 4 + Math.random() * 8;
    return {
      x: x + (Math.random() - 0.5) * 20,
      y: y + (Math.random() - 0.5) * 10,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 2,
      w: 4 + Math.random() * 4,
      h: 6 + Math.random() * 6,
      rot: Math.random() * 6,
      vr: (Math.random() - 0.5) * 0.3,
      color: COLORS[i % COLORS.length]!,
      life: 1,
    };
  });

  (host ?? doc.getElementById("fsp-qol-root") ?? doc.body).append(canvas);

  let n = 0;
  const tick = () => {
    n += 1;
    ctx.clearRect(0, 0, w, h);
    let live = 0;
    for (const p of parts) {
      if (p.life <= 0) continue;
      live += 1;
      p.vx *= 0.985;
      p.vy = p.vy * 0.985 + 0.22;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life -= 0.016;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (live && n < 160) win.requestAnimationFrame(tick);
    else canvas.remove();
  };
  win.requestAnimationFrame(tick);
}
