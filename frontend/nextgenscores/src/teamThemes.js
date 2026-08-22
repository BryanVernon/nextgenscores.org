const DEFAULT_THEME = {
  "--ink": "#17312b",
  "--muted": "#6b7f78",
  "--accent": "#1ea675",
  "--accent-contrast": "#ffffff",
  "--ink-contrast": "#ffffff",
  "--accent-soft": "#e7f7ef",
  "--accent-line": "#cfe7db",
  "--focus-ring": "rgba(30, 166, 117, 0.2)",
  "--paper": "#f5f7f2",
  "--surface": "#ffffff",
  "--line": "#dce5e0",
};

const TEAM_THEMES = {
  Alabama: ["#9e1b32", "#f6f1f2", "#57101c"],
  Arkansas: ["#9d2235", "#f8f3f4", "#5c1120"],
  Auburn: ["#0c2340", "#f7f8fa", "#e87722"],
  Baylor: ["#154734", "#f6f4e8", "#ffb81c"],
  Clemson: ["#f56600", "#fbf5ef", "#522d80"],
  "Colorado": ["#1c1c1c", "#f5f2ed", "#cfb87c"],
  "Florida": ["#0021a5", "#f4f6fc", "#fa4616"],
  "Florida State": ["#782f40", "#f9f4e9", "#ceb888"],
  "Georgia": ["#ba0c2f", "#fbf5f6", "#000000"],
  "Iowa": ["#ffcd00", "#fffbed", "#111111"],
  "Iowa State": ["#c8102e", "#fbf5e9", "#f1be48"],
  "LSU": ["#461d7c", "#f8f5e8", "#fdd023"],
  Miami: ["#005030", "#f3f8f5", "#f47321"],
  Michigan: ["#00274c", "#f5f7f9", "#ffcb05"],
  "Michigan State": ["#18453b", "#f2f7f5", "#ffffff"],
  Nebraska: ["#e41c38", "#fff5f6", "#ffffff"],
  "North Carolina": ["#7bafd4", "#f4f8fb", "#13294b"],
  "Notre Dame": ["#0c2340", "#f8f7f0", "#c99700"],
  Ohio: ["#bb0000", "#fff5f5", "#666666"],
  "Ohio State": ["#bb0000", "#fff5f5", "#666666"],
  Oklahoma: ["#841617", "#fcf5f5", "#fdf9d8"],
  "Oklahoma State": ["#ff7300", "#fff7f0", "#000000"],
  Oregon: ["#154733", "#f5f8ec", "#fee123"],
  "Oregon State": ["#dc4405", "#fff6f1", "#000000"],
  Penn: ["#041e42", "#f5f7fa", "#ffffff"],
  "Penn State": ["#041e42", "#f5f7fa", "#ffffff"],
  "South Carolina": ["#73000a", "#fbf4f5", "#000000"],
  Stanford: ["#8c1515", "#fbf5f5", "#2e2d29"],
  Tennessee: ["#ff8200", "#fff8f0", "#58595b"],
  Texas: ["#bf5700", "#fff6f0", "#ffffff"],
  "Texas A&M": ["#500000", "#faf4f4", "#ffffff"],
  TCU: ["#4d1979", "#f7f3fa", "#a3a9ac"],
  UCLA: ["#2d68c4", "#f4f8fc", "#f2a900"],
  USC: ["#990000", "#fff5f5", "#ffcc00"],
  Utah: ["#cc0000", "#fff5f5", "#000000"],
  Washington: ["#4b2e83", "#f7f4fa", "#b7a57a"],
  Wisconsin: ["#c5050c", "#fff5f5", "#ffffff"],
};

function fallbackTheme(team) {
  const hue = [...team].reduce((total, character) => total + character.charCodeAt(0), 0) % 360;
  return [hslToHex(hue, 58, 34), hslToHex(hue, 35, 96), hslToHex(hue, 65, 45)];
}

function hslToHex(hue, saturation, lightness) {
  const s = saturation / 100;
  const l = lightness / 100;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const x = chroma * (1 - Math.abs((hue / 60) % 2 - 1));
  const match = l - chroma / 2;
  const [red, green, blue] = hue < 60 ? [chroma, x, 0]
    : hue < 120 ? [x, chroma, 0]
      : hue < 180 ? [0, chroma, x]
        : hue < 240 ? [0, x, chroma]
          : hue < 300 ? [x, 0, chroma]
            : [chroma, 0, x];
  const hex = value => Math.round((value + match) * 255).toString(16).padStart(2, "0");
  return `#${hex(red)}${hex(green)}${hex(blue)}`;
}

function colorLuminance(hex) {
  const channels = hex.match(/[a-f\d]{2}/gi)?.map(value => parseInt(value, 16) / 255);
  if (!channels || channels.length !== 3) return 0;

  return channels
    .map(value => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
    .reduce((total, value, index) => total + value * [0.2126, 0.7152, 0.0722][index], 0);
}

function contrastRatio(foreground, background) {
  const lighter = Math.max(colorLuminance(foreground), colorLuminance(background));
  const darker = Math.min(colorLuminance(foreground), colorLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

function darkenColor(hex, factor) {
  const channels = hex.match(/[a-f\d]{2}/gi);
  if (!channels || channels.length !== 3) return hex;
  return `#${channels
    .map(value => Math.round(parseInt(value, 16) * factor).toString(16).padStart(2, "0"))
    .join("")}`;
}

function readableThemeColor(colors, background) {
  const candidates = colors.filter(color => /^#[a-f\d]{6}$/i.test(color));
  const best = candidates
    .map(color => ({ color, contrast: contrastRatio(color, background) }))
    .sort((left, right) => right.contrast - left.contrast)[0];
  if (!best) return "#17312b";
  if (best.contrast >= 4.5) return best.color;

  // Preserve the team's hue when its published color is too light for text.
  for (let factor = 0.94; factor >= 0.5; factor -= 0.06) {
    const darkened = darkenColor(best.color, factor);
    if (contrastRatio(darkened, background) >= 4.5) return darkened;
  }

  return "#17312b";
}

function readableTextOn(background) {
  return contrastRatio("#ffffff", background) >= contrastRatio("#10231e", background)
    ? "#ffffff"
    : "#10231e";
}

export function getThemeVariables(theme) {
  if (theme?.mode !== "team" || !theme.team) return DEFAULT_THEME;

  const [primary, paper, secondary] = TEAM_THEMES[theme.team] || fallbackTheme(theme.team);
  // Team secondary colors are often gold or white. They look great as marks, but
  // are unsafe for regular text and buttons. Select a team color that meets WCAG
  // contrast on the selected paper instead.
  const ink = readableThemeColor([primary, secondary], paper);
  const accent = ink;
  const accentContrast = readableTextOn(accent);
  return {
    "--ink": ink,
    "--muted": `color-mix(in srgb, ${ink} 84%, #000000)`,
    "--accent": accent,
    "--accent-contrast": accentContrast,
    "--ink-contrast": readableTextOn(ink),
    "--accent-soft": `color-mix(in srgb, ${accent} 10%, #ffffff)`,
    "--accent-line": `color-mix(in srgb, ${accent} 24%, #ffffff)`,
    "--focus-ring": `color-mix(in srgb, ${accent} 22%, transparent)`,
    "--team-primary": primary,
    "--team-secondary": secondary,
    "--paper": paper,
    "--surface": "#ffffff",
    "--line": `color-mix(in srgb, ${ink} 16%, #ffffff)`,
  };
}

export const DEFAULT_THEME_VARIABLES = DEFAULT_THEME;
