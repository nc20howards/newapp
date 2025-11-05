import React, { useState, useRef, useEffect, useCallback } from 'react';
import { School, AdminUser, ExtractedIdData, VisitorLog } from '../types';
import * as apiService from '../services/apiService';
import * as visitorService from '../services/visitorService';

declare var QRCode: any;

const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
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

    // State for new image input flow
    const [choiceModalFor, setChoiceModalFor] = useState<'front' | 'back' | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceIndex, setSelectedDeviceIndex] = useState(0);


    // Refs
    const qrCodeRef = useRef<HTMLDivElement>(null);
    const frontFileInputRef = useRef<HTMLInputElement>(null);
    const backFileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);


    const refreshLogs = useCallback(() => {
        setLogs(visitorService.getVisitorLogsForSchool(school.id));
    }, [school.id]);

    useEffect(() => {
        refreshLogs();
    }, [refreshLogs]);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
        const file = e.target.files?.[0];
        if (file) {
            const dataUrl = await fileToDataUrl(file);
            const base64 = dataUrl.split(',')[1];
            if (side === 'front') setIdFront({ preview: dataUrl, base64 });
            else setIdBack({ preview: dataUrl, base64 });
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

    // --- New Image Input Logic ---
    const handleImageAreaClick = (side: 'front' | 'back') => {
        setChoiceModalFor(side);
    };

    const handleUploadClick = () => {
        if (choiceModalFor === 'front') {
            frontFileInputRef.current?.click();
        } else if (choiceModalFor === 'back') {
            backFileInputRef.current?.click();
        }
        setChoiceModalFor(null);
    };

    const handleCameraClick = () => {
        setIsCameraOpen(true);
    };

    useEffect(() => {
        let stream: MediaStream | null = null;
        const startCamera = async () => {
            try {
                // Stop any existing stream before starting a new one
                if (videoRef.current?.srcObject) {
                    (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
                }

                // First, get the list of devices to see if we have multiple cameras
                if (videoDevices.length === 0) {
                    const devices = await navigator.mediaDevices.enumerateDevices();
                    const videoDevs = devices.filter(d => d.kind === 'videoinput');
                    setVideoDevices(videoDevs);
                }
                
                // If we have devices, use the selected one
                let constraints: MediaStreamConstraints = {
                    video: { facingMode: "environment" } // Prefer back camera initially
                };
                if (videoDevices.length > 0) {
                    const deviceId = videoDevices[selectedDeviceIndex]?.deviceId;
                    if(deviceId) {
                        constraints = { video: { deviceId: { exact: deviceId } } };
                    }
                }
                
                stream = await navigator.mediaDevices.getUserMedia(constraints);
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Error accessing camera:", err);
                setError("Could not access camera. Please ensure permissions are granted.");
                setIsCameraOpen(false);
                setChoiceModalFor(null);
            }
        };

        if (isCameraOpen) {
            startCamera();
        }

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [isCameraOpen, selectedDeviceIndex, videoDevices]);
    
    const handleCapture = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const context = canvas.getContext('2d');
            if (context) {
                context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg');
                const base64 = dataUrl.split(',')[1];
                
                if (choiceModalFor === 'front') {
                    setIdFront({ preview: dataUrl, base64 });
                } else if (choiceModalFor === 'back') {
                    setIdBack({ preview: dataUrl, base64 });
                }
            }
            setIsCameraOpen(false);
            setChoiceModalFor(null);
        }
    };

    const handleSwitchCamera = () => {
        if (videoDevices.length > 1) {
            setSelectedDeviceIndex(prevIndex => (prevIndex + 1) % videoDevices.length);
        }
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
                                            <button
                                                type="button"
                                                onClick={() => handleImageAreaClick(side as 'front' | 'back')}
                                                className="w-full cursor-pointer flex flex-col items-center justify-center p-4 bg-gray-700 hover:bg-gray-600 rounded-lg border-2 border-dashed border-gray-500 h-32"
                                            >
                                                {(side === 'front' ? idFront : idBack) ? (
                                                    <img src={(side === 'front' ? idFront : idBack)?.preview} alt={`ID ${side}`} className="max-h-full max-w-full object-contain" />
                                                ) : (
                                                    <span className="text-gray-400 text-xs">Click to choose source</span>
                                                )}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <input type="file" accept="image/*" className="hidden" ref={frontFileInputRef} onChange={e => handleFileSelect(e, 'front')} />
                                <input type="file" accept="image/*" className="hidden" ref={backFileInputRef} onChange={e => handleFileSelect(e, 'back')} />

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

            {/* Modals for image source selection */}
            {choiceModalFor && !isCameraOpen && (
                <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4">
                    <div className="bg-gray-800 rounded-lg p-6 w-full max-w-sm space-y-4 text-center">
                        <h3 className="text-xl font-bold">Choose Image Source</h3>
                        <p className="text-sm text-gray-400">Select how you want to provide the ID image for the {choiceModalFor}.</p>
                        <div className="flex flex-col space-y-3">
                            <button onClick={handleCameraClick} className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 rounded-md font-semibold">Use Camera</button>
                            <button onClick={handleUploadClick} className="w-full py-3 bg-gray-600 hover:bg-gray-500 rounded-md font-semibold">Upload from File</button>
                        </div>
                        <button onClick={() => setChoiceModalFor(null)} className="mt-2 text-sm text-gray-400 hover:underline">Cancel</button>
                    </div>
                </div>
            )}

            {isCameraOpen && (
                <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4">
                    <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl space-y-4">
                        <h3 className="text-xl font-bold">Capture ID</h3>
                        <div className="relative">
                            <video ref={videoRef} autoPlay playsInline className="w-full rounded-lg bg-gray-900"></video>
                            {videoDevices.length > 1 && (
                                <button
                                    onClick={handleSwitchCamera}
                                    className="absolute bottom-4 right-4 p-2 bg-black/50 rounded-full text-white hover:bg-black/75"
                                    title="Switch Camera"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.664 0l3.181-3.183m-4.991-2.695v4.992h-4.992" />
                                    </svg>
                                </button>
                            )}
                        </div>
                        <div className="flex justify-center space-x-4">
                            <button onClick={() => { setIsCameraOpen(false); setChoiceModalFor(null); }} className="px-6 py-2 bg-gray-600 rounded-md">Cancel</button>
                            <button onClick={handleCapture} className="px-6 py-2 bg-cyan-600 rounded-md font-semibold">Capture Photo</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VisitorRegPage;