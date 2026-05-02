import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import {
    Trophy, Plus, Edit2, Trash2, CheckCircle, Circle, Copy,
    ChevronDown, Eye, EyeOff, Star, Zap, Users, BarChart3, Crown
} from 'lucide-react';
import { clsx } from 'clsx';
import { ConfirmationModal } from '../ui/ConfirmationModal';

// Helper: generate "Month YYYY" strings
const getMonthLabel = (date) => date.toLocaleString('default', { month: 'long', year: 'numeric' });
const currentMonthLabel = getMonthLabel(new Date());
const getNextMonthLabel = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return getMonthLabel(d);
};
// Build a list of last 6 + next 2 months
const buildMonthOptions = () => {
    const months = [];
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    for (let i = 0; i < 9; i++) {
        months.push(getMonthLabel(new Date(d)));
        d.setMonth(d.getMonth() + 1);
    }
    return months;
};

// Medal badge for rank
const RankBadge = ({ rank }) => {
    if (rank === 1) return <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-black"><Crown className="w-3 h-3" />1st</span>;
    if (rank === 2) return <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-black">🥈 2nd</span>;
    if (rank === 3) return <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-black">🥉 3rd</span>;
    return <span className="text-xs font-bold text-gray-400">#{rank}</span>;
};

const AdminMentorLeaderboard = () => {
    const {
        currentUser, mentors,
        leaderboardRules, leaderboardCompletions, leaderboardSettings,
        addLeaderboardRule, updateLeaderboardRule, deleteLeaderboardRule,
        toggleLeaderboardCompletion, duplicateRulesForMonth,
        updateLeaderboardSettings
    } = useData();
    const { showAlert } = useUI();

    const [selectedMonth, setSelectedMonth] = useState(currentMonthLabel);
    const [activeView, setActiveView] = useState('rules'); // 'rules' | 'board'
    const [showForm, setShowForm] = useState(false);
    const [editingRule, setEditingRule] = useState(null);
    const [deleteConfig, setDeleteConfig] = useState({ isOpen: false, id: null, name: '' });
    const [dupModal, setDupModal] = useState(false);
    const [dupTarget, setDupTarget] = useState(getNextMonthLabel());
    const [formData, setFormData] = useState({ name: '', description: '', points: 10 });

    const monthOptions = buildMonthOptions();

    // Rules for selected month
    const monthRules = useMemo(() =>
        leaderboardRules.filter(r => r.month === selectedMonth)
            .sort((a, b) => b.points - a.points),
        [leaderboardRules, selectedMonth]);

    // Completions for selected month (keyed by mentorId+ruleId)
    const completionSet = useMemo(() => {
        const set = new Set();
        leaderboardCompletions
            .filter(c => c.month === selectedMonth)
            .forEach(c => set.add(`${c.mentorId}::${c.ruleId}`));
        return set;
    }, [leaderboardCompletions, selectedMonth]);

    // Leaderboard scores
    const leaderboard = useMemo(() => {
        return mentors.map(mentor => {
            const completedRuleIds = new Set(
                leaderboardCompletions
                    .filter(c => c.mentorId === mentor.id && c.month === selectedMonth)
                    .map(c => c.ruleId)
            );
            const totalPoints = monthRules
                .filter(r => completedRuleIds.has(r.id))
                .reduce((sum, r) => sum + (Number(r.points) || 0), 0);
            const completedCount = completedRuleIds.size;
            return { ...mentor, totalPoints, completedCount };
        }).sort((a, b) => b.totalPoints - a.totalPoints || b.completedCount - a.completedCount);
    }, [mentors, leaderboardCompletions, monthRules, selectedMonth]);

    // Assign ranks (dense ranking)
    const rankedBoard = useMemo(() => {
        let rank = 1;
        return leaderboard.map((m, i) => {
            if (i > 0 && m.totalPoints < leaderboard[i - 1].totalPoints) rank = i + 1;
            return { ...m, rank };
        });
    }, [leaderboard]);

    const handleOpenForm = (rule = null) => {
        if (rule) {
            setEditingRule(rule);
            setFormData({ name: rule.name, description: rule.description || '', points: rule.points });
        } else {
            setEditingRule(null);
            setFormData({ name: '', description: '', points: 10 });
        }
        setShowForm(true);
    };

    const handleSubmitRule = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) return;
        const payload = { ...formData, points: Number(formData.points), month: selectedMonth };
        if (editingRule) {
            await updateLeaderboardRule(editingRule.id, payload);
            showAlert('Updated', 'Rule updated successfully.', 'success');
        } else {
            await addLeaderboardRule(payload);
            showAlert('Added', 'Rule added successfully.', 'success');
        }
        setShowForm(false);
        setEditingRule(null);
    };

    const handleDelete = async () => {
        await deleteLeaderboardRule(deleteConfig.id);
        showAlert('Deleted', 'Rule deleted.', 'success');
        setDeleteConfig({ isOpen: false, id: null, name: '' });
    };

    const handleToggleCompletion = async (ruleId, mentorId) => {
        await toggleLeaderboardCompletion(ruleId, mentorId, selectedMonth, currentUser);
    };

    const handleDuplicate = async () => {
        if (!dupTarget || dupTarget === selectedMonth) {
            showAlert('Error', 'Please select a different month.', 'error');
            return;
        }
        await duplicateRulesForMonth(selectedMonth, dupTarget);
        showAlert('Duplicated', `Rules duplicated to ${dupTarget}.`, 'success');
        setDupModal(false);
        setSelectedMonth(dupTarget);
    };

    const handleToggleVisibility = async () => {
        const newVal = !leaderboardSettings?.isVisibleToMentors;
        await updateLeaderboardSettings({ isVisibleToMentors: newVal });
        showAlert(newVal ? 'Leaderboard Visible' : 'Leaderboard Hidden',
            `Mentors can ${newVal ? 'now' : 'no longer'} see the leaderboard.`, 'success');
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <ConfirmationModal
                isOpen={deleteConfig.isOpen}
                onClose={() => setDeleteConfig({ isOpen: false, id: null, name: '' })}
                onConfirm={handleDelete}
                title="Delete Rule"
                message={`Delete "${deleteConfig.name}"? All completion records for this rule will also be removed.`}
                confirmText="Delete"
                isDanger
            />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-200">
                        <Trophy className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Mentor Leaderboard</h1>
                        <p className="text-sm text-gray-500">Create rules, mark achievements, track performance</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Visibility Toggle */}
                    <button
                        onClick={handleToggleVisibility}
                        className={clsx(
                            'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all',
                            leaderboardSettings?.isVisibleToMentors
                                ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                        )}
                    >
                        {leaderboardSettings?.isVisibleToMentors ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        {leaderboardSettings?.isVisibleToMentors ? 'Visible to Mentors' : 'Hidden from Mentors'}
                    </button>
                    {/* Duplicate button */}
                    {monthRules.length > 0 && (
                        <button
                            onClick={() => setDupModal(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-all"
                        >
                            <Copy className="w-4 h-4" /> Duplicate to Month
                        </button>
                    )}
                </div>
            </div>

            {/* Month Selector + View Tabs */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex items-center gap-2">
                    <select
                        value={selectedMonth}
                        onChange={e => setSelectedMonth(e.target.value)}
                        className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 shadow-sm"
                    >
                        {monthOptions.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveView('rules')}
                        className={clsx('px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2',
                            activeView === 'rules' ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-500 hover:text-gray-700')}
                    >
                        <Zap className="w-4 h-4" /> Rules
                    </button>
                    <button
                        onClick={() => setActiveView('board')}
                        className={clsx('px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2',
                            activeView === 'board' ? 'bg-white shadow-sm text-amber-600' : 'text-gray-500 hover:text-gray-700')}
                    >
                        <BarChart3 className="w-4 h-4" /> Leaderboard
                    </button>
                </div>
            </div>

            {/* Duplicate Month Modal */}
            {dupModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 animate-in zoom-in-95">
                        <h3 className="font-bold text-gray-900 mb-1">Duplicate Rules</h3>
                        <p className="text-sm text-gray-500 mb-4">Copy all {monthRules.length} rules from <strong>{selectedMonth}</strong> to:</p>
                        <select
                            value={dupTarget}
                            onChange={e => setDupTarget(e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium mb-4 focus:ring-2 focus:ring-indigo-500"
                        >
                            {monthOptions.filter(m => m !== selectedMonth).map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <div className="flex gap-3">
                            <Button variant="secondary" onClick={() => setDupModal(false)} className="flex-1">Cancel</Button>
                            <Button onClick={handleDuplicate} className="flex-1">Duplicate</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* RULES VIEW */}
            {activeView === 'rules' && (
                <div className="space-y-4">
                    {/* Add Rule Form */}
                    {showForm ? (
                        <Card className="p-5 border border-indigo-100 bg-indigo-50/30 animate-in slide-in-from-top-2">
                            <h3 className="font-bold text-gray-900 mb-4">{editingRule ? 'Edit Rule' : 'New Rule'} — {selectedMonth}</h3>
                            <form onSubmit={handleSubmitRule} className="space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="sm:col-span-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Rule Name *</label>
                                        <input
                                            required
                                            className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                                            placeholder="e.g. Completed logbook on time"
                                            value={formData.name}
                                            onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Points *</label>
                                        <input
                                            required type="number" min={1} max={1000}
                                            className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                                            value={formData.points}
                                            onChange={e => setFormData(p => ({ ...p, points: e.target.value }))}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Description (optional)</label>
                                    <textarea
                                        className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 bg-white h-16 resize-none"
                                        placeholder="Additional details about this rule..."
                                        value={formData.description}
                                        onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                                    />
                                </div>
                                <div className="flex gap-3 pt-1">
                                    <Button type="button" variant="secondary" onClick={() => { setShowForm(false); setEditingRule(null); }}>Cancel</Button>
                                    <Button type="submit">{editingRule ? 'Update Rule' : 'Add Rule'}</Button>
                                </div>
                            </form>
                        </Card>
                    ) : (
                        <Button onClick={() => handleOpenForm()} className="flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Add Rule for {selectedMonth}
                        </Button>
                    )}

                    {monthRules.length === 0 ? (
                        <Card className="p-12 text-center border-dashed">
                            <Star className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                            <p className="font-bold text-gray-700">No rules for {selectedMonth}</p>
                            <p className="text-sm text-gray-400 mt-1">Add rules or duplicate from a previous month.</p>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {/* Mentor Completion Matrix */}
                            <Card className="overflow-hidden">
                                <div className="p-4 border-b border-gray-50 flex items-center gap-2">
                                    <Users className="w-4 h-4 text-indigo-500" />
                                    <h3 className="font-bold text-gray-800 text-sm">Completion Matrix — {selectedMonth}</h3>
                                    <span className="text-xs text-gray-400 ml-auto">{mentors.length} mentors · {monthRules.length} rules</span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[600px] text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase tracking-wider w-48">Mentor</th>
                                                {monthRules.map(rule => (
                                                    <th key={rule.id} className="px-3 py-3 text-center">
                                                        <div className="flex flex-col items-center gap-1">
                                                            <span className="font-bold text-gray-700 text-xs leading-tight max-w-[80px] truncate" title={rule.name}>{rule.name}</span>
                                                            <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                                                                <Zap className="w-2.5 h-2.5" />{rule.points}pts
                                                            </span>
                                                            <div className="flex gap-1 mt-1">
                                                                <button onClick={() => handleOpenForm(rule)} className="p-0.5 text-gray-400 hover:text-indigo-600 rounded transition-colors" title="Edit"><Edit2 className="w-3 h-3" /></button>
                                                                <button onClick={() => setDeleteConfig({ isOpen: true, id: rule.id, name: rule.name })} className="p-0.5 text-gray-400 hover:text-red-600 rounded transition-colors" title="Delete"><Trash2 className="w-3 h-3" /></button>
                                                            </div>
                                                        </div>
                                                    </th>
                                                ))}
                                                <th className="px-4 py-3 text-center font-bold text-gray-600 text-xs uppercase tracking-wider">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {mentors.sort((a, b) => a.name.localeCompare(b.name)).map(mentor => {
                                                const mentorPoints = monthRules
                                                    .filter(r => completionSet.has(`${mentor.id}::${r.id}`))
                                                    .reduce((sum, r) => sum + (r.points || 0), 0);
                                                const mentorCompleted = monthRules.filter(r => completionSet.has(`${mentor.id}::${r.id}`)).length;
                                                return (
                                                    <tr key={mentor.id} className="hover:bg-amber-50/30 transition-colors group">
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-700 font-bold text-xs shrink-0">
                                                                    {mentor.name.charAt(0)}
                                                                </div>
                                                                <span className="font-semibold text-gray-800 text-xs truncate max-w-[110px]">{mentor.name}</span>
                                                            </div>
                                                        </td>
                                                        {monthRules.map(rule => {
                                                            const done = completionSet.has(`${mentor.id}::${rule.id}`);
                                                            return (
                                                                <td key={rule.id} className="px-3 py-3 text-center">
                                                                    <button
                                                                        onClick={() => handleToggleCompletion(rule.id, mentor.id)}
                                                                        title={done ? 'Mark incomplete' : 'Mark complete'}
                                                                        className={clsx(
                                                                            'w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-all hover:scale-110 active:scale-95',
                                                                            done ? 'bg-green-100 text-green-600 shadow-sm' : 'bg-gray-50 text-gray-300 hover:bg-indigo-50 hover:text-indigo-400'
                                                                        )}
                                                                    >
                                                                        {done ? <CheckCircle className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                                                                    </button>
                                                                </td>
                                                            );
                                                        })}
                                                        <td className="px-4 py-3 text-center">
                                                            <div className="flex flex-col items-center">
                                                                <span className="font-black text-amber-600 text-sm">{mentorPoints}pts</span>
                                                                <span className="text-[10px] text-gray-400">{mentorCompleted}/{monthRules.length}</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </div>
                    )}
                </div>
            )}

            {/* LEADERBOARD VIEW */}
            {activeView === 'board' && (
                <div className="space-y-4">
                    {rankedBoard.every(m => m.totalPoints === 0) ? (
                        <Card className="p-12 text-center border-dashed">
                            <Trophy className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                            <p className="font-bold text-gray-700">No points recorded yet for {selectedMonth}</p>
                            <p className="text-sm text-gray-400 mt-1">Switch to Rules view to mark completions.</p>
                        </Card>
                    ) : (
                        <>
                            {/* Top 3 Podium */}
                            {rankedBoard.filter(m => m.totalPoints > 0).length >= 1 && (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-2">
                                    {rankedBoard.filter(m => m.totalPoints > 0).slice(0, 3).map((mentor, i) => {
                                        const podiumColors = [
                                            'from-yellow-400 to-amber-500 shadow-amber-200',
                                            'from-gray-300 to-gray-400 shadow-gray-200',
                                            'from-orange-400 to-amber-600 shadow-orange-200'
                                        ];
                                        const sizes = ['order-1 sm:order-2', 'order-2 sm:order-1', 'order-3'];
                                        return (
                                            <div key={mentor.id} className={clsx('rounded-2xl bg-white border border-gray-100 shadow-md p-5 flex flex-col items-center gap-2 transition-all hover:shadow-lg', sizes[i])}>
                                                <div className={clsx('w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white font-black text-2xl shadow-lg', podiumColors[i])}>
                                                    {mentor.name.charAt(0)}
                                                </div>
                                                <RankBadge rank={mentor.rank} />
                                                <p className="font-bold text-gray-900 text-center text-sm leading-tight">{mentor.name}</p>
                                                <div className="flex items-center gap-1 bg-amber-50 px-3 py-1 rounded-full">
                                                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                                                    <span className="font-black text-amber-700 text-lg">{mentor.totalPoints}</span>
                                                    <span className="text-xs text-amber-500 font-bold">pts</span>
                                                </div>
                                                <p className="text-xs text-gray-400">{mentor.completedCount} of {monthRules.length} rules</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Full Table */}
                            <Card className="overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-16">Rank</th>
                                            <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Mentor</th>
                                            <th className="px-5 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Rules Done</th>
                                            <th className="px-5 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Points</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {rankedBoard.map((mentor, i) => (
                                            <tr key={mentor.id} className={clsx('transition-colors', mentor.totalPoints > 0 ? 'hover:bg-amber-50/30' : 'opacity-40')}>
                                                <td className="px-5 py-3"><RankBadge rank={mentor.rank} /></td>
                                                <td className="px-5 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-700 font-bold text-xs shrink-0">{mentor.name.charAt(0)}</div>
                                                        <span className="font-semibold text-gray-800">{mentor.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3 text-center">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <div className="flex gap-0.5">
                                                            {monthRules.map(r => (
                                                                <div key={r.id} className={clsx('w-2 h-2 rounded-sm', completionSet.has(`${mentor.id}::${r.id}`) ? 'bg-green-500' : 'bg-gray-200')} />
                                                            ))}
                                                        </div>
                                                        <span className="text-xs text-gray-500">{mentor.completedCount}/{monthRules.length}</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3 text-right">
                                                    <span className={clsx('font-black text-lg', mentor.totalPoints > 0 ? 'text-amber-600' : 'text-gray-300')}>{mentor.totalPoints}</span>
                                                    <span className="text-xs text-gray-400 ml-1">pts</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </Card>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminMentorLeaderboard;
