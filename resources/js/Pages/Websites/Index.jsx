import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import ConfirmationButton from "@/Components/ConfirmationButton";
import { TiDelete } from "react-icons/ti";
import { toast } from "react-toastify";
import { router } from '@inertiajs/react'
import { TbWorldWww, TbDatabase, TbExternalLink } from "react-icons/tb";
import { MdLock, MdLockOpen } from "react-icons/md";
import { FaToggleOn, FaToggleOff, FaPhp, FaNodeJs, FaHtml5, FaPlus } from "react-icons/fa";
import { SiMysql, SiPostgresql } from "react-icons/si";
import CreateWebsiteForm from "./Partials/CreateWebsiteForm";
import CreateDatabaseForWebsiteForm from "./Partials/CreateDatabaseForWebsiteForm";
import { useEffect, useState } from "react";

export default function Websites({ websites, serverIp, applicationTypes = [], nodeVersions = [] }) {

    const { auth } = usePage().props;
    const [phpVersions, setPhpVersions] = useState([]);
    const [expandedRows, setExpandedRows] = useState({});

    useEffect(() => {
        fetch(route('php.get-versions'), {
            headers: { 'Accept': 'application/json' }
        })
            .then(response => response.json())
            .then(data => setPhpVersions(data))
            .catch(() => setPhpVersions([]));
    }, []);

    const toggleRowExpand = (websiteId) => {
        setExpandedRows(prev => ({
            ...prev,
            [websiteId]: !prev[websiteId]
        }));
    };

    const deleteWebsite = (id) => {
        router.delete(route('websites.destroy', { website: id }), {
            onBefore: () => toast("Please wait, deleting website and its resources..."),
            onError: errors => {
                toast("Error occured while deleting account.");
                console.log(errors);
            },
        });
    };

    const toggleSsl = (website) => {
        const isEnabled = website.ssl_enabled;
        const action = isEnabled ? 'disable' : 'enable';

        router.post(route('websites.ssl.toggle', { website: website.id }),
            { enabled: !isEnabled },
            {
                onBefore: () => toast(`${action === 'enable' ? 'Enabling' : 'Disabling'} SSL...`),
                onSuccess: () => {
                    toast.success(`SSL ${action === 'enable' ? 'enabled' : 'disabled'} successfully`);
                    router.reload();
                },
                onError: () => toast.error(`Failed to ${action} SSL`),
            }
        );
    };

    const getApplicationTypeIcon = (type) => {
        switch (type) {
            case 'php': return <FaPhp className="w-4 h-4" />;
            case 'nodejs': return <FaNodeJs className="w-4 h-4" />;
            case 'static': return <FaHtml5 className="w-4 h-4" />;
            default: return <FaPhp className="w-4 h-4" />;
        }
    };

    const getApplicationTypeLabel = (type) => {
        switch (type) {
            case 'php': return 'PHP';
            case 'nodejs': return 'Node.js';
            case 'static': return 'Static';
            default: return 'PHP';
        }
    };

    const getApplicationTypeBadgeClass = (type) => {
        switch (type) {
            case 'php': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
            case 'nodejs': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            case 'static': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
        }
    };

    const getDriverIcon = (driver) => {
        switch (driver) {
            case 'mysql': return <SiMysql className="w-4 h-4" />;
            case 'pgsql': return <SiPostgresql className="w-4 h-4" />;
            default: return <TbDatabase className="w-4 h-4" />;
        }
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col xl:flex-row xl:justify-between max-w-7xl pr-5">
                    <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight flex items-center">
                        <TbWorldWww className='mr-2' />
                        Websites ({websites.length}/{auth.user.domain_limit || 'unlimited'})
                    </h2>
                    <CreateWebsiteForm
                        serverIp={serverIp}
                        applicationTypes={applicationTypes}
                        nodeVersions={nodeVersions}
                        className="max-w-xl"
                    />
                </div>
            }
        >
            <Head title="Websites" />

            <div className="max-w-7xl px-4 my-8">
                <div className="relative overflow-x-auto bg-white dark:bg-gray-850 mt-3 rounded-lg">
                    <table className="w-full text-left rtl:text-right text-gray-500 dark:text-gray-400">
                        <thead className="text-gray-700 uppercase bg-gray-200 dark:bg-gray-700 dark:text-gray-300 text-sm">
                            <tr>
                                <th className="px-6 py-3">URL</th>
                                <th className="px-6 py-3">Type</th>
                                <th className="px-6 py-3">Databases</th>
                                <th className="px-6 py-3">SSL</th>
                                <th className="px-6 py-3">Version</th>
                                {auth.user.role == 'admin' && <th className="px-6 py-3">User</th>}
                                <th className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {websites?.map((website, index) => (
                                <>
                                    <tr key={`website-${index}`} className="bg-white border-b text-gray-700 dark:text-gray-200 dark:bg-gray-850 dark:border-gray-700 border-gray-200">
                                        <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                            <Link href={`${website.ssl_status === 'active' ? 'https' : 'http'}://${website.url}`} target="_blank" className='hover:underline text-blue-600 dark:text-blue-400'>
                                                <TbWorldWww className='w-4 h-4 inline-flex' />
                                                <span className='ml-1'>{website.url}</span>
                                            </Link>
                                        </td>

                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getApplicationTypeBadgeClass(website.application_type)}`}>
                                                {getApplicationTypeIcon(website.application_type)}
                                                <span className="ml-1">{getApplicationTypeLabel(website.application_type)}</span>
                                            </span>
                                        </td>

                                        {/* Databases Column */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-2">
                                                {website.databases && website.databases.length > 0 ? (
                                                    <button
                                                        onClick={() => toggleRowExpand(website.id)}
                                                        className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-200"
                                                    >
                                                        <TbDatabase className="w-4 h-4 mr-1" />
                                                        {website.databases.length} DB{website.databases.length > 1 ? 's' : ''}
                                                    </button>
                                                ) : (
                                                    <span className="text-gray-400 text-xs">No DB</span>
                                                )}
                                                <CreateDatabaseForWebsiteForm websiteId={website.id} websiteName={website.url} />
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 font-medium whitespace-nowrap">
                                            <div className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                                                website.ssl_status === 'active'
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                            }`}>
                                                {website.ssl_status === 'active' ? <MdLock className="w-3 h-3 mr-1" /> : <MdLockOpen className="w-3 h-3 mr-1" />}
                                                {website.ssl_status === 'active' ? 'Active' : 'Inactive'}
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 font-medium whitespace-nowrap">
                                            {website.application_type === 'php' && (
                                                <select
                                                    className="bg-gray-100 border border-gray-300 text-gray-900 text-xs rounded-lg p-1.5 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                                                    value={website.php_version?.id || ''}
                                                    onChange={(e) => {
                                                        const selectedId = e.target.value;
                                                        if (!selectedId) return;
                                                        router.patch(route('websites.update', { website: website.id }),
                                                            { php_version_id: selectedId },
                                                            {
                                                                onBefore: () => toast('Updating PHP version...'),
                                                                onSuccess: () => toast('PHP version updated.'),
                                                                onError: () => toast('Failed to update PHP version.'),
                                                            }
                                                        );
                                                    }}
                                                >
                                                    <option value="" disabled>Choose</option>
                                                    {phpVersions.map(v => (
                                                        <option key={`phpver-${v.id}`} value={v.id}>PHP {v.version}</option>
                                                    ))}
                                                </select>
                                            )}
                                            {website.application_type === 'nodejs' && (
                                                <span className="text-xs">Node {website.node_version?.version || 'N/A'}</span>
                                            )}
                                            {website.application_type === 'static' && (
                                                <span className="text-gray-400 text-xs">—</span>
                                            )}
                                            {!website.application_type && (
                                                <span className="text-gray-400 text-xs">—</span>
                                            )}
                                        </td>

                                        {auth.user.role == 'admin' && (
                                            <td className="px-6 py-4 font-medium whitespace-nowrap">
                                                <span className="text-xs">{website.user.username}</span>
                                            </td>
                                        )}

                                        <td className="px-6 py-4 font-medium whitespace-nowrap">
                                            <div className='flex items-center space-x-2'>
                                                <ConfirmationButton doAction={() => toggleSsl(website)}>
                                                    <button
                                                        className={`p-1.5 rounded-lg transition-colors ${
                                                            website.ssl_enabled
                                                                ? 'bg-green-100 hover:bg-green-200 text-green-600 dark:bg-green-900 dark:text-green-300'
                                                                : 'bg-gray-100 hover:bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                                        }`}
                                                        title={website.ssl_enabled ? 'Disable SSL' : 'Enable SSL'}
                                                    >
                                                        {website.ssl_enabled ? <FaToggleOn className='w-4 h-4' /> : <FaToggleOff className='w-4 h-4' />}
                                                    </button>
                                                </ConfirmationButton>
                                                <ConfirmationButton doAction={() => deleteWebsite(website.id)}>
                                                    <TiDelete className='w-5 h-5 text-red-500 cursor-pointer' />
                                                </ConfirmationButton>
                                            </div>
                                        </td>
                                    </tr>

                                    {/* Expanded row showing databases */}
                                    {expandedRows[website.id] && website.databases && website.databases.length > 0 && (
                                        <tr key={`website-${index}-dbs`} className="bg-gray-50 dark:bg-gray-900">
                                            <td colSpan={auth.user.role == 'admin' ? 7 : 6} className="px-6 py-3">
                                                <div className="ml-4">
                                                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                                                        Databases linked to {website.url}:
                                                    </p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {website.databases.map((db, dbIndex) => (
                                                            <div key={`db-${dbIndex}`} className="inline-flex items-center px-3 py-1.5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                                                {getDriverIcon(db.driver)}
                                                                <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">{db.name}</span>
                                                                <a
                                                                    href={route('adminer.connect', { database: db.id })}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="ml-2 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                                                                    title="Open in Adminer"
                                                                >
                                                                    <TbExternalLink className="w-4 h-4" />
                                                                </a>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
