export type Run = { text: string; kind: "plain" | "accent" | "strike" };

/** «CREA UNA *CARPETA*» → [{CREA UNA ·plain}, {CARPETA ·accent}]. `~x~` marca tachado. */
export const parseMarkup = (src: string): Run[] => {
  const runs: Run[] = [];
  const re = /\*([^*]+)\*|~([^~]+)~/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    if (m.index > last) runs.push({ text: src.slice(last, m.index), kind: "plain" });
    runs.push(m[1] !== undefined ? { text: m[1], kind: "accent" } : { text: m[2], kind: "strike" });
    last = m.index + m[0].length;
  }
  if (last < src.length) runs.push({ text: src.slice(last), kind: "plain" });
  return runs;
};

export const stripMarkup = (src: string) => src.replace(/[*~]/g, "");

/** Palabras de una narración con marca de acento (mismo orden y tokenización que build-voice.py). */
export const narrationWords = (narration: string): { text: string; accent: boolean }[] => {
  const out: { text: string; accent: boolean }[] = [];
  let accent = false;
  for (const raw of narration.split(/\s+/).filter(Boolean)) {
    let tok = raw;
    if (tok.startsWith("*")) accent = true;
    const startsAccent = accent;
    if (tok.endsWith("*") || /\*[^\w]*$/.test(tok)) {
      // El acento termina en esta palabra.
      accent = false;
    }
    tok = tok.replace(/\*/g, "");
    if (tok) out.push({ text: tok, accent: startsAccent });
  }
  return out;
};
