// services/studentService.ts
import { User, SchoolUserRole, SchoolClass, SubjectPerformance, InternalExamResult, CompletedAdmission, ExtractedUnebSlipData, UnebPassSlip } from '../types';
import { getShops, saveShops } from './canteenService';
import { getClassesForSchool } from './classService';
import { findPendingTransferForStudent } from './settingsService';

const USERS_KEY = '360_smart_school_users';

// Helper to get all users from localStorage
export const getUsers = (): User[] => {
    const users = localStorage.getItem(USERS_KEY);
    return users ? JSON.parse(users) : [];
};

// Helper to save all users to localStorage
const saveUsers = (users: User[]) => {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

/**
 * Retrieves all school users (students, teachers, etc.), excluding superadmins.
 * This is the source of truth for users stored in the main user table.
 * @returns An array of all school users.
 */
export const getAllSchoolUsers = (): User[] => {
    const allUsers = getUsers();
    return allUsers.filter(u => u.role !== 'superadmin');
};

/**
 * Retrieves all registered student users.
 * @returns An array of all student users.
 */
export const getAllStudents = (): User[] => {
    return getAllSchoolUsers().filter(u => u.role === 'student');
};


/**
 * Retrieves all users (excluding superadmins) belonging to a specific set of schools.
 * @param schoolIds An array of school IDs.
 * @returns An array of users from those schools.
 */
export const getSchoolUsersBySchoolIds = (schoolIds: string[]): User[] => {
    const allUsers = getAllSchoolUsers();
    return allUsers.filter(s => s.schoolId && schoolIds.includes(s.schoolId));
};

/**
 * Creates a new school user (student, teacher, etc.).
 * @param userData The user's data, including their role.
 * @returns The newly created user.
 * @throws An error if the User ID or email already exists.
 */
export const createSchoolUser = (userData: Omit<User, 'role' | 'superadmin'> & { role: SchoolUserRole }): User => {
    const users = getUsers();
    const existingUser = users.find(u => u.studentId === userData.studentId);
    if (existingUser) {
        throw new Error('A user with this User ID already exists.');
    }
    
    if (userData.role !== 'student' && userData.email) {
        const existingEmail = users.find(u => u.email?.toLowerCase() === userData.email?.toLowerCase());
        if (existingEmail) {
            throw new Error('A user with this email already exists.');
        }
    }

    // Security Feature: Check for pending transfer
    const pendingTransfer = findPendingTransferForStudent(userData.studentId, userData.schoolId || '');
    if (pendingTransfer) {
        userData.pendingTransferAcceptance = true;
    }

    const newUser: User = {
        ...userData,
    };
    users.push(newUser);
    saveUsers(users);
    return newUser;
};


/**
 * Creates multiple school users from an array of user data (e.g., from a CSV upload).
 * Performs validation and checks for duplicates.
 * @param usersData An array of user data objects to create.
 * @param schoolId The ID of the school to assign all new users to.
 * @returns An object reporting the number of successes, failures, and a list of specific errors.
 */
export const createBulkSchoolUsers = (
    usersData: (Omit<User, 'schoolId' | 'class' | 'stream' | 'role' | 'superadmin' | 'mustChangePassword'> & { role?: string })[],
    schoolId: string,
    targetClass: string,
    targetStream?: string
): { successCount: number; errorCount: number; errors: string[] } => {
    const allUsers = getUsers();
    const errors: string[] = [];
    let successCount = 0;
    const usersToSave: User[] = [];
    const schoolUserRoles: SchoolUserRole[] = ['student', 'teacher', 'head_of_department', 'canteen_seller', 'deputy_headteacher', 'carrier'];

    // Use a Set for efficient duplicate checking within the file
    const fileUserIds = new Set<string>();

    usersData.forEach((userData, index) => {
        const lineNumber = index + 2; // Assuming CSV has a header row

        try {
            if (!userData.name || !userData.studentId || !userData.password) {
                throw new Error(`Missing required fields (Full name, Student ID, password).`);
            }
            
            if (allUsers.some(u => u.studentId.toLowerCase() === userData.studentId.toLowerCase())) {
                throw new Error(`User ID "${userData.studentId}" already exists in the system.`);
            }

            if (fileUserIds.has(userData.studentId.toLowerCase())) {
                throw new Error(`Duplicate User ID "${userData.studentId}" found in the file.`);
            }
            fileUserIds.add(userData.studentId.toLowerCase());
            
            const providedRole = userData.role?.trim().toLowerCase();
            let role: SchoolUserRole = 'student';
            if (providedRole) {
                if (schoolUserRoles.includes(providedRole as SchoolUserRole)) {
                    role = providedRole as SchoolUserRole;
                } else {
                     throw new Error(`Invalid role "${userData.role}". Valid roles are: ${schoolUserRoles.join(', ')}.`);
                }
            }

            // Security Feature: Check for pending transfer
            const pendingTransfer = findPendingTransferForStudent(userData.studentId, schoolId || '');

            const newUser: User = {
                name: userData.name,
                studentId: userData.studentId,
                password: userData.password,
                role: role, 
                mustChangePassword: true,
                schoolId,
                class: targetClass,
                stream: targetStream,
                pendingTransferAcceptance: !!pendingTransfer,
            };
            usersToSave.push(newUser);
            successCount++;

        } catch (e) {
            errors.push(`Line ${lineNumber}: ${(e as Error).message}`);
        }
    });

    if (successCount > 0) {
        saveUsers([...allUsers, ...usersToSave]);
    }

    return {
        successCount,
        errorCount: errors.length,
        errors,
    };
};



/**
 * Updates an existing school user's information.
 * @param userId The ID of the user to update (using the `studentId` field).
 * @param updatedData The new data for the user.
 * @returns The updated user.
 */
export const updateSchoolUser = (userId: string, updatedData: Partial<Omit<User, 'studentId'>>): User => {
    const users = getUsers();
    const userIndex = users.findIndex(u => u.studentId === userId);

    if (userIndex === -1) {
        throw new Error('User not found.');
    }
    
    if (updatedData.email && updatedData.role !== 'student') {
        const existingEmail = users.find(u => u.email?.toLowerCase() === updatedData.email?.toLowerCase() && u.studentId !== userId);
        if (existingEmail) {
            throw new Error('A user with this email already exists.');
        }
    }

    const updatedUser = { ...users[userIndex], ...updatedData };
    
    users[userIndex] = updatedUser;
    saveUsers(users);
    return updatedUser;
};

/**
 * Deletes a school user by their ID.
 * @param userId The ID of the user to delete (using the `studentId` field).
 */
export const deleteSchoolUser = (userId: string): void => {
    let users = getUsers();
    users = users.filter(u => u.studentId !== userId);
    saveUsers(users);
};


/**
 * Resets a school user's password to a new, randomly generated password.
 * @param userId The ID of the user (using the `studentId` field).
 * @returns The new temporary password.
 */
export const resetSchoolUserPassword = (userId: string): string => {
    const users = getUsers();
    const userIndex = users.findIndex(u => u.studentId === userId);

    if (userIndex === -1) {
        throw new Error('User not found.');
    }

    const newPassword = Math.random().toString(36).slice(-8) + 'A1!';
    
    users[userIndex].password = newPassword;
    users[userIndex].mustChangePassword = true;
    saveUsers(users);

    return newPassword;
};

/**
 * Changes a user's password and removes the temporary password flag.
 * @param userId The ID of the user (studentId).
 * @param newPassword The new password to set.
 * @returns The updated user object.
 */
export const changePassword = (userId: string, newPassword: string): User => {
    const users = getUsers();
    const userIndex = users.findIndex(u => u.studentId === userId);

    if (userIndex === -1) {
        throw new Error('User not found.');
    }

    const updatedUser: User = {
        ...users[userIndex],
        password: newPassword,
        mustChangePassword: false,
    };

    users[userIndex] = updatedUser;
    saveUsers(users);
    return updatedUser;
};

/**
 * Assigns a user as a canteen seller for a specific shop.
 * This is an atomic operation that handles unassigning previous owners.
 * @param userId The ID of the user to assign.
 * @param shopId The ID of the shop to assign them to.
 */
export const assignSellerToShop = (userId: string, shopId: string): void => {
    const users = getUsers();
    const shops = getShops();

    const targetUser = users.find(u => u.studentId === userId);
    const targetShop = shops.find(s => s.id === shopId);

    if (!targetUser) throw new Error("User to be assigned not found.");
    if (!targetShop) throw new Error("Shop not found.");

    if (targetShop.ownerId) {
        const currentOwner = users.find(u => u.studentId === targetShop.ownerId);
        if (currentOwner) {
            currentOwner.role = 'student';
            delete currentOwner.shopId;
        }
    }

    if (targetUser.shopId) {
        const oldShop = shops.find(s => s.id === targetUser.shopId);
        if (oldShop) {
            delete oldShop.ownerId;
        }
    }
    
    targetUser.role = 'canteen_seller';
    targetUser.shopId = shopId;
    targetShop.ownerId = userId;

    saveUsers(users);
    saveShops(shops);
};

/**
 * Unassigns the current seller from a shop.
 * @param shopId The ID of the shop.
 */
export const unassignSellerFromShop = (shopId: string): void => {
    const users = getUsers();
    const shops = getShops();

    const targetShop = shops.find(s => s.id === shopId);
    if (!targetShop || !targetShop.ownerId) return;

    const currentOwner = users.find(u => u.studentId === targetShop.ownerId);
    if (currentOwner) {
        currentOwner.role = 'student';
        delete currentOwner.shopId;
    }

    delete targetShop.ownerId;

    saveUsers(users);
    saveShops(shops);
};

/**
 * Assigns a user as a carrier for a specific shop.
 * @param userId The ID of the user to assign.
 * @param shopId The ID of the shop to assign them to.
 */
export const assignCarrierToShop = (userId: string, shopId: string): void => {
    const users = getUsers();
    const shops = getShops();
    
    const targetUser = users.find(u => u.studentId === userId);
    const targetShop = shops.find(s => s.id === shopId);
    
    if (!targetUser) throw new Error("User to be assigned not found.");
    if (!targetShop) throw new Error("Shop not found.");
    
    // Set user role
    targetUser.role = 'carrier';
    
    // Add to shop's carrier list
    if (!targetShop.carrierIds) {
        targetShop.carrierIds = [];
    }
    if (!targetShop.carrierIds.includes(userId)) {
        targetShop.carrierIds.push(userId);
    }
    
    saveUsers(users);
    saveShops(shops);
};

/**
 * Unassigns a carrier from a shop.
 * @param userId The ID of the user to unassign.
 * @param shopId The ID of the shop.
 */
export const unassignCarrierFromShop = (userId: string, shopId: string): void => {
    const users = getUsers();
    const shops = getShops();
    
    const targetUser = users.find(u => u.studentId === userId);
    const targetShop = shops.find(s => s.id === shopId);

    if (!targetUser) throw new Error("User to be unassigned not found.");
    if (!targetShop || !targetShop.carrierIds) return;
    
    // Remove from carrier list
    targetShop.carrierIds = targetShop.carrierIds.filter(id => id !== userId);
    
    // If they are no longer a carrier for any other shop, revert their role
    const isCarrierForOtherShops = shops.some(s => s.carrierIds?.includes(userId));
    if (!isCarrierForOtherShops) {
        targetUser.role = 'student'; // Revert to a default role
    }
    
    saveUsers(users);
    saveShops(shops);
};

// --- Internal Results Management ---
const calculateGrade = (score: number): string => {
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    if (score >= 40) return 'P';
    return 'F';
};

const normalizeClassName = (name: string | undefined): string => {
    if (!name) return '';
    let normalized = name.toUpperCase().replace(/[\s.-]/g, '');
    normalized = normalized.replace(/^SENIOR/, 'S');
    normalized = normalized.replace(/^FORM/, 'F');
    if (normalized.startsWith('F')) {
        normalized = 'S' + normalized.substring(1);
    }
    return normalized;
};


export const bulkUploadInternalResults = (
    csvText: string,
    schoolId: string,
    classId: string,
    stream: string | undefined
): { successCount: number; errorCount: number; errors: string[] } => {
    const allUsers = getUsers();
    const errors: string[] = [];
    const classesForSchool = getClassesForSchool(schoolId);
    const selectedClass = classesForSchool.find(c => c.id === classId);

    if (!selectedClass) {
        throw new Error("The selected class could not be found.");
    }

    const lines = csvText.split(/\r\n|\n/).filter(line => line.trim());
    if (lines.length < 2) {
        throw new Error("CSV file is empty or contains only a header.");
    }

    const header = lines[0].replace(/^\uFEFF/, '').split(',').map(h => h.trim().replace(/"/g, '').toLowerCase().replace(/\s/g, ''));
    
    const required = ['studentid', 'term', 'subject', 'score'];
    const missing = required.filter(h => !header.includes(h));
    if (missing.length > 0) {
        throw new Error(`CSV is missing required columns: ${missing.join(', ')}`);
    }

    const studentIdIndex = header.indexOf('studentid');
    const termIndex = header.indexOf('term');
    const subjectIndex = header.indexOf('subject');
    const scoreIndex = header.indexOf('score');

    const allUsersMap = new Map(allUsers.map(u => [u.studentId.toLowerCase(), u]));
    const resultsByTerm: Record<string, { studentId: string, subject: string, score: number, studentName: string }[]> = {};

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const studentId = values[studentIdIndex]?.trim();
        const term = values[termIndex]?.trim();
        const subject = values[subjectIndex]?.trim();
        const score = parseInt(values[scoreIndex]?.trim(), 10);

        if (!studentId || !term || !subject || isNaN(score)) {
            errors.push(`Line ${i + 1}: Contains invalid or missing data.`);
            continue;
        }

        const student = allUsersMap.get(studentId.toLowerCase());
        if (!student) {
            errors.push(`Line ${i + 1}: Student with ID "${studentId}" not found.`);
            continue;
        }

        const studentClassNormalized = normalizeClassName(student.class);
        const selectedClassNormalized = normalizeClassName(selectedClass.name);

        const isClassMismatch = studentClassNormalized !== selectedClassNormalized;
        
        if (student.schoolId !== schoolId || isClassMismatch) {
            throw new Error("The class of one or more students in your file doesn't match the selected class. Please check your CSV and try again.");
        }
        
        const isStreamMismatch = stream && (student.stream?.toLowerCase() !== stream.toLowerCase());
        
        if (isStreamMismatch) {
             errors.push(`Line ${i + 1}: Student "${student.name}" (${studentId}) does not match the selected stream "${stream}".`);
            continue;
        }

        if (!resultsByTerm[term]) {
            resultsByTerm[term] = [];
        }
        resultsByTerm[term].push({ studentId, subject, score, studentName: student.name });
    }

    if (errors.length > 0) {
        return { successCount: 0, errorCount: errors.length, errors };
    }

    for (const term in resultsByTerm) {
        const termData = resultsByTerm[term];
        const studentResultsInTerm: Record<string, { subjects: { name: string, score: number }[] }> = {};

        termData.forEach(row => {
            if (!studentResultsInTerm[row.studentId]) {
                studentResultsInTerm[row.studentId] = { subjects: [] };
            }
            studentResultsInTerm[row.studentId].subjects.push({ name: row.subject, score: row.score });
        });

        let studentAverages = Object.entries(studentResultsInTerm).map(([studentId, data]) => {
            const totalScore = data.subjects.reduce((sum, s) => sum + s.score, 0);
            const average = data.subjects.length > 0 ? totalScore / data.subjects.length : 0;
            const subjectsWithGrades = data.subjects.map(s => ({ ...s, grade: calculateGrade(s.score) }));
            return { studentId, average, subjects: subjectsWithGrades };
        });

        studentAverages.sort((a, b) => b.average - a.average);
        
        let rank = 1;
        const rankedStudents = studentAverages.map((student, index) => {
            if (index > 0 && student.average < studentAverages[index - 1].average) {
                rank = index + 1;
            }
            return { ...student, rank };
        });
        
        const totalStudentsInTerm = rankedStudents.length;

        rankedStudents.forEach(rankedStudent => {
            const studentIndex = allUsers.findIndex(u => u.studentId.toLowerCase() === rankedStudent.studentId.toLowerCase());
            if (studentIndex > -1) {
                const student = allUsers[studentIndex];
                if (!student.internalExams) student.internalExams = [];

                const newResult: InternalExamResult = {
                    term,
                    subjects: rankedStudent.subjects,
                    average: rankedStudent.average,
                    classPosition: `${rankedStudent.rank} out of ${totalStudentsInTerm}`
                };

                const existingResultIndex = student.internalExams.findIndex(e => e.term.toLowerCase() === term.toLowerCase());
                if (existingResultIndex > -1) {
                    student.internalExams[existingResultIndex] = newResult;
                } else {
                    student.internalExams.push(newResult);
                }
                allUsers[studentIndex] = student;
            }
        });
    }

    const uniqueStudentsUpdatedCount = new Set(Object.values(resultsByTerm).flat().map(r => r.studentId)).size;
    
    if (uniqueStudentsUpdatedCount > 0) {
        saveUsers(allUsers);
    }

    return { successCount: uniqueStudentsUpdatedCount, errorCount: errors.length, errors };
};

export const createSchoolUserFromAdmission = (admission: CompletedAdmission, schoolId: string): { studentId: string; tempPass: string } => {
    const admissionData = admission.data;
    const studentName = 'studentName' in admissionData ? admissionData.studentName : admissionData.name;
    const indexNo = 'indexNumber' in admissionData ? admissionData.indexNumber : admissionData.indexNo;
    
    const studentId = `${schoolId}-${indexNo.replace(/[\/\s]/g, '')}`;
    const tempPass = Math.random().toString(36).slice(-8);

    let unebData: UnebPassSlip | undefined = undefined;

    if ('level' in admissionData) {
        unebData = admissionData;
    } else {
        const [year, ...levelParts] = (admissionData.yearAndLevel || " U.C.E").split(' ');
        const levelStr = levelParts.join(' ').replace(/\./g, '');
        const level: 'P.L.E' | 'U.C.E' | 'U.A.C.E' = 
            levelStr === 'UCE' ? 'U.C.E' :
            levelStr === 'UACE' ? 'U.A.C.E' :
            levelStr === 'PLE' ? 'P.L.E' : 'U.C.E';
        
        unebData = {
            indexNo: admissionData.indexNumber,
            name: admissionData.studentName,
            year: year,
            level: level,
            subjects: admissionData.subjects,
            dateOfBirth: admissionData.dateOfBirth,
            schoolName: admissionData.schoolName,
            schoolAddress: admissionData.schoolAddress,
            entryCode: admissionData.entryCode,
            aggregate: admissionData.aggregate,
            result: admissionData.result,
        };
    }

    const newUser: Omit<User, 'role' | 'superadmin'> & { role: SchoolUserRole } = {
        name: studentName,
        studentId: studentId,
        schoolId: schoolId,
        class: admission.targetClass,
        role: 'student',
        password: tempPass,
        mustChangePassword: true,
        dateOfBirth: admission.data.dateOfBirth,
        unebPassSlip: unebData,
        accountStatus: 'active',
    };
    
    createSchoolUser(newUser);

    return { studentId, tempPass };
};

export const createTemporaryUserFromAdmission = (admission: CompletedAdmission, schoolId: string): { studentId: string; tempPass: string } => {
    const indexNo = 'indexNumber' in admission.data ? admission.data.indexNumber : admission.data.indexNo;
    const studentName = 'studentName' in admission.data ? admission.data.studentName : admission.data.name;
    
    const newUser: User = {
        name: studentName,
        studentId: indexNo,
        schoolId: schoolId,
        password: 'Student.New',
        mustChangePassword: true,
        role: 'student',
        accountStatus: 'temporary',
        unebPassSlip: 'level' in admission.data ? admission.data : undefined,
    };
    
    const users = getUsers();
    const existingUser = users.find(u => u.studentId === newUser.studentId);
    if (existingUser) {
        // If a temporary user already exists, just update their schoolId and reset password flag
        existingUser.schoolId = schoolId;
        existingUser.mustChangePassword = true;
        existingUser.password = 'Student.New';
        updateSchoolUser(existingUser.studentId, existingUser);
    } else {
        users.push(newUser);
        saveUsers(users);
    }

    return { studentId: indexNo, tempPass: 'Student.New' };
};

export const disableTemporaryAccount = (studentId: string): void => {
    updateSchoolUser(studentId, { accountStatus: 'disabled' });
    // The automatic deletion after 30 days is a complex background task.
    // For this simulation, we'll just leave the account as 'disabled'.
};

export const transferStudent = (studentId: string, newSchoolId: string): void => {
    updateSchoolUser(studentId, { schoolId: newSchoolId });
};

export const bulkUpdateStudentsStatus = (studentIds: string[], status: User['accountStatus']): void => {
    const users = getUsers();
    let updatedCount = 0;
    const newUsers = users.map(user => {
        if ('studentId' in user && studentIds.includes(user.studentId)) {
            user.accountStatus = status;
            updatedCount++;
        }
        return user;
    });
    if (updatedCount > 0) {
        saveUsers(newUsers);
    }
};

export const bulkUpdateStudentsClass = (studentIds: string[], newClass: string, newStream: string): void => {
    const users = getUsers();
    let updatedCount = 0;
    const newUsers = users.map(user => {
        if ('studentId' in user && studentIds.includes(user.studentId)) {
            user.class = newClass;
            user.stream = newStream;
            updatedCount++;
        }
        return user;
    });
    if (updatedCount > 0) {
        saveUsers(newUsers);
    }
};
