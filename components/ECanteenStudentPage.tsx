import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { School, User, CanteenShop, CanteenCategory, CanteenMenuItem, CanteenOrder, CanteenSettings, DecodedQrOrder } from '../types';
import * as canteenService from '../services/canteenService';
import PinStrengthIndicator from './PinStrengthIndicator';
import * as eWalletService from './eWalletService';
import { findUserById } from '../services/groupService';
import * as studentService from '../services/studentService';

// --- ICONS ---
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>;
const MinusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" /></svg>;
const CartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>;
const SaveIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6a1 1 0 10-2 0v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2a1 1 0 11-2 0V4z" transform="rotate(180 10 10)"/><path d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7a1 1 0 011.414-1.414L8 12.586V5a1 1 0 012 0v7.586l3.293-3.293a1 1 0 011.414 0z" transform="rotate(180 10 10)"/><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 9.586V7z" clipRule="evenodd" /></svg>;
const DeleteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>;

// Make TypeScript aware of the globally loaded libraries
declare var JsBarcode: any;
declare var QRCode: any;
declare var ZXingBrowser: any;

/**
 * Extracts a student ID from a new 10-character barcode or an old plain ID.
 * @param barcodeValue The full string from the barcode scanner or input.
 * @param schoolId The ID of the school to search for students in.
 * @returns The extracted student ID, or null if no match is found.
 */
const extractStudentIdFromBarcode = (barcodeValue: string, schoolId: string): string | null => {
    if (!barcodeValue) {
        return null;
    }
    const usersInSchool = studentService.getSchoolUsersBySchoolIds([schoolId]);

    // Handle new 10-char format (e.g., OLS001XYZ1)
    if (barcodeValue.length >= 3) {
        const potentialIdPart = barcodeValue.substring(2);

        // Sort by studentId length, descending, to match longer IDs first (e.g., "S100" before "S10").
        usersInSchool.sort((a, b) => b.studentId.length - a.studentId.length);

        const foundUser = usersInSchool.find(user => potentialIdPart.startsWith(user.studentId));
        if (foundUser) {
            return foundUser.studentId;
        }
    }
    
    // Fallback for old system or if new format parse fails: check if the raw value is a student ID
    const fallbackUser = usersInSchool.find(user => user.studentId.toLowerCase() === barcodeValue.toLowerCase());
    if (fallbackUser) {
        return fallbackUser.studentId;
    }

    return null; // No match found
};


