import { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    TbShieldLock, TbPlus, TbTrash, TbEdit, TbCheck, TbX,
    TbLock, TbLockOpen, TbAlertTriangle, TbClock
} from 'react-icons/tb';
import TextInput from '@/Components/TextInput';
import SelectInput from '@/Components/SelectInput';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import DangerButton from '@/Components/DangerButton';
import Modal from '@/Components/Modal';
import { toast } from 'react-toastify';

export default function IpRestrictions({ restrictions, blockedAttempts }) {
    const [showAddModal, setShowAddModal] = useState(false);
    const [activeTab, setActiveTab] = useState('restrictions');

    const { data, setData, post, processing, errors, reset } = useForm({
        ip_address: '',
        type: 'blacklist',
        scope: 'global',
        reason: '',
        expires_at: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('ip-restrictions.store'), {
            onSuccess: () => {
                setShowAddModal(false);
                reset();
                toast.success('IP restriction added successfully');
            },
        });
    };

    const deleteRestriction = (id) => {
        if (confirm('Are you sure you want to remove this IP restriction?')) {
            router.delete(route('ip-restrictions.destroy', id), {
                onSuccess: () => toast.success('IP restriction removed'),
            });
        }
    };

    const toggleActive = (restriction) => {
        router.patch(route('ip-restrictions.update', restriction.id), {
            is_active: !restriction.is_active,
        }, {
            onSuccess: () => toast.success('IP restriction updated'),
        });
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString();
    };

    const TypeBadge = ({ type }) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
            type === 'blacklist'
                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
        }`}>
            {type === 'blacklist' ? <TbLock className="w-3 h-3 mr-1" /> : <TbLockOpen className="w-3 h-3 mr-1" />}
            {type}
        </span>
    );

    const ScopeBadge = ({ scope }) => {
        const colors = {
            global: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
            admin: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
            login: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
        };

        return (
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[scope]}`}>
                {scope}
            </span>
        );
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200 flex items-center">
                        <TbShieldLock className="mr-2" />
                        IP Restrictions
                    </h2>
                    <PrimaryButton onClick={() => setShowAddModal(true)}>
                        <TbPlus className="w-4 h-4 mr-1" />
                        Add IP Rule
                    </PrimaryButton>
                </div>
            }
        >
            <Head title="IP Restrictions" />

            <div className="py-8">
                <div className="max-w-7xl mx-auto px-4">
                    {/* Tabs */}
                    <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
                        <nav className="-mb-px flex space-x-8">
                            <button
                                onClick={() => setActiveTab('restrictions')}
                                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                    activeTab === 'restrictions'
                                        ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                IP Rules ({restrictions.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('blocked')}
                                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                    activeTab === 'blocked'
                                        ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                Blocked Attempts ({blockedAttempts.length})
                            </button>
                        </nav>
                    </div>

                    {/* Restrictions Tab */}
                    {activeTab === 'restrictions' && (
                        <div className="bg-white dark:bg-gray-850 rounded-lg shadow overflow-hidden">
                            {restrictions.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                                    <TbShieldLock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                    <p>No IP restrictions configured</p>
                                    <p className="text-sm mt-1">Add whitelist or blacklist rules to control access</p>
                                </div>
                            ) : (
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-800">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                IP Address
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Type
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Scope
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Reason
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Expires
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Status
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {restrictions.map((restriction) => (
                                            <tr key={restriction.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                                <td className="px-4 py-3 font-mono text-sm text-gray-900 dark:text-gray-100">
                                                    {restriction.ip_address}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <TypeBadge type={restriction.type} />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <ScopeBadge scope={restriction.scope} />
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                                                    {restriction.reason || '-'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                                    {restriction.expires_at ? (
                                                        <span className="flex items-center">
                                                            <TbClock className="w-4 h-4 mr-1" />
                                                            {formatDate(restriction.expires_at)}
                                                        </span>
                                                    ) : (
                                                        'Never'
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <button
                                                        onClick={() => toggleActive(restriction)}
                                                        className={`px-2 py-1 rounded text-xs font-medium ${
                                                            restriction.is_active
                                                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                                        }`}
                                                    >
                                                        {restriction.is_active ? 'Active' : 'Inactive'}
                                                    </button>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <button
                                                        onClick={() => deleteRestriction(restriction.id)}
                                                        className="text-red-600 hover:text-red-800 dark:text-red-400"
                                                    >
                                                        <TbTrash className="w-5 h-5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}

                    {/* Blocked Attempts Tab */}
                    {activeTab === 'blocked' && (
                        <div className="bg-white dark:bg-gray-850 rounded-lg shadow overflow-hidden">
                            {blockedAttempts.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                                    <TbAlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                    <p>No blocked attempts recorded</p>
                                </div>
                            ) : (
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-800">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Date
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                IP Address
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Reason
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                URL
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {blockedAttempts.map((attempt, index) => (
                                            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                                    {formatDate(attempt.created_at)}
                                                </td>
                                                <td className="px-4 py-3 font-mono text-sm text-gray-900 dark:text-gray-100">
                                                    {attempt.ip_address}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                                    {attempt.reason}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                                                    {attempt.url || '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Add IP Rule Modal */}
            <Modal show={showAddModal} onClose={() => setShowAddModal(false)} maxWidth="md">
                <form onSubmit={submit} className="p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                        Add IP Restriction
                    </h3>

                    <div className="space-y-4">
                        <div>
                            <InputLabel htmlFor="ip_address" value="IP Address" />
                            <TextInput
                                id="ip_address"
                                className="mt-1 block w-full"
                                value={data.ip_address}
                                onChange={(e) => setData('ip_address', e.target.value)}
                                placeholder="192.168.1.1, 192.168.1.0/24, or 192.168.1.*"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                Supports exact IP, CIDR notation, or wildcard (*)
                            </p>
                            <InputError message={errors.ip_address} className="mt-2" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <InputLabel htmlFor="type" value="Type" />
                                <SelectInput
                                    id="type"
                                    className="mt-1 block w-full"
                                    value={data.type}
                                    onChange={(e) => setData('type', e.target.value)}
                                >
                                    <option value="blacklist">Blacklist (Block)</option>
                                    <option value="whitelist">Whitelist (Allow)</option>
                                </SelectInput>
                            </div>

                            <div>
                                <InputLabel htmlFor="scope" value="Scope" />
                                <SelectInput
                                    id="scope"
                                    className="mt-1 block w-full"
                                    value={data.scope}
                                    onChange={(e) => setData('scope', e.target.value)}
                                >
                                    <option value="global">Global (All)</option>
                                    <option value="admin">Admin Only</option>
                                    <option value="login">Login Only</option>
                                </SelectInput>
                            </div>
                        </div>

                        <div>
                            <InputLabel htmlFor="reason" value="Reason (optional)" />
                            <TextInput
                                id="reason"
                                className="mt-1 block w-full"
                                value={data.reason}
                                onChange={(e) => setData('reason', e.target.value)}
                                placeholder="Why is this IP being restricted?"
                            />
                        </div>

                        <div>
                            <InputLabel htmlFor="expires_at" value="Expires (optional)" />
                            <TextInput
                                id="expires_at"
                                type="datetime-local"
                                className="mt-1 block w-full"
                                value={data.expires_at}
                                onChange={(e) => setData('expires_at', e.target.value)}
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                Leave empty for permanent restriction
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end space-x-3">
                        <SecondaryButton type="button" onClick={() => setShowAddModal(false)}>
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton type="submit" disabled={processing}>
                            Add Restriction
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}
