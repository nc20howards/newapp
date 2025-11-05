// components/VisitorRegPage.tsx

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { School, AdminUser, ExtractedIdData, VisitorLog } from '../types';
import * as visitorService from '../services/visitorService';
import * as apiService from '../services/apiService';
import UserAvatar from './UserAvatar';

interface VisitorRegPageProps {
    school: School;
    user: AdminUser;
}

const VisitorRegPage: React.FC<VisitorRegPageProps> = ({ school, user }) => {
    const [activeTab, setActiveTab] = useState<'register' | 'active' | 'history'>('register');
    
    // State for Registration
    const [frontIdImage, setFrontIdImage] = useState<string | null>(null);
    const [backIdImage, setBackIdImage] = useState<string | null>(null);
    const [extractedData, setExtractedData] = useState<ExtractedIdData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [reason, setReason] = useState('');
    const [personToSee, setPersonToSee] = useState('');
    const [newVisitorCard, setNewVisitorCard] = useState<string | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState<'front' | 'back' | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // State for Active/History
    const [activeVisitors, setActiveVisitors] = useState<VisitorLog[]>([]);
    const [visitorHistory, setVisitorHistory] = useState<VisitorLog[]>([]);
    const [checkoutCardNumber, setCheckoutCardNumber] = useState('');
    const [checkoutFeedback, setCheckoutFeedback] = useState({ message: '', type: '' });

    const refreshData = useCallback(() => {
        setActiveVisitors(visitorService.getActiveVisitors(school.id));
        setVisitorHistory(visitorService.getVisitorLogHistory(school.id));
    }, [school.id]);

    useEffect(() => {
        refreshData();
        const interval = setInterval(refreshData, 5000); // Poll for updates
        return () => clearInterval(interval);
    }, [refreshData]);

    const resetRegistration = () => {
        setFrontIdImage(null);
        setBackIdImage(null);
        setExtractedData(null);
        setIsLoading(false);
        setError('');
        setReason('');
        setPersonToSee('');
        setNewVisitorCard(null);
    };
    
    // Camera Logic
    useEffect(() => {
        let stream: MediaStream | null = null;
        if (isCameraOpen && videoRef.current) {
            navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
                .then(s => {
                    stream = s;
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                })
                .catch(err => {
                    setError("Could not access camera. Please grant permission.");
                    setIsCameraOpen(null);
                });
        }
        return () => stream?.getTracks().forEach(track => track.stop());
    }, [isCameraOpen]);
    
    const captureImage = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg');
            
            if (isCameraOpen === 'front') setFrontIdImage(dataUrl);
            if (isCameraOpen === 'back') setBackIdImage(dataUrl);

            setIsCameraOpen(null);
        }
    };
    
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const dataUrl = event.target?.result as string;
                if (side === 'front') setFrontIdImage(dataUrl);
                else setBackIdImage(dataUrl);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleExtractDetails = async () => {
        if (!frontIdImage) {
            setError("Please provide at least the front image of the ID card.");
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const base64Image = frontIdImage.split(',')[1];
            const mimeType = frontIdImage.match(/data:(.*);base64/)?.[1] || 'image/jpeg';
            const data = await apiService.extractDetailsFromIdCard(base64Image, mimeType);
            setExtractedData(data);
        } catch (err) {
            setError("AI failed to extract details. Please enter them manually or try a clearer image.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCheckIn = () => {
        if (!extractedData?.fullName || !extractedData?.idNumber || !reason.trim() || !frontIdImage) {
            setError("Full Name, ID Number, Reason for Visit, and a front ID image are required.");
            return;
        }
        try {
            const visitor = visitorService.getOrCreateVisitor(extractedData, school.id);
            const newLog = visitorService.checkInVisitor({
                visitorId: visitor.id,
                schoolId: school.id,
                reasonForVisit: reason,
                personToSee: personToSee,
                frontIdImage: frontIdImage,
                backIdImage: backIdImage || '',
            });
            setNewVisitorCard(newLog.cardNumber);
            refreshData(); // Update active visitors list
        } catch (err) {
            setError((err as Error).message);
        }
    };

    const handleCheckout = () => {
        if (!checkoutCardNumber.trim()) return;
        setCheckoutFeedback({ message: '', type: '' });
        try {
            const checkedOutLog = visitorService.checkOutVisitor(checkoutCardNumber, school.id);
            const visitor = visitorService.getVisitorById(checkedOutLog.visitorId);
            setCheckoutFeedback({ message: `Successfully checked out ${visitor?.fullName || 'visitor'}.`, type: 'success' });
            setCheckoutCardNumber('');
            refreshData();
        } catch (err) {
            setCheckoutFeedback({ message: (err as Error).message, type: 'error' });
        }
    };

    const renderRegisterTab = () => (
        <div className="space-y-6">
            {newVisitorCard ? (
                <div className="bg-green-800 p-8 rounded-lg text-center">
                    <h3 className="text-2xl font-bold text-white">Check-in Successful!</h3>
                    <p className="text-green-200 mt-2">Please provide the visitor with their card number.</p>
                    <div className="my-6">
                        <p className="text-lg text-green-200">Visitor Card Number:</p>
                        <p className="font-mono text-5xl font-bold tracking-widest bg-gray-900 p-4 rounded-md inline-block my-2">{newVisitorCard}</p>
                    </div>
                    <button onClick={resetRegistration} className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 font-semibold rounded-md">Register Next Visitor</button>
                </div>
            ) : (
                <>
                    {/* Image Upload */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {['front', 'back'].map(side => {
                            const image = side === 'front' ? frontIdImage : backIdImage;
                            return (
                                <div key={side} className="bg-gray-700 p-4 rounded-lg text-center">
                                    <h4 className="font-bold mb-2 capitalize">{side} of ID</h4>
                                    {image ? (
                                        <img src={image} alt={`${side} of ID`} className="w-full h-40 object-contain rounded-md mb-2" />
                                    ) : (
                                        <div className="w-full h-40 bg-gray-600 rounded-md flex items-center justify-center text-gray-400 mb-2">Image Preview</div>
                                    )}
                                    <div className="flex gap-2 justify-center">
                                        <button onClick={() => fileInputRef.current?.click()} className="text-sm px-3 py-1.5 bg-gray-600 rounded-md">Upload</button>
                                        <input type="file" ref={fileInputRef} onChange={e => handleFileUpload(e, side as 'front' | 'back')} accept="image/*" className="hidden" />
                                        <button onClick={() => setIsCameraOpen(side as 'front' | 'back')} className="text-sm px-3 py-1.5 bg-gray-600 rounded-md">Camera</button>
                                    </div>
                                    {image && <button onClick={() => side === 'front' ? setFrontIdImage(null) : setBackIdImage(null)} className="text-xs text-red-400 mt-2">Remove</button>}
                                </div>
                            );
                        })}
                    </div>

                    {/* Extracted Data & Form */}
                    <div className="bg-gray-700 p-4 rounded-lg">
                        <button onClick={handleExtractDetails} disabled={!frontIdImage || isLoading} className="w-full mb-4 py-2 bg-cyan-600 rounded-md font-semibold disabled:bg-gray-500">
                            {isLoading ? 'Extracting...' : 'Extract Details with AI'}
                        </button>
                        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
                        <div className="space-y-4">
                            <input value={extractedData?.fullName || ''} onChange={e => setExtractedData(p => ({...p!, fullName: e.target.value}))} placeholder="Full Name" className="w-full p-2 bg-gray-600 rounded-md" />
                            <input value={extractedData?.idNumber || ''} onChange={e => setExtractedData(p => ({...p!, idNumber: e.target.value}))} placeholder="ID Number" className="w-full p-2 bg-gray-600 rounded-md" />
                            <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for Visiting (Required)" required rows={3} className="w-full p-2 bg-gray-600 rounded-md" />
                            <input value={personToSee} onChange={e => setPersonToSee(e.target.value)} placeholder="Person to See (Optional)" className="w-full p-2 bg-gray-600 rounded-md" />
                        </div>
                    </div>
                    
                    <div className="text-right">
                        <button onClick={handleCheckIn} className="px-6 py-2 bg-green-600 hover:bg-green-700 font-semibold rounded-md">Check-In Visitor</button>
                    </div>
                </>
            )}
        </div>
    );

    const renderActiveTab = () => (
        <div className="space-y-4">
             <div className="bg-gray-700 p-4 rounded-lg">
                <h4 className="font-bold mb-2">Checkout Visitor</h4>
                {checkoutFeedback.message && <p className={`text-sm mb-2 ${checkoutFeedback.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>{checkoutFeedback.message}</p>}
                <div className="flex gap-2">
                    <input value={checkoutCardNumber} onChange={e => setCheckoutCardNumber(e.target.value)} placeholder="Enter Visitor Card Number" className="w-full p-2 bg-gray-600 rounded-md"/>
                    <button onClick={handleCheckout} className="px-4 py-2 bg-red-600 rounded-md font-semibold">Checkout</button>
                </div>
            </div>
            {activeVisitors.map(log => {
                const visitor = visitorService.getVisitorById(log.visitorId);
                return (
                    <div key={log.id} className="bg-gray-700 p-3 rounded-lg flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <UserAvatar name={visitor?.fullName || ''} className="w-10 h-10 rounded-full" />
                            <div>
                                <p className="font-bold">{visitor?.fullName}</p>
                                <p className="text-xs text-gray-400">Card: {log.cardNumber} | In since {new Date(log.entryTime).toLocaleTimeString()}</p>
                            </div>
                        </div>
                    </div>
                );
            })}
             {activeVisitors.length === 0 && <p className="text-center text-gray-400 py-8">No active visitors.</p>}
        </div>
    );
    
    const renderHistoryTab = () => (
        <div className="overflow-x-auto bg-gray-700 rounded-lg">
             <table className="min-w-full text-sm">
                <thead className="bg-gray-600"><tr>
                    <th className="p-3 text-left">Visitor</th>
                    <th className="p-3 text-left">Reason</th>
                    <th className="p-3 text-left">Entry</th>
                    <th className="p-3 text-left">Exit</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-800">
                    {visitorHistory.map(log => {
                         const visitor = visitorService.getVisitorById(log.visitorId);
                         return (
                            <tr key={log.id}>
                                <td className="p-3"><p className="font-semibold">{visitor?.fullName}</p><p className="text-xs text-gray-400">{visitor?.idNumber}</p></td>
                                <td className="p-3">{log.reasonForVisit}</td>
                                <td className="p-3">{new Date(log.entryTime).toLocaleString()}</td>
                                <td className="p-3">{log.exitTime ? new Date(log.exitTime).toLocaleString() : 'Still Active'}</td>
                            </tr>
                         );
                    })}
                </tbody>
             </table>
             {visitorHistory.length === 0 && <p className="text-center text-gray-400 py-8">No visitor history.</p>}
        </div>
    );

    return (
        <div className="space-y-6">
            {isCameraOpen && (
                 <div className="fixed inset-0 bg-black/80 flex flex-col justify-center items-center z-[110] p-4">
                    <video ref={videoRef} autoPlay className="w-full max-w-lg rounded-lg mb-4"></video>
                    <div className="flex gap-4">
                        <button onClick={captureImage} className="px-6 py-2 bg-cyan-600 rounded-lg">Capture</button>
                        <button onClick={() => setIsCameraOpen(null)} className="px-6 py-2 bg-red-600 rounded-lg">Cancel</button>
                    </div>
                </div>
            )}
            <div className="flex justify-between items-center">
                <h2 className="text-2xl sm:text-3xl font-bold text-white">Visitor Registration</h2>
            </div>
            <div className="flex items-center gap-2 p-1 bg-gray-800 rounded-lg">
                <button onClick={() => setActiveTab('register')} className={`w-full py-2 text-sm font-semibold rounded-md ${activeTab === 'register' ? 'bg-cyan-600' : 'hover:bg-gray-600'}`}>Register</button>
                <button onClick={() => setActiveTab('active')} className={`w-full py-2 text-sm font-semibold rounded-md relative ${activeTab === 'active' ? 'bg-cyan-600' : 'hover:bg-gray-600'}`}>
                    Active Visitors
                    {activeVisitors.length > 0 && <span className="absolute top-1 right-2 w-5 h-5 bg-cyan-800 text-xs rounded-full flex items-center justify-center">{activeVisitors.length}</span>}
                </button>
                <button onClick={() => setActiveTab('history')} className={`w-full py-2 text-sm font-semibold rounded-md ${activeTab === 'history' ? 'bg-cyan-600' : 'hover:bg-gray-600'}`}>History</button>
            </div>
            
            {activeTab === 'register' && renderRegisterTab()}
            {activeTab === 'active' && renderActiveTab()}
            {activeTab === 'history' && renderHistoryTab()}
        </div>
    );
};

export default VisitorRegPage;