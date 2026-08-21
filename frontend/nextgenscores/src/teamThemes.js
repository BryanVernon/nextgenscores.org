const DEFAULT_THEME = {
  "--ink": "#17312b",
  "--muted": "#6b7f78",
  "--accent": "#1ea675",
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
  return [`hsl(${hue} 58% 34%)`, `hsl(${hue} 35% 96%)`, `hsl(${hue} 65% 45%)`];
}

export function getThemeVariables(theme) {
  if (theme?.mode !== "team" || !theme.team) return DEFAULT_THEME;

  const [ink, paper, accent] = TEAM_THEMES[theme.team] || fallbackTheme(theme.team);
  return {
    "--ink": ink,
    "--muted": "color-mix(in srgb, var(--ink) 58%, #ffffff)",
    "--accent": accent,
    "--paper": paper,
    "--surface": "#ffffff",
    "--line": "color-mix(in srgb, var(--ink) 16%, #ffffff)",
  };
}

export const DEFAULT_THEME_VARIABLES = DEFAULT_THEME;
