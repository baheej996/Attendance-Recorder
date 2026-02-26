export const TOTAL_QURAN_PAGES = 604;
export const TOTAL_JUZ = 30;

// Standard 15-line Madani Mushaf Juz start pages
// Index represents Juz number (0-indexed for array access, but we'll use 1-indexed in logic)
export const JUZ_START_PAGES = [
    1, 22, 42, 62, 82, 102, 122, 142, 162, 182,  // Juz 1-10
    202, 222, 242, 262, 282, 302, 322, 342, 362, 382, // Juz 11-20
    402, 422, 442, 462, 482, 502, 522, 542, 562, 582, // Juz 21-30
    605 // End boundary (virtual page 605)
];

/**
 * Calculates the current Juz based on the given page number.
 * Assumes standard Madani mushaf (15 lines, 604 pages).
 * 
 * @param {number} pageNumber - The current page number (1-604)
 * @returns {number} The current Juz number (1-30)
 */
export const getJuzFromPage = (pageNumber) => {
    if (!pageNumber || pageNumber < 1) return 1;
    if (pageNumber > TOTAL_QURAN_PAGES) return TOTAL_JUZ;

    for (let i = 0; i < TOTAL_JUZ; i++) {
        if (pageNumber >= JUZ_START_PAGES[i] && pageNumber < JUZ_START_PAGES[i + 1]) {
            return i + 1;
        }
    }
    return TOTAL_JUZ;
};

/**
 * Calculates formatting and progress details for a given page number.
 * 
 * @param {number} current_page - The current page (1-604)
 * @returns {Object} Progress statistics including percentile and boundaries.
 */
export const getQuranProgressStats = (current_page) => {
    const page = Math.max(1, Math.min(Number(current_page) || 0, TOTAL_QURAN_PAGES));
    const juz = getJuzFromPage(page);

    // Total Quran progress percentage
    const globalProgressPercentage = (page / TOTAL_QURAN_PAGES) * 100;

    // Current Juz progress
    const juzStart = JUZ_START_PAGES[juz - 1];
    const juzEnd = JUZ_START_PAGES[juz] - 1; // Last page of current juz
    const pagesInJuz = juzEnd - juzStart + 1;
    const pagesReadInJuz = page - juzStart + 1;
    const juzProgressPercentage = (pagesReadInJuz / pagesInJuz) * 100;

    return {
        currentPage: page,
        currentJuz: juz,
        globalProgressPercentage,
        juzProgressPercentage,
        juzStartPage: juzStart,
        juzEndPage: juzEnd,
        pagesRemainingInJuz: juzEnd - page,
        pagesRemainingInQuran: TOTAL_QURAN_PAGES - page
    };
};
