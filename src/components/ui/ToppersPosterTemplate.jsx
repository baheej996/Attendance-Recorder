import React, { forwardRef } from 'react';

/**
 * High-fidelity Toppers Poster Template.
 * Maps every student with Rank 1-3 to an individual styled row box with badges.
 */
export const ToppersPosterTemplate = forwardRef(({ topStudents, className }, ref) => {
    // The base64 conversion hook is removed, so these are now direct paths.
    // The instruction implies these variables should be simplified or removed if not used.
    // For the background, we'll use the literal directly in the src.
    // For badges, we'll construct the path directly in the src.

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
                        top: '546px', /* Shifted further up */
                        left: '120px',
                        width: '300px',
                        height: '70px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '34px',
                        fontWeight: '600',
                        color: '#1f2937',
                        letterSpacing: '0.5px'
                    }}
                >
                    Class {className}
                </div>

                {/* --- Student Rows Stack --- */}
                <div style={{
                    position: 'absolute',
                    top: '660px',
                    left: '120px',
                    width: '840px',
                    height: '480px', // Fill vertical space before footer
                    display: 'flex',
                    flexDirection: 'column',
                    gap: topStudents.length > 6 ? '6px' : topStudents.length > 4 ? '10px' : '15px',
                }}>
                    {topStudents.map((perf, idx) => {
                        const rank = perf.rank;
                        if (rank > 3) return null;

                        // Dynamic scaling variables to prevent overflow on large ties
                        const isCrowded = topStudents.length > 4;
                        const isVeryCrowded = topStudents.length > 6;
                        const padding = isVeryCrowded ? '6px 16px' : isCrowded ? '10px 20px' : '12px 25px';
                        const badgeSize = isVeryCrowded ? '32px' : isCrowded ? '40px' : '48px';
                        const fontSize = isVeryCrowded ? '22px' : isCrowded ? '26px' : '30px';
                        const nameMaxWidth = isVeryCrowded ? '420px' : isCrowded ? '390px' : '360px';

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
                                    padding: padding, // Dynamically scales
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    flex: 1, // Let flex handle the height to fill the 480px container
                                    maxHeight: '140px' // Cap height if there are only 1 or 2 students
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1 }}>
                                    {/* Badge Image */}
                                    <img
                                        src={`/badge-${s.badge}.png`}
                                        alt={`Rank ${rank}`}
                                        style={{ width: badgeSize, height: badgeSize, objectFit: 'contain' }}
                                        crossOrigin="anonymous"
                                    />
                                    {/* Student Name */}
                                    <div
                                        style={{
                                            fontSize: fontSize,
                                            fontWeight: '700', // Reduced boldness
                                            color: s.color,
                                            textTransform: 'uppercase',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            maxWidth: nameMaxWidth
                                        }}
                                    >
                                        {perf.student.name}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '25px', justifyContent: 'flex-end', minWidth: '220px' }}>
                                    {/* Percentage */}
                                    <div style={{ fontSize: fontSize, fontWeight: '700', color: '#111827', width: '110px', textAlign: 'right' }}>
                                        {perf.pct.toFixed(1)}%
                                    </div>

                                    {/* Marks */}
                                    <div style={{ fontSize: fontSize, color: '#111827', width: '130px', textAlign: 'right' }}>
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
