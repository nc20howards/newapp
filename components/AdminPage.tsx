import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
// FIX: Added UnebResultEntry and CustomIdTemplate to imports for use in the new UNEB admin components and Smart ID editor.
import { AdminUser, School, Module, User as SchoolUser, AuditLogEntry, UnebPassSlip, UnebStats, CustomIdTemplate, SchoolUserRole, ExtractedUnebSlipData, AdmissionSettings, CompletedAdmission, PinResetRequest, SchoolClass, SmartIDSettings, CustomIdField, IpWhitelistSettings, StudentTransferProposal, TransferNegotiation, SchoolALevelCombination } from '../types';
import { getAllSchools, activateModuleForSchool, deactivateModuleForSchool, publishModuleForSchool, unpublishModuleForSchool, publishHomePage, unpublishHomePage } from '../services/schoolService';
import { getAllModules, HOME_PAGE_MODULE_NAME, SMART_ADMISSION_MODULE_NAME, E_WALLET_MODULE_NAME, ONLINE_MODULE_NAME, SMART_STUDENT_ID_MODULE_NAME, E_CANTEEN_MODULE_NAME, NCHE_MODULE_NAME, STUDENT_TRANSFER_MODULE_NAME, MESSAGE_MODULE_NAME, EXPLORATION_MODULE_NAME, E_VOTE_MODULE_NAME, VISITOR_REG_MODULE_NAME } from '../services/moduleService';
import * as studentService from '../services/studentService';
import { extractTextFromImageWithGoogle } from '../services/apiService';
// FIX: Imported UNEB service functions for use in the new UNEB admin components.
import { addResults as addUnebResults, findResultByIndex, getUnebStats } from '../services/unebResultService';
import StatCard from './StatCard';
import HomePageEditor from './HomePageEditor';
import NotificationBell from './NotificationBell';
import { APP_TITLE } from '../constants';
import SocialHubPage from './SocialHubPage';
import { logAction, getAllLogs } from '../services/auditLogService';
import PasswordStrengthIndicator from './PasswordStrengthIndicator';
import * as settingsService from '../services/settingsService';
import EWalletPage from './EWalletPage';
import * as systemSettingsService from '../services/systemSettingsService';
import ProfilePage from './ProfilePage';
import * as userService from '../services/userService';
import { heartbeat } from '../services/presenceService';
import OnlineFeedPage from './OnlineFeedPage';
import * as classService from '../services/classService';
import * as smartIdService from '../services/smartIdService';
import { SmartIdCard, SmartIdCardBack, SmartIdCardFront } from './SmartIdCard';
import IdCardDesigner from './IdCardDesigner';
import ECanteenManagementPage from './ECanteenManagementPage';
// FIX: Import customIdTemplateService to resolve 'Cannot find name' error.
import * as customIdTemplateService from '../services/customIdTemplateService';
import CustomSmartIdCard, { CustomSmartIdCardDownloadable } from './CustomSmartIdCard';
import HeadteacherNcheView from './HeadteacherNcheView';
import NcheAdminPage from './NcheAdminPage';
import UserAvatar from './UserAvatar';
import StudentTransferMarketplace from './StudentTransferMarketplace';
import ConfirmationModal from './ConfirmationModal';
import ExplorationPage from './ExplorationPage';
import { createBroadcastNotification } from '../services/notificationService';
import EVoteAdminPage from './EVoteAdminPage';
import VisitorRegPage from './VisitorRegPage';

// --- TYPE DEFINITIONS for Smart Admission ---
type KioskView = 'main' | 'index' | 'scan';

