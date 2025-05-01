"use server";

import { z } from "zod";
import { getIpInfo, type IpInfo } from "@/services/ip-lookup";
import {
    ping,
    checkHttpConnectivity,
    scanPort,
    performDnsLookup,
    fetchDnsRecords,
    type PingResult,
    type HttpCheckResult,
    type PortScanResult,
    type DnsRecord,
} from "@/services/network-utils";
import type { IpLookupResult } from "@/lib/types";

const ipOrHostnameSchema = z
    .string()
    .min(1, "Input cannot be empty.")
    .refine(
        (value) => {
            return value.length > 0;
        },
        {
            message: "Invalid IP address or hostname format.",
        }
    );

const COMMON_PORTS = [80, 443, 21, 22, 23, 25, 53, 110, 143, 3306, 5432];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const REQUEST_DELAY_MS = 150;

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

export async function lookupIp(
    query: string
): Promise<IpLookupResult | { error: string }> {
    const processedInput = query || "";
    const submittedValue = processedInput;

    const validation = ipOrHostnameSchema.safeParse(processedInput);

    if (!validation.success) {
        const errorMessage =
            validation.error.flatten().formErrors.join(", ") ||
            "Invalid input received.";
        console.error(
            "Validation Error in Action:",
            errorMessage,
            "Processed Input:",
            processedInput
        );
        return { error: errorMessage };
    }

    const target = validation.data;
    console.log(`Lookup Action Started for Target: ${target}`);

    const isIpAddress = isValidIP(target);
    const isHostname = !isIpAddress;

    let finalIpInfo: IpInfo | null = null;
    let resolvedIpForTools: string | null = isIpAddress ? target : null;
    let primaryResolvedIp: string | null = null;
    const errors: string[] = [];

    try {
        // --- Step 1: DNS Lookup (only if hostname) ---
        let dnsLookupRes: PromiseSettledResult<Record<string, DnsRecord[]>> = {
            status: "rejected",
            reason: "Not hostname",
        };

        if (isHostname) {
            console.log(
                `Target is hostname (${target}), performing DNS lookup...`
            );
            dnsLookupRes = await performDnsLookup(target)
                .then((value) => ({ status: "fulfilled", value } as const))
                .catch((reason) => ({ status: "rejected", reason } as const));

            if (dnsLookupRes.status === "fulfilled") {
                const aRecords = dnsLookupRes.value.A || [];
                const aaaaRecords = dnsLookupRes.value.AAAA || [];
                const firstValidA = aRecords.find((r) => isValidIP(r.value));
                if (firstValidA) {
                    primaryResolvedIp = firstValidA.value;
                    console.log(
                        `DNS Lookup successful: Found A record ${primaryResolvedIp}`
                    );
                } else {
                    const firstValidAAAA = aaaaRecords.find((r) =>
                        isValidIP(r.value)
                    );
                    if (firstValidAAAA) {
                        primaryResolvedIp = firstValidAAAA.value;
                        console.log(
                            `DNS Lookup successful: Found AAAA record ${primaryResolvedIp}`
                        );
                    } else {
                        console.log(
                            `DNS Lookup successful, but no valid A or AAAA records found.`
                        );
                    }
                }
                resolvedIpForTools = primaryResolvedIp;
            } else {
                console.warn(
                    `DNS Lookup failed for hostname ${target}:`,
                    dnsLookupRes.reason
                );
                errors.push(
                    `DNS Lookup: ${
                        dnsLookupRes.reason instanceof Error
                            ? dnsLookupRes.reason.message
                            : String(dnsLookupRes.reason)
                    }`
                );
                resolvedIpForTools = null;
            }
            await delay(REQUEST_DELAY_MS);
        } else {
            resolvedIpForTools = target;
            console.log(
                `Target is IP address (${target}), skipping initial DNS lookup.`
            );
        }

        // --- Step 2: IP Info Lookup ---
        const lookupTarget = resolvedIpForTools || target;
        console.log(`Performing IP info lookup for: ${lookupTarget}`);
        let ipInfoRes: PromiseSettledResult<IpInfo> = await getIpInfo(
            lookupTarget
        )
            .then((value) => ({ status: "fulfilled", value } as const))
            .catch((reason) => ({ status: "rejected", reason } as const));

        if (ipInfoRes.status === "fulfilled") {
            finalIpInfo = ipInfoRes.value;
            console.log("IP Info lookup successful.");
            if (
                isHostname &&
                !resolvedIpForTools &&
                finalIpInfo.query === target &&
                isValidIP(finalIpInfo.query)
            ) {
                resolvedIpForTools = finalIpInfo.query;
                console.log(
                    `Used IP (${resolvedIpForTools}) from ip-api response for tools as DNS failed.`
                );
            }
            if (finalIpInfo) finalIpInfo.query = submittedValue;
        } else {
            console.warn(
                `IP Info lookup failed for ${lookupTarget}:`,
                ipInfoRes.reason
            );
            errors.push(
                `${
                    ipInfoRes.reason instanceof Error
                        ? ipInfoRes.reason.message
                        : String(ipInfoRes.reason)
                }`
            );
            if (isHostname && resolvedIpForTools && lookupTarget !== target) {
                console.log(
                    `IP lookup for resolved IP ${resolvedIpForTools} failed, attempting fallback with original hostname ${target}`
                );
                await delay(REQUEST_DELAY_MS);
                const fallbackIpInfoRes = await getIpInfo(target)
                    .then((value) => ({ status: "fulfilled", value } as const))
                    .catch(
                        (reason) => ({ status: "rejected", reason } as const)
                    );

                if (fallbackIpInfoRes.status === "fulfilled") {
                    finalIpInfo = fallbackIpInfoRes.value;
                    if (finalIpInfo) finalIpInfo.query = submittedValue;
                    console.log("IP Info fallback lookup successful.");
                    errors.pop();
                } else {
                    console.warn(
                        `IP Info fallback lookup also failed for ${target}:`,
                        fallbackIpInfoRes.reason
                    );
                }
            }
        }
        await delay(REQUEST_DELAY_MS);

        // --- Step 2.5: Reverse DNS Lookup (PTR) ---
        const ptrLookupTarget =
            resolvedIpForTools || (isIpAddress ? target : null);
        let ptrRecords: DnsRecord[] | null = null;
        if (ptrLookupTarget) {
            console.log(`Performing PTR lookup for: ${ptrLookupTarget}...`);
            try {
                ptrRecords = await fetchDnsRecords(ptrLookupTarget, "PTR");
                if (dnsLookupRes.status !== "fulfilled") {
                    dnsLookupRes = {
                        status: "fulfilled",
                        value: { PTR: ptrRecords },
                    };
                } else if (ptrRecords.length > 0) {
                    dnsLookupRes.value.PTR = ptrRecords;
                }
            } catch (ptrError) {
                console.warn(
                    `PTR Lookup failed for ${ptrLookupTarget}:`,
                    ptrError
                );
                errors.push(
                    `DNS Lookup (PTR): ${
                        ptrError instanceof Error
                            ? ptrError.message
                            : String(ptrError)
                    }`
                );
            }
            await delay(REQUEST_DELAY_MS);
        }

        // --- Step 3: Network Utils (Ping, HTTP, Ports) using resolved IP ---
        let pingRes: PromiseSettledResult<PingResult> = {
            status: "rejected",
            reason: "No target IP",
        };
        let httpCheckRes: PromiseSettledResult<HttpCheckResult> = {
            status: "rejected",
            reason: "No target IP/Hostname",
        };
        let portScanSettledResults: PromiseSettledResult<PortScanResult>[] = [];

        const toolTargetIp = resolvedIpForTools;
        const httpCheckTarget = isHostname ? target : toolTargetIp;

        if (toolTargetIp || isHostname) {
            // --- Perform Ping (only if we have a resolved IP) ---
            if (toolTargetIp) {
                console.log(`Performing Ping for resolved IP: ${toolTargetIp}`);
                pingRes = await ping(toolTargetIp)
                    .then((value) => ({ status: "fulfilled", value } as const))
                    .catch(
                        (reason) => ({ status: "rejected", reason } as const)
                    );
                await delay(REQUEST_DELAY_MS);
            } else {
                console.log("Skipping Ping: No resolved IP.");
                pingRes = {
                    status: "rejected",
                    reason: "Could not resolve IP for Ping.",
                };
            }

            // --- Check HTTP Connectivity (using original hostname or resolved IP) ---
            if (httpCheckTarget) {
                console.log(`Performing HTTP Check for: ${httpCheckTarget}`);
                const httpUrl = `http://${httpCheckTarget}`;
                const httpsUrl = `https://${httpCheckTarget}`;

                httpCheckRes = await checkHttpConnectivity(httpUrl)
                    .then((value) => ({ status: "fulfilled", value } as const))
                    .catch(async (httpReason) => {
                        console.warn(
                            `HTTP check failed for ${httpUrl}, trying HTTPS.`
                        );
                        try {
                            const httpsResValue = await checkHttpConnectivity(
                                httpsUrl
                            );
                            return {
                                status: "fulfilled",
                                value: httpsResValue,
                            } as const;
                        } catch (httpsReason) {
                            console.warn(
                                `HTTPS check also failed for ${httpsUrl}. Reporting initial HTTP failure.`
                            );
                            return {
                                status: "rejected",
                                reason: httpReason,
                            } as const;
                        }
                    });
                await delay(REQUEST_DELAY_MS);
            } else {
                console.log("Skipping HTTP Check: No valid target.");
                httpCheckRes = {
                    status: "rejected",
                    reason: "No valid target",
                };
            }

            // --- Scan Ports (Concurrently, only if we have a resolved IP) ---
            if (toolTargetIp) {
                console.log(
                    `Performing Port Scan for resolved IP: ${toolTargetIp}`
                );
                const portScanPromises = COMMON_PORTS.map((port) =>
                    scanPort(toolTargetIp, port)
                        .then(
                            (value) => ({ status: "fulfilled", value } as const)
                        )
                        .catch(
                            (reason) =>
                                ({ status: "rejected", reason } as const)
                        )
                );
                portScanSettledResults = await Promise.all(portScanPromises);
            } else {
                console.log("Skipping Port Scan: No resolved IP.");
                portScanSettledResults = COMMON_PORTS.map((port) => ({
                    status: "rejected",
                    reason: `No resolved IP for Port ${port}`,
                }));
            }
        } else {
            console.log(
                "Skipping Network Utilities: No resolved IP or valid hostname target."
            );
            errors.push(
                "Network Utilities: Could not resolve a target IP address for Ping and Port Scan."
            );
            pingRes = { status: "rejected", reason: "No resolved IP" };
            httpCheckRes = { status: "rejected", reason: "No valid target" };
            portScanSettledResults = COMMON_PORTS.map((port) => ({
                status: "rejected",
                reason: "No resolved IP",
            }));
        }

        // --- Process results and final errors ---
        const pingResult =
            pingRes.status === "fulfilled"
                ? pingRes.value
                : {
                      success: false,
                      responseTime: null,
                      message:
                          pingRes.reason instanceof Error
                              ? pingRes.reason.message
                              : String(pingRes.reason),
                  };
        const httpCheckResult =
            httpCheckRes.status === "fulfilled"
                ? httpCheckRes.value
                : {
                      success: false,
                      statusCode: null,
                      responseTime: null,
                      error:
                          httpCheckRes.reason instanceof Error
                              ? httpCheckRes.reason.message
                              : String(httpCheckRes.reason),
                  };
        const portScanResults = portScanSettledResults
            .map((res) => (res.status === "fulfilled" ? res.value : null))
            .filter((r): r is PortScanResult => r !== null);
        const dnsLookupResultData =
            dnsLookupRes.status === "fulfilled" ? dnsLookupRes.value : null;

        if (
            pingRes.status === "rejected" &&
            !String(pingRes.reason).includes("No resolved IP") &&
            !String(pingRes.reason).includes("Could not resolve IP")
        ) {
            errors.push(`Ping: ${pingResult.message}`);
        }
        if (
            httpCheckRes.status === "rejected" &&
            !String(httpCheckRes.reason).includes("No valid target")
        ) {
            errors.push(`HTTP Check: ${httpCheckResult.error}`);
        }
        const portScanFailures = portScanSettledResults.filter(
            (res) =>
                res.status === "rejected" &&
                !String(res.reason).includes("No resolved IP")
        );
        
        if (portScanFailures.length > 0) {
            const failureMessages = portScanFailures.map((failure, index) => {
                const port = COMMON_PORTS[index];
                const reason = (failure as PromiseRejectedResult).reason;
                return `Port ${port}: ${
                    reason instanceof Error
                        ? reason.message
                        : String(reason)
                }`;
            });
            errors.push(`Port Scans: ${failureMessages.join(", ")}`);
        }

        let finalErrorString = errors.length > 0 ? errors.join("; ") : null;
        if (finalErrorString) {
            console.error("Lookup Action Final Errors:", finalErrorString);
        }

        const finalResult: IpLookupResult = {
            ipInfo: finalIpInfo,
            resolvedIp:
                primaryResolvedIp ||
                (finalIpInfo?.ip && isValidIP(finalIpInfo.ip)
                    ? finalIpInfo.ip
                    : null),
            submittedIp: submittedValue,
            pingResult,
            httpCheckResult,
            portScanResults:
                portScanResults.length > 0 ? portScanResults : null,
            dnsLookupResult: dnsLookupResultData,
        };

        const ipInfoErrorMessage = errors.find((e) =>
            e.startsWith("IP Info Lookup Failed:")
        );
        if (
            ipInfoErrorMessage &&
            (!finalErrorString ||
                !finalErrorString.includes(ipInfoErrorMessage))
        ) {
            finalErrorString = finalErrorString
                ? `${ipInfoErrorMessage}; ${finalErrorString}`
                : ipInfoErrorMessage;
        } else if (!finalIpInfo && !resolvedIpForTools && !finalErrorString) {
            finalErrorString = `Could not resolve or gather information for "${submittedValue}".`;
        }

        console.log(
            "Lookup Action Completed. Result:",
            finalResult,
            "Error:",
            finalErrorString
        );

        if (finalErrorString) {
            return { error: finalErrorString };
        }

        return finalResult;
    } catch (error) {
        console.error("General Uncaught Error in Lookup Action:", error);
        const errorMessage =
            error instanceof Error
                ? error.message
                : "An unexpected error occurred during lookup.";
        return { error: `Lookup Failed: ${errorMessage}` };
    }
}
