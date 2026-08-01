// Odoo rich-text fields (venue/organizer descriptions) come back as HTML
// fragments like "<p>text</p>". The admin UI edits and displays them as plain
// text, so we strip tags and decode common entities. No DOM dependency: safe
// in server components and client components alike.

/** Convert an HTML fragment to plain text (tags stripped, entities decoded). */
export function htmlToPlainText(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/g, "'")
    .trim();
}
