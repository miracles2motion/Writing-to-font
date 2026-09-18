import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Image to Font Studio",
  description:
    "Convert hand-drawn or designed character sheet images into standard TrueType (.ttf) fonts and Cultural Color Asset Packs (.zip) with automated background removal, vector contour tracing, AI and algorithmic character expansion, and live typing preview.",
  openGraph: {
    title: "Image to Font Studio",
    description:
      "Convert hand-drawn or designed character sheet images into standard TrueType (.ttf) fonts and Cultural Color Asset Packs (.zip).",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-neutral-950 text-neutral-100 min-h-screen antialiased selection:bg-amber-500/30 selection:text-amber-200">
        {children}
      </body>
    </html>
  );
}
