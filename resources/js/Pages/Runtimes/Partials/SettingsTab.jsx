import { router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { FaPhp } from 'react-icons/fa6';
import { SiNodedotjs } from 'react-icons/si';
import { TiDelete } from 'react-icons/ti';
import { FaPlus, FaStar } from 'react-icons/fa';
import { toast } from 'react-toastify';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import ConfirmationButton from '@/Components/ConfirmationButton';

export default function SettingsTab() {
    const [versions, setVersions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newVersion, setNewVersion] = useState({
        type: 'php',
        version: '',
        label: '',
        is_lts: false,
        is_active: true,
        sort_order: 0,
    });

    const fetchVersions = () => {
        fetch(route('runtimes.available.index'), {
            headers: { 'Accept': 'application/json' }
        })
            .then(response => response.json())
            .then(data => {
                setVersions(data);
                setLoading(false);
            })
            .catch(() => {
                toast.error('Failed to fetch available versions');
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchVersions();
    }, []);

    const handleAddVersion = () => {
        if (!newVersion.version) {
            toast.error('Please enter a version number');
            return;
        }

        router.post(route('runtimes.available.store'), newVersion, {
            onSuccess: () => {
                toast.success('Version added successfully');
                setShowAddModal(false);
                setNewVersion({
                    type: 'php',
                    version: '',
                    label: '',
                    is_lts: false,
                    is_active: true,
                    sort_order: 0,
                });
                router.reload();
            },
            onError: () => toast.error('Failed to add version'),
        });
    };

    const toggleActive = (version) => {
        router.patch(route('runtimes.available.update'), {
            id: version.id,
            is_active: !version.is_active,
        }, {
            onSuccess: () => {
                toast.success('Version updated');
                router.reload();
            },
            onError: () => toast.error('Failed to update version'),
        });
    };

    const toggleLts = (version) => {
        router.patch(route('runtimes.available.update'), {
            id: version.id,
            is_lts: !version.is_lts,
        }, {
            onSuccess: () => {
                toast.success('Version updated');
                router.reload();
            },
            onError: () => toast.error('Failed to update version'),
        });
    };

    const deleteVersion = (version) => {
        router.delete(route('runtimes.available.destroy'), {
            data: { id: version.id },
            onSuccess: () => {
                toast.success('Version removed');
                router.reload();
            },
            onError: () => toast.error('Failed to remove version'),
        });
    };

    const phpVersions = versions.filter(v => v.type === 'php');
    const nodeVersions = versions.filter(v => v.type === 'nodejs');

    if (loading) {
        return (
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                Loading available versions...
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Manage versions that users can install. Add new versions here when they are released.
                </p>
                <PrimaryButton onClick={() => setShowAddModal(true)}>
                    <FaPlus className="mr-2 w-3 h-3" />
                    Add Version
                </PrimaryButton>
            </div>

            {/* PHP Versions */}
            <div className="mb-8">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                    <FaPhp className="mr-2 text-indigo-600" />
                    PHP Versions
                </h3>
                <div className="relative overflow-x-auto bg-white dark:bg-gray-850 rounded-lg shadow">
                    <table className="w-full text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-gray-700 uppercase bg-gray-200 dark:bg-gray-700 dark:text-gray-300 text-sm">
                            <tr>
                                <th className="px-6 py-3">Version</th>
                                <th className="px-6 py-3">Label</th>
                                <th className="px-6 py-3">LTS</th>
                                <th className="px-6 py-3">Active</th>
                                <th className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {phpVersions.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-4 text-center">No PHP versions configured</td>
                                </tr>
                            ) : (
                                phpVersions.map((version) => (
                                    <tr key={version.id} className="bg-white border-b dark:bg-gray-850 dark:border-gray-700">
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                            PHP {version.version}
                                        </td>
                                        <td className="px-6 py-4">{version.label || '-'}</td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => toggleLts(version)}
                                                className={`px-2 py-1 rounded text-xs ${
                                                    version.is_lts
                                                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                                }`}
                                            >
                                                {version.is_lts ? <><FaStar className="inline w-3 h-3 mr-1" />LTS</> : 'No'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => toggleActive(version)}
                                                className={`px-2 py-1 rounded text-xs ${
                                                    version.is_active
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                }`}
                                            >
                                                {version.is_active ? 'Active' : 'Inactive'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            <ConfirmationButton doAction={() => deleteVersion(version)}>
                                                <TiDelete className="w-6 h-6 text-red-500 cursor-pointer hover:text-red-700" />
                                            </ConfirmationButton>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Node.js Versions */}
            <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                    <SiNodedotjs className="mr-2 text-green-600" />
                    Node.js Versions
                </h3>
                <div className="relative overflow-x-auto bg-white dark:bg-gray-850 rounded-lg shadow">
                    <table className="w-full text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-gray-700 uppercase bg-gray-200 dark:bg-gray-700 dark:text-gray-300 text-sm">
                            <tr>
                                <th className="px-6 py-3">Version</th>
                                <th className="px-6 py-3">Label</th>
                                <th className="px-6 py-3">LTS</th>
                                <th className="px-6 py-3">Active</th>
                                <th className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {nodeVersions.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-4 text-center">No Node.js versions configured</td>
                                </tr>
                            ) : (
                                nodeVersions.map((version) => (
                                    <tr key={version.id} className="bg-white border-b dark:bg-gray-850 dark:border-gray-700">
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                            Node.js {version.version}
                                        </td>
                                        <td className="px-6 py-4">{version.label || '-'}</td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => toggleLts(version)}
                                                className={`px-2 py-1 rounded text-xs ${
                                                    version.is_lts
                                                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                                }`}
                                            >
                                                {version.is_lts ? <><FaStar className="inline w-3 h-3 mr-1" />LTS</> : 'No'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => toggleActive(version)}
                                                className={`px-2 py-1 rounded text-xs ${
                                                    version.is_active
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                }`}
                                            >
                                                {version.is_active ? 'Active' : 'Inactive'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            <ConfirmationButton doAction={() => deleteVersion(version)}>
                                                <TiDelete className="w-6 h-6 text-red-500 cursor-pointer hover:text-red-700" />
                                            </ConfirmationButton>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Version Modal */}
            <Modal show={showAddModal} onClose={() => setShowAddModal(false)}>
                <div className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        Add Available Version
                    </h2>

                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Add a new version that users can install.
                    </p>

                    <div className="mt-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Runtime Type
                            </label>
                            <select
                                value={newVersion.type}
                                onChange={(e) => setNewVersion({ ...newVersion, type: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white sm:text-sm"
                            >
                                <option value="php">PHP</option>
                                <option value="nodejs">Node.js</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Version Number
                            </label>
                            <input
                                type="text"
                                value={newVersion.version}
                                onChange={(e) => setNewVersion({ ...newVersion, version: e.target.value })}
                                placeholder={newVersion.type === 'php' ? '8.5' : '23'}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white sm:text-sm"
                            />
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {newVersion.type === 'php' ? 'Format: 8.5, 8.4, etc.' : 'Format: 22, 20, 18, etc.'}
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Label (optional)
                            </label>
                            <input
                                type="text"
                                value={newVersion.label}
                                onChange={(e) => setNewVersion({ ...newVersion, label: e.target.value })}
                                placeholder={newVersion.type === 'php' ? 'PHP 8.5 (Latest)' : 'Node.js 22 (Current)'}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white sm:text-sm"
                            />
                        </div>

                        <div className="flex items-center space-x-6">
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={newVersion.is_lts}
                                    onChange={(e) => setNewVersion({ ...newVersion, is_lts: e.target.checked })}
                                    className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500 dark:border-gray-600"
                                />
                                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">LTS Version</span>
                            </label>

                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={newVersion.is_active}
                                    onChange={(e) => setNewVersion({ ...newVersion, is_active: e.target.checked })}
                                    className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500 dark:border-gray-600"
                                />
                                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Active</span>
                            </label>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end space-x-3">
                        <SecondaryButton onClick={() => setShowAddModal(false)}>
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton onClick={handleAddVersion}>
                            Add Version
                        </PrimaryButton>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
