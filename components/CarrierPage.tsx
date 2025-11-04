import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, School, CanteenShop, DeliveryNotification, CanteenOrder } from '../types';
import * as canteenService from '../services/canteenService';
import UserAvatar from './UserAvatar';

interface CarrierPageProps {
    user: User;
    school: School;
}

const CarrierPage: React.FC<CarrierPageProps> = ({ user, school }) => {
    const [assignedShop, setAssignedShop] = useState<CanteenShop | null>(null);
    const [notifications, setNotifications] = useState<DeliveryNotification[]>([]);
    const [orders, setOrders] = useState<CanteenOrder[]>([]);

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

    const handleServe = (notificationId: string) => {
        canteenService.markNotificationAsServed(notificationId);
        refreshData();
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
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Carrier Dashboard</h2>
            <p className="text-gray-400 mb-6">Serving for: <span className="font-bold text-white">{assignedShop.name}</span></p>

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
                                            <button onClick={() => handleServe(notification.id)} className="px-3 py-1 bg-green-600 hover:bg-green-700 text-xs font-semibold rounded-md">
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