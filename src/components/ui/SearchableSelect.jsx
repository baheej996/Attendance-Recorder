import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X, Plus } from 'lucide-react';
import { clsx } from 'clsx';

/**
 * SearchableSelect Component
 * 
 * @param {string} label - Label for the input
 * @param {Array} options - List of { id, label } objects
 * @param {string} value - Currently selected ID
 * @param {function} onChange - Callback when selection changes
 * @param {string} placeholder - Placeholder text
 * @param {string} error - Error message
 * @param {boolean} disabled - Whether the component is disabled
 * @param {string} className - Additional container styles
 */
export const SearchableSelect = ({ 
    label, 
    options = [], 
    value, 
    onChange, 
    placeholder = "Select an option...", 
    error,
    disabled = false,
    isMulti = false,
    className,
    compact = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const containerRef = useRef(null);

    // Find the current selected option(s)
    const selectedOptions = useMemo(() => {
        if (isMulti) {
            const values = Array.isArray(value) ? value : [];
            return options.filter(opt => values.map(String).includes(String(opt.id)));
        }
        return options.find(opt => String(opt.id) === String(value));
    }, [options, value, isMulti]);

    // Handle clicks outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filtered options based on search term
    const filteredOptions = useMemo(() => {
        let availableOptions = options;
        if (isMulti && Array.isArray(value)) {
            availableOptions = options.filter(opt => !value.map(String).includes(String(opt.id)));
        }
        
        if (!searchTerm) return availableOptions;
        const term = searchTerm.toLowerCase();
        return availableOptions.filter(opt => 
            opt.label.toLowerCase().includes(term)
        );
    }, [options, searchTerm, isMulti, value]);

    const handleSelect = (id) => {
        if (isMulti) {
            const currentValues = Array.isArray(value) ? value : [];
            if (!currentValues.map(String).includes(String(id))) {
                onChange([...currentValues, id]);
            }
            setSearchTerm("");
        } else {
            onChange(id);
            setIsOpen(false);
            setSearchTerm("");
        }
    };

    const handleRemove = (id) => {
        if (isMulti) {
            const currentValues = Array.isArray(value) ? value : [];
            onChange(currentValues.filter(val => String(val) !== String(id)));
        } else {
            onChange("");
        }
    };

    const handleToggle = () => {
        if (disabled) return;
        setIsOpen(!isOpen);
        if (!isOpen) {
            setSearchTerm("");
        }
    };

    return (
        <div className={clsx("w-full relative", className)} ref={containerRef}>
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                </label>
            )}
            
            <div 
                className={clsx(
                    "relative flex items-center justify-between w-full rounded-lg border transition-all cursor-pointer bg-white",
                    compact ? "px-2 py-1 min-h-[32px]" : "px-3 py-1.5 min-h-[42px]",
                    isOpen ? "ring-2 ring-indigo-500 border-indigo-500" : "border-gray-300 hover:border-indigo-300 shadow-sm",
                    error ? "border-red-500 ring-red-200" : "",
                    disabled ? "bg-gray-50 cursor-not-allowed opacity-60" : ""
                )}
                onClick={handleToggle}
            >
                <div className="flex flex-wrap items-center flex-1 min-w-0 overflow-hidden">
                    {/* Selected Options (Multi Mode) */}
                    {isMulti && Array.isArray(selectedOptions) && selectedOptions.map(opt => (
                        <div 
                            key={opt.id}
                            className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md text-[10px] font-semibold m-0.5 border border-indigo-100 group/tag"
                        >
                            <span className="truncate max-w-[80px]">{opt.label}</span>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemove(opt.id);
                                }}
                                className="hover:text-red-500 transition-colors"
                            >
                                <X className="w-2.5 h-2.5" />
                            </button>
                        </div>
                    ))}

                    {/* Input/Display Area */}
                    <div className="flex-1 min-w-0">
                        {isOpen ? (
                            <input
                                autoFocus
                                className="w-full bg-transparent border-none outline-none text-sm p-0 placeholder:text-gray-400"
                                placeholder={isMulti ? "Search..." : "Find..."}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                            />
                        ) : (
                            !isMulti && (
                                <span className={clsx(
                                    "text-sm block truncate", 
                                    !selectedOptions && "text-gray-400 italic"
                                )}>
                                    {selectedOptions ? selectedOptions.label : placeholder}
                                </span>
                            )
                        )}

                        {isMulti && !isOpen && selectedOptions.length === 0 && (
                            <span className="text-xs text-gray-400 italic">{placeholder}</span>
                        )}
                    </div>
                </div>

                {/* Icons Area */}
                <div className="flex items-center flex-shrink-0 ml-1">
                    {!disabled && (value || searchTerm) && (
                        <button 
                            type="button"
                            className="p-0.5 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (searchTerm) setSearchTerm("");
                                else onChange("");
                            }}
                        >
                            <X className="w-3.5 h-3.5 hover:text-red-500" />
                        </button>
                    )}
                    <div className="ml-1 text-gray-400">
                        <ChevronDown className={clsx("transition-transform duration-200", compact ? "w-3.5 h-3.5" : "w-4 h-4", isOpen && "rotate-180")} />
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}

            {/* Dropdown Menu */}
            {isOpen && !disabled && (
                <div 
                    className="absolute z-[100] mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto overflow-x-hidden p-1"
                >
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((opt) => (
                            <div
                                key={opt.id}
                                className={clsx(
                                    "px-3 py-2 text-sm cursor-pointer rounded-lg transition-colors flex items-center justify-between mb-0.5 last:mb-0",
                                    !isMulti && String(opt.id) === String(value) ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-700 hover:bg-indigo-50 hover:text-indigo-600"
                                )}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelect(opt.id);
                                }}
                            >
                                <span className="truncate">{opt.label}</span>
                                {!isMulti && String(opt.id) === String(value) && <Check className="w-3.5 h-3.5" />}
                                {isMulti && <Plus className="w-3.5 h-3.5 text-indigo-500" />}
                            </div>
                        ))
                    ) : (
                        <div className="px-3 py-4 text-center text-gray-400 italic text-xs">
                            No options found
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
