import React, { useState, useMemo, useRef } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { clsx } from 'clsx';
import { Star, Calendar, Trophy, Award, Download, Share2, PartyPopper, X } from 'lucide-react';
import { format, getDaysInMonth, startOfMonth, endOfMonth, isSameMonth, isSameYear } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // Ensure this is available if used elsewhere, otherwise basic text

const StudentStarView = () => {
    const { currentUser, students, attendance, activities, activitySubmissions, prayerRecords, classes, institutionSettings } = useData();

    // State
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 0-11
    const [showCelebration, setShowCelebration] = useState(false);
    const [showPoster, setShowPoster] = useState(false);

    // Config
    const config = institutionSettings?.starConfig || {
        attendance: true,
        activities: true,
        prayer: true,
    };

    const years = [new Date().getFullYear() - 1, new Date().getFullYear()];
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    // --- Calculation Logic (Mirrors Mentor Logic) ---
    const results = useMemo(() => {
        if (!currentUser?.classId) return [];

        // 1. Filter students in MY class only
        const classStudents = students.filter(s => s.classId === currentUser.classId);
        const classId = currentUser.classId;

        // 2. Date Range
        const startDate = startOfMonth(new Date(selectedYear, selectedMonth));
        const daysInMonth = getDaysInMonth(startDate);

        // Class Stats
        const classAttendanceDates = new Set(
            attendance
                .filter(a => {
                    const s = students.find(stu => stu.id === a.studentId);
                    return s && s.classId === classId && isSameMonth(new Date(a.date), startDate) && isSameYear(new Date(a.date), startDate);
                })
                .map(a => a.date)
        );
        const workingDays = classAttendanceDates.size || 1;

        const activeActivities = activities.filter(a =>
            a.classId === classId && a.status === 'Active'
        ).length || 1;

        const processed = classStudents.map(student => {
            let attendanceScore = 0;
            let presentCount = 0;
            if (config.attendance) {
                const studentAttendance = attendance.filter(a =>
                    a.studentId === student.id &&
                    isSameMonth(new Date(a.date), startDate) &&
                    isSameYear(new Date(a.date), startDate)
                );
                presentCount = studentAttendance.filter(a => a.status === 'Present').length;
                attendanceScore = (presentCount / (workingDays || 1)) * 100;
            }

            let activityScore = 0;
            let completedCount = 0;
            if (config.activities) {
                const studentSubmissions = activitySubmissions.filter(s =>
                    s.studentId === student.id &&
                    s.status === 'Completed'
                );
                const monthSubmissions = studentSubmissions.filter(s =>
                    isSameMonth(new Date(s.timestamp), startDate) &&
                    isSameYear(new Date(s.timestamp), startDate)
                );
                completedCount = monthSubmissions.length;
                activityScore = (completedCount / (activeActivities || 1)) * 100;
            }

            let prayerScore = 0;
            let prayersPerformed = 0;
            if (config.prayer) {
                const studentPrayers = prayerRecords.filter(p =>
                    p.studentId === student.id &&
                    isSameMonth(new Date(p.date), startDate) &&
                    isSameYear(new Date(p.date), startDate)
                );
                studentPrayers.forEach(record => {
                    Object.values(record.prayers || {}).forEach(status => {
                        if (status === true) prayersPerformed++;
                    });
                });
                const maxPrayers = daysInMonth * 5;
                prayerScore = (prayersPerformed / maxPrayers) * 100;
            }

            let totalScore = 0;
            let divider = 0;

            if (config.attendance) { totalScore += attendanceScore; divider++; }
            if (config.activities) { totalScore += activityScore; divider++; }
            if (config.prayer) { totalScore += prayerScore; divider++; }

            const finalScore = divider > 0 ? (totalScore / divider) : 0;

            return {
                ...student,
                scores: {
                    attendance: attendanceScore,
                    activities: activityScore,
                    prayer: prayerScore,
                },
                finalScore,
                className: classes.find(c => c.id === classId)?.name || 'Unknown'
            };
        });

        return processed.sort((a, b) => b.finalScore - a.finalScore);

    }, [
        students, attendance, activities, activitySubmissions, prayerRecords,
        currentUser, selectedMonth, selectedYear, config, classes
    ]);

    const maxScore = results.length > 0 ? results[0].finalScore : 0;
    const winners = results.filter(r => r.finalScore === maxScore && r.finalScore > 0);
    const isMeWinner = winners.some(w => w.id === currentUser.id);

    const handleCelebrate = () => {
        setShowCelebration(true);
        // Reset celebration after animation
        setTimeout(() => setShowPoster(true), 2500);
        setTimeout(() => setShowCelebration(false), 3000);
    };

    const downloadPoster = () => {
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        // Background Color
        doc.setFillColor(255, 250, 240); // Floral White
        doc.rect(0, 0, 210, 297, 'F');

        // Border
        doc.setLineWidth(2);
        doc.setDrawColor(218, 165, 32); // GoldenRod
        doc.rect(10, 10, 190, 277);
        doc.setLineWidth(0.5);
        doc.rect(15, 15, 180, 267);

        // Header
        doc.setFont("helvetica", "bold");
        doc.setFontSize(40);
        doc.setTextColor(218, 165, 32);
        doc.text("CERTIFICATE", 105, 50, { align: "center" });

        doc.setFontSize(16);
        doc.setTextColor(100, 100, 100);
        doc.text("OF ACHIEVEMENT", 105, 60, { align: "center" });

        // Icon Placeholder (Star)
        doc.setTextColor(255, 215, 0);
        doc.setFontSize(60);
        doc.text("★", 105, 90, { align: "center" });

        // Content
        doc.setFontSize(14);
        doc.setTextColor(50, 50, 50);
        doc.text("This certificate is proudly presented to", 105, 120, { align: "center" });

        doc.setFont("times", "bolditalic");
        doc.setFontSize(32);
        doc.setTextColor(0, 0, 0);
        doc.text(currentUser.name, 105, 140, { align: "center" });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(14);
        doc.setTextColor(50, 50, 50);
        doc.text("for outstanding performance and dedication as the", 105, 160, { align: "center" });

        doc.setFontSize(22);
        doc.setTextColor(79, 70, 229); // Indigo
        doc.text("STAR OF THE MONTH", 105, 175, { align: "center" });

        doc.setFontSize(16);
        doc.setTextColor(100, 100, 100);
        doc.text(`${months[selectedMonth]} ${selectedYear}`, 105, 185, { align: "center" });

        // Footer
        doc.setFontSize(12);
        doc.text("_______________________", 60, 240, { align: "center" });
        doc.text("Mentor Signature", 60, 250, { align: "center" });

        doc.text("_______________________", 150, 240, { align: "center" });
        doc.text("Principal Signature", 150, 250, { align: "center" });

        // Digital Signature if available
        if (institutionSettings?.signatureImage) {
            try {
                // Assuming signatureImage is base64 data:image/png;base64,...
                // doc.addImage(institutionSettings.signatureImage, 'PNG', 130, 220, 40, 20);
                // Need to handle errors strictly
                const sigImg = institutionSettings.signatureImage;
                // Simple validation
                if (sigImg.startsWith('data:image')) {
                    doc.addImage(sigImg, 'PNG', 130, 220, 40, 20);
                }
            } catch (e) {
                console.error("Failed to add signature to certificate", e);
            }
        }

        doc.save(`Star_Certificate_${currentUser.name}_${months[selectedMonth]}.pdf`);
    };

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 relative overflow-hidden min-h-screen">

            {/* Celebration Overlay */}
            {showCelebration && (
                <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/20 animate-in fade-in duration-500"></div>
                    {/* CSS Confetti would go here */}
                    <div className="animate-bounce text-6xl">🎉</div>
                </div>
            )}

            {/* Poster Modal */}
            {showPoster && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative transform transition-all scale-100">
                        <button
                            onClick={() => setShowPoster(false)}
                            className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-600" />
                        </button>

                        <div className="text-center space-y-6">
                            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trophy className="w-10 h-10 text-yellow-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900">Congratulations!</h2>
                            <p className="text-gray-600">
                                You are the Star of the Month! Here is a certificate to celebrate your achievement.
                            </p>

                            {/* Preview (Simplified) */}
                            <div className="bg-yellow-50 border-4 border-double border-yellow-200 p-6 rounded-lg shadow-inner">
                                <div className="text-center">
                                    <h4 className="font-serif text-xl font-bold text-yellow-800">Certificate of Achievement</h4>
                                    <p className="text-sm text-yellow-700 my-2">Presented to</p>
                                    <p className="font-bold text-lg text-gray-900">{currentUser.name}</p>
                                </div>
                            </div>

                            <button
                                onClick={downloadPoster}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Download className="w-5 h-5" /> Download Certificate
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Star className="w-8 h-8 text-yellow-500 fill-yellow-500" />
                        Star of the Month
                    </h1>
                    <p className="text-gray-500">View the top performers of your class</p>
                </div>
                <div className="flex bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="p-2 text-sm font-medium text-gray-700 bg-transparent border-none focus:ring-0 cursor-pointer"
                    >
                        {months.map((m, i) => (
                            <option key={i} value={i}>{m}</option>
                        ))}
                    </select>
                    <div className="w-px bg-gray-200 my-1"></div>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="p-2 text-sm font-medium text-gray-700 bg-transparent border-none focus:ring-0 cursor-pointer"
                    >
                        {years.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Winner Spotlight */}
            {winners.length > 0 ? (
                <div className="space-y-6">
                    {/* Celebration Button for Winner */}
                    {isMeWinner && !showPoster && (
                        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_auto] animate-gradient rounded-xl p-8 text-center text-white shadow-xl relative overflow-hidden">
                            <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px] opacity-0 hover:opacity-100 transition-opacity"></div>
                            <h2 className="text-3xl font-bold mb-2">You are the Star! 🌟</h2>
                            <p className="mb-6 text-indigo-100">Congratulations on your outstanding performance this month.</p>
                            <button
                                onClick={handleCelebrate}
                                className="px-8 py-3 bg-white text-indigo-600 rounded-full font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2 mx-auto"
                            >
                                <PartyPopper className="w-5 h-5" /> Celebrate & Get Certificate
                            </button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {winners.map(winner => (
                            <div key={winner.id} className={`relative rounded-2xl p-6 text-center shadow-lg overflow-hidden ${winner.id === currentUser.id ? 'bg-indigo-600 text-white ring-4 ring-yellow-400 ring-offset-2' : 'bg-white text-gray-800 border border-gray-200'}`}>
                                <div className="flex flex-col items-center relative z-10">
                                    <div className="w-20 h-20 rounded-full p-1 mb-4 bg-gray-100">
                                        <div className="w-full h-full rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-3xl font-bold border-2 border-white">
                                            {winner.name.charAt(0)}
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-bold mb-1">{winner.name}</h3>
                                    <p className={`text-sm mb-4 ${winner.id === currentUser.id ? 'text-indigo-200' : 'text-gray-500'}`}>
                                        {winner.id === currentUser.id ? 'You' : `Rank #1`}
                                    </p>

                                    <div className={`px-4 py-1 rounded-full text-sm font-bold ${winner.id === currentUser.id ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-700'}`}>
                                        {winner.finalScore.toFixed(1)}% Score
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Simple List for others */}
                    <Card className="max-w-3xl mx-auto">
                        <div className="p-4 border-b border-gray-100 font-bold text-gray-700">Top Performers</div>
                        <div className="divide-y divide-gray-100">
                            {results.slice(0, 10).map((student, idx) => (
                                <div key={student.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                                    <div className="flex items-center gap-3">
                                        <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${idx < 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {idx + 1}
                                        </span>
                                        <span className={student.id === currentUser.id ? 'font-bold text-indigo-600' : 'text-gray-700'}>
                                            {student.name} {student.id === currentUser.id && '(You)'}
                                        </span>
                                    </div>
                                    <span className="font-mono font-medium text-gray-600">{student.finalScore.toFixed(0)}%</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            ) : (
                <div className="text-center py-12 text-gray-500">
                    <Star className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No stars calculated for this month yet.</p>
                </div>
            )}
        </div>
    );
};

export default StudentStarView;
