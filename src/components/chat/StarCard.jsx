import React from 'react';
import { Star, Trophy } from 'lucide-react';

export const StarCard = ({ data }) => {
    // data: { studentName, className, scores: { attendance, activities, prayer }, month, year }
    const { studentName, className, scores, month, year } = data;

    return (
        <div className="w-64 relative bg-gradient-to-br from-indigo-500 via-purple-600 to-indigo-700 rounded-2xl p-4 text-white text-center shadow-md overflow-hidden">
            {/* Decorative Background */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
                <Star className="absolute top-2 right-2 w-16 h-16 rotate-12" />
                <Star className="absolute bottom-2 left-2 w-10 h-10 -rotate-12" />
            </div>

            <div className="relative z-10 flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-white/20 p-1 mb-2 backdrop-blur-sm">
                    <div className="w-full h-full rounded-full bg-white text-indigo-600 flex items-center justify-center text-lg font-bold border-2 border-yellow-400">
                        {studentName.charAt(0)}
                    </div>
                </div>
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-400/90 text-yellow-900 text-[10px] font-bold mb-1 shadow-sm">
                    <Trophy className="w-3 h-3" /> STAR OF THE MONTH
                </div>
                <h2 className="text-lg font-bold truncate w-full">{studentName}</h2>
                <p className="text-indigo-100 text-xs mb-3">{className} • {month} {year}</p>

                <div className="grid grid-cols-3 gap-1 w-full">
                    <div className="bg-white/10 rounded-lg p-1.5 backdrop-blur-sm">
                        <div className="text-sm font-bold">{Math.round(scores.attendance)}%</div>
                        <div className="text-[8px] uppercase tracking-wider opacity-75">Attd.</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-1.5 backdrop-blur-sm">
                        <div className="text-sm font-bold">{Math.round(scores.activities)}%</div>
                        <div className="text-[8px] uppercase tracking-wider opacity-75">Act.</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-1.5 backdrop-blur-sm">
                        <div className="text-sm font-bold">{Math.round(scores.prayer)}%</div>
                        <div className="text-[8px] uppercase tracking-wider opacity-75">Pray</div>
                    </div>
                </div>
            </div>
        </div>
    );
};
