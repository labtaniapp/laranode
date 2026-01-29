import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { useState } from 'react';
import { FaPhp } from 'react-icons/fa6';
import { SiNodedotjs } from 'react-icons/si';
import { TbSettings } from 'react-icons/tb';
import { MdSettings } from 'react-icons/md';
import PhpTab from './Partials/PhpTab';
import NodeTab from './Partials/NodeTab';
import SettingsTab from './Partials/SettingsTab';

export default function RuntimesIndex({ runtimeTypes, availablePhpVersions, availableNodeVersions }) {
    const [activeTab, setActiveTab] = useState('php');

    const tabs = [
        { id: 'php', label: 'PHP', icon: FaPhp },
        { id: 'nodejs', label: 'Node.js', icon: SiNodedotjs },
        { id: 'settings', label: 'Available Versions', icon: MdSettings },
    ];

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col xl:flex-row xl:justify-between max-w-7xl pr-5">
                    <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight flex items-center">
                        <TbSettings className='mr-2' />
                        Runtime Manager
                    </h2>
                </div>
            }
        >
            <Head title="Runtime Manager" />

            <div className="max-w-7xl px-4 my-8">
                {/* Tabs */}
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`
                                        flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors
                                        ${activeTab === tab.id
                                            ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                        }
                                    `}
                                >
                                    <Icon className={`mr-2 w-5 h-5 ${activeTab === tab.id ? 'text-indigo-500' : ''}`} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Tab Content */}
                <div className="mt-6">
                    {activeTab === 'php' && <PhpTab availableVersions={availablePhpVersions} />}
                    {activeTab === 'nodejs' && <NodeTab availableVersions={availableNodeVersions} />}
                    {activeTab === 'settings' && <SettingsTab />}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
