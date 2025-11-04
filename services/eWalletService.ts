
import { EWallet, EWalletTransaction, SchoolFee, ParentalControlSettings, TransactionType, TopUpMethod, WithdrawalMethod, PinResetRequest, User, AdminUser } from '../types';
import { getSchoolUsersBySchoolIds } from './studentService';
import { getAllStudents } from './studentService';
import { getAllAdminUsers } from './userService';
import { isUnebVerificationEnabled, getUnebServiceFeeAmount } from './systemSettingsService';
import { getShopOwnerId, getShops } from './canteenService';

const WALLETS_KEY = '360_smart_school_wallets';
const TRANSACTIONS_KEY = '360_smart_school_transactions';
const FEES_KEY = '360_smart_school_fees';
const CONTROLS_KEY = '360_smart_school_parental_controls';
const PIN_RESET_REQUESTS_KEY = '360_smart_school_pin_resets';
export const TRANSFER_ESCROW_USER_ID = 'system_transfer_escrow';


// --- Helper Functions ---
const getWallets = (): EWallet[] => JSON.parse(localStorage.getItem(WALLETS_KEY) || '[]');
const saveWallets = (wallets: EWallet[]) => localStorage.setItem(WALLETS_KEY, JSON.stringify(wallets));
const getTransactions = (): EWalletTransaction[] => JSON.parse(localStorage.getItem(TRANSACTIONS_KEY) || '[]');
const saveTransactions = (transactions: EWalletTransaction[]) => localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
const getFees = (): SchoolFee[] => JSON.parse(localStorage.getItem(FEES_KEY) || '[]');
const saveFees = (fees: SchoolFee[]) => localStorage.setItem(FEES_KEY, JSON.stringify(fees));
const getPinResetRequestsData = (): PinResetRequest[] => JSON.parse(localStorage.getItem(PIN_RESET_REQUESTS_KEY) || '[]');
const savePinResetRequestsData = (requests: PinResetRequest[]) => localStorage.setItem(PIN_RESET_REQUESTS_KEY, JSON.stringify(requests));


// --- Wallet Management ---
export const getWalletForUser = (userId: string): EWallet => {
    const wallets = getWallets();
    let wallet = wallets.find(w => w.userId === userId);
    if (!wallet) {
        wallet = { userId, balance: 0, currency: 'UGX' };
        wallets.push(wallet);
        saveWallets(wallets);
    }
    return wallet;
};

export const getSchoolWallets = (schoolId: string) => {
    const schoolUsers = getSchoolUsersBySchoolIds([schoolId]);
    const userIds = schoolUsers.map(u => u.studentId);
    return userIds.map(id => getWalletForUser(id));
};

// --- PIN Management ---
export const setPin = (userId: string, newPin: string): void => {
    if (!/^\d{4}$/.test(newPin)) {
        throw new Error("PIN must be exactly 4 digits.");
    }
    const wallets = getWallets();
    const wallet = getWalletForUser(userId);
    wallet.pin = newPin; // In a real app, this would be hashed.

    const walletIndex = wallets.findIndex(w => w.userId === userId);
    if (walletIndex > -1) wallets[walletIndex] = wallet;
    else wallets.push(wallet);
    saveWallets(wallets);
};

export const verifyPin = (userId: string, pinToVerify: string): boolean => {
    const wallet = getWalletForUser(userId);
    if (!wallet.pin) {
        throw new Error("No PIN has been set for this wallet.");
    }
    return wallet.pin === pinToVerify;
};

export const requestPinResetForStudent = (student: User): void => {
    if (!student.schoolId) throw new Error("Student is not assigned to a school.");
    
    const requests = getPinResetRequestsData();
    const existingRequest = requests.find(r => r.userId === student.studentId && r.status === 'pending');
    if (existingRequest) {
        throw new Error("You already have a pending PIN reset request.");
    }
    
    const newRequest: PinResetRequest = {
        id: `pin_reset_${Date.now()}`,
        userId: student.studentId,
        userName: student.name,
        schoolId: student.schoolId,
        userRole: 'student',
        timestamp: Date.now(),
        status: 'pending',
    };
    requests.push(newRequest);
    savePinResetRequestsData(requests);
};

