import React, { forwardRef } from 'react';

/**
 * High-fidelity Toppers Poster Template.
 * Maps every student with Rank 1-3 to an individual styled row box with badges.
 */
export const ToppersPosterTemplate = forwardRef(({ topStudents, className }, ref) => {
    if (!topStudents || topStudents.length === 0) return null;

    // Absolute pixel positions based on 1080x1350 coordinate system
    return (
        <div
            id="toppers-poster-template"
            ref={ref}
            className="bg-white"
            style={{
                width: '1080px',
                height: '1350px',
                fontFamily: '"Urbanist", "Arial", sans-serif',
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

                {/* Class Name */}
                <div
                    style={{
                        position: 'absolute',
                        top: '595px',
                        left: '130px', /* Shifted left to avoid yellow badge overlap */
                        fontSize: '36px',
                        fontWeight: '800',
                        color: '#1f2937',
                        letterSpacing: '0.5px'
                    }}
                >
                    Class {className}
                </div>

                {/* --- Student Rows Stack --- */}
                <div style={{
                    position: 'absolute',
                    top: '710px', /* Shifted slightly up */
                    left: '60px', /* Shifted left to match bounded width */
                    width: '840px', /* Reduced width to avoid pencil overlap */
                    display: 'flex',
                    flexDirection: 'column',
                    gap: topStudents.length > 5 ? '8px' : '15px', /* Tighter gap to avoid bottom footer */
                }}>
                    {topStudents.map((perf, idx) => {
                        const rank = perf.rank;
                        if (rank > 3) return null;

                        const styles = {
                            1: { bg: '#eefcf4', border: '#a3deb8', color: '#10b981', badge: '3' }, // 1st uses badge-3.png per user
                            2: { bg: '#eff6ff', border: '#bfdbfe', color: '#3b82f6', badge: '1' }, // 2nd uses badge-1.png per user
                            3: { bg: '#faf5ff', border: '#e9d5ff', color: '#a855f7', badge: '2' }  // 3rd uses badge-2.png per user
                        };
                        const s = styles[rank];

                        return (
                            <div
                                key={`student-${idx}`}
                                style={{
                                    backgroundColor: s.bg,
                                    border: `2px solid ${s.border}`,
                                    borderRadius: '35px', // Reduced roundness
                                    padding: '12px 25px', // Tighter padding
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    height: topStudents.length > 4 ? '85px' : '100px' // scale down if many ties
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1 }}>
                                    {/* Badge Image */}
                                    <img
                                        src={`/badge-${s.badge}.png`}
                                        alt={`Rank ${rank}`}
                                        style={{ width: '48px', height: '48px', objectFit: 'contain' }}
                                        crossOrigin="anonymous"
                                    />
                                    {/* Student Name */}
                                    <div
                                        style={{
                                            fontSize: '30px',
                                            fontWeight: '700', // Reduced boldness
                                            color: s.color,
                                            textTransform: 'uppercase',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            maxWidth: '360px'
                                        }}
                                    >
                                        {perf.student.name}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '25px', justifyContent: 'flex-end', minWidth: '220px' }}>
                                    {/* Percentage */}
                                    <div style={{ fontSize: '30px', fontWeight: '700', color: '#111827', width: '110px', textAlign: 'right' }}>
                                        {perf.pct.toFixed(1)}%
                                    </div>

                                    {/* Marks */}
                                    <div style={{ fontSize: '30px', color: '#111827', width: '130px', textAlign: 'right' }}>
                                        <span style={{ fontWeight: '700' }}>{perf.obtained}/</span>
                                        <span style={{ fontWeight: '400', color: '#4b5563' }}>{perf.max}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

            </div>
        </div>
    );
});

ToppersPosterTemplate.displayName = 'ToppersPosterTemplate';
