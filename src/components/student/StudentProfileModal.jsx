import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useData } from '../../contexts/DataContext';
import { Save, User, MapPin, Phone, MessageSquare, ShieldAlert, MonitorSmartphone } from 'lucide-react';
import { useUI } from '../../contexts/UIContext';
import { Country, State } from 'country-state-city';
import { SearchableSelect } from '../ui/SearchableSelect';

const StudentProfileModal = ({ isOpen, onClose, currentUser }) => {
    const { updateStudent, classes, mentors, addAdminRequest } = useData();
    const { showAlert } = useUI();
    
    const [formData, setFormData] = useState({
        fatherName: '',
        fatherOccupation: '',
        motherName: '',
        identificationMark: '',
        houseName: '',
        aadhaarNumber: '',
        dob: '',
        pinCode: '',
        postOffice: '',
        deviceUsed: '',
        internetAvailability: '',
        livingCountry: '',
        livingState: '',
        nativeCountry: '',
        nativeState: '',
        contactNo: '',
        whatsappNo: ''
    });
    
    const [isSaving, setIsSaving] = useState(false);
    const [isRequesting, setIsRequesting] = useState(false);
    const [showRequestInput, setShowRequestInput] = useState(false);
    const [requestDescription, setRequestDescription] = useState('');
    
    useEffect(() => {
        if (currentUser) {
            setFormData({
                fatherName: currentUser.fatherName || '',
                fatherOccupation: currentUser.fatherOccupation || '',
                motherName: currentUser.motherName || '',
                identificationMark: currentUser.identificationMark || '',
                houseName: currentUser.houseName || '',
                aadhaarNumber: currentUser.aadhaarNumber || '',
                dob: currentUser.dob || '',
                pinCode: currentUser.pinCode || '',
                postOffice: currentUser.postOffice || '',
                deviceUsed: currentUser.deviceUsed || '',
                internetAvailability: currentUser.internetAvailability || '',
                livingCountry: currentUser.livingCountry || '',
                livingState: currentUser.livingState || '',
                nativeCountry: currentUser.nativeCountry || '',
                nativeState: currentUser.nativeState || '',
                contactNo: currentUser.contactNo || '',
                whatsappNo: currentUser.whatsappNo || ''
            });
        }
    }, [currentUser, isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name, value) => {
        setFormData(prev => ({ 
            ...prev, 
            [name]: value,
            // Reset state if country changes
            ...(name === 'livingCountry' && { livingState: '' }),
            ...(name === 'nativeCountry' && { nativeState: '' }),
        }));
    };

    const countries = Country.getAllCountries().map(c => ({ id: c.name, label: c.name, isoCode: c.isoCode }));
    
    const livingCountryObj = countries.find(c => c.id === formData.livingCountry);
    const livingStates = livingCountryObj 
        ? State.getStatesOfCountry(livingCountryObj.isoCode).map(s => ({ id: s.name, label: s.name }))
        : [];

    const nativeCountryObj = countries.find(c => c.id === formData.nativeCountry);
    const nativeStates = nativeCountryObj 
        ? State.getStatesOfCountry(nativeCountryObj.isoCode).map(s => ({ id: s.name, label: s.name }))
        : [];

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateStudent(currentUser.id, formData);
            showAlert('Success', 'Personal details updated successfully.', 'success');
            onClose();
        } catch (error) {
            console.error("Profile update error:", error);
            showAlert('Error', `Failed to update details: ${error.message || 'Unknown error'}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleRequestChange = async () => {
        if (!requestDescription.trim()) {
            showAlert('Error', 'Please describe the needed changes.', 'error');
            return;
        }
        setIsRequesting(true);
        try {
            await addAdminRequest({
                type: 'Profile Edit Request',
                studentId: currentUser.id,
                studentName: currentUser.name,
                classId: currentUser.classId,
                status: 'Pending',
                message: `Student ${currentUser.name} requested changes to their bio: ${requestDescription}`,
                timestamp: new Date().toISOString()
            });
            showAlert('Request Sent', 'Your request has been sent to the admin.', 'success');
            setShowRequestInput(false);
            setRequestDescription('');
        } catch (error) {
            showAlert('Error', 'Failed to send request.', 'error');
        } finally {
            setIsRequesting(false);
        }
    };

    const studentClass = classes?.find(c => c.id === currentUser?.classId);
    const assignedMentor = mentors?.find(m => m.assignedClassIds?.includes(currentUser?.classId));

    if (!currentUser) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="My Profile" size="2xl">
            <div className="space-y-6">
                {/* Read-Only Bio Section */}
                <div className="bg-indigo-600 rounded-2xl p-5 border border-indigo-700 relative overflow-hidden shadow-md">
                    <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                        <User className="w-32 h-32 text-white" />
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 relative z-10 gap-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <ShieldAlert className="w-5 h-5 text-indigo-200" />
                            Official Bio
                        </h3>
                        <Button 
                            onClick={() => setShowRequestInput(!showRequestInput)} 
                            className="bg-white/10 border border-white/20 text-white hover:bg-white/20 shrink-0 text-xs py-1.5 px-3"
                        >
                            {showRequestInput ? 'Cancel Request' : 'Request Changes'}
                        </Button>
                    </div>
                    
                    {showRequestInput && (
                        <div className="mb-4 relative z-10 bg-white/10 p-4 rounded-xl border border-white/20">
                            <p className="text-sm text-indigo-100 mb-2 font-medium">Describe the changes you need:</p>
                            <textarea
                                className="w-full bg-white text-gray-900 placeholder-gray-400 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 min-h-[80px]"
                                placeholder="E.g. My register number is incorrect..."
                                value={requestDescription}
                                onChange={(e) => setRequestDescription(e.target.value)}
                            />
                            <div className="mt-3 flex justify-end">
                                <Button
                                    onClick={handleRequestChange}
                                    disabled={isRequesting || !requestDescription.trim()}
                                    className="bg-indigo-500 hover:bg-indigo-400 text-white text-xs px-4 py-1.5"
                                >
                                    {isRequesting ? 'Sending...' : 'Submit Request'}
                                </Button>
                            </div>
                        </div>
                    )}
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 relative z-10">
                        <div>
                            <p className="text-xs text-indigo-200 font-medium uppercase tracking-wider mb-1">Full Name</p>
                            <p className="font-semibold text-white">{currentUser.name}</p>
                        </div>
                        <div>
                            <p className="text-xs text-indigo-200 font-medium uppercase tracking-wider mb-1">Register No.</p>
                            <p className="font-semibold text-white">{currentUser.registerNo || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-indigo-200 font-medium uppercase tracking-wider mb-1">Gender</p>
                            <p className="font-semibold text-white">{currentUser.gender || 'Not specified'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-indigo-200 font-medium uppercase tracking-wider mb-1">Class</p>
                            <p className="font-semibold text-white">
                                {studentClass ? `${studentClass.name} - ${studentClass.division}` : 'Not assigned'}
                            </p>
                        </div>
                        <div className="md:col-span-2">
                            <p className="text-xs text-indigo-200 font-medium uppercase tracking-wider mb-1">Assigned Mentor</p>
                            <p className="font-semibold text-white">{assignedMentor ? assignedMentor.name : 'No Mentor'}</p>
                        </div>
                    </div>
                </div>

                {/* Editable Personal Details */}
                <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <User className="w-5 h-5 text-indigo-600" />
                        Personal Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Date of Birth"
                            type="date"
                            name="dob"
                            value={formData.dob}
                            onChange={handleChange}
                        />
                        <Input
                            label="Aadhaar Number"
                            name="aadhaarNumber"
                            value={formData.aadhaarNumber}
                            onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '');
                                if (val.length <= 12) handleChange({ target: { name: 'aadhaarNumber', value: val } });
                            }}
                            placeholder="12-digit Aadhaar"
                        />
                        <Input
                            label="Father's Name"
                            name="fatherName"
                            value={formData.fatherName}
                            onChange={handleChange}
                            placeholder="Enter father's name"
                        />
                        <Input
                            label="Father's Occupation"
                            name="fatherOccupation"
                            value={formData.fatherOccupation}
                            onChange={handleChange}
                            placeholder="Enter father's occupation"
                        />
                        <Input
                            label="Mother's Name"
                            name="motherName"
                            value={formData.motherName}
                            onChange={handleChange}
                            placeholder="Enter mother's name"
                        />
                        <Input
                            label="Identification Mark"
                            name="identificationMark"
                            value={formData.identificationMark}
                            onChange={handleChange}
                            placeholder="E.g., A mole on the right cheek"
                        />
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-indigo-600" />
                        Location Details
                    </h3>
                    
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm font-semibold text-gray-700 mb-2">Address Details</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100 mb-4">
                                <Input
                                    label="House Name"
                                    name="houseName"
                                    value={formData.houseName}
                                    onChange={handleChange}
                                    placeholder="Enter house name"
                                />
                                <Input
                                    label="Post Office"
                                    name="postOffice"
                                    value={formData.postOffice}
                                    onChange={handleChange}
                                    placeholder="Enter post office"
                                />
                                <Input
                                    label="PIN Code"
                                    name="pinCode"
                                    value={formData.pinCode}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        if (val.length <= 6) handleChange({ target: { name: 'pinCode', value: val } });
                                    }}
                                    placeholder="6-digit PIN"
                                />
                            </div>
                        </div>

                        <div>
                            <p className="text-sm font-semibold text-gray-700 mb-2">Living Location</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <SearchableSelect
                                    label="Living Country"
                                    options={countries}
                                    value={formData.livingCountry}
                                    onChange={(val) => handleSelectChange('livingCountry', val)}
                                    placeholder="Select Country"
                                />
                                <SearchableSelect
                                    label="Living State"
                                    options={livingStates}
                                    value={formData.livingState}
                                    onChange={(val) => handleSelectChange('livingState', val)}
                                    placeholder={formData.livingCountry ? "Select State" : "Select Country First"}
                                    disabled={!formData.livingCountry}
                                />
                            </div>
                        </div>

                        <div>
                            <p className="text-sm font-semibold text-gray-700 mb-2">Native Location</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <SearchableSelect
                                    label="Native Country"
                                    options={countries}
                                    value={formData.nativeCountry}
                                    onChange={(val) => handleSelectChange('nativeCountry', val)}
                                    placeholder="Select Country"
                                />
                                <SearchableSelect
                                    label="Native State"
                                    options={nativeStates}
                                    value={formData.nativeState}
                                    onChange={(val) => handleSelectChange('nativeState', val)}
                                    placeholder={formData.nativeCountry ? "Select State" : "Select Country First"}
                                    disabled={!formData.nativeCountry}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Phone className="w-5 h-5 text-indigo-600" />
                        Contact Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Contact Number"
                            name="contactNo"
                            value={formData.contactNo}
                            onChange={handleChange}
                            placeholder="+1 234 567 8900"
                        />
                        <Input
                            label="WhatsApp Number"
                            name="whatsappNo"
                            value={formData.whatsappNo}
                            onChange={handleChange}
                            placeholder="+1 234 567 8900"
                        />
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <MonitorSmartphone className="w-5 h-5 text-indigo-600" />
                        Technical Setup
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-gray-700">Device Used</label>
                            <select
                                name="deviceUsed"
                                value={formData.deviceUsed}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-shadow bg-gray-50"
                            >
                                <option value="">Select Device</option>
                                <option value="Mobile">Mobile</option>
                                <option value="Tablet">Tablet</option>
                                <option value="Laptop/Desktop">Laptop/Desktop</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-gray-700">Internet Availability</label>
                            <select
                                name="internetAvailability"
                                value={formData.internetAvailability}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-shadow bg-gray-50"
                            >
                                <option value="">Select Internet Type</option>
                                <option value="WiFi">WiFi</option>
                                <option value="Mobile Data">Mobile Data</option>
                                <option value="None">None</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex justify-end">
                    <Button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 px-6">
                        <Save className="w-4 h-4" />
                        {isSaving ? 'Saving...' : 'Save Profile'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default StudentProfileModal;
