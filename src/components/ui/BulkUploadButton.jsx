import React, { useRef } from 'react';
import { Upload, Download, FileSpreadsheet, ChevronDown } from 'lucide-react';
import { generateCSVTemplate, parseCSV } from '../../utils/csvHelpers';
import { Button } from './Button';
import { useUI } from '../../contexts/UIContext';

export const BulkUploadButton = ({ type, onUploadSuccess }) => {
    const fileInputRef = useRef(null);
    const { showAlert } = useUI();

    const handleDownloadModel = () => {
        generateCSVTemplate(type);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const data = await parseCSV(file, type);
            onUploadSuccess(data);
            e.target.value = ''; // Reset input
        } catch (error) {
            showAlert('CSV Error', "Error parsing CSV: " + error, 'error');
        }
    };

    return (
        <div className="relative group inline-block">
            <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium text-sm">
                <FileSpreadsheet className="w-4 h-4" />
                Bulk Upload
                <ChevronDown className="w-3 h-3 opacity-70 group-hover:rotate-180 transition-transform" />
            </button>

            {/* Dropdown Menu */}
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all transform origin-top-right z-50">
                <div className="p-1">
                    <button
                        onClick={handleDownloadModel}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg transition-colors text-left"
                    >
                        <div className="p-1.5 bg-gray-100 rounded text-gray-500 group-hover:text-indigo-600">
                            <Download className="w-4 h-4" />
                        </div>
                        <div>
                            <span className="font-medium block">Download Model</span>
                            <span className="text-xs text-gray-400">Get CSV template</span>
                        </div>
                    </button>

                    <div className="h-px bg-gray-100 my-1"></div>

                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg transition-colors text-left"
                    >
                        <div className="p-1.5 bg-gray-100 rounded text-gray-500 group-hover:text-indigo-600">
                            <Upload className="w-4 h-4" />
                        </div>
                        <div>
                            <span className="font-medium block">Upload CSV</span>
                            <span className="text-xs text-gray-400">Import your data</span>
                        </div>
                    </button>
                </div>
            </div>

            <input
                type="file"
                accept=".csv"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileUpload}
            />
        </div>
    );
};
