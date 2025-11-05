import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { User, Module, ExtractedUnebSlipData, UnebPassSlip, AdmissionSettings, AdminUser, School, CustomIdTemplate, CanteenShop, InternalExamResult, SchoolClass, StudentTransferProposal, TransferNegotiation, CompletedAdmission } from '../types';
import { APP_TITLE } from '../constants';
import NotificationBell from './NotificationBell';
import { getAllSchools, getOpenMarketProposals, getProposalsForSchool, getNegotiationsForSchool, startOrGetNegotiation } from '../services/schoolService';
import { getAllModules, SMART_ADMISSION_MODULE_NAME, MESSAGE_MODULE_NAME, E_WALLET_MODULE_NAME, ONLINE_MODULE_NAME, SMART_STUDENT_ID_MODULE_NAME, E_CANTEEN_MODULE_NAME, NCHE_MODULE_NAME, EXPLORATION_MODULE_NAME, STUDENT_TRANSFER_MODULE_NAME, NEWS_FEED_MODULE_NAME, E_VOTE_MODULE_NAME } from '../services/moduleService';
import * as settingsService from '../services/settingsService';
import { isUnebVerificationEnabled } from '../services/systemSettingsService';
import { extractTextFromImageWithGoogle, getNewsFromAI } from '../services/apiService';
import { findResultByIndex } from '../services/unebResultService';
import * as eWalletService from '../services/eWalletService';
import * as studentService from '../services/studentService';
import SocialHubPage from './SocialHubPage';
import MessagesPage from './MessagesPage';
import NotificationPermissionBanner from './NotificationPermissionBanner';
import { heartbeat } from '../services/presenceService';
import * as groupService from '../services/groupService';
import EWalletPage from './EWalletPage';
import ProfilePage from './ProfilePage';
import { getHomePageContent } from '../services/homePageService';
import OnlineFeedPage from './OnlineFeedPage';
import { SmartIdCard, SmartIdCardFront, SmartIdCardBack } from './SmartIdCard';
import * as smartIdService from '../services/smartIdService';
import CustomSmartIdCard, { CustomSmartIdCardDownloadable } from './CustomSmartIdCard';
import * as customIdTemplateService from '../services/customIdTemplateService';
import ECanteenStudentPage, { CanteenSellerDashboard } from './ECanteenStudentPage';
import CarrierPage from './CarrierPage';
import StudentNcheView from './StudentNcheView';
import ReportCard from './ReportCard';
import * as classService from '../services/classService';
import ExplorationPage from './ExplorationPage';
import UserAvatar from './UserAvatar';
import StudentTransferMarketplace from './StudentTransferMarketplace';
import SchoolLandingPage from './SchoolLandingPage';
import * as chatService from '../services/chatService';
import EVoteStudentPage from './EVoteStudentPage';


// Tell typescript html2canvas exists globally
declare var html2canvas: any;

// Helper function to fetch a cross-origin image and convert it to a data URL
const imageToDataUrl = (url: string): Promise<string> => {
    const proxyUrl = 'https://corsproxy.io/?';
    if (url.startsWith('data:')) {
        return Promise.resolve(url);
    }
    return fetch(proxyUrl + encodeURIComponent(url))
        .then(response => {
            if (!response.ok) throw new Error(`Failed to fetch through proxy with status: ${response.status}`);
            return response.blob();
        })
        .then(blob => new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result === 'string') resolve(reader.result);
                else reject(new Error('Failed to read blob as a data URL.'));
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        }))
        .catch(error => {
            console.error(`Failed to load image via proxy for canvas conversion: ${url}`, error);
            return "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
        });
};

