import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, CheckCircle2, XCircle, RotateCcw, Volume2, Trophy, ArrowRight, SkipForward } from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import { ARABIC_ALPHABET_LEVELS } from '../../../data/arabicLevelsData';
import confetti from 'canvas-confetti';

// Normalize Arabic text by removing diacritics (Tashkeel)
const stripTashkeel = (text) => {
    return text.replace(/[\u0617-\u061A\u064B-\u0652]/g, '').trim();
};

const ENCOURAGEMENTS = ["MashaAllah!", "Excellent!", "Great Job!", "Keep it up!", "Superb!", "Fantastic!", "Well Done!"];

// Advanced Phonetic & Synonym Mapping for 1st Graders
// This maps letter IDs (1-28) to all acceptable English and Arabic pronunciations
// that the Web Speech API might incorrectly (or correctly) return.
const ARABIC_SYNONYMS = {
    1: ['الف', 'ألف', 'ا', 'أ', 'إ', 'آ', 'alif', 'a', 'e', 'i', 'o', 'u', 'ee', 'oo'], // Alif
    2: ['با', 'باء', 'ب', 'به', 'ba', 'baa', 'b', 'be', 'bi', 'bee', 'bu', 'boo', 'bo', 'بي', 'بو'], // Ba
    3: ['تا', 'تاء', 'ت', 'ته', 'ta', 'taa', 't', 'te', 'ti', 'tee', 'tu', 'too', 'to', 'تي', 'تو'], // Ta
    4: ['ثا', 'ثاء', 'ث', 'ثه', 'tha', 'thaa', 'th', 'thi', 'thee', 'thu', 'thoo', 'tho', 'ثي', 'ثو'], // Tha
    5: ['جيم', 'ج', 'ja', 'jeem', 'j', 'geem', 'g', 'ji', 'jee', 'ju', 'joo', 'jo', 'جي', 'جو'], // Jeem
    6: ['حا', 'حاء', 'ح', 'حه', 'ha', 'haa', 'h', 'hi', 'hee', 'hu', 'hoo', 'ho', 'حي', 'حو'], // Ha
    7: ['خا', 'خاء', 'خ', 'خه', 'kha', 'khaa', 'kh', 'khi', 'khee', 'khu', 'khoo', 'kho', 'خي', 'خو'], // Kha
    8: ['دال', 'د', 'da', 'daal', 'd', 'di', 'dee', 'du', 'doo', 'do', 'دي', 'دو'], // Dal
    9: ['ذال', 'ذ', 'zhal', 'thaal', 'dh', 'z', 'th', 'dhi', 'dhee', 'dhu', 'dhoo', 'dho', 'ذي', 'ذو'], // Dhal
    10: ['را', 'راء', 'ر', 'ره', 'ra', 'raa', 'r', 'ri', 'ree', 'ru', 'roo', 'ro', 'ري', 'رو'], // Ra
    11: ['زا', 'زاء', 'ز', 'زين', 'زه', 'za', 'zaa', 'z', 'zi', 'zee', 'zu', 'zoo', 'zo', 'زي', 'زو'], // Zay
    12: ['سين', 'س', 'sa', 'seen', 's', 'si', 'see', 'su', 'soo', 'so', 'سي', 'سو'], // Seen
    13: ['شين', 'ش', 'sha', 'sheen', 'sh', 'shi', 'shee', 'shu', 'shoo', 'sho', 'شي', 'شو'], // Sheen
    14: ['صاد', 'ص', 'saad', 'sad', 's', 'si', 'see', 'su', 'soo', 'so', 'صي', 'صو'], // Saad
    15: ['ضاد', 'ض', 'dhaad', 'dhad', 'dh', 'd', 'dhi', 'dhee', 'dhu', 'dhoo', 'dho', 'ضي', 'ضو'], // Dhaad
    16: ['طا', 'طاء', 'ط', 'طه', 'ta', 'taa', 't', 'ti', 'tee', 'tu', 'too', 'to', 'طي', 'طو'], // Ta
    17: ['ظا', 'ظاء', 'ظ', 'ظه', 'zha', 'zhaa', 'zh', 'z', 'zhi', 'zhee', 'zhu', 'zhoo', 'zho', 'ظي', 'ظو'], // Zha
    18: ['عين', 'ع', 'ayn', 'ain', 'a', 'e', 'i', 'ee', 'u', 'oo', 'o', 'عي', 'عو'], // Ayn
    19: ['غين', 'غ', 'ghayn', 'ghain', 'gh', 'ghi', 'ghee', 'ghu', 'ghoo', 'gho', 'غي', 'غو'], // Ghayn
    20: ['فا', 'فاء', 'ف', 'فه', 'fa', 'faa', 'f', 'fi', 'fee', 'fu', 'foo', 'fo', 'في', 'فو'], // Fa
    21: ['قاف', 'ق', 'qaaf', 'qaf', 'q', 'qi', 'qee', 'qu', 'qoo', 'qo', 'قي', 'قو'], // Qaaf
    22: ['كاف', 'ك', 'kaaf', 'kaf', 'k', 'ki', 'kee', 'ku', 'koo', 'ko', 'كي', 'كو'], // Kaaf
    23: ['لام', 'ل', 'laam', 'lam', 'l', 'li', 'lee', 'lu', 'loo', 'lo', 'لي', 'لو'], // Laam
    24: ['ميم', 'م', 'meem', 'mim', 'm', 'mi', 'mee', 'mu', 'moo', 'mo', 'مي', 'مو'], // Meem
    25: ['نون', 'ن', 'noon', 'nun', 'n', 'ni', 'nee', 'nu', 'noo', 'no', 'ني', 'نو'], // Noon
    26: ['ها', 'هاء', 'ه', 'هـ', 'ha', 'haa', 'h', 'hi', 'hee', 'hu', 'hoo', 'ho', 'هي', 'هو'], // Ha
    27: ['واو', 'و', 'waaw', 'waw', 'w', 'o', 'u', 'v', 'wi', 'wee', 'wu', 'woo', 'وي', 'وو'], // Waw
    28: ['يا', 'ياء', 'ي', 'ى', 'ya', 'yaa', 'y', 'i', 'e', 'yi', 'yee', 'yu', 'yoo', 'yo', 'يي', 'يو'] // Ya
};

