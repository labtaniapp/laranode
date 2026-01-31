import { useForm, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { FaGithub, FaGitlab, FaBitbucket, FaGit, FaLaravel, FaNodeJs } from 'react-icons/fa';
import { SiNextdotjs } from 'react-icons/si';
import { TbGitBranch, TbRocket, TbHistory, TbSettings, TbRefresh, TbLink, TbLinkOff, TbWebhook, TbCopy, TbTerminal2, TbArrowBack } from 'react-icons/tb';
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
        case 'nuxt': return <FaNodeJs className={`${className} text-green-400`} />;
        case 'nextjs': return <SiNextdotjs className={className} />;
        default: return <TbTerminal2 className={className} />;
    }
};

export default function GitTab({ website, gitRepository, frameworks = {} }) {
    const [showConnectModal, setShowConnectModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showLogsModal, setShowLogsModal] = useState(false);
    const [deploymentHistory, setDeploymentHistory] = useState([]);
    const [deploymentLogs, setDeploymentLogs] = useState(null);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [loadingLogs, setLoadingLogs] = useState(false);

    const defaultFrameworks = {
        'laravel': 'Laravel',
        'nodejs': 'Node.js',
        'nuxt': 'Nuxt.js',
        'nextjs': 'Next.js',
        'static': 'Static Site',
        'custom': 'Custom',
    };

    const frameworksList = Object.keys(frameworks).length > 0 ? frameworks : defaultFrameworks;

    const connectForm = useForm({
        website_id: website.id,
        provider: 'github',
        repository_url: '',
        branch: 'main',
        framework: website.application_type === 'nodejs' ? 'nodejs' : 'laravel',
        deploy_key: '',
        auto_deploy: true,
        zero_downtime: true,
        deploy_script: '',
    });

    const settingsForm = useForm({
        branch: gitRepository?.branch || 'main',
        framework: gitRepository?.framework || 'custom',
        auto_deploy: gitRepository?.auto_deploy || false,
        zero_downtime: true,
        keep_releases: 5,
        deploy_script: '',
        deploy_key: '',
    });

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
        settingsForm.patch(route('git.update', gitRepository.id), {
            onSuccess: () => {
                setShowSettingsModal(false);
                toast.success('Settings updated');
            },
            onError: () => toast.error('Failed to update settings'),
        });
    };

    const handleDeploy = () => {
        router.post(route('git.deploy', gitRepository.id), {}, {
            onSuccess: () => toast.success('Deployment started'),
            onError: () => toast.error('Failed to start deployment'),
        });
    };

    const handleDisconnect = () => {
        router.delete(route('git.disconnect', gitRepository.id), {
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

    const openHistoryModal = async () => {
        if (!gitRepository) return;
        setLoadingHistory(true);
        setShowHistoryModal(true);

        try {
            const response = await fetch(route('git.history', gitRepository.id));
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

    // Auto-refresh if deployment in progress
    useEffect(() => {
        if (gitRepository?.latest_deployment?.status &&
            ['pending', 'cloning', 'building', 'deploying'].includes(gitRepository.latest_deployment.status)) {
            const interval = setInterval(() => {
                router.reload({ only: ['gitRepository'] });
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [gitRepository?.latest_deployment?.status]);

    if (!gitRepository) {
        return (
            <div className="bg-white dark:bg-gray-850 rounded-lg shadow p-8 text-center">
                <TbGitBranch className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    No Git Repository Connected
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                    Connect a Git repository to enable automatic deployments from GitHub, GitLab, or Bitbucket.
                </p>
                <PrimaryButton onClick={() => setShowConnectModal(true)}>
                    <TbLink className="mr-2 w-4 h-4" />
                    Connect Repository
                </PrimaryButton>

                {/* Connect Modal */}
                <Modal show={showConnectModal} onClose={() => setShowConnectModal(false)} maxWidth="2xl">
                    <form onSubmit={handleConnect} className="p-6 text-left">
                        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
                            <TbLink className="mr-2" />
                            Connect Git Repository
                        </h2>

                        <div className="mt-6 space-y-4">
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
                                        {Object.entries(frameworksList).map(([key, label]) => (
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
                                    placeholder="git@github.com:user/repo.git"
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
                            </div>

                            <div>
                                <InputLabel htmlFor="deploy_key" value="Deploy Key (SSH Private Key - optional)" />
                                <textarea
                                    id="deploy_key"
                                    value={connectForm.data.deploy_key}
                                    onChange={(e) => connectForm.setData('deploy_key', e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white sm:text-sm font-mono text-xs"
                                    rows="3"
                                    placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
                                />
                            </div>

                            <div>
                                <InputLabel htmlFor="deploy_script" value="Deploy Script" />
                                <textarea
                                    id="deploy_script"
                                    value={connectForm.data.deploy_script}
                                    onChange={(e) => connectForm.setData('deploy_script', e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white sm:text-sm font-mono text-xs"
                                    rows="5"
                                    placeholder="composer install --no-dev"
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
                                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Auto-deploy on push</span>
                                </label>
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={connectForm.data.zero_downtime}
                                        onChange={(e) => connectForm.setData('zero_downtime', e.target.checked)}
                                        className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500"
                                    />
                                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Zero-downtime</span>
                                </label>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end space-x-3">
                            <SecondaryButton onClick={() => setShowConnectModal(false)}>Cancel</SecondaryButton>
                            <PrimaryButton disabled={connectForm.processing}>
                                {connectForm.processing ? 'Connecting...' : 'Connect'}
                            </PrimaryButton>
                        </div>
                    </form>
                </Modal>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Repository Info Card */}
            <div className="bg-white dark:bg-gray-850 rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                        <ProviderIcon provider={gitRepository.provider} className="w-8 h-8" />
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                {gitRepository.repository_name}
                            </h3>
                            <div className="flex items-center space-x-3 text-sm text-gray-500 dark:text-gray-400">
                                <span className="flex items-center">
                                    <TbGitBranch className="w-4 h-4 mr-1" />
                                    {gitRepository.branch}
                                </span>
                                <span className="flex items-center">
                                    <FrameworkIcon framework={gitRepository.framework} className="w-4 h-4 mr-1" />
                                    {frameworksList[gitRepository.framework] || gitRepository.framework}
                                </span>
                                {gitRepository.auto_deploy && (
                                    <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                        Auto-deploy
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <PrimaryButton
                            onClick={handleDeploy}
                            disabled={gitRepository.latest_deployment?.status &&
                                ['pending', 'cloning', 'building', 'deploying'].includes(gitRepository.latest_deployment.status)}
                        >
                            <TbRocket className="mr-2 w-4 h-4" />
                            Deploy Now
                        </PrimaryButton>
                        <SecondaryButton onClick={openHistoryModal}>
                            <TbHistory className="w-4 h-4" />
                        </SecondaryButton>
                        <SecondaryButton onClick={() => setShowSettingsModal(true)}>
                            <TbSettings className="w-4 h-4" />
                        </SecondaryButton>
                    </div>
                </div>

                {/* Latest Deployment */}
                {gitRepository.latest_deployment && (
                    <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Latest Deployment</span>
                            <div className="flex items-center space-x-2">
                                <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${getStatusBadge(gitRepository.latest_deployment.status)}`}>
                                    {gitRepository.latest_deployment.status_label}
                                </span>
                                {gitRepository.latest_deployment.duration && (
                                    <span className="text-xs text-gray-500">{gitRepository.latest_deployment.duration}</span>
                                )}
                            </div>
                        </div>
                        {gitRepository.latest_deployment.commit_hash && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded text-xs">
                                    {gitRepository.latest_deployment.commit_hash}
                                </code>
                                {' - '}
                                {gitRepository.latest_deployment.commit_message?.substring(0, 60)}
                            </p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                            {gitRepository.latest_deployment.trigger} • {new Date(gitRepository.latest_deployment.created_at).toLocaleString()}
                        </p>
                    </div>
                )}

                {/* Webhook URL */}
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                            <TbWebhook className="mr-2" />
                            Webhook URL
                        </span>
                        <button
                            onClick={() => copyToClipboard(gitRepository.webhook_url)}
                            className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                        >
                            <TbCopy className="w-4 h-4" />
                        </button>
                    </div>
                    <code className="block mt-2 text-xs text-gray-600 dark:text-gray-400 break-all">
                        {gitRepository.webhook_url}
                    </code>
                </div>
            </div>

            {/* Settings Modal */}
            <Modal show={showSettingsModal} onClose={() => setShowSettingsModal(false)} maxWidth="2xl">
                <form onSubmit={handleUpdateSettings} className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
                        <TbSettings className="mr-2" />
                        Repository Settings
                    </h2>

                    <div className="mt-6 space-y-4">
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
                                    {Object.entries(frameworksList).map(([key, label]) => (
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
                                rows="5"
                            />
                        </div>

                        <div className="flex items-center space-x-6">
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={settingsForm.data.auto_deploy}
                                    onChange={(e) => settingsForm.setData('auto_deploy', e.target.checked)}
                                    className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500"
                                />
                                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Auto-deploy on push</span>
                            </label>
                        </div>

                        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                            <ConfirmationButton doAction={handleDisconnect}>
                                <DangerButton type="button">
                                    <TbLinkOff className="mr-2 w-4 h-4" />
                                    Disconnect Repository
                                </DangerButton>
                            </ConfirmationButton>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end space-x-3">
                        <SecondaryButton onClick={() => setShowSettingsModal(false)}>Cancel</SecondaryButton>
                        <PrimaryButton disabled={settingsForm.processing}>Save Settings</PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* History Modal */}
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
                                <div key={deployment.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center space-x-3">
                                            <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${getStatusBadge(deployment.status)}`}>
                                                {deployment.status_label}
                                            </span>
                                            <span className="text-xs text-gray-500">{deployment.trigger}</span>
                                            {deployment.duration && <span className="text-xs text-gray-500">{deployment.duration}</span>}
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <button onClick={() => openLogsModal(deployment.id)} className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400">
                                                <TbTerminal2 className="w-4 h-4" />
                                            </button>
                                            {deployment.can_rollback && (
                                                <ConfirmationButton doAction={() => handleRollback(deployment.id)}>
                                                    <button className="text-orange-600 hover:text-orange-800 dark:text-orange-400" title="Rollback">
                                                        <TbArrowBack className="w-4 h-4" />
                                                    </button>
                                                </ConfirmationButton>
                                            )}
                                        </div>
                                    </div>
                                    {deployment.commit_hash && (
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded text-xs">{deployment.commit_hash}</code>
                                            {' - '}{deployment.commit_message?.substring(0, 80)}
                                        </p>
                                    )}
                                    <p className="text-xs text-gray-400 mt-1">{new Date(deployment.created_at).toLocaleString()}</p>
                                </div>
                            ))}
                            {deploymentHistory.length === 0 && (
                                <p className="text-center text-gray-500 py-8">No deployments yet</p>
                            )}
                        </div>
                    )}

                    <div className="mt-6 flex justify-end">
                        <SecondaryButton onClick={() => setShowHistoryModal(false)}>Close</SecondaryButton>
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
                                    <p className="text-sm text-red-600 dark:text-red-400">{deploymentLogs.error_message}</p>
                                </div>
                            )}
                        </>
                    )}

                    <div className="mt-6 flex justify-end">
                        <SecondaryButton onClick={() => setShowLogsModal(false)}>Close</SecondaryButton>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
