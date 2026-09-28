import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gov-Task-Monitor | Sistem Monitoring Kinerja Berjenjang',
  description: 'Aplikasi pemantauan tusi dan tugas terintegrasi instansi vertikal',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="bg-canvas text-stone-900 antialiased selection:bg-primary selection:text-white">
        {children}
      </body>
    </html>
  );
}
