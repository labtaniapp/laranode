import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { FaGithub, FaGitlab, FaBitbucket, FaGit, FaLaravel, FaNodeJs, FaNuxt } from 'react-icons/fa';
import { SiNextdotjs } from 'react-icons/si';
import { TbGitBranch, TbRocket, TbHistory, TbSettings, TbRefresh, TbPlus, TbLink, TbLinkOff, TbWebhook, TbCopy, TbTerminal2, TbArrowBack } from 'react-icons/tb';
import { toast } from 'react-toastify';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import DangerButton from '@/Components/DangerButton';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import ConfirmationButton from '@/Components/ConfirmationButton';

const ProviderIcon = ({ provider, className = "w-5 h-5" }) => {
    switch (provider) {
        case 'github': return <FaGithub className={className} />;
        case 'gitlab': return <FaGitlab className={`${className} text-orange-500`} />;
        case 'bitbucket': return <FaBitbucket className={`${className} text-blue-500`} />;
        default: return <FaGit className={className} />;
    }
};

const FrameworkIcon = ({ framework, className = "w-5 h-5" }) => {
    switch (framework) {
        case 'laravel': return <FaLaravel className={`${className} text-red-500`} />;
        case 'nodejs': return <FaNodeJs className={`${className} text-green-500`} />;
        case 'nuxt': return <FaNuxt className={`${className} text-green-400`} />;
        case 'nextjs': return <SiNextdotjs className={className} />;
        default: return <TbTerminal2 className={className} />;
    }
};

