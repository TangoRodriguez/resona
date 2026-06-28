import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://resona.vercel.app"),
  title: "RESONA",
  description:
    "Touch your voice. Sound becomes matter. RESONA is an interactive web music app where voice, touch, melody, and synced users become visual matter.",
  applicationName: "RESONA",
  appleWebApp: {
    capable: true,
    title: "RESONA",
    statusBarStyle: "black-translucent"
  },
  formatDetection: {
    telephone: false
  },
  openGraph: {
    title: "RESONA",
    description: "Touch your voice. Sound becomes matter.",
    type: "website"
  }
};

export const viewport: Viewport = {
  themeColor: "#02030A",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
