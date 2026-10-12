const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/components/office/OfficeFeeManagement.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove old modal states and replace with new auto-prefill useEffect
const oldStateMarker = `    // Edit Installment Modal State
    const [editingInstModalOpen, setEditingInstModalOpen] = useState(false);
    const [editingInstKey, setEditingInstKey] = useState(null);
    const [editingInstName, setEditingInstName] = useState('');
    const [editingInstAmount, setEditingInstAmount] = useState('');
    const [editingInstScope, setEditingInstScope] = useState('student');
    const [savingInstConfig, setSavingInstConfig] = useState(false);`;

const newStateCode = `    // Auto-prefill installment amount when selected student changes
    useEffect(() => {
        if (selectedStudent) {
            const inst1Due = activeFeeStruct?.installments?.inst1?.amount ?? 1750;
            const inst1Paid = studentTotals.inst1Paid || 0;
            const rem = Math.max(0, inst1Due - inst1Paid);
            setCustomPayAmount(String(rem > 0 ? rem : inst1Due));
            setSelectedInstallmentKey('inst1');
        } else {
            setCustomPayAmount('');
        }
    }, [selectedStudentId]);`;

// Normalize CR LF
const norm = str => str.replace(/\r\n/g, '\n');
let normContent = norm(content);

if (normContent.includes(norm(oldStateMarker))) {
    normContent = normContent.replace(norm(oldStateMarker), norm(newStateCode));
}

// 2. Replace old modal handlers (handleOpenEditInstModal & handleSaveInstEditSubmit) with handleSelectInstallment
const startHandlers = normContent.indexOf('    // Edit Installment Details Handlers');
const endHandlers = normContent.indexOf('    // Delete Fee Payment Transaction');

if (startHandlers !== -1 && endHandlers !== -1 && endHandlers > startHandlers) {
    const newHandlerCode = `    // Select & Edit Installment Amount / Payment Mode Handler
    const handleSelectInstallment = (instKey, due, paid) => {
        setSelectedInstallmentKey(instKey);
        const remainingDue = Math.max(0, Number(due || 0) - Number(paid || 0));
        const fillAmount = remainingDue > 0 ? remainingDue : (Number(due) || 1750);
        setCustomPayAmount(String(fillAmount));

        setTimeout(() => {
            const inputEl = document.getElementById('customPayAmountInput');
            if (inputEl) {
                inputEl.focus();
                if (typeof inputEl.select === 'function') inputEl.select();
            }
        }, 50);
    };\n\n`;

    normContent = normContent.slice(0, startHandlers) + newHandlerCode + normContent.slice(endHandlers);
} else {
    console.error('Handlers markers not found!');
    process.exit(1);
}

// 3. Update Installment Cards map call
const cardsStart = normContent.indexOf('{/* Installment Selection */}');
const cardsEnd = normContent.indexOf('</div>\n                                    </div>\n\n                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">', cardsStart);

if (cardsStart !== -1 && cardsEnd !== -1) {
    const newCardsBlock = `{/* Installment Selection */}
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
                                                    onClick={() => handleSelectInstallment(inst.key, inst.due, inst.paid)}
                                                    className={\`p-3 rounded-xl border text-left transition-all relative group cursor-pointer \${
                                                        selectedInstallmentKey === inst.key ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500' : 'border-gray-200 hover:bg-gray-50'
                                                    }\`}
                                                >
                                                    <div className="flex items-start justify-between gap-1">
                                                        <p className="text-xs font-extrabold text-gray-900 truncate pr-5" title={inst.name}>{inst.name}</p>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleSelectInstallment(inst.key, inst.due, inst.paid);
                                                            }}
                                                            title="Edit Amount & Payment Mode in fields below"
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

    normContent = normContent.slice(0, cardsStart) + newCardsBlock + normContent.slice(cardsEnd + '</div>\n                                    </div>'.length);
} else {
    console.error('Cards block indices not found!', cardsStart, cardsEnd);
    process.exit(1);
}

// 4. Update customPayAmount Input field to add id="customPayAmountInput"
const amountInputOld = `<Input
                                                type="number"
                                                value={customPayAmount}`;
const amountInputNew = `<Input
                                                id="customPayAmountInput"
                                                type="number"
                                                value={customPayAmount}`;

if (normContent.includes(amountInputOld)) {
    normContent = normContent.replace(amountInputOld, amountInputNew);
}

// 5. Remove Modal JSX Block
const modalStart = normContent.indexOf('{/* Edit Installment Details Modal */}');
const modalEnd = normContent.indexOf('{/* Live Floating Upload Progress Card */}');

if (modalStart !== -1 && modalEnd !== -1) {
    normContent = normContent.slice(0, modalStart) + normContent.slice(modalEnd);
}

fs.writeFileSync(filePath, normContent, 'utf8');
console.log('SUCCESSFULLY UPDATED OfficeFeeManagement.jsx with inline edit behavior!');
