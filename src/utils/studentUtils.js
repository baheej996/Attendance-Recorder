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
