import { UnebPassSlip, UnebStats } from '../types';
import { isUnebVerificationEnabled } from './systemSettingsService';

const UNEB_RESULTS_KEY = '360_smart_school_uneb_results';

// Helper to get all pass slips from localStorage
const getResults = (): UnebPassSlip[] => {
    const results = localStorage.getItem(UNEB_RESULTS_KEY);
    return results ? JSON.parse(results) : [];
};

// Helper to save all pass slips to localStorage
const saveResults = (results: UnebPassSlip[]) => {
    localStorage.setItem(UNEB_RESULTS_KEY, JSON.stringify(results));
};

/**
 * Adds a batch of UNEB pass slips, performing an all-or-nothing validation.
 * It now parses a combined year/level column from the CSV (e.g., "2023 U.C.E") and validates
 * it against the expected values from the UI. If any row fails, the entire batch is rejected.
 * @param slipsFromCsv An array of partial pass slips parsed from the CSV.
 * @param expectedLevel The level selected by the admin in the UI.
 * @param expectedYear The year selected by the admin in the UI.
 * @returns An object detailing the success and error counts of the operation.
 */
export const addResults = (
    slipsFromCsv: Partial<UnebPassSlip>[],
    expectedLevel: 'P.L.E' | 'U.C.E' | 'U.A.C.E',
    expectedYear: string
): { successCount: number; errorCount: number; errors: string[] } => {
    const existingSlips = getResults();
    const slipsToSave = new Map<string, UnebPassSlip>();
    for (const slip of existingSlips) {
        slipsToSave.set(slip.indexNo.toUpperCase(), slip);
    }

    const errors: string[] = [];
    let processedCount = 0;

    slipsFromCsv.forEach((slipData, index) => {
        const lineNumber = index + 2; // Assuming CSV has header
        try {
            if (!slipData.indexNo || !slipData.name) {
                throw new Error("Missing required data (student name, index number).");
            }

            // The `year` property from CSV is now expected to be a combined string like "2023 U.C.E"
            const yearAndLevelFromFile = slipData.year;
            if (!yearAndLevelFromFile || typeof yearAndLevelFromFile !== 'string') {
                throw new Error("Missing or invalid 'Exam Year' column data. Expected format like '2023 U.C.E'.");
            }

            const parts = yearAndLevelFromFile.trim().split(/\s+/);
            const yearFromFile = parts.find(p => /^\d{4}$/.test(p));
            
            const normalizeLevel = (levelStr: string | undefined) => levelStr?.replace(/\./g, '').toUpperCase();
            const levelFromFileRaw = parts.find(p => p && ['PLE', 'UCE', 'UACE'].includes(normalizeLevel(p)));

            if (!yearFromFile || !levelFromFileRaw) {
                 throw new Error(`Could not parse year and level from '${yearAndLevelFromFile}'. Expected format like '2023 U.C.E'.`);
            }
            
            const normalizedLevelFromFile = normalizeLevel(levelFromFileRaw);
            const normalizedExpectedLevel = normalizeLevel(expectedLevel);

            if (yearFromFile !== expectedYear) {
                throw new Error(`Year mismatch. UI selected '${expectedYear}', but file contains '${yearFromFile}'.`);
            }

            if (normalizedLevelFromFile !== normalizedExpectedLevel) {
                 throw new Error(`Level mismatch. UI selected '${expectedLevel}', but file contains '${levelFromFileRaw}'.`);
            }
            
            const finalSlip: UnebPassSlip = {
                ...slipData,
                indexNo: slipData.indexNo,
                name: slipData.name,
                year: expectedYear,
                level: expectedLevel,
                subjects: slipData.subjects || [],
            };

            slipsToSave.set(finalSlip.indexNo.toUpperCase(), finalSlip);
            processedCount++;
        } catch (e) {
            errors.push(`Line ${lineNumber}: ${(e as Error).message}`);
        }
    });

    // All-or-nothing: only save if there are no errors.
    if (errors.length === 0 && slipsFromCsv.length > 0) {
      saveResults(Array.from(slipsToSave.values()));
      return {
          successCount: processedCount,
          errorCount: 0,
          errors: [],
      };
    } else {
        // If there are errors, report them and do not save any changes.
        return {
            successCount: 0,
            errorCount: errors.length,
            errors,
        };
    }
};


/**
 * Finds a student's UNEB pass slip by their index number.
 * This function is now protected by the system-wide UNEB verification setting.
 * @param indexNo The index number to search for.
 * @returns The UnebPassSlip object or null if not found.
 * @throws An error if the UNEB verification service is disabled by the superadmin.
 */
export const findResultByIndex = (indexNo: string): UnebPassSlip | null => {
    // Check if the service is enabled system-wide.
    if (!isUnebVerificationEnabled()) {
        throw new Error("The UNEB result verification service is currently disabled. Please contact the superadministrator.");
    }

    const slips = getResults();
    return slips.find(slip => slip.indexNo.toUpperCase() === indexNo.toUpperCase()) || null;
};

/**
 * Gathers statistics from the stored UNEB results data, categorized by level.
 * @returns An object with various statistics about the UNEB results.
 */
export const getUnebStats = (): UnebStats => {
    const slips = getResults();
    const uniqueSchoolNames = new Set(slips.map(slip => slip.schoolName).filter(Boolean));

    const byLevel: UnebStats['byLevel'] = {
        'P.L.E': { studentCount: 0, years: [] },
        'U.C.E': { studentCount: 0, years: [] },
        'U.A.C.E': { studentCount: 0, years: [] },
    };
    
    const yearsByLevel: Record<'P.L.E' | 'U.C.E' | 'U.A.C.E', Set<string>> = {
        'P.L.E': new Set<string>(),
        'U.C.E': new Set<string>(),
        'U.A.C.E': new Set<string>(),
    };

    for (const slip of slips) {
        if (slip.level && byLevel[slip.level]) {
            byLevel[slip.level].studentCount++;
            if(slip.year) {
               yearsByLevel[slip.level].add(slip.year);
            }
        }
    }
    
    byLevel['P.L.E'].years = Array.from(yearsByLevel['P.L.E']).sort();
    byLevel['U.C.E'].years = Array.from(yearsByLevel['U.C.E']).sort();
    byLevel['U.A.C.E'].years = Array.from(yearsByLevel['U.A.C.E']).sort();

    return {
        totalSlips: slips.length,
        uniqueSchools: uniqueSchoolNames.size,
        byLevel,
    };
};
