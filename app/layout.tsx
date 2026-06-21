import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "رصد | Rasd",
  description: "Private bilingual breaking-news monitoring platform",
  icons: {
    icon: "/rasd-icon.jpg",
    shortcut: "/rasd-icon.jpg",
    apple: "/rasd-icon.jpg"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
