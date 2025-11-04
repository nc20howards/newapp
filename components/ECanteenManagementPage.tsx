import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { School, CanteenShop, AdminUser, CanteenSettings, PaymentMethod, User, CanteenOrder, CanteenTable } from '../types';
import * as canteenService from '../services/canteenService';
import ECanteenAdminPage from './ECanteenAdminPage';
import * as eWalletService from '../services/eWalletService';
import { findUserById } from '../services/groupService';
import ConfirmationModal from './ConfirmationModal';
import { assignCarrierToShop, getSchoolUsersBySchoolIds, unassignCarrierFromShop } from '../services/studentService';

interface ECanteenManagementPageProps {
    school: School;
    user: AdminUser;
}

const ECanteenManagementPage = ({ school, user }: ECanteenManagementPageProps) => {
    const [shops, setShops] = useState<CanteenShop[]>([]);
    const [selectedShop, setSelectedShop] = useState<CanteenShop | null>(null);
    const [modal, setModal] = useState<'addShop' | 'editShop' | 'manageCarriers' | null>(null);
    const [formData, setFormData] = useState<{ id?: string; name: string; description: string }>({ name: '', description: '' });
    const [error, setError] = useState('');
    
    const [activeTab, setActiveTab] = useState<'shops' | 'settings' | 'attendance' | 'seats'>('shops');
    const [settings, setSettings] = useState<CanteenSettings | null>(null);
    const [feedbackMessage, setFeedbackMessage] = useState('');
    const [confirmModal, setConfirmModal] = useState<{ title: string, message: React.ReactNode; onConfirm: () => void; } | null>(null);
    
    // --- State for Attendance Tab (Lifted Up) ---
    const [allOrders, setAllOrders] = useState<CanteenOrder[]>([]);
    const [attendanceSearchTerm, setAttendanceSearchTerm] = useState('');
    const [attendanceFilterShopId, setAttendanceFilterShopId] = useState('all');
    const [expandedAttendanceOrderId, setExpandedAttendanceOrderId] = useState<string | null>(null);
    const [schoolUsers, setSchoolUsers] = useState<User[]>([]);
    const [shopForCarrierManagement, setShopForCarrierManagement] = useState<CanteenShop | null>(null);

    // --- State for Seats Tab ---
    const [tableModal, setTableModal] = useState<'add' | 'edit' | null>(null);
    const [editingTable, setEditingTable] = useState<CanteenTable | null>(null);
    const [tableForm, setTableForm] = useState<{ label: string; capacity: number }>({ label: '', capacity: 4 });


    const refreshData = useCallback(() => {
        setShops(canteenService.getShopsForSchool(school.id));
        setSettings(canteenService.getCanteenSettings(school.id));
        const schoolOrders = canteenService.getOrdersForSchool(school.id);
        setAllOrders(schoolOrders);
        setSchoolUsers(getSchoolUsersBySchoolIds([school.id]));
    }, [school.id]);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    const showFeedback = (message: string, isSuccess: boolean = true) => {
        if (isSuccess) {
            setFeedbackMessage(message);
            setTimeout(() => setFeedbackMessage(''), 3000);
        } else {
            setError(message);
            setTimeout(() => setError(''), 3000);
        }
    };

    const handlePaymentMethodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newMethod = e.target.value as PaymentMethod;
        if (settings) {
            const updatedSettings = { ...settings, activePaymentMethod: newMethod };
            canteenService.saveCanteenSettings(updatedSettings);
            setSettings(updatedSettings);
            showFeedback('Payment method updated successfully!');
        }
    };

    const handleModalSubmit = () => {
        setError('');
        if (!formData.name) {
            setError("Shop name is required.");
            return;
        }
        try {
            if (modal === 'addShop') {
                canteenService.addShop(school.id, formData.name, formData.description);
            } else if (modal === 'editShop' && formData.id) {
                canteenService.updateShop(formData.id, formData.name, formData.description);
            }
            refreshData();
            setModal(null);
            setFormData({ name: '', description: '' });
        } catch (e) {
            setError((e as Error).message);
        }
    };

    const handleDeleteShop = (shop: CanteenShop) => {
        setConfirmModal({
            title: 'Delete Shop',
            message: `Are you sure you want to delete the shop "${shop.name}"? This will delete all its categories and menu items.`,
            onConfirm: () => {
                canteenService.deleteShop(shop.id);
                refreshData();
                setConfirmModal(null);
            }
        });
    };
    
    const completedOrders = useMemo(() => {
        return allOrders.filter(o => o.status === 'completed');
    }, [allOrders]);

    const filteredAttendanceOrders = useMemo(() => {
        return completedOrders
            .filter(order => attendanceFilterShopId === 'all' || order.shopId === attendanceFilterShopId)
            .filter(order => 
                attendanceSearchTerm === '' ||
                order.studentName.toLowerCase().includes(attendanceSearchTerm.toLowerCase()) ||
                order.studentId.toLowerCase().includes(attendanceSearchTerm.toLowerCase()) ||
                order.id.toLowerCase().includes(attendanceSearchTerm.toLowerCase())
            );
    }, [completedOrders, attendanceSearchTerm, attendanceFilterShopId]);

    const renderAttendanceView = () => {
        return (
            <div className="bg-gray-800 p-6 rounded-lg">
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <input
                        type="text"
                        value={attendanceSearchTerm}
                        onChange={e => setAttendanceSearchTerm(e.target.value)}
                        placeholder="Search by Student, Student ID, or Order ID..."
                        className="w-full sm:flex-grow p-2 bg-gray-700 rounded-md"
                    />
                    <select
                        value={attendanceFilterShopId}
                        onChange={e => setAttendanceFilterShopId(e.target.value)}
                        className="p-2 bg-gray-700 rounded-md"
                    >
                        <option value="all">All Shops</option>
                        {shops.map(shop => (
                            <option key={shop.id} value={shop.id}>{shop.name}</option>
                        ))}
                    </select>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-gray-700/50">
                            <tr>
                                <th className="p-3 text-left text-xs font-medium text-white uppercase tracking-wider">Order / Student</th>
                                <th className="p-3 text-left text-xs font-medium text-white uppercase tracking-wider">Shop</th>
                                <th className="p-3 text-left text-xs font-medium text-white uppercase tracking-wider">Completed At</th>
                                <th className="p-3 text-left text-xs font-medium text-white uppercase tracking-wider">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {filteredAttendanceOrders.length > 0 ? filteredAttendanceOrders.map(order => (
                                <React.Fragment key={order.id}>
                                    <tr className="hover:bg-gray-900/50">
                                        <td className="p-3">
                                            <p className="font-bold text-white">#{order.id.slice(-6)} - {order.studentName}</p>
                                            <p className="text-sm text-gray-400">{order.studentId}</p>
                                            <button onClick={() => setExpandedAttendanceOrderId(prev => prev === order.id ? null : order.id)} className="text-xs text-cyan-400 hover:underline mt-1">
                                                {expandedAttendanceOrderId === order.id ? 'Hide Items' : 'Show Items'}
                                            </button>
                                        </td>
                                        <td className="p-3 text-white">
                                            {shops.find(s => s.id === order.shopId)?.name || 'N/A'}
                                        </td>
                                        <td className="p-3 text-sm text-gray-400">
                                            {new Date(order.timestamp).toLocaleString()}
                                        </td>
                                        <td className="p-3 font-semibold text-white">
                                            UGX {order.totalAmount.toLocaleString()}
                                        </td>
                                    </tr>
                                    {expandedAttendanceOrderId === order.id && (
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
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            )) : (
                                <tr><td colSpan={4} className="text-center py-8 text-gray-400">No completed orders found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const handleSeatSettingsChange = (field: keyof typeof settings.seatSettings, value: any) => {
        if (settings) {
            const newSettings = { ...settings, seatSettings: { ...settings.seatSettings, [field]: value } };
            setSettings(newSettings);
        }
    };

    const handleSaveSeatSettings = () => {
        if (settings) {
            canteenService.saveCanteenSettings(settings);
            showFeedback("Seating settings saved successfully!");
        }
    };

    const handleTableSubmit = () => {
        if (!settings || !tableForm.label || tableForm.capacity <= 0) return;
        
        let newTables = [...settings.seatSettings.tables];
        if (tableModal === 'add') {
            const newTable: CanteenTable = { id: `table_${Date.now()}`, label: tableForm.label, capacity: tableForm.capacity };
            newTables.push(newTable);
        } else if (tableModal === 'edit' && editingTable) {
            newTables = newTables.map(t => t.id === editingTable.id ? { ...t, label: tableForm.label, capacity: tableForm.capacity } : t);
        }

        handleSeatSettingsChange('tables', newTables);
        setTableModal(null);
    };

    const handleDeleteTable = (tableId: string) => {
        if (settings) {
            const newTables = settings.seatSettings.tables.filter(t => t.id !== tableId);
            handleSeatSettingsChange('tables', newTables);
        }
    };

    const timePerBatch = useMemo(() => {
        if (!settings || !settings.seatSettings) return 0;
        const { totalStudents, breakfastMinutes, tables } = settings.seatSettings;
        const totalCapacity = tables.reduce((sum, t) => sum + t.capacity, 0);
        if (totalCapacity === 0 || totalStudents === 0) return 0;
        const numberOfBatches = Math.ceil(totalStudents / totalCapacity);
        if (numberOfBatches === 0) return 0;
        return breakfastMinutes / numberOfBatches;
    }, [settings]);

    const renderSeatsView = () => {
        if (!settings) return null;
        return (
             <div className="bg-gray-800 p-6 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Settings Form */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Total Students for Breakfast</label>
                            <input type="number" value={settings.seatSettings.totalStudents} onChange={e => handleSeatSettingsChange('totalStudents', parseInt(e.target.value, 10) || 0)} className="w-full p-2 bg-gray-700 rounded-md" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Breakfast Period (Minutes)</label>
                            <input type="number" value={settings.seatSettings.breakfastMinutes} onChange={e => handleSeatSettingsChange('breakfastMinutes', parseInt(e.target.value, 10) || 0)} className="w-full p-2 bg-gray-700 rounded-md" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Breakfast Start Time</label>
                            <input type="time" value={settings.seatSettings.breakfastStartTime} onChange={e => handleSeatSettingsChange('breakfastStartTime', e.target.value)} className="w-full p-2 bg-gray-700 rounded-md" />
                        </div>
                        <div className="border-t border-gray-700 pt-4">
                            <h4 className="font-bold mb-2">Calculated Timeframe</h4>
                            <div className="bg-gray-700 p-4 rounded-lg text-center">
                                <p className="text-gray-400">Recommended Time per Batch</p>
                                <p className="text-3xl font-bold text-cyan-400">{timePerBatch.toFixed(1)} <span className="text-lg">minutes</span></p>
                                <p className="text-xs text-gray-500 mt-2">This is the time each group of students should take to allow everyone to eat.</p>
                            </div>
                        </div>
                        <button onClick={handleSaveSeatSettings} className="w-full py-2 bg-cyan-600 hover:bg-cyan-700 rounded-md font-semibold">Save Settings</button>
                    </div>

                    {/* Table Management */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-bold text-lg">Manage Tables</h4>
                            <button onClick={() => { setTableForm({ label: '', capacity: 4 }); setTableModal('add'); }} className="px-3 py-1 bg-cyan-600 text-sm font-semibold rounded-md">+ Add</button>
                        </div>
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                            {settings.seatSettings.tables.map(table => (
                                <div key={table.id} className="bg-gray-700 p-2 rounded-md flex justify-between items-center">
                                    <span>Table <strong className="text-white">{table.label}</strong> (Capacity: <strong className="text-white">{table.capacity}</strong>)</span>
                                    <div className="space-x-2">
                                        <button onClick={() => { setEditingTable(table); setTableForm({ label: table.label, capacity: table.capacity }); setTableModal('edit'); }} className="text-xs text-cyan-400">Edit</button>
                                        <button onClick={() => handleDeleteTable(table.id)} className="text-xs text-red-400">Delete</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                {tableModal && (
                    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4">
                        <div className="bg-gray-900 rounded-lg p-6 w-full max-w-sm space-y-4">
                            <h3 className="text-xl font-bold">{tableModal === 'add' ? 'Add Table' : 'Edit Table'}</h3>
                            <div><label className="text-sm">Label</label><input value={tableForm.label} onChange={e => setTableForm({...tableForm, label: e.target.value})} className="w-full p-2 bg-gray-700 rounded mt-1" /></div>
                            <div><label className="text-sm">Capacity</label><input type="number" value={tableForm.capacity} onChange={e => setTableForm({...tableForm, capacity: parseInt(e.target.value, 10) || 0})} className="w-full p-2 bg-gray-700 rounded mt-1" /></div>
                            <div className="flex justify-end gap-2"><button onClick={() => setTableModal(null)} className="px-4 py-2 bg-gray-600 rounded">Cancel</button><button onClick={handleTableSubmit} className="px-4 py-2 bg-cyan-600 rounded">Save</button></div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    if (selectedShop) {
        return <ECanteenAdminPage shop={selectedShop} onBack={() => setSelectedShop(null)} user={user} />;
    }

    const renderModal = () => {
        if (!modal) return null;
        if (modal === 'manageCarriers' && shopForCarrierManagement) {
            const currentCarriers = schoolUsers.filter(u => shopForCarrierManagement.carrierIds?.includes(u.studentId));
            const potentialCarriers = schoolUsers.filter(u => !shopForCarrierManagement.carrierIds?.includes(u.studentId) && (u.role === 'student' || u.role === 'carrier'));

            return (
                 <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4">
                    <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl space-y-4 max-h-[90vh] flex flex-col">
                        <h3 className="text-xl font-bold">Manage Carriers for {shopForCarrierManagement.name}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow overflow-hidden">
                            <div className="bg-gray-900/50 p-3 rounded-lg flex flex-col">
                                <h4 className="font-semibold mb-2 flex-shrink-0">Assigned Carriers ({currentCarriers.length})</h4>
                                <div className="space-y-2 overflow-y-auto">
                                    {currentCarriers.map(carrier => (
                                        <div key={carrier.studentId} className="flex justify-between items-center p-2 bg-gray-700 rounded-md">
                                            <span>{carrier.name}</span>
                                            <button onClick={() => {unassignCarrierFromShop(carrier.studentId, shopForCarrierManagement.id); refreshData();}} className="px-2 py-1 text-xs bg-red-600 rounded-md">Unassign</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                             <div className="bg-gray-900/50 p-3 rounded-lg flex flex-col">
                                <h4 className="font-semibold mb-2 flex-shrink-0">Available Users ({potentialCarriers.length})</h4>
                                <div className="space-y-2 overflow-y-auto">
                                     {potentialCarriers.map(u => (
                                        <div key={u.studentId} className="flex justify-between items-center p-2 bg-gray-700 rounded-md">
                                            <span>{u.name} <span className="text-xs text-gray-400">({u.role})</span></span>
                                            <button onClick={() => {assignCarrierToShop(u.studentId, shopForCarrierManagement.id); refreshData();}} className="px-2 py-1 text-xs bg-green-600 rounded-md">Assign</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end"><button onClick={() => setModal(null)} className="px-4 py-2 bg-gray-600 rounded">Close</button></div>
                    </div>
                </div>
            )
        }
        return (
            <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4">
                <div className="bg-gray-800 rounded-lg p-6 w-full max-w-lg space-y-4">
                    <h3 className="text-xl font-bold">{modal === 'addShop' ? 'Create New Shop' : 'Edit Shop'}</h3>
                    {error && <p className="text-red-400 text-sm">{error}</p>}
                    <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Shop Name" className="w-full p-2 bg-gray-700 rounded" />
                    <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Description" rows={3} className="w-full p-2 bg-gray-700 rounded" />
                    <div className="flex justify-end space-x-2">
                        <button onClick={() => { setModal(null); setError(''); setFormData({ name: '', description: '' }); }} className="px-4 py-2 bg-gray-600 rounded">Cancel</button>
                        <button onClick={handleModalSubmit} className="px-4 py-2 bg-cyan-600 rounded">Save</button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full">
            {renderModal()}
            {confirmModal && (
                <ConfirmationModal
                    isOpen={true}
                    title={confirmModal.title}
                    message={confirmModal.message}
                    onConfirm={confirmModal.onConfirm}
                    onCancel={() => setConfirmModal(null)}
                    confirmButtonVariant="danger"
                    confirmText="Delete"
                />
            )}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-white">E-Canteen Management</h2>
                    <p className="text-gray-400 mt-1">Manage all canteen shops and settings in your school.</p>
                </div>
                {activeTab === 'shops' && (
                    <button onClick={() => setModal('addShop')} className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-md font-semibold">
                        + Add New Shop
                    </button>
                )}
            </div>
            
            <div className="flex items-center gap-2 p-1 bg-gray-800 rounded-lg mb-6">
                <button onClick={() => setActiveTab('shops')} className={`w-full py-2 text-sm font-semibold rounded-md ${activeTab === 'shops' ? 'bg-cyan-600' : 'hover:bg-gray-600'}`}>Shops</button>
                <button onClick={() => setActiveTab('settings')} className={`w-full py-2 text-sm font-semibold rounded-md ${activeTab === 'settings' ? 'bg-cyan-600' : 'hover:bg-gray-600'}`}>Settings</button>
                <button onClick={() => setActiveTab('seats')} className={`w-full py-2 text-sm font-semibold rounded-md ${activeTab === 'seats' ? 'bg-cyan-600' : 'hover:bg-gray-600'}`}>Seats</button>
                <button onClick={() => setActiveTab('attendance')} className={`w-full py-2 text-sm font-semibold rounded-md ${activeTab === 'attendance' ? 'bg-cyan-600' : 'hover:bg-gray-600'}`}>Attendance</button>
            </div>
            
            {feedbackMessage && <div className="bg-green-500/20 text-green-300 p-3 rounded-md mb-4">{feedbackMessage}</div>}
            {error && <div className="bg-red-500/20 text-red-300 p-3 rounded-md mb-4">{error}</div>}

            {activeTab === 'shops' && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {shops.map(shop => (
                            <div key={shop.id} className="bg-gray-800 p-6 rounded-lg shadow-xl flex flex-col justify-between">
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-2">{shop.name}</h3>
                                    <p className="text-gray-400 text-sm mb-4 min-h-[40px]">{shop.description}</p>
                                    <p className="text-xs text-gray-400">Carriers: {shop.carrierIds?.length || 0}</p>
                                </div>
                                <div className="flex justify-end flex-wrap gap-2 border-t border-gray-700 pt-4 mt-4">
                                     <button onClick={() => { setShopForCarrierManagement(shop); setModal('manageCarriers');}} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-md text-xs font-semibold">Carriers</button>
                                     <button onClick={() => { setModal('editShop'); setFormData(shop); }} className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 rounded-md text-xs font-semibold">Edit</button>
                                    <button onClick={() => handleDeleteShop(shop)} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded-md text-xs font-semibold">Delete</button>
                                    <button onClick={() => setSelectedShop(shop)} className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 rounded-md text-xs font-semibold">Manage</button>
                                </div>
                            </div>
                        ))}
                    </div>
                     {shops.length === 0 && (
                        <div className="text-center py-16 bg-gray-800 rounded-lg">
                            <p className="text-gray-400">No canteen shops have been created yet.</p>
                        </div>
                    )}
                </>
            )}

            {activeTab === 'settings' && (
                <div className="bg-gray-800 p-6 rounded-lg max-w-2xl mx-auto">
                    <h3 className="text-xl font-bold mb-4">Payment Settings</h3>
                    {settings ? (
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-300 mb-1">
                                    Select Payment Method
                                </label>
                                <select
                                    id="paymentMethod"
                                    value={settings.activePaymentMethod}
                                    onChange={handlePaymentMethodChange}
                                    className="w-full max-w-sm p-2 bg-gray-700 rounded-md"
                                >
                                    <option value="e_wallet">E-Wallet (Default App)</option>
                                    <option value="rfid">RFID</option>
                                    <option value="nfc">NFC</option>
                                    <option value="barcode">Barcode</option>
                                </select>
                                <p className="text-xs text-gray-400 mt-2">
                                    This setting determines the primary method students will use for payments at the canteen.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <p>Loading settings...</p>
                    )}
                </div>
            )}
            {activeTab === 'seats' && renderSeatsView()}
            {activeTab === 'attendance' && renderAttendanceView()}
        </div>
    );
};

export default ECanteenManagementPage;