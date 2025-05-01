/**
 * Represents the result of an ICMP Ping test.
 * Note: True ICMP ping is not possible directly from the browser.
 * This often simulates a ping using fetch timings or WebSocket.
 */
export interface PingResult {
    /**
     * Indicates whether the simulated ping was successful (e.g., host responded).
     * Can be true, false, or null if the test could not determine reachability.
     */
    success: boolean | null;
    /**
     * The simulated response time in milliseconds, or null if unsuccessful or undetermined.
     */
    responseTime?: number | null;
    /**
     * Optional message, e.g., explaining limitations or error details.
     */
    message?: string;
}

/**
 * Represents the result of an HTTP connectivity check.
 */
export interface HttpCheckResult {
    /**
     * Indicates whether the HTTP check was successful (status 2xx).
     * Can be true, false, or null if the check failed to complete (e.g., network error).
     */
    success: boolean | null;
    /**
     * The HTTP status code, or null if the check failed before receiving a status (e.g., network error, CORS issue).
     */
    statusCode?: number | null;
    /**
     * The response time in milliseconds, or null if the check failed to complete.
     */
    responseTime?: number | null;
    /**
     * Optional error message detailing the failure reason.
     */
    error?: string | null;
}

/**
 * Represents the result of a TCP port scan.
 * Note: Direct TCP port scanning is not possible from the browser due to security restrictions.
 * Requires a server-side proxy/API.
 */
export interface PortScanResult {
    /**
     * The port number that was scanned.
     */
    port: number;
    /**
     * Indicates whether the port is open (determined by the server-side API).
     */
    isOpen: boolean;
    /**
     * Optional message, e.g., indicating it was checked via a proxy or mock.
     */
    message?: string;
    /**
     * Optional error message if the scan failed.
     */
    error?: string;
}

/**
 * Represents a DNS record.
 */
export interface DnsRecord {
    /**
     * The type of DNS record (e.g., A, AAAA, MX, NS, TXT, CNAME, PTR).
     */
    type: string;
    /**
     * The value of the DNS record.
     */
    value: string;
    /**
     * Time-To-Live for the record, if available.
     */
    ttl?: number;
    /**
     * Priority for MX records, if applicable.
     */
    priority?: number;
}

/**
 * Performs an ICMP Ping test using a server-side API.
 * Uses the system's ping command to check host reachability.
 * Returns response time and success status.
 *
 * @param target The hostname or IP address to ping.
 * @param timeoutMs Timeout for the ping request in milliseconds. Defaults to 2000.
 * @returns A promise that resolves to a PingResult object.
 */
export async function ping(
    target: string,
    timeoutMs: number = 2000
): Promise<PingResult> {
    const startTime = performance.now();
    const proxyApiEndpoint = 'http://localhost:4978/api/ping';

    try {
        const response = await fetch(proxyApiEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ target }),
            signal: AbortSignal.timeout(timeoutMs),
        });

        if (!response.ok) {
            const errorBody = await response.text().catch(() => `Status: ${response.status}`);
            return {
                success: false,
                responseTime: null,
                message: `Ping failed: ${errorBody}`
            };
        }

        const result = await response.json();
        const endTime = performance.now();
        return {
            success: result.success,
            responseTime: result.responseTime,
            message: result.message
        };
    } catch (error) {
        const endTime = performance.now();
        let failureReason = 'Failed to reach host';

        if (error instanceof Error) {
            failureReason = error.message;
        }

        return {
            success: false,
            responseTime: Math.round(endTime - startTime),
            message: failureReason,
        };
    }
}

/**
 * Asynchronously performs an HTTP connectivity check from the client-side.
 * Note: Subject to CORS restrictions. Might fail for cross-origin targets unless the server allows it.
 * Tries the provided URL directly.
 *
 * @param url The URL to check (should include http:// or https://).
 * @returns A promise that resolves to an HttpCheckResult object.
 * @throws Throws an error if the fetch fails fundamentally (network, DNS, CORS etc.) allowing caller to potentially retry with a different URL.
 */
export async function checkHttpConnectivity(
    url: string
): Promise<HttpCheckResult> {
    const startTime = performance.now();
    try {
        // Use HEAD request to be less intrusive, with CORS mode first
        const response = await fetch(url, {
            method: "HEAD",
            mode: "cors",
            cache: "no-store",
            signal: AbortSignal.timeout(5000),
        });
        const endTime = performance.now();

        return {
            success: response.ok,
            statusCode: response.status,
            responseTime: Math.round(endTime - startTime),
            error: response.ok
                ? null
                : `HTTP Status ${response.status} on ${url}`,
        };
    } catch (error) {
        const endTime = performance.now();
        let errorMessage = `Network error or resource not found at ${url}.`;
        if (error instanceof DOMException && error.name === "AbortError") {
            errorMessage = `Request timed out for ${url}.`;
        } else if (
            error instanceof TypeError &&
            error.message.toLowerCase().includes("failed to fetch")
        ) {
            errorMessage = `Failed to fetch ${url} (Check CORS, DNS, Network, or URL validity).`;
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }
        return {
            success: false,
            statusCode: null,
            responseTime: Math.round(endTime - startTime),
            error: errorMessage,
        };
    }
}