// --- SELLER DASHBOARD ---
export const CanteenSellerDashboard = ({ user, school }: { user: User; school: School }) => {
    const [shop, setShop] = useState<CanteenShop | null>(null);
    const [orders, setOrders] = useState<CanteenOrder[]>([]);
    const [activeTab, setActiveTab] = useState<'menu' | 'orders' | 'pos' | 'attendance'>('menu');
    
    // State for Menu Management
    const [categories, setCategories] = useState<CanteenCategory[]>([]);
    const [menuItems, setMenuItems] = useState<CanteenMenuItem[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<CanteenCategory | null>(null);
    const [modal, setModal] = useState<'addCategory' | 'editCategory' | 'addMenuItem' | 'editMenuItem' | null>(null);
    const [formData, setFormData] = useState<any>({});
    const [formError, setFormError] = useState('');
    
    // State for POS
    const [scannedStudentId, setScannedStudentId] = useState('');
    const [verifiedOrder, setVerifiedOrder] = useState<CanteenOrder | null>(null);
    const [posError, setPosError] = useState('');
    const [posSuccess, setPosSuccess] = useState('');
    const posInputRef = useRef<HTMLInputElement>(null);
    const [isProcessingImage, setIsProcessingImage] = useState(false);
    const mobileFileInputRef = useRef<HTMLInputElement>(null);
    const desktopFileInputRef = useRef<HTMLInputElement>(null);
    const desktopVideoRef = useRef<HTMLVideoElement>(null);
    const [isScanChoiceModalOpen, setIsScanChoiceModalOpen] = useState(false);
    const [isDesktopCameraModalOpen, setIsDesktopCameraModalOpen] = useState(false);
    const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceIndex, setSelectedDeviceIndex] = useState(0);

    const [canteenSettings, setCanteenSettings] = useState<CanteenSettings | null>(null);
    
    // New state for collapsible order details
    const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

    // New state for order selection
    const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
    const [orderStatusTab, setOrderStatusTab] = useState<CanteenOrder['status']>('pending');
    
    // State for Attendance tab
    const [attendanceSearchTerm, setAttendanceSearchTerm] = useState('');
    const [attendanceFeedback, setAttendanceFeedback] = useState({ message: '', type: '' });
    const [attendanceOrder, setAttendanceOrder] = useState<CanteenOrder | null>(null);
    const attendanceInputRef = useRef<HTMLInputElement>(null);

    const refreshSellerData = useCallback(() => {
        if (shop) {
            setCategories(canteenService.getCategoriesForShop(shop.id));
            setMenuItems(canteenService.getMenuItemsForShop(shop.id));
            setOrders(canteenService.getOrdersForShop(shop.id));
        }
    }, [shop]);
    
    useEffect(() => {
        if (user.shopId) {
            const userShop = canteenService.getShopsForSchool(school.id).find(s => s.id === user.shopId);
            setShop(userShop || null);
        }
        if (school.id) {
            setCanteenSettings(canteenService.getCanteenSettings(school.id));
        }
    }, [user.shopId, school.id]);

    useEffect(() => {
        if (shop) {
            refreshSellerData();
        }
    }, [shop, refreshSellerData]);
    
    // Auto-focus input when POS/Attendance tab is active
    useEffect(() => {
        if (activeTab === 'pos' && posInputRef.current) {
            posInputRef.current.focus();
        }
        if (activeTab === 'attendance' && attendanceInputRef.current) {
            attendanceInputRef.current.focus();
        }
    }, [activeTab]);

    useEffect(() => {
        if (categories.length > 0 && !selectedCategory) {
            setSelectedCategory(categories[0]);
        }
        if (categories.length === 0) {
            setSelectedCategory(null);
        }
    }, [categories, selectedCategory]);
    
    // Desktop Camera Stream Management
    useEffect(() => {
        let stream: MediaStream | null = null;
        const initializeCamera = async () => {
            if (desktopVideoRef.current?.srcObject) {
                (desktopVideoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
            }
            if (isDesktopCameraModalOpen && videoDevices.length === 0) {
                try {
                    const devices = await navigator.mediaDevices.enumerateDevices();
                    const videoDevs = devices.filter(d => d.kind === 'videoinput');
                    if (videoDevs.length === 0) {
                        setPosError("No camera found on this device.");
                        setIsDesktopCameraModalOpen(false); return;
                    }
                    setVideoDevices(videoDevs); return;
                } catch (err) {
                    setPosError("Could not list cameras. Please grant permissions.");
                    setIsDesktopCameraModalOpen(false); return;
                }
            }
            if (!isDesktopCameraModalOpen) {
                if (desktopVideoRef.current?.srcObject) {
                    (desktopVideoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
                }
                setVideoDevices([]); setSelectedDeviceIndex(0); return;
            }
            if (videoDevices.length > 0) {
                const deviceId = videoDevices[selectedDeviceIndex]?.deviceId;
                if (!deviceId) return;
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: deviceId } } });
                    if (desktopVideoRef.current) { desktopVideoRef.current.srcObject = stream; }
                } catch (err) {
                    console.error("Error starting camera stream:", err);
                    setPosError("Could not access the selected camera. Maybe it's in use by another app?");
                    if(videoDevices.length > 1) { setSelectedDeviceIndex(prev => (prev + 1) % videoDevices.length); }
                    else { setIsDesktopCameraModalOpen(false); }
                }
            }
        };
        initializeCamera();
        return () => { stream?.getTracks().forEach(track => track.stop()); };
    }, [isDesktopCameraModalOpen, videoDevices, selectedDeviceIndex]);

    const filteredOrders = useMemo(() => {
        return orders.filter(o => o.status === orderStatusTab);
    }, [orders, orderStatusTab]);

    useEffect(() => {
        setSelectedOrderIds([]);
    }, [orderStatusTab]);

    const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.checked) {
            setSelectedOrderIds(filteredOrders.map(o => o.id));
        } else {
            setSelectedOrderIds([]);
        }
    };

    const handleSelectOne = (orderId: string, isChecked: boolean) => {
        setSelectedOrderIds(prev => {
            if (isChecked) {
                return [...prev, orderId];
            } else {
                return prev.filter(id => id !== orderId);
            }
        });
    };

    const handleBulkStatusUpdate = (newStatus: CanteenOrder['status']) => {
        selectedOrderIds.forEach(orderId => {
            canteenService.updateOrderStatus(orderId, newStatus);
        });
        setSelectedOrderIds([]);
        refreshSellerData();
    };

    const itemsForSelectedCategory = selectedCategory
        ? menuItems.filter(item => item.categoryId === selectedCategory.id)
        : [];
    
    const resetPos = () => {
        setPosError('');
        setPosSuccess('');
        setVerifiedOrder(null);
        setScannedStudentId('');
    };

    const handleFindOrder = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        resetPos();
    
        const barcodeValue = scannedStudentId.trim();
        if (!barcodeValue) {
            setPosError("Please enter or scan a Student ID barcode.");
            return;
        }
    
        if (!shop) {
            setPosError("Cannot verify order: seller's shop is not set.");
            return;
        }
    
        // New logic: Extract student ID from barcode
        const studentId = extractStudentIdFromBarcode(barcodeValue, school.id);
    
        if (!studentId) {
            setPosError(`No student found for barcode: ${barcodeValue}`);
            return;
        }
    
        const order = canteenService.findReadyOrderForStudent(studentId, shop.id);
    
        if (!order) {
            const student = findUserById(studentId);
            const studentName = student ? student.name : `ID ${studentId}`;
            setPosError(`No order is ready for pickup for ${studentName}.`);
            return;
        }
    
        setVerifiedOrder(order);
    };

    const processCapturedImage = (dataUrl: string) => {
        const codeReader = new ZXingBrowser.BrowserMultiFormatReader();
        codeReader.decodeFromImageUrl(dataUrl)
            .then((result: any) => {
                if(activeTab === 'pos') setScannedStudentId(result.getText());
                if(activeTab === 'attendance') setAttendanceSearchTerm(result.getText());
            })
            .catch((err: any) => {
                console.error(err);
                const errorMsg = "No barcode could be read from the image. Please try again with a clearer picture.";
                if(activeTab === 'pos') setPosError(errorMsg);
                if(activeTab === 'attendance') setAttendanceFeedback({ message: errorMsg, type: 'error' });
            })
            .finally(() => {
                setIsProcessingImage(false);
            });
    };
    
    const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if(activeTab === 'pos') resetPos();
            if(activeTab === 'attendance') setAttendanceFeedback({ message: '', type: '' });
            setIsProcessingImage(true);
            const reader = new FileReader();
            reader.onloadend = () => {
                const dataUrl = reader.result as string;
                processCapturedImage(dataUrl);
            };
            reader.readAsDataURL(file);
        }
        if (e.target) e.target.value = "";
    };

    const handleSnapDesktopPhoto = () => {
        if (desktopVideoRef.current) {
            if(activeTab === 'pos') resetPos();
            if(activeTab === 'attendance') setAttendanceFeedback({ message: '', type: '' });
            setIsProcessingImage(true);
            const canvas = document.createElement('canvas');
            canvas.width = desktopVideoRef.current.videoWidth;
            canvas.height = desktopVideoRef.current.videoHeight;
            const context = canvas.getContext('2d');
            if (context) {
                context.drawImage(desktopVideoRef.current, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg');
                processCapturedImage(dataUrl);
            }
            setIsDesktopCameraModalOpen(false);
        }
    };
    
    const handleScanButtonClick = () => {
        const isMobile = /Mobi/i.test(navigator.userAgent);
        if(activeTab === 'pos') resetPos();
        if(activeTab === 'attendance') setAttendanceFeedback({ message: '', type: '' });
        if (isMobile) {
            mobileFileInputRef.current?.click();
        } else {
            setIsScanChoiceModalOpen(true);
        }
    };
    
    const handleSwitchCamera = () => {
        if (videoDevices.length > 1) {
            setSelectedDeviceIndex(prevIndex => (prevIndex + 1) % videoDevices.length);
        }
    };


    const handleModalSubmit = () => {
        setFormError('');
        if (!shop) return;
        try {
            switch (modal) {
                case 'addCategory':
                    canteenService.addCategory(shop.id, formData.name);
                    break;
                case 'editCategory':
                    canteenService.updateCategory(formData.id, formData.name);
                    break;
                case 'addMenuItem':
                    canteenService.addMenuItem({
                        shopId: shop.id,
                        categoryId: selectedCategory!.id,
                        name: formData.name,
                        description: formData.description,
                        price: Number(formData.price),
                        imageUrl: formData.imageUrl || `https://picsum.photos/seed/${formData.name}/200`,
                        isAvailable: formData.isAvailable ?? true,
                    });
                    break;
                case 'editMenuItem':
                    canteenService.updateMenuItem(formData.id, {
                        name: formData.name,
                        description: formData.description,
                        price: Number(formData.price),
                        imageUrl: formData.imageUrl,
                        isAvailable: formData.isAvailable,
                    });
                    break;
            }
            refreshSellerData();
            setModal(null);
            setFormData({});
        } catch (e) {
            setFormError((e as Error).message);
        }
    };

    const handleDeleteCategory = (categoryId: string) => {
        if (window.confirm("Are you sure? This will also delete all menu items in this category.")) {
            canteenService.deleteCategory(categoryId);
            setSelectedCategory(null);
            refreshSellerData();
        }
    };

    const handleDeleteMenuItem = (itemId: string) => {
        if (window.confirm("Are you sure you want to delete this menu item?")) {
            canteenService.deleteMenuItem(itemId);
            refreshSellerData();
        }
    };

    const handleAvailabilityToggle = (itemId: string, isAvailable: boolean) => {
        canteenService.updateMenuItem(itemId, { isAvailable: !isAvailable });
        refreshSellerData();
    };

    const handleStatusUpdate = (orderId: string, status: CanteenOrder['status']) => {
        canteenService.updateOrderStatus(orderId, status);
        refreshSellerData();
    };
    
    const handleCompleteScannedOrder = async () => {
        if (!verifiedOrder || !shop) {
            setPosError("No order data to process.");
            return;
        }

        setPosError('');
        setPosSuccess('');

        try {
            await canteenService.completeScannedOrder(verifiedOrder.id, user.studentId);
            
            setPosSuccess(`Payment of UGX ${verifiedOrder.totalAmount.toLocaleString()} from ${verifiedOrder.studentName} successful!`);
            setVerifiedOrder(null);
            setScannedStudentId('');
            refreshSellerData(); // Refresh orders list
        } catch (error) {
            setPosError((error as Error).message);
        }
    };

    const handleToggleDetails = (orderId: string) => {
        setExpandedOrderId(prevId => prevId === orderId ? null : orderId);
    };
    
    useEffect(() => {
        if (scannedStudentId && activeTab === 'pos') {
            handleFindOrder();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scannedStudentId, activeTab]);
    
    const handleAttendanceCheck = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setAttendanceFeedback({ message: '', type: '' });
        setAttendanceOrder(null);
        if (!shop) return;
    
        const studentId = extractStudentIdFromBarcode(attendanceSearchTerm, school.id);
        if (!studentId) {
            setAttendanceFeedback({ message: `No student found for ID: ${attendanceSearchTerm}`, type: 'error' });
            return;
        }
    
        const order = canteenService.getOrderForAttendanceCheck(studentId, school.id);
        if (order) {
            setAttendanceOrder(order);
        } else {
            const student = findUserById(studentId);
            setAttendanceFeedback({ message: `No pending delivery order found for ${student?.name || studentId} at their assigned time.`, type: 'error' });
        }
    };

    const handleSignIn = () => {
        if (!attendanceOrder) return;
        try {
            canteenService.signInForCanteenAttendance(attendanceOrder.id);
            setAttendanceFeedback({ message: `${attendanceOrder.studentName} has been signed in. The carrier has been notified.`, type: 'success' });
            setAttendanceOrder(null);
            setAttendanceSearchTerm('');
        } catch (e) {
            setAttendanceFeedback({ message: (e as Error).message, type: 'error' });
        }
    };

    useEffect(() => {
        if (attendanceSearchTerm && activeTab === 'attendance') {
            handleAttendanceCheck();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [attendanceSearchTerm, activeTab]);

    const renderAttendanceTab = () => {
        return (
            <div className="bg-gray-800 p-6 rounded-lg max-w-2xl mx-auto space-y-4">
                <h3 className="text-xl font-bold">Canteen Attendance Sign-In</h3>
                <p className="text-sm text-gray-400">Enter or scan a student's ID to sign them in for their meal. This will notify the carrier of their table number.</p>
                <form onSubmit={handleAttendanceCheck} className="flex items-center gap-2">
                    <input ref={attendanceInputRef} type="text" value={attendanceSearchTerm} onChange={e => setAttendanceSearchTerm(e.target.value)} placeholder="Enter or Scan Student ID..." autoFocus className="w-full px-4 py-2 text-white bg-gray-700 rounded-md" />
                    <button type="button" onClick={handleScanButtonClick} disabled={isProcessingImage} className="p-2.5 bg-gray-600 rounded-md" title="Scan with Camera">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM2 14a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2zM14 14a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /><path d="M8 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H10a2 2 0 01-2-2V6zM8 14a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H10a2 2 0 01-2-2v-2z" /></svg>
                    </button>
                    <button type="submit" className="px-4 py-2 bg-cyan-600 rounded-md">Check</button>
                </form>
                <div className="bg-gray-700 p-4 rounded-lg min-h-[150px]">
                    <h4 className="font-bold mb-2">Verification</h4>
                    {isProcessingImage && <p className="text-cyan-400">Processing image...</p>}
                    {attendanceFeedback.message && <p className={`text-sm ${attendanceFeedback.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>{attendanceFeedback.message}</p>}
                    {attendanceOrder && (
                        <div className="space-y-3">
                            <div><p className="text-xs text-gray-400">Student</p><p className="font-semibold">{attendanceOrder.studentName} ({attendanceOrder.studentId})</p></div>
                            <div><p className="text-xs text-gray-400">Assigned Table & Time</p><p className="font-semibold">Table {attendanceOrder.assignedTable} at {new Date(attendanceOrder.assignedSlotStart!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p></div>
                            <button onClick={handleSignIn} className="w-full py-2 bg-green-600 hover:bg-green-700 rounded-md font-semibold">Sign In & Notify Carrier</button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderSellerModal = () => {
        if (!modal) return null;
        const title = {
            addCategory: 'Add New Category',
            editCategory: 'Edit Category',
            addMenuItem: 'Add New Menu Item',
            editMenuItem: 'Edit Menu Item',
        }[modal];

        return (
            <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4">
                <div className="bg-gray-800 rounded-lg p-6 w-full max-w-lg space-y-4">
                    <h3 className="text-xl font-bold">{title}</h3>
                    {formError && <p className="text-red-400 text-sm">{formError}</p>}
                    {(modal === 'addCategory' || modal === 'editCategory') && (
                        <input value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Category Name" className="w-full p-2 bg-gray-700 rounded" />
                    )}
                    {(modal === 'addMenuItem' || modal === 'editMenuItem') && (
                        <>
                            <input value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Item Name" className="w-full p-2 bg-gray-700 rounded" />
                            <textarea value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Description" rows={2} className="w-full p-2 bg-gray-700 rounded" />
                            <input type="number" value={formData.price || ''} onChange={e => setFormData({ ...formData, price: e.target.value })} placeholder="Price (UGX)" className="w-full p-2 bg-gray-700 rounded" />
                            <input value={formData.imageUrl || ''} onChange={e => setFormData({ ...formData, imageUrl: e.target.value })} placeholder="Image URL" className="w-full p-2 bg-gray-700 rounded" />
                             <label className="flex items-center space-x-2 text-white">
                                <input type="checkbox" checked={formData.isAvailable ?? true} onChange={e => setFormData({ ...formData, isAvailable: e.target.checked })} className="form-checkbox h-5 w-5 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500"/>
                                <span>Is Available</span>
                            </label>
                        </>
                    )}
                    <div className="flex justify-end space-x-2">
                        <button onClick={() => { setModal(null); setFormError(''); setFormData({}); }} className="px-4 py-2 bg-gray-600 rounded">Cancel</button>
                        <button onClick={handleModalSubmit} className="px-4 py-2 bg-cyan-600 rounded">Save</button>
                    </div>
                </div>
            </div>
        );
    };

    if (!shop) {
        return <div className="p-4 text-center">You are not assigned to a canteen shop.</div>;
    }

    return (
        <div>
            {renderSellerModal()}
            <input type="file" accept="image/*" capture="environment" ref={mobileFileInputRef} onChange={handleImageCapture} className="hidden" />
            <input type="file" accept="image/*" ref={desktopFileInputRef} onChange={handleImageCapture} className="hidden" />

            {isScanChoiceModalOpen && (
                <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4">
                    <div className="bg-gray-800 rounded-lg p-6 w-full max-w-sm space-y-4 text-center">
                        <h3 className="text-xl font-bold">Choose Scan Method</h3>
                        <p className="text-sm text-gray-400">Select how you want to provide the barcode image.</p>
                        <div className="flex flex-col space-y-3">
                            <button onClick={() => { setIsDesktopCameraModalOpen(true); setIsScanChoiceModalOpen(false); }} className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 rounded-md font-semibold">Use Webcam</button>
                            <button onClick={() => { desktopFileInputRef.current?.click(); setIsScanChoiceModalOpen(false); }} className="w-full py-3 bg-gray-600 hover:bg-gray-500 rounded-md font-semibold">Upload from File</button>
                        </div>
                        <button onClick={() => setIsScanChoiceModalOpen(false)} className="mt-2 text-sm text-gray-400 hover:underline">Cancel</button>
                    </div>
                </div>
            )}

            {isDesktopCameraModalOpen && (
                 <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4">
                    <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl space-y-4">
                        <h3 className="text-xl font-bold">Scan Student ID</h3>
                        <div className="relative">
                            <video ref={desktopVideoRef} autoPlay playsInline className="w-full rounded-lg bg-gray-900"></video>
                            {videoDevices.length > 1 && (
                                <button onClick={handleSwitchCamera} className="absolute bottom-4 right-4 p-2 bg-black/50 rounded-full text-white hover:bg-black/75" title="Switch Camera">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.664 0l3.181-3.183m-4.991-2.695v4.992h-4.992" /></svg>
                                </button>
                            )}
                        </div>
                        <div className="flex justify-center space-x-4">
                            <button onClick={() => setIsDesktopCameraModalOpen(false)} className="px-6 py-2 bg-gray-600 rounded-md">Cancel</button>
                            <button onClick={handleSnapDesktopPhoto} className="px-6 py-2 bg-cyan-600 rounded-md font-semibold">Snap Photo</button>
                        </div>
                    </div>
                </div>
            )}

            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Seller Dashboard: {shop.name}</h2>
            <p className="text-gray-400 mt-1 mb-6">{shop.description}</p>

            <div className="flex items-center gap-2 p-1 bg-gray-800 rounded-lg mb-6">
                <button onClick={() => setActiveTab('menu')} className={`w-full py-2 text-sm font-semibold rounded-md ${activeTab === 'menu' ? 'bg-cyan-600' : 'hover:bg-gray-600'}`}>Menu</button>
                <button onClick={() => setActiveTab('orders')} className={`w-full py-2 text-sm font-semibold rounded-md ${activeTab === 'orders' ? 'bg-cyan-600' : 'hover:bg-gray-600'}`}>Orders</button>
                <button onClick={() => setActiveTab('pos')} className={`w-full py-2 text-sm font-semibold rounded-md ${activeTab === 'pos' ? 'bg-cyan-600' : 'hover:bg-gray-600'}`}>POS</button>
                <button onClick={() => setActiveTab('attendance')} className={`w-full py-2 text-sm font-semibold rounded-md ${activeTab === 'attendance' ? 'bg-cyan-600' : 'hover:bg-gray-600'}`}>Attendance</button>
            </div>

            {activeTab === 'menu' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1 bg-gray-800 p-4 rounded-lg">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold">Categories</h3>
                            <button onClick={() => { setFormData({}); setModal('addCategory'); }} className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-md"><PlusIcon /></button>
                        </div>
                        <div className="space-y-2">
                            {categories.map(cat => (
                                <div key={cat.id} onClick={() => setSelectedCategory(cat)} className={`p-3 rounded-md cursor-pointer ${selectedCategory?.id === cat.id ? 'bg-cyan-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
                                    <div className="flex justify-between items-center">
                                        <span className="font-semibold">{cat.name}</span>
                                        <div className="flex items-center space-x-2">
                                            <button onClick={(e) => { e.stopPropagation(); setFormData(cat); setModal('editCategory'); }} className="text-gray-400 hover:text-white"><EditIcon /></button>
                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); }} className="text-gray-400 hover:text-white"><DeleteIcon /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="md:col-span-2 bg-gray-800 p-4 rounded-lg">
                        {selectedCategory ? (
                            <>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold">Menu for: {selectedCategory.name}</h3>
                                    <button onClick={() => { setFormData({}); setModal('addMenuItem'); }} className="flex items-center space-x-2 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-sm font-semibold rounded-md"><PlusIcon /><span>Add Item</span></button>
                                </div>
                                <div className="space-y-2">
                                    {itemsForSelectedCategory.map(item => (
                                        <div key={item.id} className="bg-gray-700 p-3 rounded-md flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <img src={item.imageUrl} alt={item.name} className="w-12 h-12 rounded object-cover"/>
                                                <div>
                                                    <p className="font-semibold">{item.name}</p>
                                                    <p className="text-sm text-gray-400">UGX {item.price.toLocaleString()}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-3">
                                                <label className="relative inline-flex items-center cursor-pointer" title={item.isAvailable ? 'Mark as Unavailable' : 'Mark as Available'}>
                                                    <input type="checkbox" checked={item.isAvailable} onChange={() => handleAvailabilityToggle(item.id, item.isAvailable)} className="sr-only peer" />
                                                    <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                                                </label>
                                                <button onClick={() => { setFormData(item); setModal('editMenuItem'); }} className="text-gray-400 hover:text-white"><EditIcon /></button>
                                                <button onClick={() => handleDeleteMenuItem(item.id)} className="text-gray-400 hover:text-white"><DeleteIcon /></button>
                                            </div>
                                        </div>
                                    ))}
                                    {itemsForSelectedCategory.length === 0 && <p className="text-gray-400 text-center py-4">No items in this category.</p>}
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400">
                                <p>Select or create a category to manage menu items.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
             {activeTab === 'orders' && (
                <div className="space-y-4">
                    <div className="flex border-b border-gray-700 mb-4">
                        {(['pending', 'preparing', 'ready', 'completed'] as const).map(status => (
                            <button
                                key={status}
                                onClick={() => setOrderStatusTab(status)}
                                className={`px-4 py-2 text-sm font-semibold capitalize ${orderStatusTab === status ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white'}`}
                            >
                                {status} ({orders.filter(o => o.status === status).length})
                            </button>
                        ))}
                    </div>

                    {selectedOrderIds.length > 0 && (
                        <div className="bg-gray-700 p-3 rounded-lg mb-4 flex justify-between items-center">
                            <p className="font-semibold">{selectedOrderIds.length} order(s) selected</p>
                            <div className="space-x-2">
                                {orderStatusTab === 'pending' && (
                                    <button onClick={() => handleBulkStatusUpdate('preparing')} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm font-semibold">Start Preparing</button>
                                )}
                                {orderStatusTab === 'preparing' && (
                                    <button onClick={() => handleBulkStatusUpdate('ready')} className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm font-semibold">Mark as Ready</button>
                                )}
                            </div>
                        </div>
                    )}
                    
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-gray-700/50">
                                <tr>
                                    <th className="p-3 w-4">
                                        <input
                                            type="checkbox"
                                            className="form-checkbox bg-gray-600 border-gray-500 rounded"
                                            checked={filteredOrders.length > 0 && selectedOrderIds.length === filteredOrders.length}
                                            onChange={handleSelectAll}
                                            ref={el => el && (el.indeterminate = selectedOrderIds.length > 0 && selectedOrderIds.length < filteredOrders.length)}
                                        />
                                    </th>
                                    <th className="p-3 text-left text-xs font-medium text-white uppercase tracking-wider">Order Details</th>
                                    <th className="p-3 text-left text-xs font-medium text-white uppercase tracking-wider">Amount</th>
                                    <th className="p-3 text-left text-xs font-medium text-white uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {filteredOrders.length > 0 ? filteredOrders.map(order => (
                                    <React.Fragment key={order.id}>
                                        <tr className="hover:bg-gray-900/50">
                                            <td className="p-3">
                                                <input
                                                    type="checkbox"
                                                    className="form-checkbox bg-gray-600 border-gray-500 rounded"
                                                    checked={selectedOrderIds.includes(order.id)}
                                                    onChange={(e) => handleSelectOne(order.id, e.target.checked)}
                                                />
                                            </td>
                                            <td className="p-3 text-white">
                                                <p className="font-bold">#{order.id.slice(-6)} - {order.studentName}</p>
                                                <p className="text-sm text-gray-400">{new Date(order.timestamp).toLocaleString()}</p>
                                                <button onClick={() => handleToggleDetails(order.id)} className="text-xs text-cyan-400 hover:underline">
                                                    {expandedOrderId === order.id ? 'Hide Items' : 'Show Items'}
                                                </button>
                                            </td>
                                            <td className="p-3 font-semibold text-white">UGX {order.totalAmount.toLocaleString()}</td>
                                            <td className="p-3">
                                                {order.status === 'pending' && <button onClick={() => handleStatusUpdate(order.id, 'preparing')} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Start Preparing</button>}
                                                {order.status === 'preparing' && <button onClick={() => handleStatusUpdate(order.id, 'ready')} className="px-3 py-1 bg-green-600 text-white rounded text-sm">Mark as Ready</button>}
                                            </td>
                                        </tr>
                                        {expandedOrderId === order.id && (
                                            <tr className="bg-gray-700/50">
                                                <td colSpan={4} className="p-4 border-t border-gray-700">
                                                    <h4 className="font-semibold text-sm mb-2 text-white">Order Items:</h4>
                                                    <ul className="space-y-1">
                                                        {order.items.map(item => (
                                                            <li key={item.itemId} className="text-sm flex justify-between text-white">
                                                                <span>{item.quantity} x {item.name}</span>
                                                                <span className="text-gray-300">UGX {(item.quantity * item.price).toLocaleString()}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                    <div className="mt-3 pt-3 border-t border-gray-600">
                                                        <h4 className="font-semibold text-sm mb-1 text-white">Delivery Information:</h4>
                                                        {order.deliveryMethod === 'delivery' ? (
                                                            <p className="text-sm text-gray-200">Table: {order.assignedTable || 'N/A'}</p>
                                                        ) : (
                                                            <p className="text-sm text-gray-300">Customer will pick up from the canteen.</p>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                )) : (
                                    <tr><td colSpan={4} className="text-center py-8 text-gray-400">No {orderStatusTab} orders.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {activeTab === 'pos' && (
                 <div className="bg-gray-800 p-6 rounded-lg max-w-2xl mx-auto space-y-4">
                    <h3 className="text-xl font-bold">Point of Sale</h3><p className="text-sm text-gray-400">Manually enter a Student ID or use your device camera to scan the barcode from the student's ID card.</p>
                    <form onSubmit={handleFindOrder} className="flex items-center gap-2">
                        <input ref={posInputRef} type="text" value={scannedStudentId} onChange={e => { resetPos(); setScannedStudentId(e.target.value); }} placeholder="Enter Student ID or Barcode..." autoFocus className="w-full px-4 py-2 text-white bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                        <button type="button" onClick={handleScanButtonClick} disabled={isProcessingImage} className="p-2.5 bg-gray-600 hover:bg-gray-500 rounded-md disabled:opacity-50" title="Scan with Camera">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM2 14a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2zM14 14a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /><path d="M8 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H10a2 2 0 01-2-2V6zM8 14a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H10a2 2 0 01-2-2v-2z" /></svg>
                        </button>
                        <button type="submit" className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 font-semibold rounded-md">Find</button>
                    </form>
                    <div className="bg-gray-700 p-4 rounded-lg min-h-[200px]">
                        <h4 className="font-bold mb-2">Order Verification</h4>
                        {isProcessingImage ? (
                            <div className="flex flex-col items-center justify-center h-full"><p className="text-cyan-400">Processing image...</p></div>
                        ) : (
                            <>
                                {posError && <p className="text-red-400 text-sm">{posError}</p>}
                                {posSuccess && <p className="text-green-400 text-sm">{posSuccess}</p>}
                                {verifiedOrder && (
                                    <div className="space-y-3">
                                        <div><p className="text-xs text-gray-400">Student</p><p className="font-semibold">{verifiedOrder.studentName} ({verifiedOrder.studentId})</p></div>
                                        <div><p className="text-xs text-gray-400">Items ({verifiedOrder.items.length})</p><ul className="text-sm list-disc list-inside">{verifiedOrder.items.map(item => (<li key={item.itemId}>{item.quantity} x {item.name}</li>))}</ul></div>
                                        <div className="border-t border-gray-600 pt-2"><p className="text-xs text-gray-400">Total Amount</p><p className="font-bold text-xl text-cyan-400">UGX {verifiedOrder.totalAmount.toLocaleString()}</p></div>
                                        <button onClick={handleCompleteScannedOrder} className="w-full py-2 bg-green-600 hover:bg-green-700 rounded-md font-semibold">Complete Order</button>
                                    </div>
                                )}
                                {!verifiedOrder && !posError && !posSuccess && (<p className="text-gray-400 text-sm">Waiting for a valid Student ID...</p>)}
                            </>
                        )}
                    </div>
                </div>
            )}
            {activeTab === 'attendance' && renderAttendanceTab()}
        </div>
    );
};


// --- STUDENT PAGE ---
interface ECanteenStudentPageProps {
    school: School;
    user: User;
}

const ECanteenStudentPage = ({ school, user }: ECanteenStudentPageProps) => {
    const [shops, setShops] = useState<CanteenShop[]>([]);
    const [selectedShop, setSelectedShop] = useState<CanteenShop | null>(null);
    const [categories, setCategories] = useState<CanteenCategory[]>([]);
    const [menu, setMenu] = useState<CanteenMenuItem[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<CanteenCategory | null>(null);

    const [cart, setCart] = useState<Record<string, number>>({});
    const [isCartOpen, setIsCartOpen] = useState(false);
    
    const [view, setView] = useState<'menu' | 'orders'>('menu');
    const [studentOrders, setStudentOrders] = useState<CanteenOrder[]>([]);
    
    const [canteenSettings, setCanteenSettings] = useState<CanteenSettings | null>(null);
    
    // Payment Modal State
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [pin, setPin] = useState('');
    const [pinError, setPinError] = useState('');
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'delivery'>('pickup');

    // Cancel Order Modal State
    const [orderToCancel, setOrderToCancel] = useState<CanteenOrder | null>(null);

    const refreshStudentOrders = useCallback(() => {
        setStudentOrders(canteenService.getOrdersForStudent(user.studentId));
    }, [user.studentId]);

    useEffect(() => {
        setShops(canteenService.getShopsForSchool(school.id));
        setCanteenSettings(canteenService.getCanteenSettings(school.id));
        refreshStudentOrders();
    }, [school.id, refreshStudentOrders]);
    
    // Polling for order status updates
    useEffect(() => {
        const interval = setInterval(() => {
            if (view === 'orders') {
                refreshStudentOrders();
            }
        }, 5000); // Poll every 5 seconds
        return () => clearInterval(interval);
    }, [view, refreshStudentOrders]);

    useEffect(() => {
        if (selectedShop) {
            const shopCategories = canteenService.getCategoriesForShop(selectedShop.id);
            setCategories(shopCategories);
            if (shopCategories.length > 0) {
                setSelectedCategory(shopCategories[0]);
            } else {
                setSelectedCategory(null);
            }
        } else {
            setCategories([]);
            setSelectedCategory(null);
        }
    }, [selectedShop]);

    useEffect(() => {
        if (selectedCategory) {
            setMenu(canteenService.getMenuItemsForCategory(selectedCategory.id));
        } else if (selectedShop) {
            // Show all items if no category is selected
            setMenu(canteenService.getMenuItemsForShop(selectedShop.id));
        } else {
            setMenu([]);
        }
    }, [selectedCategory, selectedShop]);
    
    // Reset cart if shop changes
    useEffect(() => {
        setCart({});
    }, [selectedShop]);

    const addToCart = (itemId: string) => {
        setCart(prev => ({ ...prev, [itemId]: (prev[itemId] || 0) + 1 }));
    };

    const removeFromCart = (itemId: string) => {
        setCart(prev => {
            const newCart = { ...prev };
            const quantity = newCart[itemId];
            if (typeof quantity === 'number' && quantity > 1) {
                newCart[itemId] = quantity - 1;
            } else {
                delete newCart[itemId];
            }
            return newCart;
        });
    };
    
    const handlePlaceOrder = () => {
        setPinError('');
        if (!selectedShop) {
            setPinError("No shop selected.");
            return;
        }
        try {
            const cartItems = Object.keys(cart).map(itemId => ({ itemId, quantity: cart[itemId] }));
            
            canteenService.placeOrder(selectedShop.id, user.studentId, cartItems, pin, deliveryMethod);
            
            setPaymentSuccess(true);
            setTimeout(() => {
                setIsPaymentModalOpen(false);
                setPaymentSuccess(false);
                setCart({});
                setPin('');
                setIsCartOpen(false);
                setView('orders');
                refreshStudentOrders();
                setDeliveryMethod('pickup');
            }, 2000);
            
        } catch (error) {
            setPinError((error as Error).message);
        }
    };

    const handleConfirmCancelOrder = () => {
        if (!orderToCancel) return;
        try {
            canteenService.cancelStudentOrder(orderToCancel.id, user.studentId);
            refreshStudentOrders();
            setOrderToCancel(null);
        } catch (error) {
            alert((error as Error).message);
            setOrderToCancel(null);
        }
    };
    
    const cartItems = Object.entries(cart).map(([itemId, quantity]) => {
        const item = canteenService.getMenuItemsForShop(selectedShop!.id).find(i => i.id === itemId);
        return item ? { ...item, quantity } : null;
    }).filter((i): i is (CanteenMenuItem & { quantity: number }) => !!i);

    const cartTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalCartItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    if (!selectedShop) {
        return (
            <div>
                 <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6">Choose a Canteen</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {shops.map(shop => (
                        <button key={shop.id} onClick={() => setSelectedShop(shop)} className="bg-gray-800 p-6 rounded-lg shadow-xl text-left hover:bg-gray-700 transition-colors">
                            <h3 className="text-xl font-bold text-white mb-2">{shop.name}</h3>
                            <p className="text-gray-400 text-sm">{shop.description}</p>
                        </button>
                    ))}
                </div>
            </div>
        );
    }
    
    const getOrderStatusColor = (status: CanteenOrder['status']) => {
        switch (status) {
            case 'pending': return 'bg-yellow-500/20 text-yellow-300';
            case 'preparing': return 'bg-blue-500/20 text-blue-300';
            case 'ready': return 'bg-green-500/20 text-green-300';
            case 'completed': return 'bg-gray-500/20 text-gray-300';
            case 'cancelled': return 'bg-red-500/20 text-red-300';
            default: return 'bg-gray-600';
        }
    };
    
    return (
        <div>
            {isCartOpen && (
                <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsCartOpen(false)}></div>
            )}
            <div className={`fixed bottom-0 sm:top-20 sm:bottom-auto inset-x-0 sm:left-auto sm:right-4 bg-gray-800 shadow-2xl z-50 rounded-lg transform transition-all duration-300 ease-in-out ${isCartOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'} sm:max-w-md sm:w-full flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[70vh] mx-4 sm:mx-0`}>
                 <div className="p-4 border-b border-gray-700 flex-shrink-0 flex justify-between items-center">
                    <h3 className="text-2xl font-bold">Your Order</h3>
                    <button onClick={() => setIsCartOpen(false)} className="text-gray-400 hover:text-white transition-colors" aria-label="Close cart">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                {cartItems.length > 0 ? (
                    <>
                        <div className="flex-grow overflow-y-auto space-y-3 p-4">
                            {cartItems.map(item => (
                                <div key={item.id} className="flex items-center justify-between bg-gray-700 p-2 rounded-lg">
                                    <img src={item.imageUrl} alt={item.name} className="w-12 h-12 rounded-md object-cover"/>
                                    <div className="flex-grow mx-3">
                                        <p className="font-semibold">{item.name}</p>
                                        <p className="text-sm text-gray-400">UGX {item.price.toLocaleString()}</p>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <button onClick={() => removeFromCart(item.id)} className="p-1 bg-gray-600 rounded-full"><MinusIcon/></button>
                                        <span className="w-6 text-center">{item.quantity}</span>
                                        <button onClick={() => addToCart(item.id)} className="p-1 bg-gray-600 rounded-full"><PlusIcon/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="border-t border-gray-700 p-4 mt-auto flex-shrink-0">
                            <div className="flex justify-between font-bold text-xl">
                                <span>Total</span>
                                <span>UGX {cartTotal.toLocaleString()}</span>
                            </div>
                            <button 
                                onClick={() => setIsPaymentModalOpen(true)}
                                className="w-full mt-4 py-3 bg-cyan-600 rounded-lg font-semibold hover:bg-cyan-700"
                            >
                                Proceed to Payment
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="flex items-center justify-center p-8">
                        <p className="text-gray-400 text-center">Your cart is empty.</p>
                    </div>
                )}
            </div>
            
            {isPaymentModalOpen && (
                 <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-[100] p-4">
                    <div className="bg-gray-800 rounded-lg p-6 w-full max-w-sm space-y-4">
                       {paymentSuccess ? (
                           <div className="text-center">
                                <h3 className="text-xl font-bold text-green-400">Payment Authorized!</h3>
                                <p className="text-gray-300 mt-2">Your order has been placed successfully.</p>
                           </div>
                       ) : (
                           <>
                                <h3 className="text-xl font-bold text-center">Confirm Your Order</h3>
                                
                                <div className="space-y-3">
                                    <p className="text-sm text-center text-gray-400">Total: <strong className="text-white">UGX {cartTotal.toLocaleString()}</strong></p>
                                    <div>
                                        <label className="text-sm font-semibold text-gray-300 block mb-2">Delivery Method</label>
                                        <div className="flex gap-2 p-1 bg-gray-700 rounded-lg">
                                            <button onClick={() => setDeliveryMethod('pickup')} className={`w-full py-2 rounded-md text-sm ${deliveryMethod === 'pickup' ? 'bg-cyan-600' : 'hover:bg-gray-600'}`}>Pickup</button>
                                            <button onClick={() => setDeliveryMethod('delivery')} className={`w-full py-2 rounded-md text-sm ${deliveryMethod === 'delivery' ? 'bg-cyan-600' : 'hover:bg-gray-600'}`}>Local Delivery</button>
                                        </div>
                                         {deliveryMethod === 'delivery' && <p className="text-xs text-gray-400 mt-2">A table and time slot will be automatically assigned to you upon payment.</p>}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-300 block text-center">Enter PIN to Authorize</label>
                                    <input type="password" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} maxLength={4} className="w-full p-3 text-2xl tracking-[1rem] text-center bg-gray-700 rounded-md" />
                                    <PinStrengthIndicator pin={pin} />
                                    {pinError && <p className="text-red-400 text-sm mt-2 text-center">{pinError}</p>}
                                </div>
                                <div className="flex justify-center space-x-2 pt-2">
                                     <button onClick={() => setIsPaymentModalOpen(false)} className="px-4 py-2 bg-gray-600 rounded-md">Cancel</button>
                                     <button onClick={handlePlaceOrder} className="px-4 py-2 bg-cyan-600 rounded-md">Confirm Order</button>
                                </div>
                           </>
                       )}
                    </div>
                </div>
            )}

            {orderToCancel && (
                 <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-[100] p-4">
                    <div className="bg-gray-800 rounded-lg p-6 w-full max-w-sm space-y-4 text-center">
                         <h3 className="text-xl font-bold">Cancel Order?</h3>
                         <p className="text-sm text-gray-300">Are you sure you want to cancel this order? The held funds of <strong className="text-white">UGX {orderToCancel.totalAmount.toLocaleString()}</strong> will be returned to your available balance.</p>
                         <div className="flex justify-center space-x-2 pt-2">
                             <button onClick={() => setOrderToCancel(null)} className="px-4 py-2 bg-gray-600 rounded-md">Nevermind</button>
                             <button onClick={handleConfirmCancelOrder} className="px-4 py-2 bg-red-600 rounded-md">Yes, Cancel</button>
                        </div>
                    </div>
                 </div>
            )}

            <header className="flex justify-between items-start mb-6">
                <div>
                     <button onClick={() => setSelectedShop(null)} className="text-sm text-cyan-400 hover:underline mb-2">&larr; Back to Shops</button>
                    <h2 className="text-2xl sm:text-3xl font-bold text-white">{selectedShop.name}</h2>
                    <p className="text-gray-400 mt-1">{selectedShop.description}</p>
                </div>
                <button onClick={() => setIsCartOpen(true)} className="relative p-2 bg-gray-800 rounded-full hover:bg-gray-700">
                    <CartIcon/>
                    {totalCartItems > 0 && <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500 text-xs font-bold text-white">{totalCartItems}</span>}
                </button>
            </header>
            
            <div className="flex items-center gap-2 p-1 bg-gray-800 rounded-lg mb-6">
                <button onClick={() => setView('menu')} className={`w-full py-2 text-sm font-semibold rounded-md ${view === 'menu' ? 'bg-cyan-600' : 'hover:bg-gray-600'}`}>Menu</button>
                <button onClick={() => setView('orders')} className={`w-full py-2 text-sm font-semibold rounded-md ${view === 'orders' ? 'bg-cyan-600' : 'hover:bg-gray-600'}`}>My Orders</button>
            </div>

            {view === 'menu' && (
                <>
                    <nav className="flex items-center space-x-2 overflow-x-auto pb-4 mb-4 -mx-4 px-4">
                        {categories.map(cat => (
                            <button key={cat.id} onClick={() => setSelectedCategory(cat)}
                                className={`px-4 py-2 text-sm font-semibold rounded-full whitespace-nowrap ${selectedCategory?.id === cat.id ? 'bg-cyan-600' : 'bg-gray-800 hover:bg-gray-700'}`}>
                                {cat.name} ({cat.itemCount})
                            </button>
                        ))}
                    </nav>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {menu.map(item => (
                            <div key={item.id} className={`bg-gray-800 rounded-lg shadow-xl flex flex-col ${!item.isAvailable ? 'opacity-50' : ''}`}>
                                <img src={item.imageUrl} alt={item.name} className="w-full h-32 object-cover rounded-t-lg"/>
                                <div className="p-4 flex-grow flex flex-col">
                                    <h4 className="font-bold text-lg flex-grow">{item.name}</h4>
                                    <p className="text-sm text-gray-400 mb-2 min-h-[40px]">{item.description}</p>
                                    <div className="flex justify-between items-center mt-2">
                                        <span className="font-bold text-cyan-400">UGX {item.price.toLocaleString()}</span>
                                        <button
                                            onClick={() => addToCart(item.id)}
                                            disabled={!item.isAvailable}
                                            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-md text-sm font-semibold disabled:bg-gray-600 disabled:cursor-not-allowed"
                                        >
                                            {cart[item.id] ? `Add More (${cart[item.id]})` : 'Add'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
            
            {view === 'orders' && (
                <div className="space-y-4">
                    {studentOrders.map(order => (
                        <div key={order.id} className="bg-gray-800 p-4 rounded-lg">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold">Order #{order.id.slice(-6)}</p>
                                    <p className="text-sm text-gray-400">{new Date(order.timestamp).toLocaleString()}</p>
                                </div>
                                <div className="text-right">
                                     <p className="font-bold text-lg text-cyan-400">UGX {order.totalAmount.toLocaleString()}</p>
                                     <span className={`px-3 py-1 text-xs font-semibold rounded-full capitalize ${getOrderStatusColor(order.status)}`}>
                                        {order.status === 'ready' ? 'Ready for Pickup' : order.status}
                                    </span>
                                </div>
                            </div>
                            <ul className="mt-2 border-t border-gray-700 pt-2 space-y-1">
                                {order.items.map(item => (
                                    <li key={item.itemId} className="text-sm flex justify-between">
                                        <span>{item.quantity} x {item.name}</span>
                                        <span className="text-gray-400">UGX {(item.quantity * item.price).toLocaleString()}</span>
                                    </li>
                                ))}
                            </ul>
                            {order.deliveryMethod === 'delivery' && (order.assignedTable || order.assignedSlotStart) && (
                                <div className="mt-3 p-3 bg-indigo-500/10 rounded-lg text-left border-l-4 border-indigo-400">
                                    <p className="font-semibold text-indigo-300">Your Schedule</p>
                                    <p className="text-sm text-gray-300">Table: <strong className="text-white">{order.assignedTable || 'TBA'}</strong></p>
                                    <p className="text-sm text-gray-300">Time: <strong className="text-white">{order.assignedSlotStart ? `${new Date(order.assignedSlotStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(order.assignedSlotEnd!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'TBA'}</strong></p>
                                </div>
                            )}
                            {order.status === 'ready' && canteenSettings?.activePaymentMethod === 'barcode' && (
                                <div className="mt-3 p-3 bg-green-500/10 rounded-lg text-center">
                                    <p className="font-semibold text-green-300">Ready for Pickup!</p>
                                    <p className="text-sm text-gray-300">Please present your Student ID card at the canteen to complete your order.</p>
                                </div>
                            )}
                             {order.status === 'pending' && (
                                <div className="flex justify-end mt-3">
                                    <button 
                                        onClick={() => setOrderToCancel(order)} 
                                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md text-sm"
                                    >
                                        Cancel Order
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                    {studentOrders.length === 0 && <p className="text-gray-400 text-center py-8">You haven't placed any orders yet.</p>}
                </div>
            )}
        </div>
    );
};

export default ECanteenStudentPage;