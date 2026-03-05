// application/util/search-query-parser.js

/**
 * Parses advanced search operators from a raw query string.
 *
 * Supported operators:
 *   - filetype:<ext>           e.g. "filetype:pdf cake" → files ending in .pdf with "cake" in title
 *   - intitle:<word>           e.g. "intitle:elections"  → exact word match in title
 *   - intitle:"<phrase>"       e.g. "intitle:\"us elections\"" → exact phrase match in title
 *   - allintitle:t1 t2 t3      e.g. "allintitle:daily logo favicon" → every word must appear in title
 *   - author:<name>            e.g. "author:john" → files/folders by author matching "john"
 *   - author:"<full name>"     e.g. "author:\"DP admin\"" → files/folders by author matching "DP admin"
 */
class SearchQueryParser {

  /**
   * @param {string} rawQuery
   * @returns {{ searchTerm: string, filetype: string|null, intitle: string|null, allintitle: string[]|null, author: string|null }}
   */
  static parse(rawQuery) {
    if (!rawQuery || typeof rawQuery !== 'string') {
      return { searchTerm: '', filetype: null, intitle: null, allintitle: null, author: null };
    }

    let filetype = null;
    let intitle = null;
    let allintitle = null;
    let author = null;

    // Extract filetype:<ext>
    const filetypeRegex = /filetype:([a-z0-9]+)/i;
    const filetypeMatch = rawQuery.match(filetypeRegex);
    if (filetypeMatch) {
      filetype = filetypeMatch[1].toLowerCase();
      rawQuery = rawQuery.replace(filetypeMatch[0], '');
    }

    // Extract author:"<name>" or author:<word>
    const authorRegex = /author:(?:"([^"]+)"|(\S+))/i;
    const authorMatch = rawQuery.match(authorRegex);
    if (authorMatch) {
      author = authorMatch[1] || authorMatch[2];
      rawQuery = rawQuery.replace(authorMatch[0], '');
    }

    // Extract allintitle: (consumes all remaining terms after the operator)
    const allintitleRegex = /allintitle:(.+)/i;
    const allintitleMatch = rawQuery.match(allintitleRegex);
    if (allintitleMatch) {
      const terms = allintitleMatch[1].trim().split(/\s+/).filter(Boolean);
      if (terms.length > 0) {
        allintitle = terms.map(t => t.toLowerCase());
      }
      rawQuery = rawQuery.replace(allintitleMatch[0], '');
    }

    // Extract intitle:"<phrase>" or intitle:<word> (only if allintitle not present)
    if (!allintitle) {
      const intitleRegex = /intitle:(?:"([^"]+)"|([a-z0-9_-]+))/i;
      const intitleMatch = rawQuery.match(intitleRegex);
      if (intitleMatch) {
        intitle = (intitleMatch[1] || intitleMatch[2]).toLowerCase();
        rawQuery = rawQuery.replace(intitleMatch[0], '');
      }
    }

    return { searchTerm: rawQuery.trim(), filetype, intitle, allintitle, author };
  }
}

module.exports = SearchQueryParser;
