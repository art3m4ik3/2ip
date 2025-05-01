export interface GeoCoordinates {
    latitude: number;
    longitude: number;
}

/**
 * Represents detailed information about an IP address fetched from ip-api.com.
 */
export interface IpInfo {
    query: string; // The *original* input query IP/domain provided by the user
    ip?: string; // The resolved IP address, might be same as query if query was an IP. Added by our logic.
    status: "success" | "fail"; // API call status
    message?: string; // Message if status is 'fail'
    country?: string | null; // Full country name
    countryCode?: string | null; // Two-letter country code (e.g., "US")
    region?: string | null; // Region/state code (e.g., "CA") - Use regionName preferably
    regionName?: string | null; // Full region/state name (e.g., "California")
    city?: string | null; // e.g., "Mountain View"
    zip?: string | null; // Postal code
    lat?: number | null; // Latitude
    lon?: number | null; // Longitude
    timezone?: string | null; // e.g., "America/Los_Angeles"
    isp?: string | null; // ISP name
    org?: string | null; // Organization name
    as?: string | null; // AS number and name (e.g., "AS15169 Google LLC")
    asname?: string | null; // AS name only (extracted)
    asn?: string | null; // AS number only (extracted)
    reverse?: string | null; // Reverse DNS (hostname)
    mobile?: boolean | null; // If the IP is from a mobile carrier
    proxy?: boolean | null; // If the IP is a known proxy/VPN
    hosting?: boolean | null; // If the IP is from a hosting provider/data center
    countryFlagUrl?: string | null; // Constructable
    localTime?: string | null; // Calculated
    geoCoordinates?: GeoCoordinates | null; // Calculated from lat/lon
}

/**
 * Extracts ASN and AS Name from the 'as' field provided by ip-api.com.
 * Example input: "AS15169 Google LLC"
 * Output: { asn: "AS15169", asname: "Google LLC" }
 */
function extractAsnInfo(asField: string | null | undefined): {
    asn: string | null;
    asname: string | null;
} {
    if (!asField) {
        return { asn: null, asname: null };
    }
    const match = asField.match(/^(AS\d+)\s+(.*)$/);
    if (match) {
        return { asn: match[1], asname: match[2].trim() };
    }
    if (asField.startsWith("AS")) {
        return { asn: asField, asname: null };
    }
    return { asn: null, asname: asField };
}

/**
 * Asynchronously retrieves detailed information about an IP address or hostname using the ip-api.com API.
 *
 * @param lookupTarget The IP address or hostname (Punycode handled implicitly by fetch) to lookup. This might be the resolved IP or the original query.
 * @returns A promise that resolves to an IpInfo object containing detailed IP information.
 * @throws Throws an error if the API request fails network-wise or the API returns status 'fail'.
 */
export async function getIpInfo(lookupTarget: string): Promise<IpInfo> {
    const apiUrl = `http://ip-api.com/json/${encodeURIComponent(
        lookupTarget
    )}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,reverse,mobile,proxy,hosting,query`;

    try {
        const response = await fetch(apiUrl, {
            method: "GET",
            headers: {
                Accept: "application/json",
            },
            signal: AbortSignal.timeout(5000),
        });

        if (!response.ok) {
            throw new Error(
                `Network error fetching from ip-api.com: ${response.status} ${response.statusText}`
            );
        }

        interface IpApiComResponse {
            query: string;
            status: "success" | "fail";
            message?: string;
            country?: string;
            countryCode?: string;
            region?: string;
            regionName?: string;
            city?: string;
            zip?: string;
            lat?: number;
            lon?: number;
            timezone?: string;
            isp?: string;
            org?: string;
            as?: string;
            reverse?: string;
            mobile?: boolean;
            proxy?: boolean;
            hosting?: boolean;
        }

        const data: IpApiComResponse = await response.json();

        if (data.status === "fail") {
            console.warn(
                `ip-api.com failed for query "${lookupTarget}": ${data.message}`
            );
            let userMessage = `Lookup failed: ${
                data.message || "Unknown reason"
            }`;
            if (data.message === "invalid query") {
                userMessage = `Invalid IP address or hostname: ${lookupTarget}`;
            } else if (
                data.message === "private range" ||
                data.message === "reserved range"
            ) {
                userMessage = `Input ${lookupTarget} is a private or reserved IP address.`;
            }
            throw new Error(userMessage);
        }

        const finalIpInfo: IpInfo = {
            query: lookupTarget,
            ip: data.query,
            status: data.status,
            message: data.message,
            country: data.country || null,
            countryCode: data.countryCode || null,
            region: data.region || null,
            regionName: data.regionName || null,
            city: data.city || null,
            zip: data.zip || null,
            lat: data.lat ?? null,
            lon: data.lon ?? null,
            timezone: data.timezone || null,
            isp: data.isp || null,
            org: data.org || null,
            as: data.as || null,
            reverse: data.reverse || null,
            mobile: data.mobile ?? null,
            proxy: data.proxy ?? null,
            hosting: data.hosting ?? null,
            // Fields to be calculated:
            asn: null,
            asname: null,
            countryFlagUrl: null,
            localTime: null,
            geoCoordinates: null,
        };

        const { asn, asname } = extractAsnInfo(data.as);
        finalIpInfo.asn = asn;
        finalIpInfo.asname = asname;

        finalIpInfo.countryFlagUrl = finalIpInfo.countryCode
            ? `https://flagcdn.com/w40/${finalIpInfo.countryCode.toLowerCase()}.png`
            : null;

        finalIpInfo.geoCoordinates =
            finalIpInfo.lat !== null &&
            finalIpInfo.lon !== null &&
            finalIpInfo.lat !== undefined &&
            finalIpInfo.lon !== undefined
                ? { latitude: finalIpInfo.lat, longitude: finalIpInfo.lon }
                : null;

        if (finalIpInfo.timezone) {
            try {
                finalIpInfo.localTime = new Date().toLocaleTimeString("en-US", {
                    timeZone: finalIpInfo.timezone,
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: false,
                });
            } catch (tzError) {
                console.error(
                    `Error calculating local time for timezone ${finalIpInfo.timezone}:`,
                    tzError
                );
                finalIpInfo.localTime = "Error";
            }
        } else {
            finalIpInfo.localTime = null;
        }

        return finalIpInfo;
    } catch (error) {
        console.error(
            `Error in getIpInfo (ip-api.com) for ${lookupTarget}:`,
            error
        );
        let specificMessage =
            "IP Info Lookup Failed: An unknown network or API error occurred.";
        if (error instanceof Error) {
            if (error.message.startsWith("Lookup failed:")) {
                specificMessage = `IP Info Lookup Failed: ${error.message.substring(
                    "Lookup failed: ".length
                )}`;
            } else if (error.message.startsWith("Invalid IP")) {
                specificMessage = `IP Info Lookup Failed: ${error.message}`;
            } else if (error.message.startsWith("Input ")) {
                specificMessage = `IP Info Lookup Failed: ${error.message}`;
            } else if (error.message.includes("Network error")) {
                specificMessage = `IP Info Lookup Failed: Could not reach the lookup service. Check network connection.`;
            } else if (
                error.name === "TimeoutError" ||
                (error instanceof DOMException && error.name === "AbortError")
            ) {
                specificMessage = "IP Info Lookup Failed: Request timed out.";
            } else {
                specificMessage = `IP Info Lookup Failed: ${error.message}`;
            }
        }
        throw new Error(specificMessage);
    }
}
