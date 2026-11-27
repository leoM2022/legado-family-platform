
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./gala.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Legado | Historias y recuerdos familiares",
  description:
      "Legado es un espacio privado para compartir recuerdos, fotos y cumpleaños, y celebrar una premiación familiar.",
};

export default function RootLayout({
                                     children,
                                   }: {
  children: ReactNode;
}) {
  return (
      <html
          lang="es"
          data-scroll-behavior="smooth"
          className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
      <body className="min-h-full flex flex-col">
      {children}
      </body>
      </html>
  );
}
