import * as React from "react";

export function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="w-full border-t border-border mt-12 py-6 bg-background">
            <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
                <p className="mb-2">
                    2ip &copy; {currentYear}. All rights reserved.
                </p>
                <p>
                    Please use this service responsibly and for legitimate
                    purposes only. Excessive querying may result in temporary
                    rate limiting.
                </p>
            </div>
        </footer>
    );
}
