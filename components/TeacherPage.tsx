import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, SchoolClass } from '../types';
import ProfilePage from './ProfilePage';
import NotificationBell from './NotificationBell';
import { APP_TITLE } from '../constants';
import * as classService from '../services/classService';
import * as studentService from '../services/studentService';
import * as topicService from '../services/topicService';
import UserAvatar from './UserAvatar';
import ConfirmationModal from './ConfirmationModal';
import { createBroadcastNotification } from '../services/notificationService';
import TeacherCalendarView from './TeacherCalendarView';

// --- SVG Icons ---
const DashboardIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>);
const ResultsIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 2a1 1 0 00-1 1v1H3a1 1 0 000 2h1v1a1 1 0 001 1h12a1 1 0 001-1V6h1a1 1 0 100-2h-1V3a1 1 0 00-1-1H5zM4 9a1 1 0 00-1 1v7a1 1 0 001 1h12a1 1 0 001-1v-7a1 1 0 00-1-1H4z" clipRule="evenodd" /></svg>);
const TopicsIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M3.5 2.75a.75.75 0 00-1.5 0v14.5a.75.75 0 001.5 0v-1.383c.394.22.84.383 1.317.488A3.001 3.001 0 109 13.5a.75.75 0 00-1.5 0 1.5 1.5 0 11-3 0 .75.75 0 00-1.5 0 3.001 3.001 0 004.183 2.817c.477.105.923.268 1.317.488v1.383a.75.75 0 001.5 0V2.75a.75.75 0 00-.75-.75H3.5zM8 5a1 1 0 110-2h8a1 1 0 110 2H8zM8 9a1 1 0 110-2h8a1 1 0 110 2H8zm0 4a1 1 0 110-2h8a1 1 0 110 2H8z" /></svg>);
const AnnounceIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a6 6 0 00-6 6v3.586l-1.707 1.707A1 1 0 003 15h14a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" /></svg>);
const HamburgerIcon = () => (<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>);
const CloseIcon = () => (<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>);
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>;
const DeleteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>;
const UsersIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>);
const AcademicCapIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5 8.281V13.5a1 1 0 001 1h8a1 1 0 001-1V8.281l2.394-1.36a1 1 0 000-1.84l-7-3zM6 9.319l4 2.286 4-2.286V13.5H6V9.319z" /></svg>;
const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>;


