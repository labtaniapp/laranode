import { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { TbRefresh, TbDownload, TbCheck, TbAlertTriangle, TbClock, TbGitBranch, TbHistory, TbServer, TbAlertCircle } from 'react-icons/tb';
import { toast } from 'react-toastify';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import DangerButton from '@/Components/DangerButton';

export default function UpdatePanel() {
    const [loading, setLoading] = useState(true);
    const [checking, setChecking] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [status, setStatus] = useState(null);
    const [systemInfo, setSystemInfo] = useState(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showRollbackModal, setShowRollbackModal] = useState(false);
    const [updateProgress, setUpdateProgress] = useState('');

    useEffect(() => {
        fetchStatus();
        fetchSystemInfo();
    }, []);

    const fetchStatus = async () => {
        try {
            const response = await fetch(route('updates.status'));
            const data = await response.json();
            setStatus(data);
        } catch (error) {
            toast.error('Failed to fetch update status');
        } finally {
            setLoading(false);
        }
    };

    const fetchSystemInfo = async () => {
        try {
            const response = await fetch(route('updates.system-info'));
            const data = await response.json();
            setSystemInfo(data);
        } catch (error) {
            console.error('Failed to fetch system info');
        }
    };

    const checkForUpdates = async () => {
        setChecking(true);
        try {
            const response = await fetch(route('updates.check'), {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                },
            });
            const data = await response.json();

            if (data.success) {
                setStatus(prev => ({
                    ...prev,
                    update_available: data.update_available,
                    latest_version: data.latest_version,
                    changelog: data.changelog,
                    last_check: data.last_check,
                }));

                if (data.update_available) {
                    toast.info(`Update available: v${data.latest_version}`);
                } else {
                    toast.success('You are running the latest version');
                }
            } else {
                toast.error(data.message || 'Failed to check for updates');
            }
        } catch (error) {
            toast.error('Failed to check for updates');
        } finally {
            setChecking(false);
        }
    };

    const performUpdate = async () => {
        setShowConfirmModal(false);
        setUpdating(true);
        setUpdateProgress('Starting update...');

        try {
            const response = await fetch(route('updates.perform'), {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                },
            });
            const data = await response.json();

            if (data.success) {
                toast.success('Update completed successfully! Reloading...');
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } else {
                toast.error(`Update failed at ${data.stage}: ${data.message}`);
            }
        } catch (error) {
            toast.error('Update failed: ' + error.message);
        } finally {
            setUpdating(false);
            setUpdateProgress('');
        }
    };

    const performRollback = async () => {
        setShowRollbackModal(false);
        setUpdating(true);
        setUpdateProgress('Rolling back...');

        try {
            const response = await fetch(route('updates.rollback'), {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                },
            });
            const data = await response.json();

            if (data.success) {
                toast.success('Rollback completed! Reloading...');
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } else {
                toast.error('Rollback failed: ' + data.message);
            }
        } catch (error) {
            toast.error('Rollback failed');
        } finally {
            setUpdating(false);
            setUpdateProgress('');
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Never';
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Current Version Card */}
            <div className="bg-white dark:bg-gray-850 rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
                            <TbServer className="mr-2 w-5 h-5" />
                            Laranode Panel
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Version {status?.current_version || '1.0.0'}
                        </p>
                    </div>
                    <div className="flex items-center space-x-3">
                        <SecondaryButton onClick={checkForUpdates} disabled={checking || updating}>
                            <TbRefresh className={`mr-2 w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
                            {checking ? 'Checking...' : 'Check for Updates'}
                        </SecondaryButton>
                    </div>
                </div>

                {/* Update Available Banner */}
                {status?.update_available && (
                    <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <TbDownload className="w-6 h-6 text-indigo-600 mr-3" />
                                <div>
                                    <p className="font-medium text-indigo-900 dark:text-indigo-100">
                                        Update Available: v{status.latest_version}
                                    </p>
                                    <p className="text-sm text-indigo-700 dark:text-indigo-300">
                                        A new version of Laranode is available
                                    </p>
                                </div>
                            </div>
                            <PrimaryButton onClick={() => setShowConfirmModal(true)} disabled={updating || !systemInfo?.update_safe}>
                                <TbDownload className="mr-2 w-4 h-4" />
                                {updating ? 'Updating...' : 'Update Now'}
                            </PrimaryButton>
                        </div>
                    </div>
                )}

                {/* No Updates Banner */}
                {!status?.update_available && status?.last_check && (
                    <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="flex items-center">
                            <TbCheck className="w-6 h-6 text-green-600 mr-3" />
                            <div>
                                <p className="font-medium text-green-900 dark:text-green-100">
                                    You're up to date!
                                </p>
                                <p className="text-sm text-green-700 dark:text-green-300">
                                    Last checked: {formatDate(status.last_check)}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Private Repo Warning */}
                {status?.uses_https && !status?.token_configured && (
                    <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        <div className="flex items-start">
                            <TbAlertTriangle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" />
                            <div>
                                <p className="font-medium text-yellow-900 dark:text-yellow-100">
                                    Private Repository?
                                </p>
                                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                                    If your repository is private, add a GitHub Personal Access Token to your <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">.env</code> file:
                                </p>
                                <code className="block mt-2 text-xs bg-yellow-100 dark:bg-yellow-800 p-2 rounded">
                                    LARANODE_UPDATE_TOKEN=github_pat_xxxx
                                </code>
                            </div>
                        </div>
                    </div>
                )}

                {/* SSH Authentication */}
                {status?.uses_ssh && (
                    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center">
                            <TbCheck className="w-5 h-5 text-blue-600 mr-3" />
                            <div>
                                <p className="font-medium text-blue-900 dark:text-blue-100">
                                    Using SSH Authentication
                                </p>
                                <p className="text-sm text-blue-700 dark:text-blue-300">
                                    Your repository uses SSH. Ensure your SSH key is properly configured.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* System Information */}
            {systemInfo && (
                <div className="bg-white dark:bg-gray-850 rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                        System Information
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <p className="text-xs text-gray-500 dark:text-gray-400">PHP Version</p>
                            <p className="font-medium text-gray-900 dark:text-gray-100">{systemInfo.php_version}</p>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Node.js</p>
                            <p className="font-medium text-gray-900 dark:text-gray-100">{systemInfo.node_version || 'N/A'}</p>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Git Branch</p>
                            <p className="font-medium text-gray-900 dark:text-gray-100 flex items-center">
                                <TbGitBranch className="w-4 h-4 mr-1" />
                                {systemInfo.current_branch}
                            </p>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Commit</p>
                            <p className="font-medium text-gray-900 dark:text-gray-100 font-mono text-sm">{systemInfo.current_commit}</p>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Last Update</p>
                            <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{systemInfo.last_commit_date?.split(' ')[0] || 'N/A'}</p>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Disk Free</p>
                            <p className={`font-medium ${systemInfo.update_safe ? 'text-green-600' : 'text-red-600'}`}>
                                {systemInfo.disk_free}
                            </p>
                        </div>
                    </div>

                    {!systemInfo.update_safe && (
                        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center">
                            <TbAlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                            <span className="text-sm text-red-700 dark:text-red-300">
                                Insufficient disk space for update. At least 500MB free space required.
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Changelog */}
            {status?.changelog?.length > 0 && (
                <div className="bg-white dark:bg-gray-850 rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                        <TbHistory className="mr-2 w-5 h-5" />
                        Changelog
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {status.changelog.map((commit, index) => (
                            <div key={index} className="flex items-start p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded">
                                <code className="text-xs text-indigo-600 dark:text-indigo-400 mr-3 mt-0.5 font-mono">
                                    {commit.hash}
                                </code>
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                    {commit.message}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Rollback Option */}
            <div className="bg-white dark:bg-gray-850 rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Recovery Options
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    If an update causes issues, you can rollback to the previous version.
                </p>
                <DangerButton onClick={() => setShowRollbackModal(true)} disabled={updating}>
                    <TbHistory className="mr-2 w-4 h-4" />
                    Rollback to Previous Version
                </DangerButton>
            </div>

            {/* Update Progress Overlay */}
            {updating && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                            {updateProgress || 'Updating...'}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Please don't close this page. This may take a few minutes.
                        </p>
                    </div>
                </div>
            )}

            {/* Confirm Update Modal */}
            <Modal show={showConfirmModal} onClose={() => setShowConfirmModal(false)} maxWidth="md">
                <div className="p-6">
                    <div className="flex items-center mb-4">
                        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-full mr-4">
                            <TbDownload className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                Confirm Update
                            </h3>
                            <p className="text-sm text-gray-500">
                                v{status?.current_version} → v{status?.latest_version}
                            </p>
                        </div>
                    </div>

                    <div className="mb-6">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            The following actions will be performed:
                        </p>
                        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                            <li className="flex items-center">
                                <TbCheck className="w-4 h-4 text-green-500 mr-2" />
                                Create backup of current configuration
                            </li>
                            <li className="flex items-center">
                                <TbCheck className="w-4 h-4 text-green-500 mr-2" />
                                Enable maintenance mode
                            </li>
                            <li className="flex items-center">
                                <TbCheck className="w-4 h-4 text-green-500 mr-2" />
                                Pull latest changes from repository
                            </li>
                            <li className="flex items-center">
                                <TbCheck className="w-4 h-4 text-green-500 mr-2" />
                                Update dependencies and build assets
                            </li>
                            <li className="flex items-center">
                                <TbCheck className="w-4 h-4 text-green-500 mr-2" />
                                Run database migrations
                            </li>
                        </ul>
                    </div>

                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg mb-6">
                        <div className="flex items-start">
                            <TbAlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
                            <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                The panel will be temporarily unavailable during the update process.
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3">
                        <SecondaryButton onClick={() => setShowConfirmModal(false)}>
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton onClick={performUpdate}>
                            <TbDownload className="mr-2 w-4 h-4" />
                            Start Update
                        </PrimaryButton>
                    </div>
                </div>
            </Modal>

            {/* Confirm Rollback Modal */}
            <Modal show={showRollbackModal} onClose={() => setShowRollbackModal(false)} maxWidth="md">
                <div className="p-6">
                    <div className="flex items-center mb-4">
                        <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full mr-4">
                            <TbHistory className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                Confirm Rollback
                            </h3>
                        </div>
                    </div>

                    <div className="mb-6">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            This will revert the panel to the previous version. This action should only be used if the current version has issues.
                        </p>
                    </div>

                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg mb-6">
                        <div className="flex items-start">
                            <TbAlertTriangle className="w-5 h-5 text-red-600 mr-2 mt-0.5" />
                            <p className="text-sm text-red-700 dark:text-red-300">
                                Warning: Rollback may cause data inconsistencies if the previous version doesn't support the current database schema.
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3">
                        <SecondaryButton onClick={() => setShowRollbackModal(false)}>
                            Cancel
                        </SecondaryButton>
                        <DangerButton onClick={performRollback}>
                            <TbHistory className="mr-2 w-4 h-4" />
                            Rollback
                        </DangerButton>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
