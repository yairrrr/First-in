/**
 * סט אייקונים אחד, ב-SVG inline, בלי ספרייה.
 * קו אחיד של 2px, פינות עגולות, 24×24 — כך כל האייקונים נראים מאותה משפחה.
 * אייקוני כיוון (forward/back) מתהפכים אוטומטית ב-RTL דרך CSS.
 */

export type IconName =
  | 'sparkles'
  | 'book'
  | 'map'
  | 'code'
  | 'check'
  | 'fullscreen'
  | 'download'
  | 'trophy'
  | 'forward'
  | 'back'
  | 'layout'
  | 'palette'
  | 'braces'
  | 'bolt'
  | 'clock'
  | 'trash'
  | 'globe'
  | 'refresh'
  | 'alert'

const PATHS: Record<IconName, string> = {
  sparkles:
    'M12 3l1.8 4.6L18.5 9l-4.7 1.7L12 15l-1.8-4.3L5.5 9l4.7-1.4L12 3zM5 16l.8 2 2 .8-2 .8L5 21l-.8-1.4-2-.8 2-.8L5 16zm14 0l.8 2 2 .8-2 .8-.8 1.4-.8-1.4-2-.8 2-.8.8-2z',
  book: 'M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2V5zm0 16a2 2 0 012-2h13M8 7h7',
  map: 'M6 5a2 2 0 100 4 2 2 0 000-4zm12 10a2 2 0 100 4 2 2 0 000-4zM8 7h6a3 3 0 010 6H10a3 3 0 000 6h6',
  code: 'M8 8l-4 4 4 4m8-8l4 4-4 4M14 5l-4 14',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  fullscreen: 'M4 9V4h5M20 9V4h-5M4 15v5h5m11-5v5h-5',
  download: 'M12 4v11m0 0l-4-4m4 4l4-4M4 17v2a1 1 0 001 1h14a1 1 0 001-1v-2',
  trophy:
    'M8 4h8v5a4 4 0 01-8 0V4zM8 6H5a3 3 0 003 3m8-3h3a3 3 0 01-3 3M12 13v4m-4 3h8m-6 0v-3h4v3',
  forward: 'M9 5l7 7-7 7',
  back: 'M15 5l-7 7 7 7',
  layout: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 5h16M10 10v10',
  palette:
    'M12 3a9 9 0 100 18c1.2 0 2-.9 2-2 0-.6-.2-1-.5-1.4-.3-.4-.5-.8-.5-1.3a2 2 0 012-2h1.8A4.2 4.2 0 0021 10c0-3.9-4-7-9-7zM7.5 11a1 1 0 100-2 1 1 0 000 2zm3-3.5a1 1 0 100-2 1 1 0 000 2zm5 0a1 1 0 100-2 1 1 0 000 2z',
  braces: 'M8 4H7a2 2 0 00-2 2v4a2 2 0 01-2 2 2 2 0 012 2v4a2 2 0 002 2h1m8-16h1a2 2 0 012 2v4a2 2 0 002 2 2 2 0 00-2 2v4a2 2 0 01-2 2h-1',
  bolt: 'M13 3L5 13h6l-1 8 8-10h-6l1-8z',
  clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zm0-13v5l3 2',
  trash: 'M4 7h16M9 7V4h6v3m-7 4v7m4-7v7M6 7l1 13h10l1-13',
  globe: 'M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18',
  refresh: 'M20 12a8 8 0 01-14 5.3M4 12a8 8 0 0114-5.3M4 6v4h4m12 8v-4h-4',
  alert: 'M12 9v4m0 4h.01M10.3 4.5L2.8 18a2 2 0 001.7 3h15a2 2 0 001.7-3L13.7 4.5a2 2 0 00-3.4 0z',
}

export function Icon({
  name,
  size = 18,
  className = '',
}: {
  name: IconName
  size?: number
  className?: string
}) {
  const directional = name === 'forward' || name === 'back' ? 'icon-directional' : ''
  return (
    <svg
      className={`icon ${directional} ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
