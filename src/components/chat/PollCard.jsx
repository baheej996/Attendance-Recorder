import React from 'react';
import { CheckSquare, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

export const PollCard = ({ data, isSender }) => {
    let content;
    try {
        content = typeof data === 'string' ? JSON.parse(data) : data;
    } catch (e) {
        return <div className="text-red-500 text-xs">Error parsing reminder</div>;
    }

    return (
        <div className={clsx(
            "rounded-xl overflow-hidden shadow-sm border min-w-[250px]",
            isSender ? "bg-indigo-50 border-indigo-100" : "bg-white border-gray-200"
        )}>
            <div className={clsx(
                "px-4 py-3 flex items-center gap-2 border-b",
                isSender ? "bg-indigo-100/50 border-indigo-100" : "bg-gray-50 border-gray-100"
            )}>
                <AlertCircle className={clsx("w-4 h-4", isSender ? "text-indigo-600" : "text-amber-500")} />
                <span className={clsx("font-bold text-sm", isSender ? "text-indigo-900" : "text-gray-800")}>
                    {content.title || "Pending Tasks"}
                </span>
            </div>
            <div className="p-2 space-y-1">
                {(content.items || []).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2 rounded-lg bg-white/50 border border-transparent hover:border-gray-100 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
                            {idx + 1}
                        </div>
                        <span className="text-sm text-gray-700 font-medium">{item}</span>
                    </div>
                ))}
            </div>
            <div className={clsx(
                "px-4 py-2 text-xs text-center border-t",
                isSender ? "text-indigo-400 border-indigo-100" : "text-gray-400 border-gray-100"
            )}>
                {content.items?.length || 0} items pending
            </div>
        </div>
    );
};
