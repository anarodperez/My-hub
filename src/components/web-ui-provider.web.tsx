import '@mantine/core/styles.layer.css';
import { createTheme, MantineProvider } from '@mantine/core';
import { MotionConfig } from 'motion/react';
import type { ReactNode } from 'react';
import { usePalette } from '@/features/hub/provider';

const theme = createTheme({
  primaryColor: 'plum',
  colors: { plum: ['#F6F2F8', '#EEE9F2', '#DFD1E8', '#C8A8DF', '#AE87C3', '#9268A6', '#705080', '#624370', '#50355D', '#40264D'] },
  fontFamily: 'SourceSans3-Regular, sans-serif',
  headings: { fontFamily: 'Manrope-SemiBold, sans-serif' },
  defaultRadius: 'md',
  radius: { sm: '8px', md: '12px', lg: '16px' },
  respectReducedMotion: true,
  focusRing: 'auto',
});

export function WebUIProvider({ children }: { children: ReactNode }) {
  const p = usePalette();
  return <MantineProvider theme={theme} forceColorScheme={p.dark ? 'dark' : 'light'} cssVariablesResolver={() => ({
    variables: { '--mantine-color-body': p.background, '--mantine-color-text': p.text, '--mantine-color-dimmed': p.muted },
    light: {}, dark: {},
  })}><MotionConfig reducedMotion="user" transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}>{children}</MotionConfig></MantineProvider>;
}
