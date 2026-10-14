export function getHubLayout(windowWidth: number, fontScale: number) {
  const width = Math.round(windowWidth);
  const sidebar = width >= 900;
  const contentWidth = Math.max(0, Math.min(1200, width - (sidebar ? 224 : 0)) - 48);
  const minimumCardWidth = sidebar ? 160 : 144;
  const maxColumns = Math.max(1, Math.floor((contentWidth + 16) / (minimumCardWidth + 16)));
  const largeText = fontScale > 1.3;
  return {
    sidebar, contentWidth,
    feedColumns: largeText ? 1 : Math.min(maxColumns, width >= 1200 ? 3 : sidebar ? 2 : 1),
    wishColumns: largeText || width < 360 ? 1 : Math.min(maxColumns, width >= 1200 ? 4 : sidebar ? 3 : 2),
  };
}
