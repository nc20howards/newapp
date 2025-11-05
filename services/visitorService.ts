// services/visitorService.ts
import { VisitorLog } from '../types';

const VISITOR_LOGS_KEY = '360_smart_school_visitor_logs';

const getLogs = (): VisitorLog[] => {
    const data = localStorage.getItem(VISITOR_LOGS_KEY);
    return data ? JSON.parse(data) : [];
};

const saveLogs = (logs: VisitorLog[]) => {
    localStorage.setItem(VISITOR_LOGS_KEY, JSON.stringify(logs));
};

export const getVisitorLogsForSchool = (schoolId: string): VisitorLog[] => {
    return getLogs().filter(log => log.schoolId === schoolId).sort((a, b) => b.entryTime - a.entryTime);
};

export const getCheckedInVisitorsForSchool = (schoolId: string): VisitorLog[] => {
    return getVisitorLogsForSchool(schoolId).filter(log => log.status === 'checked_in');
};

export const createVisitorLog = (data: Omit<VisitorLog, 'id' | 'entryTime' | 'passNumber' | 'status'>): VisitorLog => {
    const logs = getLogs();
    const passNumber = `VIS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const newLog: VisitorLog = {
        ...data,
        id: `vlog_${Date.now()}`,
        entryTime: Date.now(),
        passNumber,
        status: 'checked_in',
    };
    logs.unshift(newLog); // Add to the top of the list
    saveLogs(logs);
    return newLog;
};

export const checkoutVisitor = (passNumber: string, schoolId: string): VisitorLog => {
    const logs = getLogs();
    const logIndex = logs.findIndex(log => log.passNumber.toLowerCase() === passNumber.toLowerCase() && log.schoolId === schoolId && log.status === 'checked_in');
    if (logIndex === -1) {
        throw new Error("No active visitor found with this pass number.");
    }
    
    logs[logIndex].status = 'checked_out';
    logs[logIndex].exitTime = Date.now();
    saveLogs(logs);
    return logs[logIndex];
};