// --- SVG Icons ---
const DashboardIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>);
const UnebIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5 8.281V13.5a1 1 0 001 1h8a1 1 0 001-1V8.281l2.394-1.36a1 1 0 000-1.84l-7-3zM6 9.319l4 2.286 4-2.286V13.5H6V9.319z" /><path d="M15 13.129l-5 2.857-5-2.857V9.32l5 2.857 5-2.857v3.81z" /></svg>);
const EWalletIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>);
const ModulesIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5 4a1 1 0 00-1 1v6a1 1 0 001 1h6a1 1 0 001-1V5a1 1 0 00-1-1H5zM5 3a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V5a2 2 0 00-2-2H5z" /><path d="M15 4a1 1 0 00-1 1v2a1 1 0 001 1h2a1 1 0 001-1V5a1 1 0 00-1-1h-2zM15 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2h-2zM5 14a1 1 0 00-1 1v2a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 00-1-1H5zM5 13a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM15 14a1 1 0 00-1 1v2a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 00-1-1h-2zM15 13a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2h-2z" /></svg>);
const UsersIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>);
const ActiveModulesIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 2a.75.75 0 01.75.75v.25h.5a.75.75 0 010 1.5h-.5v.25a.75.75 0 01-1.5 0v-.25h-.5a.75.75 0 010-1.5h.5v-.25A.75.75 0 0110 2zM5.013 4.3a.75.75 0 01.53 1.28l-.213.213a.75.75 0 01-1.06 0l-.213-.213a.75.75 0 01.53-1.28zM14.987 4.3a.75.75 0 01.53 1.28l-.213.213a.75.75 0 01-1.06 0l-.213-.213a.75.75 0 01.53-1.28zM17 10a.75.75 0 01.25.75v.5a.75.75 0 01-1.5 0v-.5a.75.75 0 011.25-.664V10zM3 10a.75.75 0 01.25.75v.5a.75.75 0 01-1.5 0v-.5A.75.75 0 013 10zm11.987 5.7a.75.75 0 01.53-1.28l.213.213a.75.75 0 010 1.06l-.213.213a.75.75 0 01-.53-1.28zM5.013 15.7a.75.75 0 01.53-1.28l.213.213a.75.75 0 010 1.06l-.213.213a.75.75 0 01-.53-1.28zM10 17a.75.75 0 01.75.75v.25h.5a.75.75 0 010 1.5h-.5v.25a.75.75 0 01-1.5 0v-.25h-.5a.75.75 0 010-1.5h.5v-.25A.75.75 0 0110 17zM8 10a2 2 0 114 0 2 2 0 01-4 0z" clipRule="evenodd" /></svg>);
const ChevronIcon = ({ isOpen }: { isOpen: boolean }) => (<svg className={`w-5 h-5 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>);
const HamburgerIcon = () => (<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>);
const CloseIcon = () => (<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>);
const HomePageIcon = () => (<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>);
const SmartAdmissionIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5 8.281V13.5a1 1 0 001 1h8a1 1 0 001-1V8.281l2.394-1.36a1 1 0 000-1.84l-7-3zM6 9.319l4 2.286 4-2.286V13.5H6V9.319z" /><path d="M15 13.129l-5 2.857-5-2.857V9.32l5 2.857 5-2.857v3.81z" /></svg>);
const MessageIcon = () => (<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" /></svg>);
const OnlineIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.522-1.522l.836.836a.75.75 0 001.06 0l1.414-1.414a.75.75 0 000-1.06l-.836-.836A7.5 7.5 0 002 10a7.5 7.5 0 004.027 6.668l.836-.836a.75.75 0 000-1.06l-1.414-1.414a.75.75 0 00-1.06 0l-.836.836a6.012 6.012 0 01-1.522-1.522zm11.336 0a6.012 6.012 0 01-1.522 1.522l-.836-.836a.75.75 0 00-1.06 0L11.25 10.5l-1.06-1.06a.75.75 0 00-1.06 0l-.836.836a6.012 6.012 0 01-1.522-1.522l.836-.836a.75.75 0 000-1.06L5.5 4.332a.75.75 0 00-1.06 0l-.836.836A7.5 7.5 0 0010 2.5a7.5 7.5 0 006.668 4.027l-.836.836a.75.75 0 00-1.06 0l-1.414 1.414a.75.75 0 000 1.06l.836.836z" clipRule="evenodd" /></svg>);
const VerifiedIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>);
const EditIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>);
const IdCardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2H3zm3 2a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm-1 4a1 1 0 100 2h.01a1 1 0 100-2H5zm3 0a1 1 0 100 2h6a1 1 0 100-2H8zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H5zm3 0a1 1 0 100 2h6a1 1 0 100-2H8z" clipRule="evenodd" /></svg>;
const CanteenIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 4.5A1.5 1.5 0 013.5 3h1.53a1.5 1.5 0 011.42 1.049l.343.857a.5.5 0 00.47.344h4.474a.5.5 0 00.47-.344l.343-.857A1.5 1.5 0 0113.97 3H15.5A1.5 1.5 0 0117 4.5V5h-.5a.5.5 0 000 1h.5v1.5a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 012 7.5V5h.5a.5.5 0 000-1H2V4.5zM3.5 4a.5.5 0 00-.5.5V5h13V4.5a.5.5 0 00-.5-.5h-1.03a.5.5 0 00-.47.349l-.344.856a1.5 1.5 0 01-1.42 1.045H7.234a1.5 1.5 0 01-1.42-1.045l-.343-.856A.5.5 0 005.03 4H3.5zM2 12v3.5A1.5 1.5 0 003.5 17h13a1.5 1.5 0 001.5-1.5V12h-16zm1.5.5a.5.5 0 01.5-.5h12a.5.5 0 01.5.5v3a.5.5 0 01-.5.5h-12a.5.5 0 01-.5-.5v-3z"/></svg>;
const SecurityIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5.002L2 15.854A2 2 0 004 17.854h12a2 2 0 002-2V5.002A11.954 11.954 0 0110 1.944zM10 11a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /><path d="M10 12a5 5 0 00-5 5v1h10v-1a5 5 0 00-5-5z" clipRule="evenodd" /></svg>);
const NcheIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5 8.281V13.5a1 1 0 001 1h8a1 1 0 001-1V8.281l2.394-1.36a1 1 0 000-1.84l-7-3zM6 9.319l4 2.286 4-2.286V13.5H6V9.319z" /><path d="M6 13.5V15l4 2.286L14 15v-1.5H6z" /></svg>;
const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>;
const DeleteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>;
// FIX: Added missing ResultsIcon definition.
const ResultsIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a1 1 0 011-1h14a1 1 0 110 2H3a1 1 0 01-1-1z" /></svg>);

// FIX: Added missing getModuleIcon helper function.
const getModuleIcon = (moduleName: string) => {
    switch (moduleName) {
        case HOME_PAGE_MODULE_NAME:
            return <HomePageIcon />;
        case SMART_ADMISSION_MODULE_NAME:
            return <SmartAdmissionIcon />;
        case E_WALLET_MODULE_NAME:
            return <EWalletIcon />;
        case SMART_STUDENT_ID_MODULE_NAME:
            return <IdCardIcon />;
        case E_CANTEEN_MODULE_NAME:
            return <CanteenIcon />;
        case NCHE_MODULE_NAME:
            return <NcheIcon />;
        case STUDENT_TRANSFER_MODULE_NAME:
            return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M8 5a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L13.586 5H8z" /><path d="M12 15a1 1 0 100-2H6.414l1.293-1.293a1 1 0 10-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L6.414 15H12z" /></svg>;
        default:
            return <ModulesIcon />;
    }
};

const moduleNameToViewMap: Record<string, string> = {
    [HOME_PAGE_MODULE_NAME]: 'homepage',
    [SMART_ADMISSION_MODULE_NAME]: 'smart_admission',
    [E_WALLET_MODULE_NAME]: 'e_wallet',
    [SMART_STUDENT_ID_MODULE_NAME]: 'smart_id',
    [E_CANTEEN_MODULE_NAME]: 'e_canteen',
    [NCHE_MODULE_NAME]: 'nche',
    [STUDENT_TRANSFER_MODULE_NAME]: 'transfer_market',
    [MESSAGE_MODULE_NAME]: 'messages',
    [ONLINE_MODULE_NAME]: 'online_feed',
    [EXPLORATION_MODULE_NAME]: 'exploration',
    [E_VOTE_MODULE_NAME]: 'e_vote',
    [VISITOR_REG_MODULE_NAME]: 'visitor_reg',
};


const SecurityManagement: React.FC = () => {
    const [settings, setSettings] = useState<IpWhitelistSettings>(() => systemSettingsService.getIpWhitelistSettings());
    
    const handleSave = () => {
        systemSettingsService.saveIpWhitelistSettings(settings);
        alert('Settings saved!');
    };
    
    return (
        <div className="bg-gray-800 p-6 rounded-lg max-w-2xl">
            <h3 className="text-xl font-bold mb-4">Security Settings</h3>
            <div className="space-y-4">
                <div>
                    <label className="flex items-center space-x-3 cursor-pointer">
                        <input type="checkbox" checked={settings.enabled} onChange={e => setSettings(s => ({...s, enabled: e.target.checked}))} className="form-checkbox h-5 w-5 text-cyan-600"/>
                        <span>Enable IP Whitelisting</span>
                    </label>
                    <p className="text-sm text-gray-400 mt-1 pl-8">Restrict login access to specified IP addresses.</p>
                </div>
                 {settings.enabled && (
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Allowed IP Addresses (one per line)</label>
                        <textarea
                            value={settings.allowedIps.join('\n')}
                            onChange={e => setSettings(s => ({...s, allowedIps: e.target.value.split('\n').map(ip => ip.trim()).filter(Boolean)}))}
                            rows={5}
                            className="w-full p-2 bg-gray-700 rounded-md"
                        />
                    </div>
                )}
                <button onClick={handleSave} className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-md font-semibold">Save Settings</button>
            </div>
        </div>
    );
};


// FIX: Added missing ModulesManagement component definition to resolve compile error.
interface ModulesManagementProps {
    school: School;
    allModules: Module[];
    onActivate: (schoolId: string, moduleId: string) => void;
    onDeactivate: (schoolId: string, moduleId: string) => void;
    onPublish: (schoolId: string, moduleId: string) => void;
    onUnpublish: (schoolId: string, moduleId: string) => void;
    onHomePagePublish: (schoolId: string) => void;
    onHomePageUnpublish: (schoolId: string) => void;
}
const ModulesManagement: React.FC<ModulesManagementProps> = ({
    school,
    allModules,
    onActivate,
    onDeactivate,
    onPublish,
    onUnpublish,
    onHomePagePublish,
    onHomePageUnpublish,
}) => {
    const homePageModule = allModules.find(m => m.name === HOME_PAGE_MODULE_NAME);

    return (
        <div className="space-y-6">
            <h3 className="text-2xl sm:text-3xl font-bold text-white">Manage Modules for {school.name}</h3>
            
            {homePageModule && (
                <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
                    <div className="flex justify-between items-center">
                        <div>
                            <h4 className="text-xl font-bold">{homePageModule.name}</h4>
                            <p className="text-sm text-gray-400">{homePageModule.description}</p>
                        </div>
                        <div>
                            {school.isHomePagePublished ? (
                                <button onClick={() => onHomePageUnpublish(school.id)} className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-md font-semibold">Unpublish</button>
                            ) : (
                                <button onClick={() => onHomePagePublish(school.id)} className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md font-semibold">Publish</button>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {allModules.filter(m => m.isAssignable).map(module => {
                    const assignment = school.modules.find(assignmentRecord => assignmentRecord.moduleId === module.id);
                    const status = assignment?.status || 'unassigned';

                    return (
                        <div key={module.id} className="bg-gray-800 p-6 rounded-lg shadow-xl">
                            <h4 className="text-xl font-bold">{module.name}</h4>
                            <p className="text-sm text-gray-400 mt-1 mb-4 h-16">{module.description}</p>
                            
                            <div className="flex justify-between items-center border-t border-gray-700 pt-4">
                                <span className={`capitalize px-3 py-1 text-sm font-semibold rounded-full ${
                                    status === 'published' ? 'bg-cyan-500/20 text-cyan-300' :
                                    status === 'active' ? 'bg-green-500/20 text-green-300' :
                                    status === 'unassigned' ? 'bg-gray-500/20 text-gray-400' :
                                    'bg-yellow-500/20 text-yellow-300'
                                }`}>
                                    {status}
                                </span>
                                
                                <div className="flex space-x-2">
                                    {status === 'unassigned' || status === 'assigned' ? (
                                        <button onClick={() => onActivate(school.id, module.id)} className="px-3 py-1 bg-green-600 rounded text-sm">Activate</button>
                                    ) : (
                                        <button onClick={() => onDeactivate(school.id, module.id)} className="px-3 py-1 bg-gray-600 rounded text-sm">Deactivate</button>
                                    )}
                                    {status === 'active' && (
                                        <button onClick={() => onPublish(school.id, module.id)} className="px-3 py-1 bg-cyan-600 rounded text-sm">Publish</button>
                                    )}
                                     {status === 'published' && (
                                        <button onClick={() => onUnpublish(school.id, module.id)} className="px-3 py-1 bg-yellow-600 rounded text-sm">Unpublish</button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// FIX: Added missing component definitions for Headteacher views.
interface HeadteacherDashboardViewProps {
    school: School;
    students: SchoolUser[];
    activeModules: Module[];
}
const HeadteacherDashboardView: React.FC<HeadteacherDashboardViewProps> = ({ school, students, activeModules }) => (
    <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Welcome, Headteacher of {school.name}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard title="Total Students" value={students.length} icon={<UsersIcon />} colorClassName="bg-cyan-500" />
            <StatCard title="Active Modules" value={activeModules.length} icon={<ActiveModulesIcon />} colorClassName="bg-indigo-500" />
        </div>
    </div>
);

interface UsersManagementProps {
    school: School;
    students: SchoolUser[];
    classes: SchoolClass[];
    refreshData: () => void;
}
const UsersManagement: React.FC<UsersManagementProps> = ({ school, students, classes, refreshData }) => {
    const [activeTab, setActiveTab] = useState<'users' | 'classes'>('users');
    const [modal, setModal] = useState<'addUser' | 'bulkAdd' | 'editUser' | 'resetPass' | 'deleteUser' | 'manageClasses' | null>(null);
    const [selectedUser, setSelectedUser] = useState<SchoolUser | null>(null);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: React.ReactNode } | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const initialFormState = { studentId: '', name: '', role: 'student' as SchoolUserRole, class: '', stream: '', password: '', email: '' };
    const [userForm, setUserForm] = useState(initialFormState);

    // State for Class Management Modal
    const [streamInputs, setStreamInputs] = useState<Record<string, string>>({});
    const [successMessage, setSuccessMessage] = useState('');
    
    // State for Bulk Actions
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [bulkActionModal, setBulkActionModal] = useState<'class' | 'status' | 'message' | null>(null);
    const [bulkClassForm, setBulkClassForm] = useState({ class: '', stream: '' });
    const [bulkStatusForm, setBulkStatusForm] = useState<{ status: SchoolUser['accountStatus'] }>({ status: 'active' });
    const [bulkMessageForm, setBulkMessageForm] = useState({ title: '', message: '' });
    
    const showFeedback = (message: React.ReactNode, type: 'success' | 'error') => {
        setFeedback({ message, type });
        setTimeout(() => setFeedback(null), 5000);
    };
    
    const resetSuccessMessage = () => setTimeout(() => setSuccessMessage(''), 4000);

    const handleOpenModal = (type: typeof modal, user?: SchoolUser) => {
        setFeedback(null);
        if (user) setSelectedUser(user);
        if (type === 'editUser' && user) setUserForm(user);
        else setUserForm(initialFormState);
        setModal(type);
    };

    const handleSaveUser = () => {
        try {
            if (modal === 'editUser' && selectedUser) {
                studentService.updateSchoolUser(selectedUser.studentId, userForm);
                showFeedback('User updated successfully!', 'success');
            } else {
                studentService.createSchoolUser({ ...userForm, schoolId: school.id, mustChangePassword: true });
                showFeedback('User created successfully!', 'success');
            }
            refreshData();
            setModal(null);
        } catch (e) {
            showFeedback((e as Error).message, 'error');
        }
    };

    const handleResetPassword = () => {
        if (selectedUser) {
            const tempPass = studentService.resetSchoolUserPassword(selectedUser.studentId);
            setNewPassword(tempPass);
            showFeedback(`Password has been reset.`, 'success');
        }
    };
    
    // Renamed function to avoid conflict
    const confirmDeleteUser = () => {
        if (selectedUser) {
            studentService.deleteSchoolUser(selectedUser.studentId);
            showFeedback('User deleted.', 'success');
            refreshData();
            setModal(null);
        }
    };

    const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            try {
                const targetClass = classes[0]?.name || 'Unassigned';
                const result = studentService.createBulkSchoolUsers(text as any, school.id, targetClass);
                 if (result.errorCount > 0) {
                    showFeedback(<>Uploaded with {result.errorCount} errors. <ul className="list-disc list-inside text-xs">{result.errors.slice(0, 5).map((err, i) => <li key={i}>{err}</li>)}</ul></>, 'error');
                } else {
                    showFeedback(`${result.successCount} users uploaded successfully!`, 'success');
                }
                refreshData();
            } catch (err) {
                showFeedback((err as Error).message, 'error');
            } finally {
                setModal(null);
            }
        };
        reader.readAsText(file);
    };
    
    const handleStreamInputChange = (classId: string, value: string) => {
        setStreamInputs(prev => ({ ...prev, [classId]: value }));
    };

    const handleAddStream = (classToUpdate: SchoolClass) => {
        const newStreamName = streamInputs[classToUpdate.id]?.trim().toUpperCase();
        if (newStreamName && !classToUpdate.streams.some(s => s.toLowerCase() === newStreamName.toLowerCase())) {
            classService.updateClass(classToUpdate.id, school.id, classToUpdate.name, [...classToUpdate.streams, newStreamName]);
            handleStreamInputChange(classToUpdate.id, '');
            refreshData();
            setSuccessMessage(`Stream '${newStreamName}' added to ${classToUpdate.name}.`);
            resetSuccessMessage();
        }
    };

    const handleRemoveStream = (classToUpdate: SchoolClass, streamToRemove: string) => {
        if (window.confirm(`Are you sure you want to remove stream "${streamToRemove}" from ${classToUpdate.name}?`)) {
            const newStreams = classToUpdate.streams.filter(s => s !== streamToRemove);
            classService.updateClass(classToUpdate.id, school.id, classToUpdate.name, newStreams);
            refreshData();
            setSuccessMessage(`Stream '${streamToRemove}' removed from ${classToUpdate.name}.`);
            resetSuccessMessage();
        }
    };

    const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.checked) {
            setSelectedStudentIds(students.map(s => s.studentId));
        } else {
            setSelectedStudentIds([]);
        }
    };

    const handleSelectOne = (studentId: string, isChecked: boolean) => {
        setSelectedStudentIds(prev => {
            if (isChecked) {
                return [...prev, studentId];
            } else {
                return prev.filter(id => id !== studentId);
            }
        });
    };

    const handleBulkClassChange = () => {
        try {
            studentService.bulkUpdateStudentsClass(selectedStudentIds, bulkClassForm.class, bulkClassForm.stream);
            showFeedback(`${selectedStudentIds.length} students moved to ${bulkClassForm.class} ${bulkClassForm.stream ? `/ ${bulkClassForm.stream}` : ''}.`, 'success');
            refreshData();
            setBulkActionModal(null);
            setSelectedStudentIds([]);
        } catch(e) {
            showFeedback((e as Error).message, 'error');
        }
    };

    const handleBulkStatusChange = () => {
        try {
            studentService.bulkUpdateStudentsStatus(selectedStudentIds, bulkStatusForm.status);
            showFeedback(`${selectedStudentIds.length} students' status updated to "${bulkStatusForm.status}".`, 'success');
            refreshData();
            setBulkActionModal(null);
            setSelectedStudentIds([]);
        } catch(e) {
            showFeedback((e as Error).message, 'error');
        }
    };
    
    const handleBulkMessageSend = () => {
        try {
            createBroadcastNotification(bulkMessageForm.title, bulkMessageForm.message, selectedStudentIds);
            showFeedback(`Message sent to ${selectedStudentIds.length} students.`, 'success');
            setBulkActionModal(null);
            setSelectedStudentIds([]);
            setBulkMessageForm({ title: '', message: '' });
        } catch (e) {
            showFeedback((e as Error).message, 'error');
        }
    };
    
    const renderUserModal = () => (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-lg space-y-4">
                <h3 className="text-xl font-bold">{modal === 'editUser' ? 'Edit User' : 'Add New User'}</h3>
                {feedback && <div className={`p-2 rounded-md text-sm ${feedback.type === 'success' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>{feedback.message}</div>}
                <div className="grid grid-cols-2 gap-4">
                    <input name="name" value={userForm.name} onChange={(e) => setUserForm({...userForm, name: e.target.value})} placeholder="Full Name" className="p-2 bg-gray-700 rounded"/>
                    <input name="studentId" value={userForm.studentId} onChange={(e) => setUserForm({...userForm, studentId: e.target.value})} placeholder="User ID" disabled={modal==='editUser'} className="p-2 bg-gray-700 rounded disabled:bg-gray-600"/>
                    <select name="role" value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value as SchoolUserRole})} className="p-2 bg-gray-700 rounded">
                        <option value="student">Student</option>
                        <option value="teacher">Teacher</option>
                        <option value="deputy_headteacher">Deputy Headteacher</option>
                        <option value="head_of_department">Head of Department</option>
                        <option value="canteen_seller">Canteen Seller</option>
                    </select>
                    <input name="email" value={userForm.email} onChange={(e) => setUserForm({...userForm, email: e.target.value})} placeholder="Email (for staff)" className="p-2 bg-gray-700 rounded"/>
                    <select name="class" value={userForm.class} onChange={e => setUserForm({...userForm, class: e.target.value, stream: ''})} className="p-2 bg-gray-700 rounded">
                        <option value="">-- Select Class --</option>
                        {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                    <select name="stream" value={userForm.stream} onChange={e => setUserForm({...userForm, stream: e.target.value})} disabled={!userForm.class || !classes.find(c=>c.name===userForm.class)?.streams.length} className="p-2 bg-gray-700 rounded disabled:bg-gray-600">
                        <option value="">-- Select Stream --</option>
                        {classes.find(c=>c.name===userForm.class)?.streams.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {modal === 'addUser' && <input name="password" type="password" value={userForm.password} onChange={(e) => setUserForm({...userForm, password: e.target.value})} placeholder="Set Temporary Password" className="p-2 bg-gray-700 rounded col-span-2"/>}
                </div>
                 <div className="flex justify-end gap-2"><button onClick={() => setModal(null)} className="px-4 py-2 bg-gray-600 rounded">Cancel</button><button onClick={handleSaveUser} className="px-4 py-2 bg-cyan-600 rounded">Save</button></div>
            </div>
        </div>
    );
    
    const renderBulkActionModals = () => {
        if (!bulkActionModal) return null;

        if (bulkActionModal === 'class') {
            const selectedClassForBulk = classes.find(c => c.name === bulkClassForm.class);
            return (
                <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4">
                    <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md space-y-4">
                        <h3 className="text-xl font-bold">Change Class for {selectedStudentIds.length} Students</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <select value={bulkClassForm.class} onChange={e => setBulkClassForm({ class: e.target.value, stream: ''})} className="p-2 bg-gray-700 rounded">
                                <option value="">-- Select Class --</option>
                                {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </select>
                            <select value={bulkClassForm.stream} onChange={e => setBulkClassForm(prev => ({ ...prev, stream: e.target.value }))} disabled={!selectedClassForBulk || selectedClassForBulk.streams.length === 0} className="p-2 bg-gray-700 rounded disabled:bg-gray-600">
                                <option value="">-- Select Stream --</option>
                                {selectedClassForBulk?.streams.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="flex justify-end gap-2"><button onClick={() => setBulkActionModal(null)} className="px-4 py-2 bg-gray-600 rounded">Cancel</button><button onClick={handleBulkClassChange} disabled={!bulkClassForm.class} className="px-4 py-2 bg-cyan-600 rounded disabled:bg-gray-500">Confirm Change</button></div>
                    </div>
                </div>
            );
        }

         if (bulkActionModal === 'status') {
            return (
                <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4">
                    <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md space-y-4">
                        <h3 className="text-xl font-bold">Update Status for {selectedStudentIds.length} Students</h3>
                        <select value={bulkStatusForm.status} onChange={e => setBulkStatusForm({ status: e.target.value as any })} className="w-full p-2 bg-gray-700 rounded">
                            <option value="active">Active</option>
                            <option value="disabled">Disabled (Suspended)</option>
                        </select>
                        <div className="flex justify-end gap-2"><button onClick={() => setBulkActionModal(null)} className="px-4 py-2 bg-gray-600 rounded">Cancel</button><button onClick={handleBulkStatusChange} className="px-4 py-2 bg-cyan-600 rounded">Update Status</button></div>
                    </div>
                </div>
            );
        }

        if (bulkActionModal === 'message') {
            return (
                <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4">
                    <div className="bg-gray-800 rounded-lg p-6 w-full max-w-lg space-y-4">
                        <h3 className="text-xl font-bold">Send Message to {selectedStudentIds.length} Students</h3>
                        <input value={bulkMessageForm.title} onChange={e => setBulkMessageForm(prev => ({ ...prev, title: e.target.value }))} placeholder="Message Title" className="w-full p-2 bg-gray-700 rounded" />
                        <textarea value={bulkMessageForm.message} onChange={e => setBulkMessageForm(prev => ({ ...prev, message: e.target.value }))} placeholder="Your message..." rows={5} className="w-full p-2 bg-gray-700 rounded" />
                        <div className="flex justify-end gap-2"><button onClick={() => setBulkActionModal(null)} className="px-4 py-2 bg-gray-600 rounded">Cancel</button><button onClick={handleBulkMessageSend} disabled={!bulkMessageForm.title.trim() || !bulkMessageForm.message.trim()} className="px-4 py-2 bg-cyan-600 rounded disabled:bg-gray-500">Send Message</button></div>
                    </div>
                </div>
            );
        }
        
        return null;
    };
    
    return (
        <div className="text-white">
            {modal && ['addUser', 'editUser'].includes(modal) && renderUserModal()}
            {modal === 'deleteUser' && <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4"><div className="bg-gray-800 p-6 rounded-lg text-center"><p className="mb-4">Delete {selectedUser?.name}?</p><div className="flex justify-center gap-2"><button onClick={() => setModal(null)} className="px-4 py-2 bg-gray-600 rounded">Cancel</button><button onClick={confirmDeleteUser} className="px-4 py-2 bg-red-600 rounded">Delete</button></div></div></div>}
            {modal === 'resetPass' && <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4"><div className="bg-gray-800 p-6 rounded-lg text-center"><p className="mb-4">Reset password for {selectedUser?.name}?</p>{newPassword ? <p>New Password: <strong>{newPassword}</strong></p> : null}<div className="flex justify-center gap-2 mt-4"><button onClick={() => { setModal(null); setNewPassword(''); }} className="px-4 py-2 bg-gray-600 rounded">Close</button><button onClick={handleResetPassword} className="px-4 py-2 bg-yellow-600 rounded">Reset</button></div></div></div>}
            {modal === 'bulkAdd' && <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4"><div className="bg-gray-800 p-6 rounded-lg"><h3 className="text-xl font-bold mb-4">Bulk Upload Users</h3><input type="file" ref={fileInputRef} onChange={handleBulkUpload} accept=".csv" className="w-full" /><a href={"data:text/csv;charset=utf-8," + encodeURIComponent("name,studentId,password,role\nJohn Doe,S004,pass123,student")} download="users_template.csv" className="text-sm text-cyan-400 hover:underline">Download Template</a><button onClick={() => setModal(null)} className="mt-4 px-4 py-2 bg-gray-600 rounded w-full">Cancel</button></div></div>}
            {renderBulkActionModals()}
            
            <div className="flex items-center gap-2 p-1 bg-gray-900 rounded-lg mb-4">
                <button onClick={() => setActiveTab('users')} className={`w-full py-2 text-sm font-semibold rounded-md ${activeTab === 'users' ? 'bg-cyan-600' : 'hover:bg-gray-700'}`}>Manage Users</button>
            </div>

            {feedback && <div className={`p-3 rounded-md mb-4 text-sm ${feedback.type === 'success' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>{feedback.message}</div>}

            {activeTab === 'users' && (
                <>
                <div className="flex gap-2 mb-4"><button onClick={() => handleOpenModal('addUser')} className="px-4 py-2 bg-cyan-600 rounded">Add User</button><button onClick={() => handleOpenModal('bulkAdd')} className="px-4 py-2 bg-gray-600 rounded">Bulk Upload</button></div>
                
                {selectedStudentIds.length > 0 && (
                    <div className="bg-gray-700 p-3 rounded-lg mb-4 flex justify-between items-center animate-fade-in-up">
                        <p className="font-semibold">{selectedStudentIds.length} student(s) selected</p>
                        <div className="space-x-2">
                            <button onClick={() => setBulkActionModal('class')} className="px-3 py-1 bg-indigo-600 text-xs rounded-md">Change Class</button>
                            <button onClick={() => setBulkActionModal('status')} className="px-3 py-1 bg-yellow-600 text-xs rounded-md">Update Status</button>
                            <button onClick={() => setBulkActionModal('message')} className="px-3 py-1 bg-cyan-600 text-xs rounded-md">Send Message</button>
                        </div>
                    </div>
                )}

                <div className="bg-gray-800 rounded-lg shadow-xl overflow-x-auto"><table className="min-w-full text-white"><thead className="bg-gray-700"><tr><th className="p-4"><input type="checkbox" onChange={handleSelectAll} checked={students.length > 0 && selectedStudentIds.length === students.length} ref={el => el && (el.indeterminate = selectedStudentIds.length > 0 && selectedStudentIds.length < students.length)} className="form-checkbox bg-gray-600 border-gray-500 rounded" /></th><th className="px-6 py-3 text-left text-xs font-medium uppercase">Name</th><th className="px-6 py-3 text-left text-xs font-medium uppercase">ID</th><th className="px-6 py-3 text-left text-xs font-medium uppercase">Role</th><th className="px-6 py-3 text-left text-xs font-medium uppercase">Class</th><th className="px-6 py-3 text-left text-xs font-medium uppercase">Status</th><th className="px-6 py-3 text-left text-xs font-medium uppercase">Actions</th></tr></thead><tbody className="divide-y divide-gray-700">{students.map(student => (<tr key={student.studentId} className="hover:bg-gray-700/50"><td className="p-4"><input type="checkbox" checked={selectedStudentIds.includes(student.studentId)} onChange={(e) => handleSelectOne(student.studentId, e.target.checked)} className="form-checkbox bg-gray-600 border-gray-500 rounded" /></td><td className="px-6 py-4">{student.name}</td><td className="px-6 py-4">{student.studentId}</td><td className="px-6 py-4 capitalize">{student.role.replace('_', ' ')}</td><td className="px-6 py-4">{student.class || 'N/A'} {student.stream && `/ ${student.stream}`}</td><td className="px-6 py-4"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${student.accountStatus === 'disabled' ? 'bg-red-500/20 text-red-300' : student.accountStatus === 'temporary' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-green-500/20 text-green-300'}`}>{student.accountStatus || 'active'}</span></td><td className="px-6 py-4 space-x-2 text-sm"><button onClick={()=>handleOpenModal('editUser', student)} className="text-cyan-400">Edit</button><button onClick={()=>handleOpenModal('resetPass', student)} className="text-yellow-400">Reset Pass</button><button onClick={()=>handleOpenModal('deleteUser', student)} className="text-red-400">Delete</button></td></tr>))}</tbody></table></div>
                </>
            )}
        </div>
    );
};
interface AdmissionManagementProps {
    school: School;
    completedAdmissions: CompletedAdmission[];
    classes: SchoolClass[];
    refreshData: () => void;
}
const AdmissionManagement: React.FC<AdmissionManagementProps> = ({ school, completedAdmissions, classes, refreshData }) => {
    // State for the settings form
    const [settings, setSettings] = useState<AdmissionSettings>(() => settingsService.getAdmissionSettings(school.id));
    const [feedback, setFeedback] = useState('');
     // State for A'Level Combination management
    const [combinationModal, setCombinationModal] = useState<{ group: 'arts' | 'sciences', combination?: SchoolALevelCombination } | null>(null);
    const [combinationForm, setCombinationForm] = useState({ id: '', name: '', subjects: '' });
    const [combinationError, setCombinationError] = useState('');
    const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'transferred'>('pending');
    
    // State for modals & bulk actions
    const [detailsModalData, setDetailsModalData] = useState<CompletedAdmission | null>(null);
    const [confirmModalData, setConfirmModalData] = useState<{ action: 'approve' | 'reject', admission?: CompletedAdmission, isBulk?: boolean } | null>(null);
    const [successModalData, setSuccessModalData] = useState<{ studentId?: string; tempPass?: string; isBulk?: boolean; count?: number; } | null>(null);
    const [transferModalData, setTransferModalData] = useState<{ admission?: CompletedAdmission, isBulk?: boolean } | null>(null);
    const [allSchools, setAllSchools] = useState<School[]>([]);
    const [transferTargetSchoolId, setTransferTargetSchoolId] = useState('');
    const [gradeFilter, setGradeFilter] = useState<'all' | 'D1' | 'D2' | 'D3' | 'D4' | 'U'>('all');
    const [selectedAdmissions, setSelectedAdmissions] = useState<string[]>([]);

    const oLevelClasses = useMemo(() => classes.filter(c => c.level === 'O-Level'), [classes]);
    const aLevelClasses = useMemo(() => classes.filter(c => c.level === 'A-Level'), [classes]);

    const handleClassToggle = (className: string) => {
        const newClasses = settings.acceptingClasses.includes(className)
            ? settings.acceptingClasses.filter(c => c !== className)
            : [...settings.acceptingClasses, className];
        handleSettingsChange('acceptingClasses', newClasses);
    };

    const [oLevelDropdownOpen, setOLevelDropdownOpen] = useState(false);
    const [aLevelDropdownOpen, setALevelDropdownOpen] = useState(false);
    const oLevelDropdownRef = useRef<HTMLDivElement>(null);
    const aLevelDropdownRef = useRef<HTMLDivElement>(null);

    const selectedOLevels = settings.acceptingClasses.filter(c => oLevelClasses.some(oc => oc.name === c)).length;
    const selectedALevels = settings.acceptingClasses.filter(c => aLevelClasses.some(ac => ac.name === c)).length;

    // New state for transferred sub-tab
    const [transferredSubTab, setTransferredSubTab] = useState<'sold' | 'received'>('sold');

    const { soldAdmissions, receivedAdmissions } = useMemo(() => {
        const sold = completedAdmissions.filter(a => a.status === 'transferred');
        const received = completedAdmissions.filter(a => 
            a.status === 'under_review' && 
            typeof a.data.schoolName === 'string' &&
            a.data.schoolName.includes('Transferred from another school')
        );
        return { soldAdmissions: sold, receivedAdmissions: received };
    }, [completedAdmissions]);


    // Re-fetch settings if the school context changes.
    useEffect(() => {
        setSettings(settingsService.getAdmissionSettings(school.id));
        setAllSchools(getAllSchools());
    }, [school.id]);

     useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (oLevelDropdownRef.current && !oLevelDropdownRef.current.contains(event.target as Node)) {
                setOLevelDropdownOpen(false);
            }
            if (aLevelDropdownRef.current && !aLevelDropdownRef.current.contains(event.target as Node)) {
                setALevelDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    // Clear selection when filter changes
    useEffect(() => {
        setSelectedAdmissions([]);
    }, [gradeFilter]);


    const showFeedback = (message: string) => {
        setFeedback(message);
        setTimeout(() => setFeedback(''), 4000);
    };

    const handleSettingsChange = (field: keyof AdmissionSettings, value: any) => {
        setSettings(prev => ({ ...prev, [field]: value }));
    };

    const handleSaveSettings = () => {
        settingsService.saveAdmissionSettings(settings);
        refreshData();
        showFeedback("Admission settings saved successfully!");
    };

    const handleBulkApprove = () => {
        if (selectedAdmissions.length === 0) return;
        setConfirmModalData({ action: 'approve', isBulk: true });
    };

    const handleBulkReject = () => {
        if (selectedAdmissions.length === 0) return;
        setConfirmModalData({ action: 'reject', isBulk: true });
    };
    
    const handleBulkTransfer = () => {
        if (selectedAdmissions.length === 0) return;
        setTransferTargetSchoolId('');
        setTransferModalData({ isBulk: true });
    };

    const handleOpenCombinationModal = (group: 'arts' | 'sciences', combination?: SchoolALevelCombination) => {
        setCombinationError('');
        if (combination) {
            setCombinationForm({ id: combination.id, name: combination.name, subjects: combination.subjects });
        } else {
            setCombinationForm({ id: '', name: '', subjects: '' });
        }
        setCombinationModal({ group, combination });
    };

    const handleSaveCombination = () => {
        setCombinationError('');
        if (!combinationForm.name.trim() || !combinationForm.subjects.trim() || !combinationModal) {
            setCombinationError("Combination name and subjects are required.");
            return;
        }

        const group = combinationModal.group;
        const updatedCombinations = { ...settings.aLevelCombinations };
        
        if (combinationModal.combination) { // Editing
            const index = updatedCombinations[group].findIndex(c => c.id === combinationModal.combination!.id);
            if (index > -1) {
                updatedCombinations[group][index] = { ...combinationModal.combination, ...combinationForm };
            }
        } else { // Adding
            const newCombination: SchoolALevelCombination = {
                id: `combo_${Date.now()}`,
                name: combinationForm.name.trim(),
                subjects: combinationForm.subjects.trim(),
            };
            updatedCombinations[group].push(newCombination);
        }

        setSettings(prev => ({ ...prev, aLevelCombinations: updatedCombinations }));
        setCombinationModal(null);
    };
    
    const handleDeleteCombination = (group: 'arts' | 'sciences', combinationId: string) => {
        if (window.confirm("Are you sure you want to delete this combination?")) {
            const updatedCombinations = { ...settings.aLevelCombinations };
            updatedCombinations[group] = updatedCombinations[group].filter(c => c.id !== combinationId);
            setSettings(prev => ({ ...prev, aLevelCombinations: updatedCombinations }));
        }
    };
    
    const handleConfirmAction = () => {
        if (!confirmModalData) return;
        const { action, admission, isBulk } = confirmModalData;

        try {
            if (isBulk) {
                let approvedCount = 0;
                selectedAdmissions.forEach(admissionId => {
                    const admissionToProcess = completedAdmissions.find(a => a.id === admissionId);
                    if (admissionToProcess) {
                        if (action === 'approve') {
                            studentService.createSchoolUserFromAdmission(admissionToProcess, school.id);
                            approvedCount++;
                        }
                        settingsService.updateAdmissionStatus(admissionId, school.id, action as 'approved' | 'rejected');
                    }
                });
                if (action === 'approve') {
                    setSuccessModalData({ isBulk: true, count: approvedCount });
                }
            } else if (admission) { // Single action
                if (action === 'approve') {
                    const { studentId, tempPass } = studentService.createSchoolUserFromAdmission(admission, school.id);
                    setSuccessModalData({ studentId, tempPass });
                }
                settingsService.updateAdmissionStatus(admission.id, school.id, action as 'approved' | 'rejected');
            }
            
            refreshData();
            setSelectedAdmissions([]); // Clear selection after action
            setConfirmModalData(null);
        } catch (error) {
            alert((error as Error).message);
        }
    };
    
    const handleConfirmTransfer = () => {
        if (!transferModalData || !transferTargetSchoolId) return;
        const { admission, isBulk } = transferModalData;

        try {
            if (isBulk) {
                selectedAdmissions.forEach(admissionId => {
                    settingsService.initiateAdmissionTransfer(admissionId, school.id, transferTargetSchoolId);
                });
                showFeedback(`Transfer offer has been sent for ${selectedAdmissions.length} students.`);
            } else if (admission) {
                settingsService.initiateAdmissionTransfer(admission.id, school.id, transferTargetSchoolId);
                showFeedback("Transfer offer has been sent to the student.");
            }
            
            refreshData();
            setSelectedAdmissions([]);
            setTransferModalData(null);
        } catch (error) {
            alert((error as Error).message);
        }
    };
    
    const getAdmissionGrade = (admission: CompletedAdmission): 'D1' | 'D2' | 'D3' | 'D4' | 'U' | null => {
        const result = admission.data.result?.toUpperCase().trim();
        if (!result) return null;

        if (result.includes('FIRST') || result === '1') return 'D1';
        if (result.includes('SECOND') || result === '2') return 'D2';
        if (result.includes('THIRD') || result === '3') return 'D3';
        if (result.includes('FOURTH') || result === '4') return 'D4';
        if (result.includes('FAIL') || result === 'U') return 'U';

        return null;
    };
    
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>, filteredAdmissions: CompletedAdmission[]) => {
        if (e.target.checked) {
            setSelectedAdmissions(filteredAdmissions.map(a => a.id));
        } else {
            setSelectedAdmissions([]);
        }
    };

    const handleSelectOne = (e: React.ChangeEvent<HTMLInputElement>, admissionId: string) => {
        if (e.target.checked) {
            setSelectedAdmissions(prev => [...prev, admissionId]);
        } else {
            setSelectedAdmissions(prev => prev.filter(id => id !== admissionId));
        }
    };

    const renderCombinationModal = () => {
        if (!combinationModal) return null;
        return (
             <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4">
                <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md space-y-4">
                    <h3 className="text-xl font-bold">{combinationModal.combination ? 'Edit' : 'Add'} {combinationModal.group === 'arts' ? 'Arts' : 'Sciences'} Combination</h3>
                    {combinationError && <p className="text-red-400 text-sm">{combinationError}</p>}
                    <input value={combinationForm.name} onChange={e => setCombinationForm({...combinationForm, name: e.target.value})} placeholder="Combination Name (e.g., PCM)" className="w-full p-2 bg-gray-700 rounded" />
                    <input value={combinationForm.subjects} onChange={e => setCombinationForm({...combinationForm, subjects: e.target.value})} placeholder="Subjects (e.g., Physics, Chemistry, Maths)" className="w-full p-2 bg-gray-700 rounded" />
                    <div className="flex justify-end gap-2"><button onClick={() => setCombinationModal(null)} className="px-4 py-2 bg-gray-600 rounded">Cancel</button><button onClick={handleSaveCombination} className="px-4 py-2 bg-cyan-600 rounded">Save</button></div>
                </div>
            </div>
        );
    };

    return (
        <div>
            {renderCombinationModal()}
            {detailsModalData && (
                <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4">
                    <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] flex flex-col">
                        <h3 className="text-xl font-bold mb-4">Application Details</h3>
                        <div className="overflow-y-auto space-y-4 pr-2">
                            {(() => {
                                const slip = detailsModalData.data;
                                const isExtractedData = 'studentName' in slip;
                                const yearAndLevel = isExtractedData ? slip.yearAndLevel : `${slip.year} ${slip.level}`;
                                const studentName = isExtractedData ? slip.studentName : slip.name;
                                const indexNumber = isExtractedData ? slip.indexNumber : slip.indexNo;
                                const dateOfBirth = slip.dateOfBirth || 'N/A';
                                const schoolName = slip.schoolName || 'N/A';
                                const schoolAddress = slip.schoolAddress || 'N/A';
                                const entryCode = slip.entryCode || 'N/A';
                                const aggregate = slip.aggregate || 'N/A';
                                const result = slip.result || 'N/A';
                                const subjects = slip.subjects || [];

                                return (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                                            <div><strong className="text-gray-400 block">Year & Level:</strong> <span className="text-white">{yearAndLevel}</span></div>
                                            <div><strong className="text-gray-400 block">Student Name:</strong> <span className="text-white">{studentName}</span></div>
                                            <div><strong className="text-gray-400 block">Index Number:</strong> <span className="text-white">{indexNumber}</span></div>
                                            <div><strong className="text-gray-400 block">Date of Birth:</strong> <span className="text-white">{dateOfBirth}</span></div>
                                            <div><strong className="text-gray-400 block">School Name:</strong> <span className="text-white">{schoolName}</span></div>
                                            <div><strong className="text-gray-400 block">School Address:</strong> <span className="text-white">{schoolAddress}</span></div>
                                            <div><strong className="text-gray-400 block">Entry Code:</strong> <span className="text-white">{entryCode}</span></div>
                                        </div>
                                        <div className="border-t border-gray-600 pt-4">
                                            <h4 className="font-semibold mb-2">Subjects & Grades</h4>
                                            <table className="min-w-full text-sm"><tbody>
                                                {subjects.map((s, i) => (<tr key={i} className="border-b border-gray-800"><td className="py-1.5 pr-4 text-gray-300">{s.name}</td><td className="font-semibold text-white">{s.grade}</td></tr>))}
                                            </tbody></table>
                                        </div>
                                        {(aggregate !== 'N/A' || result !== 'N/A') && (
                                            <div className="border-t border-gray-600 pt-4 flex justify-around bg-gray-900 p-4 rounded-lg">
                                                {aggregate !== 'N/A' && (<div className="text-center"><strong className="text-gray-400 block text-sm">Aggregate</strong><span className="text-white text-xl font-bold">{aggregate}</span></div>)}
                                                {result !== 'N/A' && (<div className="text-center"><strong className="text-gray-400 block text-sm">Result</strong><span className="text-white text-xl font-bold">{result}</span></div>)}
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                        <div className="flex justify-end pt-4 mt-4 border-t border-gray-700">
                            <button onClick={() => setDetailsModalData(null)} className="px-4 py-2 bg-gray-600 rounded">Close</button>
                        </div>
                    </div>
                </div>
            )}
            {confirmModalData && (
                <ConfirmationModal
                    isOpen={true}
                    title={`Confirm ${confirmModalData.action === 'approve' ? 'Approval' : 'Rejection'}`}
                    message={
                        confirmModalData.isBulk ? 
                        <p>Are you sure you want to <strong>{confirmModalData.action}</strong> these <strong>{selectedAdmissions.length}</strong> selected applications?</p> :
                        <p>Are you sure you want to <strong>{confirmModalData.action}</strong> this application for {'studentName' in confirmModalData.admission!.data ? confirmModalData.admission!.data.studentName : confirmModalData.admission!.data.name}?</p>
                    }
                    onConfirm={handleConfirmAction}
                    onCancel={() => setConfirmModalData(null)}
                    confirmText={confirmModalData.action === 'approve' ? 'Approve' : 'Reject'}
                    confirmButtonVariant={confirmModalData.action === 'approve' ? 'primary' : 'danger'}
                />
            )}
            {transferModalData && (
                <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4">
                    <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md space-y-4">
                        <h3 className="text-xl font-bold">Transfer Admission{transferModalData.isBulk ? `s (${selectedAdmissions.length})` : ''}</h3>
                        <p className="text-sm text-gray-300">Select a school to transfer the application(s) to. The student(s) will be asked to approve or reject the transfer offer.</p>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Target School</label>
                            <select 
                                value={transferTargetSchoolId} 
                                onChange={e => setTransferTargetSchoolId(e.target.value)}
                                className="w-full p-2 bg-gray-700 rounded mt-1"
                            >
                                <option value="">-- Select School --</option>
                                {allSchools.filter(s => s.id !== school.id).map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <button onClick={() => setTransferModalData(null)} className="px-4 py-2 bg-gray-600 rounded">Cancel</button>
                            <button onClick={handleConfirmTransfer} disabled={!transferTargetSchoolId} className="px-4 py-2 bg-cyan-600 rounded disabled:bg-gray-500">Confirm Transfer</button>
                        </div>
                    </div>
                </div>
            )}
            {successModalData && (
                <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4">
                    <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md space-y-4 text-center">
                        <h3 className="text-xl font-bold text-green-400">Success!</h3>
                        {successModalData.isBulk ? (
                            <p className="text-gray-300">Successfully approved and created accounts for {successModalData.count} students.</p>
                        ) : (
                            <>
                                <p className="text-gray-300">The student account has been created successfully. Please share these credentials with the student.</p>
                                <div className="bg-gray-700 p-4 rounded-lg text-left space-y-2">
                                    <div>
                                        <label className="text-sm text-gray-400">New Student ID:</label>
                                        <p className="font-mono bg-gray-900 p-2 rounded">{successModalData.studentId}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-400">Temporary Password:</label>
                                        <p className="font-mono bg-gray-900 p-2 rounded">{successModalData.tempPass}</p>
                                    </div>
                                </div>
                            </>
                        )}
                        <button onClick={() => setSuccessModalData(null)} className="px-6 py-2 bg-cyan-600 rounded mt-2">Close</button>
                    </div>
                </div>
            )}
            <h3 className="text-2xl sm:text-3xl font-bold text-white mb-6">Smart Admission Management</h3>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Side: Review Admissions */}
                <div className="lg:col-span-2 bg-gray-800 p-6 rounded-lg shadow-xl">
                    <div className="flex border-b border-gray-700 mb-4 overflow-x-auto">
                        <button onClick={() => setActiveTab('pending')} className={`flex-shrink-0 px-4 py-2 font-semibold ${activeTab==='pending' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400'}`}>Pending ({completedAdmissions.filter(a=>a.status === 'under_review' && !(typeof a.data.schoolName === 'string' && a.data.schoolName.includes('Transferred from another school'))).length})</button>
                        <button onClick={() => setActiveTab('approved')} className={`flex-shrink-0 px-4 py-2 font-semibold ${activeTab==='approved' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400'}`}>Approved</button>
                        <button onClick={() => setActiveTab('rejected')} className={`flex-shrink-0 px-4 py-2 font-semibold ${activeTab==='rejected' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400'}`}>Rejected</button>
                        <button onClick={() => setActiveTab('transferred')} className={`flex-shrink-0 px-4 py-2 font-semibold ${activeTab==='transferred' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400'}`}>Transfers</button>
                    </div>
                     <div className="space-y-3">
                        {activeTab === 'pending' && (() => {
                            const pendingAdmissions = completedAdmissions.filter(a => a.status === 'under_review' && !(typeof a.data.schoolName === 'string' && a.data.schoolName.includes('Transferred from another school')));
                            const filteredByGrade = pendingAdmissions.filter(admission => {
                                if (gradeFilter === 'all') return true;
                                const admissionGrade = getAdmissionGrade(admission);
                                return admissionGrade === gradeFilter;
                            });

                            return (
                                <div>
                                    <div className="flex justify-end items-center mb-4">
                                        <div className="flex items-center gap-2">
                                            <label htmlFor="grade-filter" className="text-sm text-gray-400">Choose Grade:</label>
                                            <select
                                                id="grade-filter"
                                                value={gradeFilter}
                                                onChange={e => setGradeFilter(e.target.value as any)}
                                                className="p-2 bg-gray-700 rounded-md text-sm"
                                            >
                                                <option value="all">All Grades</option>
                                                <option value="D1">D1</option>
                                                <option value="D2">D2</option>
                                                <option value="D3">D3</option>
                                                <option value="D4">D4</option>
                                                <option value="U">U (Ungraded)</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3 mb-4 p-2 bg-gray-900/50 rounded-md">
                                        <span className="text-sm text-gray-400 font-semibold">{selectedAdmissions.length} selected</span>
                                        <button onClick={handleBulkApprove} disabled={selectedAdmissions.length === 0} className="px-3 py-1 bg-green-600 text-xs rounded-md disabled:bg-gray-500 disabled:cursor-not-allowed">Approve Selected</button>
                                        <button onClick={handleBulkReject} disabled={selectedAdmissions.length === 0} className="px-3 py-1 bg-red-600 text-xs rounded-md disabled:bg-gray-500 disabled:cursor-not-allowed">Reject Selected</button>
                                        <button onClick={handleBulkTransfer} disabled={selectedAdmissions.length === 0} className="px-3 py-1 bg-yellow-600 text-xs rounded-md disabled:bg-gray-500 disabled:cursor-not-allowed">Transfer Selected</button>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-700">
                                            <thead className="bg-gray-700/50">
                                                <tr>
                                                    <th className="px-4 py-2"><input type="checkbox" onChange={(e) => handleSelectAll(e, filteredByGrade)} checked={filteredByGrade.length > 0 && selectedAdmissions.length === filteredByGrade.length} ref={el => el && (el.indeterminate = selectedAdmissions.length > 0 && selectedAdmissions.length < filteredByGrade.length)} className="rounded" /></th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase">Applicant</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase">Details</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-gray-800 divide-y divide-gray-700">
                                                {filteredByGrade.length > 0 ? filteredByGrade.map(admission => (
                                                    <tr key={admission.id}>
                                                        <td className="px-4 py-3"><input type="checkbox" checked={selectedAdmissions.includes(admission.id)} onChange={(e) => handleSelectOne(e, admission.id)} className="rounded" /></td>
                                                        <td className="px-4 py-3 whitespace-nowrap"><div className="font-semibold text-white">{'studentName' in admission.data ? admission.data.studentName : admission.data.name}</div><div className="text-sm text-gray-400">{'indexNumber' in admission.data ? admission.data.indexNumber : admission.data.indexNo}</div></td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">Applying for: <span className="font-bold">{admission.targetClass}</span>{admission.aLevelCombinationChoice && <div className="text-xs">A'Level: <span className="font-bold capitalize">{admission.aLevelCombinationGroup} - {admission.aLevelCombinationChoice}</span></div>}</td>
                                                        <td className="px-4 py-3 whitespace-nowrap"><div className="flex flex-wrap gap-2"><button onClick={() => setConfirmModalData({ action: 'approve', admission })} className="px-3 py-1 bg-green-600 text-xs rounded-md">Approve</button><button onClick={() => setConfirmModalData({ action: 'reject', admission })} className="px-3 py-1 bg-red-600 text-xs rounded-md">Reject</button><button onClick={() => { setTransferTargetSchoolId(''); setTransferModalData({ admission }); }} className="px-3 py-1 bg-yellow-600 text-xs rounded-md">Transfer</button><button onClick={() => setDetailsModalData(admission)} className="px-3 py-1 bg-gray-600 text-xs rounded-md">Details</button></div></td>
                                                    </tr>
                                                )) : (
                                                    <tr><td colSpan={4} className="text-center py-8 text-gray-400">No pending applications match this grade.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        })()}

                        {activeTab !== 'pending' && activeTab !== 'transferred' && completedAdmissions.filter(a => a.status === activeTab  && !(typeof a.data.schoolName === 'string' && a.data.schoolName.includes('Transferred from another school'))).length > 0 ? completedAdmissions.filter(a => a.status === activeTab).map(admission => (
                            <div key={admission.id} className="bg-gray-700 p-4 rounded-md">
                                <p className="font-semibold text-white">{'studentName' in admission.data ? admission.data.studentName : admission.data.name}</p>
                                <p className="text-sm text-gray-400">Index: {'indexNumber' in admission.data ? admission.data.indexNumber : admission.data.indexNo}</p>
                            </div>
                        )) : activeTab !== 'pending' && activeTab !== 'transferred' && (
                            <p className="text-gray-400 text-center py-8">No applications with status "{activeTab}".</p>
                        )}
                        
                        {activeTab === 'transferred' && (
                             <div>
                                <div className="flex gap-2 mb-4 p-1 bg-gray-900/50 rounded-lg">
                                    <button onClick={() => setTransferredSubTab('sold')} className={`w-full py-2 text-sm font-semibold rounded-md ${transferredSubTab === 'sold' ? 'bg-cyan-700' : 'hover:bg-gray-600'}`}>Sold Students ({soldAdmissions.length})</button>
                                    <button onClick={() => setTransferredSubTab('received')} className={`w-full py-2 text-sm font-semibold rounded-md ${transferredSubTab === 'received' ? 'bg-cyan-700' : 'hover:bg-gray-600'}`}>Received Students ({receivedAdmissions.length})</button>
                                </div>
                                {transferredSubTab === 'sold' && (
                                    <div className="space-y-3">
                                        {soldAdmissions.length > 0 ? soldAdmissions.map(admission => {
                                            const toSchool = allSchools.find(s => s.id === admission.transferToSchoolId);
                                            return (
                                                <div key={admission.id} className="bg-gray-700 p-4 rounded-md">
                                                    <p className="font-semibold text-white">{'studentName' in admission.data ? admission.data.studentName : admission.data.name}</p>
                                                    <p className="text-sm text-gray-400">Transferred to: <span className="font-semibold text-gray-300">{toSchool?.name || 'Unknown School'}</span></p>
                                                    <p className="text-sm text-gray-400">Student Response: <span className={`font-semibold capitalize ${admission.transferStatus === 'accepted_by_student' ? 'text-green-400' : admission.transferStatus === 'rejected_by_student' ? 'text-red-400' : 'text-yellow-400'}`}>{admission.transferStatus?.replace(/_/g, ' ') || 'N/A'}</span></p>
                                                </div>
                                            );
                                        }) : <p className="text-gray-400 text-center py-8">No students have been sold.</p>}
                                    </div>
                                )}
                                {transferredSubTab === 'received' && (
                                     <div className="space-y-3">
                                        {receivedAdmissions.length > 0 ? receivedAdmissions.map(admission => {
                                             const fromSchoolName = (typeof admission.data.schoolName === 'string' && admission.data.schoolName.includes(' - ')) ? admission.data.schoolName.split(' - ')[1] : 'Another School';
                                            return (
                                                <div key={admission.id} className="bg-gray-700 p-4 rounded-md">
                                                    <p className="font-semibold text-white">{'studentName' in admission.data ? admission.data.studentName : admission.data.name}</p>
                                                    <p className="text-sm text-gray-400">Received from: <span className="font-semibold text-gray-300">{fromSchoolName}</span></p>
                                                    <p className="text-sm text-gray-300 mt-2">Applying for: <span className="font-bold">{admission.targetClass}</span></p>
                                                    <div className="mt-3 flex gap-2">
                                                        <button onClick={() => setConfirmModalData({ action: 'approve', admission })} className="px-3 py-1 bg-green-600 text-xs rounded-md">Approve</button>
                                                        <button onClick={() => setConfirmModalData({ action: 'reject', admission })} className="px-3 py-1 bg-red-600 text-xs rounded-md">Reject</button>
                                                        <button onClick={() => setDetailsModalData(admission)} className="px-3 py-1 bg-gray-600 text-xs rounded-md">View Details</button>
                                                    </div>
                                                </div>
                                            );
                                        }) : <p className="text-gray-400 text-center py-8">No students have been received via transfer.</p>}
                                    </div>
                                )}
                            </div>
                        )}
                     </div>
                </div>

                {/* Right Side: Settings */}
                <div className="lg:col-span-1 bg-gray-800 p-6 rounded-lg shadow-xl self-start">
                    <h4 className="font-bold text-xl mb-4 text-white">Settings</h4>
                    {feedback && <div className="bg-green-500/20 text-green-300 p-2 rounded-md text-sm mb-4">{feedback}</div>}
                    <div className="space-y-4">
                         <div>
                            <label htmlFor="admissionFee" className="block text-sm font-medium text-gray-300 mb-1">Admission Fee (UGX)</label>
                            <input
                                id="admissionFee"
                                type="number"
                                value={settings.admissionFee}
                                onChange={e => handleSettingsChange('admissionFee', Number(e.target.value))}
                                className="w-full px-3 py-2 bg-gray-700 rounded-md"
                            />
                        </div>
                        <div>
                            <label htmlFor="startDate" className="block text-sm font-medium text-gray-300 mb-1">Admission Start Date</label>
                            <input
                                id="startDate"
                                type="date"
                                value={settings.startDate}
                                onChange={e => handleSettingsChange('startDate', e.target.value)}
                                className="w-full px-3 py-2 bg-gray-700 rounded-md"
                            />
                        </div>
                        <div>
                            <label htmlFor="endDate" className="block text-sm font-medium text-gray-300 mb-1">Admission End Date</label>
                            <input
                                id="endDate"
                                type="date"
                                value={settings.endDate}
                                onChange={e => handleSettingsChange('endDate', e.target.value)}
                                className="w-full px-3 py-2 bg-gray-700 rounded-md"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Configure Accepting Classes</label>
                            <div className="space-y-3">
                                {/* O-Level Dropdown */}
                                <div className="relative" ref={oLevelDropdownRef}>
                                    <button onClick={() => setOLevelDropdownOpen(prev => !prev)} className="w-full px-4 py-2 bg-gray-900/50 rounded-md text-left flex justify-between items-center">
                                        <span>O'Level ({selectedOLevels} selected)</span>
                                        <ChevronIcon isOpen={oLevelDropdownOpen} />
                                    </button>
                                    {oLevelDropdownOpen && (
                                        <div className="absolute top-full left-0 mt-1 w-full bg-gray-700 border border-gray-600 rounded-md shadow-lg z-10 p-3 space-y-2">
                                            {oLevelClasses.map(cls => (
                                                <label key={cls.id} className="flex items-center space-x-3 cursor-pointer p-1 hover:bg-gray-600 rounded">
                                                    <input
                                                        type="checkbox"
                                                        checked={settings.acceptingClasses.includes(cls.name)}
                                                        onChange={() => handleClassToggle(cls.name)}
                                                        className="h-4 w-4 rounded bg-gray-800 border-gray-500 text-cyan-600 focus:ring-cyan-500"
                                                    />
                                                    <span className="text-white">{cls.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                
                                {/* A-Level Dropdown */}
                                <div className="relative" ref={aLevelDropdownRef}>
                                    <button onClick={() => setALevelDropdownOpen(prev => !prev)} className="w-full px-4 py-2 bg-gray-900/50 rounded-md text-left flex justify-between items-center">
                                        <span>A'Level ({selectedALevels} selected)</span>
                                        <ChevronIcon isOpen={aLevelDropdownOpen} />
                                    </button>
                                    {aLevelDropdownOpen && (
                                        <div className="absolute top-full left-0 mt-1 w-full bg-gray-700 border border-gray-600 rounded-md shadow-lg z-10 p-3 space-y-2">
                                            {aLevelClasses.map(cls => (
                                                <label key={cls.id} className="flex items-center space-x-3 cursor-pointer p-1 hover:bg-gray-600 rounded">
                                                    <input
                                                        type="checkbox"
                                                        checked={settings.acceptingClasses.includes(cls.name)}
                                                        onChange={() => handleClassToggle(cls.name)}
                                                        className="h-4 w-4 rounded bg-gray-800 border-gray-500 text-cyan-600 focus:ring-cyan-500"
                                                    />
                                                    <span className="text-white">{cls.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                         {/* A'Level Combinations Section */}
                        <div className="border-t border-gray-700 pt-4 mt-4">
                            <h5 className="font-semibold text-lg mb-2">A'Level Combinations</h5>
                            {/* Arts */}
                            <div className="mb-3"><div className="flex justify-between items-center mb-1"><h6 className="font-medium text-gray-300">Arts</h6><button onClick={() => handleOpenCombinationModal('arts')} className="text-xs px-2 py-1 bg-gray-600 rounded-md">+ Add</button></div><div className="space-y-1">{settings.aLevelCombinations?.arts.map(c => (<div key={c.id} className="text-sm bg-gray-900/50 p-1.5 rounded flex justify-between items-center"><div><strong>{c.name}</strong><span className="text-gray-400 text-xs ml-2">{c.subjects}</span></div><div><button onClick={() => handleOpenCombinationModal('arts', c)} className="p-1"><EditIcon/></button><button onClick={() => handleDeleteCombination('arts', c.id)} className="p-1"><DeleteIcon/></button></div></div>))}</div></div>
                            {/* Sciences */}
                            <div><div className="flex justify-between items-center mb-1"><h6 className="font-medium text-gray-300">Sciences</h6><button onClick={() => handleOpenCombinationModal('sciences')} className="text-xs px-2 py-1 bg-gray-600 rounded-md">+ Add</button></div><div className="space-y-1">{settings.aLevelCombinations?.sciences.map(c => (<div key={c.id} className="text-sm bg-gray-900/50 p-1.5 rounded flex justify-between items-center"><div><strong>{c.name}</strong><span className="text-gray-400 text-xs ml-2">{c.subjects}</span></div><div><button onClick={() => handleOpenCombinationModal('sciences', c)} className="p-1"><EditIcon/></button><button onClick={() => handleDeleteCombination('sciences', c.id)} className="p-1"><DeleteIcon/></button></div></div>))}</div></div>
                        </div>

                        <button onClick={handleSaveSettings} className="w-full py-2 bg-cyan-600 hover:bg-cyan-700 rounded-md font-semibold mt-4">
                            Save Settings
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};


interface SmartIdManagementProps {
    school: School;
}
const SmartIdManagement: React.FC<SmartIdManagementProps> = ({ school }) => {
    const [settings, setSettings] = useState(() => smartIdService.getSmartIdSettings(school.id));
    const [template, setTemplate] = useState(() => customIdTemplateService.getCustomIdTemplate(school.id));
    return (
        <div className="space-y-6">
             <h3 className="text-xl font-bold mb-4 text-white">Smart ID Card Management</h3>
             <div className="bg-gray-800 p-4 rounded-lg">
                <IdCardDesigner school={school} onTemplateSave={() => setTemplate(customIdTemplateService.getCustomIdTemplate(school.id))} />
             </div>
        </div>
    );
};

const UnebDashboardView: React.FC<{ stats: UnebStats | null }> = ({ stats }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Results" value={stats?.totalSlips || 0} icon={<ResultsIcon/>} colorClassName="bg-cyan-500" />
        <StatCard title="P.L.E Results" value={stats?.byLevel['P.L.E'].studentCount || 0} icon={<ResultsIcon/>} colorClassName="bg-indigo-500" />
        <StatCard title="U.C.E Results" value={stats?.byLevel['U.C.E'].studentCount || 0} icon={<ResultsIcon/>} colorClassName="bg-emerald-500" />
        <StatCard title="U.A.C.E Results" value={stats?.byLevel['U.A.C.E'].studentCount || 0} icon={<ResultsIcon/>} colorClassName="bg-amber-500" />
    </div>
);

const UnebCenterView: React.FC<{
    feedback: { type: 'success' | 'error', message: React.ReactNode } | null;
    isUploading: boolean;
    onFileUpload: (e: React.ChangeEvent<HTMLInputElement>, level: 'P.L.E' | 'U.C.E' | 'U.A.C.E', year: string) => void;
    fileInputRef: React.RefObject<HTMLInputElement>;
}> = ({ feedback, isUploading, onFileUpload, fileInputRef }) => {
    const [selectedUnebLevel, setSelectedUnebLevel] = useState<'U.C.E' | 'U.A.C.E' | 'P.L.E'>('U.C.E');
    const [selectedUnebYear, setSelectedUnebYear] = useState(new Date().getFullYear().toString());

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
            <h3 className="text-xl font-bold mb-4 text-white">Upload UNEB Results</h3>
            {feedback && (
                <div className={`p-4 rounded-md mb-4 text-sm ${feedback.type === 'success' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                    {feedback.message}
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="md:col-span-3"><p className="text-sm text-gray-400">Upload a CSV file with student results. The 'Exam Year' column must match the format 'YYYY LEVEL' (e.g., '2023 U.C.E').</p></div>
                <div>
                    <label className="text-sm text-gray-400">Exam Level</label>
                    <select value={selectedUnebLevel} onChange={e => setSelectedUnebLevel(e.target.value as any)} className="w-full p-2 bg-gray-700 rounded-md mt-1">
                        <option>U.C.E</option>
                        <option>U.A.C.E</option>
                        <option>P.L.E</option>
                    </select>
                </div>
                <div>
                    <label className="text-sm text-gray-400">Exam Year</label>
                    <input type="number" value={selectedUnebYear} onChange={e => setSelectedUnebYear(e.target.value)} className="w-full p-2 bg-gray-700 rounded-md mt-1"/>
                </div>
                <div className="flex items-center space-x-4">
                    <input type="file" ref={fileInputRef} onChange={(e) => onFileUpload(e, selectedUnebLevel, selectedUnebYear)} accept=".csv" className="hidden"/>
                    <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="flex items-center px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-md font-semibold disabled:bg-gray-500">
                        <UploadIcon/>{isUploading ? 'Uploading...' : 'Upload CSV'}
                    </button>
                </div>
            </div>
        </div>
    );
};

interface AdminPageProps {
    user: AdminUser;
    onLogout: () => void;
}

// FIX: Export AdminPage component to be used in other files.
export const AdminPage: React.FC<AdminPageProps> = ({ user, onLogout }) => {
    // State
    const [view, setView] = useState('dashboard');
    const [schools, setSchools] = useState<School[]>([]);
    const [modules, setModules] = useState<Module[]>([]);
    const [schoolForHeadteacher, setSchoolForHeadteacher] = useState<School | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(user);
    const [classes, setClasses] = useState<SchoolClass[]>([]);

    // State for UNEB Admin
    const [unebStats, setUnebStats] = useState<UnebStats | null>(null);
    const [unebFeedback, setUnebFeedback] = useState<{ type: 'success' | 'error'; message: React.ReactNode } | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // State for Headteacher:
    const [students, setStudents] = useState<SchoolUser[]>([]);
    const [activeModules, setActiveModules] = useState<Module[]>([]);
    const [completedAdmissions, setCompletedAdmissions] = useState<CompletedAdmission[]>([]);


    const refreshData = useCallback(() => {
        const allSchools = getAllSchools();
        setSchools(allSchools);
        const allModules = getAllModules();
        setModules(allModules);

        if (user.role === 'uneb_admin') {
            setUnebStats(getUnebStats());
        }

        if (user.role === 'headteacher' && user.assignedSchoolIds.length > 0) {
            const schoolId = user.assignedSchoolIds[0];
            const school = allSchools.find(s => s.id === schoolId);
            setSchoolForHeadteacher(school || null);
            if(school) {
                const schoolStudents = studentService.getSchoolUsersBySchoolIds([schoolId]);
                setStudents(schoolStudents);
                setCompletedAdmissions(settingsService.getCompletedAdmissions(schoolId));
                setClasses(classService.getClassesForSchool(schoolId));
                
                const schoolModules = school.modules
                    .filter(m => m.status === 'active' || m.status === 'published')
                    .map(m => allModules.find(mod => mod.id === m.moduleId))
                    .filter((m): m is Module => !!m);
                setActiveModules(schoolModules);
            }
        }
    }, [user.role, user.assignedSchoolIds]);

    useEffect(() => {
        refreshData();
        const interval = setInterval(() => heartbeat(currentUser.id), 5000);
        return () => clearInterval(interval);
    }, [refreshData, currentUser.id]);
    
    // --- Module Action Handlers for Headteacher ---
    const handleActivateModule = (schoolId: string, moduleId: string) => {
        activateModuleForSchool(schoolId, moduleId);
        refreshData();
    };
    const handleDeactivateModule = (schoolId: string, moduleId: string) => {
        deactivateModuleForSchool(schoolId, moduleId);
        refreshData();
    };
    const handlePublishModule = (schoolId: string, moduleId: string) => {
        try {
            publishModuleForSchool(schoolId, moduleId);
            refreshData();
        } catch (error) {
            alert((error as Error).message);
        }
    };
    const handleUnpublishModule = (schoolId: string, moduleId: string) => {
        try {
            unpublishModuleForSchool(schoolId, moduleId);
            refreshData();
        } catch (error) {
            alert((error as Error).message);
        }
    };
    const handlePublishHomePage = (schoolId: string) => {
        publishHomePage(schoolId);
        refreshData();
    };
    const handleUnpublishHomePage = (schoolId: string) => {
        unpublishHomePage(schoolId);
        refreshData();
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, level: 'P.L.E' | 'U.C.E' | 'U.A.C.E', year: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setUnebFeedback(null);
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            try {
                // Assuming papaparse is available globally for simplicity
                const { data } = (window as any).Papa.parse(text, { header: true, skipEmptyLines: true });
                const result = addUnebResults(data, level, year);
                
                if (result.errorCount > 0) {
                     setUnebFeedback({
                        type: 'error',
                        message: (
                            <>
                                <p>Processing complete with {result.errorCount} errors:</p>
                                <ul className="list-disc list-inside text-xs mt-2">
                                    {result.errors.slice(0, 5).map((err, i) => <li key={i}>{err}</li>)}
                                </ul>
                            </>
                        )
                    });
                } else {
                    setUnebFeedback({ type: 'success', message: `Successfully added ${result.successCount} results.` });
                }
                refreshData();
            } catch (err) {
                setUnebFeedback({ type: 'error', message: (err as Error).message });
            }
            setIsUploading(false);
             if (fileInputRef.current) fileInputRef.current.value = "";
        };
        reader.readAsText(file);
    };

    const renderContent = () => {
        switch (user.role) {
            case 'headteacher':
                if (!schoolForHeadteacher) {
                    return <div><p className="text-yellow-400">You are not assigned to any school. Please contact the superadministrator.</p></div>;
                }

                const compatibleUser = {
                    ...user,
                    studentId: user.id,
                    schoolId: schoolForHeadteacher.id
                };

                // Check if the current view corresponds to an active module
                const activeModuleView = Object.entries(moduleNameToViewMap).find(([name, v]) => v === view);
                if (activeModuleView) {
                    const moduleIsActive = activeModules.some(m => m.name === activeModuleView[0]);
                    if (!moduleIsActive && view !== 'dashboard') {
                        // If the module for the current view is not active, reset to dashboard
                        // This prevents showing a view for a deactivated module
                        setView('dashboard');
                        return <HeadteacherDashboardView school={schoolForHeadteacher} students={students} activeModules={activeModules} />;
                    }
                }

                if (view === 'modules') {
                    return <ModulesManagement 
                        school={schoolForHeadteacher} 
                        allModules={modules} 
                        onActivate={handleActivateModule}
                        onDeactivate={handleDeactivateModule}
                        onPublish={handlePublishModule}
                        onUnpublish={handleUnpublishModule}
                        onHomePagePublish={handlePublishHomePage}
                        onHomePageUnpublish={handleUnpublishHomePage}
                    />;
                }
                 if (view === 'users') {
                    return <UsersManagement school={schoolForHeadteacher} students={students} classes={classes} refreshData={refreshData} />;
                }
                if (view === 'homepage') {
                    return <HomePageEditor school={schoolForHeadteacher} />;
                }
                if (view === 'smart_admission') {
                    return <AdmissionManagement school={schoolForHeadteacher} completedAdmissions={completedAdmissions} classes={classes} refreshData={refreshData} />;
                }
                if (view === 'e_wallet') {
                    return <EWalletPage user={user} />;
                }
                 if (view === 'smart_id') {
                    return <SmartIdManagement school={schoolForHeadteacher} />;
                }
                if (view === 'e_canteen') {
                    return <ECanteenManagementPage school={schoolForHeadteacher} user={user} />;
                }
                if (view === 'security') {
                    return <SecurityManagement />;
                }
                if (view === 'nche') {
                    return <HeadteacherNcheView school={schoolForHeadteacher} students={students} />;
                }
                 if (view === 'transfer_market') {
                    return <StudentTransferMarketplace school={schoolForHeadteacher} user={user} />;
                }
                if (view === 'messages') {
                    return <SocialHubPage user={compatibleUser as any} onLogout={onLogout} onReturnToAdmin={() => setView('dashboard')} />;
                }
                if (view === 'online_feed') {
                    return <OnlineFeedPage user={compatibleUser as any} onLogout={onLogout} onBackToDashboard={() => setView('dashboard')} />;
                }
                if (view === 'exploration') {
                    return <ExplorationPage user={compatibleUser as any} />;
                }
                if (view === 'e_vote') {
                    return <EVoteAdminPage school={schoolForHeadteacher} user={user} />;
                }
                if (view === 'visitor_reg') {
                    return <VisitorRegPage school={schoolForHeadteacher} user={user} />;
                }
                return <HeadteacherDashboardView school={schoolForHeadteacher} students={students} activeModules={activeModules} />;
            case 'uneb_admin':
                if (view === 'upload') {
                    return <UnebCenterView feedback={unebFeedback} isUploading={isUploading} onFileUpload={handleFileUpload} fileInputRef={fileInputRef} />;
                }
                if (view === 'e_wallet') {
                    return <EWalletPage user={user} />;
                }
                if (view === 'security') {
                    return <SecurityManagement />;
                }
                return <UnebDashboardView stats={unebStats} />;
            case 'nche_admin':
                 return <NcheAdminPage user={user} onLogout={onLogout}/>;
            default:
                return <div>Dashboard for role {user.role} coming soon.</div>;
        }
    };
    
    // Dynamically build nav items based on role
    const navItems: { view: string; name: string; icon: React.ReactNode }[] = useMemo(() => {
        switch(user.role) {
            case 'headteacher':
                return [
                    { view: 'dashboard', name: 'Dashboard', icon: <DashboardIcon /> },
                    { view: 'users', name: 'Users', icon: <UsersIcon /> },
                    { view: 'modules', name: 'Modules', icon: <ModulesIcon /> },
                    { view: 'security', name: 'Security', icon: <SecurityIcon /> },
                ];
            case 'uneb_admin':
                 return [
                    { view: 'dashboard', name: 'Dashboard', icon: <DashboardIcon /> },
                    { view: 'upload', name: 'Upload Center', icon: <UnebIcon /> },
                    { view: 'e_wallet', name: 'E-Wallet', icon: <EWalletIcon /> },
                    { view: 'security', name: 'Security', icon: <SecurityIcon /> },
                 ];
            default: return [];
        }
    }, [user.role]);

    if (user.role === 'nche_admin') {
        return <NcheAdminPage user={user} onLogout={onLogout} />;
    }

    return (
        <div className="flex h-screen bg-gray-900 text-white font-sans">
             {isProfileOpen && (
                <ProfilePage
                    user={currentUser}
                    onClose={() => setIsProfileOpen(false)}
                    onProfileUpdate={(updatedUser) => {
                        setCurrentUser(updatedUser as AdminUser);
                        localStorage.setItem('360_smart_school_session', JSON.stringify(updatedUser));
                    }}
                />
            )}
            
            {/* Desktop Sidebar */}
            <aside className={`bg-gray-800 text-white p-4 flex-col justify-between transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'} hidden lg:flex`}>
                <div>
                    <div className="flex items-center justify-center mb-8 h-10">
                        {!isSidebarCollapsed && <h1 className="text-xl font-bold text-cyan-400">{APP_TITLE}</h1>}
                    </div>
                    <nav className="space-y-2">
                        {navItems.map(item => (
                            <button key={item.view} onClick={() => { setView(item.view); setIsSidebarCollapsed(true); }} title={item.name}
                                className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${view === item.view ? 'bg-cyan-600' : 'hover:bg-gray-700'}`}>
                                {item.icon}
                                {!isSidebarCollapsed && <span>{item.name}</span>}
                            </button>
                        ))}
                        {user.role === 'headteacher' && activeModules.length > 0 && (
                            <div className="w-full flex items-center space-x-3 p-3 rounded-md" title="Active Modules">
                                <ModulesIcon />
                                {!isSidebarCollapsed && (
                                    <select
                                        value={Object.values(moduleNameToViewMap).includes(view) ? view : ''}
                                        onChange={(e) => {
                                            const newView = e.target.value;
                                            if (newView) {
                                                setView(newView);
                                                setIsSidebarCollapsed(true);
                                            }
                                        }}
                                        className="w-full p-2 bg-gray-700 rounded-md text-white border-gray-600 focus:ring-cyan-500 focus:border-cyan-500"
                                        aria-label="Active Modules"
                                    >
                                        <option value="">Active Modules...</option>
                                        {activeModules.map(module => {
                                            const viewName = moduleNameToViewMap[module.name];
                                            if (!viewName) return null;
                                            return (
                                                <option key={module.id} value={viewName}>
                                                    {module.name}
                                                </option>
                                            );
                                        })}
                                    </select>
                                )}
                            </div>
                        )}
                    </nav>
                </div>
            </aside>
            
            {/* Mobile Sidebar & Overlay */}
            {isSidebarOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-75 z-30 lg:hidden" onClick={() => setIsSidebarOpen(false)}>
                    <aside className="fixed top-0 left-0 h-full w-64 bg-gray-800 shadow-xl z-40 p-4 flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-cyan-400">{APP_TITLE}</h2>
                            <button onClick={() => setIsSidebarOpen(false)} className="text-gray-400 hover:text-white"><CloseIcon /></button>
                        </div>
                        <nav className="space-y-2 flex-grow">
                            {navItems.map(item => (
                                <button key={item.view} onClick={() => { setView(item.view); setIsSidebarOpen(false); }}
                                    className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${view === item.view ? 'bg-cyan-600' : 'hover:bg-gray-700'}`}>
                                    {item.icon}<span>{item.name}</span>
                                </button>
                            ))}
                            {user.role === 'headteacher' && activeModules.length > 0 && (
                                <div className="w-full flex items-center space-x-3 p-3 rounded-md">
                                    <ModulesIcon />
                                    <select
                                        value={Object.values(moduleNameToViewMap).includes(view) ? view : ''}
                                        onChange={(e) => {
                                            const newView = e.target.value;
                                            if (newView) {
                                                setView(newView);
                                                setIsSidebarOpen(false);
                                            }
                                        }}
                                        className="w-full p-2 bg-gray-700 rounded-md text-white border-gray-600 focus:ring-cyan-500 focus:border-cyan-500"
                                        aria-label="Active Modules"
                                    >
                                        <option value="">Active Modules...</option>
                                        {activeModules.map(module => {
                                            const viewName = moduleNameToViewMap[module.name];
                                            if (!viewName) return null;
                                            return (
                                                <option key={module.id} value={viewName}>
                                                    {module.name}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                            )}
                        </nav>
                    </aside>
                </div>
            )}

            <div className="flex-1 flex flex-col overflow-hidden">
                 <header className="flex-shrink-0 flex items-center justify-between p-4 bg-gray-800 border-l border-gray-700 shadow-md">
                    <div className="flex items-center space-x-4">
                        <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-1"><HamburgerIcon /></button>
                        <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="hidden lg:block p-1 text-gray-400 hover:text-white"><HamburgerIcon /></button>
                    </div>
                    <div className="flex items-center space-x-4">
                        <NotificationBell userId={user.id} />
                         <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setIsProfileOpen(true)}>
                            <UserAvatar name={currentUser.name} avatarUrl={currentUser.avatarUrl} className="w-10 h-10 rounded-full object-cover border-2 border-gray-600"/>
                            <div>
                                <p className="font-semibold">{currentUser.name}</p>
                                <p className="text-sm text-gray-400 capitalize">{currentUser.role.replace('_', ' ')}</p>
                            </div>
                        </div>
                        <button onClick={onLogout} className="p-3 rounded-full text-red-500 hover:bg-red-500/20 transition-colors" title="Logout">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        </button>
                    </div>
                </header>
                <main className="flex-1 p-4 lg:p-8 overflow-y-auto border-l border-gray-700">
                    <div className="container mx-auto">
                        {renderContent()}
                    </div>
                </main>
            </div>
        </div>
    );
};