export default function GitDeploymentIndex({ websites, frameworks }) {
    const [showConnectModal, setShowConnectModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showLogsModal, setShowLogsModal] = useState(false);
    const [selectedWebsite, setSelectedWebsite] = useState(null);
    const [selectedRepo, setSelectedRepo] = useState(null);
    const [deploymentHistory, setDeploymentHistory] = useState([]);
    const [deploymentLogs, setDeploymentLogs] = useState(null);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [loadingLogs, setLoadingLogs] = useState(false);

    const connectForm = useForm({
        website_id: '',
        provider: 'github',
        repository_url: '',
        branch: 'main',
        framework: 'laravel',
        deploy_key: '',
        auto_deploy: true,
        zero_downtime: true,
        deploy_script: '',
    });

    const settingsForm = useForm({
        branch: '',
        framework: '',
        auto_deploy: false,
        zero_downtime: true,
        keep_releases: 5,
        deploy_script: '',
        deploy_key: '',
    });

    const websitesWithoutRepo = websites.filter(w => !w.git_repository);

    const handleConnect = (e) => {
        e.preventDefault();
        connectForm.post(route('git.connect'), {
            onSuccess: () => {
                setShowConnectModal(false);
                connectForm.reset();
                toast.success('Repository connected');
            },
            onError: () => toast.error('Failed to connect repository'),
        });
    };

    const handleUpdateSettings = (e) => {
        e.preventDefault();
        settingsForm.patch(route('git.update', selectedRepo.id), {
            onSuccess: () => {
                setShowSettingsModal(false);
                toast.success('Settings updated');
            },
            onError: () => toast.error('Failed to update settings'),
        });
    };

    const handleDeploy = (repo) => {
        router.post(route('git.deploy', repo.id), {}, {
            onSuccess: () => toast.success('Deployment started'),
            onError: () => toast.error('Failed to start deployment'),
        });
    };

    const handleDisconnect = (repo) => {
        router.delete(route('git.disconnect', repo.id), {
            onSuccess: () => toast.success('Repository disconnected'),
            onError: () => toast.error('Failed to disconnect'),
        });
    };

    const handleRollback = (deploymentId) => {
        router.post(route('git.rollback', deploymentId), {}, {
            onSuccess: () => {
                toast.success('Rollback started');
                setShowHistoryModal(false);
            },
            onError: () => toast.error('Failed to rollback'),
        });
    };

    const openConnectModal = (website = null) => {
        if (website) {
            connectForm.setData('website_id', website.id);
            // Set default framework based on application type
            if (website.application_type === 'nodejs') {
                connectForm.setData('framework', 'nodejs');
            }
        } else if (websitesWithoutRepo.length > 0) {
            connectForm.setData('website_id', websitesWithoutRepo[0].id);
        }
        setShowConnectModal(true);
    };

    const openSettingsModal = (repo) => {
        setSelectedRepo(repo);
        settingsForm.setData({
            branch: repo.branch,
            framework: repo.framework,
            auto_deploy: repo.auto_deploy,
            zero_downtime: true,
            keep_releases: 5,
            deploy_script: '',
            deploy_key: '',
        });
        setShowSettingsModal(true);
    };

    const openHistoryModal = async (repo) => {
        setSelectedRepo(repo);
        setLoadingHistory(true);
        setShowHistoryModal(true);

        try {
            const response = await fetch(route('git.history', repo.id));
            const data = await response.json();
            setDeploymentHistory(data);
        } catch (error) {
            toast.error('Failed to load deployment history');
        } finally {
            setLoadingHistory(false);
        }
    };

    const openLogsModal = async (deploymentId) => {
        setLoadingLogs(true);
        setShowLogsModal(true);

        try {
            const response = await fetch(route('git.logs', deploymentId));
            const data = await response.json();
            setDeploymentLogs(data);
        } catch (error) {
            toast.error('Failed to load logs');
        } finally {
            setLoadingLogs(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard');
    };

    const fetchDefaultScript = async (framework) => {
        try {
            const response = await fetch(route('git.deploy-script') + `?framework=${framework}`);
            const data = await response.json();
            connectForm.setData('deploy_script', data.script);
        } catch (error) {
            console.error('Failed to fetch deploy script');
        }
    };

    // Auto-refresh deployments in progress
    useEffect(() => {
        const hasInProgress = websites.some(w =>
            w.git_repository?.latest_deployment?.status &&
            ['pending', 'cloning', 'building', 'deploying'].includes(w.git_repository.latest_deployment.status)
        );

        if (hasInProgress) {
            const interval = setInterval(() => {
                router.reload({ only: ['websites'] });
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [websites]);

    const getStatusBadge = (status) => {
        const styles = {
            pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
            cloning: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
            building: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
            deploying: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
            completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
            failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
            rolled_back: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
        };
        return styles[status] || styles.pending;
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between max-w-7xl pr-5">
                    <div className="flex items-center">
                        <TbGitBranch className="mr-2 w-6 h-6" />
                        <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">
                            Git Deployment
                        </h2>
                    </div>
                    <PrimaryButton onClick={() => openConnectModal()} disabled={websitesWithoutRepo.length === 0}>
                        <TbPlus className="mr-2 w-4 h-4" />
                        Connect Repository
                    </PrimaryButton>
                </div>
            }
        >
            <Head title="Git Deployment" />

            <div className="max-w-7xl px-4 my-8">
                {/* Websites Grid */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {websites.map((website) => (
                        <div
                            key={website.id}
                            className="bg-white dark:bg-gray-850 rounded-lg shadow overflow-hidden"
                        >
                            {/* Header */}
                            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                        {website.url}
                                    </h3>
                                    {website.git_repository && (
                                        <FrameworkIcon framework={website.git_repository.framework} />
                                    )}
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    {website.application_type}
                                </p>
                            </div>

                            {/* Content */}
                            <div className="p-4">
                                {website.git_repository ? (
                                    <>
                                        {/* Repository Info */}
                                        <div className="flex items-center space-x-2 mb-3">
                                            <ProviderIcon provider={website.git_repository.provider} />
                                            <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                                {website.git_repository.repository_name}
                                            </span>
                                        </div>

                                        <div className="flex items-center space-x-3 text-sm text-gray-500 dark:text-gray-400 mb-3">
                                            <span className="flex items-center">
                                                <TbGitBranch className="w-4 h-4 mr-1" />
                                                {website.git_repository.branch}
                                            </span>
                                            {website.git_repository.auto_deploy && (
                                                <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                                    Auto-deploy
                                                </span>
                                            )}
                                        </div>

                                        {/* Latest Deployment */}
                                        {website.git_repository.latest_deployment && (
                                            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg mb-3">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${getStatusBadge(website.git_repository.latest_deployment.status)}`}>
                                                        {website.git_repository.latest_deployment.status_label}
                                                    </span>
                                                    {website.git_repository.latest_deployment.duration && (
                                                        <span className="text-xs text-gray-500">
                                                            {website.git_repository.latest_deployment.duration}
                                                        </span>
                                                    )}
                                                </div>
                                                {website.git_repository.latest_deployment.commit_hash && (
                                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                                        <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">
                                                            {website.git_repository.latest_deployment.commit_hash}
                                                        </code>
                                                        {' - '}
                                                        <span className="truncate">
                                                            {website.git_repository.latest_deployment.commit_message?.substring(0, 50)}
                                                        </span>
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div className="flex items-center space-x-2">
                                            <PrimaryButton
                                                onClick={() => handleDeploy(website.git_repository)}
                                                disabled={website.git_repository.latest_deployment?.status &&
                                                    ['pending', 'cloning', 'building', 'deploying'].includes(website.git_repository.latest_deployment.status)}
                                                className="flex-1 justify-center"
                                            >
                                                <TbRocket className="mr-1 w-4 h-4" />
                                                Deploy
                                            </PrimaryButton>
                                            <SecondaryButton
                                                onClick={() => openHistoryModal(website.git_repository)}
                                                className="px-3"
                                                title="Deployment History"
                                            >
                                                <TbHistory className="w-4 h-4" />
                                            </SecondaryButton>
                                            <SecondaryButton
                                                onClick={() => openSettingsModal(website.git_repository)}
                                                className="px-3"
                                                title="Settings"
                                            >
                                                <TbSettings className="w-4 h-4" />
                                            </SecondaryButton>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center py-6">
                                        <TbGitBranch className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                                            No repository connected
                                        </p>
                                        <SecondaryButton onClick={() => openConnectModal(website)}>
                                            <TbLink className="mr-2 w-4 h-4" />
                                            Connect
                                        </SecondaryButton>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {websites.length === 0 && (
                        <div className="col-span-full text-center py-12">
                            <TbGitBranch className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                                No websites yet
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400">
                                Create a website first to connect a Git repository.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Connect Repository Modal */}
            <Modal show={showConnectModal} onClose={() => setShowConnectModal(false)} maxWidth="2xl">
                <form onSubmit={handleConnect} className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
                        <TbLink className="mr-2" />
                        Connect Git Repository
                    </h2>

                    <div className="mt-6 space-y-4">
                        <div>
                            <InputLabel htmlFor="website_id" value="Website" />
                            <select
                                id="website_id"
                                value={connectForm.data.website_id}
                                onChange={(e) => connectForm.setData('website_id', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white sm:text-sm"
                            >
                                <option value="">Select a website</option>
                                {websitesWithoutRepo.map((website) => (
                                    <option key={website.id} value={website.id}>
                                        {website.url}
                                    </option>
                                ))}
                            </select>
                            <InputError message={connectForm.errors.website_id} className="mt-2" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <InputLabel htmlFor="provider" value="Provider" />
                                <select
                                    id="provider"
                                    value={connectForm.data.provider}
                                    onChange={(e) => connectForm.setData('provider', e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white sm:text-sm"
                                >
                                    <option value="github">GitHub</option>
                                    <option value="gitlab">GitLab</option>
                                    <option value="bitbucket">Bitbucket</option>
                                    <option value="custom">Custom</option>
                                </select>
                            </div>
                            <div>
                                <InputLabel htmlFor="framework" value="Framework" />
                                <select
                                    id="framework"
                                    value={connectForm.data.framework}
                                    onChange={(e) => {
                                        connectForm.setData('framework', e.target.value);
                                        fetchDefaultScript(e.target.value);
                                    }}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white sm:text-sm"
                                >
                                    {Object.entries(frameworks).map(([key, label]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <InputLabel htmlFor="repository_url" value="Repository URL" />
                            <TextInput
                                id="repository_url"
                                value={connectForm.data.repository_url}
                                onChange={(e) => connectForm.setData('repository_url', e.target.value)}
                                className="mt-1 block w-full"
                                placeholder="git@github.com:user/repo.git or https://github.com/user/repo.git"
                            />
                            <InputError message={connectForm.errors.repository_url} className="mt-2" />
                        </div>

                        <div>
                            <InputLabel htmlFor="branch" value="Branch" />
                            <TextInput
                                id="branch"
                                value={connectForm.data.branch}
                                onChange={(e) => connectForm.setData('branch', e.target.value)}
                                className="mt-1 block w-full"
                                placeholder="main"
                            />
                            <InputError message={connectForm.errors.branch} className="mt-2" />
                        </div>

                        <div>
                            <InputLabel htmlFor="deploy_key" value="Deploy Key (SSH Private Key - optional for private repos)" />
                            <textarea
                                id="deploy_key"
                                value={connectForm.data.deploy_key}
                                onChange={(e) => connectForm.setData('deploy_key', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white sm:text-sm font-mono text-xs"
                                rows="4"
                                placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
                            />
                        </div>

                        <div>
                            <InputLabel htmlFor="deploy_script" value="Deploy Script (commands to run after git pull)" />
                            <textarea
                                id="deploy_script"
                                value={connectForm.data.deploy_script}
                                onChange={(e) => connectForm.setData('deploy_script', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white sm:text-sm font-mono text-xs"
                                rows="6"
                                placeholder="composer install --no-dev
npm ci
npm run build"
                            />
                        </div>

                        <div className="flex items-center space-x-6">
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={connectForm.data.auto_deploy}
                                    onChange={(e) => connectForm.setData('auto_deploy', e.target.checked)}
                                    className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500"
                                />
                                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                                    Auto-deploy on push
                                </span>
                            </label>
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={connectForm.data.zero_downtime}
                                    onChange={(e) => connectForm.setData('zero_downtime', e.target.checked)}
                                    className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500"
                                />
                                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                                    Zero-downtime deployment
                                </span>
                            </label>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end space-x-3">
                        <SecondaryButton onClick={() => setShowConnectModal(false)}>
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton disabled={connectForm.processing}>
                            {connectForm.processing ? 'Connecting...' : 'Connect Repository'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Settings Modal */}
            <Modal show={showSettingsModal} onClose={() => setShowSettingsModal(false)} maxWidth="2xl">
                <form onSubmit={handleUpdateSettings} className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
                        <TbSettings className="mr-2" />
                        Repository Settings
                    </h2>

                    {selectedRepo && (
                        <div className="mt-6 space-y-4">
                            {/* Webhook URL */}
                            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                                        <TbWebhook className="mr-2" />
                                        Webhook URL
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => copyToClipboard(selectedRepo.webhook_url)}
                                        className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                                    >
                                        <TbCopy className="w-4 h-4" />
                                    </button>
                                </div>
                                <code className="text-xs text-gray-600 dark:text-gray-400 break-all">
                                    {selectedRepo.webhook_url}
                                </code>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <InputLabel htmlFor="settings_branch" value="Branch" />
                                    <TextInput
                                        id="settings_branch"
                                        value={settingsForm.data.branch}
                                        onChange={(e) => settingsForm.setData('branch', e.target.value)}
                                        className="mt-1 block w-full"
                                    />
                                </div>
                                <div>
                                    <InputLabel htmlFor="settings_framework" value="Framework" />
                                    <select
                                        id="settings_framework"
                                        value={settingsForm.data.framework}
                                        onChange={(e) => settingsForm.setData('framework', e.target.value)}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white sm:text-sm"
                                    >
                                        {Object.entries(frameworks).map(([key, label]) => (
                                            <option key={key} value={key}>{label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <InputLabel htmlFor="settings_deploy_script" value="Deploy Script" />
                                <textarea
                                    id="settings_deploy_script"
                                    value={settingsForm.data.deploy_script}
                                    onChange={(e) => settingsForm.setData('deploy_script', e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white sm:text-sm font-mono text-xs"
                                    rows="6"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <InputLabel htmlFor="keep_releases" value="Keep Releases" />
                                    <TextInput
                                        id="keep_releases"
                                        type="number"
                                        min="1"
                                        max="20"
                                        value={settingsForm.data.keep_releases}
                                        onChange={(e) => settingsForm.setData('keep_releases', parseInt(e.target.value))}
                                        className="mt-1 block w-full"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center space-x-6">
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={settingsForm.data.auto_deploy}
                                        onChange={(e) => settingsForm.setData('auto_deploy', e.target.checked)}
                                        className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500"
                                    />
                                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                                        Auto-deploy on push
                                    </span>
                                </label>
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={settingsForm.data.zero_downtime}
                                        onChange={(e) => settingsForm.setData('zero_downtime', e.target.checked)}
                                        className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500"
                                    />
                                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                                        Zero-downtime
                                    </span>
                                </label>
                            </div>

                            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                                <ConfirmationButton doAction={() => handleDisconnect(selectedRepo)}>
                                    <DangerButton type="button">
                                        <TbLinkOff className="mr-2 w-4 h-4" />
                                        Disconnect Repository
                                    </DangerButton>
                                </ConfirmationButton>
                            </div>
                        </div>
                    )}

                    <div className="mt-6 flex justify-end space-x-3">
                        <SecondaryButton onClick={() => setShowSettingsModal(false)}>
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton disabled={settingsForm.processing}>
                            {settingsForm.processing ? 'Saving...' : 'Save Settings'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Deployment History Modal */}
            <Modal show={showHistoryModal} onClose={() => setShowHistoryModal(false)} maxWidth="3xl">
                <div className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center mb-6">
                        <TbHistory className="mr-2" />
                        Deployment History
                    </h2>

                    {loadingHistory ? (
                        <div className="text-center py-8">
                            <TbRefresh className="w-8 h-8 mx-auto animate-spin text-gray-400" />
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {deploymentHistory.map((deployment) => (
                                <div
                                    key={deployment.id}
                                    className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center space-x-3">
                                            <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${getStatusBadge(deployment.status)}`}>
                                                {deployment.status_label}
                                            </span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                {deployment.trigger}
                                            </span>
                                            {deployment.duration && (
                                                <span className="text-xs text-gray-500">
                                                    {deployment.duration}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => openLogsModal(deployment.id)}
                                                className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                                            >
                                                <TbTerminal2 className="w-4 h-4" />
                                            </button>
                                            {deployment.can_rollback && (
                                                <ConfirmationButton doAction={() => handleRollback(deployment.id)}>
                                                    <button
                                                        className="text-sm text-orange-600 hover:text-orange-800 dark:text-orange-400"
                                                        title="Rollback to this version"
                                                    >
                                                        <TbArrowBack className="w-4 h-4" />
                                                    </button>
                                                </ConfirmationButton>
                                            )}
                                        </div>
                                    </div>
                                    {deployment.commit_hash && (
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded text-xs">
                                                {deployment.commit_hash}
                                            </code>
                                            {' - '}
                                            {deployment.commit_message?.substring(0, 80)}
                                            {deployment.commit_author && (
                                                <span className="text-xs text-gray-400 ml-2">
                                                    by {deployment.commit_author}
                                                </span>
                                            )}
                                        </p>
                                    )}
                                    <p className="text-xs text-gray-400 mt-1">
                                        {new Date(deployment.created_at).toLocaleString()}
                                    </p>
                                    {deployment.error_message && (
                                        <p className="text-xs text-red-500 mt-2">
                                            {deployment.error_message}
                                        </p>
                                    )}
                                </div>
                            ))}
                            {deploymentHistory.length === 0 && (
                                <p className="text-center text-gray-500 py-8">
                                    No deployments yet
                                </p>
                            )}
                        </div>
                    )}

                    <div className="mt-6 flex justify-end">
                        <SecondaryButton onClick={() => setShowHistoryModal(false)}>
                            Close
                        </SecondaryButton>
                    </div>
                </div>
            </Modal>

            {/* Logs Modal */}
            <Modal show={showLogsModal} onClose={() => setShowLogsModal(false)} maxWidth="3xl">
                <div className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center mb-4">
                        <TbTerminal2 className="mr-2" />
                        Deployment Logs
                    </h2>

                    {loadingLogs ? (
                        <div className="text-center py-8">
                            <TbRefresh className="w-8 h-8 mx-auto animate-spin text-gray-400" />
                        </div>
                    ) : deploymentLogs && (
                        <>
                            <div className="mb-4">
                                <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${getStatusBadge(deploymentLogs.status)}`}>
                                    {deploymentLogs.status}
                                </span>
                            </div>
                            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-auto max-h-96 font-mono">
                                {deploymentLogs.log || 'No logs available'}
                            </pre>
                            {deploymentLogs.error_message && (
                                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                    <p className="text-sm text-red-600 dark:text-red-400">
                                        {deploymentLogs.error_message}
                                    </p>
                                </div>
                            )}
                        </>
                    )}

                    <div className="mt-6 flex justify-end">
                        <SecondaryButton onClick={() => setShowLogsModal(false)}>
                            Close
                        </SecondaryButton>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
