export const hubType = {
  screenTitle: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.8 },
  sectionTitle: { fontSize: 22, lineHeight: 28, fontWeight: '600', letterSpacing: -0.4 },
  cardTitle: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 24 },
  metadata: { fontSize: 12, lineHeight: 18 },
} as const;
export const hubSpace = { small: 8, medium: 16, large: 24, section: 32 };
export const hubRadius = { surface: 16, control: 12 };
export const hubWidths = { content: 1200, form: 680, sidebar: 224 };
export const hubFonts = {
  'Manrope-SemiBold': require('../../assets/fonts/Manrope-SemiBold.ttf'),
  'Manrope-Bold': require('../../assets/fonts/Manrope-Bold.ttf'),
  'SourceSans3-Regular': require('../../assets/fonts/SourceSans3-Regular.ttf'),
  'SourceSans3-SemiBold': require('../../assets/fonts/SourceSans3-SemiBold.ttf'),
  'SourceSans3-Bold': require('../../assets/fonts/SourceSans3-Bold.ttf'),
};
