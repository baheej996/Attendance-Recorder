import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { ArrowLeft, Download, FileText, FileBarChart, CalendarDays, Clipboard, Users } from 'lucide-react';

const EvaluationResponses = ({ form, onClose }) => {
    const { evaluationSubmissions, mentors } = useData();
    const [selectedSubmission, setSelectedSubmission] = useState(null);
    const [isBulkView, setIsBulkView] = useState(false);

    const submissions = (evaluationSubmissions || []).filter(s => s.formId === form.id);

    const handleCopyText = (sub) => {
        const mentor = mentors.find(m => m.id === sub.mentorId);
        let text = `Monthly Evaluation Form - ${form.month} ${form.year}\n`;
        text += `Mentor: ${mentor?.name || 'Unknown'}\n`;
        text += `Submitted: ${new Date(sub.submittedAt).toLocaleString()}\n\n`;

        Object.entries(sub.answers || {}).forEach(([qId, answer]) => {
            // Find question label from schema
            let qLabel = qId;
            form.sections.forEach(sec => {
                const q = sec.questions.find(x => x.id === qId);
                if (q) qLabel = q.label;
            });
            text += `Q: ${qLabel}\nA: ${Array.isArray(answer) ? answer.join(', ') : (answer?.name || answer || 'No answer')}\n\n`;
        });

        navigator.clipboard.writeText(text);
        alert("Copied to clipboard!");
    };

    const handleCopyAllAsText = () => {
        let text = `Monthly Evaluation Summary - ${form.month} ${form.year}\n`;
        text += `Total Submissions: ${submissions.length}\n`;
        text += `==========================================\n\n`;

        submissions.forEach((sub, index) => {
            const mentor = mentors.find(m => m.id === sub.mentorId);
            text += `[${index + 1}] Mentor: ${mentor?.name || 'Unknown'}\n`;
            text += `Submitted: ${new Date(sub.submittedAt).toLocaleString()}\n`;
            text += `------------------------------------------\n`;

            form.sections.forEach(sec => {
                text += `\nSection: ${sec.title}\n`;
                sec.questions.forEach(q => {
                    const answer = sub.answers[q.id];
                    text += `Q: ${q.label}\nA: ${Array.isArray(answer) ? answer.join(', ') : (answer?.name || answer || 'No answer')}\n`;
                });
            });
            text += `\n==========================================\n\n`;
        });

        navigator.clipboard.writeText(text);
        alert("Full report copied to clipboard!");
    };

    const handlePrint = () => {
        window.print();
    };

    const ResponseDetail = ({ sub, isBulk = false }) => {
        const mentor = mentors.find(m => m.id === sub.mentorId);
        return (
            <Card className={`p-8 bg-white ${isBulk ? 'mb-8 border-2 border-indigo-100 shadow-lg' : 'print:p-0 print:shadow-none'}`}>
                <div className="flex justify-between items-start mb-8 pb-6 border-b border-gray-100">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">{form.title}</h1>
                        <p className="text-gray-500 font-medium">{form.month} {form.year}</p>
                        <div className="mt-4 inline-flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-100">
                            <div className="w-8 h-8 rounded-full bg-indigo-200 text-indigo-700 flex items-center justify-center font-bold">
                                {mentor?.name?.charAt(0) || '?'}
                            </div>
                            <div>
                                <div className="font-bold text-indigo-900 text-sm">
                                    {mentor?.name || 'Unknown Mentor'}
                                </div>
                                <div className="text-xs text-indigo-600 font-medium">Submitted on {new Date(sub.submittedAt).toLocaleString()}</div>
                            </div>
                        </div>
                    </div>
                    {!isBulk && (
                        <div className="flex items-center gap-2 print:hidden">
                            <Button variant="secondary" onClick={() => handleCopyText(sub)} className="gap-2">
                                <Clipboard className="w-4 h-4" /> Copy Text
                            </Button>
                            <Button variant="primary" onClick={handlePrint} className="gap-2">
                                <Download className="w-4 h-4" /> Save PDF
                            </Button>
                        </div>
                    )}
                </div>

                <div className="space-y-10">
                    {form.sections.map((sec, idx) => (
                        <div key={sec.id} className="break-inside-avoid">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 border-b-2 border-gray-100 pb-2">
                                <span className="bg-gray-100 text-gray-600 w-6 h-6 rounded flex items-center justify-center text-xs">{(idx + 1).toString().padStart(2, '0')}</span>
                                {sec.title}
                            </h3>
                            <div className="space-y-6">
                                {sec.questions.map(q => {
                                    const answer = sub.answers[q.id];
                                    return (
                                        <div key={q.id} className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                                            <div className="font-semibold text-gray-700 mb-2">{q.label}</div>
                                            <div className="text-gray-900 font-medium">
                                                {!answer ? (
                                                    <span className="text-gray-400 italic">No answer provided</span>
                                                ) : q.type === 'file' ? (
                                                    <a href={answer.url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline flex items-center gap-1">
                                                        <FileText className="w-4 h-4" /> {answer.name || 'View Attachment'}
                                                    </a>
                                                ) : q.type === 'checkbox' && Array.isArray(answer) ? (
                                                    <ul className="list-disc pl-5">
                                                        {answer.map((a, i) => <li key={i}>{a}</li>)}
                                                    </ul>
                                                ) : q.type === 'rating' ? (
                                                    <div className="inline-flex items-center gap-2 bg-white px-3 py-1 rounded-md border border-gray-200">
                                                        <span className="text-indigo-600 font-bold">{answer}</span> 
                                                        <span className="text-gray-400 text-xs">/ {q.max}</span>
                                                    </div>
                                                ) : (
                                                    <div className="whitespace-pre-wrap">{answer}</div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">{form.title} - Responses</h2>
                        <p className="text-sm text-gray-500">{form.month} {form.year} • {submissions.length} Total Submissions</p>
                    </div>
                </div>
                
                {submissions.length > 0 && (
                    <div className="flex items-center gap-2 shrink-0">
                        <Button variant="secondary" onClick={handleCopyAllAsText} className="gap-2 text-xs md:text-sm">
                            <Clipboard className="w-4 h-4" /> Copy All (Text)
                        </Button>
                        <Button 
                            variant="primary" 
                            onClick={() => {
                                setIsBulkView(true);
                                setSelectedSubmission(null);
                                setTimeout(() => window.print(), 100);
                            }} 
                            className="gap-2 text-xs md:text-sm"
                        >
                            <Download className="w-4 h-4" /> Download All (PDF)
                        </Button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Responses List */}
                <div className="lg:col-span-1 space-y-3 print:hidden">
                    <div className="flex items-center justify-between p-2 mb-1">
                        <h3 className="font-bold text-gray-500 uppercase text-[10px] tracking-widest">Mentor Submissions</h3>
                        <button 
                            onClick={() => { setIsBulkView(prev => !prev); setSelectedSubmission(null); }}
                            className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded transition-colors ${isBulkView ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400 hover:text-indigo-600'}`}
                        >
                            {isBulkView ? 'Hide Bulk View' : 'Show All at Once'}
                        </button>
                    </div>
                    {submissions.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm border-2 border-dashed rounded-lg">
                            No responses yet.
                        </div>
                    ) : (
                        submissions.map(sub => {
                            const mentor = mentors.find(m => m.id === sub.mentorId);
                            const isSelected = selectedSubmission?.id === sub.id;
                            return (
                                <div 
                                    key={sub.id} 
                                    onClick={() => { setSelectedSubmission(sub); setIsBulkView(false); }}
                                    className={`p-3 rounded-xl cursor-pointer transition-all border ${isSelected ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-gray-100 hover:border-indigo-100 hover:bg-gray-50'}`}
                                >
                                    <div className="font-bold text-gray-900 text-sm">{mentor?.name || 'Unknown Mentor'}</div>
                                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                        <CalendarDays className="w-3 h-3" />
                                        {new Date(sub.submittedAt).toLocaleDateString()}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Detail View */}
                <div className="lg:col-span-3">
                    {isBulkView ? (
                        <div className="space-y-8">
                            {submissions.map(sub => (
                                <ResponseDetail key={sub.id} sub={sub} isBulk={true} />
                            ))}
                        </div>
                    ) : selectedSubmission ? (
                        <ResponseDetail sub={selectedSubmission} />
                    ) : (
                        <div className="h-full min-h-[400px] flex items-center justify-center border-2 border-dashed rounded-xl bg-gray-50/50">
                            <div className="text-center text-gray-400">
                                <FileBarChart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p>Select a mentor's submission to view details.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Print specific styles */}
            <style jsx>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    div.lg\\:col-span-3, div.lg\\:col-span-3 * {
                        visibility: visible;
                    }
                    div.lg\\:col-span-3 {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                    .print\\:hidden {
                        display: none !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default EvaluationResponses;
