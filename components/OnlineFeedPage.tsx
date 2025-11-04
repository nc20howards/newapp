import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { User, AdminUser, PostComment, ChatConversation, ChatMessage, ChatAttachment, Event, Place, MarketplaceListing, MarketplaceMedia, Story, GroupPost, School } from '../types';
import ProfilePage from './ProfilePage';
import * as userService from '../services/userService';
import { getHomePageContent } from '../services/homePageService';
import { getAllSchools } from '../services/schoolService';
import { getAllSchoolUsers } from '../services/studentService';
import UserAvatar from './UserAvatar';
import { getAllAdminUsers } from '../services/userService';
import * as groupService from '../services/groupService';
import ConfirmationModal from './ConfirmationModal';
import GroupsPage from './GroupsPage';
import MessagesPage from './MessagesPage';
import * as chatService from '../services/chatService';
import { getPlaceSuggestionsFromAI, categorizeListing } from '../services/apiService';
import * as marketplaceService from '../services/marketplaceService';


// --- TYPE DEFINITIONS ---
interface OnlineUser { id: string; name: string; avatar: string; }
interface Announcement { id: string; title: string; author: string; content: string; }

const findFullUserById = (userId: string): User | AdminUser | null => {
    const schoolUsers = getAllSchoolUsers();
    const foundSchoolUser = schoolUsers.find(u => u.studentId === userId);
    if (foundSchoolUser) return foundSchoolUser;

    const adminUsers = getAllAdminUsers();
    const foundAdminUser = adminUsers.find(u => u.id === userId);
    if (foundAdminUser) return foundAdminUser;
    
    return null;
};

// --- HELPER FUNCTIONS ---
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

const timeSince = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 2) return "Just now";
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
};


// --- SVG ICONS ---
const IconFacebook = () => <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.323-1.325z"/></svg>;
const IconBell = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>;
const IconNavFeed = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"></path></svg>;
const IconNavGroups = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"></path></svg>;
const IconNavEvents = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"></path></svg>;
const IconNavMarketplace = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M18 6h-2c0-2.21-1.79-4-4-4S8 3.79 8 6H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6-2c1.1 0 2 .9 2 2h-4c0-1.1.9-2 2-2zm6 16H6V8h2v2c0 .55.45 1 1 1s1-.45 1-1V8h4v2c0 .55.45 1 1 1s1-.45 1-1V8h2v12z"></path></svg>;
const IconNavChat = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z"/></svg>;
const IconComposerPhoto = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"></path></svg>;
const IconComposerVideo = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" viewBox="0 0 24 24" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"></path></svg>;
const IconComposerFile = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" viewBox="0 0 24 24" fill="currentColor"><path d="M6 2c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6H6zm7 7V3.5L18.5 9H13z"></path></svg>;
const IconHamburger = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>;
const IconClose = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
const IconCalendar = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const IconLocation = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>;
const PlusIcon = ({ className }: { className?: string }) => (<svg className={className || "w-5 h-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>;
const IconOnline = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-cyan-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M12 12a1 1 0 11-2 0 1 1 0 012 0z" /></svg>;
const IconAttachment = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>;
const IconSchedule = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;

const IconLike = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.085a2 2 0 00-1.736.93L5.5 8m7 2v5m0 0v5m0-5h5" /></svg>;
const IconDislike = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.738 3h4.017c.163 0 .326.02.485.06L17 4m-7 10v5a2 2 0 002 2h.085a2 2 0 001.736-.93l2.5-4m-7 2v-5m0 0V5m0 5h5" /></svg>;
const IconComment = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>;
const IconCopyLink = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;
const IconEye = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>;
const IconLink = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>;


const PostComposer: React.FC<{ user: User | AdminUser; onPost: (htmlContent: string) => void }> = ({ user, onPost }) => {
    const [title, setTitle] = useState('');
    const editorRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const savedSelectionRef = useRef<Range | null>(null);

    const saveSelection = () => {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0 && editorRef.current?.contains(selection.anchorNode)) {
            savedSelectionRef.current = selection.getRangeAt(0).cloneRange();
        }
    };

    const restoreSelection = () => {
        const selection = window.getSelection();
        if (selection && savedSelectionRef.current) {
            selection.removeAllRanges();
            selection.addRange(savedSelectionRef.current);
        }
    };

    const insertHtmlAtCursor = (html: string) => {
        if (!editorRef.current) return;
        editorRef.current.focus();

        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;

        const range = sel.getRangeAt(0);
        range.deleteContents();
        
        const el = document.createElement("div");
        el.innerHTML = html;
        const frag = document.createDocumentFragment();
        let node, lastNode;
        while ((node = el.firstChild)) {
            lastNode = frag.appendChild(node);
        }
        range.insertNode(frag);

        if (lastNode) {
            const newRange = range.cloneRange();
            newRange.setStartAfter(lastNode);
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);
        }
    };

    const handleLink = () => {
        if (!editorRef.current) return;
        editorRef.current.focus();
        saveSelection();

        const url = prompt("Enter the URL:", "https://");
        restoreSelection();

        if (url) {
            const selection = window.getSelection();
            document.execCommand('createLink', false, url);
            const parentElement = selection?.focusNode?.parentElement;
            if (parentElement && parentElement.tagName === 'A') {
                parentElement.style.color = '#22d3ee'; // tailwind cyan-400
                parentElement.setAttribute('target', '_blank');
                parentElement.setAttribute('rel', 'noopener noreferrer');
            }
        }
    };

    const processFiles = async (files: FileList) => {
        if (savedSelectionRef.current) {
             const sel = window.getSelection();
             if (sel) {
                sel.removeAllRanges();
                sel.addRange(savedSelectionRef.current);
             }
        }

        for (let i = 0; i < files.length; i++) {
            const file = files.item(i);
            if (file) {
                try {
                    const dataUrl = await fileToBase64(file);
                    let htmlToInsert = '';
                    if (file.type.startsWith('image/')) {
                        htmlToInsert = `<div style="display: flex; justify-content: center; margin: 0.5rem 0;"><img src="${dataUrl}" alt="${file.name}" style="max-width: 100%; display: block; border-radius: 8px;" /></div><br>`;
                    } else if (file.type.startsWith('video/')) {
                        htmlToInsert = `<div style="display: flex; justify-content: center; margin: 0.5rem 0;"><video controls src="${dataUrl}" style="max-width: 100%; display: block; border-radius: 8px;"></video></div><br>`;
                    } else {
                        htmlToInsert = `<div style="padding: 1rem; background-color: #374151; border-radius: 8px; margin: 0.5rem 0;"><a href="${dataUrl}" download="${file.name}" style="text-decoration: none; color: #9ca3af; font-weight: bold;">Download: ${file.name}</a></div><br>`;
                    }
                    insertHtmlAtCursor(htmlToInsert);
                } catch (error) {
                    console.error("Error processing file:", error);
                }
            }
        }
        savedSelectionRef.current = null; // Clear after use
    };

    const handleAttachmentClick = (acceptType: string) => {
        saveSelection();
        if (fileInputRef.current) {
            fileInputRef.current.accept = acceptType;
            fileInputRef.current.click();
        }
    };
    
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        restoreSelection();
        if (e.target.files) {
            await processFiles(e.target.files);
        }
        if(fileInputRef.current) fileInputRef.current.value = "";
    };

    const handlePost = () => {
        if (editorRef.current && title.trim()) {
            const htmlContent = editorRef.current.innerHTML;
            if (!htmlContent.trim().replace(/<br\s*\/?>/ig, '')) return;
            const fullContent = `<h3><strong>${title.trim()}</strong></h3>${htmlContent}`;
            onPost(fullContent);
            editorRef.current.innerHTML = '';
            setTitle('');
        }
    };
    
    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        const urlRegex = /(https?:\/\/[^\s]+)/g;

        const sanitizedText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const linkedText = sanitizedText.replace(urlRegex, (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #22d3ee;">${url}</a>`);
        document.execCommand('insertHTML', false, linkedText);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    };

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        
        const sel = window.getSelection();
        if (sel) {
            let range;
            if (document.caretRangeFromPoint) {
                range = document.caretRangeFromPoint(e.clientX, e.clientY);
            } else {
                e.preventDefault();
                // @ts-ignore
                range = document.createRange();
                // @ts-ignore
                range.setStart(e.rangeParent, e.rangeOffset);
            }
            if (range) {
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }
        
        saveSelection();

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            await processFiles(e.dataTransfer.files);
            e.dataTransfer.clearData();
        }
    };
    
    const editorIsEmpty = !editorRef.current?.innerHTML.trim() || editorRef.current?.innerHTML.trim() === '<br>';

    return (
        <div 
            className={`bg-gray-800 rounded-lg transition-all duration-200 ${isDragOver ? 'border-2 border-dashed border-cyan-500' : 'border-2 border-transparent'}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className="flex items-start gap-3 p-4">
                <UserAvatar name={user.name} avatarUrl={user.avatarUrl} className="w-10 h-10 rounded-full flex-shrink-0" />
                <div className="w-full">
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Post Title..."
                        className="w-full bg-transparent text-xl font-bold pb-2 focus:outline-none placeholder-gray-400 border-b border-gray-700"
                    />
                    <div 
                        ref={editorRef}
                        contentEditable="true"
                        onPaste={handlePaste}
                        data-placeholder={`What's on your mind, ${user.name.split(' ')[0]}?`}
                        className="w-full bg-transparent p-3 -ml-3 mt-2 min-h-[84px] max-h-60 overflow-y-auto focus:outline-none prose prose-sm prose-invert max-w-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400"
                    />
                </div>
            </div>
            
            <div className="mt-3 p-4 border-t border-gray-700 flex justify-between items-center">
                <div className="flex items-center gap-1 sm:gap-2">
                    <button type="button" onClick={() => handleAttachmentClick('image/*')} title="Add Photos" className="p-2 text-gray-400 hover:text-green-500 hover:bg-gray-700 rounded-full transition-colors">
                        <IconComposerPhoto />
                    </button>
                    <button type="button" onClick={() => handleAttachmentClick('video/*')} title="Add Video" className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-700 rounded-full transition-colors">
                        <IconComposerVideo />
                    </button>
                    <button type="button" onClick={() => handleAttachmentClick('.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt')} title="Attach File" className="p-2 text-gray-400 hover:text-blue-500 hover:bg-gray-700 rounded-full transition-colors">
                        <IconComposerFile />
                    </button>
                    <button type="button" onClick={handleLink} title="Add Link" className="p-2 text-gray-400 hover:text-cyan-500 hover:bg-gray-700 rounded-full transition-colors">
                        <IconLink />
                    </button>
                </div>
                <button onClick={handlePost} className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-md font-semibold disabled:opacity-50" disabled={!title.trim() || editorIsEmpty}>Post</button>
            </div>
            
            <input
                type="file"
                ref={fileInputRef}
                multiple
                onChange={handleFileChange}
                className="hidden"
            />
        </div>
    );
};

