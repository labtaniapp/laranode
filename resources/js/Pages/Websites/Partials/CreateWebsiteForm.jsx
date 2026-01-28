import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import InputRadio from '@/Components/InputRadio';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import { useForm, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { BsFillInfoCircleFill } from "react-icons/bs";
import { TbWorldWww } from 'react-icons/tb';
import { FaPhp, FaNodeJs, FaHtml5 } from 'react-icons/fa';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { Transition } from '@headlessui/react';

export default function CreateWebsiteForm({ serverIp, applicationTypes = [], nodeVersions = [] }) {
    const { auth } = usePage().props;
    const [showModal, setShowModal] = useState(false);
    const [ipCopied, setIpCopied] = useState(false);
    const [phpVersions, setPhpVersions] = useState([]);

    useEffect(() => {
        getPhpVersions();
    }, []);

    const getPhpVersions = async () => {
        window.axios.get(route('php.get-versions')).then((response) => {
            setPhpVersions(response.data);
        }).catch((error) => {
            console.log(error);
        });
    };

    const {
        data,
        setData,
        post,
        processing,
        reset,
        errors,
        clearErrors,
    } = useForm({
        url: '',
        document_root: '/',
        application_type: 'php',
        php_version_id: null,
        node_version_id: null,
        startup_file: 'app.js',
        instances: 1,
    });

    const showCreateModal = () => {
        setShowModal(true);
    };

    const createWebsite = (e) => {
        e.preventDefault();

        post(route('websites.store'), {
            preserveScroll: true,
            onSuccess: () => {
                closeModal();
            },
        });
    };

    const closeModal = () => {
        setShowModal(false);
        clearErrors();
        reset();
    };

    const getApplicationTypeIcon = (type) => {
        switch (type) {
            case 'php':
                return <FaPhp className="w-5 h-5" />;
            case 'nodejs':
                return <FaNodeJs className="w-5 h-5" />;
            case 'static':
                return <FaHtml5 className="w-5 h-5" />;
            default:
                return null;
        }
    };

    // Default application types if not provided from backend
    const appTypes = applicationTypes.length > 0 ? applicationTypes : [
        { value: 'php', label: 'PHP', description: 'PHP application with PHP-FPM (Laravel, WordPress, etc.)' },
        { value: 'nodejs', label: 'Node.js', description: 'Node.js application with PM2 process manager' },
        { value: 'static', label: 'Static (HTML/CSS/JS)', description: 'Static files served directly' },
    ];

    return (
        <>
            <button onClick={showCreateModal} className='flex items-center text-gray-700 dark:text-gray-300'>
                <TbWorldWww className='mr-2' />
                Create Website
            </button>

            <Modal show={showModal} onClose={closeModal} maxWidth="2xl">
                <form onSubmit={createWebsite} className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
                        <TbWorldWww className='mr-2' />
                        Add a New Website
                    </h2>

                    <div className="mt-6 flex flex-col space-y-4 max-h-[70vh] overflow-y-auto">

                        <div className="bg-gray-200 dark:bg-gray-700 p-4 rounded-md text-gray-700 dark:text-gray-300 flex items-center text-xs">
                            <div>
                                <BsFillInfoCircleFill className='mr-2 h-6 w-6' />
                            </div>
                            <div>
                                IMPORTANT: You must point your domain A record via DNS to this server IP:
                                <br />
                                <CopyToClipboard onCopy={() => setIpCopied(true)} text={serverIp}>
                                    <span className="cursor-pointer font-mono font-bold">
                                        {serverIp}
                                    </span>
                                </CopyToClipboard>

                                <Transition
                                    show={ipCopied}
                                    enter="transition ease-in-out"
                                    enterFrom="opacity-0"
                                    leave="transition ease-in-out"
                                    leaveTo="opacity-0"
                                >
                                    <p className="text-gray-600 dark:text-gray-400 text-xs">
                                        IP copied to clipboard.
                                    </p>
                                </Transition>
                            </div>
                        </div>

                        {/* Application Type Selection */}
                        <div>
                            <InputLabel value="Application Type" className='my-2 font-semibold' />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {appTypes.map((type) => (
                                    <label
                                        key={type.value}
                                        className={`relative flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                            data.application_type === type.value
                                                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                                                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="application_type"
                                            value={type.value}
                                            checked={data.application_type === type.value}
                                            onChange={(e) => setData('application_type', e.target.value)}
                                            className="sr-only"
                                        />
                                        <div className="flex items-center mb-2">
                                            <span className={`mr-2 ${
                                                data.application_type === type.value
                                                    ? 'text-indigo-600 dark:text-indigo-400'
                                                    : 'text-gray-500 dark:text-gray-400'
                                            }`}>
                                                {getApplicationTypeIcon(type.value)}
                                            </span>
                                            <span className="font-medium text-gray-900 dark:text-gray-100">
                                                {type.label}
                                            </span>
                                        </div>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {type.description}
                                        </span>
                                        {data.application_type === type.value && (
                                            <div className="absolute top-2 right-2">
                                                <svg className="w-5 h-5 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        )}
                                    </label>
                                ))}
                            </div>
                            <InputError message={errors.application_type} className="mt-2" />
                        </div>

                        {/* Domain URL */}
                        <div>
                            <InputLabel
                                htmlFor="url"
                                value="Domain (without http/https)"
                                className='my-2'
                            />

                            <TextInput
                                id="url"
                                name="url"
                                value={data.url}
                                onChange={(e) => setData('url', e.target.value)}
                                className="mt-1 block w-full"
                                isFocused
                                placeholder="example.org"
                                required
                            />

                            <InputError message={errors.url} className="mt-2" />
                        </div>

                        {/* Document Root */}
                        <div>
                            <InputLabel htmlFor="document_root" className='my-2'>
                                <div className="block text-sm font-medium text-gray-700 dark:text-gray-300 my-2">
                                    Document Root
                                </div>
                            </InputLabel>

                            <TextInput
                                id="document_root"
                                name="document_root"
                                value={data.document_root}
                                onChange={(e) => setData('document_root', e.target.value)}
                                className="mt-1 block w-full"
                                placeholder={data.application_type === 'php' ? '/public' : '/'}
                                required
                            />

                            <div className="text-xs inline-flex items-center px-3 py-1 mt-1 rounded-md border border-gray-300 bg-gray-100 text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 font-mono">
                                {auth.user.homedir}/domains/{data.url || 'example.org'}{data.document_root}
                            </div>

                            <InputError message={errors.document_root} className="mt-2" />
                        </div>

                        {/* PHP Version - Only show for PHP apps */}
                        {data.application_type === 'php' && (
                            <div>
                                <InputLabel htmlFor="php_version_id" value="PHP Version" className='my-2' />

                                <div className="flex flex-wrap gap-4">
                                    {phpVersions.map((phpVersion) => (
                                        <div key={`php-version-${phpVersion.id}`} className="flex items-center">
                                            <InputRadio
                                                id={`php_version_id-${phpVersion.id}`}
                                                name="php_version_id"
                                                value={phpVersion.id}
                                                checked={data.php_version_id === phpVersion.id}
                                                onChange={(e) => setData('php_version_id', Number(e.target.value))}
                                                className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                                            />
                                            <label htmlFor={`php_version_id-${phpVersion.id}`} className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                                PHP {phpVersion.version}
                                            </label>
                                        </div>
                                    ))}
                                </div>

                                <InputError message={errors.php_version_id} className="mt-2" />
                            </div>
                        )}

                        {/* Node.js Configuration - Only show for Node.js apps */}
                        {data.application_type === 'nodejs' && (
                            <>
                                <div>
                                    <InputLabel htmlFor="node_version_id" value="Node.js Version" className='my-2' />

                                    <div className="flex flex-wrap gap-4">
                                        {nodeVersions.map((nodeVersion) => (
                                            <div key={`node-version-${nodeVersion.id}`} className="flex items-center">
                                                <InputRadio
                                                    id={`node_version_id-${nodeVersion.id}`}
                                                    name="node_version_id"
                                                    value={nodeVersion.id}
                                                    checked={data.node_version_id === nodeVersion.id}
                                                    onChange={(e) => setData('node_version_id', Number(e.target.value))}
                                                    className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                                                />
                                                <label htmlFor={`node_version_id-${nodeVersion.id}`} className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    Node.js {nodeVersion.version}
                                                </label>
                                            </div>
                                        ))}
                                        {nodeVersions.length === 0 && (
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                No Node.js versions available. Please contact administrator.
                                            </p>
                                        )}
                                    </div>

                                    <InputError message={errors.node_version_id} className="mt-2" />
                                </div>

                                <div>
                                    <InputLabel htmlFor="startup_file" value="Startup File" className='my-2' />
                                    <TextInput
                                        id="startup_file"
                                        name="startup_file"
                                        value={data.startup_file}
                                        onChange={(e) => setData('startup_file', e.target.value)}
                                        className="mt-1 block w-full"
                                        placeholder="app.js"
                                        required
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        The main entry point of your Node.js application (e.g., app.js, server.js, index.js)
                                    </p>
                                    <InputError message={errors.startup_file} className="mt-2" />
                                </div>

                                <div>
                                    <InputLabel htmlFor="instances" value="PM2 Instances" className='my-2' />
                                    <TextInput
                                        id="instances"
                                        name="instances"
                                        type="number"
                                        min="1"
                                        max="16"
                                        value={data.instances}
                                        onChange={(e) => setData('instances', parseInt(e.target.value) || 1)}
                                        className="mt-1 block w-32"
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        Number of PM2 instances to run (1-16). Use more for better performance on multi-core systems.
                                    </p>
                                    <InputError message={errors.instances} className="mt-2" />
                                </div>
                            </>
                        )}

                        {/* Static site info */}
                        {data.application_type === 'static' && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md">
                                <p className="text-sm text-blue-700 dark:text-blue-300">
                                    <strong>Static Site:</strong> Your HTML, CSS, and JavaScript files will be served directly by Nginx.
                                    Just upload your files to the document root directory.
                                </p>
                            </div>
                        )}

                        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                            <SecondaryButton onClick={closeModal} className="mr-3">
                                Cancel
                            </SecondaryButton>

                            <PrimaryButton disabled={processing}>
                                {processing ? 'Creating...' : 'Create Website'}
                            </PrimaryButton>
                        </div>
                    </div>
                </form>
            </Modal>
        </>
    );
}
