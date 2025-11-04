// services/receiptService.ts
import { Receipt } from '../types';

const RECEIPTS_KEY = '360_smart_school_receipts';

// Helper to get all receipts from localStorage
const getReceipts = (): Receipt[] => {
    const data = localStorage.getItem(RECEIPTS_KEY);
    return data ? JSON.parse(data) : [];
};

// Helper to save all receipts to localStorage
const saveReceipts = (receipts: Receipt[]) => {
    localStorage.setItem(RECEIPTS_KEY, JSON.stringify(receipts));
};

/**
 * Creates and saves a new receipt.
 * @param data The data for the new receipt, excluding the ID and timestamp.
 * @returns The newly created receipt object.
 */
export const createReceipt = (data: Omit<Receipt, 'id' | 'timestamp'>): Receipt => {
    const allReceipts = getReceipts();
    const newReceipt: Receipt = {
        ...data,
        id: `receipt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        timestamp: Date.now(),
    };
    allReceipts.push(newReceipt);
    saveReceipts(allReceipts);
    return newReceipt;
};

/**
 * Retrieves all receipts for a specific user, sorted by newest first.
 * @param userId The ID of the user whose receipts are to be fetched.
 * @returns An array of Receipt objects.
 */
export const getReceiptsForUser = (userId: string): Receipt[] => {
    const allReceipts = getReceipts();
    return allReceipts
        .filter(r => r.userId === userId)
        .sort((a, b) => b.timestamp - a.timestamp);
};