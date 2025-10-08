import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Med Study Partner",
  description: "Teach out loud. Feynman-style.",
};
export default function RootLayout({ children }:{children:React.ReactNode}) {
  return (
    <html lang="en">
      <body className="bg-zinc-950 text-zinc-100 antialiased">{children}</body>
    </html>
  );
}
