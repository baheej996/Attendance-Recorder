import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Card = ({ children, className, ...props }) => {
    return (
        <div
            className={twMerge(clsx("bg-white rounded-xl shadow-sm border border-gray-100 p-6", className))}
            {...props}
        >
            {children}
        </div>
    );
};

export const CardHeader = ({ title, description }) => (
    <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {description && <p className="text-gray-500 text-sm mt-1">{description}</p>}
    </div>
);
