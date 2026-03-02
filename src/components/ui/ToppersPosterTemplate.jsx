import React, { forwardRef } from 'react';
import { clsx } from 'clsx';

/**
 * High-fidelity Toppers Poster Template.
 * This component is rendered off-screen and strictly dimensioned to 1080x1350 (Instagram Portrait).
 */
export const ToppersPosterTemplate = forwardRef(({ topStudents, className, academicYear }, ref) => {
    if (!topStudents || topStudents.length === 0) return null;

    // Fill up to 3 students if less are provided
    const displayStudents = [...topStudents];
    while (displayStudents.length < 3) {
        displayStudents.push(null);
    }

    return (
        <div
            id="toppers-poster-template"
            ref={ref}
            className="bg-white"
            style={{
                width: '1080px',
                height: '1350px',
                fontFamily: '"Inter", sans-serif',
                boxSizing: 'border-box',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            {/* Background Image Placeholder */}
            {/* INSTRUCTION: Replace this div with an <img> tag pointing to the real background asset */}
            <div className="absolute inset-0 z-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50">
                {/* Simulated background graphics for now */}
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-red-500 rounded-full blur-[150px] opacity-10 translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-500 rounded-full blur-[150px] opacity-10 -translate-x-1/2 translate-y-1/2" />
            </div>

            {/* Foreground Content */}
            <div className="relative z-10 h-full w-full flex flex-col p-16">

                {/* Header Section */}
                <div className="flex justify-between items-center mb-16">
                    <div className="font-medium text-gray-800 text-2xl tracking-wide">
                        Online <span className="font-bold">Global Madrasa</span>
                    </div>
                </div>

                {/* Title Section */}
                <div className="mt-12">
                    <h3 className="text-[3.5rem] font-[cursive] text-red-600 leading-tight mb-2 opacity-90" style={{ fontFamily: 'Dancing Script, cursive', transform: 'rotate(-2deg)' }}>
                        Hearty Congratulations
                    </h3>
                    <div className="flex items-center gap-6 mb-4">
                        <h1 className="text-7xl font-black text-gray-900 tracking-tight leading-none">
                            ANNUAL
                        </h1>
                        <div className="bg-purple-100 text-purple-800 text-3xl font-bold px-6 py-2 rounded-2xl">
                            {academicYear}
                        </div>
                    </div>
                    <h1 className="text-7xl font-black text-gray-900 tracking-tight leading-none mb-4">
                        EXAMINATION
                    </h1>
                    <h1 className="text-8xl font-black tracking-tight leading-none text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-600 mb-8 pb-4">
                        TOPPERS
                    </h1>
                </div>

                {/* Class Badge */}
                <div className="flex items-center mb-12">
                    <div className="border-[3px] border-purple-200 rounded-[2rem] px-8 py-3 bg-white/80 backdrop-blur-sm shadow-sm flex items-center gap-4">
                        <span className="text-4xl font-bold text-gray-800">Class {className}</span>
                        <div className="w-12 h-8 bg-yellow-400 clip-path-polygon" style={{ clipPath: 'polygon(0 0, 100% 50%, 0 100%)' }}></div>
                    </div>
                </div>

                {/* Students List */}
                <div className="flex flex-col gap-8 w-[85%] mt-auto mb-32">
                    {displayStudents.map((student, index) => {
                        const colors = [
                            { bg: 'bg-[#eefff3]/90', border: 'border-[#a7f3d0]', text: 'text-[#059669]' }, // 1st - Green
                            { bg: 'bg-[#f0f9ff]/90', border: 'border-[#bae6fd]', text: 'text-[#0284c7]' }, // 2nd - Blue
                            { bg: 'bg-[#faf5ff]/90', border: 'border-[#e9d5ff]', text: 'text-[#9333ea]' }  // 3rd - Purple
                        ];
                        const color = colors[index];

                        return (
                            <div
                                key={index}
                                className={clsx(
                                    "relative flex items-center justify-between p-8 rounded-[3rem] border-2 shadow-sm backdrop-blur-md",
                                    color.bg, color.border
                                )}
                            >
                                <div className="flex items-center gap-8 w-1/2">
                                    {/* Rank Badge */}
                                    <div className="relative flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-md border-2 border-slate-100 shrink-0">
                                        <span className={clsx("text-2xl font-black", color.text)}>{index + 1}</span>
                                        <span className="absolute -top-1 font-bold text-xs">st</span>
                                    </div>

                                    {/* Name */}
                                    <div className={clsx("text-[2.2rem] font-bold uppercase truncate", color.text)}>
                                        {student ? student.name : '---'}
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-12 w-1/2 pr-4">
                                    {/* Percentage */}
                                    <div className="text-[2.5rem] font-bold text-gray-900 w-32 text-right">
                                        {student ? `${student.pct.toFixed(1)}%` : '0%'}
                                    </div>

                                    {/* Marks */}
                                    <div className="text-[2.5rem] font-bold text-gray-900 w-48 text-right">
                                        {student ? `${student.obtained}/${student.max}` : '0/0'}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="absolute bottom-0 left-0 w-full p-12 flex justify-between items-end border-t border-gray-200/50 bg-white/50 backdrop-blur-sm">
                    {/* Placeholder for Samastha Logo */}
                    <img src="/samastha-logo.jpg" alt="Samastha Logo" className="h-16 object-contain" />

                    <div className="text-right">
                        <p className="text-gray-600 text-lg mb-1">www.samasthaelearning.com</p>
                        <p className="text-gray-900 text-3xl font-bold flex items-center justify-end gap-3">
                            <span className="bg-gray-800 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm">✓</span>
                            +91 8590 518 541
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
});

ToppersPosterTemplate.displayName = 'ToppersPosterTemplate';
