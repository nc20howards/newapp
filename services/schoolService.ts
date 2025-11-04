
import { School, Module, StudentTransferProposal, TransferNegotiation } from '../types';
import { getAllModules, HOME_PAGE_MODULE_NAME } from './moduleService';
import { findUserById } from './groupService';
import { createDefaultClassesForSchool } from './classService';
import * as settingsService from './settingsService';

const SCHOOLS_KEY = '360_smart_school_schools';
const PROPOSALS_KEY = '360_smart_school_transfer_proposals';
const NEGOTIATIONS_KEY = '360_smart_school_transfer_negotiations';

const getSchools = (): School[] => {
    const schoolsData = localStorage.getItem(SCHOOLS_KEY);
    return schoolsData ? JSON.parse(schoolsData) : [];
};

export const saveSchools = (schools: School[]) => {
    localStorage.setItem(SCHOOLS_KEY, JSON.stringify(schools));
};

export const getAllSchools = (): School[] => {
    return getSchools();
};

export const registerSchool = (schoolData: Omit<School, 'id' | 'modules'>, moduleIds: string[] = []): School => {
    const schools = getSchools();
    if (schools.find(s => s.name.toLowerCase() === schoolData.name.toLowerCase())) {
        throw new Error('A school with this name already exists.');
    }
    
    const allModules = getAllModules();
    const homePageModule = allModules.find(m => m.name === HOME_PAGE_MODULE_NAME);

    const modulesForSchool: School['modules'] = [];
    if (homePageModule) {
        modulesForSchool.push({ moduleId: homePageModule.id, status: 'active' });
    }
    moduleIds.forEach(id => {
        if (id !== homePageModule?.id) {
            modulesForSchool.push({ moduleId: id, status: 'assigned' });
        }
    });

    const newSchool: School = {
        ...schoolData,
        id: `school_${Date.now()}`,
        modules: modulesForSchool,
        isHomePagePublished: false,
    };
    schools.push(newSchool);
    saveSchools(schools);

    // Create default classes for the new school
    createDefaultClassesForSchool(newSchool.id);

    return newSchool;
};

const sanitizeSchoolModules = (modules: School['modules']): School['modules'] => {
    if (!modules || !Array.isArray(modules)) {
        return [];
    }
    const assignmentsByModuleId = new Map<string, School['modules'][0]>();
    for (const mod of modules) {
        if (mod && mod.moduleId) {
            // Keep the last one found in case of duplicates
            assignmentsByModuleId.set(mod.moduleId, mod);
        }
    }
    return Array.from(assignmentsByModuleId.values());
};

export const updateSchool = (schoolId: string, updatedData: Omit<School, 'id'>): School => {
    const schools = getSchools();
    if (schools.find(s => s.name.toLowerCase() === updatedData.name.toLowerCase() && s.id !== schoolId)) {
        throw new Error('A school with this name already exists.');
    }
    let updatedSchool: School | undefined;
    const newSchools = schools.map(school => {
        if (school.id === schoolId) {
            updatedSchool = { ...school, ...updatedData };
            if (updatedSchool.modules) {
                 updatedSchool.modules = sanitizeSchoolModules(updatedSchool.modules);
            }
            return updatedSchool;
        }
        return school;
    });
    if (!updatedSchool) throw new Error('School not found.');
    saveSchools(newSchools);
    return updatedSchool;
};

export const deleteSchool = (schoolId: string): void => {
    let schools = getSchools();
    schools = schools.filter(school => school.id !== schoolId);
    saveSchools(schools);
};

export const activateModuleForSchool = (schoolId: string, moduleId: string): School => {
    const schools = getSchools();
    let updatedSchool: School | undefined;

    const newSchools = schools.map(school => {
        if (school.id === schoolId) {
            const moduleExists = school.modules.some(m => m.moduleId === moduleId);
            let newModules;

            if (moduleExists) {
                newModules = school.modules.map(m =>
                    m.moduleId === moduleId ? { ...m, status: 'active' as const } : m
                );
            } else {
                newModules = [...school.modules, { moduleId, status: 'active' as const }];
            }
            
            updatedSchool = { ...school, modules: newModules };
            return updatedSchool;
        }
        return school;
    });

    if (!updatedSchool) throw new Error("School not found.");
    
    saveSchools(newSchools);
    return updatedSchool;
};

