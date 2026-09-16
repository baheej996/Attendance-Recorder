import React from 'react';
import { ShieldAlert, CheckCircle } from 'lucide-react';
import { Button } from '../ui/Button';

export const FeeNoticePopupModal = ({ notice, student, onClose }) => {
    if (!notice) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl border border-rose-100 shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-rose-600 via-red-600 to-indigo-700 p-6 text-white relative">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shrink-0">
                            <ShieldAlert className="w-8 h-8 text-amber-300" />
                        </div>
                        <div>
                            <span className="text-[11px] font-black uppercase tracking-wider bg-rose-900/60 text-rose-200 px-2.5 py-0.5 rounded-full border border-rose-500/30">
                                Official Notice
                            </span>
                            <h3 className="text-xl font-black mt-1 text-white">
                                {notice.title || '⚠️ Fee Payment Due Notice'}
                            </h3>
                            <p className="text-xs text-rose-100 font-medium mt-0.5">
                                Samastha E-Learning • Office Accounts Portal
                            </p>
                        </div>
                    </div>
                </div>

                {/* Body Content */}
                <div className="p-6 space-y-5">
                    {/* Notice Message */}
                    <div className="p-4 bg-rose-50/80 border border-rose-200/80 rounded-2xl text-xs font-semibold text-gray-800 leading-relaxed space-y-2">
                        <p className="text-sm font-extrabold text-rose-900">
                            Attention: {student?.name || 'Student'}
                        </p>
                        <p className="text-gray-700 leading-relaxed">
                            {notice.body}
                        </p>
                    </div>

                    {/* Financial Summary Card */}
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-3">
                        <div className="flex justify-between items-center text-xs border-b border-gray-200/70 pb-2">
                            <span className="font-extrabold text-gray-700 uppercase">Student Name:</span>
                            <span className="font-bold text-gray-900">{student?.name || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs border-b border-gray-200/70 pb-2">
                            <span className="font-extrabold text-gray-700 uppercase">Register No:</span>
                            <span className="font-mono font-bold text-indigo-600">{student?.registerNo || 'N/A'}</span>
                        </div>
                        {notice.remainingDues > 0 && (
                            <div className="flex justify-between items-center text-xs pt-1">
                                <span className="font-extrabold text-rose-700 uppercase">Pending Dues Amount:</span>
                                <span className="text-lg font-black text-rose-600 font-mono">
                                    ₹{Number(notice.remainingDues).toLocaleString()}
                                </span>
                            </div>
                        )}
                    </div>

                    <p className="text-[11px] text-gray-500 italic text-center">
                        Please arrange payment at the Office or contact your mentor for assistance.
                    </p>

                    {/* Action Button */}
                    <Button
                        type="button"
                        onClick={onClose}
                        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm rounded-xl shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                        <CheckCircle className="w-4 h-4" />
                        I Acknowledge & Close Notice
                    </Button>
                </div>
            </div>
        </div>
    );
};
