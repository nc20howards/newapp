
import { AdmissionSettings, CompletedAdmission, ExtractedUnebSlipData, UnebPassSlip } from '../types';

const ADMISSION_SETTINGS_KEY = '360_smart_school_admission_settings';

const getAllSettings = (): AdmissionSettings[] => {
    const data = localStorage.getItem(ADMISSION_SETTINGS_KEY);
    return data ? JSON.parse(data) : [];
};

const saveAllSettings = (allSettings: AdmissionSettings[]) => {
    localStorage.setItem(ADMISSION_SETTINGS_KEY, JSON.stringify(allSettings));
};

const getDefaultSettings = (schoolId: string): AdmissionSettings => ({
    schoolId,
    automaticAdmission: false,
    defaultClass: 'S.1', // A sensible default for Uganda
    studentIdPrefix: 'STU-',
    admissionFee: 50000, // Default admission fee
    acceptingClasses: [],
    startDate: '',
    endDate: '',
    aLevelCombinations: {
        arts: [],
        sciences: [],
    },
});

export const getAdmissionSettings = (schoolId: string): AdmissionSettings => {
    const allSettings = getAllSettings();
    const savedSchoolSettings = allSettings.find(s => s.schoolId === schoolId);
    const defaultSchoolSettings = getDefaultSettings(schoolId);

    const finalSettings = {
        ...defaultSchoolSettings,
        ...savedSchoolSettings,
    };

    if (!finalSettings.aLevelCombinations) {
        finalSettings.aLevelCombinations = { arts: [], sciences: [] };
    }
    if (!finalSettings.aLevelCombinations.arts) {
        finalSettings.aLevelCombinations.arts = [];
    }
     if (!finalSettings.aLevelCombinations.sciences) {
        finalSettings.aLevelCombinations.sciences = [];
    }


    return finalSettings;
};

export const saveAdmissionSettings = (settings: AdmissionSettings): void => {
    const allSettings = getAllSettings();
    const schoolIndex = allSettings.findIndex(s => s.schoolId === settings.schoolId);
    if (schoolIndex > -1) {
        allSettings[schoolIndex] = settings;
    } else {
        allSettings.push(settings);
    }
    saveAllSettings(allSettings);
};

// --- COMPLETED ADMISSIONS SERVICE LOGIC ---
const COMPLETED_ADMISSIONS_KEY = '360_smart_school_completed_admissions';

const getAllAdmissionsData = (): Record<string, CompletedAdmission[]> => {
    const data = localStorage.getItem(COMPLETED_ADMISSIONS_KEY);
    return data ? JSON.parse(data) : {};
};

const saveAllAdmissionsData = (data: Record<string, CompletedAdmission[]>) => {
    localStorage.setItem(COMPLETED_ADMISSIONS_KEY, JSON.stringify(data));
};

export const getCompletedAdmissions = (schoolId: string): CompletedAdmission[] => {
    const allData = getAllAdmissionsData();
    return (allData[schoolId] || []).sort((a, b) => b.timestamp - a.timestamp);
};

export const addCompletedAdmission = (
    applicantId: string,
    data: UnebPassSlip | ExtractedUnebSlipData,
    schoolId: string,
    targetClass: string,
    aLevelCombinationGroup?: 'arts' | 'sciences',
    aLevelCombinationChoice?: string,
    isTransfer: boolean = false
): CompletedAdmission => {
    const allData = getAllAdmissionsData();
    if (!allData[schoolId]) {
        allData[schoolId] = [];
    }

    const newAdmission: CompletedAdmission = {
        id: `comp_adm_${Date.now()}`,
        applicantId,
        data,
        status: 'under_review',
        timestamp: Date.now(),
        targetClass,
        aLevelCombinationGroup,
        aLevelCombinationChoice,
    };
    
    if (isTransfer) {
        (newAdmission.data as any).schoolName = `Transferred from another school - ${newAdmission.data.schoolName}`;
    }


    allData[schoolId].unshift(newAdmission);
    saveAllAdmissionsData(allData);
    return newAdmission;
};

