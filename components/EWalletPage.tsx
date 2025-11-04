import React, { useState, useEffect, useCallback } from 'react';
import { User, AdminUser, EWallet, EWalletTransaction, SchoolFee, PinResetRequest, Receipt } from '../types';
import * as eWalletService from '../services/eWalletService';
import * as userService from '../services/userService';
import * as studentService from '../services/studentService';
import * as receiptService from '../services/receiptService';
import PinStrengthIndicator from './PinStrengthIndicator';

// --- Reusable Icons ---
const WalletIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>;
const ArrowUpIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${className || ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>;
const ArrowDownIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${className || ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>;

interface EWalletPageProps {
    user: User | AdminUser;
}

const EWalletPage: React.FC<EWalletPageProps> = ({ user }) => {
    const [view, setView] = useState('dashboard');
    const [wallet, setWallet] = useState<EWallet | null>(null);
    const [transactions, setTransactions] = useState<EWalletTransaction[]>([]);
    const [schoolFees, setSchoolFees] = useState<SchoolFee[]>([]);
    const [pinResetRequests, setPinResetRequests] = useState<PinResetRequest[]>([]);
    const [schoolUsers, setSchoolUsers] = useState<User[]>([]);
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);

    const [modal, setModal] = useState<string | null>(null);
    const [pin, setPin] = useState('');
    const [pinError, setPinError] = useState('');
    const [currentAction, setCurrentAction] = useState<(() => void) | null>(null);
    
    // State for modal inputs
    const [topUpAmount, setTopUpAmount] = useState(0);
    const [payAmount, setPayAmount] = useState(0);
    const [payRecipient, setPayRecipient] = useState('');
    const [withdrawAmount, setWithdrawAmount] = useState(0);
    const [newPin, setNewPin] = useState('');
    const [confirmNewPin, setConfirmNewPin] = useState('');
    const [feedbackMessage, setFeedbackMessage] = useState('');

    // New state for filtering and sorting
    const [filteredTransactions, setFilteredTransactions] = useState<EWalletTransaction[]>([]);
    const [filterType, setFilterType] = useState('all');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [sortOption, setSortOption] = useState('newest');

    const isStudent = 'studentId' in user && user.role === 'student';
    const isHeadteacher = 'assignedSchoolIds' in user && (user as AdminUser).assignedSchoolIds.length > 0;
    const isSuperadmin = 'role' in user && user.role === 'superadmin';
    const isPersonalWalletView = !isHeadteacher;

    const currentUserId = 'studentId' in user ? user.studentId : user.id;
    const schoolId = isStudent ? user.schoolId : isHeadteacher ? (user as AdminUser).assignedSchoolIds[0] : undefined;

    const refreshData = useCallback(() => {
        if (isSuperadmin) {
            setWallet(eWalletService.getWalletForUser(currentUserId));
            setTransactions(eWalletService.getTransactionsForUser(currentUserId));
            setPinResetRequests(eWalletService.getPinResetRequestsForSuperadmin());
            setReceipts(receiptService.getReceiptsForUser(currentUserId));
        } else if (isHeadteacher && schoolId) {
            const users = studentService.getSchoolUsersBySchoolIds([schoolId]);
            setSchoolUsers(users);
            setTransactions(eWalletService.getAllSchoolTransactions(schoolId));
            setSchoolFees(eWalletService.getSchoolFees(schoolId));
            setPinResetRequests(eWalletService.getPinResetRequestsForSchool(schoolId));
        } else if (isPersonalWalletView) { // Catches students and UNEB admins
            setWallet(eWalletService.getWalletForUser(currentUserId));
            setTransactions(eWalletService.getTransactionsForUser(currentUserId));
            setReceipts(receiptService.getReceiptsForUser(currentUserId));
            if (isStudent && schoolId) {
                setSchoolFees(eWalletService.getSchoolFees(schoolId));
            }
        }
    }, [currentUserId, isPersonalWalletView, isStudent, isHeadteacher, schoolId, isSuperadmin]);


    useEffect(() => {
        refreshData();
    }, [refreshData]);

    // Filtering and Sorting Logic
    useEffect(() => {
        let processedTransactions = [...transactions];

        // Filter by type
        if (filterType !== 'all') {
            processedTransactions = processedTransactions.filter(tx => tx.type === filterType);
        }

        // Filter by date range
        if (filterStartDate) {
            // Set to the beginning of the selected day in user's timezone
            const startDate = new Date(filterStartDate);
            startDate.setHours(0, 0, 0, 0);
            processedTransactions = processedTransactions.filter(tx => tx.timestamp >= startDate.getTime());
        }
        if (filterEndDate) {
            // Set to the end of the selected day in user's timezone
            const endDate = new Date(filterEndDate);
            endDate.setHours(23, 59, 59, 999);
            processedTransactions = processedTransactions.filter(tx => tx.timestamp <= endDate.getTime());
        }

        // Sort
        processedTransactions.sort((a, b) => {
            switch (sortOption) {
                case 'oldest':
                    return a.timestamp - b.timestamp;
                case 'amount-desc':
                    return Math.abs(b.amount) - Math.abs(a.amount);
                case 'amount-asc':
                    return Math.abs(a.amount) - Math.abs(b.amount);
                case 'newest':
                default:
                    return b.timestamp - a.timestamp;
            }
        });

        setFilteredTransactions(processedTransactions);
    }, [transactions, filterType, filterStartDate, filterEndDate, sortOption]);

    const formatCurrency = (amount: number) => `UGX ${amount.toLocaleString()}`;

    const showFeedback = (message: string) => {
        setFeedbackMessage(message);
        setTimeout(() => setFeedbackMessage(''), 4000);
    };
    
    const handleActionWithPin = (action: () => void) => {
        setCurrentAction(() => action);
        setModal('pin');
    };

    const handlePinSubmit = () => {
        setPinError('');
        try {
            if (eWalletService.verifyPin(currentUserId, pin)) {
                currentAction?.();
                setModal(null);
                setPin('');
                setCurrentAction(null);
            } else {
                setPinError('Invalid PIN. Please try again.');
            }
        } catch (error) {
            setPinError((error as Error).message);
        }
    };

    const handleSetNewPin = () => {
        setPinError('');
        if (newPin !== confirmNewPin) {
            setPinError("PINs do not match.");
            return;
        }
        try {
            eWalletService.setPin(currentUserId, newPin);
            refreshData(); // This will update the wallet state and re-render the main view
            showFeedback("Your PIN has been set successfully!");
        } catch (error) {
            setPinError((error as Error).message);
        }
    };

    const handleRequestPinReset = () => {
        try {
            if ('studentId' in user && user.role === 'student') {
                eWalletService.requestPinResetForStudent(user as User);
                showFeedback("A PIN reset request has been sent to the school administration.");
            } else if ('assignedSchoolIds' in user) { // Catches Headteacher and UNEB Admin
                eWalletService.requestPinResetForAdmin(user as AdminUser);
                showFeedback("A PIN reset request has been sent to the super administrator.");
            } else {
                setPinError("PIN reset is not available for your user type.");
                return;
            }
            setModal(null);
            setPin('');
            setPinError('');
        } catch (error) {
            setPinError((error as Error).message);
        }
    };
    
    const handleApprovePinReset = (requestId: string) => {
        try {
            eWalletService.approvePinReset(requestId);
            refreshData(); // This will update the requests list
            showFeedback("PIN has been successfully reset for the user.");
        } catch (error) {
            alert((error as Error).message);
        }
    };

    const handleTopUp = () => {
        try {
            eWalletService.topUpWallet(currentUserId, topUpAmount, 'mobile_money');
            refreshData();
            setModal(null);
            showFeedback(`Successfully topped up ${formatCurrency(topUpAmount)}`);
            setTopUpAmount(0);
        } catch (error) {
            alert((error as Error).message);
        }
    };

    const handlePay = () => {
        try {
            eWalletService.makePayment(currentUserId, payAmount, `Payment to ${payRecipient}`, payRecipient);
            refreshData();
            showFeedback(`Successfully paid ${formatCurrency(payAmount)} to ${payRecipient}`);
            setPayAmount(0);
            setPayRecipient('');
        } catch (error) {
            alert((error as Error).message);
        }
    };

    const handleWithdraw = () => {
        try {
            eWalletService.withdrawFromWallet(currentUserId, withdrawAmount, 'mobile_money');
            refreshData();
            showFeedback(`Successfully withdrew ${formatCurrency(withdrawAmount)}`);
            setWithdrawAmount(0);
        } catch (error) {
            alert((error as Error).message);
        }
    };
    
    const handlePayFee = (fee: SchoolFee) => {
        handleActionWithPin(() => {
             try {
                eWalletService.paySchoolFee(currentUserId, fee.id);
                refreshData();
                showFeedback(`Successfully paid ${fee.title}.`);
            } catch (error) {
                alert((error as Error).message);
            }
        });
    };
    
     if (isPersonalWalletView && wallet && !wallet.pin) {
        return (
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 text-center max-w-md mx-auto">
                <h2 className="text-2xl font-bold text-white mb-4">Set Up Your E-Wallet PIN</h2>
                <p className="text-gray-400 mb-6">Create a 4-digit PIN to secure your wallet and approve transactions.</p>
                <div className="space-y-4">
                    <input type="password" value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))} maxLength={4} placeholder="Enter 4-digit PIN" className="w-full p-3 text-xl text-center tracking-[1rem] bg-gray-700 rounded-md" />
                    <input type="password" value={confirmNewPin} onChange={e => setConfirmNewPin(e.target.value.replace(/\D/g, ''))} maxLength={4} placeholder="Confirm PIN" className="w-full p-3 text-xl text-center tracking-[1rem] bg-gray-700 rounded-md" />
                </div>
                <PinStrengthIndicator pin={newPin} confirmPin={confirmNewPin} />
                {pinError && <p className="text-red-400 text-sm mt-4">{pinError}</p>}
                <button onClick={handleSetNewPin} className="w-full mt-6 py-3 bg-cyan-600 hover:bg-cyan-700 rounded-md font-semibold transition-colors">Save PIN</button>
            </div>
        );
    }


    // PERSONAL WALLET VIEW (Students, UNEB Admins, Superadmins)
    const renderPersonalWalletDashboard = () => (
        <div className="space-y-6">
            <div className="bg-gradient-to-br from-cyan-600 to-blue-700 text-white p-6 rounded-lg shadow-xl">
                <p className="text-lg opacity-80">Available Balance</p>
                <p className="text-4xl font-bold">{formatCurrency(wallet?.balance || 0)}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                 <button onClick={() => setModal('top-up')} className="p-4 bg-gray-700 rounded-lg flex items-center justify-center space-x-2 hover:bg-gray-600">
                    <PlusIcon /><span>Top-up</span>
                </button>
                <button onClick={() => setModal('pay')} className="p-4 bg-gray-700 rounded-lg flex items-center justify-center space-x-2 hover:bg-gray-600">
                    <WalletIcon /><span>Pay</span>
                </button>
                <button onClick={() => setModal('withdraw')} className="p-4 bg-gray-700 rounded-lg flex items-center justify-center space-x-2 hover:bg-gray-600">
                    <ArrowDownIcon /><span>Withdraw</span>
                </button>
            </div>
            {isStudent && (
                <div>
                    <h3 className="text-xl font-bold mb-2">My Fees</h3>
                    {schoolFees.length > 0 ? (
                        <div className="space-y-2">
                            {schoolFees.map(fee => (
                                <div key={fee.id} className="bg-gray-700 p-3 rounded-lg flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold">{fee.title}</p>
                                        <p className="text-sm text-gray-400">{formatCurrency(fee.amount)}</p>
                                    </div>
                                    {fee.payments[currentUserId] ? (
                                        <span className="px-3 py-1 bg-green-500/20 text-green-300 text-sm rounded-full">Paid</span>
                                    ) : (
                                        <button onClick={() => handlePayFee(fee)} className="px-4 py-1.5 bg-cyan-600 text-white rounded-md text-sm">Pay Now</button>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : <p className="text-gray-400">No fees assigned.</p>}
                </div>
            )}
            <div>
                <h3 className="text-xl font-bold mb-2">Recent Activity</h3>
                <div className="space-y-2">
                    {transactions.slice(0, 5).map(tx => renderTransactionItem(tx))}
                </div>
            </div>
        </div>
    );

    // ADMIN VIEW (Headteacher)
    const renderAdminDashboard = () => {
        const totalBalance = schoolUsers.reduce((sum, u) => sum + (eWalletService.getWalletForUser(u.studentId).balance || 0), 0);
        return (
             <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-700 p-6 rounded-lg">
                        <p className="text-lg text-gray-400">Total School Funds</p>
                        <p className="text-3xl font-bold">{formatCurrency(totalBalance)}</p>
                    </div>
                     <div className="bg-gray-700 p-6 rounded-lg">
                        <p className="text-lg text-gray-400">Total Students</p>
                        <p className="text-3xl font-bold">{schoolUsers.length}</p>
                    </div>
                </div>
                 <div className="flex flex-wrap gap-4">
                    <button onClick={() => setModal('disbursement')} className="p-4 bg-cyan-700 rounded-lg flex items-center justify-center space-x-2 hover:bg-cyan-600">
                        <span>Bulk Disbursement</span>
                    </button>
                    <button onClick={() => setModal('add-fee')} className="p-4 bg-gray-700 rounded-lg flex items-center justify-center space-x-2 hover:bg-gray-600">
                        <span>Add School Fee</span>
                    </button>
                </div>
                <div>
                    <h3 className="text-xl font-bold mb-2">School Fees Status</h3>
                    {schoolFees.length > 0 ? (
                    <div className="space-y-2">
                        {schoolFees.map(fee => {
                            const paymentsMade = Object.keys(fee.payments).length;
                            return (
                                <div key={fee.id} className="bg-gray-700 p-3 rounded-lg">
                                    <p className="font-semibold">{fee.title} ({formatCurrency(fee.amount)})</p>
                                    <p className="text-sm text-gray-400">{paymentsMade} of {schoolUsers.length} students have paid.</p>
                                </div>
                            )
                        })}
                    </div>
                     ) : <p className="text-gray-400">No fees created yet.</p>}
                </div>
            </div>
        );
    };

    const renderPinResetRequests = () => (
        <div>
            <h3 className="text-xl font-bold mb-4">PIN Reset Requests</h3>
            {pinResetRequests.length > 0 ? (
                <div className="bg-gray-700 rounded-lg overflow-hidden">
                    <table className="min-w-full">
                        <thead className="bg-gray-600">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium uppercase">User Name</th>
                                <th className="px-4 py-2 text-left text-xs font-medium uppercase">Role</th>
                                <th className="px-4 py-2 text-left text-xs font-medium uppercase">Date Requested</th>
                                <th className="px-4 py-2 text-left text-xs font-medium uppercase">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pinResetRequests.map(req => (
                                <tr key={req.id} className="border-b border-gray-800">
                                    <td className="px-4 py-3">{req.userName}</td>
                                    <td className="px-4 py-3 capitalize">{req.userRole.replace('_', ' ')}</td>
                                    <td className="px-4 py-3 text-sm text-gray-400">{new Date(req.timestamp).toLocaleString()}</td>
                                    <td className="px-4 py-3">
                                        <button onClick={() => handleApprovePinReset(req.id)} className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold rounded-md text-sm">
                                            Reset PIN
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="text-gray-400">No pending PIN reset requests.</p>
            )}
        </div>
    );
    
    // RENDER LOGIC
    const renderTransactionItem = (tx: EWalletTransaction) => (
        <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
            <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.amount > 0 ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                    {tx.amount > 0 ? <ArrowDownIcon className="text-green-400" /> : <ArrowUpIcon className="text-red-400" />}
                </div>
                <div>
                    <p className="font-semibold">{tx.description}</p>
                    <p className="text-sm text-gray-400">{new Date(tx.timestamp).toLocaleString()}</p>
                </div>
            </div>
            <p className={`font-bold text-lg ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
            </p>
        </div>
    );

    const renderReceiptsView = () => (
        <div>
            <h3 className="text-xl font-bold mb-4">My Receipts</h3>
            <div className="space-y-3">
                {receipts.length > 0 ? receipts.map(receipt => (
                    <div key={receipt.id} className="bg-gray-700/50 p-3 rounded-lg flex justify-between items-center">
                        <div>
                            <p className={`font-bold capitalize ${receipt.type === 'purchase' ? 'text-red-400' : 'text-green-400'}`}>{receipt.type}</p>
                            <p className="text-sm">{receipt.description}</p>
                            <p className="text-xs text-gray-400">{new Date(receipt.timestamp).toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                             <p className="font-bold text-lg">{formatCurrency(receipt.amount)}</p>
                             <button onClick={() => setSelectedReceipt(receipt)} className="text-sm text-cyan-400 hover:underline">View Details</button>
                        </div>
                    </div>
                )) : (
                    <p className="text-gray-400 text-center py-8">No receipts found.</p>
                )}
            </div>
        </div>
    );

    const renderModals = () => {
        if (!modal && !selectedReceipt) return null;

        if (selectedReceipt) {
             return (
                <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4">
                    <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md space-y-4">
                        <div className="flex justify-between items-start">
                             <div>
                                <h3 className="text-xl font-bold">Receipt Details</h3>
                                <p className="text-xs text-gray-400">Order ID: {selectedReceipt.orderId.slice(-8)}</p>
                            </div>
                            <button onClick={() => setSelectedReceipt(null)} className="text-2xl">&times;</button>
                        </div>
                        <div className="bg-gray-700 p-4 rounded-lg space-y-2">
                             <div className="flex justify-between"><span className="text-gray-400">{selectedReceipt.type === 'purchase' ? 'From' : 'To'}:</span> <strong>{selectedReceipt.partyName}</strong></div>
                            <div className="flex justify-between"><span className="text-gray-400">Date:</span> <span>{new Date(selectedReceipt.timestamp).toLocaleString()}</span></div>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-2">Items</h4>
                            <ul className="space-y-1 text-sm">
                                {selectedReceipt.items.map((item, i) => (
                                    <li key={i} className="flex justify-between p-2 bg-gray-900/50 rounded-md">
                                        <span>{item.quantity} x {item.name}</span>
                                        <span>{formatCurrency(item.quantity * item.price)}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="border-t border-gray-600 pt-3 flex justify-between font-bold text-lg">
                            <span>Total</span>
                            <span>{formatCurrency(selectedReceipt.amount)}</span>
                        </div>
                    </div>
                </div>
            );
        }

        if (modal === 'top-up') {
            return (
                <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4">
                    <div className="bg-gray-800 rounded-lg p-6 w-full max-w-sm space-y-4">
                        <h3 className="text-xl font-bold">Top-up Wallet</h3>
                        <input type="number" placeholder="Enter amount" onChange={(e) => setTopUpAmount(Number(e.target.value))} className="w-full p-2 bg-gray-700 rounded-md" />
                        <div className="flex justify-end space-x-2">
                             <button onClick={() => setModal(null)} className="px-4 py-2 bg-gray-600 rounded-md">Cancel</button>
                             <button onClick={handleTopUp} className="px-4 py-2 bg-cyan-600 rounded-md">Confirm</button>
                        </div>
                    </div>
                </div>
            );
        }
        
        if (modal === 'pay') {
            return (
                <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4">
                    <div className="bg-gray-800 rounded-lg p-6 w-full max-w-sm space-y-4">
                        <h3 className="text-xl font-bold">Make a Payment</h3>
                        <input type="number" placeholder="Amount" onChange={(e) => setPayAmount(Number(e.target.value))} className="w-full p-2 bg-gray-700 rounded-md" />
                        <input type="text" placeholder="Recipient (e.g., Canteen, School Shop)" onChange={(e) => setPayRecipient(e.target.value)} className="w-full p-2 bg-gray-700 rounded-md" />
                        <div className="flex justify-end space-x-2">
                            <button onClick={() => setModal(null)} className="px-4 py-2 bg-gray-600 rounded-md">Cancel</button>
                            <button onClick={() => handleActionWithPin(handlePay)} className="px-4 py-2 bg-cyan-600 rounded-md">Confirm Payment</button>
                        </div>
                    </div>
                </div>
            );
        }

        if (modal === 'withdraw') {
            return (
                <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4">
                    <div className="bg-gray-800 rounded-lg p-6 w-full max-w-sm space-y-4">
                        <h3 className="text-xl font-bold">Withdraw Funds</h3>
                        <input type="number" placeholder="Amount" onChange={(e) => setWithdrawAmount(Number(e.target.value))} className="w-full p-2 bg-gray-700 rounded-md" />
                        <div className="flex justify-end space-x-2">
                            <button onClick={() => setModal(null)} className="px-4 py-2 bg-gray-600 rounded-md">Cancel</button>
                            <button onClick={() => handleActionWithPin(handleWithdraw)} className="px-4 py-2 bg-cyan-600 rounded-md">Confirm Withdrawal</button>
                        </div>
                    </div>
                </div>
            );
        }
        
         if (modal === 'pin') {
            return (
                 <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4">
                    <div className="bg-gray-800 rounded-lg p-6 w-full max-w-sm space-y-4 text-center">
                        <h3 className="text-xl font-bold">Enter Your PIN</h3>
                        <p className="text-sm text-gray-400">For your security, please confirm your action.</p>
                        <input type="password" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} maxLength={4} className="w-full p-3 text-2xl tracking-[1rem] text-center bg-gray-700 rounded-md" />
                        <PinStrengthIndicator pin={pin} />
                        {pinError && <p className="text-red-400 text-sm mt-2">{pinError}</p>}
                        {(isStudent || isHeadteacher || user.role === 'uneb_admin') && <button onClick={handleRequestPinReset} className="text-xs text-cyan-400 hover:underline">Forgot PIN?</button>}
                        <div className="flex justify-center space-x-2 pt-2">
                             <button onClick={() => { setModal(null); setPin(''); setPinError(''); }} className="px-4 py-2 bg-gray-600 rounded-md">Cancel</button>
                             <button onClick={handlePinSubmit} className="px-4 py-2 bg-cyan-600 rounded-md">Confirm</button>
                        </div>
                    </div>
                </div>
            )
        }
        // Add more modals here for admin actions
        return null;
    };
    
    return (
        <div className="h-full">
            {renderModals()}
            {feedbackMessage && (
                <div className="bg-green-500/20 text-green-300 p-3 rounded-lg mb-4 animate-pulse-custom">
                    {feedbackMessage}
                </div>
            )}
            <header className="flex items-center space-x-2 mb-6">
                 <button onClick={() => setView('dashboard')} className={`px-4 py-2 font-semibold rounded-md ${view === 'dashboard' ? 'bg-cyan-600' : 'bg-gray-700'}`}>Dashboard</button>
                 <button onClick={() => setView('transactions')} className={`px-4 py-2 font-semibold rounded-md ${view === 'transactions' ? 'bg-cyan-600' : 'bg-gray-700'}`}>Transactions</button>
                 {isPersonalWalletView && <button onClick={() => setView('receipts')} className={`px-4 py-2 font-semibold rounded-md ${view === 'receipts' ? 'bg-cyan-600' : 'bg-gray-700'}`}>Receipts</button>}
                 {(isHeadteacher || isSuperadmin) && <button onClick={() => setView('pin-resets')} className={`relative px-4 py-2 font-semibold rounded-md ${view === 'pin-resets' ? 'bg-cyan-600' : 'bg-gray-700'}`}>
                    PIN Resets
                    {pinResetRequests.length > 0 && <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold">{pinResetRequests.length}</span>}
                    </button>}
                 {isHeadteacher && <button onClick={() => setView('settings')} className={`px-4 py-2 font-semibold rounded-md ${view === 'settings' ? 'bg-cyan-600' : 'bg-gray-700'}`}>Settings</button>}
            </header>
            
            {view === 'dashboard' && (isPersonalWalletView ? renderPersonalWalletDashboard() : renderAdminDashboard())}

            {view === 'transactions' && (
                <div>
                     <h3 className="text-xl font-bold mb-4">Transaction History</h3>
                     {/* Filter and Sort Controls */}
                    <div className="bg-gray-700/50 p-4 rounded-lg mb-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                            <div>
                                <label htmlFor="filter-type" className="block text-sm font-medium text-gray-400 mb-1">Type</label>
                                <select id="filter-type" value={filterType} onChange={e => setFilterType(e.target.value)} className="w-full p-2 bg-gray-600 rounded-md text-white focus:ring-cyan-500 focus:border-cyan-500 border-gray-500">
                                    <option value="all">All Types</option>
                                    <option value="top-up">Top-up</option>
                                    <option value="payment">Payment</option>
                                    <option value="withdrawal">Withdrawal</option>
                                    <option value="fee_payment">Fee Payment</option>
                                    <option value="admission_fee_payment">Admission Fee</option>
                                    <option value="disbursement">Disbursement</option>
                                    <option value="allowance">Allowance</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="start-date" className="block text-sm font-medium text-gray-400 mb-1">Start Date</label>
                                <input id="start-date" type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="w-full p-2 bg-gray-600 rounded-md text-white focus:ring-cyan-500 focus:border-cyan-500 border-gray-500" />
                            </div>
                            <div>
                                <label htmlFor="end-date" className="block text-sm font-medium text-gray-400 mb-1">End Date</label>
                                <input id="end-date" type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="w-full p-2 bg-gray-600 rounded-md text-white focus:ring-cyan-500 focus:border-cyan-500 border-gray-500" />
                            </div>
                            <div>
                                <label htmlFor="sort-option" className="block text-sm font-medium text-gray-400 mb-1">Sort By</label>
                                <select id="sort-option" value={sortOption} onChange={e => setSortOption(e.target.value)} className="w-full p-2 bg-gray-600 rounded-md text-white focus:ring-cyan-500 focus:border-cyan-500 border-gray-500">
                                    <option value="newest">Newest First</option>
                                    <option value="oldest">Oldest First</option>
                                    <option value="amount-desc">Amount (High to Low)</option>
                                    <option value="amount-asc">Amount (Low to High)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        {filteredTransactions.map(tx => renderTransactionItem(tx))}
                        {filteredTransactions.length === 0 && <p className="text-gray-400 p-4 text-center">No transactions match your criteria.</p>}
                    </div>
                </div>
            )}
            {view === 'receipts' && renderReceiptsView()}
            {view === 'pin-resets' && (isHeadteacher || isSuperadmin) && renderPinResetRequests()}
             {view === 'settings' && isHeadteacher && (
                <div>
                     <h3 className="text-xl font-bold mb-2">E-Wallet Settings</h3>
                     <p className="text-gray-400">Parental controls and other settings coming soon.</p>
                </div>
            )}

        </div>
    );
};

export default EWalletPage;