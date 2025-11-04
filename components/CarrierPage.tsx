import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { User, School, CanteenShop, DeliveryNotification, CanteenOrder } from '../types';
import * as canteenService from '../services/canteenService';
import UserAvatar from './UserAvatar';
import BarcodeScanner from './BarcodeScanner';

interface CarrierPageProps {
    user: User;
    school: School;
}

// --- POS Modal Sub-component ---
interface POSModalProps {
    data: { notification: DeliveryNotification; order?: CanteenOrder };
    currentUser: User;
    onClose: () => void;
    onComplete: () => void;
}

const POSModal: React.FC<POSModalProps> = ({ data, currentUser, onClose, onComplete }) => {
    const [verificationId, setVerificationId] = useState('');
    const [error, setError] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);

    const { notification, order } = data;

    const handleVerifyAndComplete = async () => {
        setError('');
        if (!order) {
            setError("Order details are missing.");
            return;
        }
        if (!verificationId.trim()) {
            setError("Please enter or scan the student's ID.");
            return;
        }

        setIsCompleting(true);
        try {
            if (verificationId.trim().toLowerCase() !== notification.studentId.toLowerCase()) {
                throw new Error("Student ID does not match the order.");
            }
            await canteenService.completeScannedOrder(order.id, currentUser.studentId);
            canteenService.markNotificationAsServed(notification.id);
            onComplete();
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsCompleting(false);
        }
    };
    
    const handleScanSuccess = (decodedText: string) => {
        setVerificationId(decodedText);
        setIsScanning(false);
    };

    if (!order) {
        return (
             <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4">
                <div className="bg-gray-800 rounded-lg p-6 w-full max-w-sm text-center">
                    <p className="text-red-400">Error: Could not load order details for this delivery.</p>
                    <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-600 rounded">Close</button>
                </div>
            </div>
        );
    }

    return (
        <>
            {isScanning && (
                <BarcodeScanner
                    onScanSuccess={handleScanSuccess}
                    onScanError={(err) => {
                        setError(`Scan failed: ${err.message}`);
                        setIsScanning(false);
                    }}
                    onClose={() => setIsScanning(false)}
                />
            )}
            <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4">
                <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md space-y-4">
                    <h3 className="text-xl font-bold">Verify & Complete Order</h3>
                    <div className="bg-gray-700 p-4 rounded-lg space-y-2">
                        <div className="flex justify-between"><span className="text-gray-400">Student:</span> <strong>{notification.studentName}</strong></div>
                        <div className="flex justify-between"><span className="text-gray-400">Table:</span> <strong>{notification.tableNumber}</strong></div>
                        <div className="flex justify-between font-bold text-lg border-t border-gray-600 pt-2"><span className="text-gray-400">Total:</span> <span>UGX {order.totalAmount.toLocaleString()}</span></div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-300 mb-1 block">Verify Student ID</label>
                        <div className="flex gap-2">
                            <input
                                value={verificationId}
                                onChange={(e) => setVerificationId(e.target.value)}
                                placeholder="Enter or Scan Student ID"
                                className="w-full p-2 bg-gray-900 rounded-md"
                            />
                            <button onClick={() => setIsScanning(true)} className="p-2 bg-gray-600 rounded-md">Scan</button>
                        </div>
                    </div>
                    {error && <p className="text-red-400 text-sm">{error}</p>}
                    <div className="flex justify-end gap-2 pt-2">
                        <button onClick={onClose} className="px-4 py-2 bg-gray-600 rounded">Cancel</button>
                        <button onClick={handleVerifyAndComplete} disabled={isCompleting} className="px-4 py-2 bg-green-600 rounded disabled:bg-gray-500">
                            {isCompleting ? 'Processing...' : 'Verify & Complete'}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};


