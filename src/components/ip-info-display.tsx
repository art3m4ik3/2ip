import type { IpInfo } from "@/services/ip-lookup";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Globe,
    MapPin,
    Clock,
    Building,
    Wifi,
    Server,
    Flag,
    Calendar,
    Map as MapIcon,
    AlertCircle,
    Router,
    Info,
} from "lucide-react";
import Image from "next/image";
import { GoogleMapsEmbed } from "@next/third-parties/google";

interface IpInfoDisplayProps {
    ipInfo: IpInfo | null;
    submittedIp: string | null;
    error?: string | null;
}

export function IpInfoDisplay({
    ipInfo,
    submittedIp,
    error,
}: IpInfoDisplayProps) {
    if (!submittedIp) {
        return null;
    }

    const displayError =
        error || ipInfo?.message || "Could not retrieve IP information.";
    const showFailureCard = !ipInfo || ipInfo.status === "fail";

    const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (showFailureCard) {
        return (
            <Card className="w-full shadow-lg border-destructive/50">
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2 text-destructive">
                        <AlertCircle className="w-5 h-5" />
                        IP Information for {submittedIp}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-destructive">
                        {displayError.split(";")[0]}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                        This could be due to an invalid hostname/IP, network
                        issues, API limitations, or the target being a
                        private/reserved address.
                    </p>
                </CardContent>
            </Card>
        );
    }

    const { asn, asname } = ipInfo;
    const asnDisplay = asn ? `${asn}${asname ? ` (${asname})` : ""}` : null;
    const hasCoordinates =
        ipInfo.geoCoordinates?.latitude !== null &&
        ipInfo.geoCoordinates?.longitude !== null &&
        ipInfo.geoCoordinates?.latitude !== undefined &&
        ipInfo.geoCoordinates?.longitude !== undefined;

    const infoItems = [
        {
            icon: Router,
            label: "Hostname (Reverse DNS)",
            value: ipInfo.reverse,
        },
        { icon: Building, label: "Organization", value: ipInfo.org },
        { icon: Wifi, label: "ISP", value: ipInfo.isp },
        {
            icon: Flag,
            label: "Country",
            value: ipInfo.country,
            flagUrl: ipInfo.countryFlagUrl,
        },
        { icon: MapPin, label: "Region/State", value: ipInfo.regionName },
        { icon: MapPin, label: "City", value: ipInfo.city },
        { icon: MapPin, label: "Postal Code", value: ipInfo.zip },
        { icon: Clock, label: "Timezone", value: ipInfo.timezone },
        { icon: Calendar, label: "Local Time", value: ipInfo.localTime },
        {
            icon: MapIcon,
            label: "Geo Coordinates",
            value: hasCoordinates
                ? `${ipInfo.geoCoordinates!.latitude.toFixed(
                      4
                  )}, ${ipInfo.geoCoordinates!.longitude.toFixed(4)}`
                : "Not available",
        },
        { icon: Server, label: "ASN", value: asnDisplay },
        {
            icon: Info,
            label: "Mobile",
            value:
                ipInfo.mobile === true
                    ? "Yes"
                    : ipInfo.mobile === false
                    ? "No"
                    : null,
        },
        {
            icon: Info,
            label: "Proxy/VPN",
            value:
                ipInfo.proxy === true
                    ? "Yes"
                    : ipInfo.proxy === false
                    ? "No"
                    : null,
        },
        {
            icon: Info,
            label: "Hosting",
            value:
                ipInfo.hosting === true
                    ? "Yes"
                    : ipInfo.hosting === false
                    ? "No"
                    : null,
        },
    ];

    return (
        <Card className="w-full shadow-lg">
            <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                    <Globe className="w-5 h-5 text-primary" /> IP Information
                    for {submittedIp}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 mb-6">
                    {ipInfo.ip && ipInfo.ip !== submittedIp && (
                        <div className="flex items-start space-x-3">
                            <Server
                                className="w-5 h-5 text-accent mt-1 flex-shrink-0"
                                aria-hidden="true"
                            />
                            <div>
                                <dt className="font-semibold text-foreground">
                                    Resolved IP
                                </dt>
                                <dd className="text-muted-foreground">
                                    {ipInfo.ip || "N/A"}
                                </dd>
                            </div>
                        </div>
                    )}
                    {infoItems
                        .filter(
                            (item) =>
                                item.value !== null &&
                                item.value !== undefined &&
                                item.value !== ""
                        )
                        .map((item, index) => (
                            <div
                                key={index}
                                className="flex items-start space-x-3"
                            >
                                <item.icon
                                    className="w-5 h-5 text-accent mt-1 flex-shrink-0"
                                    aria-hidden="true"
                                />
                                <div>
                                    <dt className="font-semibold text-foreground">
                                        {item.label}
                                    </dt>
                                    <dd className="text-muted-foreground flex items-center">
                                        {item.label === "Country" &&
                                            item.flagUrl && (
                                                <span className="mr-2 w-5 h-auto inline-block align-middle">
                                                    <Image
                                                        src={item.flagUrl}
                                                        alt={`${item.value} flag`}
                                                        width={20}
                                                        height={15}
                                                        className="rounded-sm"
                                                    />
                                                </span>
                                            )}
                                        {item.value || "N/A"}
                                    </dd>
                                </div>
                            </div>
                        ))}
                </dl>

                {hasCoordinates && googleMapsApiKey ? (
                    <div className="mt-6 border-t pt-6">
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                            <MapIcon className="w-5 h-5 text-primary" />
                            Location Map
                        </h3>
                        <div className="border overflow-hidden rounded-md">
                            <GoogleMapsEmbed
                                apiKey={googleMapsApiKey}
                                height="400px"
                                width="100%"
                                mode="place"
                                q={`${ipInfo.geoCoordinates!.latitude},${
                                    ipInfo.geoCoordinates!.longitude
                                }`}
                                zoom="15"
                                style="border:0; width: 100%;"
                            />
                        </div>
                    </div>
                ) : (
                    googleMapsApiKey &&
                    !hasCoordinates && (
                        <p className="text-sm text-muted-foreground mt-4 border-t pt-4">
                            Map cannot be displayed: Coordinates not available.
                        </p>
                    )
                )}
                {!googleMapsApiKey && (
                    <p className="text-sm text-muted-foreground mt-4 border-t pt-4 italic">
                        Map cannot be displayed: Google Maps API Key is not
                        configured.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
