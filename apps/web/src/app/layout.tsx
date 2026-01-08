import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Scaffolded Learning',
  description: 'Master coding interviews with scaffolded learning',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        {children}
      </body>
    </html>
  );
}
