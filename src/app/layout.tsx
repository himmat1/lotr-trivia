import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LOTR Trivia — The Fellowship of Knowledge",
  description:
    "A Lord of the Rings Jeopardy-style trivia game. Test your knowledge of Middle-earth across 6 categories. Network multiplayer supported.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // dark class activates our @custom-variant dark rules globally
    <html lang="en" className="dark">
      <head>
        {/*
         * Cinzel + Cinzel Decorative loaded via browser-side Google Fonts link.
         * This avoids the build-time SSL cert issue that next/font/google causes
         * when downloading fonts during `next build` in environments with custom certs.
         * The fonts load from the browser, which handles certs normally.
         */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Cinzel+Decorative:wght@400;700;900&display=swap"
          rel="stylesheet"
        />
        <style>{`
          :root {
            --font-cinzel: 'Cinzel', serif;
            --font-cinzel-deco: 'Cinzel Decorative', serif;
          }
        `}</style>
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
