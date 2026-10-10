/**
 * Utility functions for student data operations, gender normalization, and sorting.
 */

/**
 * Determines the normalized gender of a student ('Male' or 'Female').
 * Checks explicit gender fields (Male, Female, Boy, Girl, M, F) as well as
 * Register Number conventions (e.g. 26M06B012 contains 'B' for Boy, 24M04G014 contains 'G' for Girl).
 */
export const getStudentGender = (student) => {
    if (!student) return 'Male';

    // 1. Check explicit gender property (case-insensitive)
    const rawGender = (student.gender || '').toString().trim().toLowerCase();
    if (['male', 'boy', 'm'].includes(rawGender)) return 'Male';
    if (['female', 'girl', 'f'].includes(rawGender)) return 'Female';

    // 2. Check Register Number pattern (e.g. 26M06B012 has 'B' for Boy, 24M04G014 has 'G' for Girl)
    const regNo = (student.registerNo || student.regNo || '').toString().trim().toUpperCase();
    if (/[0-9]B[0-9]/.test(regNo)) return 'Male';
    if (/[0-9]G[0-9]/.test(regNo)) return 'Female';

    // 3. Fallback: check if regNo has B or G
    if (regNo.includes('B') && !regNo.includes('G')) return 'Male';
    if (regNo.includes('G') && !regNo.includes('B')) return 'Female';

    // Default fallback to Male if unknown
    return 'Male';
};

export const isFemaleStudent = (student) => {
    return getStudentGender(student) === 'Female';
};

export const isMaleStudent = (student) => {
    return getStudentGender(student) === 'Male';
};

/**
 * Sorts students such that Male students are listed on top and Female students are listed below.
 * Within each gender group, students are sorted by Register Number (alphanumeric).
 */
export const sortStudentsByGender = (studentsList) => {
    if (!Array.isArray(studentsList)) return [];

    return [...studentsList].sort((a, b) => {
        const genderA = getStudentGender(a);
        const genderB = getStudentGender(b);

        if (genderA !== genderB) {
            // Male students on top (-1), Female students below (+1)
            return genderA === 'Male' ? -1 : 1;
        }

        // Secondary sort: Register Number (numeric sensitivity)
        const regA = (a.registerNo || a.rollNo || a.name || '').toString();
        const regB = (b.registerNo || b.rollNo || b.name || '').toString();
        return regA.localeCompare(regB, undefined, { numeric: true, sensitivity: 'base' });
    });
};

/**
 * Generates the next sequential unique Register Number for a student.
 * Format: [YY]M[Standard][Gender][Sequence]
 * Example: 26M08B006
 *
 * @param {Object} params
 * @param {Object} params.classObj - The class object (must have name)
 * @param {string} params.gender - 'Male', 'Female', etc.
 * @param {string} [params.admissionDate] - 'YYYY-MM-DD'
 * @param {Array} params.students - List of existing students to determine sequence & ensure uniqueness
 * @returns {string} The generated unique Register Number
 */
export const generateNextRegisterNo = ({ classObj, gender, admissionDate, students = [] }) => {
    if (!classObj || !classObj.name) {
        throw new Error('Please select a class first.');
    }

    // 1. Determine Year Prefix (YY)
    let year = new Date().getFullYear();
    if (admissionDate) {
        const parsedYear = new Date(admissionDate).getFullYear();
        if (!isNaN(parsedYear)) {
            year = parsedYear;
        }
    }
    const yearPrefix = String(year).slice(-2);

    // 2. Determine Standard Code (2 digits, e.g. 08, 10)
    const match = String(classObj.name).match(/\d+/);
    let standardCode = '00';
    if (match) {
        standardCode = match[0].padStart(2, '0');
    } else {
        standardCode = String(classObj.name).trim().slice(0, 2).toUpperCase().padEnd(2, '0');
    }

    // 3. Determine Gender Code (B for Boys/Male, G for Girls/Female)
    const normalizedGender = (gender || '').toString().trim().toLowerCase();
    const genderCode = (normalizedGender === 'female' || normalizedGender === 'girl' || normalizedGender === 'f') ? 'G' : 'B';

    // 4. Form prefix: e.g. "26M08B"
    const prefix = `${yearPrefix}M${standardCode}${genderCode}`;

    // 5. Scan all existing students to find the highest sequence number matching this prefix
    const regex = new RegExp(`^${prefix}(\\d+)$`, 'i');
    let maxSequence = 0;
    const existingRegNos = new Set();

    (students || []).forEach(s => {
        const reg = (s.registerNo || s.regNo || '').toString().trim();
        if (reg) {
            existingRegNos.add(reg.toUpperCase());
            const m = reg.match(regex);
            if (m) {
                const seq = parseInt(m[1], 10);
                if (!isNaN(seq) && seq > maxSequence) {
                    maxSequence = seq;
                }
            }
        }
    });

    // 6. Next sequence number (e.g. maxSequence + 1)
    let nextSeq = maxSequence + 1;
    let candidate = `${prefix}${String(nextSeq).padStart(3, '0')}`;

    // Safety loop to ensure 100% uniqueness against all existing register numbers
    while (existingRegNos.has(candidate.toUpperCase())) {
        nextSeq++;
        candidate = `${prefix}${String(nextSeq).padStart(3, '0')}`;
    }

    return candidate;
};

