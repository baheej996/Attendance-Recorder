import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Bug, ChevronDown, ChevronUp, Copy, Trash2, X } from 'lucide-react';

const MAX_ENTRIES = 100;
const STORAGE_KEY = 'debugPanelEnabled';

const formatTime = (d) => {
    try {
        return d.toLocaleTimeString(undefined, { hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3, '0');
    } catch {
        return d.toISOString();
    }
};

const stringify = (val) => {
    if (val instanceof Error) {
        return `${val.name}: ${val.message}\n${val.stack || ''}`;
    }
    if (typeof val === 'object' && val !== null) {
        try {
            return JSON.stringify(val, Object.getOwnPropertyNames(val), 2);
        } catch {
            return String(val);
        }
    }
    return String(val);
};

const severityStyles = {
    error: 'bg-red-50 border-red-200 text-red-900',
    warn: 'bg-amber-50 border-amber-200 text-amber-900',
    unhandled: 'bg-rose-50 border-rose-200 text-rose-900'
};

const severityDot = {
    error: 'bg-red-500',
    warn: 'bg-amber-500',
    unhandled: 'bg-rose-500'
};

export default function DebugPanel() {
    // Enabled by default; persist toggle. Also flip on via ?debug=1.
    const [enabled, setEnabled] = useState(() => {
        try {
            const q = new URLSearchParams(window.location.search);
            if (q.get('debug') === '0') return false;
            if (q.get('debug') === '1') return true;
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored === null ? true : stored === '1';
        } catch {
            return true;
        }
    });

    const [entries, setEntries] = useState([]);
    const [open, setOpen] = useState(false);
    const interceptedRef = useRef(false);

    // Persist toggle
    useEffect(() => {
        try { localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0'); } catch { /* ignore */ }
    }, [enabled]);

    // Keyboard shortcut: Ctrl/Cmd + Shift + D to toggle the panel visibility
    useEffect(() => {
        const onKey = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
                e.preventDefault();
                setEnabled(v => !v);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    // Wire global capture once
    useEffect(() => {
        if (interceptedRef.current) return;
        interceptedRef.current = true;

        const push = (severity, args, extra = {}) => {
            const message = args.map(stringify).join(' ');
            // Filter out our own re-logs to avoid recursion
            if (message.includes('[DebugPanel]')) return;
            setEntries(prev => {
                const next = [
                    { id: Date.now() + Math.random(), severity, message, time: new Date(), ...extra },
                    ...prev
                ];
                return next.slice(0, MAX_ENTRIES);
            });
        };

        const origError = console.error;
        const origWarn = console.warn;

        console.error = function (...args) {
            try { push('error', args); } catch { /* ignore */ }
            return origError.apply(this, args);
        };
        console.warn = function (...args) {
            try { push('warn', args); } catch { /* ignore */ }
            return origWarn.apply(this, args);
        };

        const onError = (event) => {
            const err = event?.error || event?.message || 'Unknown error';
            push('unhandled', [err], { source: `${event?.filename || ''}:${event?.lineno || ''}:${event?.colno || ''}` });
        };
        const onRejection = (event) => {
            const reason = event?.reason ?? 'Unhandled rejection';
            push('unhandled', [reason], { source: 'unhandledrejection' });
        };

        window.addEventListener('error', onError);
        window.addEventListener('unhandledrejection', onRejection);

        // No teardown — interception lives for the page lifetime.
    }, []);

    const visibleCount = entries.length;
    const errCount = entries.filter(e => e.severity === 'error' || e.severity === 'unhandled').length;

    const clear = () => setEntries([]);

    const copyAll = async () => {
        try {
            const text = entries.map(e => {
                const head = `[${formatTime(e.time)}] ${e.severity.toUpperCase()}${e.source ? ' @ ' + e.source : ''}`;
                return `${head}\n${e.message}\n`;
            }).join('\n');
            await navigator.clipboard.writeText(text || '(empty)');
        } catch (e) {
            // Best-effort
            console.warn('[DebugPanel] copy failed', e);
        }
    };

    if (!enabled) return null;

    return (
        <div className="fixed bottom-4 right-4 z-[9999] font-sans" style={{ pointerEvents: 'none' }}>
            <div style={{ pointerEvents: 'auto' }}>
                {!open ? (
                    <button
                        onClick={() => setOpen(true)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-full shadow-lg border text-sm font-semibold transition-all ${
                            errCount > 0
                                ? 'bg-red-600 hover:bg-red-700 text-white border-red-700 animate-pulse'
                                : 'bg-gray-900 hover:bg-gray-800 text-gray-100 border-gray-800'
                        }`}
                        title="Open debug panel (Ctrl/Cmd+Shift+D to toggle)"
                    >
                        <Bug className="w-4 h-4" />
                        Debug
                        {visibleCount > 0 && (
                            <span className={`ml-1 inline-flex items-center justify-center text-[10px] font-bold min-w-[18px] h-[18px] px-1.5 rounded-full ${
                                errCount > 0 ? 'bg-white text-red-700' : 'bg-amber-400 text-gray-900'
                            }`}>
                                {visibleCount}
                            </span>
                        )}
                    </button>
                ) : (
                    <div className="w-[92vw] sm:w-[480px] max-h-[70vh] bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-2 bg-gray-900 text-white">
                            <div className="flex items-center gap-2 text-sm font-semibold">
                                <Bug className="w-4 h-4" />
                                Debug Console
                                <span className="text-[10px] font-normal text-gray-400">
                                    {visibleCount} entr{visibleCount === 1 ? 'y' : 'ies'}
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={copyAll}
                                    className="p-1.5 rounded hover:bg-gray-800 text-gray-300 hover:text-white"
                                    title="Copy all"
                                >
                                    <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={clear}
                                    className="p-1.5 rounded hover:bg-gray-800 text-gray-300 hover:text-white"
                                    title="Clear"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => setOpen(false)}
                                    className="p-1.5 rounded hover:bg-gray-800 text-gray-300 hover:text-white"
                                    title="Minimise"
                                >
                                    <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => setEnabled(false)}
                                    className="p-1.5 rounded hover:bg-gray-800 text-gray-300 hover:text-white"
                                    title="Disable until next reload (Ctrl/Cmd+Shift+D to re-enable)"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-gray-50">
                            {entries.length === 0 ? (
                                <div className="text-center text-xs text-gray-400 py-8 flex flex-col items-center gap-2">
                                    <AlertTriangle className="w-6 h-6 text-gray-300" />
                                    No issues captured yet.
                                </div>
                            ) : (
                                entries.map(e => (
                                    <DebugEntry key={e.id} entry={e} />
                                ))
                            )}
                        </div>
                        <div className="px-3 py-1.5 bg-gray-100 border-t border-gray-200 text-[10px] text-gray-500">
                            Toggle: <kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded font-mono">Ctrl/Cmd+Shift+D</kbd>
                            <span className="ml-2">URL: <code>?debug=0</code> to disable, <code>?debug=1</code> to enable</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function DebugEntry({ entry }) {
    const [expanded, setExpanded] = useState(false);
    const lines = entry.message.split('\n');
    const isLong = lines.length > 2 || entry.message.length > 200;
    const summary = isLong && !expanded ? lines.slice(0, 2).join('\n') : entry.message;

    return (
        <div className={`rounded-md border text-xs ${severityStyles[entry.severity] || severityStyles.error}`}>
            <div className="px-2 py-1.5 flex items-center justify-between gap-2 border-b border-current/10">
                <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${severityDot[entry.severity] || 'bg-red-500'}`} />
                    <span className="font-semibold uppercase tracking-wide text-[10px]">{entry.severity}</span>
                    <span className="font-mono text-[10px] opacity-70">{formatTime(entry.time)}</span>
                    {entry.source && (
                        <span className="font-mono text-[10px] opacity-60 truncate">{entry.source}</span>
                    )}
                </div>
                {isLong && (
                    <button
                        onClick={() => setExpanded(v => !v)}
                        className="p-0.5 rounded hover:bg-current/10 shrink-0"
                        title={expanded ? 'Collapse' : 'Expand'}
                    >
                        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                )}
            </div>
            <pre className="px-2 py-1.5 whitespace-pre-wrap break-words font-mono text-[11px] leading-snug max-h-[40vh] overflow-auto">
                {summary}
            </pre>
        </div>
    );
}
