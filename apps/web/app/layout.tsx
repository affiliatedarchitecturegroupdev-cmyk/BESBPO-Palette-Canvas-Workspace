import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Palette Canvas Workspace',
  description: 'Production workspace foundation for Palette Canvas BPO delivery',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
