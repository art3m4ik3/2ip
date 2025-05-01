/** @type {import('next-sitemap').IConfig} */
module.exports = {
    siteUrl: "https://2ip.pro",
    generateRobotsTxt: true,
    robotsTxtOptions: {
        policies: [{ userAgent: "*", allow: "/", disallow: "" }],
    },
    sitemapSize: 5000,
};
