import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Study Smart - Intelligent Time Management",
  description: "Enhance your learning with intelligent time management and focused study sessions using the Pomodoro technique",
  keywords: ["study", "pomodoro", "time management", "focus", "productivity"],
  authors: [{ name: "Study Smart Team" }],
  creator: "Study Smart",
  publisher: "Study Smart",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="font-sans bg-background text-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
