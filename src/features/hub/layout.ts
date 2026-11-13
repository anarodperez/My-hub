export function getHubLayout(windowWidth: number, fontScale: number, sidebarVisible = true) {
  const width = Math.round(windowWidth);
  const sidebar = sidebarVisible && width >= 900;
  const feedWidth = Math.max(0, width - (sidebar ? 224 : 0) - 48);
  const contentWidth = feedWidth;
  const minimumCardWidth = sidebar ? 160 : 144;
  const maxColumns = Math.max(1, Math.floor((contentWidth + 16) / (minimumCardWidth + 16)));
  const largeText = fontScale > 1.3;
  return {
    sidebar, contentWidth, feedWidth,
    feedColumns: largeText || width < 900 ? 1 : Math.max(1, Math.min(4, Math.floor((feedWidth + 16) / 336))),
    wishColumns: largeText || width < 440 ? 1 : width >= 900 ? Math.max(1, Math.floor((contentWidth + 16) / 256)) : Math.min(maxColumns, 2),
  };
}
