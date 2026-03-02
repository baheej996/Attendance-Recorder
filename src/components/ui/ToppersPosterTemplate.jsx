import React, { forwardRef, useMemo } from 'react';
import { clsx } from 'clsx';

/**
 * High-fidelity Toppers Poster Template.
 * Maps students dynamically by Rank to support ties spanning multiple rows.
 */
export const ToppersPosterTemplate = forwardRef(({ topStudents, className, academicYear }, ref) => {
    if (!topStudents || topStudents.length === 0) return null;

    // Group students by rank (1, 2, 3)
    const groupedStudents = useMemo(() => {
        const ranks = { 1: [], 2: [], 3: [] };
        topStudents.forEach((perf) => {
            if (perf.rank === 1) ranks[1].push(perf);
            if (perf.rank === 2) ranks[2].push(perf);
            if (perf.rank === 3) ranks[3].push(perf);
        });
        return ranks;
    }, [topStudents]);

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

                {/* --- Student Array Map (Handles Ties) --- */}
                {/* 
                    Row 1 Base Y = 745
                    Row 2 Base Y = 895  (Diff: 150)
                    Row 3 Base Y = 1045 (Diff: 150)
                */}

                {[1, 2, 3].map((rank, idx) => {
                    const rowStudents = groupedStudents[rank];
                    if (!rowStudents || rowStudents.length === 0) return null;

                    const baseY = 745 + (idx * 150);
                    const namesString = rowStudents.map(s => s.student.name).join(' & ');

                    // All students in this rank share the same pct/marks since they tied
                    const pct = rowStudents[0].pct.toFixed(1);
                    const marks = `${rowStudents[0].obtained}/${rowStudents[0].max}`;

                    const styles = {
                        1: { color: '#059669' },
                        2: { color: '#0284c7' },
                        3: { color: '#7e22ce' }
                    };

                    return (
                        <React.Fragment key={`rank-${rank}`}>
                            {/* Names (Comma separated if tied) */}
                            <div
                                style={{
                                    position: 'absolute',
                                    top: `${baseY}px`,
                                    left: '260px',
                                    fontSize: rowStudents.length > 2 ? '22px' : rowStudents.length === 2 ? '26px' : '30px',
                                    fontWeight: 'bold',
                                    color: styles[rank].color,
                                    width: '320px',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    textTransform: 'uppercase',
                                    display: 'flex',
                                    alignItems: 'center',
                                    height: '40px'
                                }}
                            >
                                {namesString}
                            </div>

                            {/* Percentage */}
                            <div
                                style={{
                                    position: 'absolute',
                                    top: `${baseY}px`,
                                    left: '600px',
                                    fontSize: '32px',
                                    fontWeight: 'bold',
                                    color: '#111827',
                                    display: 'flex',
                                    alignItems: 'center',
                                    height: '40px'
                                }}
                            >
                                {pct}%
                            </div>

                            {/* Marks */}
                            <div
                                style={{
                                    position: 'absolute',
                                    top: `${baseY}px`,
                                    left: '750px',
                                    fontSize: '32px',
                                    fontWeight: '500',
                                    color: '#111827',
                                    display: 'flex',
                                    alignItems: 'center',
                                    height: '40px'
                                }}
                            >
                                {marks}
                            </div>
                        </React.Fragment>
                    );
                })}

            </div>
        </div>
    );
});

ToppersPosterTemplate.displayName = 'ToppersPosterTemplate';
