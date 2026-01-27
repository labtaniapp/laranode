import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import { useForm } from '@inertiajs/react';
import { useState } from 'react';
import { TbDatabase } from 'react-icons/tb';
import { FaEdit } from 'react-icons/fa';
import { SiMysql, SiPostgresql } from 'react-icons/si';

export default function EditDatabaseForm({ database }) {
    const [showModal, setShowModal] = useState(false);

    const { data, setData, patch, processing, reset, clearErrors, errors } = useForm({
        id: database.id || 0,
        db_pass: '',
    });

    const getDriverIcon = (driver) => {
        switch (driver) {
            case 'mysql':
                return <SiMysql className="w-5 h-5 text-orange-500" />;
            case 'pgsql':
                return <SiPostgresql className="w-5 h-5 text-blue-500" />;
            default:
                return <TbDatabase className="w-5 h-5" />;
        }
    };

    const showEditModal = () => {
        setShowModal(true);
        setData({
            id: database.id,
            db_pass: '',
        });
    };

    const closeModal = () => {
        setShowModal(false);
        clearErrors();
        reset();
    };

    const updateDatabase = (e) => {
        e.preventDefault();
        patch(route('databases.update'), {
            preserveScroll: true,
            onSuccess: closeModal,
        });
    };

    return (
        <>
            <button
                onClick={showEditModal}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                title="Edit Password"
            >
                <FaEdit className='w-4 h-4' />
            </button>

            <Modal show={showModal} onClose={closeModal}>
                <form onSubmit={updateDatabase} className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
                        {getDriverIcon(database.driver)}
                        <span className="ml-2">Edit Database: {database.name}</span>
                    </h2>

                    <div className="mt-6 flex flex-col space-y-4">
                        {/* Database Info (Read-only) */}
                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-2">
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-500 dark:text-gray-400">Driver:</span>
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{database.driver_label}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-500 dark:text-gray-400">Database:</span>
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{database.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-500 dark:text-gray-400">User:</span>
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{database.db_user}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-500 dark:text-gray-400">Charset:</span>
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{database.charset || '—'}</span>
                            </div>
                        </div>

                        {/* Password Change */}
                        <div>
                            <InputLabel htmlFor="db_pass" value="New Password" className='my-2' />
                            <TextInput
                                id="db_pass"
                                name="db_pass"
                                type="password"
                                value={data.db_pass}
                                onChange={(e) => setData('db_pass', e.target.value)}
                                className="mt-1 block w-full"
                                placeholder="Enter new password (leave blank to keep current)"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Leave blank to keep the current password
                            </p>
                            <InputError message={errors.db_pass} className="mt-2" />
                        </div>

                        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                            <SecondaryButton onClick={closeModal} className="mr-3">
                                Cancel
                            </SecondaryButton>
                            <PrimaryButton disabled={processing}>
                                {processing ? 'Updating...' : 'Update Password'}
                            </PrimaryButton>
                        </div>
                    </div>
                </form>
            </Modal>
        </>
    );
}
