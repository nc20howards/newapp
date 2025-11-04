import React, { useState, useEffect, useMemo } from 'react';
import { User, School, ElectionSettings, VotingCategory, Contestant } from '../types';
import * as voteService from '../services/voteService';
import ConfirmationModal from './ConfirmationModal';
import UserAvatar from './UserAvatar';

interface EVoteStudentPageProps {
    user: User;
    school: School;
}

const EVoteStudentPage: React.FC<EVoteStudentPageProps> = ({ user, school }) => {
    const [settings, setSettings] = useState<ElectionSettings | null>(null);
    const [categories, setCategories] = useState<VotingCategory[]>([]);
    const [contestants, setContestants] = useState<Contestant[]>([]);
    const [hasVoted, setHasVoted] = useState(false);
    const [electionStatus, setElectionStatus] = useState<'loading' | 'upcoming' | 'open' | 'closed'>('loading');
    const [timeLeft, setTimeLeft] = useState('');
    
    const [selectedChoices, setSelectedChoices] = useState<Record<string, string>>({});
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const schoolId = school.id;
        const studentId = user.studentId;
        
        const electionSettings = voteService.getElectionSettings(schoolId);
        setSettings(electionSettings);
        setCategories(voteService.getCategoriesForSchool(schoolId));
        setContestants(voteService.getContestantsForSchool(schoolId));
        setHasVoted(voteService.hasStudentVoted(studentId, schoolId));

        const now = Date.now();
        if (!electionSettings.isVotingOpen) {
            setElectionStatus('closed');
        } else if (now < electionSettings.startTime) {
            setElectionStatus('upcoming');
        } else if (now > electionSettings.endTime) {
            setElectionStatus('closed');
        } else {
            setElectionStatus('open');
        }
    }, [school.id, user.studentId]);

    // Countdown timer effect
    useEffect(() => {
        if (!settings) return;
        const interval = setInterval(() => {
            const now = Date.now();
            if (now < settings.startTime) {
                const distance = settings.startTime - now;
                const days = Math.floor(distance / (1000 * 60 * 60 * 24));
                const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                setTimeLeft(`${days}d ${hours}h ${minutes}m`);
                setElectionStatus('upcoming');
            } else if (now >= settings.startTime && now <= settings.endTime) {
                const distance = settings.endTime - now;
                const days = Math.floor(distance / (1000 * 60 * 60 * 24));
                const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                setTimeLeft(`${days}d ${hours}h ${minutes}m left`);
                setElectionStatus('open');
            } else {
                setTimeLeft('Ended');
                setElectionStatus('closed');
                clearInterval(interval);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [settings]);

    const handleSelectChoice = (categoryId: string, contestantId: string) => {
        setSelectedChoices(prev => ({ ...prev, [categoryId]: contestantId }));
    };

    const handleConfirmVote = () => {
        setError('');
        try {
            voteService.castVote(user.studentId, school.id, selectedChoices);
            setHasVoted(true);
            setIsConfirmModalOpen(false);
        } catch (e) {
            setError((e as Error).message);
            setIsConfirmModalOpen(false);
        }
    };

    const canSubmit = useMemo(() => {
        return categories.length > 0 && categories.every(cat => selectedChoices[cat.id]);
    }, [categories, selectedChoices]);

    const totalVotesPerCategory = useMemo(() => {
        if (electionStatus === 'closed') {
            const totals: Record<string, number> = {};
            categories.forEach(cat => {
                totals[cat.id] = contestants
                    .filter(c => c.categoryId === cat.id)
                    .reduce((sum, c) => sum + c.votes, 0);
            });
            return totals;
        }
        return {};
    }, [categories, contestants, electionStatus]);


    if (electionStatus === 'loading' || !settings) {
        return <div className="text-center p-8">Loading Election...</div>;
    }

    if (hasVoted) {
        return (
            <div className="text-center p-8 bg-gray-800 rounded-lg shadow-xl">
                <h3 className="text-2xl font-bold text-green-400">Thank You for Voting!</h3>
                <p className="text-gray-300 mt-2">Your vote has been cast successfully.</p>
                {electionStatus === 'closed' && (
                    <button onClick={() => setHasVoted(false)} className="mt-4 px-4 py-2 bg-cyan-600 rounded-md">View Results</button>
                )}
            </div>
        );
    }
    
    if (electionStatus === 'closed') {
        // Results View
        return (
            <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Election Results</h2>
                <p className="text-gray-400 mb-6">The voting period has ended. Here are the final results.</p>
                <div className="space-y-6">
                    {categories.map(category => {
                        const categoryContestants = contestants
                            .filter(c => c.categoryId === category.id)
                            .sort((a, b) => b.votes - a.votes);
                        
                        return (
                            <div key={category.id} className="bg-gray-800 p-6 rounded-lg">
                                <h3 className="text-xl font-bold text-cyan-400 mb-4">{category.title}</h3>
                                <div className="space-y-4">
                                    {categoryContestants.map((contestant, index) => {
                                        const categoryTotal = totalVotesPerCategory[category.id] || 1;
                                        const percentage = (contestant.votes / categoryTotal) * 100;
                                        return (
                                        <div key={contestant.id}>
                                            <div className="flex justify-between items-center text-sm mb-1">
                                                <p className={`font-semibold ${index === 0 ? 'text-yellow-400' : 'text-white'}`}>{index + 1}. {contestant.name}</p>
                                                <p className="font-bold">{contestant.votes} Votes ({percentage.toFixed(1)}%)</p>
                                            </div>
                                            <div className="w-full bg-gray-700 rounded-full h-2.5">
                                                <div className={`h-2.5 rounded-full ${index === 0 ? 'bg-yellow-500' : 'bg-cyan-600'}`} style={{ width: `${percentage}%` }}></div>
                                            </div>
                                        </div>
                                    )})}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        );
    }

    if (electionStatus === 'upcoming') {
        return (
            <div className="text-center p-8 bg-gray-800 rounded-lg shadow-xl">
                <h3 className="text-2xl font-bold text-yellow-400">Voting Has Not Started Yet</h3>
                <p className="text-gray-300 mt-2">Voting will open in:</p>
                <p className="text-4xl font-mono font-bold mt-4">{timeLeft}</p>
            </div>
        );
    }

    // Voting View
    return (
        <div>
            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                title="Confirm Your Vote"
                message="Are you sure you want to cast your vote? This action cannot be undone."
                onConfirm={handleConfirmVote}
                onCancel={() => setIsConfirmModalOpen(false)}
                confirmText="Cast My Vote"
            />
            
            <header className="mb-6">
                <h2 className="text-2xl sm:text-3xl font-bold text-white">E-Voting Portal</h2>
                <div className="mt-2 p-3 bg-cyan-900/50 border border-cyan-700 rounded-lg text-center">
                    <p className="font-semibold text-cyan-300">Voting is Open!</p>
                    <p className="text-sm text-gray-300">Time remaining: <span className="font-mono">{timeLeft}</span></p>
                </div>
                {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            </header>
            
            <div className="space-y-8">
                {categories.map(category => (
                    <div key={category.id}>
                        <h3 className="text-xl font-bold text-white mb-4">{category.title}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {contestants.filter(c => c.categoryId === category.id).map(contestant => {
                                const isSelected = selectedChoices[category.id] === contestant.id;
                                return (
                                    <div 
                                        key={contestant.id}
                                        className={`bg-gray-800 rounded-lg p-4 cursor-pointer border-2 transition-all ${isSelected ? 'border-cyan-500 ring-2 ring-cyan-500' : 'border-gray-700 hover:border-gray-600'}`}
                                        onClick={() => handleSelectChoice(category.id, contestant.id)}
                                    >
                                        <div className="flex items-center space-x-4">
                                            <UserAvatar name={contestant.name} avatarUrl={contestant.avatarUrl} className="w-16 h-16 rounded-full" />
                                            <div>
                                                <p className="font-bold text-lg">{contestant.name}</p>
                                                <p className="text-sm text-gray-400">{contestant.class}</p>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>

            <footer className="mt-8 pt-4 border-t border-gray-700 text-center">
                <button
                    onClick={() => setIsConfirmModalOpen(true)}
                    disabled={!canSubmit}
                    className="px-8 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-bold text-lg disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                    Cast Your Vote
                </button>
            </footer>
        </div>
    );
};

export default EVoteStudentPage;