export const updateAdmissionStatus = (admissionId: string, schoolId: string, status: 'approved' | 'rejected'): void => {
    const allData = getAllAdmissionsData();
    if (!allData[schoolId]) return;

    const admissionIndex = allData[schoolId].findIndex(adm => adm.id === admissionId);
    if (admissionIndex > -1) {
        allData[schoolId][admissionIndex].status = status;
        saveAllAdmissionsData(allData);
    } else {
        throw new Error("Admission record not found.");
    }
};

export const hasAdmissionBeenSubmitted = (applicantId: string, schoolId: string): boolean => {
    const allAdmissions = getAllAdmissionsData();
    const schoolAdmissions = allAdmissions[schoolId] || [];
    return schoolAdmissions.some(admission => admission.applicantId === applicantId);
};

export const getAdmissionForStudent = (applicantId: string, schoolId: string): CompletedAdmission | null => {
    const allAdmissions = getCompletedAdmissions(schoolId);
    return allAdmissions.find(adm => adm.applicantId === applicantId) || null;
};

export const initiateAdmissionTransfer = (admissionId: string, fromSchoolId: string, toSchoolId: string): void => {
    const allData = getAllAdmissionsData();
    if (!allData[fromSchoolId]) throw new Error("Source school has no admission data.");
    
    const admissionIndex = allData[fromSchoolId].findIndex(adm => adm.id === admissionId);
    if (admissionIndex === -1) throw new Error("Admission to transfer not found.");

    allData[fromSchoolId][admissionIndex].status = 'transferred';
    allData[fromSchoolId][admissionIndex].transferToSchoolId = toSchoolId;
    allData[fromSchoolId][admissionIndex].transferStatus = 'pending_student_approval';
    
    saveAllAdmissionsData(allData);
};

export const respondToTransferOffer = (admissionId: string, schoolId: string, response: 'accepted_by_student' | 'rejected_by_student'): void => {
    const allData = getAllAdmissionsData();
    if (!allData[schoolId]) throw new Error("Originating school data not found.");

    const admissionIndex = allData[schoolId].findIndex(adm => adm.id === admissionId);
    if (admissionIndex === -1) throw new Error("Original admission record not found.");
    
    const admission = allData[schoolId][admissionIndex];
    admission.transferStatus = response;

    if (response === 'accepted_by_student' && admission.transferToSchoolId) {
        addCompletedAdmission(
            admission.applicantId,
            admission.data,
            admission.transferToSchoolId,
            admission.targetClass,
            admission.aLevelCombinationGroup,
            admission.aLevelCombinationChoice,
            true
        );
    } else if (response === 'rejected_by_student') {
        admission.status = 'rejected';
    }
    
    allData[schoolId][admissionIndex] = admission;
    saveAllAdmissionsData(allData);
};

export const findPendingTransferForStudent = (studentIdOrIndexNo: string, toSchoolId: string): CompletedAdmission | null => {
    const allData = getAllAdmissionsData();
    for (const schoolId in allData) {
        const found = allData[schoolId].find(adm => 
            adm.applicantId === studentIdOrIndexNo &&
            adm.status === 'transferred' &&
            adm.transferToSchoolId === toSchoolId &&
            adm.transferStatus === 'pending_student_approval'
        );
        if (found) return found;
    }
    return null;
};

export const finalizeAcceptedTransfer = (admissionId: string, fromSchoolId: string): void => {
    const allData = getAllAdmissionsData();
    if (!allData[fromSchoolId]) return;

    const admissionIndex = allData[fromSchoolId].findIndex(adm => adm.id === admissionId);
    if (admissionIndex > -1) {
        allData[fromSchoolId][admissionIndex].transferStatus = 'accepted_by_student';
        saveAllAdmissionsData(allData);
    }
};
