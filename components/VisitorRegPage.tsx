import React, { useState, useRef, useEffect, useCallback } from 'react';
import { School, AdminUser, ExtractedIdData, VisitorLog } from '../types';
import * as apiService from '../services/apiService';
import * as visitorService from '../services/visitorService';
import ConfirmationModal from './ConfirmationModal';
import UserAvatar from './UserAvatar';

declare var QRCode: any;

const fileToBase64 = (file: File): Promise<{ data: string, mime: string }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            resolve({
                data: result.split(',')[1],
                mime: result.match(/:(.*?);/)?.[1] || 'image/jpeg'
            });
        };
        reader.onerror = error => reject(error);
    });
};

interface VisitorRegPageProps {
    school: School;
    user: AdminUser;
}

const VisitorRegPage: React.FC<VisitorRegPageProps> = ({ school, user }) => {
    const [activeTab, setActiveTab] = useState<'check_in_out' | 'logs'>('check_in_out');
    const [logs, setLogs] = useState<VisitorLog[]>([]);

    // Check-in State
    const [idFront, setIdFront] = useState<{ preview: string; base64: string } | null>(null);
    const [idBack, setIdBack] = useState<{ preview: string; base64: string } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [extractedData, setExtractedData] = useState<ExtractedIdData | null>(null);
    const [reasonForVisit, setReasonForVisit] = useState('');
    const [personToSee, setPersonToSee] = useState('');
    const [generatedPass, setGeneratedPass] = useState<VisitorLog | null>(null);

    // Check-out State
    const [passNumberOut, setPassNumberOut] = useState('');
    const [checkOutFeedback, setCheckOutFeedback] = useState({ type: '', message: '' });

    const qrCodeRef = useRef<HTMLDivElement>(null);

    const refreshLogs = useCallback(() => {
        setLogs(visitorService.getVisitorLogsForSchool(school.id));
    }, [school.id]);

    useEffect(() => {
        refreshLogs();
    }, [refreshLogs]);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
        const file = e.target.files?.[0];
        if (file) {
            const preview = URL.createObjectURL(file);
            const { data } = await fileToBase64(file);
            if (side === 'front') setIdFront({ preview, base64: data });
            else setIdBack({ preview, base64: data });
        }
    };

    const handleProcessIds = async () => {
        if (!idFront) {
            setError("Front of ID is required.");
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const data = await apiService.extractDetailsFromIdCard(idFront.base64, idBack?.base64);
            setExtractedData(data);
        } catch (err) {
            setError("AI could not process the ID images. Please try with clearer images.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGeneratePass = () => {
        if (!extractedData || !extractedData.fullName || !extractedData.idNumber || !reasonForVisit) {
            setError("Visitor name, ID number, and reason for visit are required.");
            return;
        }
        try {
            const newLog = visitorService.createVisitorLog({
                schoolId: school.id,
                visitorIdNumber: extractedData.idNumber,
                visitorName: extractedData.fullName,
                reasonForVisit,
                personToSee,
                idFrontImage: idFront!.preview,
                idBackImage: idBack?.preview,
                extractedData,
            });
            setGeneratedPass(newLog);
            refreshLogs();
        } catch (err) {
            setError((err as Error).message);
        }
    };
    
    useEffect(() => {
        if (generatedPass && qrCodeRef.current) {
            qrCodeRef.current.innerHTML = ''; // Clear previous QR
            new QRCode(qrCodeRef.current, {
                text: generatedPass.passNumber,
                width: 128,
                height: 128,
            });
        }
    }, [generatedPass]);

    const handleCheckOut = () => {
        setCheckOutFeedback({ type: '', message: '' });
        if (!passNumberOut.trim()) return;
        try {
            const checkedOutLog = visitorService.checkoutVisitor(passNumberOut, school.id);
            setCheckOutFeedback({ type: 'success', message: `${checkedOutLog.visitorName} checked out successfully at ${new Date(checkedOutLog.exitTime!).toLocaleTimeString()}.` });
            setPassNumberOut('');
            refreshLogs();
        } catch (err) {
            setCheckOutFeedback({ type: 'error', message: (err as Error).message });
        }
    };

    const resetCheckIn = () => {
        setIdFront(null);
        setIdBack(null);
        setExtractedData(null);
        setReasonForVisit('');
        setPersonToSee('');
        setError('');
        setGeneratedPass(null);
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Visitor Registration</h2>
            <div className="flex items-center gap-2 p-1 bg-gray-800 rounded-lg">
                <button onClick={() => setActiveTab('check_in_out')} className={`w-full py-2 text-sm font-semibold rounded-md ${activeTab === 'check_in_out' ? 'bg-cyan-600' : 'hover:bg-gray-600'}`}>Check-in / Check-out</button>
                <button onClick={() => setActiveTab('logs')} className={`w-full py-2 text-sm font-semibold rounded-md ${activeTab === 'logs' ? 'bg-cyan-600' : 'hover:bg-gray-600'}`}>Visitor Logs</button>
            </div>

            {activeTab === 'check_in_out' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Check-in */}
                    <div className="bg-gray-800 p-6 rounded-lg space-y-4">
                        <h3 className="text-xl font-bold">New Visitor Check-in</h3>
                        {error && <div className="bg-red-500/20 text-red-300 p-3 rounded-md text-sm">{error}</div>}
                        
                        {!extractedData && !generatedPass && (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    {['front', 'back'].map(side => (
                                        <div key={side}>
                                            <label className="text-sm font-semibold block mb-2 capitalize">ID {side}</label>
                                            <label className="cursor-pointer flex flex-col items-center justify-center p-4 bg-gray-700 hover:bg-gray-600 rounded-lg border-2 border-dashed border-gray-500 h-32">
                                                {(side === 'front' ? idFront : idBack) ? (
                                                    <img src={(side === 'front' ? idFront : idBack)?.preview} alt={`ID ${side}`} className="max-h-full max-w-full object-contain" />
                                                ) : (
                                                    <span className="text-gray-400 text-xs">Click to upload or capture</span>
                                                )}
                                                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleFileSelect(e, side as 'front' | 'back')} />
                                            </label>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={handleProcessIds} disabled={isLoading || !idFront} className="w-full py-2 bg-cyan-600 hover:bg-cyan-700 rounded-md font-semibold disabled:bg-gray-500">
                                    {isLoading ? 'Processing with AI...' : 'Process ID(s)'}
                                </button>
                            </>
                        )}

                        {extractedData && !generatedPass && (
                            <div className="space-y-3 animate-fade-in-up">
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="text-xs text-gray-400">Full Name</label><p>{extractedData.fullName || 'N/A'}</p></div>
                                    <div><label className="text-xs text-gray-400">ID Number</label><p>{extractedData.idNumber || 'N/A'}</p></div>
                                    <div><label className="text-xs text-gray-400">ID Type</label><p>{extractedData.idType || 'N/A'}</p></div>
                                    <div><label className="text-xs text-gray-400">Date of Birth</label><p>{extractedData.dateOfBirth || 'N/A'}</p></div>
                                </div>
                                <div><label className="text-xs text-gray-400">Reason for Visit</label><input value={reasonForVisit} onChange={e => setReasonForVisit(e.target.value)} required className="w-full p-2 bg-gray-700 rounded mt-1" /></div>
                                <div><label className="text-xs text-gray-400">Person to See (Optional)</label><input value={personToSee} onChange={e => setPersonToSee(e.target.value)} className="w-full p-2 bg-gray-700 rounded mt-1" /></div>
                                <div className="flex gap-2"><button onClick={resetCheckIn} className="w-full py-2 bg-gray-600 rounded-md">Back</button><button onClick={handleGeneratePass} className="w-full py-2 bg-green-600 rounded-md">Generate Pass</button></div>
                            </div>
                        )}

                        {generatedPass && (
                            <div className="text-center space-y-4 animate-fade-in-up">
                                <h4 className="font-bold text-green-400">Pass Generated!</h4>
                                <p>Please present this pass number upon exit.</p>
                                <div className="bg-white p-4 rounded-lg inline-block" ref={qrCodeRef}></div>
                                <p className="font-mono text-2xl tracking-widest">{generatedPass.passNumber}</p>
                                <button onClick={resetCheckIn} className="w-full py-2 bg-cyan-600 rounded-md">Register Next Visitor</button>
                            </div>
                        )}
                    </div>
                    {/* Check-out */}
                    <div className="bg-gray-800 p-6 rounded-lg space-y-4 h-fit">
                        <h3 className="text-xl font-bold">Visitor Check-out</h3>
                        {checkOutFeedback.message && <div className={`p-3 rounded-md text-sm ${checkOutFeedback.type === 'success' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>{checkOutFeedback.message}</div>}
                        <div className="flex items-center gap-2">
                             <input value={passNumberOut} onChange={e => setPassNumberOut(e.target.value)} placeholder="Enter or Scan Pass Number" className="w-full p-2 bg-gray-700 rounded-md" />
                             <button onClick={handleCheckOut} className="px-4 py-2 bg-cyan-600 rounded-md">Check Out</button>
                        </div>
                    </div>
                </div>
            )}
            
            {activeTab === 'logs' && (
                <div className="bg-gray-800 p-6 rounded-lg">
                    <h3 className="text-xl font-bold mb-4">Visitor Log</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-700/50"><tr><th className="p-2 text-left">Visitor</th><th className="p-2 text-left">Reason</th><th className="p-2 text-left">Entry Time</th><th className="p-2 text-left">Exit Time</th><th className="p-2 text-left">Status</th></tr></thead>
                            <tbody className="divide-y divide-gray-700">
                                {logs.map(log => (
                                    <tr key={log.id} className="hover:bg-gray-700/50">
                                        <td className="p-2">{log.visitorName} ({log.visitorIdNumber})</td>
                                        <td className="p-2">{log.reasonForVisit}</td>
                                        <td className="p-2">{new Date(log.entryTime).toLocaleString()}</td>
                                        <td className="p-2">{log.exitTime ? new Date(log.exitTime).toLocaleString() : 'N/A'}</td>
                                        <td className="p-2"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${log.status === 'checked_in' ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-400'}`}>{log.status.replace('_', ' ')}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {logs.length === 0 && <p className="text-center py-8 text-gray-400">No visitor logs found.</p>}
                    </div>
                </div>
            )}
        </div>
    );
};

export default VisitorRegPage;