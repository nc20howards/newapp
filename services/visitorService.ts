// services/visitorService.ts
import { Visitor, VisitorLog, ExtractedIdData } from '../types';

const VISITORS_KEY = '360_smart_school_visitors';
const VISITOR_LOGS_KEY = '360_smart_school_visitor_logs';

// --- Helper Functions ---
const getVisitors = (): Visitor[] => JSON.parse(localStorage.getItem(VISITORS_KEY) || '[]');
const saveVisitors = (data: Visitor[]) => localStorage.setItem(VISITORS_KEY, JSON.stringify(data));
const getVisitorLogs = (): VisitorLog[] => JSON.parse(localStorage.getItem(VISITOR_LOGS_KEY) || '[]');
const saveVisitorLogs = (data: VisitorLog[]) => localStorage.setItem(VISITOR_LOGS_KEY, JSON.stringify(data));

/**
 * Finds an existing visitor by their ID number or creates a new one.
 * @param idData - The data extracted from the visitor's ID.
 * @param schoolId - The ID of the school the visitor is at.
 * @returns The existing or newly created visitor object.
 */
export const getOrCreateVisitor = (idData: ExtractedIdData, schoolId: string): Visitor => {
    const allVisitors = getVisitors();
    let visitor = allVisitors.find(v => v.idNumber.toLowerCase() === idData.idNumber.toLowerCase() && v.schoolId === schoolId);

    if (visitor) {
        // Optionally update details if they've changed, though unlikely for an ID
        visitor.fullName = idData.fullName;
        saveVisitors(allVisitors);
    } else {
        visitor = {
            id: `visitor_${Date.now()}`,
            schoolId,
            idNumber: idData.idNumber,
            fullName: idData.fullName,
            firstSeen: Date.now(),
        };
        allVisitors.push(visitor);
        saveVisitors(allVisitors);
    }
    return visitor;
};

/**
 * Creates a new visitor log entry for check-in.
 * @param checkInData - The details for the new log entry.
 * @returns The newly created visitor log.
 */
export const checkInVisitor = (checkInData: Omit<VisitorLog, 'id' | 'entryTime' | 'exitTime' | 'cardNumber'>): VisitorLog => {
    const allLogs = getVisitorLogs();
    
    // Generate a simple, readable card number
    const cardNumber = `V${Math.random().toString().substring(2, 8)}`;

    const newLog: VisitorLog = {
        ...checkInData,
        id: `log_${Date.now()}`,
        cardNumber,
        entryTime: Date.now(),
        exitTime: null,
    };

    allLogs.push(newLog);
    saveVisitorLogs(allLogs);
    return newLog;
};

/**
 * Checks out a visitor by finding their active log via card number and setting the exit time.
 * @param cardNumber - The unique card number given to the visitor on entry.
 * @param schoolId - The ID of the school to scope the search.
 * @returns The updated visitor log.
 */
export const checkOutVisitor = (cardNumber: string, schoolId: string): VisitorLog => {
    const allLogs = getVisitorLogs();
    const logIndex = allLogs.findIndex(
        log => log.schoolId === schoolId && log.cardNumber.toLowerCase() === cardNumber.toLowerCase() && log.exitTime === null
    );

    if (logIndex === -1) {
        throw new Error("No active visitor found with that card number.");
    }

    allLogs[logIndex].exitTime = Date.now();
    saveVisitorLogs(allLogs);
    return allLogs[logIndex];
};

/**
 * Retrieves all visitors who are currently signed in (no exit time).
 * @param schoolId The ID of the school.
 * @returns An array of active VisitorLog objects.
 */
export const getActiveVisitors = (schoolId: string): VisitorLog[] => {
    return getVisitorLogs()
        .filter(log => log.schoolId === schoolId && log.exitTime === null)
        .sort((a, b) => b.entryTime - a.entryTime);
};

/**
 * Retrieves the complete history of all visitor logs for a school.
 * @param schoolId The ID of the school.
 * @returns An array of all VisitorLog objects for the school.
 */
export const getVisitorLogHistory = (schoolId: string): VisitorLog[] => {
    return getVisitorLogs()
        .filter(log => log.schoolId === schoolId)
        .sort((a, b) => b.entryTime - a.entryTime);
};

/**
 * Retrieves the full Visitor profile for a given visitor ID.
 * @param visitorId The ID of the visitor.
 * @returns The Visitor object or null if not found.
 */
export const getVisitorById = (visitorId: string): Visitor | null => {
    const allVisitors = getVisitors();
    return allVisitors.find(v => v.id === visitorId) || null;
};
