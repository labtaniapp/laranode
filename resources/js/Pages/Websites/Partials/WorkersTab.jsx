import { useForm, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { TbServer, TbPlus, TbPlayerPlay, TbPlayerStop, TbRefresh, TbTrash, TbSettings, TbTerminal, TbFileText } from 'react-icons/tb';
import { toast } from 'react-toastify';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import DangerButton from '@/Components/DangerButton';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import ConfirmationButton from '@/Components/ConfirmationButton';

const presets = {
    'queue-worker': {
        name: 'queue-worker',
        command: 'php artisan queue:work --sleep=3 --tries=3 --max-time=3600',
        description: 'Laravel Queue Worker',
    },
    'horizon': {
        name: 'horizon',
        command: 'php artisan horizon',
        description: 'Laravel Horizon',
    },
    'reverb': {
        name: 'reverb',
        command: 'php artisan reverb:start',
        description: 'Laravel Reverb WebSockets',
    },
    'scheduler': {
        name: 'scheduler',
        command: 'php artisan schedule:work',
        description: 'Laravel Scheduler',
    },
    'octane': {
        name: 'octane',
        command: 'php artisan octane:start --server=swoole --host=127.0.0.1 --port=8000',
        description: 'Laravel Octane',
    },
};

const StatusBadge = ({ status }) => {
    const styles = {
        running: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        stopped: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        starting: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        stopping: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        fatal: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        unknown: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    };

    return (
        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${styles[status] || styles.unknown}`}>
            {status}
        </span>
    );
};

export default function WorkersTab({ website, workers: initialWorkers = [] }) {
    const [workers, setWorkers] = useState(initialWorkers);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showLogsModal, setShowLogsModal] = useState(false);
    const [editingWorker, setEditingWorker] = useState(null);
    const [logs, setLogs] = useState('');
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [logType, setLogType] = useState('stdout');
    const [loading, setLoading] = useState(false);

    const createForm = useForm({
        name: '',
        command: '',
        numprocs: 1,
        autostart: true,
        autorestart: true,
        startsecs: 1,
        stopwaitsecs: 10,
    });

    const editForm = useForm({
        command: '',
        numprocs: 1,
        autostart: true,
        autorestart: true,
        startsecs: 1,
        stopwaitsecs: 10,
    });

    // Fetch workers on mount
    useEffect(() => {
        fetchWorkers();
    }, []);

    // Auto-refresh status every 10 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            fetchWorkers();
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    const fetchWorkers = async () => {
        try {
            const response = await fetch(route('websites.workers.index', website.id));
            const data = await response.json();
            setWorkers(data);
        } catch (error) {
            console.error('Failed to fetch workers');
        }
    };

    const handleCreate = (e) => {
        e.preventDefault();
        createForm.post(route('websites.workers.store', website.id), {
            onSuccess: () => {
                setShowCreateModal(false);
                createForm.reset();
                fetchWorkers();
                toast.success('Worker created');
            },
            onError: () => toast.error('Failed to create worker'),
        });
    };

    const handleUpdate = (e) => {
        e.preventDefault();
        editForm.patch(route('websites.workers.update', [website.id, editingWorker.id]), {
            onSuccess: () => {
                setShowEditModal(false);
                setEditingWorker(null);
                fetchWorkers();
                toast.success('Worker updated');
            },
            onError: () => toast.error('Failed to update worker'),
        });
    };

    const handleDelete = (workerId) => {
        router.delete(route('websites.workers.destroy', [website.id, workerId]), {
            onSuccess: () => {
                fetchWorkers();
                toast.success('Worker deleted');
            },
            onError: () => toast.error('Failed to delete worker'),
        });
    };

    const handleStart = (workerId) => {
        router.post(route('websites.workers.start', [website.id, workerId]), {}, {
            onSuccess: () => {
                fetchWorkers();
                toast.success('Worker started');
            },
            onError: () => toast.error('Failed to start worker'),
        });
    };

    const handleStop = (workerId) => {
        router.post(route('websites.workers.stop', [website.id, workerId]), {}, {
            onSuccess: () => {
                fetchWorkers();
                toast.success('Worker stopped');
            },
            onError: () => toast.error('Failed to stop worker'),
        });
    };

    const handleRestart = (workerId) => {
        router.post(route('websites.workers.restart', [website.id, workerId]), {}, {
            onSuccess: () => {
                fetchWorkers();
                toast.success('Worker restarted');
            },
            onError: () => toast.error('Failed to restart worker'),
        });
    };

    const openEditModal = (worker) => {
        setEditingWorker(worker);
        editForm.setData({
            command: worker.command,
            numprocs: worker.numprocs,
            autostart: worker.autostart,
            autorestart: worker.autorestart,
            startsecs: 1,
            stopwaitsecs: 10,
        });
        setShowEditModal(true);
    };

    const openLogsModal = async (worker, type = 'stdout') => {
        setEditingWorker(worker);
        setLogType(type);
        setLoadingLogs(true);
        setShowLogsModal(true);

        try {
            const response = await fetch(route('websites.workers.logs', [website.id, worker.id]) + `?type=${type}&lines=200`);
            const data = await response.json();
            setLogs(data.logs);
        } catch (error) {
            toast.error('Failed to load logs');
        } finally {
            setLoadingLogs(false);
        }
    };

    const refreshLogs = async () => {
        if (!editingWorker) return;
        setLoadingLogs(true);

        try {
            const response = await fetch(route('websites.workers.logs', [website.id, editingWorker.id]) + `?type=${logType}&lines=200`);
            const data = await response.json();
            setLogs(data.logs);
        } catch (error) {
            toast.error('Failed to refresh logs');
        } finally {
            setLoadingLogs(false);
        }
    };

    const applyPreset = (presetKey) => {
        const preset = presets[presetKey];
        if (preset) {
            createForm.setData({
                ...createForm.data,
                name: preset.name,
                command: preset.command,
            });
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white dark:bg-gray-850 rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
                            <TbServer className="mr-2 w-5 h-5" />
                            Supervisor Workers
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Manage background processes for your application
                        </p>
                    </div>
                    <PrimaryButton onClick={() => setShowCreateModal(true)}>
                        <TbPlus className="mr-2 w-4 h-4" />
                        Add Worker
                    </PrimaryButton>
                </div>

                {/* Workers List */}
                {workers.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                        <TbServer className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                        <h4 className="text-gray-900 dark:text-gray-100 font-medium mb-2">No Workers</h4>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                            Create your first worker to run background jobs
                        </p>
                        <SecondaryButton onClick={() => setShowCreateModal(true)}>
                            <TbPlus className="mr-2 w-4 h-4" />
                            Create Worker
                        </SecondaryButton>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {workers.map((worker) => (
                            <div key={worker.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3">
                                            <h4 className="font-medium text-gray-900 dark:text-gray-100">
                                                {worker.name}
                                            </h4>
                                            <StatusBadge status={worker.status} />
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                {worker.numprocs} process{worker.numprocs > 1 ? 'es' : ''}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-mono">
                                            {worker.command}
                                        </p>
                                        {worker.last_started_at && (
                                            <p className="text-xs text-gray-400 mt-1">
                                                Last started: {new Date(worker.last_started_at).toLocaleString()}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center space-x-2 ml-4">
                                        {worker.status === 'running' ? (
                                            <>
                                                <button
                                                    onClick={() => handleRestart(worker.id)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                                                    title="Restart"
                                                >
                                                    <TbRefresh className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleStop(worker.id)}
                                                    className="p-2 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded"
                                                    title="Stop"
                                                >
                                                    <TbPlayerStop className="w-4 h-4" />
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => handleStart(worker.id)}
                                                className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                                                title="Start"
                                            >
                                                <TbPlayerPlay className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => openLogsModal(worker, 'stdout')}
                                            className="p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded"
                                            title="View Logs"
                                        >
                                            <TbTerminal className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => openEditModal(worker)}
                                            className="p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded"
                                            title="Settings"
                                        >
                                            <TbSettings className="w-4 h-4" />
                                        </button>
                                        <ConfirmationButton doAction={() => handleDelete(worker.id)}>
                                            <button
                                                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                                title="Delete"
                                            >
                                                <TbTrash className="w-4 h-4" />
                                            </button>
                                        </ConfirmationButton>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Modal */}
            <Modal show={showCreateModal} onClose={() => setShowCreateModal(false)} maxWidth="xl">
                <form onSubmit={handleCreate} className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center mb-6">
                        <TbPlus className="mr-2" />
                        Create Worker
                    </h2>

                    {/* Presets */}
                    <div className="mb-6">
                        <InputLabel value="Quick Presets" />
                        <div className="flex flex-wrap gap-2 mt-2">
                            {Object.entries(presets).map(([key, preset]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => applyPreset(key)}
                                    className="px-3 py-1 text-xs rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                                >
                                    {preset.description}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <InputLabel htmlFor="name" value="Worker Name" />
                            <TextInput
                                id="name"
                                value={createForm.data.name}
                                onChange={(e) => createForm.setData('name', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                                className="mt-1 block w-full"
                                placeholder="queue-worker"
                            />
                            <p className="text-xs text-gray-500 mt-1">Only lowercase letters, numbers, and dashes</p>
                            <InputError message={createForm.errors.name} className="mt-2" />
                        </div>

                        <div>
                            <InputLabel htmlFor="command" value="Command" />
                            <TextInput
                                id="command"
                                value={createForm.data.command}
                                onChange={(e) => createForm.setData('command', e.target.value)}
                                className="mt-1 block w-full font-mono text-sm"
                                placeholder="php artisan queue:work"
                            />
                            <InputError message={createForm.errors.command} className="mt-2" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <InputLabel htmlFor="numprocs" value="Number of Processes" />
                                <TextInput
                                    id="numprocs"
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={createForm.data.numprocs}
                                    onChange={(e) => createForm.setData('numprocs', parseInt(e.target.value))}
                                    className="mt-1 block w-full"
                                />
                            </div>
                            <div>
                                <InputLabel htmlFor="startsecs" value="Start Seconds" />
                                <TextInput
                                    id="startsecs"
                                    type="number"
                                    min="0"
                                    max="60"
                                    value={createForm.data.startsecs}
                                    onChange={(e) => createForm.setData('startsecs', parseInt(e.target.value))}
                                    className="mt-1 block w-full"
                                />
                            </div>
                        </div>

                        <div className="flex items-center space-x-6">
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={createForm.data.autostart}
                                    onChange={(e) => createForm.setData('autostart', e.target.checked)}
                                    className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500"
                                />
                                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Auto-start on boot</span>
                            </label>
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={createForm.data.autorestart}
                                    onChange={(e) => createForm.setData('autorestart', e.target.checked)}
                                    className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500"
                                />
                                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Auto-restart on failure</span>
                            </label>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end space-x-3">
                        <SecondaryButton onClick={() => setShowCreateModal(false)}>Cancel</SecondaryButton>
                        <PrimaryButton disabled={createForm.processing}>
                            {createForm.processing ? 'Creating...' : 'Create Worker'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Edit Modal */}
            <Modal show={showEditModal} onClose={() => setShowEditModal(false)} maxWidth="xl">
                <form onSubmit={handleUpdate} className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center mb-6">
                        <TbSettings className="mr-2" />
                        Edit Worker: {editingWorker?.name}
                    </h2>

                    <div className="space-y-4">
                        <div>
                            <InputLabel htmlFor="edit_command" value="Command" />
                            <TextInput
                                id="edit_command"
                                value={editForm.data.command}
                                onChange={(e) => editForm.setData('command', e.target.value)}
                                className="mt-1 block w-full font-mono text-sm"
                            />
                            <InputError message={editForm.errors.command} className="mt-2" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <InputLabel htmlFor="edit_numprocs" value="Number of Processes" />
                                <TextInput
                                    id="edit_numprocs"
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={editForm.data.numprocs}
                                    onChange={(e) => editForm.setData('numprocs', parseInt(e.target.value))}
                                    className="mt-1 block w-full"
                                />
                            </div>
                            <div>
                                <InputLabel htmlFor="edit_stopwaitsecs" value="Stop Wait Seconds" />
                                <TextInput
                                    id="edit_stopwaitsecs"
                                    type="number"
                                    min="5"
                                    max="300"
                                    value={editForm.data.stopwaitsecs}
                                    onChange={(e) => editForm.setData('stopwaitsecs', parseInt(e.target.value))}
                                    className="mt-1 block w-full"
                                />
                            </div>
                        </div>

                        <div className="flex items-center space-x-6">
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={editForm.data.autostart}
                                    onChange={(e) => editForm.setData('autostart', e.target.checked)}
                                    className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500"
                                />
                                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Auto-start on boot</span>
                            </label>
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={editForm.data.autorestart}
                                    onChange={(e) => editForm.setData('autorestart', e.target.checked)}
                                    className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500"
                                />
                                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Auto-restart on failure</span>
                            </label>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end space-x-3">
                        <SecondaryButton onClick={() => setShowEditModal(false)}>Cancel</SecondaryButton>
                        <PrimaryButton disabled={editForm.processing}>
                            {editForm.processing ? 'Saving...' : 'Save Changes'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Logs Modal */}
            <Modal show={showLogsModal} onClose={() => setShowLogsModal(false)} maxWidth="3xl">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
                            <TbTerminal className="mr-2" />
                            Worker Logs: {editingWorker?.name}
                        </h2>
                        <div className="flex items-center space-x-2">
                            <select
                                value={logType}
                                onChange={(e) => {
                                    setLogType(e.target.value);
                                    openLogsModal(editingWorker, e.target.value);
                                }}
                                className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white text-sm"
                            >
                                <option value="stdout">Standard Output</option>
                                <option value="stderr">Error Output</option>
                            </select>
                            <button
                                onClick={refreshLogs}
                                className="p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded"
                                title="Refresh"
                            >
                                <TbRefresh className={`w-4 h-4 ${loadingLogs ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>

                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-auto max-h-96 font-mono whitespace-pre-wrap">
                        {loadingLogs ? 'Loading logs...' : (logs || 'No logs available')}
                    </pre>

                    <div className="mt-4 flex justify-end">
                        <SecondaryButton onClick={() => setShowLogsModal(false)}>Close</SecondaryButton>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
