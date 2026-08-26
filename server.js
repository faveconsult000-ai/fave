import http from 'node:http';
import { URL } from 'node:url';
import { analyzeShopifyStore } from './shopify.js';

const PORT = Number(process.env.PORT || 3000);

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' });
  res.end(JSON.stringify(body));
}

function scorePage({ title, description, h1, canonical, robots, wordCount, images }) {
  const checks = [
    ['Title', title.length >= 30 && title.length <= 60, 'Aim for 30–60 characters.'],
    ['Meta description', description.length >= 120 && description.length <= 160, 'Aim for 120–160 characters.'],
    ['H1', Boolean(h1), 'Add one clear primary H1.'],
    ['Canonical', Boolean(canonical), 'Add a canonical URL.'],
    ['Robots', Boolean(robots), 'Declare an index/follow policy.'],
    ['Content depth', wordCount >= 300, 'Build at least 300 useful words around search intent.'],
    ['Image SEO', images.total === 0 || images.withAlt / images.total >= 0.8, 'Add descriptive alt text to images.']
  ];
  const passed = checks.filter(([, ok]) => ok).length;
  return { score: Math.round((passed / checks.length) * 100), checks };
}

function extract(html, baseUrl) {
  const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').replace(/\s+/g, ' ').trim();
  const description = (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1] || '').trim();
  const h1 = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1] || '';
  const robots = html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i)?.[1] || '';
  const images = [...html.matchAll(/<img\b[^>]*>/gi)].map(m => m[0]);
  const withAlt = images.filter(img => /\balt=["'][^"']+[^"']["']/i.test(img)).length;
  const links = [...html.matchAll(/<a\b[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].slice(0, 100).map(m => ({ href: new URL(m[1], baseUrl).href, text: m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() }));
  const words = text ? text.split(/\s+/).length : 0;
  const result = { url: baseUrl, title, description, h1, canonical, robots, wordCount: words, images: { total: images.length, withAlt }, links };
  return { ...result, ...scorePage(result) };
}

async function analyze(target) {
  const url = new URL(target);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only HTTP and HTTPS URLs are supported.');
  const response = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'FaveSmartSEO/0.1' } });
  if (!response.ok) throw new Error(`Target returned HTTP ${response.status}.`);
  const html = await response.text();
  return extract(html, response.url);
}

const appHtml = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fave Smart SEO</title><style>
:root{font-family:Inter,system-ui,sans-serif;color:#18201b;background:#f6f8f5}*{box-sizing:border-box}body{margin:0}.shell{max-width:1120px;margin:auto;padding:28px 20px}.nav{display:flex;justify-content:space-between;align-items:center;margin-bottom:60px}.brand{font-weight:900;font-size:25px;letter-spacing:-1px}.pill{background:#e6f4df;color:#27651e;border-radius:999px;padding:8px 12px;font-size:12px;font-weight:700}.hero{max-width:800px}.eyebrow{font-size:12px;font-weight:800;color:#5b675e;text-transform:uppercase;letter-spacing:1.4px}.hero h1{font-size:clamp(42px,7vw,76px);line-height:.98;letter-spacing:-4px;margin:16px 0}.hero p{font-size:19px;line-height:1.55;color:#657068;max-width:700px}.form{display:flex;gap:10px;margin:30px 0 48px;max-width:760px}.form input{flex:1;padding:17px 18px;border:1px solid #d4dbd5;border-radius:12px;background:white;font-size:15px}.form button{border:0;border-radius:12px;padding:0 24px;background:#172019;color:white;font-weight:800;cursor:pointer}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.card{background:white;border:1px solid #e0e6e0;border-radius:16px;padding:20px}.card h3{margin:0 0 8px}.card p{margin:0;color:#6c756e;line-height:1.5;font-size:14px}.result{display:none;margin-top:24px}.score{font-size:64px;font-weight:900;letter-spacing:-3px}.muted{color:#6c756e}.check{display:flex;justify-content:space-between;border-bottom:1px solid #edf0ed;padding:14px 0}.ok{color:#2d7b28;font-weight:800}.bad{color:#b54a2d;font-weight:800}.error{color:#a63122;background:#fff1ed;padding:14px;border-radius:10px}.links{max-height:220px;overflow:auto;font-size:13px}.links div{padding:7px 0;border-bottom:1px solid #eee}.links a{color:#315b8f;text-decoration:none}@media(max-width:700px){.form,.grid{display:grid;grid-template-columns:1fr}.form button{height:52px}.hero h1{letter-spacing:-2px}}
</style></head><body><main class="shell"><nav class="nav"><div class="brand">fave / smart seo</div><div class="pill">MVP · on-page intelligence</div></nav><section class="hero"><div class="eyebrow">SEO command center</div><h1>See what search engines see.</h1><p>Analyze any public page for core on-page SEO signals, content depth, image accessibility, canonicalization and crawl directives—then turn the findings into clear actions.</p><form class="form" id="form"><input id="url" type="url" placeholder="https://example.com/product" required><button>Analyze page</button></form></section><section class="grid"><article class="card"><h3>Technical signals</h3><p>Title, description, H1, canonical and robots directives in one scan.</p></article><article class="card"><h3>Content quality</h3><p>Estimate content depth and highlight pages that need more useful copy.</p></article><article class="card"><h3>Image SEO</h3><p>Measure image alt-text coverage so visual content is easier to understand.</p></article></section><section class="result card" id="result"></section></main><script>
const form=document.querySelector('#form'),out=document.querySelector('#result');form.addEventListener('submit',async e=>{e.preventDefault();out.style.display='block';out.innerHTML='<p class="muted">Scanning page…</p>';try{const r=await fetch('/api/analyze?url='+encodeURIComponent(document.querySelector('#url').value));const d=await r.json();if(!r.ok)throw new Error(d.error);out.innerHTML='<div class="score">'+d.score+'<span style="font-size:20px">/100</span></div><p class="muted">'+d.url+'</p><h3>Actionable checks</h3>'+d.checks.map(c=>'<div class="check"><span>'+c[0]+'<br><small class="muted">'+c[2]+'</small></span><span class="'+(c[1]?'ok':'bad')+'">'+(c[1]?'PASS':'FIX')+'</span></div>').join('')+'<h3>Page snapshot</h3><p><b>Title:</b> '+(d.title||'Missing')+'</p><p><b>H1:</b> '+(d.h1||'Missing')+'</p><p><b>Words:</b> '+d.wordCount+' · <b>Images:</b> '+d.images.withAlt+'/'+d.images.total+' with alt text</p><h3>Sample links</h3><div class="links">'+d.links.map(l=>'<div><a href="'+l.href+'" target="_blank" rel="noreferrer">'+(l.text||l.href)+'</a></div>').join('')+'</div>'}catch(err){out.innerHTML='<div class="error">'+err.message+'</div>'}});
</script></body></html>`;

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname === '/api/analyze') {
      if (!url.searchParams.get('url')) return json(res, 400, { error: 'Provide a URL to analyze.' });
      return json(res, 200, await analyze(url.searchParams.get('url')));
    }
    if (url.pathname === '/api/shopify/analyze') {
      return json(res, 200, await analyzeShopifyStore());
    }
    if (url.pathname === '/' || url.pathname === '/index.html') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(appHtml);
    }
    res.writeHead(404, { 'content-type': 'text/plain' }); res.end('Not found');
  } catch (error) { json(res, 400, { error: error.message }); }
}).listen(PORT, () => console.log(`Fave Smart SEO running on port ${PORT}`));
