import type { Metadata } from "next";
import { Big_Shoulders, IBM_Plex_Mono, Manrope } from "next/font/google";
import "./globals.css";

const display = Big_Shoulders({
  variable: "--font-display",
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700", "800", "900"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
});

const body = Manrope({
  variable: "--font-body",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "КОТУШКА.UA — моніторинг цін на філамент",
  description:
    "Порівняння цін на філамент для 3D-друку в українських магазинах: PLA, PETG, ABS та інше. Знаходь найдешевше, слідкуй за акціями та історією цін.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="uk"
      className={`${display.variable} ${mono.variable} ${body.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
