import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { MENTOR_NAV_ITEMS } from '../../config/mentorNavItems';
import { Settings, GripVertical, CheckCircle, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';
import { ConfirmationModal } from '../ui/ConfirmationModal';

const MentorSettings = () => {
    const { mentorSettings, updateMentorSettings, currentUser, updateMentorProfile, addAdminRequest } = useData();
    const [items, setItems] = useState([]);
    const [showToast, setShowToast] = useState({ show: false, message: '', type: 'success' });
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, action: null });

    // Signature State
    const [signaturePreview, setSignaturePreview] = useState(currentUser?.signature || null);

    // Profile Request State
    const [requestDetails, setRequestDetails] = useState('');
    const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

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

    const showSuccessToast = (message) => {
        setShowToast({ show: true, message, type: 'success' });
        setTimeout(() => setShowToast({ ...showToast, show: false }), 3000);
    };

    const handleSave = () => {
        const order = items.map(i => i.id);
        updateMentorSettings({ sidebarOrder: order });
        showSuccessToast('Settings saved successfully.');
    };

    const handleReset = () => {
        setConfirmModal({
            isOpen: true,
            action: () => {
                setItems(MENTOR_NAV_ITEMS);
                updateMentorSettings({ sidebarOrder: [] });
                showSuccessToast('Sidebar reset to default order.');
            }
        });
    };

    const handleSignatureUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSignaturePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const saveSignature = () => {
        updateMentorProfile(currentUser.id, { signature: signaturePreview });
        showSuccessToast('Digital signature saved.');
    };

    const handleSendRequest = () => {
        if (!requestDetails.trim()) return;
        setIsSubmittingRequest(true);

        // Simulate API call
        setTimeout(() => {
            addAdminRequest({
                mentorId: currentUser.id,
                mentorName: currentUser.name,
                type: 'Profile Update',
                details: requestDetails,
            });
            setRequestDetails('');
            setIsSubmittingRequest(false);
            showSuccessToast("Request sent to Admin successfully!");
        }, 1000);
    };

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-6 relative">
            {/* Themed Success Toast */}
            {showToast.show && (
                <div className="fixed top-24 right-10 z-50 bg-green-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
                    <CheckCircle className="w-6 h-6" />
                    <div>
                        <h4 className="font-bold text-sm uppercase tracking-wider">Success</h4>
                        <p className="text-sm opacity-90">{showToast.message}</p>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.action}
                title="Confirm Action"
                message="Are you sure you want to proceed?"
                confirmText="Yes, Proceed"
            />

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

                {/* Digital Signature Card */}
                <Card className="p-6">
                    <div className="mb-6">
                        <h2 className="text-lg font-bold text-gray-900">Digital Signature</h2>
                        <p className="text-sm text-gray-500">Upload your signature to be used on official documents and certificates.</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-6 items-center">
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 w-full sm:w-64 h-32 flex items-center justify-center bg-gray-50 relative overflow-hidden group">
                            {signaturePreview ? (
                                <img src={signaturePreview} alt="Signature Preview" className="max-h-full max-w-full object-contain" />
                            ) : (
                                <span className="text-gray-400 text-sm">No signature uploaded</span>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleSignatureUpload}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                <span className="text-white text-xs font-bold">Click to Upload</span>
                            </div>
                        </div>

                        <div className="flex-1 space-y-4">
                            <div className="text-sm text-gray-500">
                                <p>• Accepted formats: PNG, JPG, JPEG</p>
                                <p>• Recommended size: 300x100 pixels</p>
                                <p>• Use a transparent background for best results</p>
                            </div>
                            <Button
                                onClick={saveSignature}
                                disabled={!signaturePreview || signaturePreview === currentUser?.signature}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                                Save Signature
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* Profile Update Request */}
                <Card className="p-6 border-t-4 border-t-yellow-400">
                    <div className="mb-6">
                        <h2 className="text-lg font-bold text-gray-900">Request Profile Update</h2>
                        <p className="text-sm text-gray-500">Need to change your name, qualification, or contact info? Send a request to the admin.</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Details of Change Required</label>
                            <textarea
                                value={requestDetails}
                                onChange={(e) => setRequestDetails(e.target.value)}
                                placeholder="E.g., Please update my qualification to PhD and change my phone number to..."
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[100px]"
                            />
                        </div>
                        <div className="flex justify-end">
                            <Button
                                onClick={handleSendRequest}
                                disabled={!requestDetails.trim() || isSubmittingRequest}
                                className="bg-yellow-500 hover:bg-yellow-600 text-white"
                            >
                                {isSubmittingRequest ? 'Sending...' : 'Send Request'}
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        </div >
    );
};
export default MentorSettings;
