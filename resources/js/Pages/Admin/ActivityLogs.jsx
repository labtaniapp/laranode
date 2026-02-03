import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    TbActivity, TbFilter, TbDownload, TbTrash, TbSearch,
    TbLogin, TbUser, TbWorld, TbDatabase, TbMail, TbShieldLock,
    TbServer, TbShield, TbCloudUpload, TbAlertTriangle, TbInfoCircle,
    TbAlertCircle, TbX, TbChevronLeft, TbChevronRight
} from 'react-icons/tb';
import TextInput from '@/Components/TextInput';
import SelectInput from '@/Components/SelectInput';
import SecondaryButton from '@/Components/SecondaryButton';
import DangerButton from '@/Components/DangerButton';
import Modal from '@/Components/Modal';
import { toast } from 'react-toastify';

const categoryIcons = {
    auth: TbLogin,
    user: TbUser,
    website: TbWorld,
    database: TbDatabase,
    email: TbMail,
    security: TbShieldLock,
    system: TbServer,
    firewall: TbShield,
    backup: TbCloudUpload,
};

const severityConfig = {
    info: { color: 'blue', icon: TbInfoCircle },
    warning: { color: 'yellow', icon: TbAlertTriangle },
    error: { color: 'red', icon: TbAlertCircle },
    critical: { color: 'red', icon: TbAlertCircle },
};

