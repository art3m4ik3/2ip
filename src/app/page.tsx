"use client";

import Link from "next/link";
import { SearchForm } from "@/components/search-form";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

export default function Home() {
    return (
        <main className="container mx-auto px-4 py-8 flex flex-col items-center bg-background">
            <header className="text-center mb-8">
                <Link
                    href="/"
                    className="text-4xl font-bold text-primary mb-2 inline-block hover:opacity-80 transition-opacity"
                >
                    2ip
                </Link>
                <p className="text-lg text-muted-foreground">
                    Modern IP Address Lookup & Network Utilities
                </p>
            </header>
            <div className="w-full max-w-4xl space-y-6">
                <Card className="shadow-md border border-border">
                    <CardHeader>
                        <CardTitle>IP/Hostname Lookup</CardTitle>
                        <CardDescription>
                            Enter an IP address, hostname, or URL to fetch
                            details and run network diagnostics.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <SearchForm />
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