/**
 * Asynchronously performs a TCP port scan via a server-side API/proxy.
 * Direct browser port scanning is not possible.
 *
 * @param host The hostname or IP address to scan.
 * @param port The port number to scan.
 * @returns A promise that resolves to a PortScanResult object.
 * @throws Throws an error if the proxy API endpoint is not configured or fails.
 */
export async function scanPort(
    host: string,
    port: number
): Promise<PortScanResult> {
    const proxyApiEndpoint = 'http://localhost:4978/api/scan-port';

    try {
        const response = await fetch(proxyApiEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ host, port }),
            signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) {
            const errorBody = await response.text().catch(() => `Status: ${response.status}`);
            throw new Error(`Port scan proxy failed: ${errorBody}`);
        }
        const result: { isOpen: boolean; message?: string } = await response.json();
        if (typeof result.isOpen !== 'boolean') {
            throw new Error('Invalid response from port scan proxy.');
        }
        return { port, isOpen: result.isOpen, message: result.message || "Scanned via server proxy." };
    } catch (error) {
        return {
            port,
            isOpen: false,
            message: "Scanned via server proxy.",
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Maps DNS record type numbers (from DoH) to their string representation.
 * @param typeNumber The numerical type from the DoH response.
 * @returns The string representation (e.g., "A", "AAAA", "MX").
 */
function mapDnsTypeNumberToString(typeNumber: number): string {
    // Based on https://www.iana.org/assignments/dns-parameters/dns-parameters.xhtml#dns-parameters-4
    switch (typeNumber) {
        case 1:
            return "A";
        case 2:
            return "NS";
        case 5:
            return "CNAME";
        case 6:
            return "SOA";
        case 12:
            return "PTR";
        case 15:
            return "MX";
        case 16:
            return "TXT";
        case 28:
            return "AAAA";
        case 33:
            return "SRV";
        case 41:
            return "OPT";
        case 257:
            return "CAA";
        default:
            return `TYPE${typeNumber}`;
    }
}

/**
 * Asynchronously performs a DNS lookup via a server-side API/proxy or DoH.
 * Uses Google's public DNS over HTTPS (DoH).
 * Handles Punycode for the input name implicitly via URL encoding.
 *
 * @param name The hostname (can be Unicode/IDN) or IP address (for PTR) to lookup.
 * @param recordType The type of DNS record (e.g., A, AAAA, MX, TXT, ANY, PTR). Defaults to 'A'.
 * @returns A promise that resolves to an array of DnsRecord objects for the specified type.
 * @throws Throws an error on network failure or non-OK response from DoH server (excluding NXDOMAIN).
 */
export async function fetchDnsRecords(
    name: string,
    recordType: string = "A"
): Promise<DnsRecord[]> {
    let dohName = name;
    if (recordType === "PTR" && /^[0-9.]+$/.test(name)) {
        dohName = name.split(".").reverse().join(".") + ".in-addr.arpa";
    } else if (recordType === "PTR" && name.includes(":")) {
        const expanded = expandIPv6(name);
        if (expanded) {
            dohName =
                expanded.replace(/:/g, "").split("").reverse().join(".") +
                ".ip6.arpa";
        } else {
            console.warn(`Could not expand IPv6 for PTR lookup: ${name}`);
            throw new Error(`Invalid IPv6 address for PTR lookup: ${name}`);
        }
    }
    const dohUrl = `https://dns.google/resolve?name=${encodeURIComponent(
        dohName
    )}&type=${recordType}`;

    try {
        const response = await fetch(dohUrl, {
            method: "GET",
            headers: { Accept: "application/dns-json" },
            signal: AbortSignal.timeout(5000),
        });

        if (!response.ok) {
            throw new Error(
                `DNS lookup via DoH failed: ${response.status} ${response.statusText}`
            );
        }

        const data = await response.json();

        // Status codes: 0 (NOERROR), 1 (FORMERR), 2 (SERVFAIL), 3 (NXDOMAIN), etc.
        if (data.Status !== 0) {
            // NXDOMAIN (3) means the record doesn't exist - return empty array, not an error.
            if (data.Status === 3) return [];
            console.warn(
                `DoH query for ${dohName} [${recordType}] returned status ${data.Status}`
            );
            throw new Error(
                `DoH query for ${recordType} records returned status ${data.Status}`
            );
        }

        if (!data.Answer) {
            return [];
        }

        const records: DnsRecord[] = data.Answer.map((answer: any) => {
            const mappedType = mapDnsTypeNumberToString(answer.type);
            let recordValue = answer.data;

            if (mappedType === "TXT" && typeof recordValue === "string") {
                if (recordValue.startsWith('"') && recordValue.endsWith('"')) {
                    recordValue = recordValue.substring(
                        1,
                        recordValue.length - 1
                    );
                }
                recordValue = recordValue.split('" "').join("");
            } else if (mappedType === "TXT" && Array.isArray(recordValue)) {
                recordValue = recordValue.join("");
            }

            let priority: number | undefined = undefined;
            if (mappedType === "MX" && typeof answer.data === "string") {
                const parts = answer.data.trim().split(/\s+/);
                if (parts.length >= 2 && /^\d+$/.test(parts[0])) {
                    priority = parseInt(parts[0], 10);
                    recordValue = parts.slice(1).join(" ");
                }
            }

            if (
                typeof recordValue === "string" &&
                ["CNAME", "MX", "NS", "PTR", "SOA", "SRV"].includes(mappedType)
            ) {
                recordValue = recordValue.replace(/\.$/, "");
            }

            return {
                type: mappedType,
                value: String(recordValue),
                ttl: answer.TTL,
                priority: priority,
            } as DnsRecord;
        }).filter((record) => record.type !== "OPT");

        return records;
    } catch (error) {
        console.error(
            `Error performing DNS lookup for ${dohName} [${recordType}]:`,
            error
        );
        let message = `An unknown error occurred during ${recordType} DNS lookup.`;
        if (error instanceof DOMException && error.name === "AbortError") {
            message = `DNS query for ${recordType} timed out.`;
        } else if (error instanceof Error) {
            message = error.message;
        }
        return [];
    }
}

/**
 * Performs DNS lookups for common record types (A, AAAA, MX, TXT, NS, CNAME, SOA) for a given hostname.
 * Excludes PTR as it's handled separately for IP inputs.
 * Uses fetchDnsRecords internally. Handles Punycode implicitly.
 *
 * @param hostname The hostname (can be Unicode/IDN) to lookup.
 * @returns A promise that resolves to a record object where keys are record types (e.g., "A", "MX")
 *          and values are arrays of DnsRecord objects. Returns empty object if hostname is invalid or all lookups fail.
 */
export async function performDnsLookup(
    hostname: string
): Promise<Record<string, DnsRecord[]>> {
    if (
        !hostname ||
        typeof hostname !== "string" ||
        hostname.length === 0 ||
        hostname.includes("/")
    ) {
        console.warn(`Invalid hostname provided for DNS lookup: ${hostname}`);
        return {};
    }

    const recordTypes = ["A", "AAAA", "MX", "TXT", "NS", "CNAME", "SOA"];
    const results: Record<string, DnsRecord[]> = {};
    let hasAnySuccess = false;

    const settledResults = await Promise.allSettled(
        recordTypes.map((type) => fetchDnsRecords(hostname, type))
    );

    settledResults.forEach((result, index) => {
        const type = recordTypes[index];
        if (result.status === "fulfilled") {
            if (result.value.length > 0) {
                results[type] = result.value;
                hasAnySuccess = true;
            }
        } else {
            if (
                !(
                    result.reason instanceof Error &&
                    result.reason.message.includes("DoH query for")
                )
            ) {
                console.error(
                    `Failed to fetch DNS records for type ${type} for ${hostname}:`,
                    result.reason
                );
            }
        }
    });

    if (!hasAnySuccess && Object.keys(results).length === 0) {
        console.warn(
            `All DNS lookups failed or returned no records for hostname: ${hostname}`
        );
        return {};
    }

    return results;
}

function expandIPv6(ip: string): string | null {
    if (!ip.includes(":")) return null;

    if (ip.startsWith("::ffff:") && ip.split(":").length === 7) {
        const ipv4Part = ip.substring(7);
        if (/^[0-9.]+$/.test(ipv4Part)) {
            console.warn(
                `Treating IPv4-mapped address ${ip} as IPv4 for PTR lookup.`
            );
            return ipv4Part.split(".").reverse().join(".") + ".in-addr.arpa";
        }
    }

    if (ip === "::")
        return (
            "0000:0000:0000:0000:0000:0000:0000:0000"
                .replace(/:/g, "")
                .split("")
                .reverse()
                .join(".") + ".ip6.arpa"
        );

    let parts = ip.split("::");
    let part1: string[] = [];
    let part2: string[] = [];

    if (parts.length > 2) return null;

    if (parts.length === 1) {
        part1 = ip.split(":");
        if (part1.length !== 8) return null;
    } else {
        part1 = parts[0] ? parts[0].split(":") : [];
        part2 = parts[1] ? parts[1].split(":") : [];
    }

    part1 = part1.filter((p) => p.length > 0);
    part2 = part2.filter((p) => p.length > 0);

    const missingPartsCount = 8 - (part1.length + part2.length);
    if (missingPartsCount < 0 || missingPartsCount > 7) return null;

    const zeros = Array(missingPartsCount).fill("0000");

    const fullParts = [
        ...part1.map((part) => part.padStart(4, "0")),
        ...zeros,
        ...part2.map((part) => part.padStart(4, "0")),
    ];

    if (
        fullParts.length !== 8 ||
        fullParts.some(
            (part) => part.length !== 4 || !/^[0-9a-fA-F]{4}$/.test(part)
        )
    ) {
        console.error("Failed IPv6 expansion validation:", ip, fullParts);
        return null;
    }

    return (
        fullParts.join(":").replace(/:/g, "").split("").reverse().join(".") +
        ".ip6.arpa"
    );
}
