import React, { useState, useEffect } from 'react';
import { ExplorationItem } from '../types';
import * as explorationService from '../services/explorationService';
import ConfirmationModal from './ConfirmationModal';

// FIX: Export the ExplorationModuleManager component so it can be imported by other modules.
export const ExplorationModuleManager: React.FC = () => {
    const [items, setItems] = useState<ExplorationItem[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<ExplorationItem | null>(null);
    const [formState, setFormState] = useState<Omit<ExplorationItem, 'id'>>({
        title: '',
        subject: '',
        description: '',
        modelUrl: '',
        thumbnailUrl: '',
    });
    const [confirmModal, setConfirmModal] = useState<{ message: React.ReactNode; onConfirm: () => void; } | null>(null);

    useEffect(() => {
        setItems(explorationService.getExplorationItems());
    }, []);

    const openModal = (item: ExplorationItem | null) => {
        setEditingItem(item);
        if (item) {
            setFormState({
                title: item.title,
                subject: item.subject,
                description: item.description,
                modelUrl: item.modelUrl,
                thumbnailUrl: item.thumbnailUrl || '',
            });
        } else {
            setFormState({ title: '', subject: '', description: '', modelUrl: '', thumbnailUrl: '' });
        }
        setIsModalOpen(true);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingItem) {
            explorationService.updateExplorationItem(editingItem.id, formState);
        } else {
            explorationService.addExplorationItem(formState);
        }
        setItems(explorationService.getExplorationItems());
        setIsModalOpen(false);
    };

    const handleDelete = (item: ExplorationItem) => {
        setConfirmModal({
            message: `Are you sure you want to delete the model "${item.title}"?`,
            onConfirm: () => {
                explorationService.deleteExplorationItem(item.id);
                setItems(explorationService.getExplorationItems());
                setConfirmModal(null);
            },
        });
    };

    const renderModal = () => (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-lg space-y-4">
                <h3 className="text-xl font-bold">{editingItem ? 'Edit' : 'Add'} Exploration Model</h3>
                <form onSubmit={handleSave} className="space-y-4">
                    <input value={formState.title} onChange={e => setFormState({...formState, title: e.target.value})} placeholder="Title" required className="w-full p-2 bg-gray-700 rounded" />
                    <input value={formState.subject} onChange={e => setFormState({...formState, subject: e.target.value})} placeholder="Subject (e.g., Biology)" required className="w-full p-2 bg-gray-700 rounded" />
                    <textarea value={formState.description} onChange={e => setFormState({...formState, description: e.target.value})} placeholder="Description" required rows={3} className="w-full p-2 bg-gray-700 rounded" />
                    <input value={formState.modelUrl} onChange={e => setFormState({...formState, modelUrl: e.target.value})} placeholder="Model URL (.glb/.gltf)" required className="w-full p-2 bg-gray-700 rounded" />
                    <input value={formState.thumbnailUrl} onChange={e => setFormState({...formState, thumbnailUrl: e.target.value})} placeholder="Thumbnail Image URL (optional)" className="w-full p-2 bg-gray-700 rounded" />
                    <div className="flex justify-end gap-2"><button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-600 rounded">Cancel</button><button type="submit" className="px-4 py-2 bg-cyan-600 rounded">Save</button></div>
                </form>
            </div>
        </div>
    );
    
    return (
        <div>
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
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white">Manage Exploration Content</h2>
                <button onClick={() => openModal(null)} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 font-semibold rounded-md">+ Add New Model</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map(item => (
                    <div key={item.id} className="bg-gray-800 rounded-lg shadow-xl flex flex-col">
                        <img src={item.thumbnailUrl || 'https://via.placeholder.com/400x200.png?text=3D+Model'} alt={item.title} className="w-full h-40 object-cover rounded-t-lg" />
                        <div className="p-4 flex flex-col flex-grow">
                            <h4 className="font-bold text-lg text-white">{item.title}</h4>
                            <p className="text-sm font-semibold text-cyan-400 mb-2">{item.subject}</p>
                            <p className="text-sm text-gray-300 flex-grow">{item.description}</p>
                            <div className="flex justify-end space-x-2 mt-4">
                                <button onClick={() => openModal(item)} className="p-2 text-sm bg-gray-600 hover:bg-gray-500 rounded-md">Edit</button>
                                <button onClick={() => handleDelete(item)} className="p-2 text-sm bg-red-600 hover:bg-red-700 rounded-md">Delete</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ExplorationModuleManager;
