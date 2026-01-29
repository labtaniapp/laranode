import { FaPhp, FaNodeJs, FaHtml5 } from 'react-icons/fa';
import { MdLock, MdLockOpen, MdFolder } from 'react-icons/md';
import { SiMysql, SiPostgresql } from 'react-icons/si';
import { TbDatabase } from 'react-icons/tb';

export default function OverviewTab({ website }) {
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
        <div className="space-y-6">
            {/* Website Info Card */}
            <div className="bg-white dark:bg-gray-850 rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                    Website Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                            Domain
                        </label>
                        <p className="text-gray-900 dark:text-gray-100 font-mono">
                            {website.url}
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                            Application Type
                        </label>
                        {getAppTypeBadge()}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                            Document Root
                        </label>
                        <p className="text-gray-900 dark:text-gray-100 font-mono flex items-center">
                            <MdFolder className="w-4 h-4 mr-1 text-gray-400" />
                            {website.base_path}{website.document_root}
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                            SSL Status
                        </label>
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

                    {website.application_type === 'nodejs' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                                    Startup File
                                </label>
                                <p className="text-gray-900 dark:text-gray-100 font-mono">
                                    {website.startup_file || 'app.js'}
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                                    Port
                                </label>
                                <p className="text-gray-900 dark:text-gray-100 font-mono">
                                    {website.app_port || 3000}
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>

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
                                    {db.driver.toUpperCase()}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
