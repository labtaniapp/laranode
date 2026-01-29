import { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { SiMysql, SiPostgresql } from 'react-icons/si';
import { TbDatabase, TbCopy, TbEye, TbEyeOff, TbPlus, TbExternalLink, TbUnlink } from 'react-icons/tb';
import { toast } from 'react-toastify';
import ConfirmationButton from '@/Components/ConfirmationButton';

export default function DatabasesTab({ website }) {
    const [showPassword, setShowPassword] = useState({});
    const databases = website.databases || [];

    const togglePassword = (dbId) => {
        setShowPassword(prev => ({
            ...prev,
            [dbId]: !prev[dbId]
        }));
    };

    const copyToClipboard = (text, label) => {
        navigator.clipboard.writeText(text).then(() => {
            toast.success(`${label} copied to clipboard`);
        }).catch(() => {
            toast.error('Failed to copy');
        });
    };

    const handleUnlink = (db) => {
        router.patch(route('databases.update', db.id), {
            website_id: null,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Database unlinked from website');
            },
        });
    };

    const getDriverIcon = (driver) => {
        if (driver === 'mysql') {
            return <SiMysql className="w-6 h-6 text-orange-500" />;
        }
        return <SiPostgresql className="w-6 h-6 text-blue-500" />;
    };

    const getDriverBadge = (driver) => {
        const isMySQL = driver === 'mysql';
        return (
            <span className={`px-2 py-1 text-xs rounded font-medium ${
                isMySQL
                    ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
            }`}>
                {driver?.toUpperCase()}
            </span>
        );
    };

    const getConnectionHost = (driver) => {
        return driver === 'mysql' ? '127.0.0.1:3306' : '127.0.0.1:5432';
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Databases linked to this website. Use these credentials in your application configuration.
                </p>
                <Link
                    href={route('databases.index')}
                    className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                    <TbPlus className="mr-2 w-4 h-4" />
                    Create Database
                </Link>
            </div>

            {databases.length === 0 ? (
                <div className="bg-white dark:bg-gray-850 rounded-lg shadow p-8 text-center">
                    <TbDatabase className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                        No databases linked to this website yet.
                    </p>
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                        Create a new database and link it to this website from the Databases page.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {databases.map((db) => (
                        <div key={db.id} className="bg-white dark:bg-gray-850 rounded-lg shadow overflow-hidden">
                            {/* Header */}
                            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                                <div className="flex items-center">
                                    {getDriverIcon(db.driver)}
                                    <div className="ml-3">
                                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                                            {db.name}
                                        </h4>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {db.charset} / {db.collation}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    {getDriverBadge(db.driver)}
                                    <ConfirmationButton doAction={() => handleUnlink(db)}>
                                        <button
                                            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-400 transition-colors"
                                            title="Unlink from website"
                                        >
                                            <TbUnlink className="w-4 h-4" />
                                        </button>
                                    </ConfirmationButton>
                                </div>
                            </div>

                            {/* Connection Details */}
                            <div className="p-6">
                                <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                                    Connection Details
                                </h5>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Host */}
                                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Host</p>
                                            <p className="text-sm font-mono text-gray-900 dark:text-gray-100">
                                                {getConnectionHost(db.driver)}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => copyToClipboard(getConnectionHost(db.driver).split(':')[0], 'Host')}
                                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                        >
                                            <TbCopy className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Database Name */}
                                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Database</p>
                                            <p className="text-sm font-mono text-gray-900 dark:text-gray-100">
                                                {db.name}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => copyToClipboard(db.name, 'Database name')}
                                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                        >
                                            <TbCopy className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Username */}
                                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Username</p>
                                            <p className="text-sm font-mono text-gray-900 dark:text-gray-100">
                                                {db.db_user}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => copyToClipboard(db.db_user, 'Username')}
                                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                        >
                                            <TbCopy className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Password */}
                                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <div className="flex-grow">
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Password</p>
                                            <p className="text-sm font-mono text-gray-900 dark:text-gray-100">
                                                {showPassword[db.id] ? db.db_password : '••••••••••••'}
                                            </p>
                                        </div>
                                        <div className="flex items-center">
                                            <button
                                                onClick={() => togglePassword(db.id)}
                                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                            >
                                                {showPassword[db.id] ? <TbEyeOff className="w-4 h-4" /> : <TbEye className="w-4 h-4" />}
                                            </button>
                                            <button
                                                onClick={() => copyToClipboard(db.db_password, 'Password')}
                                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                            >
                                                <TbCopy className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Quick Copy Connection String */}
                                <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-900 rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Connection String</p>
                                        <button
                                            onClick={() => {
                                                const host = getConnectionHost(db.driver).split(':')[0];
                                                const port = getConnectionHost(db.driver).split(':')[1];
                                                const connectionString = db.driver === 'mysql'
                                                    ? `mysql://${db.db_user}:${db.db_password}@${host}:${port}/${db.name}`
                                                    : `postgresql://${db.db_user}:${db.db_password}@${host}:${port}/${db.name}`;
                                                copyToClipboard(connectionString, 'Connection string');
                                            }}
                                            className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center"
                                        >
                                            <TbCopy className="w-3 h-3 mr-1" />
                                            Copy
                                        </button>
                                    </div>
                                    <code className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all">
                                        {db.driver === 'mysql'
                                            ? `mysql://${db.db_user}:****@127.0.0.1:3306/${db.name}`
                                            : `postgresql://${db.db_user}:****@127.0.0.1:5432/${db.name}`
                                        }
                                    </code>
                                </div>

                                {/* Adminer Link */}
                                <div className="mt-4 flex justify-end">
                                    <a
                                        href={route('databases.adminer', db.id)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                                    >
                                        <TbExternalLink className="mr-1 w-4 h-4" />
                                        Open in Adminer
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
