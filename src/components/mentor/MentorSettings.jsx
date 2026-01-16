import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { MENTOR_NAV_ITEMS } from '../../config/mentorNavItems';
import { Settings, GripVertical, CheckCircle, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';

const MentorSettings = () => {
    const { mentorSettings, updateMentorSettings } = useData();
    const [items, setItems] = useState([]);
    const [showToast, setShowToast] = useState(false);

    // Drag and Drop Refs
    const dragItem = useRef(null);
    const dragOverItem = useRef(null);

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

    // Drag Functions
    const onDragStart = (e, index) => {
        dragItem.current = index;
        e.dataTransfer.effectAllowed = "move";
        // Ghost image styling logic can go here if needed
    };

    const onDragEnter = (e, index) => {
        dragOverItem.current = index;
    };

    const onDragEnd = () => {
        const copyListItems = [...items];
        const dragItemContent = copyListItems[dragItem.current];

        // Remove and insert
        copyListItems.splice(dragItem.current, 1);
        copyListItems.splice(dragOverItem.current, 0, dragItemContent);

        dragItem.current = null;
        dragOverItem.current = null;
        setItems(copyListItems);
    };

    const handleSave = () => {
        const order = items.map(i => i.id);
        updateMentorSettings({ sidebarOrder: order });

        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    const handleReset = () => {
        if (confirm("Reset sidebar to default order?")) {
            setItems(MENTOR_NAV_ITEMS);
            updateMentorSettings({ sidebarOrder: [] });
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-6 relative">
            {/* Themed Success Toast */}
            {showToast && (
                <div className="fixed top-24 right-10 z-50 bg-green-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
                    <CheckCircle className="w-6 h-6" />
                    <div>
                        <h4 className="font-bold text-sm uppercase tracking-wider">Success</h4>
                        <p className="text-sm opacity-90">Settings saved successfully.</p>
                    </div>
                </div>
            )}

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
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Sidebar Arrangement</h2>
                            <p className="text-sm text-gray-500">Drag and drop items to reorder your navigation menu.</p>
                        </div>
                        <Button
                            variant="ghost"
                            onClick={handleReset}
                            className="flex items-center gap-2 text-gray-500 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" />
                            <span>Reset Default</span>
                        </Button>
                    </div>

                    <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                        {items.map((item, index) => {
                            const Icon = item.icon;
                            return (
                                <div
                                    key={item.id}
                                    className="group flex items-center gap-4 p-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:border-indigo-300 hover:shadow-md transition-all cursor-move active:cursor-grabbing"
                                    draggable
                                    onDragStart={(e) => onDragStart(e, index)}
                                    onDragEnter={(e) => onDragEnter(e, index)}
                                    onDragEnd={onDragEnd}
                                    onDragOver={(e) => e.preventDefault()}
                                >
                                    <div className="text-gray-300 group-hover:text-indigo-400">
                                        <GripVertical className="w-5 h-5" />
                                    </div>
                                    <div className="p-2 bg-indigo-50 rounded-md text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <span className="font-medium text-gray-700">{item.label}</span>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-6 pt-6 border-t border-gray-100 flex justify-end">
                        <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8">
                            Save Changes
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default MentorSettings;
