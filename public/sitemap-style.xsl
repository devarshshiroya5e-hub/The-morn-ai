<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:sm="http://www.sitemaps.org/schemas/sitemap/0.9">
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <title>MornAI XML Sitemap</title>
        <style>
          :root { color-scheme: light; --ink: #202534; --muted: #687386; --line: #e4e8ef; --blue: #3659d9; --surface: #ffffff; --page: #f6f8fc; }
          * { box-sizing: border-box; }
          body { margin: 0; background: var(--page); color: var(--ink); font: 15px/1.6 Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
          .wrap { width: min(1040px, calc(100% - 40px)); margin: 54px auto; }
          .header { margin-bottom: 28px; }
          .brand { display: inline-flex; align-items: center; color: var(--ink); font-size: 14px; font-weight: 800; letter-spacing: .12em; text-decoration: none; text-transform: uppercase; }
          .eyebrow { margin: 22px 0 7px; color: var(--blue); font-size: 11px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
          h1 { margin: 0 0 8px; font-size: clamp(30px, 5vw, 42px); line-height: 1.15; letter-spacing: -.04em; }
          .intro { max-width: 720px; margin: 0; color: var(--muted); }
          .summary { margin: 28px 0 12px; color: var(--muted); }
          .summary strong { color: var(--ink); }
          .table-wrap { overflow-x: auto; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); box-shadow: 0 12px 32px rgba(29, 42, 72, .05); }
          table { width: 100%; border-collapse: collapse; text-align: left; }
          th { padding: 13px 16px; background: #f0f3fa; color: #475268; font-size: 12px; font-weight: 750; }
          td { padding: 13px 16px; border-top: 1px solid var(--line); vertical-align: top; }
          tbody tr:hover { background: #f8faff; }
          a { color: var(--blue); text-decoration: none; overflow-wrap: anywhere; }
          a:hover { text-decoration: underline; }
          .date { width: 210px; color: var(--muted); white-space: nowrap; }
          .empty { color: #929bad; }
          .footer { margin-top: 18px; color: #8a93a3; font-size: 12px; }
          @media (max-width: 620px) { .wrap { width: calc(100% - 24px); margin: 28px auto; } th, td { padding: 11px 10px; } .date { width: auto; } }
        </style>
      </head>
      <body>
        <main class="wrap">
          <header class="header">
            <a class="brand" href="https://themorn-ai.web.app/">MornAI</a>
            <p class="eyebrow">Search engine discovery</p>
            <h1>XML Sitemap</h1>
            <p class="intro">This sitemap helps search engines discover MornAI's public pages. The links below are also available to browse directly.</p>
          </header>
          <xsl:choose>
            <xsl:when test="sm:sitemapindex">
              <p class="summary">This XML Sitemap Index contains <strong><xsl:value-of select="count(sm:sitemapindex/sm:sitemap)"/></strong> sitemaps.</p>
              <div class="table-wrap">
                <table>
                  <thead><tr><th>Sitemap</th><th class="date">Last Modified</th></tr></thead>
                  <tbody>
                    <xsl:for-each select="sm:sitemapindex/sm:sitemap">
                      <tr>
                        <td><a href="{sm:loc}"><xsl:value-of select="sm:loc"/></a></td>
                        <td class="date"><xsl:choose><xsl:when test="sm:lastmod"><xsl:value-of select="sm:lastmod"/></xsl:when><xsl:otherwise><span class="empty">—</span></xsl:otherwise></xsl:choose></td>
                      </tr>
                    </xsl:for-each>
                  </tbody>
                </table>
              </div>
            </xsl:when>
            <xsl:when test="sm:urlset">
              <p class="summary">This XML Sitemap contains <strong><xsl:value-of select="count(sm:urlset/sm:url)"/></strong> URLs.</p>
              <div class="table-wrap">
                <table>
                  <thead><tr><th>URL</th><th class="date">Last Modified</th></tr></thead>
                  <tbody>
                    <xsl:for-each select="sm:urlset/sm:url">
                      <tr>
                        <td><a href="{sm:loc}"><xsl:value-of select="sm:loc"/></a></td>
                        <td class="date"><xsl:choose><xsl:when test="sm:lastmod"><xsl:value-of select="sm:lastmod"/></xsl:when><xsl:otherwise><span class="empty">—</span></xsl:otherwise></xsl:choose></td>
                      </tr>
                    </xsl:for-each>
                  </tbody>
                </table>
              </div>
            </xsl:when>
            <xsl:otherwise>
              <p class="summary">This document is not a recognized sitemap format.</p>
            </xsl:otherwise>
          </xsl:choose>
          <p class="footer">MornAI XML Sitemap · <a href="https://themorn-ai.web.app/">Visit MornAI</a></p>
        </main>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
