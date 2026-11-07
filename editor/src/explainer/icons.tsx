import React from "react";

type P = { c: string };

const ICONS: Record<string, (p: P) => React.ReactNode> = {
  home: ({ c }) => <path d="M3 11.2 12 3.5l9 7.7V21h-6v-6.5H9V21H3z" fill={c} />,
  folder: ({ c }) => <path d="M2.5 6.2A2.2 2.2 0 0 1 4.7 4H9l2.2 2.4h8.1a2.2 2.2 0 0 1 2.2 2.2v9.2a2.2 2.2 0 0 1-2.2 2.2H4.7a2.2 2.2 0 0 1-2.2-2.2z" fill={c} />,
  doc: ({ c }) => (
    <>
      <path d="M6 2.5h8.2L19.5 8v13.5H6z" fill={c} />
      <path d="M9 12h7M9 15.5h7M9 8.5h3" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  mic: ({ c }) => (
    <>
      <rect x="9" y="2.5" width="6" height="12" rx="3" fill={c} />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3.5" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" />
    </>
  ),
  film: ({ c }) => (
    <>
      <rect x="2.5" y="4" width="19" height="16" rx="2" fill={c} />
      <path d="M7 4v16M17 4v16M2.5 9h4.5M2.5 15h4.5M17 9h4.5M17 15h4.5" stroke="#fff" strokeWidth="1.4" />
    </>
  ),
  check: ({ c }) => <path d="m5 12.5 4.6 4.6L19 7.4" stroke={c} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />,
  search: ({ c }) => (
    <>
      <circle cx="10.5" cy="10.5" r="6.2" stroke={c} strokeWidth="2.4" fill="none" />
      <path d="m15.4 15.4 5.2 5.2" stroke={c} strokeWidth="2.6" strokeLinecap="round" />
    </>
  ),
  eye: ({ c }) => (
    <>
      <path d="M1.5 12S5.5 4.8 12 4.8 22.5 12 22.5 12 18.5 19.2 12 19.2 1.5 12 1.5 12z" fill={c} />
      <circle cx="12" cy="12" r="3.6" fill="#fff" />
    </>
  ),
  star: ({ c }) => <path d="m12 2.6 2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.4l-5.9 3.3 1.3-6.6L2.5 9.5l6.6-.8z" fill={c} />,
  nfc: ({ c }) => <path d="M7 5.5c3.6 3.6 3.6 9.4 0 13M11 3c5 4.6 5 13.4 0 18M15 .8c6.2 5.6 6.2 16.8 0 22.4" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" transform="translate(1.5 0) scale(.92)" />,
  plus: ({ c }) => (
    <>
      <circle cx="12" cy="12" r="9" stroke={c} strokeWidth="2" fill="none" />
      <path d="M12 7.5v9M7.5 12h9" stroke={c} strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  link: ({ c }) => <path d="M10 14a4 4 0 0 0 5.7 0l3.5-3.5a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3.5 3.5a4 4 0 0 0 5.7 5.7l1-1" stroke={c} strokeWidth="2.2" fill="none" strokeLinecap="round" />,
  play: ({ c }) => (
    <>
      <rect x="1.5" y="4.5" width="21" height="15" rx="4.5" fill={c} />
      <path d="m10 9 5.5 3-5.5 3z" fill="#fff" />
    </>
  ),
  up: ({ c }) => <path d="M12 19V5m-6.5 6.5L12 5l6.5 6.5" stroke={c} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />,
  chat: ({ c }) => <path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-8l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" fill={c} />,
  captions: ({ c }) => (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" stroke={c} strokeWidth="2" fill="none" />
      <path d="M6.5 11h4M6.5 14.5h2.5M13 11h4.5M12 14.5h5.5" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  bolt: ({ c }) => <path d="M13.5 2 5 13.5h6L10 22l9-12h-6z" fill={c} />,
  heart: ({ c }) => <path d="M12 21s-8.5-5.2-8.5-11.2A4.8 4.8 0 0 1 12 7.1a4.8 4.8 0 0 1 8.5 2.7C20.5 15.8 12 21 12 21z" fill={c} />,
  chip: ({ c }) => (
    <>
      <rect x="6" y="6" width="12" height="12" rx="2" fill={c} />
      <path d="M9 2.5v3M12 2.5v3M15 2.5v3M9 18.5v3M12 18.5v3M15 18.5v3M2.5 9h3M2.5 12h3M2.5 15h3M18.5 9h3M18.5 12h3M18.5 15h3" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  tool: ({ c }) => <path d="M14.5 3.5a5 5 0 0 0-4.6 6.9L3.5 16.8l3.7 3.7 6.4-6.4a5 5 0 0 0 6.9-4.6l-3.1 3.1-2.9-.7-.7-2.9z" fill={c} />,
};

export const Icon: React.FC<{ name: string; size?: number; color?: string }> = ({ name, size = 32, color = "currentColor" }) => {
  const draw = ICONS[name] ?? ICONS.doc;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0, display: "block" }}>
      {draw({ c: color })}
    </svg>
  );
};

export const ICON_NAMES = Object.keys(ICONS);
