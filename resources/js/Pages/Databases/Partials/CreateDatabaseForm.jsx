import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import SearchableDropdown from '@/Components/SearchableDropdown';
import { useForm, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { TbDatabase } from 'react-icons/tb';
import { SiMysql, SiPostgresql } from 'react-icons/si';
import axios from 'axios';

export default function CreateDatabaseForm({ availableDrivers = [], driverOptions = [] }) {
    const { auth } = usePage().props;
    const [showModal, setShowModal] = useState(false);
    const [charsets, setCharsets] = useState([]);
    const [collations, setCollations] = useState({});
    const [filteredCollations, setFilteredCollations] = useState([]);
    const [loading, setLoading] = useState(false);

    // Default drivers if not provided
    const drivers = driverOptions.length > 0 ? driverOptions : [
        { value: 'mysql', label: 'MySQL', description: 'Popular open-source relational database' },
        { value: 'pgsql', label: 'PostgreSQL', description: 'Advanced open-source database with JSON support' },
    ];

    const { data, setData, post, processing, reset, clearErrors, errors, transform } = useForm({
        driver: 'mysql',
        name_suffix: '',
        db_user_suffix: '',
        db_pass: '',
        charset: 'utf8mb4',
        collation: 'utf8mb4_unicode_ci',
    });

    useEffect(() => {
        if (showModal) {
            fetchCharsetsAndCollations(data.driver);
        }
    }, [showModal]);

    useEffect(() => {
        // When driver changes, fetch charsets for that driver
        if (showModal) {
            fetchCharsetsAndCollations(data.driver);
        }
    }, [data.driver]);

    useEffect(() => {
        // Filter collations based on selected charset
        if (data.charset && collations[data.charset]) {
            setFilteredCollations(collations[data.charset].map(c => ({ name: c, charset: data.charset })));
        } else {
            setFilteredCollations([]);
        }
    }, [data.charset, collations]);

    const fetchCharsetsAndCollations = async (driver) => {
        setLoading(true);
        try {
            const response = await axios.get(route('databases.charsets-collations'), {
                params: { driver }
            });

            setCharsets(response.data.charsets || []);
            setCollations(response.data.collations || {});

            // Set default charset and collation based on driver
            if (driver === 'mysql') {
                setData(prev => ({
                    ...prev,
                    charset: 'utf8mb4',
                    collation: 'utf8mb4_unicode_ci'
                }));
            } else if (driver === 'pgsql') {
                setData(prev => ({
                    ...prev,
                    charset: 'UTF8',
                    collation: response.data.collations?.['UTF8']?.[0] || 'en_US.UTF-8'
                }));
            }
        } catch (error) {
            console.error('Error fetching charsets and collations:', error);
        } finally {
            setLoading(false);
        }
    };

    const showCreateModal = () => setShowModal(true);

    const closeModal = () => {
        setShowModal(false);
        clearErrors();
        reset();
    };

    const createDatabase = (e) => {
        e.preventDefault();
        const prefix = auth.user.username + '_';
        const name = data.name_suffix ? `${prefix}${data.name_suffix}` : '';
        const db_user = data.db_user_suffix ? `${prefix}${data.db_user_suffix}` : '';

        transform((form) => ({
            ...form,
            name,
            db_user,
        }));

        post(route('databases.store'), {
            preserveScroll: true,
            onSuccess: closeModal,
            onFinish: () => transform((form) => form),
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

    const prefix = auth.user.username + '_';

    return (
        <>
            <button onClick={showCreateModal} className='flex items-center text-gray-700 dark:text-gray-300'>
                <TbDatabase className='mr-2' />
                Create Database
            </button>

            <Modal show={showModal} onClose={closeModal} maxWidth="xl">
                <form onSubmit={createDatabase} className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
                        <TbDatabase className='mr-2' />
                        Create New Database
                    </h2>

                    <div className="mt-6 flex flex-col space-y-4 max-h-[70vh] overflow-y-auto">

                        {/* Database Driver Selection */}
                        <div>
                            <InputLabel value="Database Type" className='my-2 font-semibold' />
                            <div className="grid grid-cols-2 gap-3">
                                {drivers.map((driver) => (
                                    <label
                                        key={driver.value}
                                        className={`relative flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                            data.driver === driver.value
                                                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                                                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="driver"
                                            value={driver.value}
                                            checked={data.driver === driver.value}
                                            onChange={(e) => setData('driver', e.target.value)}
                                            className="sr-only"
                                        />
                                        <div className="flex items-center mb-1">
                                            <span className={`mr-2 ${
                                                data.driver === driver.value
                                                    ? 'text-indigo-600 dark:text-indigo-400'
                                                    : 'text-gray-500 dark:text-gray-400'
                                            }`}>
                                                {getDriverIcon(driver.value)}
                                            </span>
                                            <span className="font-medium text-gray-900 dark:text-gray-100">
                                                {driver.label}
                                            </span>
                                        </div>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {driver.description}
                                        </span>
                                        {data.driver === driver.value && (
                                            <div className="absolute top-2 right-2">
                                                <svg className="w-5 h-5 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        )}
                                    </label>
                                ))}
                            </div>
                            <InputError message={errors.driver} className="mt-2" />
                        </div>

                        {/* Database Name */}
                        <div>
                            <InputLabel htmlFor="name_suffix" value="Database name" className='my-2' />
                            <div className="mt-1 flex">
                                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 text-sm">
                                    {prefix}
                                </span>
                                <div className="flex-1">
                                    <TextInput
                                        id="name_suffix"
                                        name="name_suffix"
                                        value={data.name_suffix}
                                        onChange={(e) => setData('name_suffix', e.target.value)}
                                        className="flex-1 rounded-l-none w-full"
                                        placeholder="mydb"
                                        required
                                    />
                                </div>
                            </div>
                            <InputError message={errors.name} className="mt-2" />
                        </div>

                        {/* Database User */}
                        <div>
                            <InputLabel htmlFor="db_user_suffix" value="Database user" className='my-2' />
                            <div className="mt-1 flex">
                                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 text-sm">
                                    {prefix}
                                </span>
                                <div className="flex-1">
                                    <TextInput
                                        id="db_user_suffix"
                                        name="db_user_suffix"
                                        value={data.db_user_suffix}
                                        onChange={(e) => setData('db_user_suffix', e.target.value)}
                                        className="flex-1 rounded-l-none w-full"
                                        placeholder="user"
                                        required
                                    />
                                </div>
                            </div>
                            <InputError message={errors.db_user} className="mt-2" />
                        </div>

                        {/* Database Password */}
                        <div>
                            <InputLabel htmlFor="db_pass" value="Database password" className='my-2' />
                            <TextInput
                                id="db_pass"
                                name="db_pass"
                                type="password"
                                value={data.db_pass}
                                onChange={(e) => setData('db_pass', e.target.value)}
                                className="mt-1 block w-full"
                                placeholder="Minimum 8 characters"
                                required
                            />
                            <InputError message={errors.db_pass} className="mt-2" />
                        </div>

                        {/* Charset */}
                        <div>
                            <InputLabel htmlFor="charset" value="Charset" className='my-2' />
                            <select
                                id="charset"
                                name="charset"
                                value={data.charset}
                                onChange={(e) => {
                                    setData('charset', e.target.value);
                                    // Set first available collation for this charset
                                    const charsetCollations = collations[e.target.value] || [];
                                    if (charsetCollations.length > 0) {
                                        setData('collation', charsetCollations[0]);
                                    }
                                }}
                                className="mt-1 block w-full border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 rounded-md"
                                disabled={loading}
                            >
                                {charsets.map(charset => (
                                    <option key={charset} value={charset}>
                                        {charset}
                                    </option>
                                ))}
                            </select>
                            <InputError message={errors.charset} className="mt-2" />
                        </div>

                        {/* Collation */}
                        <div>
                            <InputLabel htmlFor="collation" value="Collation" className='my-2' />
                            {filteredCollations.length > 0 ? (
                                <SearchableDropdown
                                    options={filteredCollations}
                                    value={data.collation}
                                    onChange={(collation) => setData('collation', collation.name)}
                                    placeholder="Select a collation..."
                                    className="mt-1"
                                    disabled={loading || filteredCollations.length === 0}
                                />
                            ) : (
                                <select
                                    id="collation"
                                    name="collation"
                                    value={data.collation}
                                    onChange={(e) => setData('collation', e.target.value)}
                                    className="mt-1 block w-full border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 rounded-md"
                                    disabled={loading}
                                >
                                    {(collations[data.charset] || []).map(coll => (
                                        <option key={coll} value={coll}>
                                            {coll}
                                        </option>
                                    ))}
                                </select>
                            )}
                            <InputError message={errors.collation} className="mt-2" />
                        </div>

                        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                            <SecondaryButton onClick={closeModal} className="mr-3">
                                Cancel
                            </SecondaryButton>
                            <PrimaryButton disabled={processing}>
                                {processing ? 'Creating...' : 'Create Database'}
                            </PrimaryButton>
                        </div>
                    </div>
                </form>
            </Modal>
        </>
    );
}