// --- Announcements View Sub-Component ---
const TeacherAnnouncementsView: React.FC<{ user: User }> = ({ user }) => {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [feedback, setFeedback] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const showFeedback = (msg: string) => {
        setFeedback(msg);
        setTimeout(() => setFeedback(''), 4000);
    };

    const handleSendAnnouncement = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !message.trim() || !user.schoolId) return;

        setIsLoading(true);
        try {
            const schoolUsers = studentService.getSchoolUsersBySchoolIds([user.schoolId]);
            const studentIds = schoolUsers.filter(u => u.role === 'student').map(s => s.studentId);
            
            if (studentIds.length === 0) {
                showFeedback("There are no students in this school to send notifications to.");
                setIsLoading(false);
                return;
            }

            createBroadcastNotification(title, message, studentIds);

            showFeedback(`Announcement sent to ${studentIds.length} student(s).`);
            setTitle('');
            setMessage('');
        } catch (error) {
            showFeedback("Failed to send announcement.");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6">Send Announcement</h2>
            <div className="bg-gray-800 p-6 rounded-lg max-w-2xl mx-auto">
                {feedback && <div className="bg-green-500/20 text-green-300 p-3 rounded-md mb-4 text-sm">{feedback}</div>}
                <form onSubmit={handleSendAnnouncement} className="space-y-4">
                    <div>
                        <label htmlFor="announcement-title" className="block text-sm font-medium text-gray-300 mb-1">Title</label>
                        <input
                            id="announcement-title"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="e.g., Upcoming Sports Day"
                            required
                            className="w-full p-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="announcement-message" className="block text-sm font-medium text-gray-300 mb-1">Message</label>
                        <textarea
                            id="announcement-message"
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            placeholder="Enter the details of your announcement here..."
                            required
                            rows={5}
                            className="w-full p-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                    </div>
                    <div className="text-right">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-md font-semibold transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Sending...' : 'Send to All Students'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// --- Topics View Sub-Component ---
const TeacherTopicsView: React.FC<{ user: User }> = ({ user }) => {
    const [topics, setTopics] = useState<string[]>([]);
    const [newTopic, setNewTopic] = useState('');
    const [feedback, setFeedback] = useState('');

    useEffect(() => {
        if (user.schoolId) {
            const savedTopics = topicService.getTopicsForSchool(user.schoolId);
            setTopics(savedTopics);
        }
    }, [user.schoolId]);

    const showFeedback = (message: string) => {
        setFeedback(message);
        setTimeout(() => setFeedback(''), 3000);
    };
    
    const handleAddTopic = (e: React.FormEvent) => {
        e.preventDefault();
        if (newTopic.trim() && user.schoolId) {
            const updatedTopics = [...topics, newTopic.trim()];
            topicService.saveTopicsForSchool(user.schoolId, updatedTopics);
            setTopics(updatedTopics);
            showFeedback(`Topic "${newTopic.trim()}" added.`);
            setNewTopic('');
        }
    };

    const handleDeleteTopic = (topicToDelete: string) => {
        if (window.confirm(`Are you sure you want to delete the topic "${topicToDelete}"?`)) {
            if (user.schoolId) {
                const updatedTopics = topics.filter(t => t !== topicToDelete);
                topicService.saveTopicsForSchool(user.schoolId, updatedTopics);
                setTopics(updatedTopics);
                showFeedback(`Topic "${topicToDelete}" deleted.`);
            }
        }
    };

    return (
        <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6">Manage Term Topics</h2>
            <div className="bg-gray-800 p-6 rounded-lg space-y-6 max-w-2xl mx-auto">
                <p className="text-gray-400 text-sm">
                    Enter the topics for this term. These will appear for students in the Exploration module.
                </p>

                {feedback && <div className="bg-green-500/20 text-green-300 p-3 rounded-md text-sm">{feedback}</div>}

                <form onSubmit={handleAddTopic} className="flex items-center gap-2">
                    <input
                        value={newTopic}
                        onChange={e => setNewTopic(e.target.value)}
                        placeholder="Enter a new topic and press Add"
                        className="w-full p-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                    <button type="submit" className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-md font-semibold whitespace-nowrap">
                        + Add
                    </button>
                </form>

                <div className="border-t border-gray-700 pt-4">
                    <h3 className="font-semibold mb-2">Current Topics:</h3>
                    {topics.length > 0 ? (
                        <ul className="space-y-2">
                            {topics.map((topic, index) => (
                                <li key={index} className="flex justify-between items-center p-2 bg-gray-700 rounded-md">
                                    <span>{topic}</span>
                                    <button
                                        onClick={() => handleDeleteTopic(topic)}
                                        className="p-1.5 text-red-400 hover:bg-red-500/20 rounded-full"
                                        title={`Delete ${topic}`}
                                    >
                                        <DeleteIcon />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-400 text-center py-4">No topics have been added for this term.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Results View Sub-Component ---
const TeacherResultsView: React.FC<{ user: User }> = ({ user }) => {
    const [classes, setClasses] = useState<SchoolClass[]>([]);
    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedStream, setSelectedStream] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: React.ReactNode } | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // State for class management modal
    const [isClassModalOpen, setIsClassModalOpen] = useState(false);
    const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
    const [classForm, setClassForm] = useState({ name: '', level: 'O-Level' as 'O-Level' | 'A-Level', currentStream: '', streams: [] as string[] });
    const [classError, setClassError] = useState('');
    const [classModalView, setClassModalView] = useState<'list' | 'form' | 'manage_students'>('list');
    const [successMessage, setSuccessMessage] = useState('');
    const [confirmModal, setConfirmModal] = useState<{ message: React.ReactNode; onConfirm: () => void; } | null>(null);

    // State for student assignment
    const [schoolStudents, setSchoolStudents] = useState<User[]>([]);
    const [studentSearchTerm, setStudentSearchTerm] = useState('');
    const [managingStream, setManagingStream] = useState('');

    const refreshClasses = () => {
        if (user.schoolId) {
            setClasses(classService.getClassesForSchool(user.schoolId));
        }
    };
    
    const refreshSchoolStudents = () => {
        if (user.schoolId) {
            setSchoolStudents(studentService.getSchoolUsersBySchoolIds([user.schoolId]));
        }
    };

    useEffect(() => {
        refreshClasses();
        refreshSchoolStudents();
    }, [user.schoolId]);
    
    const { assignedStudents, unassignedStudents } = useMemo(() => {
        if (classModalView !== 'manage_students' || !editingClass) {
            return { assignedStudents: [], unassignedStudents: [] };
        }
        const assigned = schoolStudents.filter(s => s.class === editingClass.name && s.stream === managingStream);
        const unassigned = schoolStudents.filter(s => 
            (s.class !== editingClass.name || s.stream !== managingStream) &&
            (s.name.toLowerCase().includes(studentSearchTerm.toLowerCase()) || s.studentId.toLowerCase().includes(studentSearchTerm.toLowerCase()))
        );
        return { assignedStudents: assigned, unassignedStudents: unassigned };
    }, [editingClass, managingStream, schoolStudents, studentSearchTerm, classModalView]);

    const selectedClass = classes.find(c => c.id === selectedClassId);

    const resetSuccessMessage = () => setTimeout(() => setSuccessMessage(''), 4000);

    const handleUpload = () => {
        if (!file || !selectedClassId || !user.schoolId) return;

        setIsUploading(true);
        setFeedback(null);

        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            try {
                const result = studentService.bulkUploadInternalResults(text, user.schoolId!, selectedClassId, selectedStream || undefined);
                if (result.errorCount > 0) {
                    setFeedback({
                        type: 'error',
                        message: (
                            <>
                                <p>Upload complete with {result.errorCount} errors:</p>
                                <ul className="list-disc list-inside text-xs mt-2">
                                    {result.errors.slice(0, 5).map((err, i) => <li key={i}>{err}</li>)}
                                </ul>
                            </>
                        )
                    });
                } else {
                    setFeedback({ type: 'success', message: `${result.successCount} student term records updated successfully!` });
                }
            } catch (err) {
                setFeedback({ type: 'error', message: (err as Error).message });
            } finally {
                setIsUploading(false);
                setFile(null);
                if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                }
            }
        };
        reader.readAsText(file);
    };

    const handleAddStream = () => {
        const newStream = classForm.currentStream.trim();
        if (newStream && !classForm.streams.includes(newStream)) {
            setClassForm(prev => ({ ...prev, streams: [...prev.streams, newStream], currentStream: '' }));
        }
    };

    const handleRemoveStream = (index: number) => {
        setClassForm(prev => ({ ...prev, streams: prev.streams.filter((_, i) => i !== index) }));
    };

    const handleSaveClass = () => {
        if (!user.schoolId) return;
        setClassError('');
        if (!classForm.name.trim()) {
            setClassError('Class Name is required.');
            return;
        }
        try {
            if (editingClass) {
                classService.updateClass(editingClass.id, user.schoolId, classForm.name, classForm.streams);
                setSuccessMessage('Class updated successfully!');
            } else {
                classService.createClass(user.schoolId, classForm.name, classForm.level, classForm.streams);
                setSuccessMessage('Class created successfully!');
            }
            refreshClasses();
            setClassModalView('list');
            resetSuccessMessage();
        } catch (err) {
            setClassError(err instanceof Error ? err.message : 'Failed to save class.');
        }
    };

    const handleDeleteClass = (classId: string) => {
        setConfirmModal({
            message: "Are you sure you want to delete this class? This action cannot be undone.",
            onConfirm: () => {
                classService.deleteClass(classId);
                setSuccessMessage('Class deleted successfully!');
                refreshClasses();
                resetSuccessMessage();
                setConfirmModal(null);
            }
        });
    };

    const handleAddStudentToClass = (student: User) => {
        if (!editingClass) return;
        studentService.updateSchoolUser(student.studentId, { class: editingClass.name, stream: managingStream });
        refreshSchoolStudents(); // Re-fetch from service
    };

    const handleRemoveStudentFromClass = (student: User) => {
        studentService.updateSchoolUser(student.studentId, { class: '', stream: '' });
        refreshSchoolStudents();
    };


    const csvTemplate = "data:text/csv;charset=utf-8," + encodeURIComponent(
        "studentid,term,subject,score\nS001,Term 1 2024,Mathematics,85\nS001,Term 1 2024,English,72\nS002,Term 1 2024,Mathematics,91"
    );

    const renderClassModal = () => {
        if (!isClassModalOpen) return null;

        return (
            <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4">
                <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl space-y-4 max-h-[90vh] flex flex-col">
                    {classModalView === 'list' ? (
                        <>
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-bold">Manage Classes</h3>
                                <button onClick={() => setIsClassModalOpen(false)} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                            </div>
                            {successMessage && <div className="bg-green-500/20 text-green-300 p-2 rounded-md text-sm">{successMessage}</div>}
                            <button
                                onClick={() => {
                                    setEditingClass(null);
                                    setClassForm({ name: '', level: 'O-Level', currentStream: '', streams: [] });
                                    setClassModalView('form');
                                    setClassError('');
                                }}
                                className="w-full py-2 bg-cyan-600 hover:bg-cyan-700 rounded-md font-semibold mb-4"
                            >
                                Create New Class
                            </button>
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {classes.length > 0 ? classes.map(c => (
                                    <div key={c.id} className="bg-gray-700 p-3 rounded-md flex justify-between items-center">
                                        <div>
                                            <p className="font-semibold">{c.name}</p>
                                            <p className="text-xs text-gray-400">{c.streams.join(', ') || 'No streams'}</p>
                                        </div>
                                        <div className="space-x-2">
                                             <button
                                                onClick={() => {
                                                    setEditingClass(c);
                                                    setManagingStream(c.streams[0] || '');
                                                    setClassModalView('manage_students');
                                                }}
                                                className="p-2 bg-indigo-600 text-xs rounded-md hover:bg-indigo-700" title="Assign Students"
                                            >
                                                <UsersIcon />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setEditingClass(c);
                                                    setClassForm({ name: c.name, level: c.level, currentStream: '', streams: c.streams });
                                                    setClassModalView('form');
                                                    setClassError('');
                                                }}
                                                className="p-2 bg-gray-600 text-xs rounded-md hover:bg-gray-500" title="Edit Class"
                                            >
                                                <EditIcon />
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteClass(c.id); }} className="p-2 bg-red-600 text-xs rounded-md hover:bg-red-700" title="Delete Class">
                                                <DeleteIcon />
                                            </button>
                                        </div>
                                    </div>
                                )) : (
                                    <p className="text-center text-gray-400 py-4">No classes created yet.</p>
                                )}
                            </div>
                        </>
                    ) : classModalView === 'form' ? (
                        <>
                            <h3 className="text-xl font-bold">{editingClass ? 'Edit Class' : 'Create New Class'}</h3>
                            {classError && <p className="text-red-400 text-sm">{classError}</p>}
                            <div>
                                <label className="text-sm text-gray-300">Class Name</label>
                                <input value={classForm.name} onChange={e => setClassForm({ ...classForm, name: e.target.value })} placeholder="e.g., S.1" className="w-full p-2 bg-gray-700 rounded-md mt-1"/>
                            </div>
                            <div>
                                <label className="text-sm text-gray-300">Level</label>
                                <select value={classForm.level} onChange={e => setClassForm({ ...classForm, level: e.target.value as 'O-Level' | 'A-Level' })} className="w-full p-2 bg-gray-700 rounded-md mt-1">
                                    <option value="O-Level">O-Level</option>
                                    <option value="A-Level">A-Level</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm text-gray-300">Streams (Optional)</label>
                                <div className="flex items-center gap-2 mt-1">
                                    <input value={classForm.currentStream} onChange={e => setClassForm({ ...classForm, currentStream: e.target.value })} placeholder="e.g., A, B, North" className="w-full p-2 bg-gray-700 rounded-md"/>
                                    <button type="button" onClick={handleAddStream} className="px-4 py-2 bg-gray-600 rounded-md">Add</button>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {classForm.streams.map((stream, index) => (
                                        <div key={index} className="flex items-center gap-2 px-2 py-1 bg-gray-600 rounded-full">
                                            <span className="text-sm">{stream}</span>
                                            <button onClick={() => handleRemoveStream(index)} className="text-xs text-red-400">&times;</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-end space-x-2 pt-2">
                                <button type="button" onClick={() => setClassModalView('list')} className="px-4 py-2 bg-gray-600 rounded-md">Back to List</button>
                                <button type="button" onClick={handleSaveClass} className="px-4 py-2 bg-cyan-600 rounded-md">Save Class</button>
                            </div>
                        </>
                    ) : ( // manage_students view
                        <>
                             <div className="flex justify-between items-center flex-shrink-0">
                                <h3 className="text-xl font-bold">Assign Students to {editingClass?.name}</h3>
                                <button onClick={() => setClassModalView('list')} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                            </div>
                            {editingClass && editingClass.streams.length > 0 && (
                                <div className="flex-shrink-0">
                                    <label className="text-sm text-gray-300">Select Stream</label>
                                    <select value={managingStream} onChange={e => setManagingStream(e.target.value)} className="w-full p-2 bg-gray-700 rounded-md mt-1">
                                        {editingClass.streams.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow overflow-hidden">
                                <div className="bg-gray-900/50 p-3 rounded-lg flex flex-col">
                                    <h4 className="font-semibold mb-2 flex-shrink-0">Assigned Students ({assignedStudents.length})</h4>
                                    <div className="space-y-2 overflow-y-auto">
                                        {assignedStudents.map(student => (
                                            <div key={student.studentId} className="flex justify-between items-center p-2 bg-gray-700 rounded-md">
                                                <div className="flex items-center gap-2"><UserAvatar name={student.name} avatarUrl={student.avatarUrl} className="w-8 h-8 rounded-full text-xs" /><span>{student.name}</span></div>
                                                <button onClick={() => handleRemoveStudentFromClass(student)} className="px-2 py-1 text-xs bg-red-600 rounded-md">Remove</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-gray-900/50 p-3 rounded-lg flex flex-col">
                                    <h4 className="font-semibold mb-2 flex-shrink-0">Unassigned Students ({unassignedStudents.length})</h4>
                                     <input
                                        type="text"
                                        value={studentSearchTerm}
                                        onChange={e => setStudentSearchTerm(e.target.value)}
                                        placeholder="Search by name or ID..."
                                        className="w-full p-2 bg-gray-700 rounded-md mb-2 flex-shrink-0"
                                    />
                                    <div className="space-y-2 overflow-y-auto">
                                        {unassignedStudents.map(student => (
                                             <div key={student.studentId} className="flex justify-between items-center p-2 bg-gray-700 rounded-md">
                                                <div className="flex items-center gap-2"><UserAvatar name={student.name} avatarUrl={student.avatarUrl} className="w-8 h-8 rounded-full text-xs"/><span>{student.name} <span className="text-xs text-gray-400">({student.class})</span></span></div>
                                                <button onClick={() => handleAddStudentToClass(student)} className="px-2 py-1 text-xs bg-green-600 rounded-md">Add</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div>
            {renderClassModal()}
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
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6">Upload Student Results</h2>
            <div className="bg-gray-800 p-6 rounded-lg space-y-6 max-w-2xl mx-auto">
                <div className="text-gray-400 text-sm space-y-2">
                    <p>Upload a CSV file containing student results. The system will group results by student and term, then update their academic records.</p>
                    <p>
                        <strong>Required columns:</strong>
                        <code className="bg-gray-900 text-cyan-300 px-2 py-1 rounded-md text-xs ml-2">studentid</code>,
                        <code className="bg-gray-900 text-cyan-300 px-2 py-1 rounded-md text-xs mx-1">term</code>,
                        <code className="bg-gray-900 text-cyan-300 px-2 py-1 rounded-md text-xs mx-1">subject</code>,
                        <code className="bg-gray-900 text-cyan-300 px-2 py-1 rounded-md text-xs ml-1">score</code>
                    </p>
                </div>
                
                {feedback && (
                    <div className={`p-4 rounded-md text-sm ${feedback.type === 'success' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                        {feedback.message}
                    </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="classSelect" className="block text-sm font-medium text-gray-300 mb-1">Class</label>
                        <select
                            id="classSelect"
                            value={selectedClassId}
                            onChange={e => {
                                setSelectedClassId(e.target.value);
                                setSelectedStream(''); // Reset stream on class change
                            }}
                            className="w-full p-2 bg-gray-700 rounded-md"
                        >
                            <option value="">-- Select a Class --</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    {selectedClass && selectedClass.streams.length > 0 && (
                        <div>
                            <label htmlFor="streamSelect" className="block text-sm font-medium text-gray-300 mb-1">Stream (Optional)</label>
                            <select
                                id="streamSelect"
                                value={selectedStream}
                                onChange={e => setSelectedStream(e.target.value)}
                                className="w-full p-2 bg-gray-700 rounded-md"
                            >
                                <option value="">All Streams</option>
                                {selectedClass.streams.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    )}
                </div>
                
                <div>
                     <label htmlFor="fileUpload" className="block text-sm font-medium text-gray-300 mb-1">CSV File</label>
                     <input
                        ref={fileInputRef}
                        id="fileUpload"
                        type="file"
                        accept=".csv"
                        onChange={e => setFile(e.target.files ? e.target.files[0] : null)}
                        className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100"
                    />
                </div>

                <div className="border-t border-gray-700 pt-4 flex justify-between items-center flex-wrap gap-4">
                    <button onClick={() => setIsClassModalOpen(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md font-semibold transition-colors text-sm">
                        Manage Classes
                    </button>
                    <div className="flex items-center gap-4">
                         <a href={csvTemplate} download="results_template.csv" className="text-sm text-cyan-400 hover:underline">
                            Download Template
                        </a>
                        <button
                            onClick={handleUpload}
                            disabled={!selectedClassId || !file || isUploading}
                            className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-md font-semibold disabled:bg-gray-500 disabled:cursor-not-allowed"
                        >
                            {isUploading ? 'Uploading...' : 'Upload Results'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface TeacherPageProps {
    user: User;
    onLogout: () => void;
}

export const TeacherPage: React.FC<TeacherPageProps> = ({ user, onLogout }) => {
    const [view, setView] = useState<'dashboard' | 'results' | 'topics' | 'announcements' | 'calendar'>('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(user);
    const [classes, setClasses] = useState<SchoolClass[]>([]);

    useEffect(() => {
        if (user.schoolId) {
            setClasses(classService.getClassesForSchool(user.schoolId));
        }
    }, [user.schoolId]);

    const navItems = [
        { view: 'dashboard', name: 'Dashboard', icon: <DashboardIcon /> },
        { view: 'results', name: 'Results', icon: <ResultsIcon /> },
        { view: 'topics', name: 'Topics', icon: <TopicsIcon /> },
        { view: 'announcements', name: 'Announcements', icon: <AnnounceIcon /> },
        { view: 'calendar', name: 'Calendar', icon: <CalendarIcon /> },
    ] as const;

    const renderMainContent = () => {
        switch (view) {
            case 'results':
                return <TeacherResultsView user={user} />;
            case 'topics':
                return <TeacherTopicsView user={user} />;
            case 'announcements':
                return <TeacherAnnouncementsView user={user} />;
            case 'calendar':
                return <TeacherCalendarView user={user} />;
            case 'dashboard':
            default:
                return (
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6">Teacher's Dashboard</h2>
                         <div className="bg-gray-800 p-8 rounded-lg">
                            <p className="text-xl">Welcome, {currentUser.name}!</p>
                            <p className="text-gray-400 mt-2">This is your dedicated portal. Use the sidebar to navigate through your available tools.</p>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="flex h-screen bg-gray-900 text-white font-sans">
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
             {isSidebarOpen && <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>}
            
            <aside className={`fixed inset-y-0 left-0 bg-gray-800 text-white transform ${isSidebarOpen ? 'translate-x-0 w-64 p-4' : '-translate-x-full w-64 p-4'} lg:sticky lg:translate-x-0 z-40 flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'lg:w-20 lg:p-2' : 'lg:w-64 lg:p-4'}`}>
                 <div className="flex items-center justify-between mb-8 h-10">
                    <div className={`flex items-center space-x-3 overflow-hidden ${isSidebarCollapsed && 'lg:justify-center lg:w-full'}`}>
                        <AcademicCapIcon />
                        <h1 className={`text-xl font-bold text-cyan-400 truncate ${isSidebarCollapsed && 'lg:hidden'}`}>{APP_TITLE}</h1>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-1 rounded-md hover:bg-gray-700"><CloseIcon /></button>
                </div>
                 <nav className="space-y-2 flex-grow">
                    {navItems.map(item => (
                         <button
                            key={item.view}
                            onClick={() => {
                                setView(item.view);
                                setIsSidebarOpen(false);
                                setIsSidebarCollapsed(true);
                            }}
                            className={`w-full flex items-center space-x-3 p-3 rounded-md transition-colors ${isSidebarCollapsed && 'lg:justify-center'} ${view === item.view ? 'bg-cyan-600' : 'hover:bg-gray-700'}`}
                            title={item.name}
                        >
                            {item.icon}
                            <span className={isSidebarCollapsed ? 'lg:hidden' : ''}>{item.name}</span>
                        </button>
                    ))}
                </nav>
            </aside>

            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="flex-shrink-0 flex items-center justify-between p-4 bg-gray-800 border-l border-gray-700 shadow-md">
                     <div className="flex items-center space-x-4">
                        <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-1"><HamburgerIcon /></button>
                        <button onClick={() => setIsSidebarCollapsed(prev => !prev)} className="hidden lg:block p-1"><HamburgerIcon /></button>
                    </div>
                     <div className="flex items-center space-x-4">
                        <NotificationBell userId={user.studentId} />
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
                        {renderMainContent()}
                    </div>
                </main>
            </div>
        </div>
    );
};