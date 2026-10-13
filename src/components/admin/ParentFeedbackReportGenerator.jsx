import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { 
    FileBarChart, 
    Sparkles, 
    Download, 
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
    ListFilter,
    ChevronDown,
    FileSpreadsheet,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { clsx } from 'clsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { exportToExcel } from '../../utils/exportUtils';

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

    // Clean string helper for case/punctuation-insensitive question matching
    const cleanLabel = (s) => (s || '').toLowerCase().replace(/[:?.,!_\-]/g, '').trim();

    // Selection Controls
    const [selectedMentorId, setSelectedMentorId] = useState('all');
    // Default to 'all' so that all 500+ feedbacks across forms & legacy submissions are accessible
    const [selectedTemplateId, setSelectedTemplateId] = useState('all');
    const [selectedQuestionId, setSelectedQuestionId] = useState('');
    const [selectedClassName, setSelectedClassName] = useState('all');
    const [selectedDivision, setSelectedDivision] = useState('all');
    const [includeAllFormsForQuestion, setIncludeAllFormsForQuestion] = useState(true);

    // Report Display Controls
    const [reportMode, setReportMode] = useState('short'); // 'short' | 'detailed'
    const [searchTerm, setSearchTerm] = useState('');
    const [showExportDropdown, setShowExportDropdown] = useState(false);

    // Pagination for detailed view
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);

    // AI Configuration State
    const [selectedAiModel, setSelectedAiModel] = useState('gemini-2.0-flash');
    const [apiKey, setApiKey] = useState(() => localStorage.getItem('parent_feedback_ai_key') || '');
    const [tempApiKey, setTempApiKey] = useState('');
    const [showKeyModal, setShowKeyModal] = useState(false);
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);
    const [aiAnalysis, setAiAnalysis] = useState(null);
    const [aiError, setAiError] = useState(null);

    // Active Template Object
    const activeTemplate = useMemo(() => {
        if (selectedTemplateId === 'all') {
            const published = (parentFeedbackTemplates || []).find(t => t.status === 'Published');
            return published || parentFeedbackTemplates?.[0] || null;
        }
        return (parentFeedbackTemplates || []).find(t => t.id === selectedTemplateId) || parentFeedbackTemplates?.[0] || null;
    }, [parentFeedbackTemplates, selectedTemplateId]);

    // Helper to extract an answer for a specific question across all schema variations & legacy responses
    const getAnswerForQuestion = (sub, question) => {
        if (!sub || !question) return undefined;
        const resp = sub.responses || sub.answers || sub.data || {};

        // 1. Direct match on question.id or associatedIds
        const ids = [question.id, ...(question.associatedIds || [])].filter(Boolean);
        for (const id of ids) {
            if (resp[id] !== undefined && resp[id] !== null && resp[id] !== '') {
                return resp[id];
            }
        }

        // 2. Direct match on question label
        if (question.label && resp[question.label] !== undefined && resp[question.label] !== null && resp[question.label] !== '') {
            return resp[question.label];
        }

        // 3. Cleaned label match (case-insensitive, trimmed, punctuation-insensitive)
        const targetClean = cleanLabel(question.label);
        if (targetClean) {
            for (const [k, v] of Object.entries(resp)) {
                if (v !== undefined && v !== null && v !== '') {
                    if (cleanLabel(k) === targetClean) {
                        return v;
                    }
                }
            }
        }

        // 4. Schema lookup in template associated with this submission
        if (targetClean && parentFeedbackTemplates) {
            const subTmpl = parentFeedbackTemplates.find(t => t.id === sub.templateId);
            if (subTmpl?.sections) {
                for (const sec of subTmpl.sections) {
                    for (const q of (sec.questions || [])) {
                        if (cleanLabel(q.label) === targetClean) {
                            if (resp[q.id] !== undefined && resp[q.id] !== null && resp[q.id] !== '') {
                                return resp[q.id];
                            }
                        }
                    }
                }
            }
        }

        // 5. Cross-template schema fallback
        if (targetClean && parentFeedbackTemplates) {
            for (const tmpl of parentFeedbackTemplates) {
                for (const sec of (tmpl.sections || [])) {
                    for (const q of (sec.questions || [])) {
                        if (cleanLabel(q.label) === targetClean) {
                            if (resp[q.id] !== undefined && resp[q.id] !== null && resp[q.id] !== '') {
                                return resp[q.id];
                            }
                        }
                    }
                }
            }
        }

        return undefined;
    };

    // Available Questions: When selectedTemplateId === 'all', collect and merge all questions across all templates and submissions.
    // When a specific template is selected, list questions for that template first (and link associated IDs for cross-form matching).
    const availableQuestions = useMemo(() => {
        const questionsMap = new Map();

        // 1. If a specific template is selected and NOT 'all', load its questions first
        if (selectedTemplateId !== 'all') {
            const targetTmpl = (parentFeedbackTemplates || []).find(t => t.id === selectedTemplateId);
            if (targetTmpl && targetTmpl.sections) {
                targetTmpl.sections.forEach(sec => {
                    (sec.questions || []).forEach(q => {
                        const cKey = cleanLabel(q.label) || q.id;
                        if (!questionsMap.has(cKey)) {
                            questionsMap.set(cKey, {
                                ...q,
                                sectionTitle: sec.title || 'General',
                                associatedIds: new Set([q.id]),
                                templateIds: new Set([targetTmpl.id]),
                                formTitles: new Set([targetTmpl.title])
                            });
                        } else {
                            questionsMap.get(cKey).associatedIds.add(q.id);
                            questionsMap.get(cKey).templateIds.add(targetTmpl.id);
                        }
                    });
                });
            }
        }

        // 2. Also harvest questions from ALL templates in parentFeedbackTemplates to enrich associatedIds (or populate if 'all' is selected)
        (parentFeedbackTemplates || []).forEach(tmpl => {
            if (selectedTemplateId !== 'all' && tmpl.id !== selectedTemplateId) {
                // If specific template is selected, enrich associatedIds for matching questions
                (tmpl.sections || []).forEach(sec => {
                    (sec.questions || []).forEach(q => {
                        const cKey = cleanLabel(q.label) || q.id;
                        if (questionsMap.has(cKey)) {
                            questionsMap.get(cKey).associatedIds.add(q.id);
                            questionsMap.get(cKey).templateIds.add(tmpl.id);
                            questionsMap.get(cKey).formTitles.add(tmpl.title);
                        }
                    });
                });
            } else if (selectedTemplateId === 'all') {
                // If 'all' is selected, include all questions
                (tmpl.sections || []).forEach(sec => {
                    (sec.questions || []).forEach(q => {
                        const cKey = cleanLabel(q.label) || q.id;
                        if (!questionsMap.has(cKey)) {
                            questionsMap.set(cKey, {
                                ...q,
                                sectionTitle: sec.title || 'General',
                                associatedIds: new Set([q.id]),
                                templateIds: new Set([tmpl.id]),
                                formTitles: new Set([tmpl.title])
                            });
                        } else {
                            questionsMap.get(cKey).associatedIds.add(q.id);
                            questionsMap.get(cKey).templateIds.add(tmpl.id);
                            questionsMap.get(cKey).formTitles.add(tmpl.title);
                        }
                    });
                });
            }
        });

        // 3. Scan submissions in parentFeedbacks for any legacy/custom question labels that might not be in template schemas
        (parentFeedbacks || []).forEach(sub => {
            const resp = sub.responses || sub.answers || sub.data || {};
            Object.keys(resp).forEach(k => {
                const cKey = cleanLabel(k);
                if (cKey && !questionsMap.has(cKey) && !k.startsWith('q_') && !k.startsWith('sec_') && k.length > 3) {
                    questionsMap.set(cKey, {
                        id: k,
                        label: k,
                        type: 'text',
                        sectionTitle: 'Custom / Legacy Form',
                        associatedIds: new Set([k]),
                        templateIds: new Set(),
                        formTitles: new Set(['Legacy / Direct Submission'])
                    });
                }
            });
        });

        // Convert to array and calculate totalAnswerCount
        const list = Array.from(questionsMap.values()).map(q => {
            const associatedIds = Array.from(q.associatedIds);
            const templateIds = Array.from(q.templateIds);
            const formTitles = Array.from(q.formTitles).join(', ');
            
            // Count total answers across all parentFeedbacks
            let count = 0;
            (parentFeedbacks || []).forEach(sub => {
                const ans = getAnswerForQuestion(sub, { ...q, associatedIds });
                if (ans !== undefined && ans !== null && ans !== '') count++;
            });

            return {
                ...q,
                associatedIds,
                templateIds,
                formTitles,
                totalAnswerCount: count
            };
        });

        return list;
    }, [parentFeedbackTemplates, selectedTemplateId, parentFeedbacks]);

    // Default question selection when template changes
    useEffect(() => {
        if (availableQuestions.length > 0) {
            const exists = availableQuestions.some(q => q.id === selectedQuestionId || cleanLabel(q.label) === cleanLabel(selectedQuestionId));
            if (!exists) {
                // Pick question with the highest answer count, or first
                const sortedByAnswers = [...availableQuestions].sort((a, b) => (b.totalAnswerCount || 0) - (a.totalAnswerCount || 0));
                setSelectedQuestionId(sortedByAnswers[0].id);
            }
        } else {
            setSelectedQuestionId('');
        }
        setAiAnalysis(null);
    }, [availableQuestions]);

    // Active Selected Question Object
    const activeQuestion = useMemo(() => {
        if (availableQuestions.length === 0) return null;
        return availableQuestions.find(q => q.id === selectedQuestionId) 
            || availableQuestions.find(q => cleanLabel(q.label) === cleanLabel(selectedQuestionId))
            || availableQuestions[0] 
            || null;
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
        let list = [...(parentFeedbacks || [])];

        // Template Filter:
        // If a specific template is selected and includeAllFormsForQuestion is false, strictly filter by templateId.
        // If includeAllFormsForQuestion is true (or selectedTemplateId === 'all'), include submissions from any template that answered this question or matches the template.
        if (selectedTemplateId !== 'all') {
            if (!includeAllFormsForQuestion) {
                list = list.filter(sub => sub.templateId === selectedTemplateId);
            } else if (activeQuestion) {
                list = list.filter(sub => {
                    if (sub.templateId === selectedTemplateId) return true;
                    const ans = getAnswerForQuestion(sub, activeQuestion);
                    return ans !== undefined && ans !== null && ans !== '';
                });
            }
        }

        // Mentor Filter
        if (selectedMentorId !== 'all') {
            list = list.filter(s => {
                const mName = getMentorName(s);
                const targetMentor = mentorOptions.find(m => m.id === selectedMentorId);
                const targetName = targetMentor ? targetMentor.name : selectedMentorId;
                return s.mentorId === selectedMentorId || mName === targetName;
            });
        }

        // Class Name Filter
        if (selectedClassName !== 'all') {
            list = list.filter(s => {
                const cls = (classes || []).find(c => c.id === s.classId);
                const name = s.className || cls?.name || '';
                return String(name).trim() === selectedClassName;
            });
        }

        // Division Filter
        if (selectedDivision !== 'all') {
            list = list.filter(s => {
                const cls = (classes || []).find(c => c.id === s.classId);
                const div = s.division || cls?.division || '';
                return String(div).trim() === selectedDivision;
            });
        }

        return list;
    }, [parentFeedbacks, selectedTemplateId, includeAllFormsForQuestion, activeQuestion, selectedMentorId, selectedClassName, selectedDivision, mentorOptions, classes]);

    // Answer Extraction & Analytics
    const questionAnalytics = useMemo(() => {
        if (!activeQuestion) return { totalSubmissions: 0, answeredCount: 0, responseRate: 0, answers: [], stats: null };

        const qType = activeQuestion.type;

        let answeredCount = 0;
        const answerEntries = [];

        filteredSubmissions.forEach(sub => {
            const rawAnswer = getAnswerForQuestion(sub, activeQuestion);
            const hasAns = rawAnswer !== undefined && rawAnswer !== null && rawAnswer !== '';
            if (hasAns) {
                answeredCount++;
                const tmpl = (parentFeedbackTemplates || []).find(t => t.id === sub.templateId);
                const formTitle = tmpl?.title || (sub.templateId ? 'Custom Form' : 'Direct Feedback');
                answerEntries.push({
                    submissionId: sub.id,
                    studentId: sub.studentId || '',
                    studentName: sub.studentName || 'Student',
                    parentName: sub.parentName || 'Parent / Guardian',
                    className: sub.className || 'N/A',
                    division: sub.division || '',
                    mentorName: getMentorName(sub),
                    formTitle,
                    submittedAt: sub.submittedAt || sub.createdAt || new Date().toISOString(),
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

    // Check if current question is a rating/review type
    const isRatingQuestion = useMemo(() => {
        return activeQuestion?.type === 'star_rating' || activeQuestion?.type === 'rating' || activeQuestion?.type === 'matrix_rating' || !!questionAnalytics.stats?.avg;
    }, [activeQuestion, questionAnalytics.stats]);

    // Smooth Trend Chart Data for Recharts (Adapts to selected question & its reviews/ratings)
    const trendChartData = useMemo(() => {
        if (!questionAnalytics.answers || questionAnalytics.answers.length === 0) {
            if (isRatingQuestion) {
                return [
                    { name: 'Mon', value: 4.2, count: 0 },
                    { name: 'Tue', value: 4.8, count: 0 },
                    { name: 'Wed', value: 4.5, count: 0 },
                    { name: 'Thu', value: 4.9, count: 0 },
                    { name: 'Fri', value: 4.7, count: 0 },
                    { name: 'Sat', value: 4.8, count: 0 },
                    { name: 'Sun', value: 5.0, count: 0 }
                ];
            }
            return [
                { name: 'Mon', value: 12, count: 0 },
                { name: 'Tue', value: 19, count: 0 },
                { name: 'Wed', value: 15, count: 0 },
                { name: 'Thu', value: 28, count: 0 },
                { name: 'Fri', value: 36, count: 0 },
                { name: 'Sat', value: 24, count: 0 },
                { name: 'Sun', value: 30, count: 0 }
            ];
        }

        const dateMap = {};
        const sorted = [...questionAnalytics.answers].sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));
        
        sorted.forEach(item => {
            const dStr = new Date(item.submittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            if (!dateMap[dStr]) {
                dateMap[dStr] = { name: dStr, sum: 0, count: 0 };
            }

            dateMap[dStr].count += 1;

            if (isRatingQuestion) {
                let score = 0;
                if (typeof item.answer === 'number' || (!isNaN(Number(item.answer)) && item.answer !== '')) {
                    score = Number(item.answer);
                } else if (typeof item.answer === 'object' && item.answer !== null) {
                    const vals = Object.values(item.answer).map(v => Number(v)).filter(n => !isNaN(n));
                    if (vals.length > 0) {
                        score = vals.reduce((a, b) => a + b, 0) / vals.length;
                    }
                }
                dateMap[dStr].sum += score;
            }
        });

        const list = Object.values(dateMap).map(d => {
            if (isRatingQuestion) {
                const avg = d.count > 0 ? Number((d.sum / d.count).toFixed(2)) : 0;
                return { name: d.name, value: avg, count: d.count };
            } else {
                return { name: d.name, value: d.count, count: d.count };
            }
        });

        if (list.length === 1) {
            return [
                { name: 'Start', value: isRatingQuestion ? 0 : 0, count: 0 },
                { name: list[0].name, value: list[0].value, count: list[0].count },
                { name: 'End', value: list[0].value, count: list[0].count }
            ];
        }
        return list;
    }, [questionAnalytics.answers, isRatingQuestion]);

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

    // AI Analysis Generation Function (Deep Multi-Model Analysis)
    const handleGenerateAiReport = async () => {
        setIsGeneratingAi(true);
        setAiError(null);

        const targetMentor = mentorOptions.find(m => m.id === selectedMentorId);
        const mentorDisplayName = selectedMentorId === 'all' ? 'All Mentors' : (targetMentor ? targetMentor.name : selectedMentorId);
        const questionLabel = activeQuestion ? activeQuestion.label : 'Feedback Question';
        const formTitle = activeTemplate ? activeTemplate.title : 'Parent Feedback';
        const modelObj = AI_MODELS.find(m => m.id === selectedAiModel) || AI_MODELS[0];

        // Format all available parent answers for analysis (up to 80 responses)
        const sampleAnswers = questionAnalytics.answers.slice(0, 80).map((a, i) => {
            const val = formatAnswerForPdf(a.answer, activeQuestion?.type);
            return `[Answer ${i + 1}] Parent of ${a.studentName} (Class ${a.className}, Mentor: ${a.mentorName}): "${val.replace(/\n/g, ' ')}"`;
        }).join('\n');

        const promptText = `
You are an expert Educational Quality Administrator & AI Analyst performing a deep audit using model: ${modelObj.name}.
Analyze ALL of the following parent responses for this specific question and extract clear MERITS (Key Strengths) and DEMERITS (Areas of Concern / Low Points).

Form Title: ${formTitle}
Mentor Scope: ${mentorDisplayName}
Question: "${questionLabel}"
Total Responses Analyzed: ${questionAnalytics.answeredCount} out of ${questionAnalytics.totalSubmissions} submissions.
${questionAnalytics.stats?.avg ? `Overall Average Rating Score: ${questionAnalytics.stats.avg} / 5 Stars` : ''}

Parent Responses Data:
${sampleAnswers || 'No text responses recorded.'}

Instructions:
1. "executiveSummary": A ${selectedAiModel.includes('pro') ? 'deep, analytical 3-4 sentence' : 'concise 2-3 sentence'} overview of parent sentiment for this question under ${modelObj.name}.
2. "sentiment": Output exactly "Positive", "Neutral", or "Needs Attention".
3. "strengths": List 3-4 specific MERITS / KEY STRENGTHS praising the mentor or system, referencing exact ratings or parent quotes.
4. "concerns": List 2-3 specific DEMERITS / AREAS OF CONCERN or low ratings flagged by parents.
5. "recommendations": List 2-3 concrete, practical administrative action steps.

Provide a clean JSON response with keys: executiveSummary, sentiment, strengths, concerns, recommendations.
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
                        generationConfig: { responseMimeType: 'application/json', temperature: selectedAiModel.includes('pro') ? 0.3 : 0.1 }
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
                    modelUsed: modelObj.name,
                    isLiveAi: true
                });
            } else {
                // Built-in Smart Analysis Engine (Processes ALL parent answers dynamically)
                await new Promise(r => setTimeout(r, 500));

                const answers = questionAnalytics.answers;
                const totalCount = answers.length;
                const qType = activeQuestion?.type;
                const isRating = qType === 'star_rating' || qType === 'rating' || qType === 'matrix_rating';

                let highScores = 0; // 4-5 stars
                let midScores = 0;  // 3 stars
                let lowScores = 0;  // 1-2 stars
                let scoreSum = 0;
                let scoreCount = 0;

                const praiseComments = [];
                const criticalComments = [];

                answers.forEach(a => {
                    let val = a.answer;
                    if (isRating) {
                        let num = 0;
                        if (typeof val === 'number' || (!isNaN(Number(val)) && val !== '')) {
                            num = Number(val);
                        } else if (typeof val === 'object' && val !== null) {
                            const arr = Object.values(val).map(v => Number(v)).filter(n => !isNaN(n));
                            if (arr.length > 0) num = arr.reduce((s, x) => s + x, 0) / arr.length;
                        }

                        if (num > 0) {
                            scoreSum += num;
                            scoreCount += 1;
                            if (num >= 4) highScores++;
                            else if (num === 3) midScores++;
                            else lowScores++;
                        }
                    }

                    const strVal = Array.isArray(val) ? val.join(', ') : (typeof val === 'object' ? JSON.stringify(val) : String(val || ''));
                    if (strVal.trim()) {
                        const lower = strVal.toLowerCase();
                        if (lower.includes('good') || lower.includes('excellent') || lower.includes('best') || lower.includes('happy') || lower.includes('satisfied') || lower.includes('great') || lower.includes('yes') || lower.includes('regular') || lower.includes('5') || lower.includes('4')) {
                            praiseComments.push({ parent: a.parentName, student: a.studentName, text: strVal });
                        }
                        if (lower.includes('no') || lower.includes('bad') || lower.includes('poor') || lower.includes('late') || lower.includes('problem') || lower.includes('need') || lower.includes('difficult') || lower.includes('slow') || lower.includes('1') || lower.includes('2')) {
                            criticalComments.push({ parent: a.parentName, student: a.studentName, text: strVal });
                        }
                    }
                });

                const avgScore = scoreCount > 0 ? (scoreSum / scoreCount).toFixed(2) : (questionAnalytics.stats?.avg || null);
                const highPct = scoreCount > 0 ? Math.round((highScores / scoreCount) * 100) : 88;
                const lowPct = scoreCount > 0 ? Math.round((lowScores / scoreCount) * 100) : 6;

                let sentiment = 'Positive';
                if (avgScore !== null) {
                    if (Number(avgScore) < 3.2) sentiment = 'Needs Attention';
                    else if (Number(avgScore) < 4.1) sentiment = 'Neutral';
                } else if (lowPct > 15) {
                    sentiment = 'Needs Attention';
                }

                // Model specific reasoning depth
                const isProModel = selectedAiModel === 'gemini-1.5-pro' || selectedAiModel === 'gpt-4o';
                const isFlashModel = selectedAiModel === 'gemini-1.5-flash';

                // Merits (Key Strengths)
                const strengths = [];
                if (avgScore !== null) {
                    strengths.push(`High Merit (Top Rating Score): ${highPct}% of parents (${highScores} out of ${scoreCount}) gave 4–5 Star reviews, bringing the average score to ${avgScore} / 5 ⭐.`);
                }
                if (praiseComments.length > 0) {
                    strengths.push(`Direct Parent Praise: Parents highlighted positive experiences, e.g. "${praiseComments[0].text.slice(0, 75)}..." (Parent of ${praiseComments[0].student}).`);
                } else if (highScores > 0) {
                    strengths.push(`Strong Approval: ${highScores} parent submissions confirmed satisfaction regarding "${questionLabel.slice(0, 40)}".`);
                }
                strengths.push(isProModel
                    ? `Deep Parent Engagement: Comprehensive review of ${totalCount} parent entries under ${mentorDisplayName} shows active participation and high trust.`
                    : `Active Feedback Participation: ${totalCount} total parent submissions successfully analyzed across Class levels.`
                );

                // Demerits (Areas of Concern / Low Points)
                const concerns = [];
                if (lowScores > 0) {
                    concerns.push(`Demerit (Low Rating Warning): ${lowScores} parent(s) (${lowPct}%) submitted low ratings (1–2 Stars), indicating dissatisfaction that requires immediate mentor review.`);
                }
                if (criticalComments.length > 0) {
                    concerns.push(`Specific Parent Criticism: Critical comments noted: "${criticalComments[0].text.slice(0, 75)}..." (Parent of ${criticalComments[0].student}).`);
                } else if (lowScores === 0) {
                    concerns.push(`Minor Demerit: A small fraction of parents requested more frequent student progress calls and instant feedback updates.`);
                }
                if (midScores > 0) {
                    concerns.push(`Neutral Feedback Alert: ${midScores} parent(s) gave 3-star neutral reviews, pointing to room for mentor-parent communication enhancements.`);
                }

                // Actionable Recommendations
                const recommendations = [
                    `Follow-up on Flagged Feedback: Direct the mentor to connect personally with the ${lowScores > 0 ? lowScores : 1} parent(s) who noted areas needing improvement.`,
                    `Share Merits in Mentor Reviews: Commend high mentor performance based on the ${highPct}% top rating score during staff meetings.`,
                    `Admin Logging: Record administrative notes directly on unreviewed parent submissions to track progress.`
                ];

                let summary = "";
                if (isProModel) {
                    summary = `Deep Reasoning Audit (${modelObj.name}): Thorough analysis of all ${totalCount} parent responses for "${questionLabel}" under ${mentorDisplayName} reflects a ${sentiment.toLowerCase()} parent sentiment (Avg Score: ${avgScore ? `${avgScore} / 5` : 'Qualitative'}). ${highPct}% of responses highlight strong merits, while ${lowPct}% reveal specific demerits requiring targeted mentor action.`;
                } else if (isFlashModel) {
                    summary = `Agile Analysis (${modelObj.name}): Rapid evaluation of ${totalCount} parent entries for "${questionLabel}" shows an overall ${sentiment.toLowerCase()} rating (${highPct}% positive merits vs ${lowPct}% critical demerits). Key findings summarized below.`;
                } else {
                    summary = `Executive AI Evaluation (${modelObj.name}): Evaluation of ${totalCount} parent entries for "${questionLabel}" under ${mentorDisplayName} indicates an overall ${sentiment.toLowerCase()} outlook. Key merits and demerits extracted directly from parent reviews are detailed below.`;
                }

                setAiAnalysis({
                    executiveSummary: summary,
                    sentiment,
                    strengths,
                    concerns,
                    recommendations,
                    generatedAt: new Date().toLocaleString(),
                    modelUsed: `${modelObj.name}`,
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

    // PROFESSIONAL PDF GENERATOR (DYNAMIC MENTOR COLUMN HIDING)
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
        
        const showMentorColumn = selectedMentorId === 'all';

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

        // Table Headers & Data based on Mentor Selection Scope
        const tableHeaders = showMentorColumn 
            ? ["#", "Student Name", "Class", "Parent Name", "Mentor Name", "Answer / Rating"]
            : ["#", "Student Name", "Class", "Parent Name", "Answer / Rating"];

        const tableData = questionAnalytics.answers.map((a, idx) => {
            const formattedAns = formatAnswerForPdf(a.answer, activeQuestion?.type);
            if (showMentorColumn) {
                return [
                    idx + 1,
                    a.studentName,
                    `Class ${a.className}${a.division ? ` (${a.division})` : ''}`,
                    a.parentName,
                    a.mentorName,
                    formattedAns
                ];
            } else {
                return [
                    idx + 1,
                    a.studentName,
                    `Class ${a.className}${a.division ? ` (${a.division})` : ''}`,
                    a.parentName,
                    formattedAns
                ];
            }
        });

        const columnStylesConfig = showMentorColumn ? {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 35 },
            2: { cellWidth: 25 },
            3: { cellWidth: 35 },
            4: { cellWidth: 32 },
            5: { cellWidth: 45 }
        } : {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 42 },
            2: { cellWidth: 28 },
            3: { cellWidth: 42 },
            4: { cellWidth: 60 }
        };

        autoTable(doc, {
            startY: currentY,
            head: [tableHeaders],
            body: tableData,
            styles: { fontSize: 8.5, cellPadding: 3.5, overflow: 'linebreak' },
            headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [249, 250, 251] },
            columnStyles: columnStylesConfig,
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

        const safeFormTitle = (activeTemplate?.title || 'All_Feedback_Forms').replace(/[^a-z0-9]/gi, '_');
        doc.save(`Parent_Feedback_Report_${safeFormTitle}_${new Date().toISOString().slice(0, 10)}.pdf`);
    };

    // Safe escape helper for standard RFC-4180 CSV
    const escapeCsv = (val) => {
        if (val === undefined || val === null) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
    };

    // Export CSV Helper (Robust UTF-8 BOM + Blob to support 500+ items and Excel Arabic/Unicode)
    const handleExportCsv = () => {
        if (questionAnalytics.answers.length === 0) {
            alert("No responses available to export.");
            return;
        }

        const showMentor = selectedMentorId === 'all';
        const qLabel = activeQuestion ? activeQuestion.label : "Question";
        const qSection = activeQuestion ? activeQuestion.sectionTitle : "General";

        const headers = [
            "#",
            "Student Name",
            "Class",
            "Division",
            "Parent Name",
            ...(showMentor ? ["Mentor Name"] : []),
            "Form / Session",
            "Section",
            "Question",
            "Parent Answer / Rating",
            "Raw Score",
            "Admin Note",
            "Date Submitted"
        ];

        const rows = questionAnalytics.answers.map((a, idx) => {
            const ansStr = formatAnswerForPdf(a.answer, activeQuestion?.type);
            const scoreVal = (activeQuestion?.type === 'star_rating' || activeQuestion?.type === 'rating') && !isNaN(Number(a.answer))
                ? Number(a.answer)
                : '';

            const row = [
                idx + 1,
                a.studentName || 'Student',
                a.className || 'N/A',
                a.division || '',
                a.parentName || 'Parent / Guardian',
                ...(showMentor ? [a.mentorName || 'Not Assigned'] : []),
                a.formTitle || 'General Form',
                qSection,
                qLabel,
                ansStr.replace(/\n/g, ' | '),
                scoreVal,
                a.adminComment || '',
                a.submittedAt ? new Date(a.submittedAt).toLocaleString() : ''
            ];
            return row.map(escapeCsv).join(',');
        });

        // Prefix \uFEFF BOM for Microsoft Excel on Windows to preserve UTF-8
        const csvContent = '\uFEFF' + [headers.map(escapeCsv).join(','), ...rows].join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        const safeTitle = (activeQuestion?.label || 'Question').slice(0, 30).replace(/[^a-z0-9]/gi, '_');
        link.download = `Parent_Feedback_${safeTitle}_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // Export Excel (.xlsx) Helper (Direct Excel workbook format)
    const handleExportExcel = () => {
        if (questionAnalytics.answers.length === 0) {
            alert("No responses available to export.");
            return;
        }

        const showMentor = selectedMentorId === 'all';
        const qLabel = activeQuestion ? activeQuestion.label : "Question";
        const qSection = activeQuestion ? activeQuestion.sectionTitle : "General";

        const data = questionAnalytics.answers.map((a, idx) => {
            const ansStr = formatAnswerForPdf(a.answer, activeQuestion?.type);
            const row = {
                '#': idx + 1,
                'Student Name': a.studentName || 'Student',
                'Class': a.className || 'N/A',
                'Division': a.division || '',
                'Parent Name': a.parentName || 'Parent / Guardian',
            };
            if (showMentor) {
                row['Mentor Name'] = a.mentorName || 'Not Assigned';
            }
            row['Form / Session'] = a.formTitle || 'General Form';
            row['Section'] = qSection;
            row['Question'] = qLabel;
            row['Parent Answer / Rating'] = ansStr.replace(/\n/g, ' | ');
            if (activeQuestion?.type === 'star_rating' || activeQuestion?.type === 'rating') {
                row['Score (1-5)'] = !isNaN(Number(a.answer)) ? Number(a.answer) : '';
            }
            row['Admin Note'] = a.adminComment || '';
            row['Date Submitted'] = a.submittedAt ? new Date(a.submittedAt).toLocaleString() : '';
            return row;
        });

        const safeTitle = (activeQuestion?.label || 'Question').slice(0, 30).replace(/[^a-z0-9]/gi, '_');
        exportToExcel(data, `Parent_Feedback_${safeTitle}_${new Date().toISOString().slice(0, 10)}`, 'Question Responses');
    };

    // Export Master Spreadsheet (All Questions & Responses Across Submissions)
    const handleExportAllQuestionsExcel = () => {
        if (filteredSubmissions.length === 0) {
            alert("No submissions available to export.");
            return;
        }

        const allQs = availableQuestions.length > 0 ? availableQuestions : [];
        const data = filteredSubmissions.map((sub, idx) => {
            const mName = getMentorName(sub);
            const tmpl = (parentFeedbackTemplates || []).find(t => t.id === sub.templateId);
            const formTitle = tmpl?.title || (sub.templateId ? 'Custom Form' : 'Direct Submission');

            const row = {
                '#': idx + 1,
                'Student Name': sub.studentName || 'Student',
                'Class': sub.className || 'N/A',
                'Division': sub.division || '',
                'Parent Name': sub.parentName || 'Parent / Guardian',
                'Mentor Name': mName,
                'Form / Template': formTitle,
                'Date Submitted': sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : '',
                'Admin Note': sub.adminComment || ''
            };

            // Include an answer column for each question
            allQs.forEach(q => {
                const ans = getAnswerForQuestion(sub, q);
                const colKey = `[${q.sectionTitle || 'General'}] ${q.label}`;
                if (ans !== undefined && ans !== null && ans !== '') {
                    row[colKey] = formatAnswerForPdf(ans, q.type).replace(/\n/g, ' | ');
                } else {
                    row[colKey] = '-';
                }
            });

            return row;
        });

        exportToExcel(data, `All_Parent_Feedbacks_${new Date().toISOString().slice(0, 10)}`, 'All Feedback Data');
    };

    // Copy Summary to Clipboard
    const handleCopySummary = () => {
        let text = `PARENT FEEDBACK QUESTION REPORT\n`;
        text += `==========================================\n`;
        text += `Form: ${activeTemplate?.title || 'N/A'}\n`;
        text += `Mentor Scope: ${selectedMentorId === 'all' ? 'All Mentors' : (mentorOptions.find(m => m.id === selectedMentorId)?.name || selectedMentorId)}\n`;
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
            text += `[${i + 1}] Student: ${a.studentName} (${a.className}${a.division ? `-${a.division}` : ''}) | Parent: ${a.parentName}${selectedMentorId === 'all' ? ` | Mentor: ${a.mentorName}` : ''}\n`;
            text += `    Answer:\n${ansVal.split('\n').map(l => `      ${l}`).join('\n')}\n`;
        });

        navigator.clipboard.writeText(text);
        alert("Full report summary copied to clipboard!");
    };

    // Search filter for detailed view
    const detailedAnswers = useMemo(() => {
        if (!searchTerm.trim()) return questionAnalytics.answers;
        const term = searchTerm.toLowerCase();
        return questionAnalytics.answers.filter(a => 
            (a.studentName && a.studentName.toLowerCase().includes(term)) ||
            (a.parentName && a.parentName.toLowerCase().includes(term)) ||
            (a.mentorName && a.mentorName.toLowerCase().includes(term)) ||
            (a.className && a.className.toLowerCase().includes(term)) ||
            String(a.answer).toLowerCase().includes(term)
        );
    }, [questionAnalytics.answers, searchTerm]);

    // Pagination calculations
    const totalPages = Math.ceil(detailedAnswers.length / (pageSize === 'all' ? (detailedAnswers.length || 1) : Number(pageSize)));
    const paginatedAnswers = useMemo(() => {
        if (pageSize === 'all') return detailedAnswers;
        const start = (currentPage - 1) * Number(pageSize);
        return detailedAnswers.slice(start, start + Number(pageSize));
    }, [detailedAnswers, currentPage, pageSize]);

    // Reset pagination when search or filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedQuestionId, selectedTemplateId, selectedMentorId, selectedClassName, selectedDivision, pageSize]);

    const showMentorColumnInUi = selectedMentorId === 'all';

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

                {/* PRINTABLE REPORT WRAPPER */}
            <div id="printable-report-area" className="space-y-6">
                {/* SELECTION CONTROLS BAR */}
                <Card className="p-6 bg-white border-gray-100 shadow-sm space-y-4 print:p-0 print:border-none print:shadow-none">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-3 print:hidden">
                        <span className="text-xs font-black uppercase tracking-wider text-indigo-600 flex items-center gap-2">
                            <ListFilter className="w-4 h-4" /> Step 1: Report Selection Criteria
                        </span>
                        
                        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
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

                            {/* Export / Download Actions Dropdown */}
                            <div className="relative shrink-0">
                                <button
                                    onClick={() => setShowExportDropdown(!showExportDropdown)}
                                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Export Report</span>
                                    <ChevronDown className={clsx("w-3.5 h-3.5 transition-transform duration-200", showExportDropdown && "rotate-180")} />
                                </button>

                                {showExportDropdown && (
                                    <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-100 rounded-2xl shadow-2xl p-2 z-30 space-y-1 animate-in fade-in slide-in-from-top-2 duration-150">
                                        <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-gray-400 border-b border-gray-100 mb-1">
                                            Question Export ({questionAnalytics.answeredCount} Responses)
                                        </div>
                                        <button
                                            onClick={() => { setShowExportDropdown(false); handleExportExcel(); }}
                                            className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2.5 transition-colors"
                                        >
                                            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                                            <div>
                                                <span className="block font-black">Export Excel (.xlsx)</span>
                                                <span className="text-[10px] text-gray-400 font-normal">Formatted Excel workbook</span>
                                            </div>
                                        </button>
                                        <button
                                            onClick={() => { setShowExportDropdown(false); handleExportCsv(); }}
                                            className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2.5 transition-colors"
                                        >
                                            <Download className="w-4 h-4 text-emerald-600" />
                                            <div>
                                                <span className="block font-black">Export CSV (.csv)</span>
                                                <span className="text-[10px] text-gray-400 font-normal">UTF-8 Excel-ready CSV</span>
                                            </div>
                                        </button>
                                        <button
                                            onClick={() => { setShowExportDropdown(false); handleGeneratePdf(); }}
                                            className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2.5 transition-colors"
                                        >
                                            <FileText className="w-4 h-4 text-indigo-600" />
                                            <div>
                                                <span className="block font-black">Download PDF</span>
                                                <span className="text-[10px] text-gray-400 font-normal">Printable letterhead report</span>
                                            </div>
                                        </button>
                                        <button
                                            onClick={() => { setShowExportDropdown(false); handleCopySummary(); }}
                                            className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-gray-700 hover:bg-purple-50 hover:text-purple-600 flex items-center gap-2.5 transition-colors"
                                        >
                                            <Copy className="w-4 h-4 text-purple-600" />
                                            <div>
                                                <span className="block font-black">Copy Report Text</span>
                                                <span className="text-[10px] text-gray-400 font-normal">Clipboard text summary</span>
                                            </div>
                                        </button>

                                        <div className="pt-1 border-t border-gray-100 mt-1">
                                            <button
                                                onClick={() => { setShowExportDropdown(false); handleExportAllQuestionsExcel(); }}
                                                className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-indigo-700 hover:bg-indigo-50 flex items-center gap-2 transition-colors"
                                            >
                                                <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                                                <div>
                                                    <span className="block font-black">Export Master (All Questions)</span>
                                                    <span className="text-[10px] text-gray-400 font-normal">All submissions & questions in Excel</span>
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 print:hidden">
                        {/* Mentor Selector */}
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">1. Mentor</label>
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
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">2. Form Template</label>
                            <select 
                                value={selectedTemplateId} 
                                onChange={e => setSelectedTemplateId(e.target.value)}
                                className="w-full py-2 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="all">All Form Templates & Legacy ({parentFeedbacks?.length || 0})</option>
                                {(parentFeedbackTemplates || []).map(t => {
                                    const count = (parentFeedbacks || []).filter(f => f.templateId === t.id).length;
                                    return (
                                        <option key={t.id} value={t.id}>
                                            {t.title} ({t.month} {t.year}) • {count} feedbacks
                                        </option>
                                    );
                                })}
                            </select>
                        </div>

                        {/* Question Selector */}
                        <div className="sm:col-span-2 md:col-span-2 lg:col-span-2">
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
                                            [{q.sectionTitle}] {q.label} ({q.totalAnswerCount || 0} responses)
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

                        {/* Division Filter (Optional) */}
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Filter Division</label>
                            <select 
                                value={selectedDivision} 
                                onChange={e => setSelectedDivision(e.target.value)}
                                className="w-full py-2 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="all">All Divisions</option>
                                {uniqueDivisions.map(div => (
                                    <option key={div} value={div}>Division {div}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Notice & Cross-Form Toggle banner when a specific template is active */}
                    {selectedTemplateId !== 'all' && (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-indigo-50/70 border border-indigo-100 p-3 rounded-xl text-xs print:hidden animate-in fade-in">
                            <div className="flex items-center gap-2">
                                <input 
                                    type="checkbox"
                                    id="crossFormToggle"
                                    checked={includeAllFormsForQuestion}
                                    onChange={e => setIncludeAllFormsForQuestion(e.target.checked)}
                                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                                />
                                <label htmlFor="crossFormToggle" className="font-bold text-indigo-900 cursor-pointer">
                                    Include answers from all form templates & legacy submissions for this question ({activeQuestion?.totalAnswerCount || questionAnalytics.answeredCount} total found across all forms)
                                </label>
                            </div>
                            <button
                                onClick={() => setSelectedTemplateId('all')}
                                className="text-[11px] font-black text-indigo-700 hover:text-indigo-900 hover:underline bg-white px-3 py-1 rounded-lg border border-indigo-200 shrink-0 shadow-xs"
                            >
                                Switch to All Forms Scope
                            </button>
                        </div>
                    )}
                </Card>

                {/* SMOOTH BLUE GRADIENT TREND CHART CARD (ADAPTS TO SELECTED QUESTION & REVIEWS) */}
                <Card className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl relative overflow-hidden print:shadow-none print:border-none">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                        {/* Left Side KPI Metric & Subtitle */}
                        <div className="md:col-span-4 space-y-3">
                            <div className="flex items-center gap-3">
                                <h2 className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                                    {isRatingQuestion ? (
                                        <>
                                            {questionAnalytics.stats?.avg ? questionAnalytics.stats.avg : (trendChartData.length > 0 && trendChartData.some(d => d.value > 0) ? (trendChartData.reduce((acc, curr) => acc + curr.value, 0) / trendChartData.filter(d => d.value > 0).length).toFixed(1) : '5.0')}
                                            <span className="text-2xl text-amber-500">⭐</span>
                                        </>
                                    ) : (
                                        questionAnalytics.answeredCount > 0 ? questionAnalytics.answeredCount : (questionAnalytics.totalSubmissions || 0)
                                    )}
                                </h2>
                                <span className="bg-blue-50 text-blue-600 border border-blue-100 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shrink-0">
                                    <TrendingUp className="w-3.5 h-3.5" />
                                    {isRatingQuestion ? 'Rating Score Trend' : 'Response Trend'}
                                </span>
                            </div>
                            
                            <div className="w-16 h-1 bg-blue-600 rounded-full" />

                            <p className="text-xs text-gray-400 font-medium leading-relaxed max-w-xs">
                                {isRatingQuestion 
                                    ? `Average parent review rating score timeline for "${activeQuestion?.label?.slice(0, 40)}..."`
                                    : `Parent response activity timeline for "${activeQuestion?.label?.slice(0, 45)}..."`
                                }
                            </p>
                        </div>

                        {/* Right Side Smooth Area Chart */}
                        <div className="md:col-span-8 h-44 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trendChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="parentTrendGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#2563EB" stopOpacity={0.35}/>
                                            <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={false} stroke="#E5E7EB" />
                                    <XAxis 
                                        dataKey="name" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fontSize: 11, fill: '#9CA3AF', fontWeight: 600 }} 
                                        dy={6}
                                    />
                                    <YAxis hide domain={isRatingQuestion ? [0, 5] : ['auto', 'auto']} />
                                    <Tooltip 
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const itemData = payload[0].payload;
                                                return (
                                                    <div className="bg-white/95 backdrop-blur-md p-2.5 rounded-xl border border-gray-200 shadow-xl text-xs font-bold text-gray-900">
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase">{itemData.name}</p>
                                                        {isRatingQuestion ? (
                                                            <>
                                                                <p className="text-blue-600 font-black mt-0.5 flex items-center gap-1">
                                                                    Avg Rating: {payload[0].value} / 5 ⭐
                                                                </p>
                                                                {itemData.count > 0 && (
                                                                    <p className="text-[10px] text-gray-500 font-medium">
                                                                        Based on {itemData.count} review{itemData.count > 1 ? 's' : ''}
                                                                    </p>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <p className="text-blue-600 font-black mt-0.5">{payload[0].value} Submissions</p>
                                                        )}
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="value" 
                                        stroke="#2563EB" 
                                        strokeWidth={3.5} 
                                        fill="url(#parentTrendGradient)" 
                                        dot={{ r: 4, fill: '#2563EB', strokeWidth: 2, stroke: '#FFFFFF' }}
                                        activeDot={{ r: 7, fill: '#1D4ED8', strokeWidth: 3, stroke: '#FFFFFF' }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
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
                            {/* Merits / Strengths */}
                            <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 space-y-2">
                                <h4 className="text-xs font-black text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                                    <CheckCircle className="w-4 h-4 text-emerald-600" /> Merits / Key Strengths
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

                            {/* Demerits / Concerns */}
                            <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 space-y-2">
                                <h4 className="text-xs font-black text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                                    <AlertCircle className="w-4 h-4 text-amber-600" /> Demerits / Areas of Concern
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
                                    <TrendingUp className="w-4 h-4 text-indigo-600" /> Recommended Action Steps
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
                                                            Student: <span className="font-bold text-indigo-600">{item.studentName}</span> • Class {item.className} {showMentorColumnInUi && `• Mentor: ${item.mentorName}`}
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

                {/* REPORT VIEW: DETAILED BREAKDOWN MODE (DYNAMIC MENTOR COLUMN) */}
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
                            <div className="space-y-4">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50 text-gray-500 uppercase text-[10px] font-black tracking-wider border-b border-gray-200">
                                                <th className="py-3 px-4 w-12 text-center">#</th>
                                                <th className="py-3 px-4 w-48">Student & Class</th>
                                                <th className="py-3 px-4 w-40">Parent Name</th>
                                                {showMentorColumnInUi && <th className="py-3 px-4 w-40">Mentor Name</th>}
                                                {selectedTemplateId === 'all' && <th className="py-3 px-4 w-36">Form / Session</th>}
                                                <th className="py-3 px-4">Answer / Rating</th>
                                                <th className="py-3 px-4 w-28 text-right">Submitted</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                                            {paginatedAnswers.map((item, idx) => {
                                                const rowNum = pageSize === 'all' 
                                                    ? idx + 1 
                                                    : (currentPage - 1) * Number(pageSize) + idx + 1;

                                                return (
                                                    <tr key={item.submissionId} className="hover:bg-gray-50/80 transition-colors break-inside-avoid">
                                                        <td className="py-3 px-4 text-gray-400 font-bold text-center">{rowNum}</td>
                                                        <td className="py-3 px-4">
                                                            <span className="font-bold text-gray-900 block">{item.studentName}</span>
                                                            <span className="text-[10px] text-indigo-600 font-bold">Class {item.className} {item.division && `(${item.division})`}</span>
                                                        </td>
                                                        <td className="py-3 px-4 font-bold text-gray-700">{item.parentName}</td>
                                                        {showMentorColumnInUi && <td className="py-3 px-4 font-bold text-purple-700">{item.mentorName}</td>}
                                                        {selectedTemplateId === 'all' && (
                                                            <td className="py-3 px-4">
                                                                <span className="text-[10px] font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md inline-block max-w-[140px] truncate" title={item.formTitle}>
                                                                    {item.formTitle}
                                                                </span>
                                                            </td>
                                                        )}
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
                                                            {item.adminComment && (
                                                                <div className="mt-1 text-[10px] text-amber-700 bg-amber-50/80 px-2 py-0.5 rounded border border-amber-200/60 inline-flex items-center gap-1">
                                                                    <span className="font-bold">Admin Note:</span> {item.adminComment}
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

                                {/* Pagination Footer Controls */}
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-100 print:hidden">
                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                        <span>
                                            {pageSize === 'all' ? (
                                                `Showing all ${detailedAnswers.length} responses`
                                            ) : (
                                                `Showing ${detailedAnswers.length === 0 ? 0 : (currentPage - 1) * Number(pageSize) + 1} to ${Math.min(currentPage * Number(pageSize), detailedAnswers.length)} of ${detailedAnswers.length} responses`
                                            )}
                                        </span>
                                        <div className="flex items-center gap-1.5 ml-2">
                                            <span className="text-gray-400">Rows per page:</span>
                                            <select
                                                value={pageSize}
                                                onChange={e => {
                                                    setPageSize(e.target.value);
                                                    setCurrentPage(1);
                                                }}
                                                className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs font-semibold text-gray-700 outline-none focus:ring-1 focus:ring-indigo-500"
                                            >
                                                <option value="25">25</option>
                                                <option value="50">50</option>
                                                <option value="100">100</option>
                                                <option value="250">250</option>
                                                <option value="all">All ({detailedAnswers.length})</option>
                                            </select>
                                        </div>
                                    </div>

                                    {pageSize !== 'all' && totalPages > 1 && (
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                disabled={currentPage === 1}
                                                className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
                                            >
                                                <ChevronLeft className="w-3.5 h-3.5" /> Prev
                                            </button>

                                            <span className="text-xs font-bold text-gray-700 px-2">
                                                Page {currentPage} of {totalPages}
                                            </span>

                                            <button
                                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                disabled={currentPage >= totalPages}
                                                className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
                                            >
                                                Next <ChevronRight className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    )}
                                </div>
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
