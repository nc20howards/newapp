// FIX: Import 'useMemo' to resolve 'Cannot find name' error.
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { User, Module, ExtractedUnebSlipData, UnebPassSlip, AdmissionSettings, AdminUser, School, CustomIdTemplate, CanteenShop, InternalExamResult, SchoolClass } from '../types';
import { APP_TITLE } from '../constants';
import NotificationBell from './NotificationBell';
import { getAllSchools } from '../services/schoolService';
import { getAllModules, SMART_ADMISSION_MODULE_NAME, MESSAGE_MODULE_NAME, E_WALLET_MODULE_NAME, ONLINE_MODULE_NAME, SMART_STUDENT_ID_MODULE_NAME, E_CANTEEN_MODULE_NAME, NCHE_MODULE_NAME, EXPLORATION_MODULE_NAME } from '../services/moduleService';
import * as settingsService from '../services/settingsService';
import { isUnebVerificationEnabled } from '../services/systemSettingsService';
import { extractTextFromImageWithGoogle } from '../services/apiService';
import { findResultByIndex } from '../services/unebResultService';
import * as eWalletService from '../services/eWalletService';
import * as studentService from '../services/studentService';
import SocialHubPage from './SocialHubPage';
import MessagesPage from './MessagesPage';
import NotificationPermissionBanner from './NotificationPermissionBanner';
import { heartbeat } from '../services/presenceService';
import * as groupService from '../services/groupService';
import EWalletPage from './EWalletPage';
import ProfilePage from './ProfilePage';
import { getHomePageContent } from '../services/homePageService';
import OnlineFeedPage from './OnlineFeedPage';
import { SmartIdCard, SmartIdCardFront, SmartIdCardBack } from './SmartIdCard';
import * as smartIdService from '../services/smartIdService';
import CustomSmartIdCard, { CustomSmartIdCardDownloadable } from './CustomSmartIdCard';
import ECanteenStudentPage, { CanteenSellerDashboard } from './ECanteenStudentPage';
// FIX: Import customIdTemplateService to resolve 'Cannot find name' error.
import * as customIdTemplateService from '../services/customIdTemplateService';
import StudentNcheView from './StudentNcheView';
import ReportCard from './ReportCard';
import * as classService from '../services/classService';
import ExplorationPage from './ExplorationPage';
import UserAvatar from './UserAvatar';


// Tell typescript html2canvas exists globally
declare var html2canvas: any;

// Helper function to fetch a cross-origin image and convert it to a data URL
const imageToDataUrl = (url: string): Promise<string> => {
    const proxyUrl = 'https://corsproxy.io/?';
    if (url.startsWith('data:')) {
        return Promise.resolve(url);
    }
    return fetch(proxyUrl + encodeURIComponent(url))
        .then(response => {
            if (!response.ok) throw new Error(`Failed to fetch through proxy with status: ${response.status}`);
            return response.blob();
        })
        .then(blob => new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result === 'string') resolve(reader.result);
                else reject(new Error('Failed to read blob as a data URL.'));
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        }))
        .catch(error => {
            console.error(`Failed to load image via proxy for canvas conversion: ${url}`, error);
            return "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
        });
};

// --- SVG Icons ---
const HomeIcon = () => (<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>);
const GroupsIcon = () => (<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>);
const MessagesIcon = () => (<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" /></svg>);
const PlusIcon = ({className}: {className?: string}) => (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>);
const CloseIcon = () => (<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>);
const HamburgerIcon = () => (<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>);
const SmartAdmissionIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5 8.281V13.5a1 1 0 001 1h8a1 1 0 001-1V8.281l2.394-1.36a1 1 0 000-1.84l-7-3zM6 9.319l4 2.286 4-2.286V13.5H6V9.319z" /><path d="M15 13.129l-5 2.857-5-2.857V9.32l5 2.857 5-2.857v3.81z" /></svg>);
const GenericModuleIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5 4a1 1 0 00-1 1v6a1 1 0 001 1h6a1 1 0 001-1V5a1 1 0 00-1-1H5zM5 3a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V5a2 2 0 00-2-2H5z" /><path d="M15 4a1 1 0 00-1 1v2a1 1 0 001 1h2a1 1 0 001-1V5a1 1 0 00-1-1h-2zM15 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2h-2zM5 14a1 1 0 00-1 1v2a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 00-1-1H5zM5 13a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM15 14a1 1 0 00-1 1v2a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 00-1-1h-2zM15 13a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2h-2z" /></svg>);
const DashboardIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>);
const EWalletIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>);
const OnlineIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.522-1.522l.836.836a.75.75 0 001.06 0l1.414-1.414a.75.75 0 000-1.06l-.836-.836A7.5 7.5 0 002 10a7.5 7.5 0 004.027 6.668l.836-.836a.75.75 0 000-1.06l-1.414-1.414a.75.75 0 00-1.06 0l-.836.836a6.012 6.012 0 01-1.522-1.522zm11.336 0a6.012 6.012 0 01-1.522 1.522l-.836-.836a.75.75 0 00-1.06 0L11.25 10.5l-1.06-1.06a.75.75 0 00-1.06 0l-.836.836a6.012 6.012 0 01-1.522-1.522l.836-.836a.75.75 0 000-1.06L5.5 4.332a.75.75 0 00-1.06 0l-.836.836A7.5 7.5 0 0010 2.5a7.5 7.5 0 006.668 4.027l-.836.836a.75.75 0 00-1.06 0l-1.414 1.414a.75.75 0 000 1.06l.836.836z" clipRule="evenodd" /></svg>);
const VerifiedIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>);
const EditIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>);
const IdCardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2H3zm3 2a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm-1 4a1 1 0 100 2h.01a1 1 0 100-2H5zm3 0a1 1 0 100 2h6a1 1 0 100-2H8zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H5zm3 0a1 1 0 100 2h6a1 1 0 100-2H8z" clipRule="evenodd" /></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>);
const CanteenIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 4.5A1.5 1.5 0 013.5 3h1.53a1.5 1.5 0 011.42 1.049l.343.857a.5.5 0 00.47.344h4.474a.5.5 0 00.47-.344l.343-.857A1.5 1.5 0 0113.97 3H15.5A1.5 1.5 0 0117 4.5V5h-.5a.5.5 0 000 1h.5v1.5a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 012 7.5V5h.5a.5.5 0 000-1H2V4.5zM3.5 4a.5.5 0 00-.5.5V5h13V4.5a.5.5 0 00-.5-.5h-1.03a.5.5 0 00-.47.349l-.344.856a1.5 1.5 0 01-1.42 1.045H7.234a1.5 1.5 0 01-1.42-1.045l-.343-.856A.5.5 0 005.03 4H3.5zM2 12v3.5A1.5 1.5 0 003.5 17h13a1.5 1.5 0 001.5-1.5V12h-16zm1.5.5a.5.5 0 01.5-.5h12a.5.5 0 01.5.5v3a.5.5 0 01-.5.5h-12a.5.5 0 01-.5-.5v-3z"/></svg>;
const NcheIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5 8.281V13.5a1 1 0 001 1h8a1 1 0 001-1V8.281l2.394-1.36a1 1 0 000-1.84l-7-3zM6 9.319l4 2.286 4-2.286V13.5H6V9.319z" /><path d="M6 13.5V15l4 2.286L14 15v-1.5H6z" /></svg>;
const ModulesIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5 4a1 1 0 00-1 1v6a1 1 0 001 1h6a1 1 0 001-1V5a1 1 0 00-1-1H5zM5 3a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V5a2 2 0 00-2-2H5z" /><path d="M15 4a1 1 0 00-1 1v2a1 1 0 001 1h2a1 1 0 001-1V5a1 1 0 00-1-1h-2zM15 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2h-2zM5 14a1 1 0 00-1 1v2a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 00-1-1H5zM5 13a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM15 14a1 1 0 00-1 1v2a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 00-1-1h-2zM15 13a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2h-2z" /></svg>);
const ResultsIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a1 1 0 011-1h14a1 1 0 110 2H3a1 1 0 01-1-1z" /></svg>);
const ExplorationIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M15.05 5.05a7 7 0 10-10 10 7 7 0 0010-10zM10 16a6 6 0 110-12 6 6 0 010 12z" /><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path d="M4.343 4.343l1.414 1.414M14.243 14.243l1.414 1.414M4.343 15.657l1.414-1.414M14.243 5.757l1.414-1.414" /></svg>);