// --- SVG Icons ---
const HomeIcon = () => (<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>);
const GroupsIcon = () => (<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>);
const MessagesIcon = () => (<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" /></svg>);
const PlusIcon = ({className}: {className?: string}) => (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>);
const CloseIcon = () => (<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>);
const HamburgerIcon = () => (<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>);
const SmartAdmissionIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5 8.281V13.5a1 1 0 001 1h8a1 1 0 001-1V8.281l2.394-1.36a1 1 0 000-1.84l-7-3zM6 9.319l4 2.286 4-2.286V13.5H6V9.319z" /><path d="M15 13.129l-5 2.857-5-2.857V9.32l5 2.857 5-2.857v3.81z" /></svg>);
const GenericModuleIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5 4a1 1 0 00-1 1v6a1 1 0 001 1h6a1 1 0 001-1V5a1 1 0 00-1-1H5zM5 3a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V5a2 2 0 00-2-2H5z" /><path d="M15 4a1 1 0 00-1 1v2a1 1 0 001 1h2a1 1 0 001-1V5a1 1 0 00-1-1h-2zM15 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2h-2zM5 14a1 1 0 00-1 1v2a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 00-1-1H5zM5 13a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM15 14a1 1 0 00-1 1v2a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 00-1-1h-2zM15 13a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2h-2z" /></svg>);
const DashboardIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>);
const EWalletIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>);
const OnlineIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.522-1.522l.836.836a.75.75 0 001.06 0l1.414-1.414a.75.75 0 000-1.06l-.836-.836A7.5 7.5 0 002 10a7.5 7.5 0 004.027 6.668l.836-.836a.75.75 0 000-1.06l-1.414-1.414a.75.75 0 00-1.06 0l-.836.836a6.012 6.012 0 01-1.522-1.522zm11.336 0a6.012 6.012 0 01-1.522 1.522l-.836-.836a.75.75 0 00-1.06 0L11.25 10.5l-1.06-1.06a.75.75 0 00-1.06 0l-.836.836a6.012 6.012 0 01-1.522-1.522l.836-.836a.75.75 0 000-1.06L5.5 4.332a.75.75 0 00-1.06 0l-.836.836A7.5 7.5 0 0010 2.5a7.5 7.5 0 006.668 4.027l-.836.836a.75.75 0 00-1.06 0l-1.414 1.414a.75.75 0 000 1.06l.836.836z" clipRule="evenodd" /></svg>);
const VerifiedIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>);
const EditIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>);
const IdCardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2H3zm3 2a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm-1 4a1 1 0 100 2h.01a1 1 0 100-2H5zm3 0a1 1 0 100 2h6a1 1 0 100-2H8zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H5zm3 0a1 1 0 100 2h6a1 1 0 100-2H8z" clipRule="evenodd" /></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>;
const CanteenIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 4.5A1.5 1.5 0 013.5 3h1.53a1.5 1.5 0 011.42 1.049l.343.857a.5.5 0 00.47.344h4.474a.5.5 0 00.47-.344l.343-.857A1.5 1.5 0 0113.97 3H15.5A1.5 1.5 0 0117 4.5V5h-.5a.5.5 0 000 1h.5v1.5a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 012 7.5V5h.5a.5.5 0 000-1H2V4.5zM3.5 4a.5.5 0 00-.5.5V5h13V4.5a.5.5 0 00-.5-.5h-1.03a.5.5 0 00-.47.349l-.344.856a1.5 1.5 0 01-1.42 1.045H7.234a1.5 1.5 0 01-1.42-1.045l-.343-.856A.5.5 0 005.03 4H3.5zM2 12v3.5A1.5 1.5 0 003.5 17h13a1.5 1.5 0 001.5-1.5V12h-16zm1.5.5a.5.5 0 01.5-.5h12a.5.5 0 01.5.5v3a.5.5 0 01-.5.5h-12a.5.5 0 01-.5-.5v-3z"/></svg>;
const NcheIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5 8.281V13.5a1 1 0 001 1h8a1 1 0 001-1V8.281l2.394-1.36a1 1 0 000-1.84l-7-3zM6 9.319l4 2.286 4-2.286V13.5H6V9.319z" /><path d="M6 13.5V15l4 2.286L14 15v-1.5H6z" /></svg>;
const ModulesIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5 4a1 1 0 00-1 1v6a1 1 0 001 1h6a1 1 0 001-1V5a1 1 0 00-1-1H5zM5 3a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V5a2 2 0 00-2-2H5z" /><path d="M15 4a1 1 0 00-1 1v2a1 1 0 001 1h2a1 1 0 001-1V5a1 1 0 00-1-1h-2zM15 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2h-2zM5 14a1 1 0 00-1 1v2a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 00-1-1H5zM5 13a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM15 14a1 1 0 00-1 1v2a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 00-1-1h-2zM15 13a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2h-2z" /></svg>);
const ResultsIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a1 1 0 011-1h14a1 1 0 110 2H3a1 1 0 01-1-1z" /></svg>);
const ExplorationIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M15.05 5.05a7 7 0 10-10 10 7 7 0 0010-10zM10 16a6 6 0 110-12 6 6 0 010 12z" /><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path d="M4.343 4.343l1.414 1.414M14.243 14.243l1.414 1.414M4.343 15.657l1.414-1.414M14.243 5.757l1.414-1.414" /></svg>);
const ProgressIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 11h1v5H2v-5zM4 5h1v11H4V5zm2 4h1v7H6V9zm2 3h1v4h-1v-4zm2-5h1v9h-1V7zm2-2h1v11h-1V5zm2 3h1v8h-1V8zm2-5h1v13h-1V3z" /></svg>);
const TrendUpIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 11.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414v-2.586z" clipRule="evenodd" /></svg>;
const TrendDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12 13a1 1 0 100 2h5a1 1 0 001-1V9a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 8.586 3.707 4.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L10 9.414l3.293 3.293a1 1 0 001.414-1.414V13z" clipRule="evenodd" /></svg>;
const ArrowUpIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>;
const ArrowDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>;
const StarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>;
const TargetIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>;
const ThumbsUpIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor"><path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" /></svg>;
const NewsIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M2 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 002 2H4a2 2 0 01-2-2V5zm3 1h6v4H5V6zm6 6H5v2h6v-2z" clipRule="evenodd" /><path d="M15 7h1a2 2 0 012 2v5.5a1.5 1.5 0 01-3 0V7z" /></svg>);

