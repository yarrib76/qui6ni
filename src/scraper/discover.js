import { env } from '../config/env.js';
import { downloadHtml } from './downloader.js';
import { discoverResultLinks, discoverYearArchiveLinks } from './parser.js';

export async function discoverHistoricalLinks(startYear = env.scraper.startYear) {
  const archiveUrl = new URL(env.scraper.archivePath, env.scraper.baseUrl).toString();
  const [homeHtml, archiveHtml] = await Promise.all([
    downloadHtml(env.scraper.baseUrl),
    downloadHtml(archiveUrl)
  ]);

  const links = [
    ...discoverResultLinks(homeHtml, env.scraper.baseUrl, startYear),
    ...discoverResultLinks(archiveHtml, env.scraper.baseUrl, startYear)
  ];

  const archiveLinks = new Map();
  for (const archiveLink of [
    ...discoverYearArchiveLinks(homeHtml, env.scraper.baseUrl, startYear),
    ...discoverYearArchiveLinks(archiveHtml, env.scraper.baseUrl, startYear)
  ]) {
    archiveLinks.set(archiveLink.url, archiveLink);
  }

  const yearPages = await Promise.all(
    Array.from(archiveLinks.values()).map(async (archiveLink) => {
      const html = await downloadHtml(archiveLink.url);
      return discoverResultLinks(html, archiveLink.url, startYear);
    })
  );

  for (const pageLinks of yearPages) {
    links.push(...pageLinks);
  }

  const deduped = new Map();
  for (const link of links) deduped.set(link.url, link);
  return Array.from(deduped.values()).sort((a, b) => {
    const yearDiff = (b.year || 0) - (a.year || 0);
    return yearDiff || b.url.localeCompare(a.url);
  });
}
