import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Save, X } from 'lucide-react';
import { ConfirmationModal } from '../ui/ConfirmationModal';

const SpecialPrayerManager = () => {
    const { specialPrayers, addSpecialPrayer, updateSpecialPrayer, deleteSpecialPrayer, classes, currentUser } = useData();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState(null);
    const [formData, setFormData] = useState({ name: '', isEnabled: true, assignedClassIds: [] });

    // Filter classes for mentors
    const availableClasses = (currentUser?.role === 'mentor' || currentUser?.assignedClassIds)
        ? classes.filter(c => currentUser.assignedClassIds?.includes(c.id))
        : classes;

    // Filter special prayers for the current mentor
    const mySpecialPrayers = specialPrayers.filter(p =>
        currentUser?.role === 'admin' || p.mentorId === currentUser?.id
    );

    // Group classes by name (e.g. "1", "2") to allow batch selection if simple
    // For now, let's just list all classes sorted
    const sortedClasses = [...availableClasses].sort((a, b) =>
        a.name.localeCompare(b.name) || a.division.localeCompare(b.division)
    );

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) return;

        // If no classes selected, maybe warn? or assume all? 
        // Let's assume empty means *none* or *all*? 
        // Better to be explicit: If empty, maybe it's disabled for everyone effectively. 
        // User said "decide which classes are instructed".

        const payload = {
            name: formData.name,
            isEnabled: formData.isEnabled,
            assignedClassIds: formData.assignedClassIds || []
        };

        if (editingId) {
            await updateSpecialPrayer(editingId, payload);
            setEditingId(null);
        } else {
            // Include mentorId on creation
            await addSpecialPrayer({ ...payload, mentorId: currentUser?.id });
            setIsAdding(false);
        }
        setFormData({ name: '', isEnabled: true, assignedClassIds: [] });
    };

    const handleEdit = (prayer) => {
        setEditingId(prayer.id);
        setFormData({
            name: prayer.name,
            isEnabled: prayer.isEnabled,
            assignedClassIds: prayer.assignedClassIds || []
        });
        setIsAdding(true);
    };

    const toggleClass = (classId) => {
        setFormData(prev => {
            const current = prev.assignedClassIds || [];
            if (current.includes(classId)) {
                return { ...prev, assignedClassIds: current.filter(id => id !== classId) };
            } else {
                return { ...prev, assignedClassIds: [...current, classId] };
            }
        });
    };

    const toggleAllClasses = () => {
        setFormData(prev => {
            const allIds = sortedClasses.map(c => c.id);
            if (prev.assignedClassIds?.length === allIds.length) {
                return { ...prev, assignedClassIds: [] };
            } else {
                return { ...prev, assignedClassIds: allIds };
            }
        });
    };

    const handleDelete = (id) => {
        setDeleteConfirmation(id);
    };

    const confirmDelete = async () => {
        if (deleteConfirmation) {
            await deleteSpecialPrayer(deleteConfirmation);
            setDeleteConfirmation(null);
        }
    };

    const handleToggle = async (prayer) => {
        await updateSpecialPrayer(prayer.id, { isEnabled: !prayer.isEnabled });
    };

    const cancelForm = () => {
        setIsAdding(false);
        setEditingId(null);
        setFormData({ name: '', isEnabled: true, assignedClassIds: [] });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Manage Special Prayers</h2>
                    <p className="text-sm text-gray-500">Add optional prayers like Tharaveeh, Duha, etc.</p>
                </div>
                {!isAdding && (
                    <Button onClick={() => setIsAdding(true)} className="flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Add Prayer
                    </Button>
                )}
            </div>

            {isAdding && (
                <Card className="p-4 bg-indigo-50 border-indigo-100 mb-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Prayer Name</label>
                            <Input
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Tharaveeh"
                                autoFocus
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-medium text-gray-700">Assign to Classes</label>
                                <button
                                    type="button"
                                    onClick={toggleAllClasses}
                                    className="text-xs text-indigo-600 hover:text-indigo-800 underline"
                                >
                                    {formData.assignedClassIds?.length === sortedClasses.length ? 'Deselect All' : 'Select All'}
                                </button>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 bg-white p-3 rounded-lg border border-indigo-100 max-h-40 overflow-y-auto">
                                {sortedClasses.map(cls => (
                                    <label key={cls.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                        <input
                                            type="checkbox"
                                            checked={formData.assignedClassIds?.includes(cls.id)}
                                            onChange={() => toggleClass(cls.id)}
                                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="text-sm text-gray-700">{cls.name} - {cls.division}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-2 justify-end">
                            <Button type="button" variant="outline" onClick={cancelForm} className="flex items-center gap-2">
                                <X className="w-4 h-4" /> Cancel
                            </Button>
                            <Button type="submit" className="flex items-center gap-2">
                                <Save className="w-4 h-4" /> {editingId ? 'Update' : 'Save'}
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

            <div className="grid gap-4">
                {mySpecialPrayers.length === 0 ? (
                    <p className="text-center text-gray-500 italic py-8">No special prayers added yet.</p>
                ) : (
                    mySpecialPrayers.map(prayer => (
                        <Card key={prayer.id} className="p-4 flex items-center justify-between transition-colors hover:bg-gray-50">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => handleToggle(prayer)}
                                    className={`transition-colors ${prayer.isEnabled ? 'text-green-600' : 'text-gray-400'}`}
                                    title={prayer.isEnabled ? "Enabled" : "Disabled"}
                                >
                                    {prayer.isEnabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                                </button>
                                <div>
                                    <h3 className={`font-bold ${prayer.isEnabled ? 'text-gray-900' : 'text-gray-400'}`}>
                                        {prayer.name}
                                    </h3>
                                    <div className="flex gap-2 mt-1">
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${prayer.isEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {prayer.isEnabled ? 'Active' : 'Disabled'}
                                        </span>
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                                            {prayer.assignedClassIds?.length || 0} Classes Assigned
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleEdit(prayer)}
                                    className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(prayer.id)}
                                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </Card>
                    ))
                )}
            </div>
            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={!!deleteConfirmation}
                onClose={() => setDeleteConfirmation(null)}
                onConfirm={confirmDelete}
                title="Delete Special Prayer"
                message="Are you sure you want to delete this prayer? Student records for this prayer will remain but it will be removed from lists."
                confirmText="Delete Prayer"
                isDanger={true}
            />
        </div>
    );
};

export default SpecialPrayerManager;
