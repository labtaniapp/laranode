import { router } from '@inertiajs/react';
import { SiNodedotjs } from 'react-icons/si';
import { TiDelete } from 'react-icons/ti';
import { FaStar, FaRegStar } from 'react-icons/fa';
import { toast } from 'react-toastify';
import ConfirmationButton from '@/Components/ConfirmationButton';
import { useEffect, useState } from 'react';
import InstallNodeForm from './InstallNodeForm';

export default function NodeTab({ availableVersions = [] }) {
    const [nodeVersions, setNodeVersions] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchNodeVersions = () => {
        fetch(route('runtimes.node.list'), {
            headers: { 'Accept': 'application/json' }
        })
            .then(response => response.json())
            .then(data => {
                setNodeVersions(data);
                setLoading(false);
            })
            .catch(() => {
                toast.error('Failed to fetch Node.js versions');
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchNodeVersions();
    }, []);

    const uninstallNode = (version) => {
        router.delete(route('runtimes.node.uninstall'), {
            data: { version },
            onBefore: () => toast('Uninstalling Node.js ' + version + '...'),
            onSuccess: () => {
                toast.success('Node.js ' + version + ' uninstalled successfully');
                fetchNodeVersions();
            },
            onError: () => toast.error('Failed to uninstall Node.js ' + version),
        });
    };

    const setDefault = (version) => {
        router.post(route('runtimes.node.default'),
            { version },
            {
                onBefore: () => toast('Setting Node.js ' + version + ' as default...'),
                onSuccess: () => {
                    toast.success('Node.js ' + version + ' set as default');
                    fetchNodeVersions();
                },
                onError: () => toast.error('Failed to set Node.js ' + version + ' as default'),
            }
        );
    };

    if (loading) {
        return (
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                Loading Node.js versions...
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Manage Node.js versions via NVM. Each version can be used for Node.js applications managed by PM2.
                </p>
                <InstallNodeForm onInstalled={fetchNodeVersions} availableVersions={availableVersions} />
            </div>

            <div className="relative overflow-x-auto bg-white dark:bg-gray-850 rounded-lg shadow">
                <table className="w-full text-left rtl:text-right text-gray-500 dark:text-gray-400">
                    <thead className="text-gray-700 uppercase bg-gray-200 dark:bg-gray-700 dark:text-gray-300 text-sm">
                        <tr>
                            <th className="px-6 py-3">Version</th>
                            <th className="px-6 py-3">Full Version</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Default</th>
                            <th className="px-6 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {nodeVersions.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                    No Node.js versions installed. Click "Install Node Version" to get started.
                                </td>
                            </tr>
                        ) : (
                            nodeVersions.map((node, index) => (
                                <tr key={`node-${index}`} className="bg-white border-b text-gray-700 dark:text-gray-200 dark:bg-gray-850 dark:border-gray-700 border-gray-200">
                                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                        <div className="flex items-center">
                                            <SiNodedotjs className="w-5 h-5 mr-2 text-green-600" />
                                            Node.js {node.version}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                                        {node.full_version}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium ${
                                            node.status === 'active'
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                                        }`}>
                                            {node.status === 'active' ? 'Active' : 'Installed'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {node.is_default ? (
                                            <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                                <FaStar className="w-3 h-3 mr-1" />
                                                Default
                                            </span>
                                        ) : (
                                            <span className="text-gray-400">—</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className='flex items-center space-x-2'>
                                            {!node.is_default && (
                                                <ConfirmationButton doAction={() => setDefault(node.version)}>
                                                    <button
                                                        className="p-2 rounded-lg bg-yellow-100 hover:bg-yellow-200 text-yellow-600 dark:bg-yellow-900 dark:hover:bg-yellow-800 dark:text-yellow-300 transition-colors"
                                                        title="Set as Default"
                                                    >
                                                        <FaRegStar className='w-4 h-4' />
                                                    </button>
                                                </ConfirmationButton>
                                            )}

                                            <ConfirmationButton doAction={() => uninstallNode(node.version)}>
                                                <TiDelete className='w-6 h-6 text-red-500 cursor-pointer hover:text-red-700' />
                                            </ConfirmationButton>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
