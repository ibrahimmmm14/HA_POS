import type { Metadata } from 'next';
import './globals.css';
import { LanguageProvider } from '@/components/common/LanguageContext';
import { BranchProvider } from '@/components/common/BranchContext';
import { AppShell } from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: 'HA-POS | Hearing Aid POS & Inventory Management System',
  description: 'Multi-branch POS, Audiology & Inventory Platform for Hearing Aids and Earmold Labs',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="bg-slate-50 text-slate-900 min-h-screen flex flex-col antialiased selection:bg-blue-100 selection:text-blue-900">
        <LanguageProvider>
          <BranchProvider>
            <AppShell>{children}</AppShell>
          </BranchProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
