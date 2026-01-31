import { useForm, router } from '@inertiajs/react';
import { useState } from 'react';
import { TbCloudUpload, TbDownload, TbTrash, TbRefresh, TbPlus } from 'react-icons/tb';
import { FaAws, FaDatabase, FaFolder } from 'react-icons/fa';
import { toast } from 'react-toastify';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputLabel from '@/Components/InputLabel';
import ConfirmationButton from '@/Components/ConfirmationButton';

export default function BackupTab({ website, backups = [], settings = {} }) {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showRestoreModal, setShowRestoreModal] = useState(false);
    const [selectedBackup, setSelectedBackup] = useState(null);

    const createForm = useForm({
        website_id: website.id,
        includes_files: true,
        includes_database: true,
        storage: settings.storage || 'local',
    });

    const restoreForm = useForm({
        restore_files: true,
        restore_database: true,
    });

    const handleCreateBackup = (e) => {
        e.preventDefault();
        createForm.post(route('backups.store'), {
            onSuccess: () => {
                setShowCreateModal(false);
                createForm.reset();
                toast.success('Backup started');
            },
            onError: () => toast.error('Failed to start backup'),
        });
    };

    const handleRestore = (e) => {
        e.preventDefault();
        if (!selectedBackup) return;

        restoreForm.post(route('backups.restore', selectedBackup.id), {
            onSuccess: () => {
                setShowRestoreModal(false);
                setSelectedBackup(null);
                restoreForm.reset();
                toast.success('Restore started');
            },
            onError: () => toast.error('Failed to start restore'),
        });
    };

    const handleDelete = (backup) => {
        router.delete(route('backups.destroy', backup.id), {
            onSuccess: () => toast.success('Backup deleted'),
            onError: () => toast.error('Failed to delete backup'),
        });
    };

    const openRestoreModal = (backup) => {
        setSelectedBackup(backup);
        restoreForm.setData({
            restore_files: backup.includes_files,
            restore_database: backup.includes_database,
        });
        setShowRestoreModal(true);
    };

    const getStatusBadge = (status) => {
        const styles = {
            pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
            in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
            completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
            failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        };
        return styles[status] || styles.pending;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <div className={`flex items-center px-3 py-2 rounded-lg ${settings.storage === 's3' ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                        {settings.storage === 's3' ? (
                            <>
                                <FaAws className="w-5 h-5 text-orange-500 mr-2" />
                                <span className="text-sm text-gray-700 dark:text-gray-300">S3 Storage</span>
                            </>
                        ) : (
                            <>
                                <FaFolder className="w-5 h-5 text-blue-500 mr-2" />
                                <span className="text-sm text-gray-700 dark:text-gray-300">Local Storage</span>
                            </>
                        )}
                    </div>
                </div>
                <PrimaryButton onClick={() => setShowCreateModal(true)}>
                    <TbPlus className="mr-2 w-4 h-4" />
                    Create Backup
                </PrimaryButton>
            </div>

            {/* Backups List */}
            <div className="bg-white dark:bg-gray-850 rounded-lg shadow overflow-hidden">
                <table className="w-full text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-gray-700 uppercase bg-gray-200 dark:bg-gray-700 dark:text-gray-300 text-xs">
                        <tr>
                            <th className="px-6 py-3">Backup</th>
                            <th className="px-6 py-3">Contents</th>
                            <th className="px-6 py-3">Size</th>
                            <th className="px-6 py-3">Storage</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {backups.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                    <TbCloudUpload className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                                    <p>No backups for this website yet.</p>
                                </td>
                            </tr>
                        ) : (
                            backups.map((backup) => (
                                <tr key={backup.id} className="bg-white border-b dark:bg-gray-850 dark:border-gray-700">
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-xs" title={backup.name}>
                                                {backup.name}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {new Date(backup.created_at).toLocaleString()}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex space-x-2">
                                            {backup.includes_files && (
                                                <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                                    <FaFolder className="inline w-3 h-3 mr-1" />
                                                    Files
                                                </span>
                                            )}
                                            {backup.includes_database && (
                                                <span className="px-2 py-1 text-xs rounded bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                                                    <FaDatabase className="inline w-3 h-3 mr-1" />
                                                    DB
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">{backup.size}</td>
                                    <td className="px-6 py-4">
                                        {backup.storage === 's3' ? (
                                            <FaAws className="w-5 h-5 text-orange-500" title="S3" />
                                        ) : (
                                            <FaFolder className="w-5 h-5 text-blue-500" title="Local" />
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusBadge(backup.status)}`}>
                                            {backup.status === 'in_progress' ? 'In Progress' : backup.status.charAt(0).toUpperCase() + backup.status.slice(1)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-2">
                                            {backup.is_downloadable && (
                                                <a
                                                    href={route('backups.download', backup.id)}
                                                    className="p-2 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-600 dark:bg-blue-900 dark:hover:bg-blue-800 dark:text-blue-300 transition-colors"
                                                    title="Download"
                                                >
                                                    <TbDownload className="w-4 h-4" />
                                                </a>
                                            )}
                                            {backup.is_restorable && (
                                                <button
                                                    onClick={() => openRestoreModal(backup)}
                                                    className="p-2 rounded-lg bg-green-100 hover:bg-green-200 text-green-600 dark:bg-green-900 dark:hover:bg-green-800 dark:text-green-300 transition-colors"
                                                    title="Restore"
                                                >
                                                    <TbRefresh className="w-4 h-4" />
                                                </button>
                                            )}
                                            <ConfirmationButton doAction={() => handleDelete(backup)}>
                                                <button
                                                    className="p-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 dark:bg-red-900 dark:hover:bg-red-800 dark:text-red-300 transition-colors"
                                                    title="Delete"
                                                >
                                                    <TbTrash className="w-4 h-4" />
                                                </button>
                                            </ConfirmationButton>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create Backup Modal */}
            <Modal show={showCreateModal} onClose={() => setShowCreateModal(false)} maxWidth="lg">
                <form onSubmit={handleCreateBackup} className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
                        <TbCloudUpload className="mr-2" />
                        Create Backup for {website.url}
                    </h2>

                    <div className="mt-6 space-y-4">
                        <div>
                            <InputLabel value="Include in backup" />
                            <div className="mt-2 space-y-2">
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={createForm.data.includes_files}
                                        onChange={(e) => createForm.setData('includes_files', e.target.checked)}
                                        className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500 dark:border-gray-600"
                                    />
                                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                                        <FaFolder className="inline w-4 h-4 mr-1" />
                                        Files (website root)
                                    </span>
                                </label>
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={createForm.data.includes_database}
                                        onChange={(e) => createForm.setData('includes_database', e.target.checked)}
                                        className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500 dark:border-gray-600"
                                    />
                                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                                        <FaDatabase className="inline w-4 h-4 mr-1" />
                                        Database (if linked)
                                    </span>
                                </label>
                            </div>
                        </div>

                        <div>
                            <InputLabel htmlFor="storage" value="Storage Location" />
                            <select
                                id="storage"
                                value={createForm.data.storage}
                                onChange={(e) => createForm.setData('storage', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white sm:text-sm"
                            >
                                <option value="local">Local (Server)</option>
                                <option value="s3" disabled={!settings.s3_configured}>
                                    S3 Compatible {!settings.s3_configured && '(Not configured)'}
                                </option>
                            </select>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end space-x-3">
                        <SecondaryButton onClick={() => setShowCreateModal(false)}>Cancel</SecondaryButton>
                        <PrimaryButton disabled={createForm.processing || (!createForm.data.includes_files && !createForm.data.includes_database)}>
                            {createForm.processing ? 'Creating...' : 'Create Backup'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Restore Modal */}
            <Modal show={showRestoreModal} onClose={() => setShowRestoreModal(false)} maxWidth="lg">
                <form onSubmit={handleRestore} className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
                        <TbRefresh className="mr-2" />
                        Restore Backup
                    </h2>

                    {selectedBackup && (
                        <>
                            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                    <strong>Warning:</strong> Restoring will overwrite current files and/or database.
                                </p>
                            </div>

                            <div className="mt-4">
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Backup: <strong>{selectedBackup.name}</strong>
                                </p>
                            </div>

                            <div className="mt-4">
                                <InputLabel value="Restore options" />
                                <div className="mt-2 space-y-2">
                                    {selectedBackup.includes_files && (
                                        <label className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={restoreForm.data.restore_files}
                                                onChange={(e) => restoreForm.setData('restore_files', e.target.checked)}
                                                className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500 dark:border-gray-600"
                                            />
                                            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                                                <FaFolder className="inline w-4 h-4 mr-1" />
                                                Restore files
                                            </span>
                                        </label>
                                    )}
                                    {selectedBackup.includes_database && (
                                        <label className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={restoreForm.data.restore_database}
                                                onChange={(e) => restoreForm.setData('restore_database', e.target.checked)}
                                                className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500 dark:border-gray-600"
                                            />
                                            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                                                <FaDatabase className="inline w-4 h-4 mr-1" />
                                                Restore database
                                            </span>
                                        </label>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    <div className="mt-6 flex justify-end space-x-3">
                        <SecondaryButton onClick={() => setShowRestoreModal(false)}>Cancel</SecondaryButton>
                        <PrimaryButton
                            disabled={restoreForm.processing || (!restoreForm.data.restore_files && !restoreForm.data.restore_database)}
                            className="!bg-orange-600 hover:!bg-orange-700"
                        >
                            {restoreForm.processing ? 'Restoring...' : 'Restore Backup'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
