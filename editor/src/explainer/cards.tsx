/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { Img, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Icon } from "./icons";
import { parseMarkup } from "./markup";
import { C, CARD_SHADOW, F, clamp01, easeOut } from "./theme";

// Todas las tarjetas se dibujan dentro de una <Sequence> que empieza cuando aparecen:
// `t` es el tiempo (s) desde su aparición y los `at` internos son relativos a ese instante.

type Box = { w: number; h: number };

const useAnim = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  /** Muelle con rebote que arranca en `at` (s). */
  const sp = (at: number, cfg: { damping?: number; stiffness?: number; mass?: number } = {}) =>
    spring({ frame: Math.round((t - at) * fps), fps, config: { damping: 14, stiffness: 180, mass: 0.7, ...cfg } });
  /** Progreso suave 0–1 entre dos instantes. */
  const ease = (a: number, b: number) => easeOut(clamp01((t - a) / Math.max(0.001, b - a)));
  return { t, fps, sp, ease };
};

const panel = (o: React.CSSProperties = {}): React.CSSProperties => ({
  background: C.card,
  borderRadius: 34,
  boxShadow: CARD_SHADOW,
  ...o,
});

const fmt = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

// ───────────────────────────────────────────────────────── Móvil

type PhoneProps = Box & {
  screen?: "doc" | "stars" | "image";
  heading?: string;
  title?: string;
  lines?: number;
  wave?: boolean;
  src?: string;
  caption?: string;
  label?: string;
  rating?: number;
  nfc?: boolean;
};

export const Phone: React.FC<PhoneProps> = ({ w, h, screen = "doc", heading, title, lines = 7, wave, src, caption, label, rating = 5, nfc }) => {
  const { t, sp, ease } = useAnim();
  const outer = Math.min(w, h) * 0.17;
  const widths = [100, 78, 94, 62, 88, 70, 84, 56];
  return (
    <div style={{ width: w, height: h, borderRadius: outer, background: "#0c0c0f", padding: 13, boxShadow: "0 34px 60px rgba(40,25,10,0.30), inset 0 0 0 3px #2b2b31" }}>
      <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: outer - 13, background: screen === "image" ? "#05060f" : C.card, overflow: "hidden" }}>
        {screen === "image" && src ? <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
        <div style={{ position: "absolute", top: 16, left: "50%", translate: "-50% 0", width: w * 0.34, height: 34, borderRadius: 20, background: "#0c0c0f", zIndex: 3 }} />

        {screen === "doc" ? (
          <div style={{ padding: "84px 34px 30px", display: "flex", flexDirection: "column", height: "100%", boxSizing: "border-box" }}>
            {heading ? <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 30, color: C.red, letterSpacing: "0.02em", textTransform: "uppercase" }}>{heading}</div> : null}
            {title ? <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 40, lineHeight: 1.12, color: C.ink, marginTop: 12 }}>{title}</div> : null}
            <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 17 }}>
              {Array.from({ length: lines }, (_, i) => (
                <div key={i} style={{ height: 15, borderRadius: 8, background: "#DDD9D0", width: `${widths[i % widths.length] * ease(0.5 + i * 0.1, 0.9 + i * 0.1)}%` }} />
              ))}
            </div>
            {wave ? (
              <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, height: 90 }}>
                {Array.from({ length: 24 }, (_, i) => {
                  const a = 0.28 + 0.72 * Math.abs(Math.sin(i * 1.7 + t * 8) * Math.cos(i * 0.6 + t * 3));
                  return <div key={i} style={{ width: 9, height: 84 * a * ease(1, 1.4), borderRadius: 5, background: C.red }} />;
                })}
              </div>
            ) : null}
          </div>
        ) : null}

        {screen === "stars" ? (
          <div style={{ padding: "86px 30px 30px", display: "flex", flexDirection: "column", alignItems: "center", height: "100%", boxSizing: "border-box", textAlign: "center" }}>
            {nfc ? (
              <div style={{ position: "relative", width: 110, height: 110, marginBottom: 8 }}>
                {[0, 1, 2].map((i) => {
                  const ph = (t * 0.9 + i / 3) % 1;
                  return <div key={i} style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `5px solid ${C.blue}`, opacity: (1 - ph) * 0.7, scale: String(0.35 + ph * 0.9) }} />;
                })}
                <div style={{ position: "absolute", inset: 30, borderRadius: "50%", background: C.blue, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="nfc" size={34} color="#fff" />
                </div>
              </div>
            ) : null}
            {title ? <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 40, lineHeight: 1.1, color: C.ink }}>{title}</div> : null}
            {label ? <div style={{ fontFamily: F.mono, fontSize: 22, color: C.mute, marginTop: 8 }}>{label}</div> : null}
            <div style={{ display: "flex", gap: 6, marginTop: 28 }}>
              {Array.from({ length: 5 }, (_, i) => {
                const filled = i < rating;
                const p = filled ? sp(0.7 + i * 0.2, { damping: 8 }) : 0;
                return (
                  <div key={i} style={{ position: "relative", width: 62, height: 62 }}>
                    <Icon name="star" size={62} color="#DAD6CC" />
                    <div style={{ position: "absolute", inset: 0, scale: String(0.3 + 0.7 * p), opacity: clamp01(p * 2) }}>
                      <Icon name="star" size={62} color="#F4B820" />
                    </div>
                  </div>
                );
              })}
            </div>
            {caption ? (
              <div style={{ marginTop: 30, padding: "18px 22px", background: "#F1EEE7", borderRadius: 22, fontFamily: F.sans, fontWeight: 500, fontSize: 28, lineHeight: 1.25, color: C.ink, opacity: ease(1.9, 2.3) }}>{caption}</div>
            ) : null}
            <div style={{ marginTop: "auto", width: "86%", padding: "16px 0", borderRadius: 40, background: C.red, color: "#fff", fontFamily: F.sans, fontWeight: 700, fontSize: 30, opacity: ease(2.4, 2.8), scale: String(0.9 + 0.1 * ease(2.4, 2.8)) }}>Publicar</div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

