import type { Metadata } from 'next';
import './globals.css';
import { LanguageProvider } from '@/components/common/LanguageContext';
import { BranchProvider } from '@/components/common/BranchContext';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';

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
            <div className="flex flex-col min-h-screen">
              <Header />
              <div className="flex flex-1">
                <Sidebar />
                <main className="flex-1 overflow-x-hidden p-6">
                  {children}
                </main>
              </div>
            </div>
          </BranchProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
