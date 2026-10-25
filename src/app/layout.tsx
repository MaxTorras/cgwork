import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
metadataBase: new URL(
process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
),

title: {
default: "cgwork | Shared Workspace",
template: "%s | cgwork",
},

description:
"A shared workspace for managing forms, submissions, events and projects.",

applicationName: "cgwork",

keywords: [
"cgwork",
"workspace",
"forms",
"project management",
"team collaboration",
],

robots: {
index: false,
follow: false,
},

appleWebApp: {
capable: true,
title: "cgwork",
statusBarStyle: "default",
},
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-GB"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
