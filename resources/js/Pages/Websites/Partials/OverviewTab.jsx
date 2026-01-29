import { useState } from 'react';
import { useForm } from '@inertiajs/react';
import { FaPhp, FaNodeJs, FaHtml5 } from 'react-icons/fa';
import { MdLock, MdLockOpen, MdFolder, MdSave } from 'react-icons/md';
import { SiMysql, SiPostgresql } from 'react-icons/si';
import { TbDatabase, TbSettings, TbWorld, TbCode } from 'react-icons/tb';
import { toast } from 'react-toastify';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';

export default function OverviewTab({ website, phpVersions = [], nodeVersions = [] }) {
    const [isEditing, setIsEditing] = useState(false);

    const { data, setData, patch, processing, errors, reset, isDirty } = useForm({
        document_root: website.document_root || '',
        php_version_id: website.php_version_id || '',
        node_version_id: website.node_version_id || '',
        app_port: website.app_port || 3000,
        startup_file: website.startup_file || 'app.js',
    });

    const handleSubmit = (e) => {
        e.preventDefault();

        patch(route('websites.settings.update', website.id), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Settings updated successfully');
                setIsEditing(false);
            },
            onError: () => {
                toast.error('Failed to update settings');
            },
        });
    };

    const handleCancel = () => {
        reset();
        setIsEditing(false);
    };

    const getAppTypeBadge = () => {
        switch (website.application_type) {
            case 'php':
                return (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                        <FaPhp className="w-4 h-4 mr-1" />
                        PHP {website.php_version?.version}
                    </span>
                );
            case 'nodejs':
                return (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        <FaNodeJs className="w-4 h-4 mr-1" />
                        Node.js {website.node_version?.version}
                    </span>
                );
            case 'static':
                return (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                        <FaHtml5 className="w-4 h-4 mr-1" />
                        Static
                    </span>
                );
            default:
                return null;
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Domain Settings */}
            <div className="bg-white dark:bg-gray-850 rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
                        <TbWorld className="w-5 h-5 mr-2 text-indigo-500" />
                        Domain Settings
                    </h3>
                    {!isEditing && (
                        <button
                            type="button"
                            onClick={() => setIsEditing(true)}
                            className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center"
                        >
                            <TbSettings className="w-4 h-4 mr-1" />
                            Edit Settings
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Domain Name (Read-only) */}
                    <div>
                        <InputLabel value="Domain Name" />
                        <div className="mt-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-md">
                            <p className="text-gray-900 dark:text-gray-100 font-mono">
                                {website.url}
                            </p>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Domain name cannot be changed
                        </p>
                    </div>

                    {/* Application Type (Read-only) */}
                    <div>
                        <InputLabel value="Application Type" />
                        <div className="mt-1">
                            {getAppTypeBadge()}
                        </div>
                    </div>

                    {/* Document Root */}
                    <div>
                        <InputLabel htmlFor="document_root" value="Document Root" />
                        {isEditing ? (
                            <>
                                <div className="flex items-center mt-1">
                                    <span className="text-sm text-gray-500 dark:text-gray-400 font-mono mr-1">
                                        {website.base_path}
                                    </span>
                                    <TextInput
                                        id="document_root"
                                        value={data.document_root}
                                        onChange={(e) => setData('document_root', e.target.value)}
                                        className="flex-grow font-mono"
                                        placeholder="/public"
                                    />
                                </div>
                                <InputError message={errors.document_root} className="mt-1" />
                            </>
                        ) : (
                            <p className="mt-1 text-gray-900 dark:text-gray-100 font-mono flex items-center">
                                <MdFolder className="w-4 h-4 mr-1 text-gray-400" />
                                {website.base_path}{website.document_root}
                            </p>
                        )}
                    </div>

                    {/* SSL Status (Read-only) */}
                    <div>
                        <InputLabel value="SSL Status" />
                        <div className="mt-1">
                            {website.ssl_enabled ? (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                    <MdLock className="w-4 h-4 mr-1" />
                                    SSL Enabled
                                </span>
                            ) : (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                                    <MdLockOpen className="w-4 h-4 mr-1" />
                                    SSL Disabled
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* PHP Settings (only for PHP sites) */}
            {website.application_type === 'php' && (
                <div className="bg-white dark:bg-gray-850 rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                        <FaPhp className="w-5 h-5 mr-2 text-indigo-500" />
                        PHP Settings
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* PHP Version */}
                        <div>
                            <InputLabel htmlFor="php_version_id" value="PHP Version" />
                            {isEditing ? (
                                <>
                                    <select
                                        id="php_version_id"
                                        value={data.php_version_id}
                                        onChange={(e) => setData('php_version_id', e.target.value)}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white sm:text-sm"
                                    >
                                        {phpVersions.map((version) => (
                                            <option key={version.id} value={version.id}>
                                                PHP {version.version}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError message={errors.php_version_id} className="mt-1" />
                                </>
                            ) : (
                                <p className="mt-1 text-gray-900 dark:text-gray-100">
                                    PHP {website.php_version?.version}
                                </p>
                            )}
                        </div>

                        {/* PHP-FPM Pool Info */}
                        <div>
                            <InputLabel value="PHP-FPM Pool" />
                            <p className="mt-1 text-gray-900 dark:text-gray-100 font-mono text-sm">
                                {website.user?.username}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Running under user's PHP-FPM pool
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Node.js Settings (only for Node.js sites) */}
            {website.application_type === 'nodejs' && (
                <div className="bg-white dark:bg-gray-850 rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                        <FaNodeJs className="w-5 h-5 mr-2 text-green-500" />
                        Node.js Settings
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Node Version */}
                        <div>
                            <InputLabel htmlFor="node_version_id" value="Node.js Version" />
                            {isEditing ? (
                                <>
                                    <select
                                        id="node_version_id"
                                        value={data.node_version_id}
                                        onChange={(e) => setData('node_version_id', e.target.value)}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white sm:text-sm"
                                    >
                                        {nodeVersions.map((version) => (
                                            <option key={version.id} value={version.id}>
                                                Node.js {version.version}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError message={errors.node_version_id} className="mt-1" />
                                </>
                            ) : (
                                <p className="mt-1 text-gray-900 dark:text-gray-100">
                                    Node.js {website.node_version?.version}
                                </p>
                            )}
                        </div>

                        {/* App Port */}
                        <div>
                            <InputLabel htmlFor="app_port" value="Application Port" />
                            {isEditing ? (
                                <>
                                    <TextInput
                                        id="app_port"
                                        type="number"
                                        value={data.app_port}
                                        onChange={(e) => setData('app_port', e.target.value)}
                                        className="mt-1 block w-full"
                                        min="1024"
                                        max="65535"
                                    />
                                    <InputError message={errors.app_port} className="mt-1" />
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        Port range: 1024-65535
                                    </p>
                                </>
                            ) : (
                                <p className="mt-1 text-gray-900 dark:text-gray-100 font-mono">
                                    {website.app_port || 3000}
                                </p>
                            )}
                        </div>

                        {/* Startup File */}
                        <div>
                            <InputLabel htmlFor="startup_file" value="Startup File" />
                            {isEditing ? (
                                <>
                                    <TextInput
                                        id="startup_file"
                                        value={data.startup_file}
                                        onChange={(e) => setData('startup_file', e.target.value)}
                                        className="mt-1 block w-full font-mono"
                                        placeholder="app.js"
                                    />
                                    <InputError message={errors.startup_file} className="mt-1" />
                                </>
                            ) : (
                                <p className="mt-1 text-gray-900 dark:text-gray-100 font-mono flex items-center">
                                    <TbCode className="w-4 h-4 mr-1 text-gray-400" />
                                    {website.startup_file || 'app.js'}
                                </p>
                            )}
                        </div>

                        {/* PM2 Process Name */}
                        <div>
                            <InputLabel value="PM2 Process Name" />
                            <p className="mt-1 text-gray-900 dark:text-gray-100 font-mono text-sm">
                                {website.url?.replace(/\./g, '-')}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Auto-generated from domain
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Linked Databases */}
            {website.databases && website.databases.length > 0 && (
                <div className="bg-white dark:bg-gray-850 rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                        <TbDatabase className="w-5 h-5 mr-2" />
                        Linked Databases
                    </h3>

                    <div className="space-y-3">
                        {website.databases.map((db) => (
                            <div
                                key={db.id}
                                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                            >
                                <div className="flex items-center">
                                    {db.driver === 'mysql' ? (
                                        <SiMysql className="w-5 h-5 mr-3 text-orange-500" />
                                    ) : (
                                        <SiPostgresql className="w-5 h-5 mr-3 text-blue-500" />
                                    )}
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-gray-100">
                                            {db.name}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            User: {db.db_user}
                                        </p>
                                    </div>
                                </div>
                                <span className={`px-2 py-1 text-xs rounded ${
                                    db.driver === 'mysql'
                                        ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                }`}>
                                    {db.driver?.toUpperCase()}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Save/Cancel Buttons */}
            {isEditing && (
                <div className="flex justify-end space-x-3">
                    <button
                        type="button"
                        onClick={handleCancel}
                        disabled={processing}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <PrimaryButton disabled={processing || !isDirty}>
                        <MdSave className="w-4 h-4 mr-2" />
                        {processing ? 'Saving...' : 'Save Changes'}
                    </PrimaryButton>
                </div>
            )}
        </form>
    );
}
