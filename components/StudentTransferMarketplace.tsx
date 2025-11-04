import React, { useState, useEffect, useCallback, useRef } from 'react';
import { School, AdminUser, StudentTransferProposal, TransferNegotiation } from '../types';
import * as schoolService from '../services/schoolService';
import UserAvatar from './UserAvatar';

interface StudentTransferMarketplaceProps {
    school: School;
    user: AdminUser;
}

const StudentTransferMarketplace: React.FC<StudentTransferMarketplaceProps> = ({ school, user }) => {
    type Tab = 'marketplace' | 'my_proposals' | 'negotiations';
    const [activeTab, setActiveTab] = useState<Tab>('marketplace');
    
    // Data states
    const [marketProposals, setMarketProposals] = useState<StudentTransferProposal[]>([]);
    const [myProposals, setMyProposals] = useState<StudentTransferProposal[]>([]);
    const [negotiations, setNegotiations] = useState<TransferNegotiation[]>([]);

    // UI states
    const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
    const [selectedNegotiation, setSelectedNegotiation] = useState<TransferNegotiation | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);
    
    // Form state
    const [proposalForm, setProposalForm] = useState({
        numberOfStudents: 10,
        gender: 'Mixed' as 'Male' | 'Female' | 'Mixed',
        grade: '',
        description: '',
    });

    const refreshData = useCallback(() => {
        setMarketProposals(schoolService.getOpenMarketProposals(school.id));
        setMyProposals(schoolService.getProposalsForSchool(school.id));
        const allNegotiations = schoolService.getNegotiationsForSchool(school.id);
        setNegotiations(allNegotiations);

        if (selectedNegotiation) {
            const updatedNego = allNegotiations.find(n => n.id === selectedNegotiation.id);
            setSelectedNegotiation(updatedNego || null);
        }
    }, [school.id, selectedNegotiation]);

    useEffect(() => {
        refreshData();
        const interval = setInterval(refreshData, 5000); // Poll for updates
        return () => clearInterval(interval);
    }, [refreshData]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [selectedNegotiation?.messages]);

    const handleCreateProposal = () => {
        try {
            // FIX: Corrected function call to an existing service method
            schoolService.createProposal({
                proposingSchoolId: school.id,
                ...proposalForm,
                numberOfStudents: Number(proposalForm.numberOfStudents)
            });
            setIsProposalModalOpen(false);
            setProposalForm({ numberOfStudents: 10, gender: 'Mixed', grade: '', description: '' });
            refreshData();
            setActiveTab('my_proposals');
        } catch (error) {
            alert((error as Error).message);
        }
    };
    
    const handleStartNegotiation = (proposalId: string) => {
        const negotiation = schoolService.startOrGetNegotiation(proposalId, school.id);
        setSelectedNegotiation(negotiation);
        setActiveTab('negotiations');
        refreshData();
    };

    const handleSendMessage = () => {
        if (!selectedNegotiation || !newMessage.trim()) return;
        try {
            // FIX: Corrected function call to an existing service method
            const updatedNego = schoolService.addNegotiationMessage(selectedNegotiation.id, user.id, newMessage.trim());
            setSelectedNegotiation(updatedNego);
            setNewMessage('');
        } catch (error) {
            alert((error as Error).message);
        }
    };
    
    const renderMarketplace = () => (
        <div className="space-y-4">
            {marketProposals.length > 0 ? marketProposals.map(p => (
                <div key={p.id} className="bg-gray-800 p-4 rounded-lg flex justify-between items-center">
                    <div>
                        <p className="font-bold">{p.proposingSchoolName}</p>
                        <p className="text-sm text-gray-300">Offering <span className="font-semibold">{p.numberOfStudents} {p.gender}</span> students in <span className="font-semibold">{p.grade}</span> division.</p>
                        <p className="text-xs text-gray-400 mt-1">{p.description}</p>
                    </div>
                    <button onClick={() => handleStartNegotiation(p.id)} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-sm font-semibold rounded-md">Start Negotiation</button>
                </div>
            )) : <p className="text-gray-400 text-center py-8">No open transfer proposals from other schools right now.</p>}
        </div>
    );

    const renderMyProposals = () => (
        <div>
            <div className="text-right mb-4">
                <button onClick={() => setIsProposalModalOpen(true)} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 font-semibold rounded-md">+ Create Proposal</button>
            </div>
            <div className="space-y-4">
                 {myProposals.length > 0 ? myProposals.map(p => (
                    <div key={p.id} className="bg-gray-800 p-4 rounded-lg">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-bold">Offering {p.numberOfStudents} {p.gender} students</p>
                                <p className="text-sm text-gray-300">Grade/Division: {p.grade}</p>
                            </div>
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full capitalize ${p.status === 'open' ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-400'}`}>{p.status}</span>
                        </div>
                        <p className="text-sm text-gray-400 mt-2">{p.description}</p>
                    </div>
                )) : <p className="text-gray-400 text-center py-8">You have not created any transfer proposals.</p>}
            </div>
        </div>
    );

    const renderNegotiations = () => (
        <div className="flex h-[70vh] bg-gray-800 rounded-lg overflow-hidden">
            <div className="w-1/3 border-r border-gray-700 flex flex-col">
                <h3 className="p-4 font-bold text-lg border-b border-gray-700 flex-shrink-0">Chats</h3>
                <div className="overflow-y-auto">
                    {negotiations.map(n => {
                        const otherSchoolId = n.proposingSchoolId === school.id ? n.interestedSchoolId : n.proposingSchoolId;
                        const otherSchool = schoolService.getAllSchools().find(s => s.id === otherSchoolId);
                        return (
                            <button key={n.id} onClick={() => setSelectedNegotiation(n)} className={`w-full text-left p-3 ${selectedNegotiation?.id === n.id ? 'bg-cyan-600' : 'hover:bg-gray-700'}`}>
                                <p className="font-semibold">{otherSchool?.name}</p>
                                <p className="text-xs text-gray-300 truncate">RE: {n.messages[0]?.content || 'Proposal Discussion'}</p>
                            </button>
                        )
                    })}
                </div>
            </div>
            <div className="flex-1 flex flex-col">
                {selectedNegotiation ? (
                    <>
                        <header className="p-3 border-b border-gray-700">
                            <h4 className="font-bold">Negotiation with {schoolService.getAllSchools().find(s => s.id === (selectedNegotiation.proposingSchoolId === school.id ? selectedNegotiation.interestedSchoolId : selectedNegotiation.proposingSchoolId))?.name}</h4>
                        </header>
                        <main className="flex-1 p-4 overflow-y-auto space-y-4">
                            {selectedNegotiation.messages.map(msg => (
                                <div key={msg.timestamp} className={`flex items-start gap-3 ${msg.senderId === user.id ? 'justify-end' : ''}`}>
                                    {msg.senderId !== user.id && <UserAvatar name={msg.senderName} className="w-8 h-8 rounded-full" />}
                                    <div className={`p-3 rounded-lg max-w-lg ${msg.senderId === user.id ? 'bg-cyan-700' : 'bg-gray-700'}`}>
                                        <p className="font-bold text-xs mb-1">{msg.senderName}</p>
                                        <p className="text-sm">{msg.content}</p>
                                        <p className="text-xs text-gray-400 text-right mt-1">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                                    </div>
                                    {msg.senderId === user.id && <UserAvatar name={msg.senderName} className="w-8 h-8 rounded-full" />}
                                </div>
                            ))}
                             <div ref={chatEndRef} />
                        </main>
                        <footer className="p-3 border-t border-gray-700">
                            <div className="flex items-center gap-2">
                                <input value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSendMessage()} placeholder="Type a message..." className="w-full p-2 bg-gray-700 rounded-md"/>
                                <button onClick={handleSendMessage} className="px-4 py-2 bg-cyan-600 rounded-md">Send</button>
                            </div>
                        </footer>
                    </>
                ) : <div className="flex items-center justify-center h-full text-gray-400">Select a negotiation to view the chat.</div>}
            </div>
        </div>
    );
    
    const renderProposalModal = () => (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-lg space-y-4">
                <h3 className="text-xl font-bold">Create a Student Transfer Proposal</h3>
                <div><label className="text-sm">Number of Students</label><input type="number" value={proposalForm.numberOfStudents} onChange={e => setProposalForm({...proposalForm, numberOfStudents: Number(e.target.value)})} className="w-full p-2 bg-gray-700 rounded mt-1"/></div>
                <div><label className="text-sm">Gender</label><select value={proposalForm.gender} onChange={e => setProposalForm({...proposalForm, gender: e.target.value as any})} className="w-full p-2 bg-gray-700 rounded mt-1"><option>Mixed</option><option>Male</option><option>Female</option></select></div>
                <div><label className="text-sm">Grade/Division</label><input value={proposalForm.grade} onChange={e => setProposalForm({...proposalForm, grade: e.target.value})} placeholder="e.g., S.1, Grade 5" className="w-full p-2 bg-gray-700 rounded mt-1"/></div>
                <div><label className="text-sm">Description (Optional)</label><textarea value={proposalForm.description} onChange={e => setProposalForm({...proposalForm, description: e.target.value})} rows={3} className="w-full p-2 bg-gray-700 rounded mt-1"></textarea></div>
                <div className="flex justify-end gap-2"><button onClick={() => setIsProposalModalOpen(false)} className="px-4 py-2 bg-gray-600 rounded">Cancel</button><button onClick={handleCreateProposal} className="px-4 py-2 bg-cyan-600 rounded">Submit Proposal</button></div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            {isProposalModalOpen && renderProposalModal()}
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Student Transfer</h2>
            <div className="flex items-center gap-2 p-1 bg-gray-800 rounded-lg">
                <button onClick={() => setActiveTab('marketplace')} className={`w-full py-2 text-sm font-semibold rounded-md ${activeTab === 'marketplace' ? 'bg-cyan-600' : 'hover:bg-gray-600'}`}>Marketplace</button>
                <button onClick={() => setActiveTab('my_proposals')} className={`w-full py-2 text-sm font-semibold rounded-md ${activeTab === 'my_proposals' ? 'bg-cyan-600' : 'hover:bg-gray-600'}`}>My Proposals</button>
                <button onClick={() => setActiveTab('negotiations')} className={`w-full py-2 text-sm font-semibold rounded-md ${activeTab === 'negotiations' ? 'bg-cyan-600' : 'hover:bg-gray-600'}`}>Negotiations</button>
            </div>

            {activeTab === 'marketplace' && renderMarketplace()}
            {activeTab === 'my_proposals' && renderMyProposals()}
            {activeTab === 'negotiations' && renderNegotiations()}
        </div>
    );
};

export default StudentTransferMarketplace;
