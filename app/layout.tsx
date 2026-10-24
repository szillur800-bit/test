import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'PDF Auto Print', description: 'Upload a PDF, pay securely, and print automatically.' };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="bn"><body>{children}</body></html>;
}
