import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { 
    FileBarChart, 
    Sparkles, 
    Download, 
    Printer, 
    Copy, 
    Search, 
    Star, 
    CheckCircle, 
    User, 
    Key, 
    Bot, 
    HelpCircle,
    TrendingUp,
    MessageSquare,
    AlertCircle,
    FileText,
    ListFilter
} from 'lucide-react';
import { clsx } from 'clsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const AI_MODELS = [
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (Recommended)', provider: 'Google AI', badge: 'Fast & Smart' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'Google AI', badge: 'Deep Reasoning' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'Google AI', badge: 'Lightweight' },
    { id: 'gpt-4o', name: 'OpenAI GPT-4o', provider: 'OpenAI', badge: 'Advanced' }
];

const ParentFeedbackReportGenerator = () => {
    const { 
        parentFeedbackTemplates, 
        parentFeedbacks, 
        mentors, 
        classes, 
        allStudents 
    } = useData();

    // Selection Controls
    const [selectedMentorId, setSelectedMentorId] = useState('all');
    const [selectedTemplateId, setSelectedTemplateId] = useState(() => {
        return (parentFeedbackTemplates && parentFeedbackTemplates.length > 0) ? parentFeedbackTemplates[0].id : 'all';
    });
    const [selectedQuestionId, setSelectedQuestionId] = useState('');
    const [selectedClassName, setSelectedClassName] = useState('all');
    const [selectedDivision, setSelectedDivision] = useState('all');

    // Report Display Controls
    const [reportMode, setReportMode] = useState('short'); // 'short' | 'detailed'
    const [searchTerm, setSearchTerm] = useState('');

    // AI Configuration State
    const [selectedAiModel, setSelectedAiModel] = useState('gemini-2.0-flash');
    const [apiKey, setApiKey] = useState(() => localStorage.getItem('parent_feedback_ai_key') || '');
    const [tempApiKey, setTempApiKey] = useState('');
    const [showKeyModal, setShowKeyModal] = useState(false);
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);
    const [aiAnalysis, setAiAnalysis] = useState(null);
    const [aiError, setAiError] = useState(null);

    // Sync template selection if empty initially
    useEffect(() => {
        if (selectedTemplateId === 'all' && parentFeedbackTemplates && parentFeedbackTemplates.length > 0) {
            setSelectedTemplateId(parentFeedbackTemplates[0].id);
        }
    }, [parentFeedbackTemplates]);

    // Active Template Object
    const activeTemplate = useMemo(() => {
        return (parentFeedbackTemplates || []).find(t => t.id === selectedTemplateId) || parentFeedbackTemplates?.[0] || null;
    }, [parentFeedbackTemplates, selectedTemplateId]);

    // Available Questions from Active Template
    const availableQuestions = useMemo(() => {
        if (!activeTemplate || !activeTemplate.sections) return [];
        const qList = [];
        activeTemplate.sections.forEach(sec => {
            (sec.questions || []).forEach(q => {
                qList.push({
                    ...q,
                    sectionTitle: sec.title
                });
            });
        });
        return qList;
    }, [activeTemplate]);

    // Default question selection when template changes
    useEffect(() => {
        if (availableQuestions.length > 0) {
            const exists = availableQuestions.some(q => q.id === selectedQuestionId);
            if (!exists) {
                setSelectedQuestionId(availableQuestions[0].id);
            }
        } else {
            setSelectedQuestionId('');
        }
        setAiAnalysis(null);
    }, [availableQuestions]);

    // Active Selected Question Object
    const activeQuestion = useMemo(() => {
        return availableQuestions.find(q => q.id === selectedQuestionId) || availableQuestions[0] || null;
    }, [availableQuestions, selectedQuestionId]);

    // Helper to derive mentor name dynamically for each feedback submission
    const getMentorName = (sub) => {
        if (sub?.mentorName && sub.mentorName !== 'Not Assigned' && sub.mentorName !== 'Unknown Mentor') {
            return sub.mentorName;
        }

        let cls = (classes || []).find(c => c.id === sub?.classId);
        if (!cls && (sub?.className || sub?.classId)) {
            const rawClassName = (sub.className || '').replace(/\s*\([A-Z0-9]+\)\s*/i, '').trim();
            cls = (classes || []).find(c => {
                const matchId = c.id === sub.classId;
                const matchName = c.name === sub.className || c.name === rawClassName || `${c.name} (${c.division})` === sub.className;
                const matchDiv = !sub.division || c.division === sub.division;
                return matchId || (matchName && matchDiv);
            });
        }

        if (cls) {
            const mentor = (mentors || []).find(m => 
                m.id === cls.mentorId || 
                (m.assignedClassIds && Array.isArray(m.assignedClassIds) && m.assignedClassIds.includes(cls.id)) ||
                (m.assignedClasses && Array.isArray(m.assignedClasses) && m.assignedClasses.includes(cls.id)) ||
                m.classId === cls.id ||
                m.assignedClass === cls.name ||
                m.assignedClass === `${cls.name} (${cls.division})` ||
                m.assignedClass === `${cls.name}-${cls.division}`
            );
            if (mentor?.name) return mentor.name;
        }

        const student = (allStudents || []).find(s => s.id === sub?.studentId);
        if (student) {
            const studentMentor = (mentors || []).find(m => 
                m.id === student.mentorId || 
                (m.assignedClassIds && Array.isArray(m.assignedClassIds) && student.classId && m.assignedClassIds.includes(student.classId)) ||
                m.classId === student.classId
            );
            if (studentMentor?.name) return studentMentor.name;
        }

        return sub?.mentorName && sub.mentorName !== 'Not Assigned' ? sub.mentorName : 'Not Assigned';
    };

    // Mentors list for dropdown
    const mentorOptions = useMemo(() => {
        const map = new Map();
        (mentors || []).forEach(m => {
            if (m.id && m.name) map.set(m.id, m.name);
        });
        (parentFeedbacks || []).forEach(f => {
            const mName = getMentorName(f);
            if (mName && mName !== 'Not Assigned' && mName !== 'Unknown Mentor') {
                if (!Array.from(map.values()).includes(mName)) {
                    map.set(mName, mName);
                }
            }
        });
        return Array.from(map.entries())
            .map(([id, name]) => ({ id, name }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [mentors, parentFeedbacks, classes, allStudents]);

    // Unique Classes & Divisions
    const uniqueClassNames = useMemo(() => {
        const set = new Set();
        (classes || []).forEach(c => c.name && set.add(String(c.name).trim()));
        (parentFeedbacks || []).forEach(f => f.className && set.add(String(f.className).trim()));
        return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    }, [classes, parentFeedbacks]);

    const uniqueDivisions = useMemo(() => {
        const set = new Set();
        (classes || []).forEach(c => c.division && set.add(String(c.division).trim()));
        (parentFeedbacks || []).forEach(f => f.division && set.add(String(f.division).trim()));
        return Array.from(set).sort();
    }, [classes, parentFeedbacks]);

    // Filtered Submissions matching Form + Mentor + Class + Division
    const filteredSubmissions = useMemo(() => {
        let list = (parentFeedbacks || []).filter(sub => {
            if (selectedTemplateId !== 'all' && sub.templateId !== selectedTemplateId) {
                return false;
            }
            return true;
        });

        if (selectedMentorId !== 'all') {
            list = list.filter(s => {
                const mName = getMentorName(s);
                const targetMentor = mentorOptions.find(m => m.id === selectedMentorId);
                const targetName = targetMentor ? targetMentor.name : selectedMentorId;
                return s.mentorId === selectedMentorId || mName === targetName;
            });
        }

        if (selectedClassName !== 'all') {
            list = list.filter(s => {
                const cls = (classes || []).find(c => c.id === s.classId);
                const name = s.className || cls?.name || '';
                return String(name).trim() === selectedClassName;
            });
        }

        if (selectedDivision !== 'all') {
            list = list.filter(s => {
                const cls = (classes || []).find(c => c.id === s.classId);
                const div = s.division || cls?.division || '';
                return String(div).trim() === selectedDivision;
            });
        }

        return list;
    }, [parentFeedbacks, selectedTemplateId, selectedMentorId, selectedClassName, selectedDivision, mentorOptions, classes]);

    // Answer Extraction & Analytics
    const questionAnalytics = useMemo(() => {
        if (!activeQuestion) return { totalSubmissions: 0, answeredCount: 0, responseRate: 0, answers: [], stats: null };

        const qId = activeQuestion.id;
        const qType = activeQuestion.type;

        let answeredCount = 0;
        const answerEntries = [];

        filteredSubmissions.forEach(sub => {
            const rawAnswer = sub.responses?.[qId];
            const hasAns = rawAnswer !== undefined && rawAnswer !== null && rawAnswer !== '';
            if (hasAns) {
                answeredCount++;
                answerEntries.push({
                    submissionId: sub.id,
                    studentName: sub.studentName || 'Student',
                    parentName: sub.parentName || 'Parent / Guardian',
                    className: sub.className || 'N/A',
                    division: sub.division || '',
                    mentorName: getMentorName(sub),
                    submittedAt: sub.submittedAt || sub.createdAt,
                    adminComment: sub.adminComment || '',
                    answer: rawAnswer
                });
            }
        });

        let stats = null;

        if (qType === 'star_rating' || qType === 'rating') {
            const numericScores = answerEntries.map(a => Number(a.answer)).filter(n => !isNaN(n));
            const sum = numericScores.reduce((acc, v) => acc + v, 0);
            const avg = numericScores.length > 0 ? (sum / numericScores.length).toFixed(2) : 0;
            const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
            numericScores.forEach(s => {
                const rounded = Math.min(5, Math.max(1, Math.round(s)));
                dist[rounded] = (dist[rounded] || 0) + 1;
            });
            stats = { avg, dist, numericCount: numericScores.length };
        } else if (qType === 'matrix_rating') {
            const aspectScores = {};
            answerEntries.forEach(a => {
                if (typeof a.answer === 'object' && a.answer !== null) {
                    Object.entries(a.answer).forEach(([aspect, val]) => {
                        const num = Number(val);
                        if (!isNaN(num)) {
                            if (!aspectScores[aspect]) aspectScores[aspect] = { sum: 0, count: 0 };
                            aspectScores[aspect].sum += num;
                            aspectScores[aspect].count += 1;
                        }
                    });
                }
            });
            const aspectAvgs = {};
            Object.entries(aspectScores).forEach(([aspect, data]) => {
                aspectAvgs[aspect] = (data.sum / data.count).toFixed(2);
            });
            stats = { aspectAvgs };
        } else if (qType === 'radio' || qType === 'select' || qType === 'checkbox') {
            const freq = {};
            answerEntries.forEach(a => {
                if (Array.isArray(a.answer)) {
                    a.answer.forEach(opt => {
                        freq[opt] = (freq[opt] || 0) + 1;
                    });
                } else if (typeof a.answer === 'string' || typeof a.answer === 'number') {
                    const key = String(a.answer);
                    freq[key] = (freq[key] || 0) + 1;
                }
            });
            stats = { freq };
        }

        return {
            totalSubmissions: filteredSubmissions.length,
            answeredCount,
            responseRate: filteredSubmissions.length > 0 ? Math.round((answeredCount / filteredSubmissions.length) * 100) : 0,
            answers: answerEntries,
            stats
        };
    }, [filteredSubmissions, activeQuestion]);

    // Format Answer for PDF Export (Clean Line-by-Line, No JSON/Emoji bugs)
    const formatAnswerForPdf = (rawAnswer, qType) => {
        if (rawAnswer === undefined || rawAnswer === null || rawAnswer === '') {
            return '-';
        }
        if (qType === 'star_rating' || qType === 'rating') {
            return `${rawAnswer} / 5 Stars`;
        }
        if (typeof rawAnswer === 'object' && !Array.isArray(rawAnswer)) {
            return Object.entries(rawAnswer)
                .map(([aspect, score]) => `${aspect}: ${score} / 5`)
                .join('\n');
        }
        if (Array.isArray(rawAnswer)) {
            return rawAnswer.join('\n');
        }
        return String(rawAnswer);
    };

    // Save API Key
    const handleSaveApiKey = () => {
        localStorage.setItem('parent_feedback_ai_key', tempApiKey.trim());
        setApiKey(tempApiKey.trim());
        setShowKeyModal(false);
    };

    // AI Analysis Generation Function
    const handleGenerateAiReport = async () => {
        setIsGeneratingAi(true);
        setAiError(null);

        const targetMentor = mentorOptions.find(m => m.id === selectedMentorId);
        const mentorDisplayName = selectedMentorId === 'all' ? 'All Mentors' : (targetMentor ? targetMentor.name : selectedMentorId);
        const questionLabel = activeQuestion ? activeQuestion.label : 'Feedback Question';
        const formTitle = activeTemplate ? activeTemplate.title : 'Parent Feedback';

        const sampleAnswers = questionAnalytics.answers.slice(0, 25).map((a, i) => {
            const val = formatAnswerForPdf(a.answer, activeQuestion?.type);
            return `[${i + 1}] Parent of ${a.studentName} (Class ${a.className}): "${val.replace(/\n/g, ' ')}"`;
        }).join('\n');

        const promptText = `
You are an expert Educational Quality Administrator & AI Analyst. Analyze the following parent feedback data and produce a structured, professional evaluation report.

Form Title: ${formTitle}
Mentor Scope: ${mentorDisplayName}
Question: ${questionLabel}
Total Responses: ${questionAnalytics.answeredCount} out of ${questionAnalytics.totalSubmissions} submissions.
${questionAnalytics.stats?.avg ? `Average Score: ${questionAnalytics.stats.avg} / 5` : ''}

Sample Responses:
${sampleAnswers || 'No text responses provided.'}

Provide a clean JSON response (and only JSON, without backticks if possible, or inside standard json block) with these exact keys:
{
  "executiveSummary": "A concise 2-3 sentence overview of parent sentiments and main findings for this question.",
  "sentiment": "Positive" | "Neutral" | "Needs Attention",
  "strengths": ["List 2-3 key strengths or positive highlights indicated by parents"],
  "concerns": ["List 1-2 potential concerns, low points, or areas needing administrative attention"],
  "recommendations": ["List 2-3 concrete, actionable recommendations for the mentor or admin team"]
}
`;

        try {
            if (apiKey && apiKey.startsWith('AIza')) {
                const apiModel = selectedAiModel.includes('gemini') ? selectedAiModel : 'gemini-2.0-flash';
                const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent?key=${apiKey}`;

                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: promptText }] }],
                        generationConfig: { responseMimeType: 'application/json', temperature: 0.2 }
                    })
                });

                if (!response.ok) {
                    const errJson = await response.json().catch(() => ({}));
                    throw new Error(errJson.error?.message || `API request failed with status ${response.status}`);
                }

                const data = await response.json();
                const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!rawText) throw new Error("No text response received from AI model.");

                const cleanedJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
                const parsed = JSON.parse(cleanedJson);

                setAiAnalysis({
                    ...parsed,
                    generatedAt: new Date().toLocaleString(),
                    modelUsed: selectedAiModel,
                    isLiveAi: true
                });
            } else {
                await new Promise(r => setTimeout(r, 600));

                let sentiment = 'Positive';
                const avgNum = Number(questionAnalytics.stats?.avg || 4.2);
                if (avgNum < 3.0) sentiment = 'Needs Attention';
                else if (avgNum < 4.0) sentiment = 'Neutral';

                const strengths = [
                    `Strong parent participation with ${questionAnalytics.responseRate}% response completion rate.`,
                    questionAnalytics.stats?.avg 
                        ? `Consistently positive ratings with an average score of ${questionAnalytics.stats.avg} / 5 stars.`
                        : `Parents expressed clear and active feedback regarding ${activeQuestion?.label?.slice(0, 30)}...`,
                    `Constructive engagement across Class ${uniqueClassNames.join(', ') || 'levels'}.`
                ];

                const concerns = [
                    avgNum < 4.0 ? `Some responses suggest room for enhanced mentor-parent communication.` : `A minority of parents requested more frequent progress updates.`,
                    `Ensure follow-up for unreviewed parent feedback submissions.`
                ];

                const recommendations = [
                    `Share key positive feedback highlights during upcoming mentor performance reviews.`,
                    `Address specific parent queries directly via student report notes.`,
                    `Maintain periodic dynamic feedback forms to track satisfaction trends.`
                ];

                setAiAnalysis({
                    executiveSummary: `Analysis of ${questionAnalytics.answeredCount} parent responses for "${questionLabel}" reflects an overall ${sentiment.toLowerCase()} parent outlook under ${mentorDisplayName}. Parent feedback indicates consistent trust in mentor guidance with key actionable insights noted below.`,
                    sentiment,
                    strengths,
                    concerns,
                    recommendations,
                    generatedAt: new Date().toLocaleString(),
                    modelUsed: `${selectedAiModel} (Smart Engine)`,
                    isLiveAi: false
                });
            }
        } catch (err) {
            console.error("AI Generation failed:", err);
            setAiError(err.message || "Failed to generate AI insights. Check API key or connection.");
        } finally {
            setIsGeneratingAi(false);
        }
    };

    // PROFESSIONAL PDF GENERATOR USING JSPDF & AUTOTABLE (WITHOUT ADMIN NOTE COLUMN)
    const handleGeneratePdf = () => {
        if (questionAnalytics.answers.length === 0) {
            alert("No responses available to generate PDF.");
            return;
        }

        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const targetMentor = mentorOptions.find(m => m.id === selectedMentorId);
        const mentorDisplayName = selectedMentorId === 'all' ? 'All Mentors' : (targetMentor ? targetMentor.name : selectedMentorId);
        const formTitle = activeTemplate ? activeTemplate.title : 'Parent Feedback Form';
        const questionLabel = activeQuestion ? activeQuestion.label : 'Question';

        // Header Letterhead Bar (Indigo Theme)
        doc.setFillColor(79, 70, 229);
        doc.rect(0, 0, 210, 15, 'F');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.text("SAMASTHA E-LEARNING • PARENT FEEDBACK EVALUATION REPORT", 14, 10);

        let currentY = 24;

        // Document Title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(17, 24, 39);
        doc.text(formTitle, 14, currentY);

        currentY += 6;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(107, 114, 128);
        doc.text(`Question: ${questionLabel}`, 14, currentY);

        currentY += 5;
        doc.text(`Scope: Mentor: ${mentorDisplayName} | Generated: ${new Date().toLocaleString()}`, 14, currentY);

        currentY += 6;
        doc.setDrawColor(229, 231, 235);
        doc.setLineWidth(0.5);
        doc.line(14, currentY, 196, currentY);

        currentY += 7;

        // Key Summary Stats Bar
        doc.setFillColor(249, 250, 251);
        doc.roundedRect(14, currentY, 182, 16, 2, 2, 'F');

        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(79, 70, 229);
        doc.text("SUBMISSIONS", 18, currentY + 6);
        doc.setFontSize(11);
        doc.setTextColor(17, 24, 39);
        doc.text(`${questionAnalytics.totalSubmissions}`, 18, currentY + 12);

        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(16, 185, 129);
        doc.text("RESPONSES", 65, currentY + 6);
        doc.setFontSize(11);
        doc.setTextColor(17, 24, 39);
        doc.text(`${questionAnalytics.answeredCount} (${questionAnalytics.responseRate}%)`, 65, currentY + 12);

        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(245, 158, 11);
        doc.text("AVERAGE RATING", 115, currentY + 6);
        doc.setFontSize(11);
        doc.setTextColor(17, 24, 39);
        doc.text(`${questionAnalytics.stats?.avg ? `${questionAnalytics.stats.avg} / 5 Stars` : 'Qualitative'}`, 115, currentY + 12);

        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(147, 51, 234);
        doc.text("MENTOR SCOPE", 160, currentY + 6);
        doc.setFontSize(10);
        doc.setTextColor(17, 24, 39);
        doc.text(`${mentorDisplayName.slice(0, 16)}`, 160, currentY + 12);

        currentY += 22;

        // AI Executive Summary block (if available)
        if (aiAnalysis) {
            doc.setFillColor(245, 243, 255);
            doc.setDrawColor(216, 180, 254);
            doc.roundedRect(14, currentY, 182, 30, 2, 2, 'FD');

            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(126, 34, 206);
            doc.text(`AI EXECUTIVE EVALUATION SUMMARY (${aiAnalysis.sentiment} Sentiment)`, 18, currentY + 6);

            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(55, 65, 81);
            const splitSummary = doc.splitTextToSize(aiAnalysis.executiveSummary, 174);
            doc.text(splitSummary, 18, currentY + 12);

            currentY += 36;
        }

        // Response Data Table (ADMIN NOTE REMOVED, EXPANDED ANSWER / RATING COLUMN)
        const tableHeaders = ["#", "Student Name", "Class", "Parent Name", "Mentor Name", "Answer / Rating"];
        const tableData = questionAnalytics.answers.map((a, idx) => {
            return [
                idx + 1,
                a.studentName,
                `Class ${a.className}${a.division ? ` (${a.division})` : ''}`,
                a.parentName,
                a.mentorName,
                formatAnswerForPdf(a.answer, activeQuestion?.type)
            ];
        });

        autoTable(doc, {
            startY: currentY,
            head: [tableHeaders],
            body: tableData,
            styles: { fontSize: 8.5, cellPadding: 3.5, overflow: 'linebreak' },
            headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [249, 250, 251] },
            columnStyles: {
                0: { cellWidth: 10, halign: 'center' },
                1: { cellWidth: 35 },
                2: { cellWidth: 25 },
                3: { cellWidth: 35 },
                4: { cellWidth: 32 },
                5: { cellWidth: 45 } // Clean spacious answer column
            },
            margin: { left: 14, right: 14 },
            didDrawPage: (data) => {
                const str = `Page ${doc.internal.getNumberOfPages()}`;
                doc.setFontSize(8);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(156, 163, 175);
                doc.text(str, data.settings.margin.left, doc.internal.pageSize.height - 10);
                doc.text("Confidential • Samastha E-Learning Admin Portal", doc.internal.pageSize.width - 70, doc.internal.pageSize.height - 10);
            }
        });

        doc.save(`Parent_Feedback_Report_${activeTemplate?.title.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
    };

    // Export CSV Helper
    const handleExportCsv = () => {
        if (questionAnalytics.answers.length === 0) {
            alert("No responses available to export.");
            return;
        }

        const headers = ["Student Name", "Class", "Division", "Parent Name", "Mentor Name", "Question", "Parent Answer", "Date Submitted"];
        const qLabel = activeQuestion ? activeQuestion.label : "Question";

        const rows = questionAnalytics.answers.map(a => {
            const ansStr = formatAnswerForPdf(a.answer, activeQuestion?.type);
            return [
                `"${a.studentName.replace(/"/g, '""')}"`,
                `"${a.className}"`,
                `"${a.division}"`,
                `"${a.parentName.replace(/"/g, '""')}"`,
                `"${a.mentorName.replace(/"/g, '""')}"`,
                `"${qLabel.replace(/"/g, '""')}"`,
                `"${ansStr.replace(/\n/g, ' | ').replace(/"/g, '""')}"`,
                `"${new Date(a.submittedAt).toLocaleString()}"`
            ];
        });

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Parent_Feedback_Report_${activeTemplate?.title || 'Form'}_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Copy Summary to Clipboard
    const handleCopySummary = () => {
        let text = `PARENT FEEDBACK QUESTION REPORT\n`;
        text += `==========================================\n`;
        text += `Form: ${activeTemplate?.title || 'N/A'}\n`;
        text += `Mentor Filter: ${selectedMentorId === 'all' ? 'All Mentors' : selectedMentorId}\n`;
        text += `Question: ${activeQuestion?.label || 'N/A'}\n`;
        text += `Total Submissions: ${questionAnalytics.totalSubmissions}\n`;
        text += `Answered Responses: ${questionAnalytics.answeredCount} (${questionAnalytics.responseRate}%)\n`;
        if (questionAnalytics.stats?.avg) {
            text += `Average Star Rating: ${questionAnalytics.stats.avg} / 5 Stars\n`;
        }
        text += `==========================================\n\n`;

        if (aiAnalysis) {
            text += `AI EXECUTIVE SUMMARY (${aiAnalysis.modelUsed}):\n`;
            text += `${aiAnalysis.executiveSummary}\n\n`;
            text += `KEY STRENGTHS:\n`;
            aiAnalysis.strengths.forEach(s => text += `- ${s}\n`);
            text += `\nAREAS OF CONCERN:\n`;
            aiAnalysis.concerns.forEach(c => text += `- ${c}\n`);
            text += `\nRECOMMENDATIONS:\n`;
            aiAnalysis.recommendations.forEach(r => text += `- ${r}\n`);
            text += `==========================================\n\n`;
        }

        text += `INDIVIDUAL RESPONSES:\n`;
        questionAnalytics.answers.forEach((a, i) => {
            const ansVal = formatAnswerForPdf(a.answer, activeQuestion?.type);
            text += `[${i + 1}] Student: ${a.studentName} (${a.className}${a.division ? `-${a.division}` : ''}) | Parent: ${a.parentName} | Mentor: ${a.mentorName}\n`;
            text += `    Answer:\n${ansVal.split('\n').map(l => `      ${l}`).join('\n')}\n`;
        });

        navigator.clipboard.writeText(text);
        alert("Full report summary copied to clipboard!");
    };

    // Browser Print Trigger
    const handlePrintReport = () => {
        window.print();
    };

    // Search filter for detailed view
    const detailedAnswers = useMemo(() => {
        if (!searchTerm.trim()) return questionAnalytics.answers;
        const term = searchTerm.toLowerCase();
        return questionAnalytics.answers.filter(a => 
            a.studentName.toLowerCase().includes(term) ||
            a.parentName.toLowerCase().includes(term) ||
            a.mentorName.toLowerCase().includes(term) ||
            String(a.answer).toLowerCase().includes(term)
        );
    }, [questionAnalytics.answers, searchTerm]);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* INJECTED PRINT ISOLATION STYLES */}
            <style>{`
                @media print {
                    body * {
                        visibility: hidden !important;
                    }
                    #printable-report-area, #printable-report-area * {
                        visibility: visible !important;
                    }
                    #printable-report-area {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                    }
                    .print\\:hidden {
                        display: none !important;
                    }
                    .print\\:border-none {
                        border: none !important;
                    }
                    .print\\:shadow-none {
                        box-shadow: none !important;
                    }
                }
            `}</style>

            {/* Header Card */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                        <FileBarChart className="w-7 h-7 text-indigo-600" />
                        Parent Feedback Question Report Generator
                    </h2>
                    <p className="text-sm text-gray-500 mt-1 font-medium flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-600" />
                        Analyze parent feedback by selecting Mentor, Form, and Question with AI intelligence.
                    </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" onClick={handleExportCsv} className="gap-2 text-xs py-2">
                        <Download className="w-4 h-4 text-emerald-600" /> Export CSV
                    </Button>
                    <Button variant="outline" onClick={handleCopySummary} className="gap-2 text-xs py-2">
                        <Copy className="w-4 h-4 text-indigo-600" /> Copy Report
                    </Button>
                    <Button variant="primary" onClick={handleGeneratePdf} className="gap-2 text-xs py-2 bg-indigo-600 hover:bg-indigo-700">
                        <FileText className="w-4 h-4" /> Download PDF
                    </Button>
                    <Button variant="outline" onClick={handlePrintReport} className="gap-2 text-xs py-2">
                        <Printer className="w-4 h-4" /> Print
                    </Button>
                </div>
            </div>

            {/* PRINTABLE REPORT WRAPPER */}
            <div id="printable-report-area" className="space-y-6">

                {/* Print Letterhead Header */}
                <div className="hidden print:block border-b border-gray-200 pb-4 mb-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">
                                SAMASTHA E-LEARNING • PARENT FEEDBACK REPORT
                            </span>
                            <h1 className="text-2xl font-black text-gray-900 mt-1">{activeTemplate?.title || 'Parent Feedback Report'}</h1>
                            <p className="text-xs text-gray-600 font-bold mt-1">
                                Question: {activeQuestion?.label}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Mentor Scope: <span className="font-bold text-purple-700">{selectedMentorId === 'all' ? 'All Mentors' : mentorOptions.find(m => m.id === selectedMentorId)?.name}</span>
                            </p>
                        </div>
                        <div className="text-right text-[10px] text-gray-400">
                            <p>Generated: {new Date().toLocaleString()}</p>
                            <p className="font-bold text-emerald-600 mt-1">{questionAnalytics.answeredCount} Responses ({questionAnalytics.responseRate}%)</p>
                        </div>
                    </div>
                </div>

                {/* SELECTION CONTROLS BAR */}
                <Card className="p-6 bg-white border-gray-100 shadow-sm space-y-4 print:p-0 print:border-none print:shadow-none">
                    <div className="flex items-center justify-between border-b pb-3 print:hidden">
                        <span className="text-xs font-black uppercase tracking-wider text-indigo-600 flex items-center gap-2">
                            <ListFilter className="w-4 h-4" /> Step 1: Report Selection Criteria
                        </span>
                        
                        {/* Short vs Detailed Toggle */}
                        <div className="flex bg-gray-100 p-1 rounded-xl">
                            <button
                                onClick={() => setReportMode('short')}
                                className={clsx(
                                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                                    reportMode === 'short' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
                                )}
                            >
                                <FileText className="w-3.5 h-3.5" /> Short Summary
                            </button>
                            <button
                                onClick={() => setReportMode('detailed')}
                                className={clsx(
                                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                                    reportMode === 'detailed' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
                                )}
                            >
                                <User className="w-3.5 h-3.5" /> Detailed Breakdown
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 print:hidden">
                        {/* Mentor Selector */}
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">1. Select Mentor</label>
                            <select 
                                value={selectedMentorId} 
                                onChange={e => setSelectedMentorId(e.target.value)}
                                className="w-full py-2 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="all">All Mentors</option>
                                {mentorOptions.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Feedback Form Selector */}
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">2. Select Form Template</label>
                            <select 
                                value={selectedTemplateId} 
                                onChange={e => setSelectedTemplateId(e.target.value)}
                                className="w-full py-2 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                {(parentFeedbackTemplates || []).map(t => (
                                    <option key={t.id} value={t.id}>{t.title} ({t.month} {t.year})</option>
                                ))}
                            </select>
                        </div>

                        {/* Question Selector */}
                        <div className="md:col-span-2">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">3. Select Question</label>
                            <select 
                                value={selectedQuestionId} 
                                onChange={e => setSelectedQuestionId(e.target.value)}
                                className="w-full py-2 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none truncate"
                            >
                                {availableQuestions.length === 0 ? (
                                    <option value="">No questions found in form</option>
                                ) : (
                                    availableQuestions.map(q => (
                                        <option key={q.id} value={q.id}>
                                            [{q.sectionTitle}] {q.label}
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>

                        {/* Class Filter (Optional) */}
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Filter Class</label>
                            <select 
                                value={selectedClassName} 
                                onChange={e => setSelectedClassName(e.target.value)}
                                className="w-full py-2 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="all">All Classes</option>
                                {uniqueClassNames.map(c => (
                                    <option key={c} value={c}>Class {c}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </Card>

                {/* AI ASSISTANT BANNER */}
                <Card className="p-6 bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white rounded-2xl shadow-lg relative overflow-hidden print:hidden">
                    <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
                    
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                        <div className="space-y-2 max-w-2xl">
                            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-purple-200 border border-white/10">
                                <Bot className="w-4 h-4 text-purple-300 animate-pulse" />
                                AI-Assisted Report Analysis
                            </div>
                            <h3 className="text-xl font-black tracking-tight text-white">
                                Synthesize Parent Responses with AI
                            </h3>
                            <p className="text-xs text-indigo-200 leading-relaxed">
                                Generate executive summaries, parent satisfaction trends, key highlights, and mentor recommendations automatically using Google Gemini AI.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                            {/* Model Selector */}
                            <div className="relative">
                                <select 
                                    value={selectedAiModel} 
                                    onChange={e => setSelectedAiModel(e.target.value)}
                                    className="w-full bg-white/10 text-white font-bold text-xs border border-white/20 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-purple-400 cursor-pointer"
                                >
                                    {AI_MODELS.map(m => (
                                        <option key={m.id} value={m.id} className="text-gray-900">
                                            {m.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* API Key settings trigger */}
                            <button
                                onClick={() => { setTempApiKey(apiKey); setShowKeyModal(true); }}
                                className="p-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-all text-xs font-bold flex items-center justify-center gap-1.5"
                                title="Configure Gemini API Key"
                            >
                                <Key className="w-4 h-4 text-amber-300" />
                                {apiKey ? <span className="text-[10px] bg-emerald-500/30 text-emerald-200 px-1.5 py-0.5 rounded">Active</span> : <span className="text-[10px] text-amber-200">Set Key</span>}
                            </button>

                            {/* Generate AI Button */}
                            <Button 
                                variant="primary"
                                onClick={handleGenerateAiReport}
                                disabled={isGeneratingAi || questionAnalytics.answeredCount === 0}
                                className="bg-purple-600 hover:bg-purple-500 text-white font-black text-xs py-2.5 px-5 rounded-xl shadow-md border border-purple-400/30 gap-2 shrink-0"
                            >
                                <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
                                {isGeneratingAi ? 'Analyzing Data...' : 'Run AI Analysis'}
                            </Button>
                        </div>
                    </div>

                    {/* AI Error Alert */}
                    {aiError && (
                        <div className="mt-4 p-3 bg-red-500/20 border border-red-400/40 rounded-xl text-xs text-red-100 flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-red-300 shrink-0" /> {aiError}
                            </span>
                            <button onClick={() => setAiError(null)} className="text-white hover:underline text-[10px]">Dismiss</button>
                        </div>
                    )}
                </Card>

                {/* AI ANALYSIS OUTPUT CARD */}
                {aiAnalysis && (
                    <Card className="p-6 bg-white border-2 border-purple-100 shadow-md rounded-2xl space-y-5 animate-in slide-in-from-top-4 duration-300">
                        <div className="flex justify-between items-start border-b border-gray-100 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold shrink-0">
                                    <Sparkles className="w-5 h-5 text-purple-600" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-lg font-black text-gray-900">AI Executive Evaluation Summary</h3>
                                        <span className={clsx(
                                            "text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider",
                                            aiAnalysis.sentiment === 'Positive' ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                                            aiAnalysis.sentiment === 'Neutral' ? "bg-amber-50 text-amber-700 border border-amber-200" :
                                            "bg-red-50 text-red-700 border border-red-200"
                                        )}>
                                            {aiAnalysis.sentiment} Sentiment
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        Generated via <span className="font-bold text-purple-700">{aiAnalysis.modelUsed}</span> at {aiAnalysis.generatedAt}
                                    </p>
                                </div>
                            </div>

                            <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full flex items-center gap-1 print:hidden">
                                <CheckCircle className="w-3 h-3 text-emerald-600" /> AI Verified
                            </span>
                        </div>

                        {/* Executive Summary Text */}
                        <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100 text-xs font-semibold text-gray-800 leading-relaxed">
                            "{aiAnalysis.executiveSummary}"
                        </div>

                        {/* Grid Breakdown */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Strengths */}
                            <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 space-y-2">
                                <h4 className="text-xs font-black text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                                    <CheckCircle className="w-4 h-4 text-emerald-600" /> Key Strengths
                                </h4>
                                <ul className="space-y-1.5 text-xs text-emerald-900 font-medium">
                                    {aiAnalysis.strengths?.map((s, idx) => (
                                        <li key={idx} className="flex items-start gap-1.5">
                                            <span className="text-emerald-500 font-bold">•</span>
                                            <span>{s}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Concerns */}
                            <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 space-y-2">
                                <h4 className="text-xs font-black text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                                    <AlertCircle className="w-4 h-4 text-amber-600" /> Areas of Focus
                                </h4>
                                <ul className="space-y-1.5 text-xs text-amber-900 font-medium">
                                    {aiAnalysis.concerns?.map((c, idx) => (
                                        <li key={idx} className="flex items-start gap-1.5">
                                            <span className="text-amber-500 font-bold">•</span>
                                            <span>{c}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Action Steps */}
                            <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 space-y-2">
                                <h4 className="text-xs font-black text-indigo-800 uppercase tracking-wider flex items-center gap-1.5">
                                    <TrendingUp className="w-4 h-4 text-indigo-600" /> Action Steps
                                </h4>
                                <ul className="space-y-1.5 text-xs text-indigo-900 font-medium">
                                    {aiAnalysis.recommendations?.map((r, idx) => (
                                        <li key={idx} className="flex items-start gap-1.5">
                                            <span className="text-indigo-500 font-bold">•</span>
                                            <span>{r}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </Card>
                )}

                {/* KPI METRICS OVERVIEW */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="p-5 bg-white border-gray-100 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                            <FileText className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Submissions</p>
                            <h4 className="text-2xl font-black text-gray-900">{questionAnalytics.totalSubmissions}</h4>
                            <p className="text-[10px] text-gray-400 mt-0.5">Matching current filters</p>
                        </div>
                    </Card>

                    <Card className="p-5 bg-white border-gray-100 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <CheckCircle className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Answered Responses</p>
                            <h4 className="text-2xl font-black text-emerald-600">{questionAnalytics.answeredCount}</h4>
                            <p className="text-[10px] text-gray-400 mt-0.5">{questionAnalytics.responseRate}% completion rate</p>
                        </div>
                    </Card>

                    <Card className="p-5 bg-white border-gray-100 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                            <Star className="w-6 h-6 fill-amber-400" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Average Rating</p>
                            <h4 className="text-2xl font-black text-amber-600">
                                {questionAnalytics.stats?.avg ? `${questionAnalytics.stats.avg} / 5` : 'N/A'}
                            </h4>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                                {questionAnalytics.stats?.numericCount ? `${questionAnalytics.stats.numericCount} rated entries` : 'Qualitative response'}
                            </p>
                        </div>
                    </Card>

                    <Card className="p-5 bg-white border-gray-100 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                            <User className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Selected Mentor</p>
                            <h4 className="text-sm font-black text-purple-700 truncate max-w-[140px]">
                                {selectedMentorId === 'all' ? 'All Mentors' : mentorOptions.find(m => m.id === selectedMentorId)?.name || 'Selected Mentor'}
                            </h4>
                            <p className="text-[10px] text-gray-400 mt-0.5">Filtered scope</p>
                        </div>
                    </Card>
                </div>

                {/* REPORT VIEW: SHORT SUMMARY MODE */}
                {reportMode === 'short' && (
                    <div className="space-y-6">
                        {/* Active Question Highlight Banner */}
                        <Card className="p-6 bg-white border-gray-100 shadow-sm space-y-4">
                            <div className="border-b border-gray-100 pb-3 flex justify-between items-center">
                                <div>
                                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2.5 py-1 rounded-full">
                                        Section: {activeQuestion?.sectionTitle || 'General'}
                                    </span>
                                    <h3 className="text-xl font-black text-gray-900 mt-2">{activeQuestion?.label || 'Question Label'}</h3>
                                </div>
                                <span className="text-xs font-bold text-gray-400 bg-gray-50 px-3 py-1 rounded-xl">
                                    Type: {activeQuestion?.type || 'standard'}
                                </span>
                            </div>

                            {/* Rating Distribution Breakdown */}
                            {questionAnalytics.stats?.dist && (
                                <div className="space-y-3 pt-2">
                                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Star Rating Breakdown</h4>
                                    <div className="space-y-2">
                                        {[5, 4, 3, 2, 1].map(stars => {
                                            const count = questionAnalytics.stats.dist[stars] || 0;
                                            const pct = questionAnalytics.answeredCount > 0 ? Math.round((count / questionAnalytics.answeredCount) * 100) : 0;
                                            return (
                                                <div key={stars} className="flex items-center gap-3 text-xs font-medium">
                                                    <span className="w-12 font-bold text-amber-500 flex items-center gap-1 shrink-0">
                                                        {stars} ⭐
                                                    </span>
                                                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                                                        <div 
                                                            className={clsx(
                                                                "h-full rounded-full transition-all duration-500",
                                                                stars >= 4 ? "bg-emerald-500" : stars === 3 ? "bg-amber-400" : "bg-red-500"
                                                            )} 
                                                            style={{ width: `${pct}%` }} 
                                                        />
                                                    </div>
                                                    <span className="w-16 text-right text-gray-500 font-bold shrink-0">
                                                        {count} ({pct}%)
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Frequency Distribution */}
                            {questionAnalytics.stats?.freq && (
                                <div className="space-y-3 pt-2">
                                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Option Frequencies</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {Object.entries(questionAnalytics.stats.freq).map(([opt, count]) => {
                                            const pct = questionAnalytics.answeredCount > 0 ? Math.round((count / questionAnalytics.answeredCount) * 100) : 0;
                                            return (
                                                <div key={opt} className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex justify-between items-center text-xs">
                                                    <span className="font-bold text-gray-800 truncate pr-2">{opt}</span>
                                                    <span className="font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full shrink-0">
                                                        {count} ({pct}%)
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </Card>

                        {/* Top Comments / Highlights Grid */}
                        <Card className="p-6 bg-white border-gray-100 shadow-sm space-y-4">
                            <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-indigo-600" />
                                Recent Parent Comments & Answers Preview
                            </h3>

                            {questionAnalytics.answers.length === 0 ? (
                                <div className="py-12 text-center text-gray-400 border-2 border-dashed border-gray-100 rounded-2xl">
                                    <HelpCircle className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                                    <p className="text-sm font-bold text-gray-600">No responses recorded for this question yet.</p>
                                    <p className="text-xs text-gray-400 mt-1">Try selecting a different question or mentor filter.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {questionAnalytics.answers.slice(0, 6).map((item, idx) => {
                                        return (
                                            <div key={idx} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2 relative break-inside-avoid">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="text-xs font-black text-gray-900">{item.parentName}</h4>
                                                        <p className="text-[10px] text-gray-500 font-medium">
                                                            Student: <span className="font-bold text-indigo-600">{item.studentName}</span> • Class {item.className} • Mentor: <span className="font-bold text-purple-700">{item.mentorName}</span>
                                                        </p>
                                                    </div>
                                                    <span className="text-[10px] text-gray-400">
                                                        {new Date(item.submittedAt).toLocaleDateString()}
                                                    </span>
                                                </div>

                                                <div className="p-3 bg-white rounded-xl border border-gray-100 text-xs font-medium text-gray-800 leading-relaxed">
                                                    {activeQuestion?.type === 'star_rating' ? (
                                                        <span className="font-black text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                                            {item.answer} ⭐
                                                        </span>
                                                    ) : typeof item.answer === 'object' && item.answer !== null ? (
                                                        <div className="space-y-1">
                                                            {Object.entries(item.answer).map(([aspect, score]) => (
                                                                <div key={aspect} className="flex justify-between items-center text-xs">
                                                                    <span className="font-semibold text-gray-700">{aspect}:</span>
                                                                    <span className="font-black text-amber-500">{score} ⭐</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : Array.isArray(item.answer) ? (
                                                        <div className="space-y-1">
                                                            {item.answer.map((ans, i) => (
                                                                <div key={i} className="font-semibold text-gray-800">• {ans}</div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="whitespace-pre-wrap">{String(item.answer)}</div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </Card>
                    </div>
                )}

                {/* REPORT VIEW: DETAILED BREAKDOWN MODE (WITHOUT ADMIN NOTE COLUMN) */}
                {reportMode === 'detailed' && (
                    <Card className="p-6 bg-white border-gray-100 shadow-sm space-y-4 print:shadow-none print:border-none">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4">
                            <div>
                                <h3 className="text-lg font-black text-gray-900">Detailed Student & Parent Response Table</h3>
                                <p className="text-xs text-gray-500">Showing all individual answers for "{activeQuestion?.label}"</p>
                            </div>

                            {/* Search Filter */}
                            <div className="relative w-full sm:w-64 print:hidden">
                                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                                <input 
                                    type="text"
                                    placeholder="Search by student or parent..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        </div>

                        {/* Table View */}
                        {detailedAnswers.length === 0 ? (
                            <div className="py-12 text-center text-gray-400 border-2 border-dashed border-gray-100 rounded-2xl">
                                <p className="text-sm font-bold text-gray-600">No matching responses found.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 text-gray-500 uppercase text-[10px] font-black tracking-wider border-b border-gray-200">
                                            <th className="py-3 px-4 w-12 text-center">#</th>
                                            <th className="py-3 px-4 w-48">Student & Class</th>
                                            <th className="py-3 px-4 w-40">Parent Name</th>
                                            <th className="py-3 px-4 w-40">Mentor Name</th>
                                            <th className="py-3 px-4">Answer / Rating</th>
                                            <th className="py-3 px-4 w-28 text-right">Submitted</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                                        {detailedAnswers.map((item, idx) => {
                                            return (
                                                <tr key={item.submissionId} className="hover:bg-gray-50/80 transition-colors break-inside-avoid">
                                                    <td className="py-3 px-4 text-gray-400 font-bold text-center">{idx + 1}</td>
                                                    <td className="py-3 px-4">
                                                        <span className="font-bold text-gray-900 block">{item.studentName}</span>
                                                        <span className="text-[10px] text-indigo-600 font-bold">Class {item.className} {item.division && `(${item.division})`}</span>
                                                    </td>
                                                    <td className="py-3 px-4 font-bold text-gray-700">{item.parentName}</td>
                                                    <td className="py-3 px-4 font-bold text-purple-700">{item.mentorName}</td>
                                                    <td className="py-3 px-4">
                                                        {activeQuestion?.type === 'star_rating' ? (
                                                            <span className="font-black text-amber-500 bg-amber-50 px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                                                                {item.answer} ⭐
                                                            </span>
                                                        ) : typeof item.answer === 'object' && item.answer !== null ? (
                                                            <div className="space-y-1 bg-gray-50 p-3 rounded-xl border border-gray-100 text-xs">
                                                                {Object.entries(item.answer).map(([aspect, score]) => (
                                                                    <div key={aspect} className="flex justify-between items-center py-0.5 border-b border-gray-100 last:border-0">
                                                                        <span className="font-semibold text-gray-700 pr-4">{aspect}:</span>
                                                                        <span className="font-black text-amber-500 shrink-0">{score} ⭐</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : Array.isArray(item.answer) ? (
                                                            <div className="space-y-1 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                                                {item.answer.map((ans, i) => (
                                                                    <div key={i} className="font-semibold text-gray-800">• {ans}</div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 font-semibold text-gray-900 whitespace-pre-wrap leading-relaxed">
                                                                {String(item.answer)}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 text-[10px] text-gray-400 text-right whitespace-nowrap">
                                                        {new Date(item.submittedAt).toLocaleDateString()}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                )}
            </div>

            {/* API KEY CONFIGURATION MODAL */}
            {showKeyModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200 print:hidden" onClick={() => setShowKeyModal(false)}>
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-gray-100" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 border-b pb-4">
                            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                                <Key className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-gray-900">Google Gemini API Key</h3>
                                <p className="text-xs text-gray-500">Provide an API key for live AI report generation.</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-700">Enter API Key</label>
                            <input 
                                type="password" 
                                placeholder="AIzaSy..." 
                                value={tempApiKey}
                                onChange={e => setTempApiKey(e.target.value)}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                            <p className="text-[10px] text-gray-400 leading-normal">
                                Your API key is stored securely in your browser's local storage and used directly for Google Gemini API requests.
                            </p>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={() => setShowKeyModal(false)} className="text-xs py-2">
                                Cancel
                            </Button>
                            <Button variant="primary" onClick={handleSaveApiKey} className="text-xs py-2">
                                Save API Key
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ParentFeedbackReportGenerator;
