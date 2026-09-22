import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Squad Screen — Match Intelligence',
  description:
    'Evidence-backed pre-match briefing with inspectable sources and a live availability what-if.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
