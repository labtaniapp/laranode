import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';
import { useState } from 'react';
import { TbCloudUpload, TbDownload, TbTrash, TbRefresh, TbPlus, TbSettings, TbCloudCheck, TbCloudOff } from 'react-icons/tb';
import { FaAws, FaDatabase, FaFolder } from 'react-icons/fa';
import { toast } from 'react-toastify';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import ConfirmationButton from '@/Components/ConfirmationButton';

export default function BackupsIndex({ backups, websites, settings }) {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [showRestoreModal, setShowRestoreModal] = useState(false);
    const [selectedBackup, setSelectedBackup] = useState(null);
    const [testingS3, setTestingS3] = useState(false);

    const createForm = useForm({
        website_id: websites.length > 0 ? websites[0].id : '',
        includes_files: true,
        includes_database: true,
        storage: settings.storage || 'local',
    });

    const settingsForm = useForm({
        auto_backup_enabled: settings.auto_backup_enabled,
        frequency: settings.frequency,
        retention_days: settings.retention_days,
        storage: settings.storage,
        s3_bucket: settings.s3_bucket || '',
        s3_region: settings.s3_region || '',
        s3_endpoint: settings.s3_endpoint || '',
        s3_access_key: settings.s3_access_key || '',
        s3_secret_key: '',
        s3_path: settings.s3_path || '',
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

    const handleUpdateSettings = (e) => {
        e.preventDefault();
        settingsForm.patch(route('backups.settings'), {
            onSuccess: () => {
                setShowSettingsModal(false);
                toast.success('Settings updated');
            },
            onError: () => toast.error('Failed to update settings'),
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

    const testS3Connection = async () => {
        setTestingS3(true);
        try {
            const response = await fetch(route('backups.test-s3'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                },
                body: JSON.stringify({
                    s3_bucket: settingsForm.data.s3_bucket,
                    s3_region: settingsForm.data.s3_region,
                    s3_endpoint: settingsForm.data.s3_endpoint,
                    s3_access_key: settingsForm.data.s3_access_key,
                    s3_secret_key: settingsForm.data.s3_secret_key || settings.s3_secret_key,
                }),
            });
            const result = await response.json();
            if (result.success) {
                toast.success(result.message);
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            toast.error('Failed to test S3 connection');
        } finally {
            setTestingS3(false);
        }
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
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between max-w-7xl pr-5">
                    <div className="flex items-center">
                        <TbCloudUpload className="mr-2 w-6 h-6" />
                        <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">
                            Backups
                        </h2>
                    </div>
                    <div className="flex space-x-2">
                        <SecondaryButton onClick={() => setShowSettingsModal(true)}>
                            <TbSettings className="mr-2 w-4 h-4" />
                            Settings
                        </SecondaryButton>
                        <PrimaryButton onClick={() => setShowCreateModal(true)} disabled={websites.length === 0}>
                            <TbPlus className="mr-2 w-4 h-4" />
                            Create Backup
                        </PrimaryButton>
                    </div>
                </div>
            }
        >
            <Head title="Backups" />

            <div className="max-w-7xl px-4 my-8">
                {/* Storage Info */}
                <div className="mb-6 flex items-center space-x-4">
                    <div className={`flex items-center px-3 py-2 rounded-lg ${settings.storage === 's3' ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                        {settings.storage === 's3' ? (
                            <>
                                <FaAws className="w-5 h-5 text-orange-500 mr-2" />
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                    S3: {settings.s3_bucket || 'Not configured'}
                                </span>
                                {settings.s3_configured ? (
                                    <TbCloudCheck className="w-4 h-4 text-green-500 ml-2" />
                                ) : (
                                    <TbCloudOff className="w-4 h-4 text-red-500 ml-2" />
                                )}
                            </>
                        ) : (
                            <>
                                <FaFolder className="w-5 h-5 text-blue-500 mr-2" />
                                <span className="text-sm text-gray-700 dark:text-gray-300">Local Storage</span>
                            </>
                        )}
                    </div>
                    {settings.auto_backup_enabled && (
                        <div className="flex items-center px-3 py-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                            <TbRefresh className="w-4 h-4 text-green-600 mr-2" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                Auto-backup: {settings.frequency}
                            </span>
                        </div>
                    )}
                </div>

                {/* Backups List */}
                <div className="bg-white dark:bg-gray-850 rounded-lg shadow overflow-hidden">
                    <table className="w-full text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-gray-700 uppercase bg-gray-200 dark:bg-gray-700 dark:text-gray-300 text-sm">
                            <tr>
                                <th className="px-6 py-3">Backup</th>
                                <th className="px-6 py-3">Website</th>
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
                                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                        <TbCloudUpload className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                                        <p>No backups yet. Create your first backup to protect your data.</p>
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
                                            {backup.website?.url || 'Deleted'}
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
                                                <FaAws className="w-5 h-5 text-orange-500" title="Amazon S3" />
                                            ) : (
                                                <FaFolder className="w-5 h-5 text-blue-500" title="Local" />
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusBadge(backup.status)}`}>
                                                {backup.status === 'in_progress' ? 'In Progress' : backup.status.charAt(0).toUpperCase() + backup.status.slice(1)}
                                            </span>
                                            {backup.error_message && (
                                                <p className="text-xs text-red-500 mt-1 truncate max-w-xs" title={backup.error_message}>
                                                    {backup.error_message}
                                                </p>
                                            )}
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
            </div>

            {/* Create Backup Modal */}
            <Modal show={showCreateModal} onClose={() => setShowCreateModal(false)} maxWidth="lg">
                <form onSubmit={handleCreateBackup} className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
                        <TbCloudUpload className="mr-2" />
                        Create Backup
                    </h2>

                    <div className="mt-6 space-y-4">
                        <div>
                            <InputLabel htmlFor="website_id" value="Website" />
                            <select
                                id="website_id"
                                value={createForm.data.website_id}
                                onChange={(e) => createForm.setData('website_id', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white sm:text-sm"
                            >
                                {websites.map((website) => (
                                    <option key={website.id} value={website.id}>
                                        {website.url}
                                    </option>
                                ))}
                            </select>
                            <InputError message={createForm.errors.website_id} className="mt-2" />
                        </div>

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
                            <InputError message={createForm.errors.storage} className="mt-2" />
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end space-x-3">
                        <SecondaryButton onClick={() => setShowCreateModal(false)}>
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton disabled={createForm.processing || (!createForm.data.includes_files && !createForm.data.includes_database)}>
                            {createForm.processing ? 'Creating...' : 'Create Backup'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Settings Modal */}
            <Modal show={showSettingsModal} onClose={() => setShowSettingsModal(false)} maxWidth="2xl">
                <form onSubmit={handleUpdateSettings} className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
                        <TbSettings className="mr-2" />
                        Backup Settings
                    </h2>

                    <div className="mt-6 space-y-6">
                        {/* Auto Backup */}
                        <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
                            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">Automatic Backups</h3>

                            <label className="flex items-center mb-4">
                                <input
                                    type="checkbox"
                                    checked={settingsForm.data.auto_backup_enabled}
                                    onChange={(e) => settingsForm.setData('auto_backup_enabled', e.target.checked)}
                                    className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500 dark:border-gray-600"
                                />
                                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                                    Enable automatic backups
                                </span>
                            </label>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <InputLabel htmlFor="frequency" value="Frequency" />
                                    <select
                                        id="frequency"
                                        value={settingsForm.data.frequency}
                                        onChange={(e) => settingsForm.setData('frequency', e.target.value)}
                                        disabled={!settingsForm.data.auto_backup_enabled}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white sm:text-sm disabled:opacity-50"
                                    >
                                        <option value="daily">Daily</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="monthly">Monthly</option>
                                    </select>
                                </div>
                                <div>
                                    <InputLabel htmlFor="retention_days" value="Keep backups for (days)" />
                                    <TextInput
                                        id="retention_days"
                                        type="number"
                                        min="1"
                                        max="365"
                                        value={settingsForm.data.retention_days}
                                        onChange={(e) => settingsForm.setData('retention_days', parseInt(e.target.value))}
                                        disabled={!settingsForm.data.auto_backup_enabled}
                                        className="mt-1 block w-full disabled:opacity-50"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Storage */}
                        <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
                            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">Default Storage</h3>

                            <div className="flex space-x-4">
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        value="local"
                                        checked={settingsForm.data.storage === 'local'}
                                        onChange={(e) => settingsForm.setData('storage', e.target.value)}
                                        className="border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                                        <FaFolder className="inline w-4 h-4 mr-1" />
                                        Local
                                    </span>
                                </label>
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        value="s3"
                                        checked={settingsForm.data.storage === 's3'}
                                        onChange={(e) => settingsForm.setData('storage', e.target.value)}
                                        className="border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                                        <FaAws className="inline w-4 h-4 mr-1" />
                                        S3 Compatible (AWS, R2, Wasabi, etc.)
                                    </span>
                                </label>
                            </div>
                        </div>

                        {/* S3 Configuration */}
                        {settingsForm.data.storage === 's3' && (
                            <div>
                                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                                    <FaAws className="mr-2 text-orange-500" />
                                    S3 Compatible Storage Configuration
                                </h3>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <InputLabel htmlFor="s3_bucket" value="Bucket Name" />
                                        <TextInput
                                            id="s3_bucket"
                                            value={settingsForm.data.s3_bucket}
                                            onChange={(e) => settingsForm.setData('s3_bucket', e.target.value)}
                                            className="mt-1 block w-full"
                                            placeholder="my-backup-bucket"
                                        />
                                    </div>
                                    <div>
                                        <InputLabel htmlFor="s3_region" value="Region" />
                                        <TextInput
                                            id="s3_region"
                                            value={settingsForm.data.s3_region}
                                            onChange={(e) => settingsForm.setData('s3_region', e.target.value)}
                                            className="mt-1 block w-full"
                                            placeholder="us-east-1 or auto"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <InputLabel htmlFor="s3_endpoint" value="Custom Endpoint (for R2, Wasabi, etc.)" />
                                        <TextInput
                                            id="s3_endpoint"
                                            value={settingsForm.data.s3_endpoint}
                                            onChange={(e) => settingsForm.setData('s3_endpoint', e.target.value)}
                                            className="mt-1 block w-full"
                                            placeholder="https://xxx.r2.cloudflarestorage.com (leave empty for AWS S3)"
                                        />
                                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                            Examples: R2: https://account-id.r2.cloudflarestorage.com | Wasabi: https://s3.wasabisys.com | DigitalOcean: https://region.digitaloceanspaces.com
                                        </p>
                                    </div>
                                    <div>
                                        <InputLabel htmlFor="s3_access_key" value="Access Key ID" />
                                        <TextInput
                                            id="s3_access_key"
                                            value={settingsForm.data.s3_access_key}
                                            onChange={(e) => settingsForm.setData('s3_access_key', e.target.value)}
                                            className="mt-1 block w-full"
                                            placeholder="AKIAIOSFODNN7EXAMPLE"
                                        />
                                    </div>
                                    <div>
                                        <InputLabel htmlFor="s3_secret_key" value="Secret Access Key" />
                                        <TextInput
                                            id="s3_secret_key"
                                            type="password"
                                            value={settingsForm.data.s3_secret_key}
                                            onChange={(e) => settingsForm.setData('s3_secret_key', e.target.value)}
                                            className="mt-1 block w-full"
                                            placeholder={settings.s3_access_key ? '••••••••' : 'Enter secret key'}
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <InputLabel htmlFor="s3_path" value="Path Prefix (optional)" />
                                        <TextInput
                                            id="s3_path"
                                            value={settingsForm.data.s3_path}
                                            onChange={(e) => settingsForm.setData('s3_path', e.target.value)}
                                            className="mt-1 block w-full"
                                            placeholder="backups/laranode"
                                        />
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <SecondaryButton
                                        type="button"
                                        onClick={testS3Connection}
                                        disabled={testingS3 || !settingsForm.data.s3_bucket || !settingsForm.data.s3_region || !settingsForm.data.s3_access_key}
                                    >
                                        {testingS3 ? 'Testing...' : 'Test Connection'}
                                    </SecondaryButton>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-6 flex justify-end space-x-3">
                        <SecondaryButton onClick={() => setShowSettingsModal(false)}>
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton disabled={settingsForm.processing}>
                            {settingsForm.processing ? 'Saving...' : 'Save Settings'}
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
                                    This action cannot be undone. It's recommended to create a backup of the current state first.
                                </p>
                            </div>

                            <div className="mt-4">
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Backup: <strong>{selectedBackup.name}</strong>
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Website: <strong>{selectedBackup.website?.url}</strong>
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
                        <SecondaryButton onClick={() => setShowRestoreModal(false)}>
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton
                            disabled={restoreForm.processing || (!restoreForm.data.restore_files && !restoreForm.data.restore_database)}
                            className="!bg-orange-600 hover:!bg-orange-700"
                        >
                            {restoreForm.processing ? 'Restoring...' : 'Restore Backup'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}
