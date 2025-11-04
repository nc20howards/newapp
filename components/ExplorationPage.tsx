import React, { useState, useEffect } from 'react';
import { User, ExplorationItem } from '../types';
import * as explorationService from '../services/explorationService';
import * as topicService from '../services/topicService';
import ThreeDViewer from './ThreeDViewer';

interface ExplorationPageProps {
    user: User;
}

const ExplorationPage: React.FC<ExplorationPageProps> = ({ user }) => {
    const [items, setItems] = useState<ExplorationItem[]>([]);
    const [selectedItem, setSelectedItem] = useState<ExplorationItem | null>(null);
    const [topics, setTopics] = useState<string[]>([]);
    const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

    useEffect(() => {
        setItems(explorationService.getExplorationItems());
        if (user.schoolId) {
            setTopics(topicService.getTopicsForSchool(user.schoolId));
        }
    }, [user.schoolId]);

    if (selectedItem) {
        return (
            <div>
                <button onClick={() => setSelectedItem(null)} className="mb-4 text-sm px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md font-semibold">
                    &larr; Back to Explorations
                </button>
                <ThreeDViewer item={selectedItem} user={user} />
            </div>
        );
    }

    const renderContent = () => {
        if (selectedTopic) {
            const filteredItems = items.filter(item => item.subject.toLowerCase() === selectedTopic.toLowerCase());
            return (
                <div>
                    <button onClick={() => setSelectedTopic(null)} className="text-sm text-cyan-400 hover:underline mb-4">
                        &larr; Back to All Topics
                    </button>
                    {filteredItems.length === 0 ? (
                        <div className="text-center py-16 bg-gray-800 rounded-lg">
                            <p className="text-gray-400">No exploration models found for the topic "{selectedTopic}".</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredItems.map(item => (
                                <div key={item.id} onClick={() => setSelectedItem(item)} className="bg-gray-800 rounded-lg shadow-xl flex flex-col cursor-pointer hover:ring-2 hover:ring-cyan-500 transition-all transform hover:-translate-y-1">
                                    <img src={item.thumbnailUrl || 'https://via.placeholder.com/400x200.png?text=3D+Model'} alt={item.title} className="w-full h-40 object-cover rounded-t-lg" />
                                    <div className="p-4 flex flex-col flex-grow">
                                        <h4 className="font-bold text-lg text-white flex-grow">{item.title}</h4>
                                        <p className="text-sm text-gray-300 ">{item.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            );
        }

        if (topics.length > 0) {
            return (
                <div>
                    <h3 className="text-xl font-bold text-white mb-4">Select a Topic</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {topics.map(topic => (
                            <button key={topic} onClick={() => setSelectedTopic(topic)} className="p-6 bg-gray-800 rounded-lg text-center font-semibold text-lg hover:bg-cyan-700 transition-colors">
                                {topic}
                            </button>
                        ))}
                    </div>
                </div>
            );
        }

        // Fallback if no topics are set
        return (
            <div>
                 {items.length === 0 ? (
                    <div className="text-center py-16 bg-gray-800 rounded-lg">
                        <p className="text-gray-400">No exploration content has been added yet.</p>
                        <p className="text-sm text-gray-500 mt-2">Ask your administrator to add some 3D models!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {items.map(item => (
                            <div key={item.id} onClick={() => setSelectedItem(item)} className="bg-gray-800 rounded-lg shadow-xl flex flex-col cursor-pointer hover:ring-2 hover:ring-cyan-500 transition-all transform hover:-translate-y-1">
                                <img
                                    src={item.thumbnailUrl || 'https://via.placeholder.com/400x200.png?text=3D+Model'}
                                    alt={item.title}
                                    className="w-full h-40 object-cover rounded-t-lg"
                                />
                                <div className="p-4 flex flex-col flex-grow">
                                    <h4 className="font-bold text-lg text-white">{item.title}</h4>
                                    <p className="text-sm font-semibold text-cyan-400 mb-2 flex-grow">{item.subject}</p>
                                    <p className="text-sm text-gray-300 ">{item.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };


    return (
        <div className="animate-slide-in-left-fade">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-white">Exploration Hub</h2>
                    <p className="text-gray-400 mt-1">Select a topic to begin your interactive 3D lesson.</p>
                </div>
            </div>
            {renderContent()}
        </div>
    );
};

export default ExplorationPage;