export const requestPinResetForAdmin = (adminUser: AdminUser): void => {
    const requests = getPinResetRequestsData();
    const existingRequest = requests.find(r => r.userId === adminUser.id && r.status === 'pending');
    if (existingRequest) {
        throw new Error("You already have a pending PIN reset request.");
    }

    const newRequest: PinResetRequest = {
        id: `pin_reset_${Date.now()}`,
        userId: adminUser.id,
        userName: adminUser.name,
        userRole: adminUser.role,
        schoolId: adminUser.assignedSchoolIds?.[0], // May be undefined, which is fine
        timestamp: Date.now(),
        status: 'pending',
    };
    requests.push(newRequest);
    savePinResetRequestsData(requests);
};

export const getPinResetRequestsForSchool = (schoolId: string): PinResetRequest[] => {
    return getPinResetRequestsData().filter(r => r.schoolId === schoolId && r.userRole === 'student' && r.status === 'pending');
};

export const getPinResetRequestsForSuperadmin = (): PinResetRequest[] => {
    return getPinResetRequestsData().filter(r => (r.userRole === 'headteacher' || r.userRole === 'uneb_admin') && r.status === 'pending');
};

export const approvePinReset = (requestId: string): void => {
    const requests = getPinResetRequestsData();
    const requestIndex = requests.findIndex(r => r.id === requestId);
    if (requestIndex === -1) {
        throw new Error("Reset request not found.");
    }
    const request = requests[requestIndex];

    const wallets = getWallets();
    const walletIndex = wallets.findIndex(w => w.userId === request.userId);
    if (walletIndex > -1) {
        delete wallets[walletIndex].pin;
        saveWallets(wallets);
    }

    request.status = 'completed';
    requests[requestIndex] = request;
    savePinResetRequestsData(requests);
};


// --- Transaction Management ---
export const createTransaction = (data: Omit<EWalletTransaction, 'id' | 'timestamp'>): EWalletTransaction => {
    const transactions = getTransactions();
    const newTransaction: EWalletTransaction = {
        ...data,
        id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
    };
    transactions.push(newTransaction);
    saveTransactions(transactions);
    return newTransaction;
};

export const getTransactionsForUser = (userId: string): EWalletTransaction[] => {
    return getTransactions()
        .filter(t => t.walletUserId === userId)
        .sort((a, b) => b.timestamp - a.timestamp);
};

export const getAllSchoolTransactions = (schoolId: string): EWalletTransaction[] => {
    const schoolUsers = getSchoolUsersBySchoolIds([schoolId]);
    const userIds = new Set(schoolUsers.map(u => u.studentId));
    return getTransactions()
        .filter(t => userIds.has(t.walletUserId))
        .sort((a, b) => b.timestamp - a.timestamp);
};

export const getAvailableBalance = (userId: string): number => {
    const wallet = getWalletForUser(userId);
    const transactions = getTransactionsForUser(userId);
    const heldAmount = transactions
        .filter(tx => tx.status === 'pending' && (tx.type === 'payment' || tx.type === 'fee_payment'))
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    return wallet.balance - heldAmount;
};

export const topUpWallet = (userId: string, amount: number, method: TopUpMethod, description?: string, type: TransactionType = 'top-up'): EWallet => {
    if (amount <= 0) throw new Error("Top-up amount must be positive.");
    const wallets = getWallets();
    const wallet = getWalletForUser(userId);
    wallet.balance += amount;

    const walletIndex = wallets.findIndex(w => w.userId === userId);
    if(walletIndex > -1) wallets[walletIndex] = wallet;
    else wallets.push(wallet);

    saveWallets(wallets);

    createTransaction({
        walletUserId: userId,
        type: type,
        amount: amount,
        description: description || `Top-up via ${method.replace('_', ' ')}`,
        status: 'completed',
        method: method,
    });

    return wallet;
};

export const makePayment = (fromUserId: string, amount: number, description: string, recipient: string, type: TransactionType = 'payment'): EWallet => {
    if (amount <= 0) throw new Error("Payment amount must be positive.");
    const wallets = getWallets();
    const wallet = getWalletForUser(fromUserId);

    if (getAvailableBalance(fromUserId) < amount) throw new Error("Insufficient funds.");
    
    wallet.balance -= amount;

    const walletIndex = wallets.findIndex(w => w.userId === fromUserId);
    if(walletIndex > -1) wallets[walletIndex] = wallet;

    saveWallets(wallets);

    createTransaction({
        walletUserId: fromUserId,
        type: type,
        amount: -amount,
        description,
        status: 'completed',
        recipient,
        method: 'e-wallet',
    });

    return wallet;
};

