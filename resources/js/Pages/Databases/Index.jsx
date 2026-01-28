import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { TbDatabase } from 'react-icons/tb';
import { TiDelete } from 'react-icons/ti';
import { SiMysql, SiPostgresql } from 'react-icons/si';
import { toast } from 'react-toastify';
import CreateDatabaseForm from './Partials/CreateDatabaseForm';
import EditDatabaseForm from './Partials/EditDatabaseForm';
import ConfirmationButton from '@/Components/ConfirmationButton';

export default function DatabasesIndex({ databases = [], availableDrivers = [], driverOptions = [] }) {

    const { auth } = usePage().props;

    const deleteDb = (id) => {
        router.delete(route('databases.destroy'), {
            data: { id },
            onBefore: () => toast('Deleting database...'),
            onError: () => toast('Failed to delete database.'),
        });
    };

    const getDriverIcon = (driver) => {
        switch (driver) {
            case 'mysql':
                return <SiMysql className="w-5 h-5" />;
            case 'pgsql':
                return <SiPostgresql className="w-5 h-5" />;
            default:
                return <TbDatabase className="w-5 h-5" />;
        }
    };

    const getDriverBadgeClass = (driver) => {
        switch (driver) {
            case 'mysql':
                return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
            case 'pgsql':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
        }
    };

    const formatSize = (bytes) => {
        if (!bytes || bytes === 0) return '0 MB';
        const mb = bytes / (1024 * 1024);
        return mb < 0.01 ? '< 0.01 MB' : `${mb.toFixed(2)} MB`;
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col xl:flex-row xl:justify-between max-w-7xl pr-5">
                    <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight flex items-center">
                        <TbDatabase className='mr-2' />
                        Databases ({databases.length}/{auth.user.database_limit || 'unlimited'})
                    </h2>
                    <CreateDatabaseForm
                        availableDrivers={availableDrivers}
                        driverOptions={driverOptions}
                    />
                </div>
            }
        >
            <Head title="Databases" />

            <div className="max-w-7xl px-4 my-8">
                <div className="relative overflow-x-auto bg-white dark:bg-gray-850 mt-3">
                    <table className="w-full text-left rtl:text-right text-gray-500 dark:text-gray-400">
                        <thead className="text-gray-700 uppercase bg-gray-200 dark:bg-gray-700 dark:text-gray-300 text-sm">
                            <tr>
                                <th className="px-6 py-3">Driver</th>
                                <th className="px-6 py-3">Database</th>
                                <th className="px-6 py-3">User</th>
                                <th className="px-6 py-3">Tables</th>
                                <th className="px-6 py-3">Size</th>
                                <th className="px-6 py-3">Charset</th>
                                <th className="px-6 py-3">Collation</th>
                                <th className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {databases.length === 0 && (
                                <tr>
                                    <td colSpan="8" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                        No databases found. Create your first database to get started.
                                    </td>
                                </tr>
                            )}
                            {databases.map((db, index) => (
                                <tr key={`db-${index}`} className="bg-white border-b text-gray-700 dark:text-gray-200 dark:bg-gray-850 dark:border-gray-700 border-gray-200">
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDriverBadgeClass(db.driver)}`}>
                                            {getDriverIcon(db.driver)}
                                            <span className="ml-1">{db.driver_label}</span>
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                        {db.name}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                        {db.db_user}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                        {db.tables_count ?? '—'}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                        {formatSize(db.size)}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                        {db.charset || '—'}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                        {db.collation || '—'}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                        <div className='flex items-center space-x-2'>
                                            <EditDatabaseForm database={db} />
                                            <ConfirmationButton doAction={() => deleteDb(db.id)}>
                                                <TiDelete className='w-6 h-6 text-red-500 cursor-pointer hover:text-red-700' />
                                            </ConfirmationButton>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
