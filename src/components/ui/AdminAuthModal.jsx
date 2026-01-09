import React, { useState } from 'react';
import { Modal } from './Modal';
import { Input } from './Input';
import { Button } from './Button';
import { ShieldCheck, Lock } from 'lucide-react';
import { useData } from '../../contexts/DataContext';

export const AdminAuthModal = ({ isOpen, onClose, onSuccess, title = "Security Check", message = "Please enter admin credentials to confirm." }) => {
    const { validateAdmin } = useData();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        if (validateAdmin(username, password)) {
            onSuccess();
            handleClose();
        } else {
            setError('Invalid Admin Credentials');
        }
    };

    const handleClose = () => {
        setUsername('');
        setPassword('');
        setError('');
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={title}
        >
            <div className="space-y-4">
                <div className="flex items-center gap-3 bg-indigo-50 p-3 rounded-lg border border-indigo-100 mb-4">
                    <ShieldCheck className="w-6 h-6 text-indigo-600" />
                    <p className="text-sm text-indigo-800">{message}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Admin Username"
                        placeholder="Enter username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        autoFocus
                    />
                    <Input
                        label="Admin Password"
                        type="password"
                        placeholder="Enter password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    {error && (
                        <p className="text-sm text-center text-red-500 bg-red-50 p-2 rounded border border-red-100 animate-pulse">
                            {error}
                        </p>
                    )}

                    <div className="flex gap-2 pt-2">
                        <Button type="button" onClick={handleClose} className="flex-1 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200">
                            Cancel
                        </Button>
                        <Button type="submit" className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
                            <Lock className="w-4 h-4" />
                            Verify & Proceed
                        </Button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};
