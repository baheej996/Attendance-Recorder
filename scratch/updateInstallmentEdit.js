const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/components/office/OfficeFeeManagement.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Target block for Installment Selection cards
const targetCards = `                                     {/* Installment Selection */}
                                     <div>
                                         <label className="block text-xs font-bold text-gray-700 mb-1">Select Installment / Term:</label>
                                         <div className="grid grid-cols-3 gap-2">
                                             {[
                                                 { key: 'inst1', name: activeFeeStruct?.installments?.inst1?.name || 'Inst 1', paid: studentTotals.inst1Paid, due: activeFeeStruct?.installments?.inst1?.amount || 5000 },
                                                 { key: 'inst2', name: activeFeeStruct?.installments?.inst2?.name || 'Inst 2', paid: studentTotals.inst2Paid, due: activeFeeStruct?.installments?.inst2?.amount || 5000 },
                                                 { key: 'inst3', name: activeFeeStruct?.installments?.inst3?.name || 'Inst 3', paid: studentTotals.inst3Paid, due: activeFeeStruct?.installments?.inst3?.amount || 5000 }
                                             ].map(inst => (
                                                 <button
                                                     type="button"
                                                     key={inst.key}
                                                     onClick={() => setSelectedInstallmentKey(inst.key)}
                                                     className={\`p-3 rounded-xl border text-left transition-all \${
                                                         selectedInstallmentKey === inst.key ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500' : 'border-gray-200 hover:bg-gray-50'
                                                     }\`}
                                                 >
                                                     <p className="text-xs font-extrabold text-gray-900 truncate">{inst.name}</p>
                                                     <p className="text-[11px] font-bold text-gray-500 mt-1">Due: ₹{inst.due.toLocaleString()}</p>
                                                     <p className={\`text-[10px] font-black \${inst.paid >= inst.due ? 'text-emerald-600' : 'text-amber-600'}\`}>
                                                         Paid: ₹{inst.paid.toLocaleString()}
                                                     </p>
                                                 </button>
                                             ))}
                                         </div>
                                     </div>`;

const replacementCards = `                                     {/* Installment Selection */}
                                     <div>
                                         <label className="block text-xs font-bold text-gray-700 mb-1">Select Installment / Term:</label>
                                         <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                             {[
                                                 { key: 'inst1', name: activeFeeStruct?.installments?.inst1?.name || 'Installment 1 (Admission)', paid: studentTotals.inst1Paid, due: activeFeeStruct?.installments?.inst1?.amount ?? 1750 },
                                                 { key: 'inst2', name: activeFeeStruct?.installments?.inst2?.name || 'Installment 2 (Mid-Term)', paid: studentTotals.inst2Paid, due: activeFeeStruct?.installments?.inst2?.amount ?? 1750 },
                                                 { key: 'inst3', name: activeFeeStruct?.installments?.inst3?.name || 'Installment 3 (Final Term)', paid: studentTotals.inst3Paid, due: activeFeeStruct?.installments?.inst3?.amount ?? 1750 }
                                             ].map(inst => (
                                                 <div
                                                     key={inst.key}
                                                     onClick={() => setSelectedInstallmentKey(inst.key)}
                                                     className={\`p-3 rounded-xl border text-left transition-all relative group cursor-pointer \${
                                                         selectedInstallmentKey === inst.key ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500' : 'border-gray-200 hover:bg-gray-50'
                                                     }\`}
                                                 >
                                                     <div className="flex items-start justify-between gap-1">
                                                         <p className="text-xs font-extrabold text-gray-900 truncate pr-5" title={inst.name}>{inst.name}</p>
                                                         <button
                                                             type="button"
                                                             onClick={(e) => handleOpenEditInstModal(inst.key, e)}
                                                             title="Edit Installment Name & Amount"
                                                             className="p-1 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-white shadow-xs border border-transparent hover:border-gray-200 transition-all"
                                                         >
                                                             <Pencil className="w-3.5 h-3.5" />
                                                         </button>
                                                     </div>
                                                     <p className="text-[11px] font-bold text-gray-500 mt-1">Due: ₹{inst.due.toLocaleString()}</p>
                                                     <p className={\`text-[10px] font-black \${inst.paid >= inst.due ? 'text-emerald-600' : 'text-amber-600'}\`}>
                                                         Paid: ₹{inst.paid.toLocaleString()}
                                                     </p>
                                                 </div>
                                             ))}
                                         </div>
                                     </div>`;

// Normalize CR LF for matching
const normalize = str => str.replace(/\r\n/g, '\n');

let normContent = normalize(content);
let normTarget = normalize(targetCards);

if (!normContent.includes(normTarget)) {
    console.error('Target cards block not found!');
    process.exit(1);
}

normContent = normContent.replace(normTarget, normalize(replacementCards));

// 2. Add Modal before Live Floating Upload Progress Card
const modalTarget = `            {/* Live Floating Upload Progress Card */}`;

const modalJSX = `            {/* Edit Installment Details Modal */}
            {editingInstModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 mb-1">
                                    Edit Installment / Term
                                </span>
                                <h3 className="text-lg font-black text-slate-900 leading-tight">
                                    {selectedStudent?.name || 'Selected Student'}
                                </h3>
                                <p className="text-xs text-slate-500 font-medium">
                                    Reg No: <strong className="text-slate-700">{selectedStudent?.registerNo || 'N/A'}</strong> | Class: {selectedStudent?.className || 'Unassigned'}
                                </p>
                            </div>
                            <button
                                onClick={() => setEditingInstModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSaveInstEditSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Installment Label / Name:
                                </label>
                                <Input
                                    type="text"
                                    value={editingInstName}
                                    onChange={(e) => setEditingInstName(e.target.value)}
                                    placeholder="e.g. Installment 1 (Admission)"
                                    className="w-full text-sm font-semibold"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Installment Due Amount (₹):
                                </label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={editingInstAmount}
                                    onChange={(e) => setEditingInstAmount(e.target.value)}
                                    placeholder="e.g. 1750"
                                    className="w-full text-sm font-semibold"
                                    required
                                />
                            </div>

                            {selectedStudent?.classId && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Apply Changes To:
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setEditingInstScope('student')}
                                            className={\`p-2.5 text-xs font-bold rounded-xl border text-center transition-all \${
                                                editingInstScope === 'student'
                                                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500'
                                                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                            }\`}
                                        >
                                            This Student Only
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEditingInstScope('class')}
                                            className={\`p-2.5 text-xs font-bold rounded-xl border text-center transition-all \${
                                                editingInstScope === 'class'
                                                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500'
                                                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                            }\`}
                                        >
                                            Entire Class
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setEditingInstModalOpen(false)}
                                    className="text-xs py-2 px-4 font-bold"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    disabled={savingInstConfig}
                                    className="text-xs py-2 px-4 font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                                >
                                    {savingInstConfig ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Live Floating Upload Progress Card */}`;

if (!normContent.includes(modalTarget)) {
    console.error('Modal target block not found!');
    process.exit(1);
}

normContent = normContent.replace(modalTarget, modalJSX);

fs.writeFileSync(filePath, normContent, 'utf8');
console.log('Successfully updated OfficeFeeManagement.jsx with Installment Edit button & modal!');