// --- START: DEFINITION OF MISSING COMPONENTS ---

// FIX: Define missing StudentResultsView and related ResultsAnalytics components
const ResultsAnalytics: React.FC<{ results: InternalExamResult[] }> = ({ results }) => {
    const sortedResults = [...results].sort((a, b) => {
        const parseTerm = (term: string): { year: number; termNum: number } => {
            const yearMatch = term.match(/(\d{4})/);
            const termMatch = term.match(/Term (\d+)/i);
            const year = yearMatch ? parseInt(yearMatch[1], 10) : 0;
            const termNum = termMatch ? parseInt(termMatch[1], 10) : 0;
            return { year, termNum };
        };
        const termA = parseTerm(a.term);
        const termB = parseTerm(b.term);
        if (termA.year !== termB.year) {
            return termB.year - a.year;
        }
        return termB.termNum - termA.termNum;
    });

    const latestResult = sortedResults[0];
    const previousResult = sortedResults[1];

    const { bestSubjects, betterSubjects, poorlySubjects } = useMemo(() => {
        if (!latestResult) {
            return { bestSubjects: [], betterSubjects: [], poorlySubjects: [] };
        }
        const allSubjects = [...latestResult.subjects].sort((a, b) => parseFloat(String(b.score)) - parseFloat(String(a.score)));
        return {
            bestSubjects: allSubjects.filter(s => parseFloat(String(s.score)) >= 80),
            betterSubjects: allSubjects.filter(s => parseFloat(String(s.score)) >= 60 && parseFloat(String(s.score)) < 80),
            poorlySubjects: allSubjects.filter(s => parseFloat(String(s.score)) < 60),
        };
    }, [latestResult]);

    const comparison = useMemo(() => {
        if (!previousResult) return null;

        const prevScores = new Map(previousResult.subjects.map(s => [s.name, s.score]));
        const changes = latestResult.subjects
            .map(currentSub => {
                const prevScore = prevScores.get(currentSub.name);
                if (prevScore === undefined) return null;
                return { name: currentSub.name, change: parseFloat(String(currentSub.score)) - parseFloat(String(prevScore)) };
            })
            .filter((c): c is { name: string; change: number } => c !== null);

        changes.sort((a, b) => b.change - a.change);
        
        return {
            overallChange: latestResult.average - previousResult.average,
            mostImproved: changes.filter(c => c.change > 0).slice(0, 3),
            areasForFocus: changes.filter(c => c.change < 0).reverse().slice(0, 3),
        };
    }, [latestResult, previousResult]);

    const showBestCard = bestSubjects.length > 5;
    const betterContent = showBestCard ? betterSubjects : [...bestSubjects, ...betterSubjects].sort((a, b) => parseFloat(String(b.score)) - parseFloat(String(a.score)));
    
    return (
        <div className="space-y-6 animate-slide-in-left-fade">
            <h3 className="text-xl font-bold text-white">Performance Overview</h3>
            
            {comparison && (
                 <div className="bg-gray-800 p-4 rounded-lg flex items-center justify-center space-x-3 text-center">
                    {comparison.overallChange >= 0 ? <TrendUpIcon /> : <TrendDownIcon />}
                    <div>
                        <p className="font-semibold">Overall Term Performance</p>
                        <p className={`text-lg font-bold ${comparison.overallChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                           {comparison.overallChange >= 0 ? '+' : ''}{comparison.overallChange.toFixed(2)}% average
                        </p>
                         <p className="text-xs text-gray-400">Compared to {previousResult.term}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

interface StudentResultsViewProps {
    user: User;
    onDownload: (result: InternalExamResult) => void;
    isDownloading: boolean;
}
const StudentResultsView: React.FC<StudentResultsViewProps> = ({ user, onDownload, isDownloading }) => {
    const internalResults = user.internalExams || [];
    const sortedInternalResults = [...internalResults].sort((a, b) => b.term.localeCompare(a.term));
    const unebSlip = user.unebPassSlip;

    const hasNoResults = internalResults.length === 0 && !unebSlip;

    if (hasNoResults) {
        return (
            <div className="text-center p-8 bg-gray-800 rounded-lg">
                <h3 className="text-xl font-bold">No Academic Records Found</h3>
                <p className="text-gray-400 mt-2">Your official UNEB results or internal school results have not been added to your profile yet.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">My Academic Records</h2>
            {/* ... rendering logic for results ... */}
        </div>
    );
};

// FIX: Define missing StudentAdmissionPortal component and export it
interface StudentAdmissionPortalProps {
    user: User;
    school: School;
    onBack: () => void;
    onAdmissionStaged: (data: UnebPassSlip | ExtractedUnebSlipData) => void;
    stagedData: UnebPassSlip | ExtractedUnebSlipData | null;
    onStagedDataConsumed: () => void;
}
export const StudentAdmissionPortal: React.FC<StudentAdmissionPortalProps> = ({ user, school, onBack, onAdmissionStaged, stagedData, onStagedDataConsumed }) => {
    return (<div>Admission Portal Placeholder</div>);
};

// FIX: Define missing NewsFeedView component
const NewsFeedView: React.FC = () => {
    const [news, setNews] = useState<{ title: string; summary: string; url: string; imageUrl: string; }[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchNews = async () => {
            try {
                const newsData = await getNewsFromAI('Technology');
                setNews(newsData);
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchNews();
    }, []);

    if (isLoading) {
        return <div>Loading news...</div>;
    }

    return (
        <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6">Latest News</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {news.map((story, index) => (
                    <a href={story.url} target="_blank" rel="noopener noreferrer" key={index} className="bg-gray-800 rounded-lg shadow-xl block">
                        <img src={story.imageUrl} alt={story.title} className="w-full h-40 object-cover rounded-t-lg"/>
                        <div className="p-4">
                            <h3 className="font-bold text-lg">{story.title}</h3>
                            <p className="text-sm text-gray-400 mt-2">{story.summary}</p>
                        </div>
                    </a>
                ))}
            </div>
        </div>
    );
};

// FIX: Define missing SmartIdViewer component
interface SmartIdViewerProps {
    user: User;
    school: School;
    settings: any;
    templateType: 'default' | 'custom';
    onClose: () => void;
}
const SmartIdViewer: React.FC<SmartIdViewerProps> = ({ user, school, settings, templateType, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-xl text-white">
                <header className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">My Smart ID</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
                </header>
                <div className="flex justify-center">
                    {templateType === 'custom' ? (
                        <CustomSmartIdCard user={user} school={school} template={settings as CustomIdTemplate} />
                    ) : (
                        <SmartIdCard user={user} school={school} settings={settings} />
                    )}
                </div>
            </div>
        </div>
    );
};

// --- END: DEFINITION OF MISSING COMPONENTS ---

// --- MAIN STUDENT PAGE ---
interface StudentPageProps { user: User; onLogout: (showNewUserFlow?: boolean) => void; }

export const StudentPage: React.FC<StudentPageProps> = ({ user, onLogout }) => {
    const [currentUser, setCurrentUser] = useState(user);
    const [school, setSchool] = useState<School | null>(null);
    const [schoolName, setSchoolName] = useState(APP_TITLE);
    const [schoolLogo, setSchoolLogo] = useState('');
    const [availableModules, setAvailableModules] = useState<Module[]>([]);
    const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'my-results', or a module ID
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isIdCardVisible, setIsIdCardVisible] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [classes, setClasses] = useState<SchoolClass[]>([]);
    
    // State for report card downloads
    const reportCardContainerRef = useRef<HTMLDivElement>(null);
    const [reportToDownload, setReportToDownload] = useState<InternalExamResult | null>(null);

    // New state for ID card settings
    const [idCardSettings, setIdCardSettings] = useState<any>(null);
    const [idCardTemplateType, setIdCardTemplateType] = useState<'default' | 'custom'>('default');
    
    // State for staged admission
    const [stagedAdmissionData, setStagedAdmissionData] = useState<UnebPassSlip | ExtractedUnebSlipData | null>(null);
    const [wallet, setWallet] = useState(() => eWalletService.getWalletForUser(currentUser.studentId));

    const eWalletModule = useMemo(() => availableModules.find(m => m.name === E_WALLET_MODULE_NAME), [availableModules]);
    const admissionModule = useMemo(() => availableModules.find(m => m.name === SMART_ADMISSION_MODULE_NAME), [availableModules]);
    const admissionSettings = useMemo(() => school ? settingsService.getAdmissionSettings(school.id) : null, [school]);
    
    const handleAdmissionStaged = (data: UnebPassSlip | ExtractedUnebSlipData) => {
        setStagedAdmissionData(data);
        if (eWalletModule) {
            setCurrentView(eWalletModule.id);
        }
    };

    const handleProceedWithStagedAdmission = () => {
        if (admissionModule) {
            setCurrentView(admissionModule.id);
        }
    };

    // Poll for wallet updates when an admission is staged
    useEffect(() => {
        if (!stagedAdmissionData) return;

        const interval = setInterval(() => {
            setWallet(eWalletService.getWalletForUser(currentUser.studentId));
        }, 2000); // Poll every 2 seconds

        return () => clearInterval(interval);
    }, [stagedAdmissionData, currentUser.studentId]);

    const refreshModulesAndSettings = useCallback(() => {
        if (currentUser.schoolId) {
            const currentSchool = getAllSchools().find(s => s.id === currentUser.schoolId);
             if (currentSchool) {
                setSchool(currentSchool);
                setSchoolName(currentSchool.name);
                setClasses(classService.getClassesForSchool(currentSchool.id));
                const homeContent = getHomePageContent(currentSchool.id);
                setSchoolLogo(homeContent.hero.logoUrl);
                const allModules = getAllModules();
                const publishedModules = currentSchool.modules
                    .filter(m => m.status === 'published')
                    .map(m => allModules.find(mod => mod.id === m.moduleId))
                    .filter((m): m is Module => !!m);
                setAvailableModules(publishedModules);

                // Load ID Card Settings
                const settings = smartIdService.getSmartIdSettings(currentSchool.id);
                setIdCardTemplateType(settings.templateType);
                if (settings.templateType === 'custom') {
                    setIdCardSettings(customIdTemplateService.getCustomIdTemplate(currentSchool.id));
                } else {
                    setIdCardSettings(settings);
                }
            }
        }
    }, [currentUser.schoolId]);

    useEffect(() => {
        refreshModulesAndSettings();
        const interval = window.setInterval(() => heartbeat(currentUser.studentId), 5000);
        return () => window.clearInterval(interval);
    }, [refreshModulesAndSettings, currentUser.studentId]);

    const handleModuleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const viewId = e.target.value;
        setCurrentView(viewId || 'dashboard');
        setIsSidebarExpanded(false);
    };

    const handleStartMessage = (recipientId: string) => {
        const messageModule = availableModules.find(m => m.name === MESSAGE_MODULE_NAME);
        if (messageModule) {
            chatService.startOrGetConversation(currentUser.studentId, recipientId);
            setCurrentView(messageModule.id);
        } else {
            alert("The messaging module is not available.");
        }
    };
    
    // Effect to handle report card generation and download
    useEffect(() => {
        if (reportToDownload && reportCardContainerRef.current && school) {
            setIsDownloading(true);
            setTimeout(() => {
                html2canvas(reportCardContainerRef.current!, {
                    scale: 2,
                    useCORS: true,
                }).then(canvas => {
                    const link = document.createElement('a');
                    link.download = `report-card-${user.name}-${reportToDownload.term.replace(/\s/g, '_')}.png`;
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                }).catch(err => {
                    console.error("Failed to generate report card:", err);
                    alert("Sorry, there was an error downloading your report card.");
                }).finally(() => {
                    setReportToDownload(null);
                    setIsDownloading(false);
                });
            }, 300);
        }
    }, [reportToDownload, school, user.name]);
    
    const handleDownloadId = async () => {
        if (!school) return;
    };
    
    const renderDownloadableId = () => {
        if (!school || !idCardSettings) return null;
        if (idCardTemplateType === 'custom') {
            return <CustomSmartIdCardDownloadable user={currentUser} school={school} template={idCardSettings as CustomIdTemplate} />;
        }
        return (
            <div className="flex flex-col space-y-4">
                <div id="id-card-front-container">
                    <SmartIdCardFront user={currentUser} school={school} settings={idCardSettings} />
                </div>
                <div id="id-card-back-container">
                    <SmartIdCardBack user={currentUser} school={school} settings={idCardSettings} />
                </div>
            </div>
        );
    };

    const activeModule = availableModules.find(m => m.id === currentView);
    const isOnlineFeedView = activeModule?.name === ONLINE_MODULE_NAME;

    const getModuleIcon = (moduleName: string) => {
        switch (moduleName) {
            case SMART_ADMISSION_MODULE_NAME: return <SmartAdmissionIcon />;
            case MESSAGE_MODULE_NAME: return <MessagesIcon />;
            case E_WALLET_MODULE_NAME: return <EWalletIcon />;
            case ONLINE_MODULE_NAME: return <OnlineIcon />;
            case SMART_STUDENT_ID_MODULE_NAME: return <IdCardIcon />;
            case E_CANTEEN_MODULE_NAME: return <CanteenIcon />;
            case NCHE_MODULE_NAME: return <NcheIcon />;
            case EXPLORATION_MODULE_NAME: return <ExplorationIcon />;
            case STUDENT_TRANSFER_MODULE_NAME: return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M8 5a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L13.586 5H8z" /><path d="M12 15a1 1 0 100-2H6.414l1.293-1.293a1 1 0 10-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L6.414 15H12z" /></svg>;
            case NEWS_FEED_MODULE_NAME: return <NewsIcon />;
            case E_VOTE_MODULE_NAME: return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828zM5 12a1 1 0 100 2h1a1 1 0 100-2H5zM3 12a1 1 0 112 0 1 1 0 01-2 0zM5 16a1 1 0 100 2h1a1 1 0 100-2H5zM3 16a1 1 0 112 0 1 1 0 01-2 0zM5 8a1 1 0 100 2h1a1 1 0 100-2H5zM3 8a1 1 0 112 0 1 1 0 01-2 0z" /></svg>;
            default: return <GenericModuleIcon />;
        }
    };

    const renderMainContent = () => {
        if (currentUser.pendingTransferAcceptance) {
            return <div>TRANSFER PENDING</div>
        }

        if (currentView === 'my-results') {
            return <StudentResultsView user={currentUser} onDownload={setReportToDownload} isDownloading={isDownloading}/>;
        }
        if (activeModule?.name === SMART_ADMISSION_MODULE_NAME && school) {
            return <StudentAdmissionPortal 
                user={currentUser} 
                school={school} 
                onBack={() => setCurrentView('dashboard')}
                onAdmissionStaged={handleAdmissionStaged}
                stagedData={stagedAdmissionData}
                onStagedDataConsumed={() => setStagedAdmissionData(null)}
            />;
        }
        if (activeModule?.name === MESSAGE_MODULE_NAME) {
            return <SocialHubPage user={currentUser} onLogout={() => onLogout()} />;
        }
        if (activeModule?.name === E_WALLET_MODULE_NAME) {
            return (
                <>
                    {stagedAdmissionData && admissionSettings && (
                        <div className="bg-yellow-500/10 border border-yellow-500/30 text-white p-4 rounded-lg shadow-lg mb-6 text-center animate-fade-in-up">
                            <h3 className="text-lg font-bold text-yellow-300">Pending Admission Payment</h3>
                            <p className="text-sm text-yellow-200 mt-2">
                                Your E-Wallet balance is insufficient to cover the admission fee of <strong>UGX {admissionSettings.admissionFee.toLocaleString()}</strong>.
                                Please top up your account to proceed.
                            </p>
                            <div className="mt-4">
                                <button
                                    onClick={handleProceedWithStagedAdmission}
                                    disabled={wallet.balance < admissionSettings.admissionFee}
                                    className="w-full sm:w-auto px-6 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-md font-semibold disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                                >
                                    {wallet.balance < admissionSettings.admissionFee
                                        ? `Current Balance: UGX ${wallet.balance.toLocaleString()}`
                                        : 'Proceed with Admission'}
                                </button>
                            </div>
                        </div>
                    )}
                    <EWalletPage user={currentUser} />
                </>
            );
        }
        if (activeModule?.name === ONLINE_MODULE_NAME) {
            return <OnlineFeedPage user={currentUser} onLogout={() => onLogout()} onBackToDashboard={() => setCurrentView('dashboard')} onStartMessage={handleStartMessage} />;
        }
        if (activeModule?.name === NEWS_FEED_MODULE_NAME) {
            return <NewsFeedView />;
        }
        if (activeModule?.name === E_CANTEEN_MODULE_NAME && school) {
            if (currentUser.role === 'canteen_seller' && currentUser.shopId) {
                return <CanteenSellerDashboard user={currentUser} school={school} />;
            }
            if (currentUser.role === 'carrier') {
                return <CarrierPage user={currentUser} school={school} />;
            }
            return <ECanteenStudentPage school={school} user={currentUser} />;
        }
        if (activeModule?.name === NCHE_MODULE_NAME) {
            return <StudentNcheView user={currentUser} />;
        }
        if (activeModule?.name === EXPLORATION_MODULE_NAME) {
            return <ExplorationPage user={currentUser} />;
        }
        if (activeModule?.name === STUDENT_TRANSFER_MODULE_NAME && school) {
            return <div>TRANSFER MARKET</div>
        }
        if (activeModule?.name === E_VOTE_MODULE_NAME && school) {
            return <EVoteStudentPage user={currentUser} school={school} />;
        }
        
        if (activeModule?.name === SMART_STUDENT_ID_MODULE_NAME) {
            return (
                 <div>
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                        <div>
                            <h2 className="text-2xl sm:text-3xl font-bold text-white">{SMART_STUDENT_ID_MODULE_NAME}</h2>
                            <p className="text-gray-400 mt-1">View and download your official student ID card.</p>
                        </div>
                    </div>
                    <div className="bg-gray-800 rounded-lg shadow-xl p-8 text-center flex items-center justify-center min-h-[300px]">
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                            <button onClick={() => setIsIdCardVisible(true)} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-md font-semibold text-lg flex items-center space-x-2"><IdCardIcon /><span>View My ID Card</span></button>
                            <button onClick={handleDownloadId} disabled={true} className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 rounded-md font-semibold text-lg flex items-center space-x-2 disabled:bg-gray-500"><DownloadIcon /><span>Download ID</span></button>
                        </div>
                    </div>
                </div>
            );
        }

        const dashboardTitle = activeModule ? activeModule.name : "Student Dashboard";
        return (
            <div>
                 <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-white">{dashboardTitle}</h2>
                        <p className="text-gray-400 mt-1">Welcome back, {currentUser.name}!</p>
                    </div>
                </div>
                <NotificationPermissionBanner />
            </div>
        );
    };

    const navItems = [
        { id: 'dashboard', name: 'Dashboard', icon: <DashboardIcon /> },
        { id: 'my-results', name: 'My Results', icon: <ResultsIcon /> }
    ];

    return (
        <div className={`flex h-screen bg-gray-900 text-white font-sans ${isOnlineFeedView ? 'overflow-hidden' : ''}`}>
            {isIdCardVisible && school && idCardSettings && (
                 <SmartIdViewer user={currentUser} school={school} settings={idCardSettings} templateType={idCardTemplateType} onClose={() => setIsIdCardVisible(false)} />
            )}

            {isMobileMenuOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-75 z-40 sm:hidden" onClick={() => setIsMobileMenuOpen(false)}>
                    <aside className="fixed top-0 left-0 h-full w-64 bg-gray-800 shadow-xl z-50 p-4 animate-slide-in-right" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center space-x-2 overflow-hidden pr-2">
                                <img src={schoolLogo || `https://picsum.photos/seed/default-logo/100/100`} alt="School Logo" className="w-10 h-10 rounded-full object-contain bg-white p-0.5 flex-shrink-0" />
                                <span className="font-bold text-xl truncate">{schoolName.split(' ')[0]}</span>
                            </div>
                            <button onClick={() => setIsMobileMenuOpen(false)} className="text-gray-400 hover:text-white"><CloseIcon /></button>
                        </div>
                        <nav className="space-y-2">
                            {navItems.map(item => (
                                <button key={item.id} onClick={() => { setCurrentView(item.id); setIsMobileMenuOpen(false); }} className={`w-full flex items-center space-x-3 p-3 rounded-md transition-colors ${currentView === item.id ? 'bg-cyan-600' : 'hover:bg-gray-700'}`}>
                                    {item.icon}
                                    <span>{item.name}</span>
                                </button>
                            ))}
                            <div className="border-t border-gray-700 my-2"></div>
                            {availableModules.map(module => (
                                <button key={module.id} onClick={() => { setCurrentView(module.id); setIsMobileMenuOpen(false); }} className={`w-full flex items-center space-x-3 p-3 rounded-md transition-colors ${currentView === module.id ? 'bg-cyan-600' : 'hover:bg-gray-700'}`}>
                                    {getModuleIcon(module.name)}
                                    <span>{module.name}</span>
                                </button>
                            ))}
                        </nav>
                    </aside>
                </div>
            )}
            
            {/* Hidden container for downloads */}
            <div ref={reportCardContainerRef} className="fixed -left-[9999px] top-0 p-4 bg-transparent">
                {reportToDownload && school && <ReportCard user={currentUser} school={school} result={reportToDownload} />}
            </div>
            
            <aside className={`bg-gray-800 text-white ${isSidebarExpanded ? 'w-64 p-4' : 'w-20 p-2'} transition-all duration-300 flex-shrink-0 flex-col ${isOnlineFeedView ? 'hidden' : 'hidden sm:flex'}`}>
                 <div className="flex items-center justify-center mb-8 h-10">
                     {!isSidebarExpanded && <button onClick={() => setIsSidebarExpanded(true)} className="p-2 rounded-md hover:bg-gray-700"><HamburgerIcon /></button>}
                     {isSidebarExpanded && (
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center space-x-2 overflow-hidden pr-2">
                                <img src={schoolLogo || `https://picsum.photos/seed/default-logo/100/100`} alt="School Logo" className="w-10 h-10 rounded-full object-contain bg-white p-0.5 flex-shrink-0" />
                                <span className="font-bold text-xl truncate">{schoolName.split(' ')[0]}</span>
                            </div>
                            <button onClick={() => setIsSidebarExpanded(false)} className="p-2 rounded-md hover:bg-gray-700 flex-shrink-0"><CloseIcon /></button>
                        </div>
                     )}
                </div>
                <nav className="space-y-2 flex-grow">
                     {navItems.map(item => (
                        <button key={item.id} onClick={() => setCurrentView(item.id)} title={item.name} className={`w-full flex items-center space-x-3 p-3 rounded-md transition-colors ${!isSidebarExpanded && 'justify-center'} ${currentView === item.id ? 'bg-cyan-600' : 'hover:bg-gray-700'}`}>
                            {item.icon} {isSidebarExpanded && <span>{item.name}</span>}
                        </button>
                    ))}

                    {availableModules.length > 0 && (
                         <div className={`w-full flex items-center space-x-3 p-3 rounded-md ${!isSidebarExpanded && 'justify-center'}`} title="Active Modules">
                            <ModulesIcon />
                            {isSidebarExpanded && (
                                <select
                                    value={availableModules.find(m => m.id === currentView) ? currentView : ''}
                                    onChange={handleModuleSelect}
                                    className="w-full p-2 bg-gray-700 rounded-md text-white border-gray-600 focus:ring-cyan-500 focus:border-cyan-500"
                                >
                                    <option value="">Active Modules...</option>
                                    {availableModules.map(module => (
                                        <option key={module.id} value={module.id}>
                                            {module.name}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                     )}
                </nav>
            </aside>
            
            <div className="flex-1 flex flex-col overflow-hidden">
                {!isOnlineFeedView && (
                    <header className="flex-shrink-0 flex items-center justify-between sm:justify-end p-4 bg-gray-800 border-l border-gray-700 shadow-md">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="p-1 text-gray-400 hover:text-white sm:hidden" aria-label="Open menu">
                            <HamburgerIcon />
                        </button>
                        <div className="flex items-center space-x-4">
                            <NotificationBell userId={currentUser.studentId} />
                            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setIsProfileOpen(true)}>
                                <UserAvatar
                                    name={currentUser.name}
                                    avatarUrl={currentUser.avatarUrl}
                                    className="w-10 h-10 rounded-full object-cover border-2 border-gray-600"
                                />
                                <div className="text-right">
                                    <p className="font-semibold hidden sm:block">{currentUser.name}</p>
                                    <p className="font-semibold sm:hidden">{currentUser.name.split(' ')[0]}</p>
                                    <p className="text-sm text-gray-400 capitalize">{currentUser.role.replace('_', ' ')}</p>
                                </div>
                            </div>
                            <button onClick={() => onLogout()} className="p-3 rounded-full text-red-500 hover:bg-red-500/20 transition-colors" title="Logout">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                            </button>
                        </div>
                    </header>
                )}

                <main className={`flex-1 ${isOnlineFeedView ? '' : 'p-4 lg:p-8 overflow-y-auto border-l border-gray-700'}`}>
                    <div className={`${isOnlineFeedView ? 'h-full' : 'container mx-auto'}`}>
                        {renderMainContent()}
                    </div>
                </main>
            </div>
            {isProfileOpen && (
                <ProfilePage
                    user={currentUser}
                    onClose={() => setIsProfileOpen(false)}
                    onProfileUpdate={(updatedUser) => {
                        setCurrentUser(updatedUser as User);
                        localStorage.setItem('360_smart_school_session', JSON.stringify(updatedUser));
                    }}
                    classes={classes}
                />
            )}
        </div>
    );
};
