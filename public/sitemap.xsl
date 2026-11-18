<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet
  version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
  exclude-result-prefixes="sitemap">
  <xsl:output method="html" encoding="UTF-8" indent="yes" />
  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex, follow" />
        <title>MornAI XML Sitemap</title>
        <link rel="icon" type="image/jpeg" href="https://mornai.work.gd/mornai-logo.jpg" />
        <style><![CDATA[
          :root { color-scheme: light; --ink: #111827; --muted: #64748b; --line: #e5eaf2; --blue: #4f46e5; --page: #f7f9fc; }
          * { box-sizing: border-box; }
          body { margin: 0; min-height: 100vh; color: var(--ink); background: radial-gradient(ellipse at 12% 0%, rgba(99,102,241,.11), transparent 34rem), radial-gradient(ellipse at 92% 8%, rgba(56,189,248,.10), transparent 30rem), var(--page); font: 15px/1.6 Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
          a { color: var(--blue); text-decoration: none; }
          a:hover { text-decoration: underline; }
          .topbar, main, footer { width: min(1080px, calc(100% - 40px)); margin-left: auto; margin-right: auto; }
          .topbar { min-height: 76px; display: flex; align-items: center; justify-content: space-between; gap: 20px; border-bottom: 1px solid rgba(226,232,240,.85); }
          .brand-wrap { display: flex; align-items: baseline; gap: 14px; }
          .brand { color: #111827; font-size: 21px; font-weight: 850; letter-spacing: -.055em; }
          .brand span { color: var(--blue); }
          .domain { color: #94a3b8; font-size: 12px; }
          .visit-link { font-size: 13px; font-weight: 700; }
          main { padding: 64px 0 44px; }
          .eyebrow { margin: 0 0 12px; color: var(--blue); font-size: 11px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
          h1 { margin: 0; font-size: clamp(36px, 5vw, 54px); line-height: 1.08; letter-spacing: -.055em; }
          .intro-copy { max-width: 690px; margin: 16px 0 26px; color: var(--muted); font-size: 16px; }
          .count { display: inline-flex; align-items: center; gap: 9px; padding: 8px 13px; border: 1px solid #dfe5ff; border-radius: 999px; color: #3730a3; background: rgba(238,242,255,.85); font-size: 12px; font-weight: 750; }
          .count strong { font-size: 14px; }
          .table-card { overflow: hidden; margin-top: 34px; border: 1px solid var(--line); border-radius: 18px; background: #fff; box-shadow: 0 16px 48px rgba(15,23,42,.055); }
          .table-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 21px 24px; border-bottom: 1px solid var(--line); }
          h2 { margin: 0; font-size: 16px; letter-spacing: -.02em; }
          .table-heading span { color: var(--muted); font-size: 12px; }
          .table-scroll { overflow-x: auto; }
          table { width: 100%; border-collapse: collapse; text-align: left; }
          th { padding: 13px 24px; color: #64748b; background: #fafbfe; font-size: 10px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
          td { padding: 17px 24px; border-top: 1px solid #edf0f5; vertical-align: middle; }
          td:first-child { min-width: 270px; overflow-wrap: anywhere; }
          td:first-child a { font-size: 13px; font-weight: 650; }
          td:last-child { width: 160px; white-space: nowrap; color: #64748b; font-size: 13px; }
          tbody tr:hover { background: #fbfcff; }
          footer { padding: 23px 0 34px; border-top: 1px solid var(--line); color: #94a3b8; font-size: 12px; }
          footer a { margin-left: 5px; font-weight: 700; }
          @media (max-width: 620px) { .topbar, main, footer { width: min(100% - 28px, 1080px); } .topbar { min-height: 66px; } .domain { display: none; } main { padding-top: 45px; } .table-heading { padding: 17px; } th, td { padding: 14px 17px; } td:last-child { width: 120px; } }
        ]]></style>
      </head>
      <body>
        <header class="topbar">
          <div class="brand-wrap">
            <a class="brand" href="https://mornai.work.gd/" aria-label="MornAI home">MORN<span>AI</span></a>
            <span class="domain">mornai.work.gd</span>
          </div>
          <a class="visit-link" href="https://mornai.work.gd/">Visit website &#8599;</a>
        </header>
        <main>
          <section>
            <p class="eyebrow">Search engine discovery</p>
            <h1>XML Sitemap</h1>
            <p class="intro-copy">This sitemap helps search engines discover MornAI's public pages. Select any URL below to open that page directly.</p>
            <div class="count"><strong><xsl:value-of select="count(/sitemap:urlset/sitemap:url)" /></strong> public URLs</div>
          </section>
          <section class="table-card" aria-label="Sitemap URLs">
            <div class="table-heading"><h2>Public pages</h2><span>Canonical URLs on MornAI</span></div>
            <div class="table-scroll">
              <table>
                <thead><tr><th scope="col">URL</th><th scope="col">Last Modified</th></tr></thead>
                <tbody>
                  <xsl:for-each select="/sitemap:urlset/sitemap:url">
                    <tr>
                      <td><a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc" /></a></td>
                      <td>
                        <xsl:choose>
                          <xsl:when test="sitemap:lastmod"><time datetime="{sitemap:lastmod}"><xsl:value-of select="sitemap:lastmod" /></time></xsl:when>
                          <xsl:otherwise>—</xsl:otherwise>
                        </xsl:choose>
                      </td>
                    </tr>
                  </xsl:for-each>
                </tbody>
              </table>
            </div>
          </section>
        </main>
        <footer>MornAI XML Sitemap · <a href="https://mornai.work.gd/">Visit MornAI</a></footer>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
