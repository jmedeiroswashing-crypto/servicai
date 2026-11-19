import type { Metadata } from 'next';
import localFont from 'next/font/local';
import '@/pitch/pitch.css';

// Fonte do site (Plus Jakarta Sans, OFL) servida do próprio projeto: funciona sem internet.
const fontePitch = localFont({
  src: '../../pitch/fontes/plus-jakarta-sans-latin-wght-normal.woff2',
  weight: '200 800',
  variable: '--fonte-pitch',
  display: 'block',
});

export const metadata: Metadata = {
  title: 'Pitch',
  robots: { index: false, follow: false },
};

export default function PitchLayout({ children }: LayoutProps<'/pitch'>) {
  return <div className={fontePitch.variable}>{children}</div>;
}