export const withdrawFromWallet = (userId: string, amount: number, method: WithdrawalMethod): EWallet => {
    if (amount <= 0) throw new Error("Withdrawal amount must be positive.");
    const wallets = getWallets();
    const wallet = getWalletForUser(userId);

    if (getAvailableBalance(userId) < amount) throw new Error("Insufficient funds for withdrawal.");
    
    wallet.balance -= amount;

    const walletIndex = wallets.findIndex(w => w.userId === userId);
    if(walletIndex > -1) wallets[walletIndex] = wallet;

    saveWallets(wallets);

    createTransaction({
        walletUserId: userId,
        type: 'withdrawal',
        amount: -amount,
        description: `Withdrawal via ${method.replace('_', ' ')}`,
        status: 'completed',
        method: method,
    });

    return wallet;
};

export const processAdmissionFeePayment = (studentId: string, schoolId: string, admissionFee: number): void => {
    const UNEB_ADMIN_CUT = 0.25;
    const SUPERADMIN_CUT = 0.75;

    // 1. Debit student
    const wallets = getWallets();
    const studentWallet = getWalletForUser(studentId);

    if (studentWallet.balance < admissionFee) {
        throw new Error("Insufficient funds to pay admission fee.");
    }

    studentWallet.balance -= admissionFee;
    const studentWalletIndex = wallets.findIndex(w => w.userId === studentId);
    if (studentWalletIndex > -1) wallets[studentWalletIndex] = studentWallet;
    else wallets.push(studentWallet);
    saveWallets(wallets);

    createTransaction({
        walletUserId: studentId,
        type: 'admission_fee_payment',
        amount: -admissionFee,
        description: 'UNEB Admission Fee',
        status: 'completed',
        method: 'e-wallet',
    });

    // 2. Find recipients
    const allAdmins = getAllAdminUsers();
    const headteacher = allAdmins.find(admin => admin.role === 'headteacher' && admin.assignedSchoolIds.includes(schoolId));
    const unebAdmin = allAdmins.find(admin => admin.role === 'uneb_admin');
    const superadminId = 'admin';

    if (!headteacher) {
        // Revert transaction if school has no headteacher to receive funds
        studentWallet.balance += admissionFee;
        if (studentWalletIndex > -1) wallets[studentWalletIndex] = studentWallet;
        saveWallets(wallets);
        throw new Error(`Cannot process payment: School (ID: ${schoolId}) has no assigned Headteacher to receive funds.`);
    }

    // 3. Distribute funds based on UNEB verification status
    if (isUnebVerificationEnabled()) {
        const serviceFee = getUnebServiceFeeAmount();
        const netFee = admissionFee - serviceFee;
        const unebAdminShare = serviceFee * UNEB_ADMIN_CUT;
        const superadminShare = serviceFee * SUPERADMIN_CUT;

        // Credit school (via headteacher)
        if (netFee > 0) {
            topUpWallet(headteacher.id, netFee, 'system_credit', 'Admission Fee (Net)', 'bursary_credit');
        }
        
        // Credit UNEB Admin
        if (unebAdmin) {
            topUpWallet(unebAdmin.id, unebAdminShare, 'system_credit', 'UNEB Admission Service Fee', 'service_fee_credit');
        }

        // Credit Superadmin
        topUpWallet(superadminId, superadminShare, 'system_credit', 'System Service Fee', 'service_fee_credit');
    } else {
        // Credit school with full amount
        topUpWallet(headteacher.id, admissionFee, 'system_credit', 'Admission Fee', 'bursary_credit');
    }
};

export const processBulkDisbursement = (schoolId: string, userIds: string[], amount: number, description: string): void => {
    if (amount <= 0) throw new Error("Disbursement amount must be positive.");
    const wallets = getWallets();

    userIds.forEach(userId => {
        const wallet = getWalletForUser(userId); // Ensures wallet exists
        wallet.balance += amount;

        const walletIndex = wallets.findIndex(w => w.userId === userId);
        if(walletIndex > -1) wallets[walletIndex] = wallet;
        else wallets.push(wallet);

        createTransaction({
            walletUserId: userId,
            type: 'disbursement',
            amount: amount,
            description,
            status: 'completed',
        });
    });

    saveWallets(wallets);
};

