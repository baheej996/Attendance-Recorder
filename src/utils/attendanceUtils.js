/**
 * Utility functions for date-aware and admission-aware attendance calculations.
 */

/**
 * Checks whether a student was enrolled and expected to attend on a given date.
 * If admissionDate is not set, returns true (unknown, handled by mentor).
 *
 * @param {Object} student - Student object with admissionDate ('YYYY-MM-DD')
 * @param {string} dateStr - Date string in 'YYYY-MM-DD'
 * @returns {boolean} True if the date is on or after the student's admission date
 */
export const isStudentEnrolledOnDate = (student, dateStr) => {
    if (!student || !dateStr) return true;
    if (!student.admissionDate) return true;
    return dateStr >= student.admissionDate;
};

/**
 * Checks if an attendance record is countable towards valid attendance statistics.
 * Records before admission date or marked 'Not Applicable' are excluded.
 *
 * @param {Object} record - Attendance record ({ date, status, studentId })
 * @param {Object} student - Student object ({ admissionDate, ... })
 * @returns {boolean} True if countable towards presence/absence rate
 */
export const isCountableAttendanceRecord = (record, student) => {
    if (!record || !record.status) return false;
    const status = String(record.status).trim();
    if (status === 'Not Applicable' || status === 'Not Enrolled Yet') return false;
    if (student?.admissionDate && record.date && record.date < student.admissionDate) return false;
    return status === 'Present' || status === 'Absent' || status === 'Late';
};

/**
 * Computes attendance summary statistics for a student, respecting their admission date
 * and ignoring any 'Not Applicable' records.
 *
 * @param {Array} attendanceList - Array of attendance records
 * @param {Object} student - Student object
 * @returns {Object} { totalDays, presentDays, absentDays, percentage, records }
 */
export const calculateStudentAttendanceStats = (attendanceList = [], student = null) => {
    const studentId = student?.id;
    const admissionDate = student?.admissionDate;

    const filteredRecords = (attendanceList || []).filter(r => {
        if (studentId && r.studentId !== studentId) return false;
        if (admissionDate && r.date && r.date < admissionDate) return false;
        const status = String(r.status || '').trim();
        return status !== 'Not Applicable' && status !== 'Not Enrolled Yet';
    });

    const presentDays = filteredRecords.filter(r => r.status === 'Present' || r.status === 'Late').length;
    const absentDays = filteredRecords.filter(r => r.status === 'Absent').length;
    const totalDays = presentDays + absentDays;
    const percentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;

    return {
        totalDays,
        presentDays,
        absentDays,
        percentage,
        records: filteredRecords
    };
};