export const deactivateModuleForSchool = (schoolId: string, moduleId: string): School => {
    const schools = getSchools();
    let updatedSchool: School | undefined;
    const newSchools = schools.map(school => {
        if (school.id === schoolId) {
            const newModules = school.modules.map(m =>
                m.moduleId === moduleId ? { ...m, status: 'assigned' as const } : m
            );
            updatedSchool = { ...school, modules: newModules };
            return updatedSchool;
        }
        return school;
    });

    if (!updatedSchool) throw new Error("School not found.");
    saveSchools(newSchools);
    return updatedSchool;
};

export const publishModuleForSchool = (schoolId: string, moduleId: string): School => {
    const schools = getSchools();
    let updatedSchool: School | undefined;
    const newSchools = schools.map(school => {
        if (school.id === schoolId) {
            const moduleAssignment = school.modules.find(m => m.moduleId === moduleId);
            if (!moduleAssignment || moduleAssignment.status !== 'active') {
                throw new Error("Only active modules can be published.");
            }
            const newModules = school.modules.map(m =>
                m.moduleId === moduleId ? { ...m, status: 'published' as const } : m
            );
            updatedSchool = { ...school, modules: newModules };
            return updatedSchool;
        }
        return school;
    });

    if (!updatedSchool) throw new Error("School not found.");
    saveSchools(newSchools);
    return updatedSchool;
};

export const unpublishModuleForSchool = (schoolId: string, moduleId: string): School => {
    const schools = getSchools();
    let updatedSchool: School | undefined;
    const newSchools = schools.map(school => {
        if (school.id === schoolId) {
            const moduleAssignment = school.modules.find(m => m.moduleId === moduleId);
            if (!moduleAssignment || moduleAssignment.status !== 'published') {
                throw new Error("Only published modules can be unpublished.");
            }
            const newModules = school.modules.map(m =>
                m.moduleId === moduleId ? { ...m, status: 'active' as const } : m
            );
            updatedSchool = { ...school, modules: newModules };
            return updatedSchool;
        }
        return school;
    });

    if (!updatedSchool) throw new Error("School not found.");
    saveSchools(newSchools);
    return updatedSchool;
};

export const publishHomePage = (schoolId: string): void => {
    const schools = getSchools();
    const school = schools.find(s => s.id === schoolId);
    if (!school) throw new Error("School not found.");
    school.isHomePagePublished = true;
    saveSchools(schools);
};

export const unpublishHomePage = (schoolId: string): void => {
    const schools = getSchools();
    const school = schools.find(s => s.id === schoolId);
    if (!school) throw new Error("School not found.");
    school.isHomePagePublished = false;
    saveSchools(schools);
};

export const getProposals = (): StudentTransferProposal[] => {
    const data = localStorage.getItem(PROPOSALS_KEY);
    return data ? JSON.parse(data) : [];
};
const saveProposals = (proposals: StudentTransferProposal[]) => {
    localStorage.setItem(PROPOSALS_KEY, JSON.stringify(proposals));
};
export const getNegotiations = (): TransferNegotiation[] => {
    const data = localStorage.getItem(NEGOTIATIONS_KEY);
    return data ? JSON.parse(data) : [];
};
const saveNegotiations = (negotiations: TransferNegotiation[]) => {
    localStorage.setItem(NEGOTIATIONS_KEY, JSON.stringify(negotiations));
};
export const getOpenMarketProposals = (mySchoolId: string): StudentTransferProposal[] => {
    return getProposals().filter(p => p.proposingSchoolId !== mySchoolId && p.status === 'open');
};
export const getProposalsForSchool = (schoolId: string): StudentTransferProposal[] => {
    return getProposals().filter(p => p.proposingSchoolId === schoolId);
};
export const getNegotiationsForSchool = (schoolId: string): TransferNegotiation[] => {
    return getNegotiations().filter(n => n.proposingSchoolId === schoolId || n.interestedSchoolId === schoolId)
        .sort((a, b) => b.lastUpdated - a.lastUpdated);
};
export const startOrGetNegotiation = (proposalId: string, interestedSchoolId: string): TransferNegotiation => {
    const negotiations = getNegotiations();
    const proposal = getProposals().find(p => p.id === proposalId);
    if (!proposal) throw new Error("Proposal not found.");

    const negotiationId = `${proposalId}_${interestedSchoolId}`;
    let negotiation = negotiations.find(n => n.id === negotiationId);

    if (negotiation) {
        return negotiation;
    }

    negotiation = {
        id: negotiationId,
        proposalId,
        proposingSchoolId: proposal.proposingSchoolId,
        interestedSchoolId,
        messages: [],
        status: 'active',
        lastUpdated: Date.now(),
    };
    negotiations.push(negotiation);
    saveNegotiations(negotiations);
    return negotiation;
};