export const settleOrderPayment = (orderId: string, shopId: string): void => {
    const allTxns = getTransactions();
    const transactionIndex = allTxns.findIndex(tx => tx.orderId === orderId && tx.status === 'pending');
    if (transactionIndex === -1) throw new Error("Pending payment for this order not found.");
    
    const transaction = allTxns[transactionIndex];
    const wallets = getWallets();
    const studentWalletIndex = wallets.findIndex(w => w.userId === transaction.walletUserId);
    if (studentWalletIndex === -1) throw new Error("Student wallet not found.");

    // This is the actual deduction.
    wallets[studentWalletIndex].balance += transaction.amount; // amount is negative

    // Credit the seller
    const shop = getShops().find(s => s.id === shopId);
    if (!shop || !shop.ownerId) {
        wallets[studentWalletIndex].balance -= transaction.amount; // Revert
        saveWallets(wallets);
        throw new Error("Canteen shop or owner not found. Payment cannot be completed.");
    }

    const sellerWalletIndex = wallets.findIndex(w => w.userId === shop.ownerId);
    if (sellerWalletIndex === -1) {
        wallets.push({ userId: shop.ownerId, balance: Math.abs(transaction.amount), currency: 'UGX' });
    } else {
        wallets[sellerWalletIndex].balance += Math.abs(transaction.amount);
    }
    
    transaction.status = 'completed';
    allTxns[transactionIndex] = transaction;
    
    saveTransactions(allTxns);
    saveWallets(wallets);
};

export const cancelOrderPayment = (orderId: string): void => {
    const allTxns = getTransactions();
    const txnIndex = allTxns.findIndex(tx => tx.orderId === orderId && tx.status === 'pending');
    if (txnIndex > -1) {
        allTxns[txnIndex].status = 'cancelled';
        saveTransactions(allTxns);
    }
};


// --- School Fee Management ---
export const getSchoolFees = (schoolId: string): SchoolFee[] => {
    return getFees().filter(f => f.schoolId === schoolId);
};

export const createSchoolFee = (schoolId: string, title: string, amount: number, dueDate: number): SchoolFee => {
    if (amount <= 0) throw new Error("Fee amount must be positive.");
    const fees = getFees();
    const newFee: SchoolFee = {
        id: `fee_${Date.now()}`,
        schoolId,
        title,
        description: `Payment for ${title}`,
        amount,
        dueDate,
        payments: {},
    };
    fees.push(newFee);
    saveFees(fees);
    return newFee;
};

export const paySchoolFee = (studentId: string, feeId: string): void => {
    const fees = getFees();
    const fee = fees.find(f => f.id === feeId);
    if (!fee) throw new Error("School fee not found.");

    if (fee.payments[studentId]) throw new Error("You have already paid this fee.");
    
    if (getAvailableBalance(studentId) < fee.amount) throw new Error("Insufficient funds to pay this fee.");

    const transaction = createTransaction({
        walletUserId: studentId,
        type: 'fee_payment',
        amount: -fee.amount,
        description: fee.title,
        status: 'pending', // Hold funds first
        method: 'e-wallet',
        feeId: fee.id,
    });
    
    // Settle payment immediately for fees
    const wallets = getWallets();
    const walletIndex = wallets.findIndex(w => w.userId === studentId);
    wallets[walletIndex].balance -= fee.amount;
    saveWallets(wallets);
    
    transaction.status = 'completed';
    const allTxns = getTransactions();
    const txnIndex = allTxns.findIndex(t => t.id === transaction.id);
    if(txnIndex > -1) allTxns[txnIndex] = transaction;
    saveTransactions(allTxns);

    fee.payments[studentId] = {
        transactionId: transaction.id,
        paidAt: transaction.timestamp,
    };
    
    saveFees(fees);
};

export const processTransferFee = (fromSchoolId: string, toSchoolId: string, studentName: string, amount: number): void => {
    const allAdmins = getAllAdminUsers();
    const fromHeadteacher = allAdmins.find(a => a.role === 'headteacher' && a.assignedSchoolIds.includes(fromSchoolId));
    const toHeadteacher = allAdmins.find(a => a.role === 'headteacher' && a.assignedSchoolIds.includes(toSchoolId));

    if (!fromHeadteacher) throw new Error("Paying school does not have a headteacher to process payment from.");
    if (!toHeadteacher) throw new Error("Receiving school does not have a headteacher to credit.");

    const fromWallet = getWalletForUser(fromHeadteacher.id);
    if (fromWallet.balance < amount) {
        throw new Error("The school's E-Wallet has insufficient funds to cover the transfer fee. Please contact the school administration to top up their account.");
    }

    // Debit the 'from' school
    makePayment(fromHeadteacher.id, amount, `Student transfer fee for ${studentName}`, toHeadteacher.id, 'transfer_fee_payment');
    
    // Credit the 'to' school
    topUpWallet(toHeadteacher.id, amount, 'system_credit', `Received transfer fee for ${studentName}`, 'bursary_credit');
};
