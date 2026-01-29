import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import { useForm, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { TbDatabase, TbPlus } from 'react-icons/tb';
import { SiMysql, SiPostgresql } from 'react-icons/si';
import axios from 'axios';

export default function CreateDatabaseForWebsiteForm({ websiteId, websiteName }) {
    const { auth } = usePage().props;
    const [showModal, setShowModal] = useState(false);
    const [charsets, setCharsets] = useState([]);
    const [collations, setCollations] = useState({});
    const [loading, setLoading] = useState(false);

    const drivers = [
        { value: 'mysql', label: 'MySQL' },
        { value: 'pgsql', label: 'PostgreSQL' },
    ];

    const { data, setData, post, processing, reset, clearErrors, errors, transform } = useForm({
        driver: 'mysql',
        name_suffix: '',
        db_user_suffix: '',
        db_pass: '',
        charset: 'utf8mb4',
        collation: 'utf8mb4_unicode_ci',
        website_id: websiteId,
    });

    useEffect(() => {
        if (showModal) {
            fetchCharsetsAndCollations(data.driver);
        }
    }, [showModal, data.driver]);

    const fetchCharsetsAndCollations = async (driver) => {
        setLoading(true);
        try {
            const response = await axios.get(route('databases.charsets-collations'), { params: { driver } });
            setCharsets(response.data.charsets || []);
            setCollations(response.data.collations || {});

            if (driver === 'mysql') {
                setData(prev => ({ ...prev, charset: 'utf8mb4', collation: 'utf8mb4_unicode_ci' }));
            } else if (driver === 'pgsql') {
                setData(prev => ({ ...prev, charset: 'UTF8', collation: response.data.collations?.['UTF8']?.[0] || 'en_US.UTF-8' }));
            }
        } catch (error) {
            console.error('Error fetching charsets:', error);
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

        transform((form) => ({ ...form, name, db_user }));

        post(route('databases.store'), {
            preserveScroll: true,
            onSuccess: closeModal,
            onFinish: () => transform((form) => form),
        });
    };

    const getDriverIcon = (driver) => {
        switch (driver) {
            case 'mysql': return <SiMysql className="w-5 h-5" />;
            case 'pgsql': return <SiPostgresql className="w-5 h-5" />;
            default: return <TbDatabase className="w-5 h-5" />;
        }
    };

    const prefix = auth.user.username + '_';

    return (
        <>
            <button
                onClick={showCreateModal}
                className="p-1 rounded-md text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 dark:hover:text-indigo-400 transition-colors"
                title="Add database to this site"
            >
                <TbPlus className="w-4 h-4" />
            </button>

            <Modal show={showModal} onClose={closeModal} maxWidth="lg">
                <form onSubmit={createDatabase} className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
                        <TbDatabase className='mr-2' />
                        Create Database for {websiteName}
                    </h2>

                    <div className="mt-6 flex flex-col space-y-4 max-h-[70vh] overflow-y-auto">
                        {/* Driver Selection */}
                        <div>
                            <InputLabel value="Database Type" className='mb-2' />
                            <div className="flex gap-3">
                                {drivers.map((driver) => (
                                    <label
                                        key={driver.value}
                                        className={`flex items-center px-4 py-2 border-2 rounded-lg cursor-pointer transition-all ${
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
                                        <span className={`mr-2 ${data.driver === driver.value ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500'}`}>
                                            {getDriverIcon(driver.value)}
                                        </span>
                                        <span className="font-medium text-gray-900 dark:text-gray-100">{driver.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Database Name */}
                        <div>
                            <InputLabel htmlFor="name_suffix" value="Database name" className='mb-2' />
                            <div className="flex">
                                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 text-sm">
                                    {prefix}
                                </span>
                                <TextInput
                                    id="name_suffix"
                                    value={data.name_suffix}
                                    onChange={(e) => setData('name_suffix', e.target.value)}
                                    className="flex-1 rounded-l-none"
                                    placeholder="mydb"
                                    required
                                />
                            </div>
                            <InputError message={errors.name} className="mt-2" />
                        </div>

                        {/* Database User */}
                        <div>
                            <InputLabel htmlFor="db_user_suffix" value="Database user" className='mb-2' />
                            <div className="flex">
                                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 text-sm">
                                    {prefix}
                                </span>
                                <TextInput
                                    id="db_user_suffix"
                                    value={data.db_user_suffix}
                                    onChange={(e) => setData('db_user_suffix', e.target.value)}
                                    className="flex-1 rounded-l-none"
                                    placeholder="user"
                                    required
                                />
                            </div>
                            <InputError message={errors.db_user} className="mt-2" />
                        </div>

                        {/* Database Password */}
                        <div>
                            <InputLabel htmlFor="db_pass" value="Password" className='mb-2' />
                            <TextInput
                                id="db_pass"
                                type="password"
                                value={data.db_pass}
                                onChange={(e) => setData('db_pass', e.target.value)}
                                className="w-full"
                                placeholder="Min. 8 characters"
                                required
                            />
                            <InputError message={errors.db_pass} className="mt-2" />
                        </div>

                        {/* Charset & Collation */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <InputLabel htmlFor="charset" value="Charset" className='mb-2' />
                                <select
                                    id="charset"
                                    value={data.charset}
                                    onChange={(e) => {
                                        setData('charset', e.target.value);
                                        const charsetCollations = collations[e.target.value] || [];
                                        if (charsetCollations.length > 0) setData('collation', charsetCollations[0]);
                                    }}
                                    className="w-full border-gray-300 rounded-md shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                                    disabled={loading}
                                >
                                    {charsets.map(charset => (
                                        <option key={charset} value={charset}>{charset}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <InputLabel htmlFor="collation" value="Collation" className='mb-2' />
                                <select
                                    id="collation"
                                    value={data.collation}
                                    onChange={(e) => setData('collation', e.target.value)}
                                    className="w-full border-gray-300 rounded-md shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                                    disabled={loading}
                                >
                                    {(collations[data.charset] || []).map(coll => (
                                        <option key={coll} value={coll}>{coll}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                            <SecondaryButton onClick={closeModal} className="mr-3">Cancel</SecondaryButton>
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
