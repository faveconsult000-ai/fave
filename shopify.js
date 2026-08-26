const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || '2026-07';

const PRODUCTS_QUERY = `#graphql
query SmartSeoProducts($first: Int!) {
  products(first: $first) {
    nodes {
      id
      title
      handle
      descriptionHtml
      seo {
        title
        description
      }
      onlineStoreUrl
      status
    }
  }
  collections(first: 100) {
    nodes {
      id
      title
      handle
      seo {
        title
        description
      }
    }
  }
  shop {
    name
    primaryDomain { host url }
  }
}`;

function normalizeShopDomain(value) {
  if (!value) throw new Error('SHOPIFY_STORE_DOMAIN is required.');
  const raw = value.includes('://') ? value : `https://${value}`;
  const url = new URL(raw);
  const host = url.hostname.toLowerCase();
  if (!host.endsWith('.myshopify.com')) {
    throw new Error('For this MVP, SHOPIFY_STORE_DOMAIN must be a *.myshopify.com domain.');
  }
  return host;
}

async function shopifyGraphQL(query, variables = {}) {
  const domain = normalizeShopDomain(process.env.SHOPIFY_STORE_DOMAIN);
  const token = process.env.SHOPIFY_ACCESS_TOKEN;
  if (!token) throw new Error('SHOPIFY_ACCESS_TOKEN is required for Shopify analysis.');

  const response = await fetch(`https://${domain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-shopify-access-token': token,
      'user-agent': 'FaveSmartSEO/0.2'
    },
    body: JSON.stringify({ query, variables })
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Shopify returned HTTP ${response.status}.`);
  if (body.errors?.length) throw new Error(body.errors.map(error => error.message).join('; '));
  return body.data;
}

function lengthStatus(value, min, max) {
  const length = (value || '').trim().length;
  return { length, present: length > 0, inRange: length >= min && length <= max };
}

function analyzeShopify(data) {
  const products = data.products?.nodes || [];
  const collections = data.collections?.nodes || [];
  const productChecks = products.map(product => ({
    id: product.id,
    title: product.title,
    handle: product.handle,
    url: product.onlineStoreUrl,
    status: product.status,
    seo: {
      title: lengthStatus(product.seo?.title, 30, 60),
      description: lengthStatus(product.seo?.description, 120, 160),
      productDescriptionWords: (product.descriptionHtml || '').replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length
    }
  }));

  const collectionChecks = collections.map(collection => ({
    id: collection.id,
    title: collection.title,
    handle: collection.handle,
    seo: {
      title: lengthStatus(collection.seo?.title, 30, 60),
      description: lengthStatus(collection.seo?.description, 120, 160)
    }
  }));

  const productIssues = productChecks.reduce((count, product) => count +
    Number(!product.seo.title.inRange) +
    Number(!product.seo.description.inRange) +
    Number(product.seo.productDescriptionWords < 300), 0);

  const collectionIssues = collectionChecks.reduce((count, collection) => count +
    Number(!collection.seo.title.inRange) + Number(!collection.seo.description.inRange), 0);

  const totalChecks = products.length * 3 + collections.length * 2;
  const passed = Math.max(0, totalChecks - productIssues - collectionIssues);

  return {
    store: data.shop,
    score: totalChecks ? Math.round((passed / totalChecks) * 100) : 100,
    summary: {
      products: products.length,
      collections: collections.length,
      productIssues,
      collectionIssues
    },
    products: productChecks,
    collections: collectionChecks
  };
}

export async function analyzeShopifyStore() {
  const data = await shopifyGraphQL(PRODUCTS_QUERY, { first: 100 });
  return analyzeShopify(data);
}
