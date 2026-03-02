import React, { forwardRef } from 'react';
import { clsx } from 'clsx';

/**
 * High-fidelity Toppers Poster Template.
 * Uses the pre-baked background image and precisely overlays the dynamic text.
 */
export const ToppersPosterTemplate = forwardRef(({ topStudents, className, academicYear }, ref) => {
    if (!topStudents || topStudents.length === 0) return null;

    // Fill up to 3 students if less are provided
    const displayStudents = [...topStudents];
    while (displayStudents.length < 3) {
        displayStudents.push(null);
    }

    // Absolute pixel positions based on 1080x1350 coordinate system
    return (
        <div
            id="toppers-poster-template"
            ref={ref}
            className="bg-white"
            style={{
                width: '1080px',
                height: '1350px',
                fontFamily: '"Arial", sans-serif',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            {/* Baked Background Image */}
            <img
                src="/toppers-bg.jpg"
                alt="Background"
                style={{ position: 'absolute', top: 0, left: 0, width: '1080px', height: '1350px', zIndex: 0 }}
                crossOrigin="anonymous"
            />

            {/* Dynamic Overlays */}
            <div style={{ position: 'relative', zIndex: 10, width: '100%', height: '100%' }}>

                {/* Academic Year */}
                <div
                    style={{
                        position: 'absolute',
                        top: '382px',
                        left: '460px',
                        fontSize: '22px',
                        fontWeight: 'bold',
                        color: '#6b21a8',
                        letterSpacing: '1px'
                    }}
                >
                    {academicYear}
                </div>

                {/* Class Name */}
                <div
                    style={{
                        position: 'absolute',
                        top: '600px',
                        left: '180px',
                        fontSize: '36px',
                        fontWeight: 'bold',
                        color: '#1f2937'
                    }}
                >
                    Class {className}
                </div>

                {/* --- Student 1 (Green Ribbon) --- */}
                {/* Name */}
                <div style={{ position: 'absolute', top: '745px', left: '260px', fontSize: '30px', fontWeight: 'bold', color: '#059669', width: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textTransform: 'uppercase' }}>
                    {displayStudents[0] ? displayStudents[0].name : ''}
                </div>
                {/* Percentage */}
                <div style={{ position: 'absolute', top: '745px', left: '600px', fontSize: '32px', fontWeight: 'bold', color: '#111827' }}>
                    {displayStudents[0] ? `${displayStudents[0].pct.toFixed(1)}%` : ''}
                </div>
                {/* Marks */}
                <div style={{ position: 'absolute', top: '745px', left: '750px', fontSize: '32px', fontWeight: '500', color: '#111827' }}>
                    {displayStudents[0] ? `${displayStudents[0].obtained}/${displayStudents[0].max}` : ''}
                </div>


                {/* --- Student 2 (Blue Ribbon) --- */}
                {/* Name */}
                <div style={{ position: 'absolute', top: '895px', left: '260px', fontSize: '30px', fontWeight: 'bold', color: '#0284c7', width: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textTransform: 'uppercase' }}>
                    {displayStudents[1] ? displayStudents[1].name : ''}
                </div>
                {/* Percentage */}
                <div style={{ position: 'absolute', top: '895px', left: '600px', fontSize: '32px', fontWeight: 'bold', color: '#111827' }}>
                    {displayStudents[1] ? `${displayStudents[1].pct.toFixed(1)}%` : ''}
                </div>
                {/* Marks */}
                <div style={{ position: 'absolute', top: '895px', left: '750px', fontSize: '32px', fontWeight: '500', color: '#111827' }}>
                    {displayStudents[1] ? `${displayStudents[1].obtained}/${displayStudents[1].max}` : ''}
                </div>


                {/* --- Student 3 (Purple Ribbon) --- */}
                {/* Name */}
                <div style={{ position: 'absolute', top: '1045px', left: '260px', fontSize: '30px', fontWeight: 'bold', color: '#7e22ce', width: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textTransform: 'uppercase' }}>
                    {displayStudents[2] ? displayStudents[2].name : ''}
                </div>
                {/* Percentage */}
                <div style={{ position: 'absolute', top: '1045px', left: '600px', fontSize: '32px', fontWeight: 'bold', color: '#111827' }}>
                    {displayStudents[2] ? `${displayStudents[2].pct.toFixed(1)}%` : ''}
                </div>
                {/* Marks */}
                <div style={{ position: 'absolute', top: '1045px', left: '750px', fontSize: '32px', fontWeight: '500', color: '#111827' }}>
                    {displayStudents[2] ? `${displayStudents[2].obtained}/${displayStudents[2].max}` : ''}
                </div>

            </div>
        </div>
    );
});

ToppersPosterTemplate.displayName = 'ToppersPosterTemplate';
