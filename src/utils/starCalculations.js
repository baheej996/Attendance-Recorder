import { isSameMonth, isSameYear, startOfMonth, getDaysInMonth } from 'date-fns';

export const calculateStudentStarScores = ({
    students,
    attendance,
    activities,
    activitySubmissions,
    prayerRecords,
    specialPrayers,
    ramadanLogs,
    quranProgress,
    classes,
    selectedClassId,
    mentorClassIds,
    selectedMonth,
    selectedYear,
    config,
    isMentorView
}) => {
    // If mentor view, filter by assigned classes. Otherwise, student view already filters implicitly by passing just their class data if needed, but we'll re-filter to be safe.
    let classStudents = students;

    if (isMentorView && mentorClassIds) {
        classStudents = classStudents.filter(s => mentorClassIds.includes(s.classId));
    }

    if (selectedClassId && selectedClassId !== 'All') {
        classStudents = classStudents.filter(s => s.classId === selectedClassId);
    }

    const startDate = startOfMonth(new Date(selectedYear, selectedMonth));
    const daysInMonth = getDaysInMonth(startDate);

    // Pre-calculate per-class totals
    const classStats = {};
    const relevantClassIds = isMentorView ? mentorClassIds : [selectedClassId];

    relevantClassIds.forEach(classId => {
        if (!classId) return;

        const classAttendanceDates = new Set(
            attendance
                .filter(a => {
                    const s = students.find(stu => stu.id === a.studentId);
                    return s && s.classId === classId && isSameMonth(new Date(a.date), startDate) && isSameYear(new Date(a.date), startDate);
                })
                .map(a => a.date)
        );
        const workingDays = classAttendanceDates.size || 1;

        const activeActivityList = activities.filter(a =>
            a.classId === classId &&
            a.createdAt &&
            isSameMonth(new Date(a.createdAt), startDate) &&
            isSameYear(new Date(a.createdAt), startDate)
        );
        const activeActivities = activeActivityList.length || 1;
        const activeActivityIds = activeActivityList.map(a => a.id);

        const activeSpecialPrayersList = specialPrayers?.filter(p =>
            p.isEnabled && p.assignedClassIds?.includes(classId)
        ) || [];
        const activeSpecialPrayers = activeSpecialPrayersList.length || 1;
        const activeSpecialPrayerIds = activeSpecialPrayersList.map(p => p.id);

        classStats[classId] = { workingDays, activeActivities, activeActivityIds, activeSpecialPrayers, activeSpecialPrayerIds };
    });

    const processed = classStudents.map(student => {
        const classId = student.classId;
        const stats = classStats[classId] || { workingDays: 1, activeActivities: 1, activeActivityIds: [], activeSpecialPrayers: 1, activeSpecialPrayerIds: [] };

        // --- Attendance Score ---
        let attendanceScore = 0;
        let presentCount = 0;
        if (config.attendance) {
            const studentAttendance = attendance.filter(a =>
                a.studentId === student.id &&
                isSameMonth(new Date(a.date), startDate) &&
                isSameYear(new Date(a.date), startDate)
            );
            presentCount = studentAttendance.filter(a => a.status === 'Present').length;
            attendanceScore = (presentCount / (stats.workingDays || 1)) * 100;
        }

        // --- Activities Score ---
        let activityScore = 0;
        let completedCount = 0;
        if (config.activities && stats.activeActivityIds.length > 0) {
            const activeIds = stats.activeActivityIds || [];
            const studentSubmissions = activitySubmissions.filter(s =>
                s.studentId === student.id &&
                s.status === 'Completed' &&
                activeIds.includes(s.activityId)
            );
            completedCount = studentSubmissions.length;
            activityScore = (completedCount / stats.activeActivityIds.length) * 100;
        }

        // --- Prayer Score ---
        let prayerScore = 0;
        let prayersPerformed = 0;
        const standardPrayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'f', 'd', 'a', 'm', 'i'];

        if (config.prayer) {
            const studentPrayers = prayerRecords.filter(p =>
                p.studentId === student.id &&
                isSameMonth(new Date(p.date), startDate) &&
                isSameYear(new Date(p.date), startDate)
            );

            studentPrayers.forEach(record => {
                Object.entries(record.prayers || {}).forEach(([key, status]) => {
                    if (status === true && standardPrayers.includes(key)) prayersPerformed++;
                });
            });

            const maxPrayers = daysInMonth * 5;
            prayerScore = (prayersPerformed / maxPrayers) * 100;
        }

        // --- Special Prayer Score ---
        let specialPrayerScore = 0;
        let specialPrayersPerformed = 0;
        if (config.specialPrayer && stats.activeSpecialPrayerIds.length > 0) {
            const studentPrayers = prayerRecords.filter(p =>
                p.studentId === student.id &&
                isSameMonth(new Date(p.date), startDate) &&
                isSameYear(new Date(p.date), startDate)
            );

            studentPrayers.forEach(record => {
                Object.entries(record.prayers || {}).forEach(([key, status]) => {
                    if (status === true && stats.activeSpecialPrayerIds.includes(key)) specialPrayersPerformed++;
                });
            });

            const maxSpecialPrayers = daysInMonth * stats.activeSpecialPrayerIds.length;
            specialPrayerScore = (specialPrayersPerformed / maxSpecialPrayers) * 100;
        }

        // --- Fasting Score ---
        let fastingScore = 0;
        let fastsCompleted = 0;
        if (config.fasting) {
            const studentFasts = ramadanLogs.filter(log =>
                log.studentId === student.id &&
                log.status === 'Fasting'
            );
            fastsCompleted = studentFasts.length;
            fastingScore = Math.min((fastsCompleted / 30) * 100, 100);
        }

        // --- Quran Score ---
        let quranScore = 0;
        let quranPages = 0;
        if (config.quran) {
            const studentQuran = quranProgress.find(q => q.studentId === student.id);
            quranPages = studentQuran?.lastPage || 0;
            const completedKhatms = studentQuran?.completedKhatms || 0;

            if (completedKhatms >= 1) {
                quranScore = 100;
            } else {
                quranScore = Math.min((quranPages / 604) * 100, 100);
            }
        }

        // --- Overall Score ---
        let totalScore = 0;
        let divider = 0;

        if (config.attendance) { totalScore += attendanceScore; divider++; }
        if (config.activities) { totalScore += activityScore; divider++; }
        if (config.prayer) { totalScore += prayerScore; divider++; }
        if (config.specialPrayer) { totalScore += specialPrayerScore; divider++; }
        if (config.fasting) { totalScore += fastingScore; divider++; }
        if (config.quran) { totalScore += quranScore; divider++; }

        const finalScore = divider > 0 ? (totalScore / divider) : 0;

        return {
            ...student,
            scores: {
                attendance: attendanceScore,
                activities: activityScore,
                prayer: prayerScore,
                specialPrayer: specialPrayerScore,
                fasting: fastingScore,
                quran: quranScore,
                present: presentCount,
                activitiesCompleted: completedCount,
                prayersPerformed: prayersPerformed,
                specialPrayersPerformed: specialPrayersPerformed,
                fastsCompleted: fastsCompleted,
                quranPages: quranPages
            },
            finalScore,
            className: classes.find(c => c.id === classId)?.name || 'Unknown'
        };
    });

    return processed.sort((a, b) => b.finalScore - a.finalScore);
};
