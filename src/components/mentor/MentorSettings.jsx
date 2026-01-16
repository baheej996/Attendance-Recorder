import React, { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { MENTOR_NAV_ITEMS } from '../../config/mentorNavItems';
import { Settings, GripVertical, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';

const MentorSettings = () => {
    const { mentorSettings, updateMentorSettings } = useData();
    const [items, setItems] = useState([]);

    useEffect(() => {
        // Initialize local state from saved settings or default config
        if (mentorSettings?.sidebarOrder && mentorSettings.sidebarOrder.length > 0) {
            // Sort master list based on saved ID order
            const ordered = [...MENTOR_NAV_ITEMS].sort((a, b) => {
                const idxA = mentorSettings.sidebarOrder.indexOf(a.id);
                const idxB = mentorSettings.sidebarOrder.indexOf(b.id);
                // If item not found in saved order (new feature), put at end
                const cleanIdxA = idxA === -1 ? 999 : idxA;
                const cleanIdxB = idxB === -1 ? 999 : idxB;
                return cleanIdxA - cleanIdxB;
            });
            setItems(ordered);
        } else {
            setItems(MENTOR_NAV_ITEMS);
        }
    }, [mentorSettings]);

    const handleMove = (index, direction) => {
        const newItems = [...items];
        if (direction === 'up' && index > 0) {
            [newItems[index], newItems[index - 1]] = [newItems[index - 1], newItems[index]];
        } else if (direction === 'down' && index < newItems.length - 1) {
            [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
        }
        setItems(newItems);
    };

    const handleSave = () => {
        const order = items.map(i => i.id);
        updateMentorSettings({ sidebarOrder: order });
        // Optional: Add toast notification
        alert("Settings saved successfully!");
    };

    const handleReset = () => {
        if (confirm("Reset sidebar to default order?")) {
            setItems(MENTOR_NAV_ITEMS);
            updateMentorSettings({ sidebarOrder: [] });
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Settings className="w-6 h-6 text-gray-700" />
                    Mentor Settings
                </h1>
                <p className="text-gray-500 mt-1">
                    Customize your dashboard experience.
                </p>
            </div>

            <div className="grid gap-6">
                <Card className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Sidebar Arrangement</h2>
                            <p className="text-sm text-gray-500">Reorder the navigation items as you wish.</p>
                        </div>
                        <Button variant="ghost" onClick={handleReset} className="text-gray-500 hover:text-red-600">
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Reset Default
                        </Button>
                    </div>

                    <div className="space-y-2 max-h-[600px] overflow-y-auto">
                        {items.map((item, index) => {
                            const Icon = item.icon;
                            return (
                                <div
                                    key={item.id}
                                    className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:border-indigo-300 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="cursor-grab text-gray-300 hover:text-gray-500">
                                            <GripVertical className="w-5 h-5" />
                                        </div>
                                        <div className="p-2 bg-indigo-50 rounded-md text-indigo-600">
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <span className="font-medium text-gray-700">{item.label}</span>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => handleMove(index, 'up')}
                                            disabled={index === 0}
                                            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600"
                                            title="Move Up"
                                        >
                                            <ArrowUp className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleMove(index, 'down')}
                                            disabled={index === items.length - 1}
                                            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600"
                                            title="Move Down"
                                        >
                                            <ArrowDown className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-6 pt-6 border-t border-gray-100 flex justify-end">
                        <Button onClick={handleSave} className="bg-indigo-600 text-white">
                            Save Changes
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default MentorSettings;
