# 2ip

**2ip** — Modern IP Address Lookup & Network Utilities

---

## 🛠️ Tech Stack

-   **Framework**: Next.js 15 (App Router)
-   **Language**: TypeScript
-   **Styling**: Tailwind CSS
-   **Sitemap & SEO**: next-sitemap, metadata API

---

## 📦 Installation

1. Clone this repository:
    ```bash
    git clone https://github.com/art3m4ik3/2ip.git
    cd 2ip
    ```
2. Install dependencies:
    ```bash
    bun i
    ```

### Development

```bash
bun run dev
```

### Production Build & Run

```bash
bun run build
bun run start
```

---

## 🐳 Docker

Build and run with Docker Compose:

```bash
docker-compose up --build
```

Or build and run only the web service:

```bash
docker build -t 2ip .
docker run -p 3000:3000 2ip
```

---

## ⚙️ Configuration

-   **Environment**: via `NODE_ENV=production`
-   **Site URL**: set in `next-sitemap.config.js` (`siteUrl: 'https://2ip.pro'`)
-   **Metadata**: defined in `app/layout.tsx`

---

## 📝 Scripts

-   `bun run dev` — development server
-   `bun run build` — build production bundle
-   `bun run start` — start production server
-   `bun run lint` — run Next.js linting
-   `bun run postbuild` — generate sitemap & robots.txt
