import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import { TbWorldWww, TbArrowLeft, TbClock, TbInfoCircle, TbDatabase, TbFolder, TbFileText, TbGitBranch, TbCloudUpload, TbServer, TbMail, TbLock } from 'react-icons/tb';
import { FaPhp, FaNodeJs, FaHtml5 } from 'react-icons/fa';
import OverviewTab from './Partials/OverviewTab';
import CronJobsTab from './Partials/CronJobsTab';
import DatabasesTab from './Partials/DatabasesTab';
import FileManagerTab from './Partials/FileManagerTab';
import LogsTab from './Partials/LogsTab';
import GitTab from './Partials/GitTab';
import BackupTab from './Partials/BackupTab';
import WorkersTab from './Partials/WorkersTab';
import EmailTab from './Partials/EmailTab';
import SSLTab from './Partials/SSLTab';

export default function WebsiteShow({ website, cronJobs, cronTemplates, phpVersions = [], nodeVersions = [], gitRepository = null, backups = [], backupSettings = {}, workers = [] }) {
    const [activeTab, setActiveTab] = useState('overview');

    const tabs = [
        { id: 'overview', label: 'Overview', icon: TbInfoCircle },
        { id: 'files', label: 'File Manager', icon: TbFolder },
        { id: 'databases', label: 'Databases', icon: TbDatabase, count: website.databases?.length || 0 },
        { id: 'cron', label: 'Cron Jobs', icon: TbClock, count: cronJobs?.length || 0 },
        { id: 'workers', label: 'Workers', icon: TbServer, count: workers?.length || 0 },
        { id: 'logs', label: 'Logs', icon: TbFileText },
        { id: 'git', label: 'Git Deploy', icon: TbGitBranch, indicator: gitRepository ? 'connected' : null },
        { id: 'backups', label: 'Backups', icon: TbCloudUpload, count: backups?.length || 0 },
        { id: 'email', label: 'Email', icon: TbMail },
        { id: 'ssl', label: 'SSL', icon: TbLock, indicator: website.ssl_enabled ? 'connected' : null },
    ];

    const getAppIcon = () => {
        switch (website.application_type) {
            case 'php':
                return <FaPhp className="w-6 h-6 text-indigo-500" />;
            case 'nodejs':
                return <FaNodeJs className="w-6 h-6 text-green-500" />;
            case 'static':
                return <FaHtml5 className="w-6 h-6 text-orange-500" />;
            default:
                return <TbWorldWww className="w-6 h-6" />;
        }
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between max-w-7xl pr-5">
                    <div className="flex items-center">
                        <Link
                            href={route('websites.index')}
                            className="mr-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            <TbArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </Link>
                        <div className="flex items-center">
                            {getAppIcon()}
                            <div className="ml-3">
                                <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">
                                    {website.url}
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                                    {website.application_type} Application
                                </p>
                            </div>
                        </div>
                    </div>
                    <a
                        href={`https://${website.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        <TbWorldWww className="mr-2" />
                        Visit Site
                    </a>
                </div>
            }
        >
            <Head title={website.url} />

            <div className="max-w-7xl px-4 my-8">
                {/* Tabs */}
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`
                                        flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap
                                        ${activeTab === tab.id
                                            ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                        }
                                    `}
                                >
                                    <Icon className={`mr-2 w-5 h-5 ${activeTab === tab.id ? 'text-indigo-500' : ''}`} />
                                    {tab.label}
                                    {tab.count !== undefined && tab.count > 0 && (
                                        <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                                            activeTab === tab.id
                                                ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300'
                                                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                        }`}>
                                            {tab.count}
                                        </span>
                                    )}
                                    {tab.indicator === 'connected' && (
                                        <span className="ml-2 w-2 h-2 rounded-full bg-green-500"></span>
                                    )}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Tab Content */}
                <div className="mt-6">
                    {activeTab === 'overview' && (
                        <OverviewTab website={website} phpVersions={phpVersions} nodeVersions={nodeVersions} />
                    )}
                    {activeTab === 'files' && (
                        <FileManagerTab website={website} />
                    )}
                    {activeTab === 'databases' && (
                        <DatabasesTab website={website} />
                    )}
                    {activeTab === 'cron' && (
                        <CronJobsTab
                            website={website}
                            cronJobs={cronJobs}
                            templates={cronTemplates}
                        />
                    )}
                    {activeTab === 'workers' && (
                        <WorkersTab website={website} workers={workers} />
                    )}
                    {activeTab === 'logs' && (
                        <LogsTab website={website} />
                    )}
                    {activeTab === 'git' && (
                        <GitTab website={website} gitRepository={gitRepository} />
                    )}
                    {activeTab === 'backups' && (
                        <BackupTab website={website} backups={backups} settings={backupSettings} />
                    )}
                    {activeTab === 'email' && (
                        <EmailTab website={website} />
                    )}
                    {activeTab === 'ssl' && (
                        <SSLTab website={website} />
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
