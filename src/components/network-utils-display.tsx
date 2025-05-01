import * as React from "react";
import type {
    PingResult,
    HttpCheckResult,
    PortScanResult,
    DnsRecord,
} from "@/services/network-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Activity,
    Globe,
    ShieldCheck,
    ShieldOff,
    Network,
    Server,
    AlertTriangle,
} from "lucide-react";

interface NetworkUtilsDisplayProps {
    pingResult: PingResult | null;
    httpCheckResult: HttpCheckResult | null;
    portScanResults: PortScanResult[] | null;
    dnsLookupResult: Record<string, DnsRecord[]> | null;
    submittedIp: string | null;
}

const StatusBadge = ({
    success,
    open,
}: {
    success?: boolean | null;
    open?: boolean | null;
}) => {
    const isSuccess = success === true || open === true;
    const isFailure = success === false || open === false;

    if (isSuccess) {
        return (
            <Badge
                variant="default"
                className="bg-green-600 hover:bg-green-700"
            >
                {success !== null && success !== undefined ? "Success" : "Open"}
            </Badge>
        );
    } else if (isFailure) {
        return (
            <Badge
                variant="destructive"
                className="bg-red-600 hover:bg-red-700"
            >
                {success !== null && success !== undefined
                    ? "Failed"
                    : "Closed"}
            </Badge>
        );
    } else {
        return <Badge variant="secondary">N/A</Badge>;
    }
};

export function NetworkUtilsDisplay({
    pingResult,
    httpCheckResult,
    portScanResults,
    dnsLookupResult,
    submittedIp,
}: NetworkUtilsDisplayProps) {
    if (!submittedIp) {
        return null;
    }

    return (
        <>
            <Card className="w-full shadow-lg mt-6">
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <Activity className="w-5 h-5 text-primary" /> Network
                        Utilities {submittedIp && `for ${submittedIp}`}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <h3 className="font-semibold flex items-center gap-2 mb-2">
                            <Activity className="w-4 h-4 text-accent" /> Ping
                            Test
                        </h3>
                        <div className="flex justify-between items-center">
                            <span>Status:</span>
                            <StatusBadge success={pingResult?.success} />
                        </div>
                        {pingResult?.success &&
                            pingResult.responseTime !== null &&
                            typeof pingResult.responseTime !== "undefined" && (
                                <div className="flex justify-between items-center mt-1 text-sm text-muted-foreground">
                                    <span>Response Time:</span>
                                    <span>{pingResult.responseTime} ms</span>
                                </div>
                            )}
                        {pingResult && !pingResult.success && (
                            <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                                <AlertTriangle className="w-4 h-4" />{" "}
                                {pingResult.message ||
                                    "Ping failed or host unreachable."}
                            </p>
                        )}
                        {!pingResult && (
                            <p className="text-sm text-muted-foreground mt-1">
                                Ping test did not run or failed unexpectedly.
                            </p>
                        )}
                    </div>

                    <Separator />

                    <div>
                        <h3 className="font-semibold flex items-center gap-2 mb-2">
                            <Globe className="w-4 h-4 text-accent" /> HTTP
                            Connectivity
                        </h3>
                        <div className="flex justify-between items-center">
                            <span>Status:</span>
                            <StatusBadge success={httpCheckResult?.success} />
                        </div>
                        {httpCheckResult?.statusCode !== null &&
                            typeof httpCheckResult.statusCode !==
                                "undefined" && (
                                <div className="flex justify-between items-center mt-1 text-sm text-muted-foreground">
                                    <span>HTTP Status Code:</span>
                                    <span>{httpCheckResult.statusCode}</span>
                                </div>
                            )}
                        {httpCheckResult?.responseTime !== null &&
                            typeof httpCheckResult.responseTime !==
                                "undefined" && (
                                <div className="flex justify-between items-center mt-1 text-sm text-muted-foreground">
                                    <span>Response Time:</span>
                                    <span>
                                        {httpCheckResult.responseTime} ms
                                    </span>
                                </div>
                            )}
                        {httpCheckResult && !httpCheckResult.success && (
                            <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                                <AlertTriangle className="w-4 h-4" />{" "}
                                {httpCheckResult.error ||
                                    "Could not connect via HTTP/S."}
                            </p>
                        )}
                        {!httpCheckResult && (
                            <p className="text-sm text-muted-foreground mt-1">
                                HTTP connectivity check did not run or failed
                                unexpectedly.
                            </p>
                        )}
                    </div>

                    <Separator />

                    <div>
                        <h3 className="font-semibold flex items-center gap-2 mb-2">
                            <Server className="w-4 h-4 text-accent" /> TCP Port
                            Scan
                        </h3>
                        {portScanResults && portScanResults.length > 0 ? (
                            <ul className="space-y-2">
                                {portScanResults.map((result) => (
                                    <li
                                        key={result.port}
                                        className="flex justify-between items-center text-sm"
                                    >
                                        <span className="flex items-center gap-1">
                                            {result.isOpen ? (
                                                <ShieldCheck className="w-4 h-4 text-green-600" />
                                            ) : (
                                                <ShieldOff className="w-4 h-4 text-red-600" />
                                            )}
                                            Port {result.port}:
                                        </span>
                                        <StatusBadge open={result.isOpen} />
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {portScanResults === null
                                        ? "Port scan did not run or failed."
                                        : "No common ports scanned or all were closed/filtered."}
                                </p>
                                {portScanResults?.[0]?.error && (
                                    <p className="text-xs text-destructive mt-1">
                                        {portScanResults[0].error}
                                    </p>
                                )}
                            </>
                        )}
                    </div>

                    <Separator />

                    <div>
                        <h3 className="font-semibold flex items-center gap-2 mb-2">
                            <Network className="w-4 h-4 text-accent" /> DNS
                            Lookup
                        </h3>
                        {dnsLookupResult &&
                        Object.keys(dnsLookupResult).length > 0 ? (
                            <div className="space-y-3">
                                {Object.entries(dnsLookupResult).map(
                                    ([type, records]) => (
                                        <div key={type}>
                                            <h4 className="font-medium text-muted-foreground mb-1">
                                                {type} Records:
                                            </h4>
                                            {records && records.length > 0 ? (
                                                <ul className="list-disc list-inside pl-4 space-y-1 text-sm">
                                                    {records.map(
                                                        (record, index) => (
                                                            <li
                                                                key={index}
                                                                className="break-all"
                                                            >
                                                                {record.value}{" "}
                                                                {type ===
                                                                    "MX" &&
                                                                record.priority !==
                                                                    undefined
                                                                    ? `(Priority: ${record.priority})`
                                                                    : ""}
                                                            </li>
                                                        )
                                                    )}
                                                </ul>
                                            ) : (
                                                <p className="text-sm text-muted-foreground pl-4">
                                                    No {type} records found.
                                                </p>
                                            )}
                                        </div>
                                    )
                                )}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground mt-1">
                                {dnsLookupResult === null
                                    ? "DNS lookup did not run or failed."
                                    : "No DNS records found for common types or target is an IP without PTR record."}
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </>
    );
}
