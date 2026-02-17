import React, { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Save, Building, Calendar, User, Type, UserCog, Lock } from 'lucide-react';

const SettingsManager = () => {
    const { institutionSettings, updateInstitutionSettings, updateAdminCredentials, validateAdmin } = useData();
    const { showAlert } = useUI();
    const [formData, setFormData] = useState({
        name: '',
        tagline: '',
        academicYear: '',
        chiefMentor: ''
    });
    const [adminData, setAdminData] = useState({
        currentPassword: '',
        newUsername: '',
        newPassword: ''
    });
    const [isDirty, setIsDirty] = useState(false);
    const [message, setMessage] = useState('');
    const [adminMessage, setAdminMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        if (institutionSettings) {
            setFormData(institutionSettings);
        }
    }, [institutionSettings]);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setIsDirty(true);
        setMessage('');
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        updateInstitutionSettings(formData);
        setIsDirty(false);
        showAlert('Success', 'Settings saved successfully!', 'success');
    };

    const handleAdminUpdate = (e) => {
        e.preventDefault();
        setAdminMessage({ type: '', text: '' });

        // Basic Validation
        if (!adminData.currentPassword || !adminData.newUsername || !adminData.newPassword) {
            setAdminMessage({ type: 'error', text: 'All fields are required.' });
            return;
        }

        // Validate Current Credentials (we only know the username is 'admin' or current state... wait, 
        // we need to know the CURRENT username to validate? 
        // Actually navigateAdmin requires (username, password). 
        // But the user might only input current password.
        // Let's assume the user is currently logged in as the admin they want to change.
        // But for better security, let's just ask for "Current Password" and assume the current username is what's in context.
        // Wait, validateAdmin needs both. 
        // Let's modify logic slightly: we'll try to validate with stored username + input password.
        // BUT, we don't have access to stored username here easily unless we peek at localStorage or Context.
        // Context has `adminCredentials` state but it's internal to Context... 
        // Ah, I didn't expose adminCredentials to the consumer, only validateAdmin.
        // Let's assume the user knows their current username.
        // Or better: Let's just expose `adminCredentials` (safe-ish since this is client-side app).
        // OR better: Update `validateAdmin` to optionally take just password if we assume default user? No.
        // Let's just ask the user for "Current Admin Username" too? It's safer.
        // Or simpler: The user is ALREADY logged in. But re-auth is good.
    };

    // Better Implementation for handleAdminUpdate:
    const handleAdminUpdateExec = (e) => {
        e.preventDefault();
        setAdminMessage({ type: '', text: '' });

        // We'll ask the user to enter their OLD username to confirm too.
        // Actually, let's just use the `validateAdmin` with the `adminData.currentUsername` if we add it?
        // Let's stick to the form structure: Current Password, New Username, New Password.
        // Problem: We need the CURRENT username to call validateAdmin.
        // Let's peek at `useData` context return.
        // I can just expose `adminCredentials` from context or similar.
        // Let's Assume the user is 'admin' (default) or whatever they set.
        // Wait, I can try to access the context's state if I expose it. 
        // Let's expose `adminCredentials` in DataContext first? No, I viewed the file, I didn't expose it.
        // Let's blind check? validateAdmin(storedUsername...?)
        // Re-plan: update SettingsManager to include "Current Username" field in the Admin form.
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50 p-4 -mx-4 sm:-mx-6 lg:-mx-8 sticky top-0 z-10 border-b border-gray-200 shadow-sm">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Institution Settings</h2>
                    <p className="text-sm text-gray-500">Configure global application details</p>
                </div>
            </div>

            <Card>
                <CardHeader title="General Information" description="Update your institution's profile and academic details." />

                <form onSubmit={handleSubmit} className="space-y-6 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-2">
                            <div className="relative">
                                <Building className="absolute left-3 top-9 text-gray-400 w-5 h-5" />
                                <Input
                                    label="Institution Name"
                                    placeholder="e.g. Springfield High School"
                                    value={formData.name}
                                    onChange={(e) => handleChange('name', e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <p className="text-xs text-gray-400 mt-1">This name will appear on the dashboard header and reports.</p>
                        </div>

                        <div className="col-span-2">
                            <div className="relative">
                                <Type className="absolute left-3 top-9 text-gray-400 w-5 h-5" />
                                <Input
                                    label="Tagline / Motto"
                                    placeholder="e.g. Excellence in Education"
                                    value={formData.tagline}
                                    onChange={(e) => handleChange('tagline', e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        <div className="col-span-2">
                            <div className="relative">
                                <Building className="absolute left-3 top-9 text-gray-400 w-5 h-5" />
                                <Input
                                    label="Favicon URL"
                                    placeholder="https://example.com/favicon.ico"
                                    value={formData.favicon || ''}
                                    onChange={(e) => handleChange('favicon', e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-1 ml-1">Enter a valid URL for the website icon (ICO, PNG, SVG).</p>
                        </div>

                        <div>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-9 text-gray-400 w-5 h-5" />
                                <Input
                                    label="Academic Year"
                                    placeholder="e.g. 2025-2026"
                                    value={formData.academicYear}
                                    onChange={(e) => handleChange('academicYear', e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        <div>
                            <div className="relative">
                                <User className="absolute left-3 top-9 text-gray-400 w-5 h-5" />
                                <Input
                                    label="Chief Mentor / Principal Name"
                                    placeholder="e.g. Dr. Sarah Connor"
                                    value={formData.chiefMentor}
                                    onChange={(e) => handleChange('chiefMentor', e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <p className="text-xs text-gray-400 mt-1">Used for signatures on reports.</p>
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Digital Signature</label>
                            <div className="flex flex-col sm:flex-row items-center gap-4">
                                {formData.signatureImage ? (
                                    <div className="relative group">
                                        <div className="border border-gray-200 rounded-lg p-2 bg-white">
                                            <img
                                                src={formData.signatureImage}
                                                alt="Signature Preview"
                                                className="h-16 object-contain"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleChange('signatureImage', null)}
                                            className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="h-16 w-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-xs text-gray-400 bg-gray-50">
                                        No Signature
                                    </div>
                                )}

                                <div>
                                    <input
                                        type="file"
                                        id="signature-upload"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onloadend = () => {
                                                    handleChange('signatureImage', reader.result);
                                                };
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                    />
                                    <label
                                        htmlFor="signature-upload"
                                        className="cursor-pointer px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors inline-flex items-center gap-2 w-full sm:w-auto justify-center"
                                    >
                                        <UserCog className="w-4 h-4" />
                                        Upload Image
                                    </label>
                                    <p className="text-xs text-gray-400 mt-1 text-center sm:text-left">Recommended: Transparent PNG (200x80px)</p>
                                </div>
                            </div>
                            <p className="text-xs text-gray-400 mt-2">This signature will appear on valid official documents.</p>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="w-full sm:w-auto text-center sm:text-left">
                            {message && <span className="text-green-600 font-medium animate-in fade-in slide-in-from-left-2">{message}</span>}
                        </div>
                        <Button
                            type="submit"
                            disabled={!isDirty}
                            className={`flex items-center justify-center gap-2 w-full sm:w-auto ${!isDirty ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <Save className="w-4 h-4" />
                            Save Changes
                        </Button>
                    </div>
                </form>
            </Card>

            <Card>
                <CardHeader title="Admin Account Settings" description="Update administrator login credentials." />
                <form onSubmit={(e) => {
                    e.preventDefault();
                    setAdminMessage({ type: '', text: '' });

                    // We need current username to validate. 
                    // Since I didn't expose it, I'll add a field for it or assume I can get it.
                    // Let's add "Current Username" field to make it explicit and secure.
                    // But wait, the user wants "Reset username and password".

                    // Let's use a trick: `validateAdmin` logic inside context compares (u, p) -> stored === u && stored === p.
                    // If I don't know stored U, I can't call validateAdmin correctly if I need to pass U.
                    // Let's try to validate with (adminData.currentUsername, adminData.currentPassword).

                    if (validateAdmin(adminData.currentUsername, adminData.currentPassword)) {
                        updateAdminCredentials(adminData.newUsername, adminData.newPassword);
                        showAlert('Success', 'Admin credentials updated successfully!', 'success');
                        setAdminData({ currentUsername: '', currentPassword: '', newUsername: '', newPassword: '' });
                    } else {
                        showAlert('Authentication Failed', 'Current credentials incorrect.', 'error');
                    }
                }} className="space-y-6 p-6">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <h4 className="text-sm font-medium text-gray-900 border-b pb-2 mb-4">Security Verification</h4>
                        </div>

                        <div>
                            <div className="relative">
                                <UserCog className="absolute left-3 top-9 text-gray-400 w-5 h-5" />
                                <Input
                                    label="Current Username"
                                    placeholder="Enter current username"
                                    value={adminData.currentUsername || ''}
                                    onChange={(e) => setAdminData(p => ({ ...p, currentUsername: e.target.value }))}
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        <div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-9 text-gray-400 w-5 h-5" />
                                <Input
                                    label="Current Password"
                                    type="password"
                                    placeholder="Enter current password"
                                    value={adminData.currentPassword || ''}
                                    onChange={(e) => setAdminData(p => ({ ...p, currentPassword: e.target.value }))}
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <h4 className="text-sm font-medium text-gray-900 border-b pb-2 mb-4 mt-2">New Credentials</h4>
                        </div>

                        <div>
                            <div className="relative">
                                <User className="absolute left-3 top-9 text-gray-400 w-5 h-5" />
                                <Input
                                    label="New Username"
                                    placeholder="Set new username"
                                    value={adminData.newUsername || ''}
                                    onChange={(e) => setAdminData(p => ({ ...p, newUsername: e.target.value }))}
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        <div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-9 text-gray-400 w-5 h-5" />
                                <Input
                                    label="New Password"
                                    type="password"
                                    placeholder="Set new password"
                                    value={adminData.newPassword || ''}
                                    onChange={(e) => setAdminData(p => ({ ...p, newPassword: e.target.value }))}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="w-full sm:w-auto text-center sm:text-left">
                            {adminMessage.text && (
                                <span className={`${adminMessage.type === 'success' ? 'text-green-600' : 'text-red-600'} font-medium animate-in fade-in`}>
                                    {adminMessage.text}
                                </span>
                            )}
                        </div>
                        <Button
                            type="submit"
                            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white w-full sm:w-auto"
                        >
                            <Save className="w-4 h-4" />
                            Update Credentials
                        </Button>
                    </div>
                </form>
            </Card>
        </div >
    );
};

export default SettingsManager;
