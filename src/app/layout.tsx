import type { Metadata } from "next";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { Footer } from "@/components/footer";
import { Metrika } from "@/components/metrika";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";
import { Suspense } from "react";

export const metadata: Metadata = {
    title: "2ip - IP Lookup & Network Utilities",
    description:
        "Modern IP Address Lookup & Network Utilities application built with Next.js. Perform IP lookups, network diagnostics, and security checks with our powerful tools.",
    keywords: [
        "IP lookup",
        "network utilities",
        "IP address",
        "network diagnostics",
        "security tools",
        "subnet calculator",
        "ping test",
        "traceroute",
        "DNS lookup",
        "port scanner",
        "IP geolocation",
        "network analyzer",
        "2ip",
        "check-host",
        "check host",
        "art3m4ik3",
    ],
    authors: [{ name: "art3m4ik3", url: "https://ll-u.pro" }],
    robots: { index: true, follow: true },
    manifest: "/site.webmanifest",
    icons: {
        icon: [
            { url: "/favicon.ico", type: "image/x-icon" },
            { url: "/favicon.png", type: "image/png" },
            { url: "/favicon.svg", type: "image/svg+xml" },
        ],
        shortcut: "/favicon.ico",
        apple: [{ url: "/favicon.png", sizes: "180x180", type: "image/png" }],
    },
    openGraph: {
        type: "website",
        locale: "en_US",
        url: "https://2ip.pro",
        title: "2ip - IP Lookup & Network Utilities",
        description:
            "Modern IP Address Lookup & Network Utilities application built with Next.js. Perform IP lookups, network diagnostics, and security checks with our powerful tools.",
        siteName: "2ip",
        images: [
            {
                url: "https://2ip.pro/favicon.png",
                width: 256,
                height: 256,
                alt: "2ip - IP Lookup & Network Utilities",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "2ip - IP Lookup & Network Utilities",
        description:
            "Modern IP Address Lookup & Network Utilities application built with Next.js. Perform IP lookups, network diagnostics, and security checks with our powerful tools.",
        images: ["https://2ip.pro/favicon.png"],
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={`antialiased bg-background`}>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    <div className="flex flex-col min-h-screen">
                        <main className="flex-grow">{children}</main>
                        <Footer />
                    </div>
                    <Toaster />
                    <GoogleAnalytics gaId="G-TTTDLKYT7Q" />
                    <Suspense>
                        <Metrika />
                    </Suspense>
                </ThemeProvider>
            </body>
        </html>
    );
}
