import ConvexClientProvider from "@/components/ConvexClientProvider";
import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { inter } from "@/lib/inter";
import { departureMono, ppMondwest } from "@/lib/landing-fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sortiri Timeline",
  description: "Sortiri Timeline",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${ppMondwest.variable} ${departureMono.variable} min-h-full antialiased`}
    >
      <body className="min-h-full bg-black text-foreground">
        <ClerkProvider>
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