const ArabicSpellGame = ({ levelId = 1, initialStageIndex = 0, onComplete }) => {
    const { currentUser, gameProgress, updateGameProgress } = useData();
    const [currentStageIndex, setCurrentStageIndex] = useState(initialStageIndex);
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [feedback, setFeedback] = useState(null); // 'success', 'error', null
    const [hasSpeechSupport, setHasSpeechSupport] = useState(true);
    const [encouragement, setEncouragement] = useState("");
    const [failedAttempts, setFailedAttempts] = useState(0);
    
    // Play Audio (Text-to-Speech) for Listen & Repeat functionality
    const playTargetAudio = (text) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel(); // Stop current playing
            // Do NOT strip tashkeel here, otherwise the browser ignores the Harakath!
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'ar-SA';
            utterance.rate = 0.7; // Slower speed for 1st graders
            window.speechSynthesis.speak(utterance);
        }
    };
    
    // Sequence Mode State
    const [sequenceWords, setSequenceWords] = useState([]);
    const [currentSeqIndex, setCurrentSeqIndex] = useState(0);

    const recognitionRef = useRef(null);

    useEffect(() => {
        if (feedback === 'success') {
            setEncouragement(ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)]);
        }
    }, [feedback]);
    const levelData = ARABIC_ALPHABET_LEVELS.find(l => l.id === levelId) || ARABIC_ALPHABET_LEVELS[0];
    
    const LEVEL_STAGES = [
        { id: 0, type: 'letter', text: levelData.letter, instruction: 'Read the letter isolated' },
        { id: 1, type: 'haraka', text: levelData.fatha, instruction: 'Read the letter with Fatha' },
        { id: 2, type: 'haraka', text: levelData.kasra, instruction: 'Read the letter with Kasra' },
        { id: 3, type: 'haraka', text: levelData.damma, instruction: 'Read the letter with Damma' },
        { id: 4, type: 'haraka', text: levelData.tanweenDamma, instruction: 'Read the letter with Tanween Damma' },
        { id: 5, type: 'haraka', text: levelData.sukoon, instruction: 'Read the letter with Sukoon' },
        { id: 6, type: 'word', text: levelData.word, instruction: 'Read the full word' },
        { id: 7, type: 'sequence', text: levelData.sequence, instruction: 'Read the words one by one' }
    ];

    const stage = LEVEL_STAGES[currentStageIndex];
    const isSequence = stage.type === 'sequence';

    // Initialize sequence state when entering a sequence stage
    useEffect(() => {
        if (isSequence) {
            const words = stage.text.split(/[,،]/).map(w => w.trim()).filter(w => w.length > 0);
            const progress = gameProgress.find(g => g.studentId === currentUser.id);
            const savedSequence = progress?.sequenceProgress?.[levelId] || {};
            
            const initialWords = words.map((w, idx) => {
                let status = 'pending';
                if (savedSequence.correctIndices?.includes(idx)) status = 'correct';
                else if (savedSequence.incorrectIndices?.includes(idx)) status = 'incorrect';
                return { word: w, status };
            });

            setSequenceWords(initialWords);
            
            // Focus on the first pending or incorrect word
            const firstIncomplete = initialWords.findIndex(w => w.status !== 'correct');
            setCurrentSeqIndex(firstIncomplete !== -1 ? firstIncomplete : 0);
        }
    }, [currentStageIndex, isSequence, stage.text, levelId]);

    useEffect(() => {
        // Initialize Speech Recognition
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'ar-SA'; // Arabic

            recognitionRef.current.onstart = () => {
                setIsListening(true);
                setFeedback(null);
                setTranscript('');
            };

            recognitionRef.current.onresult = (event) => {
                let currentTranscript = '';
                let isFinal = false;
                
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    currentTranscript += event.results[i][0].transcript + ' ';
                    if (event.results[i].isFinal) isFinal = true;
                }
                
                const cleanTranscript = currentTranscript.trim();
                setTranscript(cleanTranscript);
                
                const isSuccess = validateSpeech(cleanTranscript, isFinal);
                if (isSuccess) {
                    recognitionRef.current?.stop();
                }
            };

            recognitionRef.current.onerror = (event) => {
                console.error("Speech recognition error", event.error);
                setIsListening(false);
                if (event.error !== 'no-speech') {
                    if (!isSequence) setFeedback('error');
                    // In sequence mode, we just keep trying or show error on current word
                    if (isSequence) handleSequenceError();
                }
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
        } else {
            setHasSpeechSupport(false);
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, [currentStageIndex, levelId, isSequence, currentSeqIndex, sequenceWords]);

    const validateSpeech = (spokenText, isFinal = false) => {
        let normalizedSpoken = stripTashkeel(spokenText).toLowerCase();

        if (isSequence) {
            const targetWord = sequenceWords[currentSeqIndex].word;
            let normalizedTarget = stripTashkeel(targetWord).toLowerCase();
            
            if (normalizedSpoken.includes(normalizedTarget) || normalizedTarget.includes(normalizedSpoken)) {
                handleSequenceSuccess();
                return true;
            } else if (isFinal) {
                setFailedAttempts(prev => prev + 1);
                handleSequenceError();
            }
            return false;
        }

        const targetText = stage.text;
        let normalizedTarget = stripTashkeel(targetText).toLowerCase();

        // Word check
        if (stage.type === 'word') {
            if (normalizedSpoken.includes(normalizedTarget) || normalizedTarget.includes(normalizedSpoken)) {
                handleStageComplete();
                return true;
            } else if (isFinal) {
                setFailedAttempts(prev => prev + 1);
                setFeedback('error');
            }
            return false;
        }

        // Haraka/Letter check - Smart Fuzzy Match Engine using Synonyms
        if (stage.type === 'letter' || stage.type === 'haraka') {
            const synonyms = ARABIC_SYNONYMS[levelId] || [];
            
            // Accept if: 
            // 1. Spoken contains any accepted synonym
            // 2. Spoken contains target exact letter
            // 3. Target contains spoken
            const isMatch = synonyms.some(syn => normalizedSpoken.includes(syn.toLowerCase())) || 
                            normalizedSpoken.includes(normalizedTarget) || 
                            (normalizedTarget.includes(normalizedSpoken) && normalizedSpoken.length > 0);

            if (isMatch) {
                handleStageComplete();
                return true;
            } else if (isFinal) {
                setFailedAttempts(prev => prev + 1);
                setFeedback('error');
            }
            return false;
        }
    };

    const saveSequenceWordProgress = async (updatedWords) => {
        try {
            const progress = gameProgress.find(g => g.studentId === currentUser.id);
            const currentSeqProgress = progress?.sequenceProgress || {};
            
            const correctIndices = updatedWords
                .map((w, idx) => w.status === 'correct' ? idx : -1)
                .filter(idx => idx !== -1);
            
            const incorrectIndices = updatedWords
                .map((w, idx) => w.status === 'incorrect' ? idx : -1)
                .filter(idx => idx !== -1);

            await updateGameProgress(currentUser.id, {
                sequenceProgress: {
                    ...currentSeqProgress,
                    [levelId]: { correctIndices, incorrectIndices }
                }
            });
        } catch (error) {
            console.error("Failed to save sequence progress:", error);
        }
    };

    const handleSequenceSuccess = () => {
        const nextWords = [...sequenceWords];
        nextWords[currentSeqIndex].status = 'correct';
        setSequenceWords(nextWords);
        setTranscript('');
        saveSequenceWordProgress(nextWords);
        
        // Find the very next word that isn't correct yet
        const nextIncomplete = nextWords.findIndex((w, idx) => idx > currentSeqIndex && w.status !== 'correct');
        
        if (nextIncomplete !== -1) {
            // Jump to the next word that needs attention
            setCurrentSeqIndex(nextIncomplete);
        } else {
            // No more incomplete words ahead, check if the whole sequence is now perfect
            checkSequenceCompletion(nextWords);
        }
    };

    const handleSequenceError = () => {
        const nextWords = [...sequenceWords];
        nextWords[currentSeqIndex].status = 'incorrect';
        setSequenceWords(nextWords);
        setTranscript('');
        saveSequenceWordProgress(nextWords);
        
        // On error, just move to the very next word regardless of its status to allow free reading
        if (currentSeqIndex < nextWords.length - 1) {
            setCurrentSeqIndex(currentSeqIndex + 1);
        } else {
            checkSequenceCompletion(nextWords);
        }
    };

    const checkSequenceCompletion = (words) => {
        const allCorrect = words.every(w => w.status === 'correct');
        if (allCorrect) {
            handleStageComplete();
        } else {
            // If not all correct and we've reached the end, jump back to the first error
            const firstRetry = words.findIndex(w => w.status !== 'correct');
            if (firstRetry !== -1) {
                setCurrentSeqIndex(firstRetry);
            }
        }
    };

    const retrySequenceWord = (index) => {
        const newWords = [...sequenceWords];
        newWords[index].status = 'pending';
        setSequenceWords(newWords);
        setCurrentSeqIndex(index);
        setTranscript('');
    };

    const saveStageProgress = async () => {
        try {
            const progress = gameProgress.find(g => g.studentId === currentUser.id);
            const currentCompletedStages = progress?.completedStages || {};
            // Ensure we use string for the key to match Firestore map structure
            const strLevelId = String(levelId);
            const levelCompletedStages = currentCompletedStages[strLevelId] || [];
            
            if (!levelCompletedStages.includes(currentStageIndex)) {
                const newCompletedForLevel = [...levelCompletedStages, currentStageIndex];
                const updatedCompletedStages = { 
                    ...currentCompletedStages, 
                    [strLevelId]: newCompletedForLevel 
                };
                
                // If all 8 stages are done, potentially bump highestLevelCompleted
                let highest = progress?.highestLevelCompleted || 0;
                if (newCompletedForLevel.length === 8 && highest < levelId) {
                    highest = levelId;
                }

                await updateGameProgress(currentUser.id, {
                    completedStages: updatedCompletedStages,
                    highestLevelCompleted: highest
                });
            }
        } catch (error) {
            console.error("Failed to save progress:", error);
        }
    };

    const handleStageComplete = async () => {
        setFeedback('success');
        setFailedAttempts(0); // Reset fails for next stage
        
        // Trigger Confetti Explosion!
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#4F46E5', '#10B981', '#F59E0B', '#EF4444']
        });

        await saveStageProgress();
        setTimeout(() => {
            if (onComplete) onComplete();
        }, 2000);
    };

    const skipStage = () => {
        // Just go back to the menu without saving
        if (onComplete) onComplete();
    };

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
        } else {
            try {
                recognitionRef.current?.start();
            } catch (err) {
                console.error("Could not start listening", err);
            }
        }
    };

    if (!hasSpeechSupport) {
        return (
            <div className="p-8 text-center bg-red-50 rounded-2xl border border-red-200">
                <Volume2 className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-red-700 mb-2">Browser Not Supported</h3>
                <p className="text-red-600">Your browser does not support the Web Speech API required for this game.</p>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto">
            {/* Main Game Card */}
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`bg-white rounded-3xl shadow-xl border-2 p-6 md:p-8 text-center relative ${
                    feedback === 'success' ? 'border-emerald-400 shadow-emerald-100' : 
                    feedback === 'error' ? 'border-red-400 shadow-red-100' : 'border-indigo-100'
                }`}
            >
                <div className="flex justify-between items-center mb-8 border-b pb-4">
                    <h3 className="text-gray-500 font-bold uppercase tracking-widest text-sm">{stage.instruction}</h3>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => playTargetAudio(isSequence ? sequenceWords[currentSeqIndex]?.word : stage.text)}
                            className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                        >
                            <Volume2 className="w-4 h-4" /> Listen
                        </button>
                        <button 
                            onClick={skipStage}
                            className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 font-medium bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors"
                        >
                            Skip <SkipForward className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                
                {/* Regular Stage View */}
                {!isSequence && (
                    <div className="py-12 flex justify-center items-center min-h-[200px]">
                        <span className="text-7xl md:text-[100px] font-arabic font-bold text-gray-900 leading-tight drop-shadow-sm" dir="rtl">
                            {stage.text}
                        </span>
                    </div>
                )}

                {/* Sequence Stage View */}
                {isSequence && (
                    <div className="py-6 min-h-[200px]">
                        <div className="flex flex-wrap justify-center gap-4" dir="rtl">
                            {sequenceWords.map((item, idx) => (
                                <div key={idx} className="relative group">
                                    <div className={`
                                        px-4 py-3 md:px-6 md:py-4 rounded-2xl text-2xl md:text-4xl font-arabic font-bold transition-all border-2
                                        ${idx === currentSeqIndex ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md scale-105' : ''}
                                        ${item.status === 'correct' ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : ''}
                                        ${item.status === 'incorrect' ? 'border-red-200 bg-red-50 text-red-600' : ''}
                                        ${item.status === 'pending' && idx !== currentSeqIndex ? 'border-gray-100 bg-white text-gray-500' : ''}
                                    `}>
                                        {item.word}
                                    </div>
                                    
                                    {/* Status Icons & Retry */}
                                    <div className="absolute -top-3 -right-3">
                                        {item.status === 'correct' && (
                                            <div className="bg-emerald-500 rounded-full p-1 shadow-sm">
                                                <CheckCircle2 className="w-5 h-5 text-white" />
                                            </div>
                                        )}
                                    </div>
                                    
                                    {item.status === 'incorrect' && (
                                        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex flex-col gap-1 w-max z-10">
                                            <button 
                                                onClick={() => retrySequenceWord(idx)}
                                                className="bg-red-500 hover:bg-red-600 text-white rounded-full px-3 py-1 flex items-center justify-center gap-1 shadow-md text-xs font-bold transition-colors w-full"
                                            >
                                                <RotateCcw className="w-3 h-3" /> Retry
                                            </button>
                                            {failedAttempts >= 2 && (
                                                <button 
                                                    onClick={() => {
                                                        const nextWords = [...sequenceWords];
                                                        nextWords[idx].status = 'correct';
                                                        setSequenceWords(nextWords);
                                                        saveSequenceWordProgress(nextWords);
                                                        setFailedAttempts(0);
                                                        checkSequenceCompletion(nextWords);
                                                    }}
                                                    className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full px-3 py-1 flex items-center justify-center gap-1 shadow-md text-xs font-bold transition-colors w-full"
                                                >
                                                    <ArrowRight className="w-3 h-3" /> Magic Pass
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Feedback Indicator for Non-Sequence */}
                {!isSequence && (
                    <div className="h-16 flex items-center justify-center">
                        <AnimatePresence mode="wait">
                            {feedback === 'success' && (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.5 }} 
                                    animate={{ opacity: 1, scale: 1 }} 
                                    exit={{ opacity: 0 }}
                                    className="flex flex-col items-center gap-2 text-emerald-600 font-bold"
                                >
                                    <div className="flex items-center gap-2 text-2xl">
                                        <CheckCircle2 className="w-10 h-10" /> {encouragement}
                                    </div>
                                    <div className="text-sm font-medium">Stage Completed!</div>
                                </motion.div>
                            )}
                            {feedback === 'error' && (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.5 }} 
                                    animate={{ opacity: 1, scale: 1 }} 
                                    exit={{ opacity: 0 }}
                                    className="flex flex-col items-center gap-1 text-red-500 font-bold"
                                >
                                    <div className="flex items-center gap-2 text-lg">
                                        <XCircle className="w-6 h-6" /> Not quite right.
                                    </div>
                                    {transcript && <div className="text-sm font-normal text-gray-500">Heard: {transcript}</div>}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                {/* Microphone / Retry Button */}
                <div className="mt-8">
                    {feedback === 'error' && !isSequence ? (
                        <div className="flex flex-col items-center gap-3">
                            <button
                                onClick={() => {
                                    setFeedback(null);
                                    setTranscript('');
                                    toggleListening();
                                }}
                                className="flex items-center gap-2 justify-center px-8 py-4 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl transition-all shadow-sm hover:shadow-md hover:-translate-y-1 w-full max-w-xs"
                            >
                                <RotateCcw className="w-6 h-6" />
                                Try Again
                            </button>
                            
                            {/* Auto-Pass Magic Button after 2 failed attempts */}
                            {failedAttempts >= 2 && (
                                <motion.button
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    onClick={handleStageComplete}
                                    className="flex items-center gap-2 justify-center px-6 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-bold rounded-lg transition-all border border-emerald-200 w-full max-w-xs"
                                >
                                    <ArrowRight className="w-4 h-4" /> Let's Move On (Magic Pass)
                                </motion.button>
                            )}
                        </div>
                    ) : (
                        <>
                            <button
                                onClick={toggleListening}
                                className={`relative flex items-center justify-center w-24 h-24 rounded-full mx-auto transition-all shadow-lg ${
                                    isListening 
                                    ? 'bg-red-500 text-white hover:bg-red-600 scale-110 shadow-red-500/50' 
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105 shadow-indigo-600/30'
                                }`}
                            >
                                {isListening && (
                                    <span className="absolute w-full h-full rounded-full bg-red-400 opacity-50 animate-ping"></span>
                                )}
                                {isListening ? <MicOff className="w-10 h-10 relative z-10" /> : <Mic className="w-10 h-10 relative z-10" />}
                            </button>
                            <p className="mt-4 text-gray-500 font-medium">
                                {isListening ? "Listening... Speak now" : "Tap the microphone and read"}
                            </p>
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default ArabicSpellGame;