// FIX: Add missing createProposal function
export const createProposal = (data: Omit<StudentTransferProposal, 'id' | 'status' | 'timestamp' | 'proposingSchoolName' | 'pricePerStudent' | 'deadline'> & {pricePerStudent?: number, deadline?: number}): StudentTransferProposal => {
    const proposals = getProposals();
    const proposingSchool = getAllSchools().find(s => s.id === data.proposingSchoolId);
    if (!proposingSchool) {
        throw new Error("Proposing school not found.");
    }
    const newProposal: StudentTransferProposal = {
        id: `prop_${Date.now()}`,
        proposingSchoolName: proposingSchool.name,
        ...data,
        status: 'open',
        timestamp: Date.now(),
        pricePerStudent: data.pricePerStudent || 0,
        deadline: data.deadline || 0,
    };
    proposals.push(newProposal);
    saveProposals(proposals);
    return newProposal;
};

// FIX: Add missing addNegotiationMessage function
export const addNegotiationMessage = (negotiationId: string, senderId: string, content: string): TransferNegotiation => {
    const negotiations = getNegotiations();
    const negotiationIndex = negotiations.findIndex(n => n.id === negotiationId);
    if (negotiationIndex === -1) {
        throw new Error("Negotiation not found.");
    }
    const negotiation = negotiations[negotiationIndex];
    const sender = findUserById(senderId);
    if (!sender) {
        throw new Error("Sender not found.");
    }
    negotiation.messages.push({
        senderId,
        senderName: sender.name,
        content,
        timestamp: Date.now(),
    });
    negotiation.lastUpdated = Date.now();
    negotiations[negotiationIndex] = negotiation;
    saveNegotiations(negotiations);
    return negotiation;
};

export const updateNegotiationStatus = (negotiationId: string, status: TransferNegotiation['status']): TransferNegotiation => {
    const negotiations = getNegotiations();
    const negotiationIndex = negotiations.findIndex(n => n.id === negotiationId);
    if (negotiationIndex === -1) {
        throw new Error("Negotiation not found.");
    }
    const negotiation = negotiations[negotiationIndex];
    
    negotiation.status = status;
    negotiation.lastUpdated = Date.now();
    
    // Automatically update admission status for the selling school upon payment
    if (status === 'payment_made') {
        if (negotiation.assignedStudents && negotiation.assignedStudents.length > 0) {
            const sellingSchoolId = negotiation.proposingSchoolId;
            const buyingSchoolId = negotiation.interestedSchoolId;

            negotiation.assignedStudents.forEach(assignedStudent => {
                const originalAdmission = settingsService.getAdmissionForStudent(assignedStudent.studentId, sellingSchoolId);
                if (originalAdmission) {
                    // This function sets status to 'transferred', sets the destination school,
                    // and sets the student's transfer status to 'pending_student_approval'.
                    settingsService.initiateAdmissionTransfer(
                        originalAdmission.id,
                        sellingSchoolId,
                        buyingSchoolId
                    );
                } else {
                     console.warn(`Could not find an admission record for student ${assignedStudent.studentId} at school ${sellingSchoolId} to mark as transferred.`);
                }
            });
        }
    }


    negotiations[negotiationIndex] = negotiation;
    saveNegotiations(negotiations);
    return negotiation;
};
