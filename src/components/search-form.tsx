"use client";

import * as React from "react";
import type { FormEvent } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Search } from "lucide-react";
import * as punycode from "punycode/";

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button
            type="submit"
            disabled={pending}
            aria-disabled={pending}
            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground"
        >
            {pending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <Search className="mr-2 h-4 w-4" />
            )}
            {pending ? "Searching..." : "Search"}
        </Button>
    );
}

export function SearchForm() {
    const router = useRouter();
    const [localError, setLocalError] = React.useState<string | null>(null);

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLocalError(null);
        const formData = new FormData(event.currentTarget);
        const rawInput = (formData.get("ipAddress") as string) ?? "";
        let processedInput = rawInput.trim();

        let isUrl = false;
        try {
            let urlInput = processedInput.replace(/\/$/, "");
            urlInput = urlInput.includes("://")
                ? urlInput
                : `https://${urlInput}`;
            const url = new URL(urlInput);

            const ipv4Regex =
                /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
            const ipv6Regex = /:/;

            if (
                url.hostname &&
                !ipv4Regex.test(url.hostname) &&
                !ipv6Regex.test(url.hostname)
            ) {
                processedInput = url.hostname;
                isUrl = true;
                console.log("Processed URL input to hostname:", processedInput);
            } else if (
                ipv4Regex.test(url.hostname) ||
                ipv6Regex.test(url.hostname)
            ) {
                processedInput = url.hostname;
                console.log("Parsed URL but hostname is IP:", processedInput);
            } else if (url.pathname && url.pathname.length > 1) {
                const potentialIp = url.pathname.substring(1);
                if (isValidIP(potentialIp)) {
                    processedInput = potentialIp;
                    console.log("Extracted IP from URL path:", processedInput);
                    isUrl = false;
                }
            }
        } catch (e) {
            console.log(
                "Input is not a valid URL, treating as IP/hostname:",
                processedInput
            );
        }

        if (!isUrl && containsNonAscii(processedInput)) {
            try {
                processedInput = punycode.toASCII(processedInput);
                console.log(
                    "Converted non-ASCII hostname to Punycode:",
                    processedInput
                );
            } catch (e) {
                console.warn(
                    "Failed to convert non-ASCII input to Punycode:",
                    e
                );
                setLocalError("Invalid non-ASCII hostname format.");
                return;
            }
        }

        if (!processedInput) {
            setLocalError("Input cannot be empty.");
            return;
        }

        console.log("Navigating to lookup page for:", processedInput);
        router.push(`/lookup/${encodeURIComponent(processedInput)}`);
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="w-full max-w-2xl mx-auto space-y-4"
        >
            <div className="flex flex-col sm:flex-row gap-2 items-center">
                <Input
                    type="text"
                    name="ipAddress"
                    placeholder="Enter IP, hostname, or URL"
                    required
                    className="flex-grow text-base md:text-sm"
                    aria-label="IP Address, Hostname, or URL"
                    disabled={useFormStatus().pending}
                    aria-disabled={useFormStatus().pending}
                />
                <SubmitButton />
            </div>
            {localError && (
                <Alert variant="destructive" role="alert">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{localError}</AlertDescription>
                </Alert>
            )}
        </form>
    );
}

const containsNonAscii = (str: string) => /[^\u0000-\u007f]/.test(str);

const isIPv4 = (ip: string): boolean => {
    const ipv4Regex =
        /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipv4Regex.test(ip);
};

const isIPv6 = (ip: string): boolean => {
    return ip.includes(":");
};

const isValidIP = (ip: string): boolean => {
    return isIPv4(ip) || isIPv6(ip);
};

declare module "punycode/" {
    export function decode(input: string): string;
    export function encode(input: string): string;
    export function toASCII(input: string): string;
    export function toUnicode(input: string): string;
    export const ucs2: {
        decode(string: string): number[];
        encode(codePoints: number[]): string;
    };
    export const version: string;
}