// ───────────────────────────────────────────────────────── Ventana de aplicación

type WindowProps = Box & {
  sidebar?: { label: string; active?: boolean; primary?: boolean }[];
  heading?: string;
  rows?: { label: string; value: string; icon?: string; ring?: boolean }[];
  files?: { icon: string; label: string; color?: string }[];
  ringSidebar?: string;
  /** Segundos hasta el primer aro rojo; los siguientes salen cada 0,5 s. */
  ringAt?: number;
};

export const AppWindow: React.FC<WindowProps> = ({ w, h, sidebar = [], heading, rows = [], files = [], ringSidebar, ringAt = 0.9 }) => {
  const { sp } = useAnim();
  let ringIdx = 0;
  const ring = (cond: boolean | undefined, base: React.CSSProperties, children: React.ReactNode) => {
    if (!cond) return <div style={base}>{children}</div>;
    const p = sp(ringAt + 0.5 * ringIdx++, { damping: 12 });
    return (
      <div style={{ ...base, position: "relative" }}>
        {children}
        <div style={{ position: "absolute", inset: -9, borderRadius: 24, border: `5px solid ${C.red}`, opacity: clamp01(p * 2), scale: String(1.25 - 0.25 * p) }} />
      </div>
    );
  };
  return (
    <div style={panel({ width: w, height: h, display: "flex", overflow: "hidden", borderRadius: 30 })}>
      <div style={{ width: 250, background: "#EFEBE2", padding: "26px 22px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", gap: 9, marginBottom: 6 }}>
          {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
            <div key={c} style={{ width: 16, height: 16, borderRadius: 8, background: c }} />
          ))}
        </div>
        {sidebar.map((s) => {
          const base: React.CSSProperties = {
            padding: "12px 18px",
            borderRadius: 14,
            fontFamily: F.sans,
            fontWeight: 700,
            fontSize: 34,
            color: s.primary ? "#fff" : s.active ? C.ink : C.mute,
            background: s.primary ? "#E0714E" : s.active ? "#fff" : "transparent",
            display: "flex",
            alignItems: "center",
            gap: 10,
          };
          return <React.Fragment key={s.label}>{ring(ringSidebar === s.label, base, <>{s.primary ? <Icon name="plus" size={30} color="#fff" /> : null}{s.label}</>)}</React.Fragment>;
        })}
      </div>
      <div style={{ flex: 1, padding: "30px 38px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 20 }}>
        {heading ? <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 48, color: C.ink }}>{heading}</div> : null}
        {rows.map((r) => (
          <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div style={{ width: 150, fontFamily: F.sans, fontWeight: 500, fontSize: 32, color: C.mute }}>{r.label}</div>
            {ring(r.ring, { display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", borderRadius: 16, background: "#F4F1EA", fontFamily: F.sans, fontWeight: 700, fontSize: 38, color: C.ink }, (
              <>
                {r.icon ? <Icon name={r.icon} size={36} color={r.icon === "folder" ? "#4D9DF0" : C.red} /> : null}
                {r.value}
              </>
            ))}
          </div>
        ))}
        {files.length ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "14px 30px", marginTop: 6 }}>
            {files.map((f, i) => {
              const p = sp(1.6 + i * 0.18);
              return (
                <div key={f.label} style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: F.sans, fontWeight: 700, fontSize: 32, color: C.ink, opacity: clamp01(p * 2), translate: `0px ${(1 - p) * 16}px` }}>
                  <Icon name={f.icon} size={32} color={f.color ?? C.mute} />
                  {f.label}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
};

// ───────────────────────────────────────────────────────── Escritorio (Finder)

type DesktopProps = Box & { menu?: string[]; folder?: string; rename?: string; thumbs?: number; thumbColors?: [string, string][] };

const CursorArrow: React.FC<{ size?: number }> = ({ size = 62 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block", filter: "drop-shadow(0 3px 3px rgba(0,0,0,.35))" }}>
    <path d="M5 2.5 19 11l-6.4 1.5 3.6 7-3.2 1.6-3.6-7L5 18.5z" fill="#101010" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);

export const Desktop: React.FC<DesktopProps> = ({ w, h, menu = ["Finder", "Archivo", "Edición", "Ver"], folder = "carpeta sin título", rename, thumbs = 0, thumbColors }) => {
  const { t, sp, ease } = useAnim();
  const fx = 110;
  const fy = 120;
  const cx = fx + 150 + (1 - ease(0.3, 1.1)) * (w - fx - 250);
  const cy = fy + 110 + (1 - ease(0.3, 1.1)) * (h - fy - 330);
  const click = sp(1.2, { damping: 8, stiffness: 300 });
  const typed = rename ? Math.floor(clamp01((t - 1.7) / Math.max(0.3, rename.length * 0.07)) * rename.length) : 0;
  const label = rename && t > 1.65 ? rename.slice(0, typed) + (Math.floor(t * 3) % 2 === 0 ? "▏" : " ") : folder;
  const palette = thumbColors ?? [["#2a3a8a", "#0d1033"], ["#7a3fb0", "#2b1352"], ["#1f6f8b", "#0a2433"], ["#c4553a", "#3a1410"]];
  return (
    <div style={{ width: w, height: h, borderRadius: 30, overflow: "hidden", boxShadow: CARD_SHADOW, background: "linear-gradient(135deg, #8EB1F2 0%, #B4A3EF 48%, #EDBDA7 100%)", position: "relative" }}>
      <div style={{ height: 56, background: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", gap: 34, padding: "0 26px", fontFamily: F.sans, fontSize: 26, color: C.ink }}>
        <div style={{ width: 18, height: 18, borderRadius: 9, background: C.ink }} />
        {menu.map((m, i) => (
          <span key={m} style={{ fontWeight: i === 0 ? 800 : 500 }}>{m}</span>
        ))}
      </div>
      <div style={{ position: "absolute", left: fx, top: fy, width: 300, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <svg width="250" height="190" viewBox="0 0 250 190">
          <path d="M8 34a16 16 0 0 1 16-16h66l22 22h114a16 16 0 0 1 16 16v108a16 16 0 0 1-16 16H24A16 16 0 0 1 8 164z" fill="#4D96EE" />
          <rect x="8" y="58" width="234" height="116" rx="16" fill="#79BDF9" />
          <rect x="8" y="58" width="234" height="22" rx="10" fill="#9ACDFB" opacity="0.7" />
        </svg>
        <div style={{ padding: "6px 18px", borderRadius: 12, background: "#2F6FEA", color: "#fff", fontFamily: F.sans, fontWeight: 600, fontSize: 34, whiteSpace: "pre", scale: String(1 + 0.04 * (1 - click)) }}>{label}</div>
      </div>
      {Array.from({ length: thumbs }, (_, i) => {
        const p = sp(2.4 + i * 0.16, { damping: 11 });
        const [a, b] = palette[i % palette.length];
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 400 + i * 120,
              top: 110 + (i % 2) * 36,
              width: 168,
              height: 300,
              borderRadius: 26,
              background: `linear-gradient(160deg, ${a}, ${b})`,
              border: "5px solid #0c0c0f",
              boxShadow: "0 18px 30px rgba(30,20,40,0.35)",
              rotate: `${(i - (thumbs - 1) / 2) * 7}deg`,
              scale: String(0.4 + 0.6 * p),
              opacity: clamp01(p * 2),
            }}
          >
            <div style={{ position: "absolute", top: 8, left: "50%", translate: "-50% 0", width: 56, height: 14, borderRadius: 8, background: "#0c0c0f" }} />
          </div>
        );
      })}
      <div style={{ position: "absolute", left: cx, top: cy, scale: String(1 - 0.18 * (1 - click) * (t > 1.2 && t < 1.5 ? 1 : 0)), opacity: ease(0.2, 0.4) }}>
        <CursorArrow />
      </div>
    </div>
  );
};

// ───────────────────────────────────────────────────────── Checklist

type ChecklistProps = Box & {
  title?: string;
  items: (string | { label: string; icon?: string })[];
  /** Cuántos elementos se marcan (por defecto, todos). */
  checked?: number;
  startAt?: number;
  every?: number;
  variant?: "tasks" | "bold";
};

export const Checklist: React.FC<ChecklistProps> = ({ w, h, title, items, checked, startAt = 0.7, every = 0.55, variant = "tasks" }) => {
  const { sp } = useAnim();
  const n = checked ?? items.length;
  const norm = items.map((it) => (typeof it === "string" ? { label: it, icon: undefined as string | undefined } : it));

  if (variant === "bold") {
    return (
      <div style={panel({ width: w, height: h, padding: "26px 30px", boxSizing: "border-box", borderRadius: 26 })}>
        {title ? <div style={{ fontFamily: F.mono, fontSize: 24, color: C.mute, marginBottom: 8, textTransform: "uppercase" }}>{title}</div> : null}
        {norm.map((it, i) => {
          const p = sp(startAt + i * every, { damping: 9, stiffness: 240 });
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, height: 64 }}>
              <div style={{ width: 46, height: 46, borderRadius: 23, background: C.red, display: "flex", alignItems: "center", justifyContent: "center", scale: String(i < n ? 0.3 + 0.7 * p : 1), opacity: i < n ? clamp01(p * 3) : 1, flexShrink: 0 }}>
                {i < n ? <Icon name="check" size={28} color="#fff" /> : null}
              </div>
              <div style={{ fontFamily: F.display, fontSize: 56, color: C.ink, textTransform: "uppercase", lineHeight: 1 }}>{it.label}</div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={panel({ width: w, height: h, padding: "26px 28px", boxSizing: "border-box", borderRadius: 30, display: "flex", flexDirection: "column" })}>
      {title ? <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 40, color: C.ink, marginBottom: 14 }}>{title}</div> : null}
      {norm.map((it, i) => {
        const p = sp(startAt + i * every, { damping: 9, stiffness: 240 });
        const done = i < n;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 18, height: 76 }}>
            {it.icon ? <Icon name={it.icon} size={34} color={C.mute} /> : null}
            <div style={{ flex: 1, fontFamily: F.sans, fontWeight: 700, fontSize: 38, color: C.ink }}>{it.label}</div>
            <div style={{ width: 54, height: 54, borderRadius: 27, border: `3px solid ${C.line}`, background: done ? C.red : "transparent", borderColor: done ? C.red : "rgba(20,20,20,0.14)", display: "flex", alignItems: "center", justifyContent: "center", scale: String(done ? 0.4 + 0.6 * p : 1) }}>
              {done ? <Icon name="check" size={30} color="#fff" /> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ───────────────────────────────────────────────────────── Instalador (barras de progreso)

type InstallerProps = Box & { title?: string; rows: { label: string; icon?: string; fill?: number }[]; every?: number };

export const Installer: React.FC<InstallerProps> = ({ w, h, title = "Preparando…", rows, every = 0.7 }) => {
  const { t, sp, ease } = useAnim();
  return (
    <div style={{ width: w, height: h, borderRadius: 30, background: "linear-gradient(180deg,#2a2725,#171413)", boxShadow: CARD_SHADOW, padding: "30px 32px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: F.sans, fontWeight: 600, fontSize: 32, color: "#fff" }}>
        <div style={{ width: 22, height: 22, borderRadius: 11, border: "4px solid #E8603C", borderTopColor: "transparent", rotate: `${t * 420}deg` }} />
        {title}
      </div>
      {rows.map((r, i) => {
        const start = 0.5 + i * every;
        const f = (r.fill ?? 1) * ease(start, start + 1.2);
        const done = f >= (r.fill ?? 1) - 0.001 && (r.fill ?? 1) >= 1;
        const p = sp(start + 1.2, { damping: 8 });
        return (
          <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 20, padding: "0 26px", flex: 1, borderRadius: 18, background: "rgba(255,255,255,0.07)" }}>
            <Icon name={r.icon ?? "doc"} size={38} color="#cfc9c2" />
            <div style={{ width: 210, fontFamily: F.sans, fontWeight: 800, fontSize: 46, color: "#fff" }}>{r.label}</div>
            <div style={{ flex: 1, height: 12, borderRadius: 6, background: "rgba(255,255,255,0.14)", overflow: "hidden" }}>
              <div style={{ width: `${f * 100}%`, height: "100%", background: "#E8603C", borderRadius: 6 }} />
            </div>
            <div style={{ width: 52, height: 52, borderRadius: 26, background: done ? "#E8603C" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", scale: String(done ? 0.4 + 0.6 * p : 1) }}>
              {done ? <Icon name="check" size={30} color="#fff" /> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ───────────────────────────────────────────────────────── Rejilla de pasos

type StepsProps = Box & { heading?: string; items: { n: number | string; title: string; sub?: string }[]; highlight?: number; highlightAt?: number; featured?: boolean };

export const Steps: React.FC<StepsProps> = ({ w, h, heading, items, highlight, highlightAt = 3, featured }) => {
  const { sp } = useAnim();
  const runs = heading ? parseMarkup(heading) : [];
  return (
    <div style={{ width: w, height: h, display: "flex", flexDirection: "column", gap: 22 }}>
      {heading ? (
        <div style={{ fontFamily: F.display, fontSize: 130, lineHeight: 1, textAlign: "center", color: C.ink, textTransform: "uppercase", scale: String(0.6 + 0.4 * sp(0.05)), opacity: clamp01(sp(0.05) * 2) }}>
          {runs.map((r, i) => (
            <span key={i} style={{ color: r.kind === "plain" ? C.ink : C.red }}>{r.text}</span>
          ))}
        </div>
      ) : null}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, flex: 1 }}>
        {items.map((it, i) => {
          const p = sp(0.3 + i * 0.1, { damping: 12 });
          const last = featured && i === items.length - 1;
          const hi = highlight === i ? sp(highlightAt, { damping: 12 }) : 0;
          return (
            <div
              key={i}
              style={{
                gridColumn: last ? "1 / span 2" : undefined,
                ...panel({ borderRadius: 24 }),
                display: "flex",
                alignItems: "center",
                gap: 20,
                padding: "0 24px",
                border: last || highlight === i ? `5px solid ${C.red}` : "5px solid transparent",
                outline: hi ? `0 solid ${C.red}` : undefined,
                scale: String((0.7 + 0.3 * p) * (1 + 0.04 * hi)),
                opacity: clamp01(p * 2),
              }}
            >
              <div style={{ width: 62, height: 62, borderRadius: 16, background: last ? C.red : C.ink, color: "#fff", fontFamily: F.display, fontSize: 40, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{it.n}</div>
              <div>
                <div style={{ fontFamily: last ? F.display : F.sans, fontWeight: 800, fontSize: last ? 54 : 38, color: last ? C.red : C.ink, lineHeight: 1.05, textTransform: last ? "uppercase" : undefined }}>{it.title}</div>
                {it.sub ? <div style={{ fontFamily: F.mono, fontSize: 22, color: C.mute, marginTop: 4 }}>{it.sub}</div> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ───────────────────────────────────────────────────────── Caja de texto (prompt)

type PromptProps = Box & { text: string; placeholder?: string; typeAt?: number; cps?: number; pasted?: { name: string; lines?: number } };

export const Prompt: React.FC<PromptProps> = ({ w, h, text, placeholder, typeAt = 0.6, cps = 16, pasted }) => {
  const { t, sp } = useAnim();
  const n = pasted ? text.length : Math.max(0, Math.floor((t - typeAt) * cps));
  const shown = text.slice(0, n);
  const caret = Math.floor(t * 2.4) % 2 === 0;
  const send = sp(typeAt + text.length / cps, { damping: 9 });
  return (
    <div style={panel({ width: w, height: h, padding: "30px 34px", boxSizing: "border-box", position: "relative", borderRadius: 30 })}>
      {pasted ? (
        <>
          <div style={{ fontFamily: F.sans, fontWeight: 500, fontSize: 31, lineHeight: 1.32, color: "#2a2723", opacity: clamp01(sp(typeAt) * 2) }}>{text}</div>
          <div style={{ position: "absolute", left: 34, bottom: 26, display: "flex", alignItems: "center", gap: 10, padding: "10px 18px", borderRadius: 14, background: "#EFEBE2", fontFamily: F.sans, fontWeight: 600, fontSize: 26, color: C.mute, opacity: clamp01(sp(typeAt + 0.3) * 2) }}>
            <Icon name="doc" size={26} color={C.mute} />
            Pegado · {pasted.lines ?? 52} líneas
          </div>
        </>
      ) : (
        <div style={{ fontFamily: F.sans, fontWeight: 500, fontSize: 46, lineHeight: 1.2, color: shown ? C.ink : "#9C968B" }}>
          {shown || placeholder}
          {caret ? <span style={{ color: C.ink }}>|</span> : null}
        </div>
      )}
      <div style={{ position: "absolute", right: 24, bottom: 24, width: 66, height: 66, borderRadius: 18, background: "#E0714E", display: "flex", alignItems: "center", justifyContent: "center", scale: String(pasted ? 1 : 0.85 + 0.15 * send) }}>
        <Icon name="up" size={36} color="#fff" />
      </div>
    </div>
  );
};

// ───────────────────────────────────────────────────────── Antes / Después

type BeforeAfterProps = Box & {
  before: { tag?: string; text: string };
  after: { tag?: string; text?: string; src?: string; gradient?: [string, string] };
};

export const BeforeAfter: React.FC<BeforeAfterProps> = ({ w, h, before, after }) => {
  const { sp, ease } = useAnim();
  const a = sp(0.1, { damping: 13 });
  const b = sp(0.9, { damping: 11 });
  const arrow = ease(0.5, 1.1);
  const tape = (txt: string, bg: string, rot: number): React.ReactElement => (
    <div style={{ position: "absolute", top: -26, left: 28, padding: "6px 22px", background: bg, fontFamily: F.display, fontSize: 40, color: "#fff", rotate: `${rot}deg`, letterSpacing: "0.03em" }}>{txt}</div>
  );
  const [g1, g2] = after.gradient ?? ["#26338f", "#080a2e"];
  return (
    <div style={{ width: w, height: h, position: "relative" }}>
      <div style={{ ...panel({ borderRadius: 18 }), position: "absolute", left: 10, top: 50, width: w * 0.4, height: h * 0.62, rotate: "-4deg", padding: "50px 30px 30px", boxSizing: "border-box", scale: String(0.7 + 0.3 * a), opacity: clamp01(a * 2) }}>
        {tape(before.tag ?? "ANTES", "#8B867C", -3)}
        <div style={{ fontFamily: F.sans, fontWeight: 600, fontSize: 38, lineHeight: 1.15, color: "#7A756B" }}>{before.text}</div>
        <div style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 16 }}>
          {[100, 82, 92].map((x, i) => (
            <div key={i} style={{ height: 14, borderRadius: 7, background: "#DAD6CD", width: `${x}%` }} />
          ))}
        </div>
      </div>
      <svg width={w} height={h} style={{ position: "absolute", inset: 0 }}>
        <path d={`M ${w * 0.38} ${h * 0.82} C ${w * 0.5} ${h * 0.98} ${w * 0.56} ${h * 0.88} ${w * 0.6} ${h * 0.72}`} stroke={C.red} strokeWidth="7" fill="none" strokeLinecap="round" strokeDasharray="1000" strokeDashoffset={1000 * (1 - arrow)} />
        <path d={`M ${w * 0.585} ${h * 0.76} L ${w * 0.6} ${h * 0.71} L ${w * 0.62} ${h * 0.765}`} stroke={C.red} strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={arrow > 0.95 ? 1 : 0} />
      </svg>
      <div style={{ ...panel({ borderRadius: 18 }), position: "absolute", right: 6, top: 0, width: w * 0.4, height: h * 0.74, padding: "48px 18px 18px", boxSizing: "border-box", scale: String(0.7 + 0.3 * b), opacity: clamp01(b * 2), rotate: "2deg" }}>
        {tape(after.tag ?? "DESPUÉS", C.red, 2)}
        <div style={{ width: "100%", height: "100%", borderRadius: 14, overflow: "hidden", background: `linear-gradient(160deg, ${g1}, ${g2})`, display: "flex", alignItems: "flex-end", padding: 18, boxSizing: "border-box" }}>
          {after.src ? <Img src={staticFile(after.src)} style={{ position: "absolute", inset: 18, width: "calc(100% - 36px)", height: "calc(100% - 66px)", objectFit: "cover", borderRadius: 14, top: 48 }} /> : null}
          {after.text ? <div style={{ position: "relative", fontFamily: F.sans, fontWeight: 700, fontSize: 34, color: "#fff", lineHeight: 1.15 }}>{after.text}</div> : null}
        </div>
        <div style={{ position: "absolute", right: -20, top: -20, width: 64, height: 64, borderRadius: 32, background: C.red, display: "flex", alignItems: "center", justifyContent: "center", scale: String(sp(1.6, { damping: 8 })), boxShadow: "0 8px 16px rgba(120,30,10,.35)" }}>
          <Icon name="check" size={38} color="#fff" />
        </div>
      </div>
    </div>
  );
};

// ───────────────────────────────────────────────────────── Perfil / canal

type ProfileProps = Box & { name: string; meta?: string; badge?: string; banner?: [string, string]; stats?: { icon?: string; label: string }[]; avatarIcon?: string };

export const Profile: React.FC<ProfileProps> = ({ w, h, name, meta, badge, banner = ["#0e7c86", "#14b8a6"], stats = [], avatarIcon = "play" }) => {
  const { sp } = useAnim();
  return (
    <div style={panel({ width: w, height: h, overflow: "visible", position: "relative", borderRadius: 30 })}>
      <div style={{ height: "34%", borderRadius: "30px 30px 0 0", background: `linear-gradient(120deg, ${banner[0]}, ${banner[1]})` }} />
      {badge ? (
        <div style={{ position: "absolute", right: -16, top: -22, padding: "8px 26px", background: C.red, color: "#fff", fontFamily: F.display, fontSize: 44, borderRadius: 10, rotate: "4deg", scale: String(sp(0.6, { damping: 9 })), boxShadow: "0 12px 20px rgba(120,30,10,.3)", textTransform: "uppercase" }}>{badge}</div>
      ) : null}
      <div style={{ position: "absolute", left: 34, top: "34%", translate: "0 -50%", width: 108, height: 108, borderRadius: 54, background: "#fff", border: `6px solid ${C.card}`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 18px rgba(0,0,0,.18)" }}>
        <Icon name={avatarIcon} size={56} color={C.red} />
      </div>
      <div style={{ padding: "78px 38px 0" }}>
        <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 48, color: C.ink }}>{name}</div>
        {meta ? <div style={{ fontFamily: F.mono, fontSize: 26, color: C.mute, marginTop: 6 }}>{meta}</div> : null}
        <div style={{ display: "flex", gap: 14, marginTop: 24, flexWrap: "wrap" }}>
          {stats.map((s, i) => {
            const p = sp(0.8 + i * 0.2);
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 30, background: "#EFEBE2", fontFamily: F.sans, fontWeight: 700, fontSize: 28, color: C.ink, scale: String(0.6 + 0.4 * p), opacity: clamp01(p * 2) }}>
                <Icon name={s.icon ?? "check"} size={26} color={C.green} />
                {s.label}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ───────────────────────────────────────────────────────── Contador

type CounterProps = Box & { value: number; from?: number; label?: string; note?: string; icon?: string; dur?: number };

export const Counter: React.FC<CounterProps> = ({ w, h, value, from = 0, label, note, icon = "eye", dur = 1.8 }) => {
  const { sp, ease } = useAnim();
  const v = from + (value - from) * ease(0.3, 0.3 + dur);
  const p = sp(0.05, { damping: 14 });
  return (
    <div style={{ width: w, height: h, position: "relative" }}>
      <div style={panel({ width: "100%", height: "100%", borderRadius: 30, display: "flex", alignItems: "center", justifyContent: "center", gap: 22, scale: String(0.8 + 0.2 * p), opacity: clamp01(p * 2) })}>
        <Icon name={icon} size={64} color={C.ink} />
        <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 96, color: C.ink, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }}>{fmt(v)}</div>
        {label ? <div style={{ fontFamily: F.sans, fontWeight: 500, fontSize: 36, color: C.mute, alignSelf: "flex-end", paddingBottom: 30 }}>{label}</div> : null}
      </div>
      {note ? (
        <div style={{ position: "absolute", left: 40, bottom: -34, display: "flex", alignItems: "center", gap: 10, padding: "10px 26px", borderRadius: 14, background: C.red, color: "#fff", fontFamily: F.sans, fontWeight: 700, fontSize: 36, scale: String(sp(1.9, { damping: 9 })), boxShadow: "0 12px 22px rgba(120,30,10,.28)" }}>
          <Icon name="check" size={32} color="#fff" />
          {note}
        </div>
      ) : null}
    </div>
  );
};

// ───────────────────────────────────────────────────────── Polaroids

type PolaroidsProps = Box & { items: { caption: string; src?: string; gradient?: [string, string]; tilt?: number }[] };

export const Polaroids: React.FC<PolaroidsProps> = ({ w, h, items }) => {
  const { sp } = useAnim();
  const each = (w - 40) / items.length;
  return (
    <div style={{ width: w, height: h, position: "relative" }}>
      {items.map((it, i) => {
        const p = sp(0.1 + i * 0.25, { damping: 11 });
        const [a, b] = it.gradient ?? ["#33406f", "#0d1130"];
        const pw = Math.min(each + 20, 460);
        return (
          <div key={i} style={{ position: "absolute", left: 20 + i * each + (each - pw) / 2, top: 20 + (i % 2) * 24, width: pw, height: h - 70, background: "#fff", padding: "20px 20px 0", boxSizing: "border-box", boxShadow: CARD_SHADOW, rotate: `${(it.tilt ?? (i % 2 ? 3 : -3)) * 1}deg`, scale: String(0.6 + 0.4 * p), opacity: clamp01(p * 2), borderRadius: 6 }}>
            <div style={{ position: "absolute", top: -14, left: "50%", translate: "-50% 0", width: 34, height: 34, borderRadius: 17, background: "radial-gradient(circle at 35% 30%, #ff7a6a, #c3281a)", boxShadow: "0 5px 8px rgba(0,0,0,.3)" }} />
            <div style={{ width: "100%", height: "74%", background: `linear-gradient(160deg, ${a}, ${b})`, overflow: "hidden" }}>
              {it.src ? <Img src={staticFile(it.src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
            </div>
            <div style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 50, color: C.ink, textAlign: "center", marginTop: 14 }}>{it.caption}</div>
          </div>
        );
      })}
    </div>
  );
};

// ───────────────────────────────────────────────────────── Nota pequeña

type CalloutProps = Box & { title: string; sub?: string };

export const Callout: React.FC<CalloutProps> = ({ w, h, title, sub }) => (
  <div style={panel({ width: w, height: h, padding: "0 32px", boxSizing: "border-box", borderRadius: 26, display: "flex", flexDirection: "column", justifyContent: "center", gap: 8 })}>
    <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 44, color: C.ink, lineHeight: 1.1 }}>{title}</div>
    {sub ? <div style={{ fontFamily: F.mono, fontSize: 28, color: C.mute }}>{sub}</div> : null}
  </div>
);

// ───────────────────────────────────────────────────────── Registro

export const CARDS: Record<string, React.FC<any>> = {
  phone: Phone,
  window: AppWindow,
  desktop: Desktop,
  checklist: Checklist,
  installer: Installer,
  steps: Steps,
  prompt: Prompt,
  beforeafter: BeforeAfter,
  profile: Profile,
  counter: Counter,
  polaroids: Polaroids,
  callout: Callout,
};

/** Hueco por defecto de cada tipo (se puede cambiar con `slot` o con x/y/w/h). */
export const DEFAULT_SLOT: Record<string, "main" | "callout" | "left" | "right" | "free"> = {
  phone: "left",
  window: "main",
  desktop: "main",
  checklist: "right",
  installer: "main",
  steps: "main",
  prompt: "main",
  beforeafter: "main",
  profile: "main",
  counter: "main",
  polaroids: "main",
  callout: "callout",
};
