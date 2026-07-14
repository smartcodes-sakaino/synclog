import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SyncLog",
  description: "個人用タスク管理ツール",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;700&family=Plus+Jakarta+Sans:wght@700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body-md text-body-md overflow-x-hidden">{children}</body>
    </html>
  );
}