// --- Student-Facing Admission Portal Component ---
interface StudentAdmissionPortalProps {
    user: User;
    onBack: () => void;
}

export const StudentAdmissionPortal: React.FC<StudentAdmissionPortalProps> = ({ user, onBack }) => {
    type SelfAdmissionTab = 'scan' | 'index' | 'form' | null;

    // State
    const [settings, setSettings] = useState<AdmissionSettings | null>(null);
    const [selfAdmissionTab, setSelfAdmissionTab] = useState<SelfAdmissionTab>(null);
    const [isCameraOn, setIsCameraOn] = useState(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [selfIndex, setSelfIndex] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [submissionSuccess, setSubmissionSuccess] = useState('');
    const [progress, setProgress] = useState<number | null>(null);
    const [dataForVerification, setDataForVerification] = useState<UnebPassSlip | ExtractedUnebSlipData | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [walletBalance, setWalletBalance] = useState<number | null>(null);
    const [isVerified, setIsVerified] = useState(false);
    
    const [isAdmissionModeDropdownOpen, setIsAdmissionModeDropdownOpen] = useState(false);
    const admissionModeDropdownRef = useRef<HTMLDivElement>(null);
    const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);
    
    // State for Editing Extracted Data
    const [editableData, setEditableData] = useState<ExtractedUnebSlipData | null>(null);
    const [isEditingData, setIsEditingData] = useState(false);

    // Fetch school-specific settings on mount
    useEffect(() => {
        if (user.schoolId) {
            const currentSettings = settingsService.getAdmissionSettings(user.schoolId);
            setSettings(currentSettings);
        } else {
            setError("Could not determine your assigned school. Cannot proceed with admission.");
        }
    }, [user.schoolId]);

    // Process image when captured/uploaded
    useEffect(() => {
        if (capturedImage) {
            handleProcessImage(capturedImage);
        }
    }, [capturedImage]);
    
    // Dropdown outside click handler
     useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (admissionModeDropdownRef.current && !admissionModeDropdownRef.current.contains(event.target as Node)) {
                setIsAdmissionModeDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Camera stream management
    useEffect(() => {
        let stream: MediaStream | null = null;
        if (isCameraOn && videoRef.current && selectedDeviceId) {
            const videoElement = videoRef.current;
            navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: selectedDeviceId } } })
                .then(s => {
                    stream = s;
                    videoElement.srcObject = stream;
                    videoElement.play().catch(e => console.error("Video play failed:", e));
                })
                .catch(err => {
                    setError("Could not access camera. Please check permissions.");
                    setIsCameraOn(false);
                });
        }
        return () => stream?.getTracks().forEach(track => track.stop());
    }, [isCameraOn, selectedDeviceId]);

    const resetState = () => {
        setError('');
        setCapturedImage(null);
        setIsLoading(false);
        setProgress(null);
        setDataForVerification(null);
        setIsPaymentModalOpen(false);
        setWalletBalance(null);
        setIsVerified(false);
        setEditableData(null);
        setIsEditingData(false);
        if (isCameraOn) stopCamera();
    };

    const handleProcessImage = async (dataUrl: string) => {
        resetState();
        setProgress(0);
        setIsLoading(true);
        const interval = setInterval(() => setProgress(p => (p ? Math.min(95, p + 5) : 5)), 300);

        try {
            const base64Image = dataUrl.split(',')[1];
            const mimeType = dataUrl.match(/data:(.*);base64/)?.[1] || 'image/jpeg';
            const data = await extractTextFromImageWithGoogle(base64Image, mimeType);
            
            if (isUnebVerificationEnabled()) {
                if (findResultByIndex(data.indexNumber)) {
                    setIsVerified(true);
                }
            }
            
            clearInterval(interval);
            setProgress(100);
            setTimeout(() => {
                setDataForVerification(data);
                setEditableData(data); // Set data for potential editing
                setIsEditingData(false); // Start in display mode
                setProgress(null);
                setIsLoading(false);
            }, 500);
        } catch (err) {
            clearInterval(interval);
            setProgress(null);
            setError(err instanceof Error ? err.message : 'Failed to extract text from image.');
            setIsLoading(false);
        }
    };

    const handleSlipScanUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => setCapturedImage(event.target?.result as string);
            reader.readAsDataURL(file);
        }
    };
    
    const handlePasteFromClipboard = async () => {
        resetState();
        try {
            const items = await navigator.clipboard.read();
            for (const item of items) {
                const imageType = item.types.find(type => type.startsWith('image/'));
                if (imageType) {
                    const blob = await item.getType(imageType);
                    const reader = new FileReader();
                    reader.onloadend = () => setCapturedImage(reader.result as string);
                    reader.readAsDataURL(blob);
                    return;
                }
            }
            throw new Error("No image found in clipboard.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not read from clipboard.");
        }
    };

    const handleIndexLookup = (index: string) => {
        resetState();
        if (!index.trim()) return setError("Please enter an index number.");
        setIsLoading(true);
        setTimeout(() => {
            try {
                const resultSlip = findResultByIndex(index.trim());
                if (resultSlip) {
                    if (isUnebVerificationEnabled()) {
                        setIsVerified(true);
                    }
                    setDataForVerification(resultSlip);
                    setEditableData(null); // Data from DB is not editable
                    setIsEditingData(false);
                } else {
                    setError("No UNEB results found for that index number.");
                }
            } catch (err) {
                if (err instanceof Error && err.message.includes("service is currently disabled")) {
                    setError("UNEB Verification not available! Try the scanning method");
                } else {
                    setError(err instanceof Error ? err.message : "An unexpected error occurred during lookup.");
                }
            }
            setIsLoading(false);
        }, 500);
    };

    const handlePaymentConfirmed = () => {
        if (!dataForVerification || !user.schoolId || !settings) return;

        try {
            // Perform e-wallet transaction, now with service fee logic handled by the service
            eWalletService.processAdmissionFeePayment(
                user.studentId,
                user.schoolId,
                settings.admissionFee
            );

            // If payment is successful, proceed with admission submission
            settingsService.addCompletedAdmission(dataForVerification, user.schoolId);
            setSubmissionSuccess("Payment successful! Your application has been submitted for review. You will be notified upon completion.");
            setDataForVerification(null);
            setIsPaymentModalOpen(false);
            setSelfAdmissionTab(null);

        } catch (error) {
            setError(error instanceof Error ? `Payment Failed: ${error.message}` : 'An unexpected payment error occurred.');
            setIsPaymentModalOpen(false); // Close modal on error
        }
    };


    const startCamera = async () => {
        resetState();
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevs = devices.filter(d => d.kind === 'videoinput');
            if (videoDevs.length > 0) {
                setVideoDevices(videoDevs);
                setSelectedDeviceId(videoDevs[0].deviceId);
                setIsCameraOn(true);
            } else {
                setError("No camera found.");
            }
        } catch (err) {
            setError("Could not access camera. Please grant permission.");
        }
    };

    const stopCamera = () => setIsCameraOn(false);

    const captureImage = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            setCapturedImage(canvas.toDataURL('image/jpeg'));
            stopCamera();
        }
    };
    
    // --- Handlers for Editing Data ---
    const handleFieldChange = (field: keyof ExtractedUnebSlipData, value: string) => {
        if (!editableData) return;
        setEditableData({ ...editableData, [field]: value });
    };
    const handleSubjectChange = (index: number, field: 'name' | 'grade', value: string) => {
        if (!editableData) return;
        const newSubjects = [...editableData.subjects];
        newSubjects[index] = { ...newSubjects[index], [field]: value };
        setEditableData({ ...editableData, subjects: newSubjects });
    };
    const handleAddSubject = () => {
        if (!editableData) return;
        setEditableData({ ...editableData, subjects: [...editableData.subjects, { name: '', grade: '' }] });
    };
    const handleRemoveSubject = (index: number) => {
        if (!editableData) return;
        setEditableData({ ...editableData, subjects: editableData.subjects.filter((_, i) => i !== index) });
    };
    const handleSaveChanges = () => {
        setDataForVerification(editableData);
        setIsEditingData(false);
    };
    const handleCancelEdit = () => {
        if (dataForVerification && 'studentName' in dataForVerification) {
            setEditableData(dataForVerification);
        }
        setIsEditingData(false);
    };

    if (submissionSuccess) {
        return (
            <div className="bg-gray-800 rounded-lg shadow-xl p-8 text-center">
                <h3 className="text-2xl font-bold text-green-400 mb-4">Success!</h3>
                <p className="text-gray-300 mb-6">{submissionSuccess}</p>
                <button onClick={onBack} className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-md font-semibold">Back to Dashboard</button>
            </div>
        );
    }
    
    const renderVerificationView = () => {
        if (!dataForVerification) return null;
        
        const slip = dataForVerification;
        const isExtractedData = 'studentName' in slip;

        const yearAndLevel = isExtractedData ? slip.yearAndLevel : `${slip.year} ${slip.level}`;
        const studentName = isExtractedData ? slip.studentName : slip.name;
        const indexNumber = isExtractedData ? slip.indexNumber : slip.indexNo;
        const dateOfBirth = slip.dateOfBirth || 'N/A';
        const schoolName = slip.schoolName || 'N/A';
        const schoolAddress = slip.schoolAddress || 'N/A';
        const entryCode = slip.entryCode || 'N/A';
        const aggregate = slip.aggregate || 'N/A';
        const result = slip.result || 'N/A';
        const subjects = slip.subjects || [];
            
        if (isEditingData && editableData) {
            // --- EDIT VIEW ---
            return (
                <div className="bg-gray-700 p-6 rounded-lg space-y-6">
                     <h3 className="text-xl font-bold text-white">Edit Your Details</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div><label className="text-sm text-gray-400">Year & Level</label><input value={editableData.yearAndLevel} onChange={e => handleFieldChange('yearAndLevel', e.target.value)} className="w-full mt-1 p-2 bg-gray-600 rounded-md" /></div>
                         <div><label className="text-sm text-gray-400">Student Name</label><input value={editableData.studentName} onChange={e => handleFieldChange('studentName', e.target.value)} className="w-full mt-1 p-2 bg-gray-600 rounded-md" /></div>
                         <div><label className="text-sm text-gray-400">Index Number</label><input value={editableData.indexNumber} onChange={e => handleFieldChange('indexNumber', e.target.value)} className="w-full mt-1 p-2 bg-gray-600 rounded-md" /></div>
                         <div><label className="text-sm text-gray-400">Date of Birth</label><input value={editableData.dateOfBirth} onChange={e => handleFieldChange('dateOfBirth', e.target.value)} className="w-full mt-1 p-2 bg-gray-600 rounded-md" /></div>
                         <div><label className="text-sm text-gray-400">School Name</label><input value={editableData.schoolName} onChange={e => handleFieldChange('schoolName', e.target.value)} className="w-full mt-1 p-2 bg-gray-600 rounded-md" /></div>
                         <div><label className="text-sm text-gray-400">School Address</label><input value={editableData.schoolAddress} onChange={e => handleFieldChange('schoolAddress', e.target.value)} className="w-full mt-1 p-2 bg-gray-600 rounded-md" /></div>
                         <div><label className="text-sm text-gray-400">Entry Code</label><input value={editableData.entryCode} onChange={e => handleFieldChange('entryCode', e.target.value)} className="w-full mt-1 p-2 bg-gray-600 rounded-md" /></div>
                     </div>
                     <div className="border-t border-gray-600 pt-4">
                        <h4 className="font-semibold mb-2">Subjects & Grades</h4>
                        <div className="space-y-2">
                            {editableData.subjects.map((s, i) => (
                                <div key={i} className="grid grid-cols-2 gap-2 items-center">
                                    <input value={s.name} onChange={e => handleSubjectChange(i, 'name', e.target.value)} placeholder="Subject Name" className="p-2 bg-gray-600 rounded-md"/>
                                    <div className="flex gap-2"><input value={s.grade} onChange={e => handleSubjectChange(i, 'grade', e.target.value)} placeholder="Grade" className="w-full p-2 bg-gray-600 rounded-md"/><button onClick={() => handleRemoveSubject(i)} className="p-2 bg-red-600 rounded-md text-white">&times;</button></div>
                                </div>
                            ))}
                        </div>
                        <button onClick={handleAddSubject} className="mt-2 text-sm text-cyan-400 hover:underline">+ Add Subject</button>
                     </div>
                     <div className="border-t border-gray-600 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div><label className="text-sm text-gray-400">Aggregate</label><input value={editableData.aggregate} onChange={e => handleFieldChange('aggregate', e.target.value)} className="w-full mt-1 p-2 bg-gray-600 rounded-md" /></div>
                         <div><label className="text-sm text-gray-400">Result</label><input value={editableData.result} onChange={e => handleFieldChange('result', e.target.value)} className="w-full mt-1 p-2 bg-gray-600 rounded-md" /></div>
                     </div>
                     <div className="flex justify-end space-x-4 pt-4">
                        <button onClick={handleCancelEdit} className="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-md font-semibold">Cancel</button>
                        <button onClick={handleSaveChanges} className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-md font-semibold">Save Changes</button>
                     </div>
                </div>
            );
        }

        // --- DISPLAY VIEW ---
        return (
            <div className="bg-gray-700 p-6 rounded-lg space-y-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-xl font-bold text-white">Verify Your Details</h3>
                        <p className="text-sm text-gray-400">Please confirm your details are correct before proceeding.</p>
                    </div>
                    {isExtractedData && <button onClick={() => setIsEditingData(true)} className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md font-semibold text-sm"><EditIcon /> Edit</button>}
                </div>

                {isVerified && (
                    <div className="flex items-center space-x-2 bg-green-500/20 text-green-300 p-3 rounded-lg font-semibold">
                        <VerifiedIcon />
                        <span>Result Verified with UNEB Database</span>
                    </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                    <div><strong className="text-gray-400 block">Year & Level:</strong> <span className="text-white">{yearAndLevel}</span></div>
                    <div><strong className="text-gray-400 block">Student Name:</strong> <span className="text-white">{studentName}</span></div>
                    <div><strong className="text-gray-400 block">Index Number:</strong> <span className="text-white">{indexNumber}</span></div>
                    <div><strong className="text-gray-400 block">Date of Birth:</strong> <span className="text-white">{dateOfBirth}</span></div>
                    <div><strong className="text-gray-400 block">School Name:</strong> <span className="text-white">{schoolName}</span></div>
                    <div><strong className="text-gray-400 block">School Address:</strong> <span className="text-white">{schoolAddress}</span></div>
                    <div><strong className="text-gray-400 block">Entry Code:</strong> <span className="text-white">{entryCode}</span></div>
                </div>
                <div className="border-t border-gray-600 pt-4">
                    <h4 className="font-semibold mb-2">Subjects & Grades</h4>
                    <table className="min-w-full text-sm"><tbody>
                        {subjects.map((s, i) => (<tr key={i} className="border-b border-gray-800"><td className="py-1.5 pr-4 text-gray-300">{s.name}</td><td className="font-semibold text-white">{s.grade}</td></tr>))}
                    </tbody></table>
                </div>
                {(aggregate !== 'N/A' || result !== 'N/A') && (
                    <div className="border-t border-gray-600 pt-4 flex justify-around bg-gray-800 p-4 rounded-lg">
                        {aggregate !== 'N/A' && (
                            <div className="text-center">
                                <strong className="text-gray-400 block text-sm">Aggregate</strong>
                                <span className="text-white text-xl font-bold">{aggregate}</span>
                            </div>
                        )}
                        {result !== 'N/A' && (
                            <div className="text-center">
                                <strong className="text-gray-400 block text-sm">Result</strong>
                                <span className="text-white text-xl font-bold">{result}</span>
                            </div>
                        )}
                    </div>
                )}
                <div className="flex justify-end space-x-4">
                    <button onClick={() => { resetState(); setSelfAdmissionTab('scan'); }} className="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-md font-semibold">Re-enter Details</button>
                    <button
                        onClick={async () => {
                            if (isUnebVerificationEnabled() && !isVerified) {
                                setError("This application cannot be submitted because the UNEB results could not be verified. Please check the index number and try again, or contact the school for assistance.");
                                setDataForVerification(null);
                                return;
                            }
                            
                            const indexToCheck = 'indexNumber' in dataForVerification ? dataForVerification.indexNumber : dataForVerification.indexNo;
                            if (user.schoolId && settingsService.hasAdmissionBeenSubmitted(indexToCheck, user.schoolId)) {
                                setError(`An application with index number ${indexToCheck} has already been submitted.`);
                                setDataForVerification(null);
                                return;
                            }
                            try {
                                const wallet = eWalletService.getWalletForUser(user.studentId);
                                setWalletBalance(wallet.balance);
                                setIsPaymentModalOpen(true);
                            } catch (e) {
                                setError("Could not retrieve your E-Wallet balance. Please try again.");
                            }
                        }}
                        className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-md font-semibold"
                    >
                        Details are Correct
                    </button>
                </div>
            </div>
        );
    };

    const renderPaymentModal = () => {
        if (!isPaymentModalOpen || !dataForVerification || !settings) return null;

        const hasSufficientFunds = walletBalance !== null && walletBalance >= settings.admissionFee;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
                <div className="bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-md">
                    <h2 className="text-2xl font-bold mb-4 text-white">Admission Fee Payment</h2>
                    <p className="text-gray-300 mb-6">To complete your application, you must pay the admission fee from your E-Wallet.</p>
                    <div className="bg-gray-700 p-4 rounded-lg text-center mb-6 space-y-2">
                        <div>
                            <p className="text-sm text-gray-400">Amount Due</p>
                            <p className="text-3xl font-bold text-cyan-400">UGX {settings.admissionFee.toLocaleString()}</p>
                        </div>
                        <div className="pt-2 border-t border-gray-600">
                            <p className="text-sm text-gray-400">Your E-Wallet Balance</p>
                            <p className={`text-xl font-bold ${hasSufficientFunds ? 'text-white' : 'text-red-400'}`}>
                                {walletBalance !== null ? `UGX ${walletBalance.toLocaleString()}` : 'Loading...'}
                            </p>
                        </div>
                    </div>

                    {!hasSufficientFunds && walletBalance !== null && (
                        <div className="bg-red-500/20 text-red-300 p-3 rounded-md text-center mb-4">
                            <p className="font-semibold">Insufficient Funds</p>
                            <p className="text-sm">Please top up your E-Wallet to complete this transaction.</p>
                        </div>
                    )}

                    <div className="flex justify-end space-x-4">
                        <button onClick={() => setIsPaymentModalOpen(false)} className="px-5 py-2 bg-gray-600 hover:bg-gray-500 rounded-md font-semibold">Cancel</button>
                        <button
                            onClick={handlePaymentConfirmed}
                            className="px-5 py-2 bg-green-600 hover:bg-green-700 rounded-md font-semibold disabled:bg-gray-500 disabled:cursor-not-allowed"
                            disabled={!hasSufficientFunds}
                        >
                            Confirm Payment
                        </button>
                    </div>
                </div>
            </div>
        );
    };
    
    const renderSubmissionContent = () => {
        if (dataForVerification) return renderVerificationView();
        if (isLoading) return <div className="text-center p-8"><p className="mb-4">Processing...</p><div className="w-full bg-gray-700 rounded-full h-2.5"><div className="bg-cyan-600 h-2.5 rounded-full" style={{ width: `${progress || 0}%` }}></div></div></div>;
        if (error) return <div className="bg-red-500/20 text-red-300 p-4 rounded-lg">{error}</div>;

        switch (selfAdmissionTab) {
            case 'scan':
                return (
                    <div className="space-y-4">
                        {!isCameraOn && !capturedImage && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <label htmlFor="slip-upload" className="cursor-pointer flex flex-col items-center justify-center p-6 bg-gray-700 hover:bg-gray-600 rounded-lg border-2 border-dashed border-gray-500"><svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg><span>Upload pass slip</span></label>
                                    <input id="slip-upload" type="file" className="hidden" accept="image/*" onChange={handleSlipScanUpload} />
                                    <button onClick={startCamera} className="flex flex-col items-center justify-center p-6 bg-gray-700 hover:bg-gray-600 rounded-lg border-2 border-dashed border-gray-500"><svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2-2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg><span>Use Camera</span></button>
                                </div>
                                <button onClick={handlePasteFromClipboard} className="w-full flex items-center justify-center p-3 bg-gray-700 hover:bg-gray-600 rounded-lg border-2 border-dashed border-gray-500"><svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-gray-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg><span>Paste Image</span></button>
                            </div>
                        )}
                        {isCameraOn && <div className="text-center space-y-4"><video ref={videoRef} autoPlay playsInline className="w-full rounded-lg" /><div className="flex justify-center gap-4"><button onClick={captureImage} className="px-6 py-2 bg-cyan-600 rounded-lg">Capture</button><button onClick={stopCamera} className="px-6 py-2 bg-red-600 rounded-lg">Cancel</button></div></div>}
                    </div>
                );
            case 'index':
                return (
                    <form onSubmit={(e) => { e.preventDefault(); handleIndexLookup(selfIndex); }} className="space-y-4">
                        <label htmlFor="selfIndex" className="block text-gray-300">UNEB Index Number</label>
                        <input id="selfIndex" value={selfIndex} onChange={e => setSelfIndex(e.target.value)} placeholder="e.g., UXXXX/XXX" required className="w-full max-w-sm px-4 py-2 text-white bg-gray-700 rounded-md" />
                        <button type="submit" className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-md font-semibold">Look Up</button>
                    </form>
                );
            default: return null;
        }
    };

    return (
        <div>
            {renderPaymentModal()}
            <header className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-white">Smart Admission Portal</h2>
                    <p className="text-gray-400 mt-1">Submit your results to begin the admission process.</p>
                </div>
                <button onClick={onBack} className="text-sm px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md font-semibold">&larr; Back to Dashboard</button>
            </header>
            
            <div className="bg-gray-800 rounded-lg shadow-xl p-6">
                {!dataForVerification && (
                     <div ref={admissionModeDropdownRef} className="relative mb-6">
                        <button onClick={() => setIsAdmissionModeDropdownOpen(o => !o)} className="w-full sm:w-auto px-6 py-3 bg-gray-700 font-semibold rounded-lg flex justify-between items-center">
                            <span>{selfAdmissionTab ? `Method: ${selfAdmissionTab.charAt(0).toUpperCase() + selfAdmissionTab.slice(1)}` : 'Select Admission Method...'}</span>
                             <svg className={`w-5 h-5 ml-2 transform transition-transform ${isAdmissionModeDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        {isAdmissionModeDropdownOpen && (
                            <div className="absolute top-full left-0 mt-2 w-full sm:w-72 bg-gray-700 border-gray-600 rounded-lg shadow-xl z-20">
                                <button onClick={() => { resetState(); setSelfAdmissionTab('scan'); setIsAdmissionModeDropdownOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-gray-600 rounded-t-lg">Scan Pass Slip</button>
                                <button onClick={() => { resetState(); setSelfAdmissionTab('index'); setIsAdmissionModeDropdownOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-gray-600 rounded-b-lg">Use Index Number</button>
                            </div>
                        )}
                    </div>
                )}
                {renderSubmissionContent()}
            </div>
        </div>
    );
};

// --- Smart ID Viewer Modal ---
interface SmartIdViewerProps {
    user: User;
    school: School;
    settings: any; // Can be SmartIDSettings or CustomIdTemplate
    templateType: 'default' | 'custom';
    onClose: () => void;
}

const SmartIdViewer: React.FC<SmartIdViewerProps> = ({ user, school, settings, templateType, onClose }) => {
    const viewerContainerRef = useRef<HTMLDivElement>(null);
    const [viewerScale, setViewerScale] = useState(1);

     useEffect(() => {
        const calculateScale = () => {
            if (viewerContainerRef.current) {
                const containerWidth = viewerContainerRef.current.offsetWidth;
                if (containerWidth > 0) {
                    setViewerScale(containerWidth / 512);
                }
            }
        };
        const timer = setTimeout(calculateScale, 50);
        const observer = new ResizeObserver(calculateScale);
        const container = viewerContainerRef.current;
        if (container) observer.observe(container);
        window.addEventListener('resize', calculateScale);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', calculateScale);
            if (container) observer.unobserve(container);
        };
    }, []);

    const renderCard = () => {
        if (templateType === 'custom') {
            return <CustomSmartIdCard user={user} school={school} template={settings as CustomIdTemplate} />;
        }
        return <SmartIdCard user={user} school={school} settings={settings} />;
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-xl text-white">
                 <header className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">My Smart ID</h2>
                </header>
                <main className="flex flex-col items-center">
                    <div ref={viewerContainerRef} className="w-full max-w-[512px]">
                        <div className="relative w-full aspect-[1.6]">
                            <div className="absolute top-0 left-0 origin-top-left" style={{ transform: `scale(${viewerScale})`, width: '512px', height: '320px' }}>
                                {renderCard()}
                            </div>
                        </div>
                    </div>
                    {templateType === 'default' && <p className="text-sm text-gray-400 mt-2">Click the card to flip it.</p>}
                </main>
                 <footer className="mt-6 flex justify-between items-center">
                    <button onClick={onClose} className="px-5 py-2 bg-gray-600 hover:bg-gray-500 rounded-md font-semibold">
                        &larr; Back
                    </button>
                </footer>
            </div>
        </div>
    );
};

// --- MAIN STUDENT PAGE ---
interface StudentPageProps { user: User; onLogout: () => void; }

export const StudentPage: React.FC<StudentPageProps> = ({ user, onLogout }) => {
    const [currentUser, setCurrentUser] = useState(user);
    const [school, setSchool] = useState<School | null>(null);
    const [schoolName, setSchoolName] = useState(APP_TITLE);
    const [schoolLogo, setSchoolLogo] = useState('');
    const [availableModules, setAvailableModules] = useState<Module[]>([]);
    const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'my-results', or a module ID
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isIdCardVisible, setIsIdCardVisible] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [classes, setClasses] = useState<SchoolClass[]>([]);
    
    // State for report card downloads
    const reportCardContainerRef = useRef<HTMLDivElement>(null);
    const [reportToDownload, setReportToDownload] = useState<InternalExamResult | null>(null);

    // New state for ID card settings
    const [idCardSettings, setIdCardSettings] = useState<any>(null);
    const [idCardTemplateType, setIdCardTemplateType] = useState<'default' | 'custom'>('default');

    const refreshModulesAndSettings = useCallback(() => {
        if (currentUser.schoolId) {
            const currentSchool = getAllSchools().find(s => s.id === currentUser.schoolId);
             if (currentSchool) {
                setSchool(currentSchool);
                setSchoolName(currentSchool.name);
                setClasses(classService.getClassesForSchool(currentSchool.id));
                const homeContent = getHomePageContent(currentSchool.id);
                setSchoolLogo(homeContent.hero.logoUrl);
                const allModules = getAllModules();
                const activeAndPublishedModules = currentSchool.modules
                    .filter(m => m.status === 'active' || m.status === 'published')
                    .map(m => allModules.find(mod => mod.id === m.moduleId))
                    .filter((m): m is Module => !!m);
                setAvailableModules(activeAndPublishedModules);

                // Load ID Card Settings
                const settings = smartIdService.getSmartIdSettings(currentSchool.id);
                setIdCardTemplateType(settings.templateType);
                if (settings.templateType === 'custom') {
                    setIdCardSettings(customIdTemplateService.getCustomIdTemplate(currentSchool.id));
                } else {
                    setIdCardSettings(settings);
                }
            }
        }
    }, [currentUser.schoolId]);

    useEffect(() => {
        refreshModulesAndSettings();
        const interval = setInterval(() => heartbeat(currentUser.studentId), 5000);
        return () => clearInterval(interval);
    }, [refreshModulesAndSettings, currentUser.studentId]);

    const handleModuleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const viewId = e.target.value;
        setCurrentView(viewId || 'dashboard');
    };
    
    // Effect to handle report card generation and download
    useEffect(() => {
        if (reportToDownload && reportCardContainerRef.current && school) {
            setIsDownloading(true);
            // Short delay to ensure the component has rendered with the new props
            setTimeout(() => {
                html2canvas(reportCardContainerRef.current!, {
                    scale: 2, // Higher resolution
                    useCORS: true,
                }).then(canvas => {
                    const link = document.createElement('a');
                    link.download = `report-card-${user.name}-${reportToDownload.term.replace(/\s/g, '_')}.png`;
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                }).catch(err => {
                    console.error("Failed to generate report card:", err);
                    alert("Sorry, there was an error downloading your report card.");
                }).finally(() => {
                    setReportToDownload(null);
                    setIsDownloading(false);
                });
            }, 300);
        }
    }, [reportToDownload, school, user.name]);
    
    const handleDownloadId = async () => {
        if (!school) return;
        // This function will render a hidden version of the card for download
        // We will repurpose the reportCardContainerRef for this
        // For simplicity, we'll just implement the report card download first.
    };
    
    const renderDownloadableId = () => {
        if (!school || !idCardSettings) return null;
        if (idCardTemplateType === 'custom') {
            return <CustomSmartIdCardDownloadable user={currentUser} school={school} template={idCardSettings as CustomIdTemplate} />;
        }
        return (
            <div className="flex flex-col space-y-4">
                <div id="id-card-front-container">
                    <SmartIdCardFront user={currentUser} school={school} settings={idCardSettings} />
                </div>
                <div id="id-card-back-container">
                    <SmartIdCardBack user={currentUser} school={school} settings={idCardSettings} />
                </div>
            </div>
        );
    };

    const renderMainContent = () => {
        const activeModule = availableModules.find(m => m.id === currentView);

        if (currentView === 'my-results') {
            return <StudentResultsView user={currentUser} onDownload={setReportToDownload} isDownloading={isDownloading}/>;
        }
        if (activeModule?.name === SMART_ADMISSION_MODULE_NAME) {
            return <StudentAdmissionPortal user={currentUser} onBack={() => setCurrentView('dashboard')} />;
        }
        if (activeModule?.name === MESSAGE_MODULE_NAME) {
            return <SocialHubPage user={currentUser} onLogout={onLogout} />;
        }
        if (activeModule?.name === E_WALLET_MODULE_NAME) {
             return <EWalletPage user={currentUser} />;
        }
        if (activeModule?.name === ONLINE_MODULE_NAME) {
            return <OnlineFeedPage user={currentUser} onLogout={onLogout} onBackToDashboard={() => setCurrentView('dashboard')} />;
        }
        if (activeModule?.name === E_CANTEEN_MODULE_NAME && school) {
            if (currentUser.role === 'canteen_seller' && currentUser.shopId) {
                return <CanteenSellerDashboard user={currentUser} school={school} />;
            }
            return <ECanteenStudentPage school={school} user={currentUser} />;
        }
        if (activeModule?.name === NCHE_MODULE_NAME) {
            return <StudentNcheView user={currentUser} />;
        }
        if (activeModule?.name === EXPLORATION_MODULE_NAME) {
            return <ExplorationPage user={currentUser} />;
        }
        
        if (activeModule?.name === SMART_STUDENT_ID_MODULE_NAME) {
            return (
                 <div>
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                        <div>
                            <h2 className="text-2xl sm:text-3xl font-bold text-white">{SMART_STUDENT_ID_MODULE_NAME}</h2>
                            <p className="text-gray-400 mt-1">View and download your official student ID card.</p>
                        </div>
                    </div>
                    <div className="bg-gray-800 rounded-lg shadow-xl p-8 text-center flex items-center justify-center min-h-[300px]">
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                            <button onClick={() => setIsIdCardVisible(true)} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-md font-semibold text-lg flex items-center space-x-2"><IdCardIcon /><span>View My ID Card</span></button>
                            <button onClick={handleDownloadId} disabled={true} className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 rounded-md font-semibold text-lg flex items-center space-x-2 disabled:bg-gray-500"><DownloadIcon /><span>Download ID</span></button>
                        </div>
                    </div>
                </div>
            );
        }

        const dashboardTitle = activeModule ? activeModule.name : "Student Dashboard";
        return (
            <div>
                 <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-white">{dashboardTitle}</h2>
                        <p className="text-gray-400 mt-1">Welcome back, {currentUser.name}!</p>
                    </div>
                </div>
                <NotificationPermissionBanner />
            </div>
        );
    };

    const navItems = [
        { id: 'dashboard', name: 'Dashboard', icon: <DashboardIcon /> },
        { id: 'my-results', name: 'My Results', icon: <ResultsIcon /> }
    ];

    return (
        <div className="flex h-screen bg-gray-900 text-white font-sans">
            {isIdCardVisible && school && idCardSettings && (
                 <SmartIdViewer user={currentUser} school={school} settings={idCardSettings} templateType={idCardTemplateType} onClose={() => setIsIdCardVisible(false)} />
            )}
            
            {/* Hidden container for downloads */}
            <div ref={reportCardContainerRef} className="fixed -left-[9999px] top-0 p-4 bg-transparent">
                {reportToDownload && school && <ReportCard user={currentUser} school={school} result={reportToDownload} />}
            </div>
            
            <aside className={`bg-gray-800 text-white ${isSidebarOpen ? 'w-64 p-4' : 'w-20 p-2'} transition-all duration-300 flex-shrink-0 flex flex-col`}>
                 <div className="flex items-center justify-center mb-8 h-10">
                     {!isSidebarOpen && <button onClick={() => setIsSidebarOpen(true)} className="p-2 rounded-md hover:bg-gray-700"><HamburgerIcon /></button>}
                     {isSidebarOpen && (
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center space-x-2 overflow-hidden pr-2">
                                <img src={schoolLogo || `https://picsum.photos/seed/default-logo/100/100`} alt="School Logo" className="w-10 h-10 rounded-full object-contain bg-white p-0.5 flex-shrink-0" />
                                <span className="font-bold text-xl truncate">{schoolName.split(' ')[0]}</span>
                            </div>
                            <button onClick={() => setIsSidebarOpen(false)} className="p-2 rounded-md hover:bg-gray-700 flex-shrink-0"><CloseIcon /></button>
                        </div>
                     )}
                </div>
                <nav className="space-y-2 flex-grow">
                     {navItems.map(item => (
                        <button key={item.id} onClick={() => setCurrentView(item.id)} className={`w-full flex items-center space-x-3 p-3 rounded-md transition-colors ${currentView === item.id ? 'bg-cyan-600' : 'hover:bg-gray-700'}`}>
                            {item.icon} {isSidebarOpen && <span>{item.name}</span>}
                        </button>
                    ))}

                    {availableModules.length > 0 && (
                         <div className="w-full flex items-center space-x-3 p-3 rounded-md">
                            <ModulesIcon />
                            {isSidebarOpen && (
                                <select
                                    value={availableModules.find(m => m.id === currentView) ? currentView : ''}
                                    onChange={handleModuleSelect}
                                    className="w-full p-2 bg-gray-700 rounded-md text-white border-gray-600 focus:ring-cyan-500 focus:border-cyan-500"
                                >
                                    <option value="">Active Modules...</option>
                                    {availableModules.map(module => (
                                        <option key={module.id} value={module.id}>
                                            {module.name}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                     )}
                </nav>
            </aside>
            
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="flex-shrink-0 flex items-center justify-end p-4 bg-gray-800 border-l border-gray-700 shadow-md">
                    <div className="flex items-center space-x-4">
                        <NotificationBell userId={currentUser.studentId} />
                        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setIsProfileOpen(true)}>
                            <UserAvatar
                                name={currentUser.name}
                                avatarUrl={currentUser.avatarUrl}
                                className="w-10 h-10 rounded-full object-cover border-2 border-gray-600"
                            />
                            <div className="text-right">
                                <p className="font-semibold hidden sm:block">{currentUser.name}</p>
                                <p className="font-semibold sm:hidden">{currentUser.name.split(' ')[0]}</p>
                                <p className="text-sm text-gray-400 capitalize">{currentUser.role.replace('_', ' ')}</p>
                            </div>
                        </div>
                        <button onClick={onLogout} className="p-3 rounded-full text-red-500 hover:bg-red-500/20 transition-colors" title="Logout">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        </button>
                    </div>
                </header>

                <main className="flex-1 p-4 lg:p-8 overflow-y-auto border-l border-gray-700">
                    <div className="container mx-auto">
                        {renderMainContent()}
                    </div>
                </main>
            </div>
            {isProfileOpen && (
                <ProfilePage
                    user={currentUser}
                    onClose={() => setIsProfileOpen(false)}
                    onProfileUpdate={(updatedUser) => {
                        setCurrentUser(updatedUser as User);
                        localStorage.setItem('360_smart_school_session', JSON.stringify(updatedUser));
                    }}
                    classes={classes}
                />
            )}
        </div>
    );
};


// --- Results Analytics Sub-component ---
const TrendUpIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 11.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414v-2.586z" clipRule="evenodd" /></svg>;
const TrendDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12 13a1 1 0 100 2h5a1 1 0 001-1V9a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 8.586 3.707 4.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L10 9.414l3.293 3.293a1 1 0 001.414-1.414V13z" clipRule="evenodd" /></svg>;
const ArrowUpIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>;
const ArrowDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>;
const StarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>;
const TargetIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>;
const ThumbsUpIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor"><path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" /></svg>;


const ResultsAnalytics: React.FC<{ results: InternalExamResult[] }> = ({ results }) => {
    // 1. Sort results to get latest and previous
    // FIX: Replaced brittle string splitting with a more robust regex-based parser
    // to handle various term formats and prevent runtime errors.
    const sortedResults = [...results].sort((a, b) => {
        const parseTerm = (term: string): { year: number; termNum: number } => {
            const yearMatch = term.match(/(\d{4})/);
            const termMatch = term.match(/Term (\d+)/i);
            // FIX: Replaced ambiguous Number() coercion with parseInt() for explicit integer parsing.
            const year = yearMatch ? parseInt(yearMatch[1], 10) : 0;
            const termNum = termMatch ? parseInt(termMatch[1], 10) : 0;
            return { year, termNum };
        };
        const termA = parseTerm(a.term);
        const termB = parseTerm(b.term);
        if (termA.year !== termB.year) {
            return termB.year - a.year;
        }
        return termB.termNum - termA.termNum;
    });

    const latestResult = sortedResults[0];
    const previousResult = sortedResults[1];

    // 2. New subject categorization logic
    const { bestSubjects, betterSubjects, poorlySubjects } = useMemo(() => {
        if (!latestResult) {
            return { bestSubjects: [], betterSubjects: [], poorlySubjects: [] };
        }
        // FIX: Replaced Number() with parseFloat(String()) to fix a TS error and handle potential string values in data.
        const allSubjects = [...latestResult.subjects].sort((a, b) => parseFloat(String(b.score)) - parseFloat(String(a.score)));
        return {
            bestSubjects: allSubjects.filter(s => parseFloat(String(s.score)) >= 80),
            betterSubjects: allSubjects.filter(s => parseFloat(String(s.score)) >= 60 && parseFloat(String(s.score)) < 80),
            poorlySubjects: allSubjects.filter(s => parseFloat(String(s.score)) < 60),
        };
    }, [latestResult]);


    // 3. Compare with previous term if available
    const comparison = useMemo(() => {
        if (!previousResult) return null;

        const prevScores = new Map(previousResult.subjects.map(s => [s.name, s.score]));
        const changes = latestResult.subjects
            .map(currentSub => {
                const prevScore = prevScores.get(currentSub.name);
                if (prevScore === undefined) return null;
                // FIX: Added explicit type conversion to prevent potential runtime errors with mixed types.
                return { name: currentSub.name, change: parseFloat(String(currentSub.score)) - parseFloat(String(prevScore)) };
            })
            .filter((c): c is { name: string; change: number } => c !== null);

        changes.sort((a, b) => b.change - a.change);
        
        return {
            overallChange: latestResult.average - previousResult.average,
            mostImproved: changes.filter(c => c.change > 0).slice(0, 3),
            areasForFocus: changes.filter(c => c.change < 0).reverse().slice(0, 3),
        };
    }, [latestResult, previousResult]);

    // 4. New rendering variables to implement the requested logic
    const showBestCard = bestSubjects.length > 5;
    const betterContent = showBestCard ? betterSubjects : [...bestSubjects, ...betterSubjects].sort((a, b) => parseFloat(String(b.score)) - parseFloat(String(a.score)));
    
    return (
        <div className="space-y-6 animate-slide-in-left-fade">
            <h3 className="text-xl font-bold text-white">Performance Overview</h3>
            
            {comparison && (
                 <div className="bg-gray-800 p-4 rounded-lg flex items-center justify-center space-x-3 text-center">
                    {comparison.overallChange >= 0 ? <TrendUpIcon /> : <TrendDownIcon />}
                    <div>
                        <p className="font-semibold">Overall Term Performance</p>
                        <p className={`text-lg font-bold ${comparison.overallChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                           {comparison.overallChange >= 0 ? '+' : ''}{comparison.overallChange.toFixed(2)}% average
                        </p>
                         <p className="text-xs text-gray-400">Compared to {previousResult.term}</p>
                    </div>
                </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Best Performed Card - only appears if count > 5 */}
                {showBestCard && (
                    <div className="bg-gray-800 p-4 rounded-lg">
                        <h4 className="flex items-center gap-2 font-semibold text-lg mb-3"><StarIcon />Best Performed <span className="text-sm text-gray-400">({latestResult.term})</span></h4>
                        <ul className="space-y-2">
                            {bestSubjects.map(sub => (
                                 <li key={sub.name} className="flex justify-between items-center text-sm">
                                    <span>{sub.name}</span>
                                    <span className="font-bold text-green-400">{sub.score}%</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Better Performed Card - with merged content and conditional colors */}
                {betterContent.length > 0 && (
                     <div className="bg-gray-800 p-4 rounded-lg">
                        <h4 className="flex items-center gap-2 font-semibold text-lg mb-3"><ThumbsUpIcon />Better Performed <span className="text-sm text-gray-400">({latestResult.term})</span></h4>
                         <ul className="space-y-2">
                            {betterContent.map(sub => (
                                 <li key={sub.name} className="flex justify-between items-center text-sm">
                                    <span>{sub.name}</span>
                                    <span className={`font-bold ${parseFloat(String(sub.score)) >= 80 ? 'text-green-400' : 'text-orange-400'}`}>{sub.score}%</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Poorly Performed Card - only if subjects < 60 exist */}
                {poorlySubjects.length > 0 && (
                     <div className="bg-gray-800 p-4 rounded-lg">
                        <h4 className="flex items-center gap-2 font-semibold text-lg mb-3"><TargetIcon />Poorly Performed <span className="text-sm text-gray-400">({latestResult.term})</span></h4>
                         <ul className="space-y-2">
                            {poorlySubjects.map(sub => (
                                 <li key={sub.name} className="flex justify-between items-center text-sm">
                                    <span>{sub.name}</span>
                                    <span className="font-bold text-red-400">{sub.score}%</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {comparison && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-800 p-4 rounded-lg">
                        <h4 className="font-semibold text-lg mb-3">Most Improved</h4>
                        <ul className="space-y-2">
                             {comparison.mostImproved.map(sub => (
                                <li key={sub.name} className="flex justify-between items-center text-sm">
                                    <span>{sub.name}</span>
                                    <span className="flex items-center font-semibold text-green-400"><ArrowUpIcon /> +{sub.change.toFixed(1)}%</span>
                                </li>
                            ))}
                            {comparison.mostImproved.length === 0 && <p className="text-sm text-gray-400">No subjects showed improvement this term.</p>}
                        </ul>
                    </div>
                    <div className="bg-gray-800 p-4 rounded-lg">
                        <h4 className="font-semibold text-lg mb-3">Areas for Focus</h4>
                        <ul className="space-y-2">
                            {comparison.areasForFocus.map(sub => (
                                <li key={sub.name} className="flex justify-between items-center text-sm">
                                    <span>{sub.name}</span>
                                    <span className="flex items-center font-semibold text-red-400"><ArrowDownIcon /> {sub.change.toFixed(1)}%</span>
                                </li>
                            ))}
                            {comparison.areasForFocus.length === 0 && <p className="text-sm text-gray-400">No subjects declined this term. Great work!</p>}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
};


// --- Student Results View Sub-component ---
interface StudentResultsViewProps {
    user: User;
    onDownload: (result: InternalExamResult) => void;
    isDownloading: boolean;
}
const StudentResultsView: React.FC<StudentResultsViewProps> = ({ user, onDownload, isDownloading }) => {
    const internalResults = user.internalExams || [];
    // FIX: Replaced localeCompare with a robust parsing function to ensure correct chronological sorting of terms.
    const sortedInternalResults = [...internalResults].sort((a, b) => {
        const parseTerm = (term: string): { year: number; termNum: number } => {
            const yearMatch = term.match(/(\d{4})/);
            const termMatch = term.match(/Term (\d+)/i);
            // FIX: Replaced Number() with parseInt() for explicit integer parsing, ensuring consistency.
            const year = yearMatch ? parseInt(yearMatch[1], 10) : 0;
            const termNum = termMatch ? parseInt(termMatch[1], 10) : 0;
            return { year, termNum };
        };
        const termA = parseTerm(a.term);
        const termB = parseTerm(b.term);
        if (termA.year !== termB.year) {
            return termB.year - termA.year;
        }
        return termB.termNum - termA.termNum;
    });
    const unebSlip = user.unebPassSlip;

    const hasNoResults = internalResults.length === 0 && !unebSlip;

    if (hasNoResults) {
        return (
            <div className="text-center p-8 bg-gray-800 rounded-lg">
                <h3 className="text-xl font-bold">No Academic Records Found</h3>
                <p className="text-gray-400 mt-2">Your official UNEB results or internal school results have not been added to your profile yet.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">My Academic Records</h2>

            {unebSlip && (
                 <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
                    <h3 className="text-xl font-bold text-cyan-400 mb-4">Official UNEB Results ({unebSlip.level} - {unebSlip.year})</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm mb-4">
                        <div><strong className="text-gray-400 block">Name:</strong> <span className="text-white">{unebSlip.name}</span></div>
                        <div><strong className="text-gray-400 block">Index Number:</strong> <span className="text-white">{unebSlip.indexNo}</span></div>
                         {unebSlip.result && <div><strong className="text-gray-400 block">Result:</strong> <span className="text-white font-bold">{unebSlip.result}</span></div>}
                         {unebSlip.aggregate && <div><strong className="text-gray-400 block">Aggregate:</strong> <span className="text-white font-bold">{unebSlip.aggregate}</span></div>}
                    </div>
                     <details className="mt-4">
                        <summary className="cursor-pointer text-sm text-gray-400 hover:text-white font-semibold">Show Subject Details</summary>
                         <table className="w-full mt-2 text-sm">
                            <thead className="text-left text-gray-400">
                                <tr><th className="p-2">Subject</th><th className="p-2 text-center">Grade</th></tr>
                            </thead>
                            <tbody>
                                {unebSlip.subjects.map(sub => (
                                    <tr key={sub.name} className="border-t border-gray-700">
                                        <td className="p-2">{sub.name}</td>
                                        <td className="p-2 text-center font-semibold">{sub.grade}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </details>
                </div>
            )}
            
            {internalResults.length > 0 && (
                <>
                    <div className="pt-6 border-t border-gray-700">
                        <ResultsAnalytics results={internalResults} />
                    </div>
                    <div className="pt-6 border-t border-gray-700">
                        <h3 className="text-xl font-bold text-white">Internal School Reports</h3>
                         {sortedInternalResults.map(result => (
                            <div key={result.term} className="bg-gray-800 p-6 rounded-lg shadow-xl mt-4">
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4">
                                    <h3 className="text-xl font-bold text-cyan-400">{result.term}</h3>
                                    <div className="flex items-center gap-4 text-center mt-2 sm:mt-0">
                                        <div><p className="text-xs text-gray-400">Avg. Score</p><p className="font-bold">{result.average.toFixed(2)}%</p></div>
                                        <div><p className="text-xs text-gray-400">Position</p><p className="font-bold">{result.classPosition}</p></div>
                                    </div>
                                </div>
                                
                                <details className="mt-4">
                                    <summary className="cursor-pointer text-sm text-gray-400 hover:text-white font-semibold">Show Subject Details</summary>
                                    <table className="w-full mt-2 text-sm">
                                        <thead className="text-left text-gray-400">
                                            <tr><th className="p-2">Subject</th><th className="p-2 text-center">Score</th><th className="p-2 text-center">Grade</th></tr>
                                        </thead>
                                        <tbody>
                                            {result.subjects.map(sub => (
                                                <tr key={sub.name} className="border-t border-gray-700">
                                                    <td className="p-2">{sub.name}</td>
                                                    <td className="p-2 text-center">{sub.score}%</td>
                                                    <td className="p-2 text-center font-semibold">{sub.grade}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </details>
                                
                                <div className="text-right mt-4">
                                    <button 
                                        onClick={() => onDownload(result)} 
                                        disabled={isDownloading}
                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md text-sm font-semibold flex items-center gap-2 disabled:bg-indigo-400 disabled:cursor-wait"
                                    >
                                        <DownloadIcon /> {isDownloading ? 'Generating...' : 'Download Report Card'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};