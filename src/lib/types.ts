import type { IpInfo } from "@/services/ip-lookup";
import type {
    DnsRecord,
    HttpCheckResult,
    PingResult,
    PortScanResult,
} from "@/services/network-utils";

export interface IpLookupResult {
    ipInfo: IpInfo | null;
    resolvedIp: string | null;
    submittedIp: string | null;
    pingResult: PingResult | null;
    httpCheckResult: HttpCheckResult | null;
    portScanResults: PortScanResult[] | null;
    dnsLookupResult: Record<string, DnsRecord[]> | null;
}
