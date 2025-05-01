"use client";

import type { ReactNode } from "react";
import { useState, useEffect, startTransition } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { lookupIp } from "@/lib/actions";
import type { IpLookupResult } from "@/lib/types";
import { IpInfoDisplay } from "@/components/ip-info-display";
import { NetworkUtilsDisplay } from "@/components/network-utils-display";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SearchForm } from "@/components/search-form";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

interface LookupPageState {
    data: IpLookupResult | null;
    error: string | null;
    loading: boolean;
    currentQuery: string | null;
}

export default function LookupPage(): ReactNode {
    const params = useParams();
    const { toast } = useToast();
    const [lookupState, setLookupState] = useState<LookupPageState>({
        data: null,
        error: null,
        loading: true,
        currentQuery: null,
    });

    const query = params?.query
        ? decodeURIComponent(params.query as string)
        : null;

    useEffect(() => {
        if (query && query !== lookupState.currentQuery) {
            console.log(`LookupPage effect triggered for query: ${query}`);
            setLookupState({
                data: null,
                error: null,
                loading: true,
                currentQuery: query,
            });

            startTransition(async () => {
                try {
                    console.log(`Calling lookupIp action for: ${query}`);
                    const result = await lookupIp(query);
                    console.log(`Received result from lookupIp:`, result);

                    setLookupState((prevState) => {
                        if (prevState.currentQuery !== query) {
                            return prevState;
                        }

                        if ("error" in result) {
                            console.error(
                                `Action returned error: ${result.error}`
                            );
                            toast({
                                variant: "destructive",
                                title: "Lookup Error",
                                description: result.error.split(";")[0],
                            });
                            return {
                                ...prevState,
                                data: null,
                                error: result.error,
                                loading: false,
                            };
                        } else {
                            return {
                                ...prevState,
                                data: result,
                                error: null,
                                loading: false,
                            };
                        }
                    });
                } catch (err) {
                    console.error(
                        "Uncaught error during lookup action call:",
                        err
                    );
                    const errorMessage =
                        err instanceof Error
                            ? err.message
                            : "An unexpected error occurred.";
                    setLookupState((prevState) => {
                        if (prevState.currentQuery !== query) {
                            return prevState;
                        }
                        toast({
                            variant: "destructive",
                            title: "Lookup Error",
                            description: errorMessage,
                        });
                        return {
                            ...prevState,
                            data: null,
                            error: errorMessage,
                            loading: false,
                        };
                    });
                }
            });
        } else if (!query) {
            setLookupState({
                data: null,
                error: "No query provided.",
                loading: false,
                currentQuery: null,
            });
        }
    }, [query, toast]);

    const renderResults = () => {
        if (lookupState.loading) {
            return <LoadingSkeleton />;
        }

        if (lookupState.error) {
            return (
                <Alert
                    variant="destructive"
                    role="alert"
                    className="w-full shadow-lg border-destructive/50"
                >
                    <AlertCircle className="h-5 w-5" />
                    <AlertTitle>
                        Lookup Failed for {lookupState.currentQuery}
                    </AlertTitle>
                    <AlertDescription>
                        {lookupState.error.split(";")[0]}
                        <p className="text-sm text-muted-foreground mt-1">
                            This could be due to an invalid hostname/IP, network
                            issues, API limitations, or the target being a
                            private/reserved address. Please check your input
                            and try again.
                        </p>
                    </AlertDescription>
                </Alert>
            );
        }

        if (lookupState.data) {
            return (
                <>
                    <IpInfoDisplay
                        ipInfo={lookupState.data.ipInfo}
                        submittedIp={lookupState.currentQuery}
                    />
                    <NetworkUtilsDisplay
                        pingResult={lookupState.data.pingResult}
                        httpCheckResult={lookupState.data.httpCheckResult}
                        portScanResults={lookupState.data.portScanResults}
                        dnsLookupResult={lookupState.data.dnsLookupResult}
                        submittedIp={lookupState.currentQuery}
                    />
                </>
            );
        }
        if (
            !lookupState.loading &&
            !lookupState.error &&
            !lookupState.data &&
            lookupState.currentQuery
        ) {
            return (
                <Card className="w-full shadow-lg border border-border">
                    <CardHeader>
                        <CardTitle>No Results</CardTitle>
                        <CardDescription>
                            Could not fetch details for
                            {lookupState.currentQuery}.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            Please check the input or try again later.
                        </p>
                    </CardContent>
                </Card>
            );
        }

        return null;
    };

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

                {renderResults()}
            </div>
        </main>
    );
}
