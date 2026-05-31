import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Comenta.AI — Moderação Inteligente de Comentários",
  description: "Plataforma de moderação de comentários com IA. Proteja seu site contra spam, toxicidade e conteúdo inadequado automaticamente.",
  keywords: ["moderação de comentários", "IA", "anti-spam", "moderação automática"],
  openGraph: {
    title: "Comenta.AI",
    description: "Moderação de comentários com inteligência artificial",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
