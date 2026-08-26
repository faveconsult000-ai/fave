# Fave Smart SEO

A lightweight SEO command center for ecommerce pages. Enter a public URL to scan core on-page signals and receive an actionable score. The MVP also includes a server-side Shopify GraphQL connector for product and collection SEO analysis.

## MVP

- SEO analysis dashboard
- URL scanner
- SEO score out of 100
- Page title and meta description checks
- H1 detection
- Canonical and robots directive checks
- Content-depth estimate
- Image alt-text coverage
- Page-link inspection
- Responsive browser interface
- Node.js backend with no external runtime dependencies
- Shopify GraphQL Admin API product/collection SEO analysis

## Run locally

Requires Node.js 20+.

```bash
npm start
```

Then open `http://localhost:3000`.

## Shopify connector

The connector uses Shopify's GraphQL Admin API. The default version is `2026-07` and can be changed with `SHOPIFY_API_VERSION`.

Copy `.env.example` to `.env` and set:

```bash
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxxxxxxxxxxxxxxxx
SHOPIFY_API_VERSION=2026-07
PORT=3000
```

Then call:

```text
GET /api/shopify/analyze
```

The endpoint returns a store-level SEO score plus product and collection findings for missing/out-of-range SEO titles and descriptions and shallow product descriptions.

**Security:** never commit a Shopify access token. The token must stay server-side. For a production public app, replace the development environment-token flow with Shopify OAuth/session handling and request only the scopes the app needs.

## Product direction

```text
Website
  → Technical SEO scan
  → Shopify integration
  → Google Search Console
  → Google Merchant Center
  → AI recommendations
  → Prioritized fixes
  → Growth tracking
```

## Roadmap

1. Complete Shopify OAuth/install flow and store connection UI
2. Google Search Console integration and indexing diagnostics
3. Google Merchant Center diagnostics and product-feed health
4. AI-generated fixes and content briefs
5. Sitewide crawl and prioritized SEO backlog
6. Saved audits, history and progress tracking
7. Automated recommendations and measurable growth reporting