export default function ActivityLogs({ logs, categories, actions, filters }) {
    const [showFilters, setShowFilters] = useState(false);
    const [showCleanupModal, setShowCleanupModal] = useState(false);
    const [cleanupDays, setCleanupDays] = useState(90);
    const [localFilters, setLocalFilters] = useState(filters || {});

    const applyFilters = () => {
        router.get(route('activity-logs.index'), localFilters, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const clearFilters = () => {
        setLocalFilters({});
        router.get(route('activity-logs.index'));
    };

    const exportLogs = () => {
        window.location.href = route('activity-logs.export', filters);
    };

    const cleanupLogs = async () => {
        try {
            const response = await fetch(route('activity-logs.cleanup'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                },
                body: JSON.stringify({ days: cleanupDays }),
            });
            const data = await response.json();
            if (data.success) {
                toast.success(`Deleted ${data.deleted} old logs`);
                setShowCleanupModal(false);
                router.reload();
            }
        } catch (error) {
            toast.error('Failed to clean up logs');
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    const CategoryIcon = ({ category }) => {
        const Icon = categoryIcons[category] || TbActivity;
        return <Icon className="w-4 h-4" />;
    };

    const SeverityBadge = ({ severity }) => {
        const config = severityConfig[severity] || severityConfig.info;
        const colorClasses = {
            blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
            yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
            red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
        };

        return (
            <span className={`px-2 py-0.5 text-xs font-medium rounded ${colorClasses[config.color]}`}>
                {severity}
            </span>
        );
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200 flex items-center">
                        <TbActivity className="mr-2" />
                        Activity Logs
                    </h2>
                    <div className="flex space-x-2">
                        <SecondaryButton onClick={() => setShowFilters(!showFilters)}>
                            <TbFilter className="w-4 h-4 mr-1" />
                            Filters
                        </SecondaryButton>
                        <SecondaryButton onClick={exportLogs}>
                            <TbDownload className="w-4 h-4 mr-1" />
                            Export
                        </SecondaryButton>
                        <DangerButton onClick={() => setShowCleanupModal(true)}>
                            <TbTrash className="w-4 h-4 mr-1" />
                            Cleanup
                        </DangerButton>
                    </div>
                </div>
            }
        >
            <Head title="Activity Logs" />

            <div className="py-8">
                <div className="max-w-7xl mx-auto px-4">
                    {/* Filters Panel */}
                    {showFilters && (
                        <div className="bg-white dark:bg-gray-850 rounded-lg shadow mb-6 p-4">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Search
                                    </label>
                                    <div className="relative">
                                        <TbSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                        <TextInput
                                            className="pl-10 w-full"
                                            placeholder="Search description..."
                                            value={localFilters.search || ''}
                                            onChange={(e) => setLocalFilters({ ...localFilters, search: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Category
                                    </label>
                                    <SelectInput
                                        className="w-full"
                                        value={localFilters.category || ''}
                                        onChange={(e) => setLocalFilters({ ...localFilters, category: e.target.value })}
                                    >
                                        <option value="">All Categories</option>
                                        {categories.map((cat) => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </SelectInput>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Action
                                    </label>
                                    <SelectInput
                                        className="w-full"
                                        value={localFilters.action || ''}
                                        onChange={(e) => setLocalFilters({ ...localFilters, action: e.target.value })}
                                    >
                                        <option value="">All Actions</option>
                                        {actions.map((action) => (
                                            <option key={action} value={action}>{action}</option>
                                        ))}
                                    </SelectInput>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Severity
                                    </label>
                                    <SelectInput
                                        className="w-full"
                                        value={localFilters.severity || ''}
                                        onChange={(e) => setLocalFilters({ ...localFilters, severity: e.target.value })}
                                    >
                                        <option value="">All Severities</option>
                                        <option value="info">Info</option>
                                        <option value="warning">Warning</option>
                                        <option value="error">Error</option>
                                        <option value="critical">Critical</option>
                                    </SelectInput>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        From Date
                                    </label>
                                    <TextInput
                                        type="date"
                                        className="w-full"
                                        value={localFilters.from || ''}
                                        onChange={(e) => setLocalFilters({ ...localFilters, from: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        To Date
                                    </label>
                                    <TextInput
                                        type="date"
                                        className="w-full"
                                        value={localFilters.to || ''}
                                        onChange={(e) => setLocalFilters({ ...localFilters, to: e.target.value })}
                                    />
                                </div>

                                <div className="flex items-end space-x-2 md:col-span-2">
                                    <SecondaryButton onClick={applyFilters}>
                                        Apply Filters
                                    </SecondaryButton>
                                    <SecondaryButton onClick={clearFilters}>
                                        <TbX className="w-4 h-4 mr-1" />
                                        Clear
                                    </SecondaryButton>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Logs Table */}
                    <div className="bg-white dark:bg-gray-850 rounded-lg shadow overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-800">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Date
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            User
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Category
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Action
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Description
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            IP Address
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Severity
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-850 divide-y divide-gray-200 dark:divide-gray-700">
                                    {logs.data.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                                                No activity logs found
                                            </td>
                                        </tr>
                                    ) : (
                                        logs.data.map((log) => (
                                            <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                    {formatDate(log.created_at)}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                                    {log.user?.name || 'System'}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                                        <CategoryIcon category={log.category} />
                                                        <span className="ml-1">{log.category}</span>
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                                    {log.action}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 max-w-md truncate">
                                                    {log.description}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono">
                                                    {log.ip_address || '-'}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <SeverityBadge severity={log.severity} />
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {logs.last_page > 1 && (
                            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    Showing {logs.from} to {logs.to} of {logs.total} results
                                </div>
                                <div className="flex space-x-2">
                                    {logs.prev_page_url && (
                                        <SecondaryButton
                                            onClick={() => router.get(logs.prev_page_url)}
                                        >
                                            <TbChevronLeft className="w-4 h-4" />
                                        </SecondaryButton>
                                    )}
                                    <span className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                                        Page {logs.current_page} of {logs.last_page}
                                    </span>
                                    {logs.next_page_url && (
                                        <SecondaryButton
                                            onClick={() => router.get(logs.next_page_url)}
                                        >
                                            <TbChevronRight className="w-4 h-4" />
                                        </SecondaryButton>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Cleanup Modal */}
            <Modal show={showCleanupModal} onClose={() => setShowCleanupModal(false)} maxWidth="md">
                <div className="p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                        Cleanup Old Logs
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Delete activity logs older than the specified number of days.
                    </p>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Delete logs older than (days)
                        </label>
                        <TextInput
                            type="number"
                            min="7"
                            max="365"
                            value={cleanupDays}
                            onChange={(e) => setCleanupDays(parseInt(e.target.value))}
                            className="w-full"
                        />
                    </div>

                    <div className="flex justify-end space-x-3">
                        <SecondaryButton onClick={() => setShowCleanupModal(false)}>
                            Cancel
                        </SecondaryButton>
                        <DangerButton onClick={cleanupLogs}>
                            Delete Old Logs
                        </DangerButton>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
