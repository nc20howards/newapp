import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
// FIX: Changed to a named import for StudentPage as it does not have a default export.
import { StudentPage } from './components/StudentPage';
// FIX: Changed to a named import for SuperadminPage as it does not have a default export.
import { SuperadminPage } from './components/SuperadminPage';
// FIX: Changed to a named import for AdminPage to match its export type.
import { AdminPage } from './components/AdminPage';
import SchoolLandingPage from './components/SchoolLandingPage';
import { checkSession, logout } from './services/authService';
import { User, AdminUser, School } from './types';
import { seedInitialData } from './services/seedService';
import { getAllSchools } from './services/schoolService';
import Chat from './components/Chat';
import ForcePasswordChange from './components/ForcePasswordChange';
import { TeacherPage } from './components/TeacherPage';


// Type guard to differentiate between User (student/superadmin) and AdminUser
const isStudentOrSuperadmin = (user: User | AdminUser): user is User => {
    return 'studentId' in user;
};

// Fix: Removed React.FC type to resolve a cascade of compilation errors.
const App = () => {
    const [user, setUser] = useState<User | AdminUser | null>(null);
    const [isSessionChecked, setIsSessionChecked] = useState(false);
    const [showLandingPageForSchool, setShowLandingPageForSchool] = useState<School | null>(null);
    const [isChatOpen, setIsChatOpen] = useState(false);

    useEffect(() => {
        // Run the seeder function on initial app load.
        // It will only add data if it doesn't already exist.
        seedInitialData();

        // Check for a logged-in user on initial mount
        try {
            const sessionUser = checkSession();
            if (sessionUser) {
                setUser(sessionUser);
            }
        } catch (error) {
            console.error("Error checking session:", error);
        } finally {
            setIsSessionChecked(true);
        }
    }, []);

    const handleLoginSuccess = (loggedInUser: User | AdminUser) => {
        // Find the user's school ID
        let userSchoolId: string | null = null;
        if ('schoolId' in loggedInUser && loggedInUser.schoolId) {
            userSchoolId = loggedInUser.schoolId;
        } else if ('assignedSchoolIds' in loggedInUser && loggedInUser.assignedSchoolIds.length > 0) {
            userSchoolId = loggedInUser.assignedSchoolIds[0];
        }

        // Check if the school has a published home page
        if (userSchoolId) {
            const schools = getAllSchools();
            const school = schools.find(s => s.id === userSchoolId);
            if (school && school.isHomePagePublished) {
                setUser(loggedInUser); // Set user first
                setShowLandingPageForSchool(school); // Then trigger landing page view
                return;
            }
        }
        
        // If no published page, proceed directly
        setUser(loggedInUser);
    };

    const handlePasswordChangeSuccess = (updatedUser: User) => {
        setUser(updatedUser);
        localStorage.setItem('360_smart_school_session', JSON.stringify(updatedUser));
    };
    
    const handleProceedToDashboard = () => {
        setShowLandingPageForSchool(null);
    };

    const handleLogout = () => {
        logout();
        setUser(null);
        setShowLandingPageForSchool(null);
    };
    
    if (!isSessionChecked) {
        // You can render a loading spinner here while checking the session
        return <div className="flex items-center justify-center h-screen bg-gray-900 text-white">Loading...</div>;
    }

    if (!user) {
        return <Auth onLoginSuccess={handleLoginSuccess} onNewUser={() => {}} />;
    }

    // Check if the user must change their password
    if (isStudentOrSuperadmin(user) && user.mustChangePassword) {
        return <ForcePasswordChange user={user} onSuccess={handlePasswordChangeSuccess} />;
    }


    // New logic: Show landing page if it's set
    if (showLandingPageForSchool) {
        return <SchoolLandingPage school={showLandingPageForSchool} onProceed={handleProceedToDashboard} />;
    }

    const isStudentView = isStudentOrSuperadmin(user) && user.role === 'student';

    const renderPage = () => {
        // Check user type and role for routing
        if (isStudentOrSuperadmin(user)) {
            if (user.role === 'superadmin') {
                return <SuperadminPage user={user} onLogout={handleLogout} />;
            }
            
            if (user.role === 'teacher') {
                return <TeacherPage user={user} onLogout={handleLogout} />;
            }

            // All other school users (students, etc.) go to the unified StudentPage dashboard.
            return <StudentPage user={user} onLogout={handleLogout} />;
        } else {
            // This must be an AdminUser (Headteacher, UNEB Admin, NCHE Admin)
            return <AdminPage user={user} onLogout={handleLogout} />;
        }
    };

    return (
        <>
            {renderPage()}
            {isStudentView && (
                <>
                    {isChatOpen && (
                        <div className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 w-[calc(100%-2rem)] sm:w-full max-w-md h-[75vh] sm:h-[600px] z-[101]">
                            <Chat user={user} onClose={() => setIsChatOpen(false)} />
                        </div>
                    )}
                    {!isChatOpen && (
                         <button
                            onClick={() => setIsChatOpen(true)}
                            className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 w-16 h-16 bg-cyan-600 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-cyan-700 transition-transform transform hover:scale-110 z-[100] animate-pulse-custom"
                            title="Open AI Assistant"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.874 8.874 0 01-4.444-1.225L2.25 17.56a.75.75 0 01-.486-1.369l2.42-1.729A8.962 8.962 0 012 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM4.75 10a6.25 6.25 0 1112.5 0 6.25 6.25 0 01-12.5 0z" clipRule="evenodd" /></svg>
                        </button>
                    )}
                </>
            )}
        </>
    );
};

export default App;