const CarrierPage: React.FC<CarrierPageProps> = ({ user, school }) => {
    const [assignedShop, setAssignedShop] = useState<CanteenShop | null>(null);
    const [notifications, setNotifications] = useState<DeliveryNotification[]>([]);
    const [orders, setOrders] = useState<CanteenOrder[]>([]);
    const [posModalData, setPosModalData] = useState<{ notification: DeliveryNotification; order?: CanteenOrder } | null>(null);
    const [successMessage, setSuccessMessage] = useState('');

    const refreshData = useCallback(() => {
        if (assignedShop) {
            setNotifications(canteenService.getDeliveryNotificationsForShop(assignedShop.id));
            setOrders(canteenService.getOrdersForShop(assignedShop.id));
        }
    }, [assignedShop]);

    useEffect(() => {
        const shop = canteenService.getShopsForSchool(school.id).find(s => s.carrierIds?.includes(user.studentId));
        setAssignedShop(shop || null);
    }, [school.id, user.studentId]);
    
    useEffect(() => {
        refreshData();
        const interval = setInterval(refreshData, 3000); // Poll for new notifications
        return () => clearInterval(interval);
    }, [refreshData]);

    const handleOpenPosModal = (data: { notification: DeliveryNotification; order?: CanteenOrder }) => {
        setPosModalData(data);
    };
    
    const handleOrderComplete = () => {
        setPosModalData(null);
        refreshData();
        setSuccessMessage('Order completed successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
    };

    const tables = useMemo(() => {
        const tablesMap: Record<string, { notification: DeliveryNotification; order: CanteenOrder | undefined }[]> = {};
        const pendingNotifications = notifications.filter(n => n.status === 'pending');

        for (const notification of pendingNotifications) {
            if (!tablesMap[notification.tableNumber]) {
                tablesMap[notification.tableNumber] = [];
            }
            const order = orders.find(o => o.id === notification.orderId);
            tablesMap[notification.tableNumber].push({ notification, order });
        }
        return Object.entries(tablesMap).sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));
    }, [notifications, orders]);
    
    if (!assignedShop) {
        return <div className="text-center p-8 text-gray-400">You are not assigned to any shop as a carrier.</div>;
    }

    return (
        <div>
            {posModalData && (
                <POSModal
                    data={posModalData}
                    currentUser={user}
                    onClose={() => setPosModalData(null)}
                    onComplete={handleOrderComplete}
                />
            )}
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Carrier Dashboard</h2>
            <p className="text-gray-400 mb-6">Serving for: <span className="font-bold text-white">{assignedShop.name}</span></p>

            {successMessage && <div className="bg-green-500/20 text-green-300 p-3 rounded-lg mb-4">{successMessage}</div>}

            {tables.length === 0 ? (
                <div className="text-center py-16 bg-gray-800 rounded-lg">
                    <p className="text-gray-400">No pending deliveries right now. Great job!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tables.map(([tableNumber, items]) => (
                        <div key={tableNumber} className="bg-gray-800 p-4 rounded-lg shadow-xl">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold">Table {tableNumber}</h3>
                                <span className="px-3 py-1 bg-cyan-500/20 text-cyan-300 text-sm font-semibold rounded-full">
                                    {items.length} Unserved
                                </span>
                            </div>
                            <div className="space-y-3">
                                {items.map(({ notification, order }) => (
                                    <div key={notification.id} className="bg-gray-700 p-3 rounded-lg">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-3">
                                                <UserAvatar name={notification.studentName} className="w-10 h-10 rounded-full" />
                                                <div>
                                                    <p className="font-semibold">{notification.studentName}</p>
                                                    <p className="text-xs text-gray-400">Order #{notification.orderId.slice(-6)}</p>
                                                </div>
                                            </div>
                                            <button onClick={() => handleOpenPosModal({ notification, order })} className="px-3 py-1 bg-green-600 hover:bg-green-700 text-xs font-semibold rounded-md">
                                                Serve
                                            </button>
                                        </div>
                                        {order && (
                                            <details className="mt-2">
                                                <summary className="text-xs text-gray-400 cursor-pointer">View Items</summary>
                                                <ul className="text-xs text-gray-300 mt-1 pl-4 list-disc">
                                                    {order.items.map(item => <li key={item.itemId}>{item.quantity}x {item.name}</li>)}
                                                </ul>
                                            </details>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CarrierPage;