// Events View
const EventsView: React.FC<{ user: User | AdminUser; school: School | null, onMapClick: (uri: string) => void }> = ({ user, school, onMapClick }) => {
    const [events, setEvents] = useState<Event[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Event | null>(null);
    const [expandedEvents, setExpandedEvents] = useState(new Set<string>());

    const toggleExpandEvent = (eventId: string) => {
        setExpandedEvents(prev => {
            const newSet = new Set(prev);
            if (newSet.has(eventId)) {
                newSet.delete(eventId);
            } else {
                newSet.add(eventId);
            }
            return newSet;
        });
    };

    const initialFormState = {
        title: '',
        description: '',
        startTime: 0,
        endTime: 0,
        bannerUrl: '',
        logoUrl: '',
        place: { title: '', uri: '' },
        attachments: [],
    };

    const [formState, setFormState] = useState<Omit<Event, 'id' | 'createdAt' | 'createdBy' | 'schoolId'>>(initialFormState);
    
    // State for location search
    const [placeSearch, setPlaceSearch] = useState('');
    const [placeSuggestions, setPlaceSuggestions] = useState<Place[]>([]);
    const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
    const debounceTimeout = useRef<number | null>(null);

    // Confirmation modal for deletion
    const [confirmModal, setConfirmModal] = useState<{ message: React.ReactNode; onConfirm: () => void; } | null>(null);

    // File previews
    const [attachmentPreviews, setAttachmentPreviews] = useState<{ name: string; type: string; }[]>([]);


    const currentUserId = 'studentId' in user ? user.studentId : user.id;

    const refreshEvents = useCallback(() => {
        if (school) {
            setEvents(groupService.getAllEventsForSchool(school.id));
        }
    }, [school]);

    useEffect(() => {
        refreshEvents();
    }, [refreshEvents]);

    const openModal = (event: Event | null) => {
        if (event) {
            setEditingEvent(event);
            setFormState({
                title: event.title,
                description: event.description,
                startTime: event.startTime,
                endTime: event.endTime,
                bannerUrl: event.bannerUrl,
                logoUrl: event.logoUrl,
                place: event.place,
                attachments: event.attachments || [],
            });
            setPlaceSearch(event.place.title);
            setAttachmentPreviews((event.attachments || []).map(a => ({ name: a.name, type: a.type })));

        } else {
            setEditingEvent(null);
            setFormState(initialFormState);
            setPlaceSearch('');
            setAttachmentPreviews([]);
        }
        setIsModalOpen(true);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormState(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, field: 'bannerUrl' | 'logoUrl' | 'attachments') => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        if (field === 'attachments') {
            const newAttachments: { name: string; type: string; dataUrl: string; }[] = [];
            for (let i = 0; i < files.length; i++) {
                const file = files.item(i);
                if (file) {
                    const dataUrl = await fileToBase64(file);
                    newAttachments.push({ name: file.name, type: file.type, dataUrl });
                }
            }
            
            setFormState(prev => ({ ...prev, attachments: [...(prev.attachments || []), ...newAttachments] }));
            setAttachmentPreviews(prev => [...prev, ...newAttachments.map(a => ({ name: a.name, type: a.type }))]);
        } else {
            const file = files[0];
            if (file) {
                const dataUrl = await fileToBase64(file);
                setFormState(prev => ({ ...prev, [field]: dataUrl }));
            }
        }
    };
    
    const removeAttachment = (index: number) => {
        setFormState(prev => ({ ...prev, attachments: (prev.attachments || []).filter((_, i) => i !== index)}));
        setAttachmentPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const handlePlaceSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setPlaceSearch(query);
        setFormState(prev => ({ ...prev, place: { title: query, uri: '' } }));

        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        if (query.length < 3) {
            setPlaceSuggestions([]);
            return;
        }

        setIsSearchingPlaces(true);
        debounceTimeout.current = window.setTimeout(async () => {
            try {
                // A mock location, replace with real geolocation if available
                const suggestions = await getPlaceSuggestionsFromAI(query, { latitude: 0.3476, longitude: 32.5825 });
                setPlaceSuggestions(suggestions);
            } catch (error) {
                console.error("Failed to fetch place suggestions", error);
            } finally {
                setIsSearchingPlaces(false);
            }
        }, 500);
    };

    const handleSelectPlace = (place: Place) => {
        setFormState(prev => ({ ...prev, place }));
        setPlaceSearch(place.title);
        setPlaceSuggestions([]);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!school) return;

        const { startTime, endTime } = formState;

        // Convert local datetime-local string to timestamp
        const startTimestamp = new Date(startTime).getTime();
        const endTimestamp = new Date(endTime).getTime();

        const eventData = {
            ...formState,
            startTime: startTimestamp,
            endTime: endTimestamp,
        };

        if (editingEvent) {
            groupService.updateEvent(editingEvent.id, eventData);
        } else {
            groupService.createEvent({
                ...eventData,
                schoolId: school.id,
                createdBy: currentUserId,
            });
        }
        refreshEvents();
        setIsModalOpen(false);
    };

    const handleDelete = (event: Event) => {
        setConfirmModal({
            message: `Are you sure you want to delete the event "${event.title}"?`,
            onConfirm: () => {
                groupService.deleteEvent(event.id);
                refreshEvents();
                setConfirmModal(null);
            }
        });
    };
    
    const formatTimestamp = (ts: number) => new Date(ts).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

    const renderModal = () => (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-[110] p-4">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl space-y-4 max-h-[90vh] flex flex-col">
                <h3 className="text-xl font-bold">{editingEvent ? 'Edit Event' : 'Create New Event'}</h3>
                <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-2">
                    {/* Inputs for title, description, banner, logo */}
                    <div>
                        <label className="text-sm">Event Title</label>
                        <input name="title" value={formState.title} onChange={handleFormChange} required className="w-full p-2 bg-gray-700 rounded mt-1" />
                    </div>
                    <div>
                        <label className="text-sm">Description</label>
                        <textarea name="description" value={formState.description} onChange={handleFormChange} required rows={3} className="w-full p-2 bg-gray-700 rounded mt-1" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm">Banner Image</label>
                            <input type="file" onChange={(e) => handleFileChange(e, 'bannerUrl')} className="w-full text-xs" />
                        </div>
                         <div>
                            <label className="text-sm">Logo Image</label>
                            <input type="file" onChange={(e) => handleFileChange(e, 'logoUrl')} className="w-full text-xs" />
                        </div>
                    </div>
                    {/* Time inputs */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm">Start Time</label>
                            <input type="datetime-local" name="startTime" value={formState.startTime ? new Date(formState.startTime).toISOString().slice(0, 16) : ''} onChange={handleFormChange} required className="w-full p-2 bg-gray-700 rounded mt-1" />
                        </div>
                        <div>
                            <label className="text-sm">End Time</label>
                            <input type="datetime-local" name="endTime" value={formState.endTime ? new Date(formState.endTime).toISOString().slice(0, 16) : ''} onChange={handleFormChange} required className="w-full p-2 bg-gray-700 rounded mt-1" />
                        </div>
                    </div>
                    {/* Location input */}
                    <div className="relative">
                        <label className="text-sm">Location</label>
                        <input value={placeSearch} onChange={handlePlaceSearchChange} placeholder="Search for a location..." required className="w-full p-2 bg-gray-700 rounded mt-1" />
                        {(isSearchingPlaces || placeSuggestions.length > 0) && (
                            <div className="absolute top-full left-0 w-full bg-gray-600 rounded-b-md shadow-lg z-10">
                                {isSearchingPlaces && <div className="p-2 text-xs text-gray-400">Searching...</div>}
                                {placeSuggestions.map((p, i) => (
                                    <button key={i} type="button" onClick={() => handleSelectPlace(p)} className="w-full text-left p-2 hover:bg-gray-500">{p.title}</button>
                                ))}
                            </div>
                        )}
                    </div>
                     {/* Attachments */}
                    <div>
                        <label className="text-sm">Attachments</label>
                        <input type="file" multiple onChange={(e) => handleFileChange(e, 'attachments')} className="w-full text-xs mt-1" />
                        <div className="flex flex-wrap gap-2 mt-2">
                            {attachmentPreviews.map((att, index) => (
                                <div key={index} className="flex items-center gap-2 bg-gray-700 p-1.5 rounded-md text-sm">
                                    <span>{att.name}</span>
                                    <button type="button" onClick={() => removeAttachment(index)} className="text-red-400">&times;</button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-gray-700">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-600 rounded">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-cyan-600 rounded">Save Event</button>
                    </div>
                </form>
            </div>
        </div>
    );
    
    return (
        <div className="space-y-6">
            {isModalOpen && renderModal()}
            {confirmModal && (
                <ConfirmationModal 
                    isOpen={true} 
                    title="Confirm Deletion" 
                    message={confirmModal.message} 
                    onConfirm={confirmModal.onConfirm} 
                    onCancel={() => setConfirmModal(null)}
                    confirmButtonVariant="danger"
                />
            )}
            <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold">School Events</h3>
                <button onClick={() => openModal(null)} className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 font-semibold rounded-md">
                    <PlusIcon /> Create Event
                </button>
            </div>
            {events.length > 0 ? events.map(event => {
                const isLongDescription = event.description.length > 120;
                const isExpanded = expandedEvents.has(event.id);
                return (
                    <div key={event.id} className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                        <div className="h-40 bg-cover bg-center" style={{ backgroundImage: `url(${event.bannerUrl || 'https://picsum.photos/seed/event-banner/800/200'})` }}></div>
                        <div className="p-4">
                            <div className="flex flex-col sm:flex-row items-start gap-4">
                                <img
                                    src={event.logoUrl || 'https://picsum.photos/seed/event-logo/100'}
                                    alt="Event Logo"
                                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover -mt-10 sm:-mt-12 border-4 border-gray-800 flex-shrink-0"
                                />
                                <div className="flex-grow pt-1">
                                    <h4 className="font-bold text-lg sm:text-xl">{event.title}</h4>
                                </div>
                                {event.createdBy === currentUserId && (
                                    <div className="hidden sm:flex flex-shrink-0 space-x-2">
                                        <button onClick={() => openModal(event)} className="p-2 bg-gray-700 rounded-md text-xs hover:bg-gray-600">Edit</button>
                                        <button onClick={() => handleDelete(event)} className="p-2 bg-red-600 rounded-md text-xs hover:bg-red-700">Delete</button>
                                    </div>
                                )}
                            </div>
    
                            <div className="mt-2 pl-0 sm:pl-2">
                                <div className="text-sm text-gray-400 flex flex-col sm:flex-row flex-wrap gap-y-1 gap-x-4">
                                    <div className="flex items-center gap-1.5"><IconCalendar /> {formatTimestamp(event.startTime)}</div>
                                    <div className="flex items-center gap-1.5"><IconLocation /> <span onClick={() => onMapClick(event.place.uri)} className="cursor-pointer hover:underline">{event.place.title}</span></div>
                                </div>
                                <div className="mt-3">
                                    <p className={`text-sm text-gray-300 whitespace-pre-wrap ${isLongDescription && !isExpanded ? 'line-clamp-3' : ''}`}>
                                        {event.description}
                                    </p>
                                    {isLongDescription && (
                                        <button onClick={() => toggleExpandEvent(event.id)} className="text-xs text-cyan-400 hover:underline mt-1 font-semibold">
                                            {isExpanded ? 'See less' : 'See more'}
                                        </button>
                                    )}
                                </div>
                            </div>
    
                            {event.createdBy === currentUserId && (
                                <div className="sm:hidden flex justify-end space-x-2 mt-4 pt-3 border-t border-gray-700">
                                    <button onClick={() => openModal(event)} className="p-2 bg-gray-700 rounded-md text-xs hover:bg-gray-600">Edit</button>
                                    <button onClick={() => handleDelete(event)} className="p-2 bg-red-600 rounded-md text-xs hover:bg-red-700">Delete</button>
                                </div>
                            )}
                        </div>
                    </div>
                )
            }) : (
                <div className="text-center p-8 bg-gray-800 rounded-lg">
                    <p className="text-gray-400">No events have been created for your school yet.</p>
                </div>
            )}
        </div>
    );
};

const MarketplaceView: React.FC<{ user: User | AdminUser; setViewingListing: (listing: MarketplaceListing) => void; }> = ({ user, setViewingListing }) => {
    const [listings, setListings] = useState<MarketplaceListing[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingListing, setEditingListing] = useState<MarketplaceListing | null>(null);
    const [isCategorizing, setIsCategorizing] = useState(false);
    const [confirmModal, setConfirmModal] = useState<{ message: React.ReactNode; onConfirm: () => void; } | null>(null);
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [expandedListings, setExpandedListings] = useState(new Set<string>());
    const [copiedLink, setCopiedLink] = useState<string | null>(null);

    const currentUserId = 'studentId' in user ? user.studentId : user.id;

    const initialFormState = {
        title: '',
        description: '',
        price: 0,
        category: 'Other' as MarketplaceListing['category'],
        condition: 'used' as MarketplaceListing['condition'],
        location: '',
        media: [] as MarketplaceMedia[],
    };
    
    const [formState, setFormState] = useState(initialFormState);

    const refreshListings = useCallback(() => {
        setListings(marketplaceService.getListings());
    }, []);

    useEffect(() => {
        refreshListings();
    }, [refreshListings]);

    const handleShare = async (listing: MarketplaceListing) => {
        const url = `${window.location.origin}${window.location.pathname}#/marketplace/view/listing/${listing.id}`;
        try {
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(url);
            } else {
                const textArea = document.createElement("textarea");
                textArea.value = url;
                textArea.style.position = 'fixed';
                textArea.style.top = '-9999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
            setCopiedLink(listing.id);
            setTimeout(() => setCopiedLink(null), 2500);
        } catch (err) {
            console.error('Could not copy link: ', err);
            prompt('Failed to copy. Please copy this link manually:', url);
        }
    };

    const toggleExpand = (listingId: string) => {
        setExpandedListings(prev => {
            const newSet = new Set(prev);
            if (newSet.has(listingId)) {
                newSet.delete(listingId);
            } else {
                newSet.add(listingId);
            }
            return newSet;
        });
    };

    const openModal = (listing: MarketplaceListing | null) => {
        setEditingListing(listing);
        if (listing) {
            setFormState({
                title: listing.title,
                description: listing.description,
                price: listing.price,
                category: listing.category,
                condition: listing.condition,
                location: listing.location,
                media: listing.media,
            });
        } else {
            setFormState(initialFormState);
        }
        setIsModalOpen(true);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormState(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const newMedia: MarketplaceMedia[] = [];
        for (let i = 0; i < files.length; i++) {
            const file = files.item(i);
            if (file) {
                const dataUrl = await fileToBase64(file);
                const type = file.type.startsWith('video/') ? 'video' : 'image';
                newMedia.push({ type, url: dataUrl });
            }
        }
        setFormState(prev => ({ ...prev, media: [...prev.media, ...newMedia]}));
    };

    const handleRemoveMedia = (index: number) => {
        setFormState(prev => ({ ...prev, media: prev.media.filter((_, i) => i !== index)}));
    };
    
    const handleAutoCategorize = async () => {
        if (!formState.title) return;
        setIsCategorizing(true);
        try {
            const category = await categorizeListing(formState.title, formState.description);
            setFormState(prev => ({ ...prev, category: category as MarketplaceListing['category'] }));
        } catch (error) {
            console.error("Auto-categorization failed", error);
            alert("Could not suggest a category automatically.");
        } finally {
            setIsCategorizing(false);
        }
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const fullUser = findFullUserById(currentUserId);
        if (!fullUser) {
            alert("Could not identify current user.");
            return;
        }

        const listingData = {
            ...formState,
            price: Number(formState.price),
            sellerId: currentUserId,
            sellerName: fullUser.name,
            sellerAvatar: fullUser.avatarUrl,
        };

        if (editingListing) {
            marketplaceService.updateListing(editingListing.id, listingData);
        } else {
            marketplaceService.createListing(listingData);
        }
        refreshListings();
        setIsModalOpen(false);
    };
    
    const handleDelete = (listing: MarketplaceListing) => {
        setConfirmModal({
            message: `Are you sure you want to delete the listing "${listing.title}"?`,
            onConfirm: () => {
                marketplaceService.deleteListing(listing.id);
                refreshListings();
                setConfirmModal(null);
            },
        });
    };

    const filteredListings = listings.filter(l => categoryFilter === 'All' || l.category === categoryFilter);
    const categories: MarketplaceListing['category'][] = ['Electronics', 'Clothing', 'Books', 'Furniture', 'Services', 'Other'];

    const renderModal = () => (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-[110] p-4">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl space-y-4 max-h-[90vh] flex flex-col">
                <h3 className="text-xl font-bold">{editingListing ? 'Edit Listing' : 'Create New Listing'}</h3>
                <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-2">
                    <input name="title" value={formState.title} onChange={handleFormChange} placeholder="Listing Title" required className="w-full p-2 bg-gray-700 rounded"/>
                    <textarea name="description" value={formState.description} onChange={handleFormChange} placeholder="Description" required rows={4} className="w-full p-2 bg-gray-700 rounded"/>
                    <div className="grid grid-cols-2 gap-4">
                        <input name="price" type="number" value={formState.price} onChange={handleFormChange} placeholder="Price (UGX)" required className="w-full p-2 bg-gray-700 rounded"/>
                        <input name="location" value={formState.location} onChange={handleFormChange} placeholder="Location" required className="w-full p-2 bg-gray-700 rounded"/>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <select name="condition" value={formState.condition} onChange={handleFormChange} className="w-full p-2 bg-gray-700 rounded"><option value="new">New</option><option value="used">Used</option></select>
                        <div className="flex gap-2">
                             <select name="category" value={formState.category} onChange={handleFormChange} className="w-full p-2 bg-gray-700 rounded"><option>Electronics</option><option>Clothing</option><option>Books</option><option>Furniture</option><option>Services</option><option>Other</option></select>
                             <button type="button" onClick={handleAutoCategorize} disabled={isCategorizing} className="px-3 py-1 bg-cyan-600 rounded text-sm disabled:bg-gray-500">{isCategorizing ? '...' : 'AI'}</button>
                        </div>
                    </div>
                    <div>
                        <label className="text-sm">Media (Images/Videos)</label>
                        <input type="file" multiple onChange={handleFileChange} accept="image/*,video/*" className="w-full text-xs mt-1" />
                        <div className="flex flex-wrap gap-2 mt-2">
                            {formState.media.map((media, index) => (
                                <div key={index} className="relative w-24 h-24 bg-gray-700 rounded">
                                    {media.type === 'image' ? <img src={media.url} className="w-full h-full object-cover rounded" /> : <video src={media.url} className="w-full h-full object-cover rounded" />}
                                    <button type="button" onClick={() => handleRemoveMedia(index)} className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">&times;</button>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4 border-t border-gray-700"><button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-600 rounded">Cancel</button><button type="submit" className="px-4 py-2 bg-cyan-600 rounded">Save Listing</button></div>
                </form>
            </div>
        </div>
    );
    
    return (
        <div className="space-y-6">
            {isModalOpen && renderModal()}
            {confirmModal && <ConfirmationModal isOpen={true} title="Confirm Deletion" message={confirmModal.message} onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal(null)} confirmButtonVariant="danger" />}
            <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold">Shop</h3>
                <button onClick={() => openModal(null)} className="flex items-center justify-center sm:gap-2 p-3 sm:px-4 sm:py-2 bg-cyan-600 hover:bg-cyan-700 font-semibold rounded-full sm:rounded-md text-white transition-all duration-200">
                    <PlusIcon />
                    <span className="hidden sm:inline whitespace-nowrap">Create Listing</span>
                </button>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
                <button onClick={() => setCategoryFilter('All')} className={`px-4 py-2 text-sm font-semibold rounded-full whitespace-nowrap ${categoryFilter === 'All' ? 'bg-cyan-600' : 'bg-gray-700 hover:bg-gray-600'}`}>All</button>
                {categories.map(cat => <button key={cat} onClick={() => setCategoryFilter(cat)} className={`px-4 py-2 text-sm font-semibold rounded-full whitespace-nowrap ${categoryFilter === cat ? 'bg-cyan-600' : 'bg-gray-700 hover:bg-gray-600'}`}>{cat}</button>)}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredListings.map(listing => {
                    const isLong = listing.description.length > 100;
                    const isExpanded = expandedListings.has(listing.id);
                    return (
                        <div key={listing.id} className="bg-gray-800 rounded-lg shadow-xl flex flex-col">
                            <div className="w-full h-48 bg-gray-700 rounded-t-lg overflow-hidden cursor-pointer" onClick={() => setViewingListing(listing)}>
                                {listing.media[0]?.type === 'image' && <img src={listing.media[0].url} alt={listing.title} className="w-full h-full object-cover"/>}
                                {listing.media[0]?.type === 'video' && <video src={listing.media[0].url} className="w-full h-full object-cover" controls />}
                            </div>
                            <div className="p-4 flex-grow flex flex-col">
                                <span className="text-xs font-semibold px-2 py-1 bg-cyan-500/20 text-cyan-300 rounded-full self-start mb-2">{listing.category}</span>
                                <h4 onClick={() => setViewingListing(listing)} className="font-bold text-lg text-white cursor-pointer hover:text-cyan-300">{listing.title}</h4>
                                <div className="text-sm text-gray-300 my-2 flex-grow">
                                    <p className={`${isLong && !isExpanded ? 'line-clamp-2' : ''}`}>
                                        {listing.description}
                                    </p>
                                    {isLong && (
                                        <button onClick={() => toggleExpand(listing.id)} className="text-xs text-cyan-400 hover:underline mt-1">
                                            {isExpanded ? 'See less' : 'See more'}
                                        </button>
                                    )}
                                </div>
                                <p className="font-bold text-xl text-cyan-400 my-2">UGX {listing.price.toLocaleString()}</p>
                                <div className="flex justify-between items-center text-sm text-gray-400 border-t border-gray-700 pt-3 mt-auto">
                                    <div className="flex items-center gap-2">
                                        <UserAvatar name={listing.sellerName} avatarUrl={listing.sellerAvatar} className="w-8 h-8 rounded-full" />
                                        <span>{listing.sellerName}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                         <button onClick={() => handleShare(listing)} className="p-2 hover:bg-gray-700 rounded-full" title="Copy Link">
                                            {copiedLink === listing.id ? <span className="text-xs text-cyan-400">Copied!</span> : <IconCopyLink />}
                                        </button>
                                        {listing.sellerId === currentUserId && (
                                            <>
                                                <button onClick={() => openModal(listing)} className="p-2 hover:bg-gray-700 rounded-full text-xs" title="Edit">Edit</button>
                                                <button onClick={() => handleDelete(listing)} className="p-2 hover:bg-gray-700 rounded-full text-xs text-red-400" title="Delete">Delete</button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    );
};

const MapPreviewModal: React.FC<{ url: string; onClose: () => void; }> = ({ url, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-[110] p-4" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg p-4 w-full max-w-3xl h-3/4 flex flex-col" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="self-end mb-2 text-white px-3 py-1 bg-red-600 rounded-md">Close</button>
                <iframe src={url} className="w-full h-full border-0 rounded-md" />
            </div>
        </div>
    );
};

const AddStoryModal: React.FC<{ user: User | AdminUser; onClose: () => void; onStoryPosted: () => void; }> = ({ user, onClose, onStoryPosted }) => {
    // ... Implementation for Add Story modal ...
    return <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-[110] p-4"><div className="bg-gray-800 rounded-lg p-4"><p>Add Story modal coming soon.</p><button onClick={onClose}>Close</button></div></div>;
};

const StoryViewer: React.FC<{
    initialUser: User | AdminUser;
    allUsersWithStories: (User | AdminUser)[];
    storiesByUser: Record<string, Story[]>;
    onClose: () => void;
    currentUserId: string;
    onStoryUpdate: () => void;
}> = ({ onClose }) => {
    // ... Implementation for Story Viewer ...
    return <div className="fixed inset-0 bg-black/90 flex justify-center items-center z-[110] p-4"><div className="bg-gray-800 rounded-lg p-4"><p>Story Viewer coming soon.</p><button onClick={onClose}>Close</button></div></div>;
};


const MiniChatWindow: React.FC<{
    currentUser: User;
    targetUser: User | AdminUser;
    onClose: () => void;
}> = ({ currentUser, targetUser, onClose }) => {
    const [message, setMessage] = useState('');
    const [sentMessages, setSentMessages] = useState<ChatMessage[]>([]);
    const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
    const [isScheduling, setIsScheduling] = useState(false);
    const [scheduleDateTime, setScheduleDateTime] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const targetUserId = 'studentId' in targetUser ? targetUser.studentId : targetUser.id;
    const currentUserId = 'studentId' in currentUser ? currentUser.studentId : (currentUser as any).id;

    const handleSend = () => {
        if (message.trim() || attachments.length > 0) {
            try {
                const conversation = chatService.startOrGetConversation(currentUserId, targetUserId);
                const sentMessage = chatService.sendMessage(conversation.id, currentUserId, message.trim(), attachments);
                setSentMessages(prev => [...prev, sentMessage]);
                setMessage('');
                setAttachments([]);
            } catch (error) {
                alert("Could not send message.");
            }
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const newAttachments: ChatAttachment[] = [];
        for (let i = 0; i < files.length; i++) {
            const file = files.item(i);
            if (file) {
                const dataUrl = await fileToBase64(file);
                let type: 'image' | 'video' | 'file' = 'file';
                if (file.type.startsWith('image/')) type = 'image';
                if (file.type.startsWith('video/')) type = 'video';
                newAttachments.push({ name: file.name, type, dataUrl });
            }
        }
        setAttachments(prev => [...prev, ...newAttachments]);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };
    
    const handleRemoveAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleOpenScheduleModal = () => {
        if (!message.trim() && attachments.length === 0) {
            alert("Please write a message or add an attachment to schedule.");
            return;
        }
        const now = new Date();
        now.setMinutes(now.getMinutes() + 10);
        const localDateTimeString = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}T${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        setScheduleDateTime(localDateTimeString);
        setIsScheduling(true);
    };

    const handleScheduleSubmit = () => {
        if ((message.trim() || attachments.length > 0) && scheduleDateTime) {
            const scheduleTime = new Date(scheduleDateTime).getTime();
            if (scheduleTime > Date.now()) {
                const conversation = chatService.startOrGetConversation(currentUserId, targetUserId);
                chatService.scheduleMessage(conversation.id, currentUserId, message.trim(), attachments, scheduleTime);
                alert('Message scheduled! You can view and manage it in the main Messages tab.');
                setMessage('');
                setAttachments([]);
                setIsScheduling(false);
                setScheduleDateTime('');
                onClose();
            } else {
                alert("Please select a time in the future.");
            }
        }
    };

    return (
        <>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple className="hidden" />
            
            {isScheduling && (
                <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-[110] p-4">
                    <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md space-y-4">
                        <h3 className="text-lg font-bold text-white">Schedule Message</h3>
                        <p className="bg-gray-700 p-3 rounded-md text-gray-300 border border-gray-600 truncate">{message || `${attachments.length} attachment(s)`}</p>
                        <div>
                            <label htmlFor="schedule-input" className="block text-sm font-medium text-gray-400 mb-1">Select date and time to send</label>
                            <input
                                id="schedule-input"
                                type="datetime-local"
                                value={scheduleDateTime}
                                onChange={e => setScheduleDateTime(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-600 rounded-md text-white border border-gray-500"
                            />
                        </div>
                        <div className="flex justify-end space-x-2 pt-2">
                            <button onClick={() => setIsScheduling(false)} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md font-semibold transition-colors">Cancel</button>
                            <button onClick={handleScheduleSubmit} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-md font-semibold transition-colors">Schedule</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="fixed bottom-4 right-24 w-80 h-96 bg-gray-800 rounded-t-lg shadow-xl flex flex-col z-[101] animate-slide-in-right">
                <header className="p-3 bg-gray-700 rounded-t-lg flex justify-between items-center flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <UserAvatar name={targetUser.name} avatarUrl={targetUser.avatarUrl} className="w-8 h-8 rounded-full" />
                        <p className="font-bold">{targetUser.name}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                </header>
                <div className="flex-1 p-3 overflow-y-auto space-y-2">
                    <p className="text-xs text-gray-500 text-center mb-2">This is a mini-chat. Full history is in the Messages tab.</p>
                    {sentMessages.map((msg, i) => (
                        <div key={i} className="flex justify-end">
                            <div className="bg-cyan-600 p-2 rounded-lg max-w-xs">
                                {msg.content}
                                {msg.attachments && msg.attachments.length > 0 && (
                                    <div className="text-xs italic text-cyan-200 mt-1">
                                        (+{msg.attachments.length} attachment{msg.attachments.length > 1 ? 's' : ''})
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                
                {attachments.length > 0 && (
                    <div className="p-2 border-t border-gray-700 flex-shrink-0">
                        <div className="flex gap-2 overflow-x-auto">
                            {attachments.map((att, index) => (
                                <div key={index} className="relative w-16 h-16 bg-gray-700 rounded-md flex-shrink-0 flex items-center justify-center">
                                    {att.type === 'image' && <img src={att.dataUrl} className="w-full h-full object-cover rounded-md" />}
                                    {att.type === 'video' && <video src={att.dataUrl} className="w-full h-full object-cover rounded-md" />}
                                    {att.type === 'file' && <IconComposerFile />}
                                    <button onClick={() => handleRemoveAttachment(index)} className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">&times;</button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                <footer className="p-2 border-t border-gray-700 flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => fileInputRef.current?.click()} title="Attach file" className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-600">
                        <IconAttachment />
                    </button>
                    <button onClick={handleOpenScheduleModal} title="Schedule message" className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-600">
                        <IconSchedule />
                    </button>
                    <input 
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && handleSend()}
                        placeholder={`Message ${targetUser.name}`} 
                        className="w-full px-3 py-2 bg-gray-700 rounded-full text-sm" 
                    />
                    <button onClick={handleSend} disabled={!message.trim() && attachments.length === 0} className="p-2 bg-cyan-600 rounded-full text-white disabled:bg-gray-600">
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M3.105 3.106a.75.75 0 01.884-.043l11.25 6.25a.75.75 0 010 1.372l-11.25 6.25a.75.75 0 01-1.043-.999l2.57-6.25-2.57-6.25a.75.75 0 01.159-1.03z" /></svg>
                    </button>
                </footer>
            </div>
        </>
    );
};


// --- USER PROFILE MODAL ---
const UserProfileModal: React.FC<{
    userToShow: User | AdminUser;
    currentUser: User | AdminUser;
    onClose: () => void;
    onStartMessage: (userId: string) => void;
}> = ({ userToShow, currentUser, onClose, onStartMessage }) => {
    const targetUserId = 'studentId' in userToShow ? userToShow.studentId : userToShow.id;
    const currentUserId = 'studentId' in currentUser ? currentUser.studentId : currentUser.id;

    const [followerCount, setFollowerCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [isFollowingState, setIsFollowingState] = useState(false);

    const refreshFollowData = useCallback(() => {
        setFollowerCount(groupService.getFollowerCount(targetUserId));
        setFollowingCount(groupService.getFollowingCount(targetUserId));
        setIsFollowingState(groupService.isFollowing(currentUserId, targetUserId));
    }, [currentUserId, targetUserId]);

    useEffect(() => {
        refreshFollowData();
    }, [refreshFollowData]);

    const handleFollowClick = () => {
        groupService.toggleFollow(currentUserId, targetUserId);
        refreshFollowData(); // Re-fetch data to update UI
    };

    const handleMessageClick = () => {
        onStartMessage(targetUserId);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-[110] p-4" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-sm text-center animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <UserAvatar name={userToShow.name} avatarUrl={userToShow.avatarUrl} className="w-24 h-24 rounded-full mx-auto border-4 border-gray-700" />
                <h3 className="text-xl font-bold mt-4">{userToShow.name}</h3>
                <p className="text-sm text-gray-400">{('role' in userToShow ? userToShow.role : '').replace('_', ' ')}</p>

                <div className="flex justify-center gap-6 my-4 border-y border-gray-700 py-3">
                    <div>
                        <p className="font-bold text-lg">{followerCount}</p>
                        <p className="text-xs text-gray-400">Followers</p>
                    </div>
                    <div>
                        <p className="font-bold text-lg">{followingCount}</p>
                        <p className="text-xs text-gray-400">Following</p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button 
                        onClick={handleFollowClick}
                        className={`w-full py-2 rounded-md font-semibold ${isFollowingState ? 'bg-gray-600 hover:bg-gray-500' : 'bg-cyan-600 hover:bg-cyan-700'}`}
                    >
                        {isFollowingState ? 'Unfollow' : 'Follow'}
                    </button>
                    <button 
                        onClick={handleMessageClick}
                        className="w-full py-2 bg-gray-600 hover:bg-gray-500 rounded-md font-semibold"
                    >
                        Message
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- NEW: LISTING DETAIL MODAL ---
const ListingDetailModal: React.FC<{
    listing: MarketplaceListing;
    onClose: () => void;
    onStartMessage: (userId: string) => void;
    currentUserId: string;
}> = ({ listing, onClose, onStartMessage, currentUserId }) => {
    const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
    const [copiedLink, setCopiedLink] = useState<string | null>(null);

    const nextMedia = () => setCurrentMediaIndex((prev) => (prev + 1) % listing.media.length);
    const prevMedia = () => setCurrentMediaIndex((prev) => (prev - 1 + listing.media.length) % listing.media.length);

    const handleMessageSeller = () => {
        onStartMessage(listing.sellerId);
        onClose();
    };
    
    const handleShare = async () => {
        const url = `${window.location.origin}${window.location.pathname}#/marketplace/view/listing/${listing.id}`;
        try {
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(url);
            } else {
                const textArea = document.createElement("textarea");
                textArea.value = url;
                textArea.style.position = 'fixed';
                textArea.style.top = '-9999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
            setCopiedLink(listing.id);
            setTimeout(() => setCopiedLink(null), 2500);
        } catch (err) {
            console.error('Could not copy link: ', err);
            prompt('Failed to copy automatically. Please copy this link manually:', url);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-[110] p-4 animate-fade-in-up" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg w-full max-w-4xl h-[90vh] flex flex-col md:flex-row overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="w-full md:w-3/5 h-64 md:h-full bg-gray-900 relative flex items-center justify-center">
                    {listing.media.length > 0 ? (
                        <>
                            {listing.media[currentMediaIndex].type === 'image' ? (
                                <img src={listing.media[currentMediaIndex].url} alt={listing.title} className="max-w-full max-h-full object-contain" />
                            ) : (
                                <video src={listing.media[currentMediaIndex].url} className="max-w-full max-h-full" controls autoPlay loop />
                            )}

                            {listing.media.length > 1 && (
                                <>
                                    <button onClick={prevMedia} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full hover:bg-black/80">&lt;</button>
                                    <button onClick={nextMedia} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full hover:bg-black/80">&gt;</button>
                                </>
                            )}
                        </>
                    ) : (
                        <div className="text-gray-500">No media available</div>
                    )}
                </div>

                <div className="w-full md:w-2/5 flex flex-col p-6 overflow-y-auto">
                    <div className="flex justify-between items-start">
                        <span className="text-xs font-semibold px-2 py-1 bg-cyan-500/20 text-cyan-300 rounded-full self-start mb-2">{listing.category}</span>
                        <div className="flex items-center gap-2">
                            <button onClick={handleShare} className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white" title="Copy Link">
                                {copiedLink === listing.id ? <span className="text-xs text-cyan-400">Copied!</span> : <IconCopyLink />}
                            </button>
                            <button onClick={onClose} className="text-2xl text-gray-400 hover:text-white">&times;</button>
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-white mt-2">{listing.title}</h2>
                    <p className="font-bold text-3xl text-cyan-400 my-4">UGX {listing.price.toLocaleString()}</p>
                    
                    <div className="text-sm space-y-2 mb-4">
                        <p><strong className="text-gray-400">Condition:</strong> <span className="capitalize">{listing.condition}</span></p>
                        <p><strong className="text-gray-400">Location:</strong> {listing.location}</p>
                    </div>

                    <div className="prose prose-sm prose-invert max-w-none text-gray-300 flex-grow">
                        <p>{listing.description}</p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-700">
                        <p className="text-sm text-gray-400 mb-2">Seller Information</p>
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <UserAvatar name={listing.sellerName} avatarUrl={listing.sellerAvatar} className="w-12 h-12 rounded-full" />
                                <div>
                                    <p className="font-semibold">{listing.sellerName}</p>
                                    <p className="text-xs text-gray-400">Posted {timeSince(listing.createdAt)}</p>
                                </div>
                            </div>
                            {listing.sellerId !== currentUserId && (
                                <button onClick={handleMessageSeller} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-sm font-semibold rounded-md">
                                    Message Seller
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


interface OnlineFeedPageProps {
    user: User | AdminUser;
    onLogout: () => void;
    onBackToDashboard?: () => void;
    onStartMessage?: (userId: string) => void;
}

const OnlineFeedPage: React.FC<OnlineFeedPageProps> = ({ user, onLogout, onBackToDashboard, onStartMessage }) => {
    type OnlineView = 'feed' | 'groups' | 'events' | 'marketplace' | 'chat';
    const [view, setView] = useState<OnlineView>('feed');
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    
    const [mapPreviewUrl, setMapPreviewUrl] = useState<string | null>(null);
    
    // State for Stories
    const [storiesByUser, setStoriesByUser] = useState<Record<string, Story[]>>({});
    const [viewingStoriesOfUser, setViewingStoriesOfUser] = useState<User | AdminUser | null>(null);
    const [isAddStoryModalOpen, setIsAddStoryModalOpen] = useState(false);

    // State for feed posts
    const [feedPosts, setFeedPosts] = useState<GroupPost[]>([]);
    
    // State for post management
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [postToDelete, setPostToDelete] = useState<GroupPost | null>(null);
    const [editingPostId, setEditingPostId] = useState<string | null>(null);
    const [editingContent, setEditingContent] = useState('');
    const [hiddenPostIds, setHiddenPostIds] = useState<Set<string>>(new Set());
    const menuRef = useRef<HTMLDivElement>(null);

    // State for comments
    const [comments, setComments] = useState<Record<string, PostComment[]>>({});
    const [commentingOnPostId, setCommentingOnPostId] = useState<string | null>(null);
    const [newComment, setNewComment] = useState('');

    // State for "See More" feature
    const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
    const [profileModalUser, setProfileModalUser] = useState<User | AdminUser | null>(null);
    
    const [chatTarget, setChatTarget] = useState<User | AdminUser | null>(null);
    const [viewingListing, setViewingListing] = useState<MarketplaceListing | null>(null);
    
    const currentUser = findFullUserById('studentId' in user ? user.studentId : user.id);
    const currentUserId = 'studentId' in user ? user.studentId : user.id;

    const school = useMemo(() => {
        if ('schoolId' in user && user.schoolId) {
            return getAllSchools().find(s => s.id === user.schoolId) || null;
        }
        return null;
    }, [user]);

    const allUsersWithStories = useMemo(() => {
        return Object.keys(storiesByUser)
            .map(userId => findFullUserById(userId))
            .filter((u): u is User | AdminUser => !!u);
    }, [storiesByUser]);

    const observer = useRef<IntersectionObserver | null>(null);
    const viewedPostsRef = useRef(new Set<string>());

    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash;
            if (hash.startsWith('#/marketplace/view/listing/')) {
                const listingId = hash.split('/').pop();
                if (listingId) {
                    const listing = marketplaceService.getListingById(listingId);
                    if (listing) {
                        setView('marketplace');
                        setViewingListing(listing);
                        window.history.replaceState("", document.title, window.location.pathname + window.location.search);
                    }
                }
            }
        };

        handleHashChange();
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    useEffect(() => {
        const intersectionCallback = (entries: IntersectionObserverEntry[]) => {
            entries.forEach(entry => {
                const postId = (entry.target as HTMLElement).dataset.postId;
                if (entry.isIntersecting && postId && !viewedPostsRef.current.has(postId)) {
                    groupService.incrementPostViewCount(postId);
                    viewedPostsRef.current.add(postId);
                    observer.current?.unobserve(entry.target);
                }
            });
        };
        observer.current = new IntersectionObserver(intersectionCallback, { threshold: 0.5 });
        const currentObserver = observer.current;
        return () => currentObserver.disconnect();
    }, []);

    const postObserverRef = useCallback((node: HTMLDivElement) => {
        if (node) {
            observer.current?.observe(node);
        }
    }, []);


    const refreshStories = useCallback(() => {
        setStoriesByUser(groupService.getStoriesGroupedByUser());
    }, []);

    const refreshFeed = useCallback(() => {
        const posts = groupService.getPostsForGroup('global_feed').sort((a,b) => b.timestamp - a.timestamp);
        setFeedPosts(posts);
    }, []);

    const loadComments = useCallback(async (postId: string) => {
        const postComments = groupService.getCommentsForPost(postId);
        setComments(prev => ({ ...prev, [postId]: postComments }));
    }, []);

    const handlePostComment = (postId: string) => {
        if (!newComment.trim()) return;
        groupService.addComment(postId, currentUserId, newComment.trim());
        setNewComment('');
        loadComments(postId);
    };

    const handleCommentClick = (postId: string) => {
        const newCommentingId = commentingOnPostId === postId ? null : postId;
        setCommentingOnPostId(newCommentingId);
        if (newCommentingId) {
            loadComments(newCommentingId);
        }
    };


    useEffect(() => {
        refreshStories();
        refreshFeed();
        const interval = setInterval(() => {
            refreshStories();
            refreshFeed();
        }, 5000);
        return () => clearInterval(interval);
    }, [refreshStories, refreshFeed]);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleStartMiniChat = (targetUserId: string) => {
        const target = findFullUserById(targetUserId);
        if (target) {
            setProfileModalUser(null); // Close profile modal
            setChatTarget(target); // Open mini chat
        }
    };
    
    const handleMapClick = (uri: string) => {
        try {
            const url = new URL(uri);
            const query = url.searchParams.get('query');

            if (query) {
                const embedUrl = `https://www.google.com/maps?output=embed&q=${encodeURIComponent(query)}`;
                setMapPreviewUrl(embedUrl);
            } else {
                window.open(uri, '_blank');
            }
        } catch (error) {
            window.open(uri, '_blank');
        }
    };

    const handlePost = (htmlContent: string) => {
        if (!currentUser) return;
        try {
            groupService.createPost('global_feed', currentUserId, htmlContent);
            refreshFeed();
        } catch (error) {
            console.error("Failed to create post:", error);
            alert("Could not post your message. Please try again.");
        }
    };
    
    const handleToggleReaction = (postId: string, emoji: string) => {
        if (!currentUser) return;
        groupService.toggleReaction(postId, currentUserId, emoji);
        refreshFeed();
    };

    const handleEdit = (post: GroupPost) => {
        setEditingPostId(post.id);
        setEditingContent(post.content);
        setOpenMenuId(null);
    };

    const handleSaveEdit = () => {
        if (editingPostId && editingContent.trim()) {
            groupService.updatePost(editingPostId, currentUserId, editingContent);
            refreshFeed();
            setEditingPostId(null);
            setEditingContent('');
        }
    };
    
    const handleHide = (postId: string) => {
        setHiddenPostIds(prev => new Set(prev).add(postId));
        setOpenMenuId(null);
    };

    const handleReport = () => {
        alert('Thank you, this post has been reported for review.');
        setOpenMenuId(null);
    };
    
    const handleDelete = (post: GroupPost) => {
        setPostToDelete(post);
        setOpenMenuId(null);
    };

    const confirmDelete = () => {
        if (postToDelete) {
            groupService.deleteMessage(postToDelete.id, currentUserId);
            refreshFeed();
            setPostToDelete(null);
        }
    };

    const toggleReadMore = (postId: string) => {
        setExpandedPosts(prev => {
            const newSet = new Set(prev);
            if (newSet.has(postId)) {
                newSet.delete(postId);
            } else {
                newSet.add(postId);
            }
            return newSet;
        });
    };

    const handleAvatarClick = (authorId: string) => {
        if (authorId === currentUserId) return;
        const fullUser = findFullUserById(authorId);
        if (fullUser) {
            setProfileModalUser(fullUser);
        }
    };

    const renderContent = () => {
        const schoolUser = currentUser as User;
        
        switch (view) {
            case 'groups':
                return <GroupsPage user={schoolUser} />;
            case 'chat':
                return <MessagesPage user={schoolUser} />;
            case 'events':
                return <EventsView user={currentUser!} school={school} onMapClick={handleMapClick} />;
            case 'marketplace':
                return <MarketplaceView user={currentUser!} setViewingListing={setViewingListing} />;
            case 'feed':
            default:
                return (
                    <div className="space-y-6">
                        {/* Stories Reel */}
                        <div className="bg-gray-800 p-4 rounded-lg">
                            <div className="flex items-center space-x-4 overflow-x-auto pb-2 -mx-4 px-4">
                                <div onClick={() => setIsAddStoryModalOpen(true)} className="flex flex-col items-center space-y-1 cursor-pointer flex-shrink-0 w-20 text-center">
                                    <div className="relative">
                                        <UserAvatar name={currentUser!.name} avatarUrl={currentUser!.avatarUrl} className="w-16 h-16 rounded-full border-2 border-dashed border-gray-500" />
                                        <div className="absolute bottom-0 right-0 bg-cyan-500 rounded-full p-1 border-2 border-gray-800">
                                            <PlusIcon className="w-3 h-3 text-white" />
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-400">Add Story</p>
                                </div>

                                {allUsersWithStories.map(storyUser => (
                                    <div key={'studentId' in storyUser ? storyUser.studentId : storyUser.id} onClick={() => setViewingStoriesOfUser(storyUser)} className="flex flex-col items-center space-y-1 cursor-pointer flex-shrink-0 w-20 text-center">
                                        <div className="p-0.5 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500">
                                            <div className="p-0.5 bg-gray-800 rounded-full">
                                                <UserAvatar name={storyUser.name} avatarUrl={storyUser.avatarUrl} className="w-14 h-14 rounded-full" />
                                            </div>
                                        </div>
                                        <p className="text-xs text-white truncate w-full text-center">{storyUser.name.split(' ')[0]}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* New Post Composer */}
                        <PostComposer user={currentUser!} onPost={handlePost} />

                        {/* Dynamic Feed Posts */}
                        {feedPosts.filter(post => !hiddenPostIds.has(post.id) && !post.isDeleted).map(post => {
                            const isAuthor = post.authorId === currentUserId;
                            const isEditing = editingPostId === post.id;
                            const userHasLiked = post.reactions?.['👍']?.includes(currentUserId);
                            const userHasDisliked = post.reactions?.['👎']?.includes(currentUserId);
                            const isExpanded = expandedPosts.has(post.id);
                            
                            // Check for long posts after stripping HTML tags
                            const tempDiv = document.createElement("div");
                            tempDiv.innerHTML = post.content;
                            const postTextContent = tempDiv.textContent || tempDiv.innerText || "";
                            const isLongPost = postTextContent.length > 350;

                            return (
                                <div key={post.id} ref={postObserverRef} data-post-id={post.id} className="bg-gray-800 p-4 rounded-lg shadow-md relative">
                                    <div className="flex items-start gap-3 mb-3">
                                        <div onClick={() => handleAvatarClick(post.authorId)} className="cursor-pointer">
                                            <UserAvatar name={post.authorName} avatarUrl={post.authorAvatar} className="w-10 h-10 rounded-full flex-shrink-0" />
                                        </div>
                                        <div className="flex-grow">
                                            <p onClick={() => handleAvatarClick(post.authorId)} className="font-bold cursor-pointer">{post.authorName}</p>
                                            <p className="text-xs text-gray-400">{timeSince(post.timestamp)}</p>
                                        </div>
                                        <div className="relative">
                                            <button onClick={() => setOpenMenuId(post.id)} className="p-2 rounded-full text-gray-400 hover:bg-gray-700">
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
                                            </button>
                                            {openMenuId === post.id && (
                                                <div ref={menuRef} className="absolute top-full right-0 mt-1 w-40 bg-gray-700 border border-gray-600 rounded-md shadow-lg z-20 text-sm">
                                                    {isAuthor && <button onClick={() => handleEdit(post)} className="w-full text-left px-3 py-2 hover:bg-gray-600">Edit Post</button>}
                                                    <button onClick={() => handleHide(post.id)} className="w-full text-left px-3 py-2 hover:bg-gray-600">Hide</button>
                                                    {!isAuthor && <button onClick={handleReport} className="w-full text-left px-3 py-2 hover:bg-gray-600">Report</button>}
                                                    {isAuthor && <button onClick={() => handleDelete(post)} className="w-full text-left px-3 py-2 text-red-400 hover:bg-gray-600">Delete</button>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {isEditing ? (
                                        <div>
                                            <div
                                                contentEditable="true"
                                                suppressContentEditableWarning={true}
                                                onInput={e => setEditingContent(e.currentTarget.innerHTML)}
                                                className="w-full bg-gray-700 p-3 rounded-lg min-h-[84px] focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                                dangerouslySetInnerHTML={{ __html: editingContent }}
                                            />
                                            <div className="flex justify-end gap-2 mt-2">
                                                <button onClick={() => setEditingPostId(null)} className="px-3 py-1 bg-gray-600 rounded-md text-xs">Cancel</button>
                                                <button onClick={handleSaveEdit} className="px-3 py-1 bg-cyan-600 rounded-md text-xs">Save</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <div
                                                className={`prose prose-sm prose-invert max-w-none text-gray-300 [&_img]:rounded-lg [&_video]:rounded-lg [&_img]:max-h-96 [&_video]:max-h-96 [&_img]:mx-auto [&_video]:mx-auto ${isLongPost && !isExpanded ? 'line-clamp-4' : ''}`}
                                                dangerouslySetInnerHTML={{ __html: post.content }}
                                            />
                                            {isLongPost && (
                                                <button onClick={() => toggleReadMore(post.id)} className="text-cyan-400 hover:underline text-sm mt-2">
                                                    {isExpanded ? 'See less' : 'See more'}
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    <div className="mt-3 flex justify-between items-center text-sm text-gray-400">
                                        <div className="flex items-center gap-2">
                                            {(post.reactions && Object.keys(post.reactions).length > 0) && (
                                                <div className="flex items-center">
                                                    {Object.entries(post.reactions).map(([emoji, userIds]) =>
                                                        (userIds as string[]).length > 0 && <span key={emoji} className="-ml-1">{emoji}</span>
                                                    )}
                                                    <span className="ml-2">{Object.values(post.reactions).reduce((acc: number, val) => acc + (val as string[]).length, 0)}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {(comments[post.id]?.length || 0) > 0 && (
                                                <button onClick={() => handleCommentClick(post.id)} className="hover:underline">
                                                    {comments[post.id].length} comment{comments[post.id].length > 1 ? 's' : ''}
                                                </button>
                                            )}
                                            <div className="flex items-center gap-1.5">
                                                <IconEye />
                                                <span>{post.views || 0}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-2 pt-2 border-t border-gray-700 flex justify-around">
                                        <button onClick={() => handleToggleReaction(post.id, '👍')} className={`flex items-center justify-center w-full py-2 rounded-md transition-colors ${userHasLiked ? 'text-cyan-400' : 'text-gray-400 hover:bg-gray-700'}`}>
                                            <IconLike /> <span className="hidden sm:inline ml-1.5">Like</span>
                                        </button>
                                        <button onClick={() => handleToggleReaction(post.id, '👎')} className={`flex items-center justify-center w-full py-2 rounded-md transition-colors ${userHasDisliked ? 'text-red-400' : 'text-gray-400 hover:bg-gray-700'}`}>
                                            <IconDislike /> <span className="hidden sm:inline ml-1.5">Dislike</span>
                                        </button>
                                        <button onClick={() => handleCommentClick(post.id)} className="flex items-center justify-center w-full py-2 rounded-md text-gray-400 hover:bg-gray-700">
                                            <IconComment /> <span className="hidden sm:inline ml-1.5">Comment</span>
                                        </button>
                                        <button onClick={() => alert('Share functionality is coming soon!')} className="flex items-center justify-center w-full py-2 rounded-md text-gray-400 hover:bg-gray-700">
                                            <IconCopyLink /> <span className="hidden sm:inline ml-1.5">Share</span>
                                        </button>
                                    </div>

                                    {commentingOnPostId === post.id && (
                                        <div className="mt-3 pt-3 border-t border-gray-700 space-y-3">
                                            {comments[post.id]?.map(comment => (
                                                <div key={comment.id} className="flex items-start gap-2">
                                                    <UserAvatar name={comment.authorName} avatarUrl={comment.authorAvatar} className="w-8 h-8 rounded-full flex-shrink-0" />
                                                    <div className="bg-gray-700 p-2 rounded-lg">
                                                        <p className="font-bold text-sm text-white">{comment.authorName}</p>
                                                        <p className="text-sm text-gray-300">{comment.content}</p>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="flex items-center gap-2">
                                                <UserAvatar name={currentUser!.name} avatarUrl={currentUser!.avatarUrl} className="w-8 h-8 rounded-full flex-shrink-0" />
                                                <input
                                                    value={newComment}
                                                    onChange={e => setNewComment(e.target.value)}
                                                    onKeyPress={e => e.key === 'Enter' && handlePostComment(post.id)}
                                                    placeholder="Write a comment..."
                                                    className="w-full px-3 py-2 bg-gray-700 rounded-full text-sm"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                );
        }
    };

    if (!currentUser) {
        return <div className="text-center p-8">Error: Could not load user data.</div>;
    }

    return (
        <div className="h-full w-full bg-gray-900 text-white flex font-sans">
            {postToDelete && (
                <ConfirmationModal
                    isOpen={true}
                    title="Delete Post"
                    message={<p>Are you sure you want to permanently delete this post? This action cannot be undone.</p>}
                    onConfirm={confirmDelete}
                    onCancel={() => setPostToDelete(null)}
                    confirmText="Delete"
                    confirmButtonVariant="danger"
                />
            )}
            
            <button
                onClick={() => setIsMobileMenuOpen(prev => !prev)}
                className="lg:hidden fixed top-4 right-4 z-50 p-2 bg-gray-700 rounded-full text-white shadow-lg"
                aria-label="Toggle Menu"
            >
                 <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
            </button>
            
            <aside className={`bg-gray-800 text-white flex-shrink-0 flex flex-col p-4 transition-all duration-300 lg:flex lg:w-64 ${isMobileMenuOpen ? 'w-1/3 flex' : 'hidden'}`}>
                <div className="flex items-center justify-start mb-8 h-10">
                    <div className="flex items-center space-x-3 overflow-hidden">
                        <IconOnline />
                        <h1 className="font-bold text-xl text-cyan-400 truncate">Online</h1>
                    </div>
                </div>
                <nav className="space-y-2">
                    {(['feed', 'chat', 'groups', 'events', 'marketplace'] as const).map(v => {
                        const icons = { feed: <IconNavFeed />, chat: <IconNavChat />, groups: <IconNavGroups />, events: <IconNavEvents />, marketplace: <IconNavMarketplace />};
                        let label = v.charAt(0).toUpperCase() + v.slice(1);
                        if (v === 'marketplace') {
                            label = 'Shop';
                        }
                        return (
                            <button 
                                key={v} 
                                onClick={() => { setView(v); setIsMobileMenuOpen(false); }} 
                                className={`w-full flex items-center gap-3 p-3 rounded-lg text-left group ${view === v ? 'bg-cyan-600' : 'hover:bg-gray-700'} justify-start`}
                            >
                                {icons[v]} 
                                <span>{label}</span>
                            </button>
                        )
                    })}
                </nav>
            </aside>
            
            <main className={`overflow-y-auto lg:flex-1 ${isMobileMenuOpen ? 'w-2/3' : 'w-full'}`}>
                <div className="max-w-3xl mx-auto p-4 md:p-6">
                    {renderContent()}
                </div>
            </main>
            
            <aside className="hidden xl:block w-72 bg-gray-800 p-4 border-l border-gray-700">
                <h3 className="font-bold mb-4">Announcements</h3>
                {/* Placeholder content */}
            </aside>
            
            {/* Modals and Overlays */}
            {isProfileOpen && (
                <ProfilePage
                    user={currentUser}
                    onClose={() => setIsProfileOpen(false)}
                    onProfileUpdate={(updatedUser) => {
                        // Logic to update user state if needed
                    }}
                />
            )}
            
            {chatTarget && currentUser && (
                <MiniChatWindow
                    currentUser={currentUser as User}
                    targetUser={chatTarget}
                    onClose={() => setChatTarget(null)}
                />
            )}
            {viewingListing && currentUser && (
                <ListingDetailModal
                    listing={viewingListing}
                    onClose={() => setViewingListing(null)}
                    onStartMessage={handleStartMiniChat}
                    currentUserId={currentUserId}
                />
            )}

            {mapPreviewUrl && (
                <MapPreviewModal url={mapPreviewUrl} onClose={() => setMapPreviewUrl(null)} />
            )}
            {isAddStoryModalOpen && currentUser && (
                <AddStoryModal 
                    user={currentUser} 
                    onClose={() => setIsAddStoryModalOpen(false)} 
                    onStoryPosted={() => {
                        setIsAddStoryModalOpen(false);
                        refreshStories();
                    }}
                />
            )}
            {viewingStoriesOfUser && (
                <StoryViewer
                    initialUser={viewingStoriesOfUser}
                    allUsersWithStories={allUsersWithStories}
                    storiesByUser={storiesByUser}
                    onClose={() => setViewingStoriesOfUser(null)}
                    currentUserId={currentUserId}
                    onStoryUpdate={refreshStories}
                />
            )}
            {profileModalUser && currentUser && (
                <UserProfileModal
                    userToShow={profileModalUser}
                    currentUser={currentUser}
                    onClose={() => setProfileModalUser(null)}
                    onStartMessage={handleStartMiniChat}
                />
            )}
        </div>
    );
};

export default OnlineFeedPage;
