import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rasd",
  description: "Private bilingual breaking-news monitoring platform"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
