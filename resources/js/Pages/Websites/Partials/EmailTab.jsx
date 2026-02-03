import { useForm, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { TbMail, TbPlus, TbTrash, TbSettings, TbRefresh, TbCopy, TbCheck, TbAlertCircle, TbMailForward, TbKey, TbWorldWww } from 'react-icons/tb';
import { toast } from 'react-toastify';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import DangerButton from '@/Components/DangerButton';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import ConfirmationButton from '@/Components/ConfirmationButton';

const relayProviders = {
    custom: { name: 'Custom SMTP', description: 'Use your own SMTP server' },
    mailgun: { name: 'Mailgun', description: 'Mailgun SMTP relay' },
    sendgrid: { name: 'SendGrid', description: 'SendGrid SMTP relay' },
    ses: { name: 'Amazon SES', description: 'Amazon Simple Email Service' },
    postmark: { name: 'Postmark', description: 'Postmark SMTP relay' },
    mailjet: { name: 'Mailjet', description: 'Mailjet SMTP relay' },
};

const providerDefaults = {
    mailgun: { host: 'smtp.mailgun.org', port: 587, encryption: 'tls' },
    sendgrid: { host: 'smtp.sendgrid.net', port: 587, encryption: 'tls' },
    ses: { host: 'email-smtp.us-east-1.amazonaws.com', port: 587, encryption: 'tls' },
    postmark: { host: 'smtp.postmarkapp.com', port: 587, encryption: 'tls' },
    mailjet: { host: 'in-v3.mailjet.com', port: 587, encryption: 'tls' },
};

const CopyButton = ({ text }) => {
    const [copied, setCopied] = useState(false);

    const copy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button onClick={copy} className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            {copied ? <TbCheck className="w-4 h-4 text-green-500" /> : <TbCopy className="w-4 h-4" />}
        </button>
    );
};

const QuotaBar = ({ used, total }) => {
    const percentage = total > 0 ? Math.min((used / total) * 100, 100) : 0;
    const colorClass = percentage > 90 ? 'bg-red-500' : percentage > 70 ? 'bg-yellow-500' : 'bg-green-500';

    return (
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div className={`${colorClass} h-1.5 rounded-full`} style={{ width: `${percentage}%` }}></div>
        </div>
    );
};

export default function EmailTab({ website }) {
    const [emailData, setEmailData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
    const [showEditAccountModal, setShowEditAccountModal] = useState(false);
    const [showCreateAliasModal, setShowCreateAliasModal] = useState(false);
    const [showRelayModal, setShowRelayModal] = useState(false);
    const [showDnsModal, setShowDnsModal] = useState(false);
    const [editingAccount, setEditingAccount] = useState(null);
    const [relaySettings, setRelaySettings] = useState(null);
    const [testingRelay, setTestingRelay] = useState(false);

    const createAccountForm = useForm({
        local_part: '',
        password: '',
        name: '',
        quota: 1073741824, // 1GB
    });

    const editAccountForm = useForm({
        password: '',
        name: '',
        quota: 1073741824,
        active: true,
    });

    const createAliasForm = useForm({
        source_local: '',
        destination_email: '',
    });

    const relayForm = useForm({
        enabled: false,
        provider: 'custom',
        smtp_host: '',
        smtp_port: 587,
        smtp_username: '',
        smtp_password: '',
        smtp_encryption: 'tls',
        api_key: '',
        use_for_all: false,
        use_as_fallback: true,
        critical_domains: ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'live.com'],
    });

    useEffect(() => {
        fetchEmailData();
    }, []);

    const fetchEmailData = async () => {
        setLoading(true);
        try {
            const response = await fetch(route('websites.email.index', website.id));
            const data = await response.json();
            setEmailData(data);
        } catch (error) {
            toast.error('Failed to load email data');
        } finally {
            setLoading(false);
        }
    };

    const handleEnableDomain = () => {
        router.post(route('websites.email.enable', website.id), {}, {
            onSuccess: () => {
                fetchEmailData();
                toast.success('Email enabled for ' + website.url);
            },
            onError: () => toast.error('Failed to enable email'),
        });
    };

    const handleDisableDomain = () => {
        router.post(route('websites.email.disable', website.id), {}, {
            onSuccess: () => {
                fetchEmailData();
                toast.success('Email disabled');
            },
            onError: () => toast.error('Failed to disable email'),
        });
    };

    const handleCreateAccount = (e) => {
        e.preventDefault();
        createAccountForm.post(route('websites.email.accounts.store', website.id), {
            onSuccess: () => {
                setShowCreateAccountModal(false);
                createAccountForm.reset();
                fetchEmailData();
                toast.success('Email account created');
            },
            onError: () => toast.error('Failed to create account'),
        });
    };

    const handleUpdateAccount = (e) => {
        e.preventDefault();
        editAccountForm.patch(route('websites.email.accounts.update', editingAccount.id), {
            onSuccess: () => {
                setShowEditAccountModal(false);
                setEditingAccount(null);
                fetchEmailData();
                toast.success('Account updated');
            },
            onError: () => toast.error('Failed to update account'),
        });
    };

    const handleDeleteAccount = (accountId) => {
        router.delete(route('websites.email.accounts.destroy', accountId), {
            onSuccess: () => {
                fetchEmailData();
                toast.success('Account deleted');
            },
            onError: () => toast.error('Failed to delete account'),
        });
    };

    const handleCreateAlias = (e) => {
        e.preventDefault();
        createAliasForm.post(route('websites.email.aliases.store', website.id), {
            onSuccess: () => {
                setShowCreateAliasModal(false);
                createAliasForm.reset();
                fetchEmailData();
                toast.success('Alias created');
            },
            onError: () => toast.error('Failed to create alias'),
        });
    };

    const handleDeleteAlias = (aliasId) => {
        router.delete(route('websites.email.aliases.destroy', aliasId), {
            onSuccess: () => {
                fetchEmailData();
                toast.success('Alias deleted');
            },
            onError: () => toast.error('Failed to delete alias'),
        });
    };

    const handleRegenerateDkim = () => {
        router.post(route('websites.email.regenerate-dkim', website.id), {}, {
            onSuccess: () => {
                fetchEmailData();
                toast.success('DKIM keys regenerated');
            },
            onError: () => toast.error('Failed to regenerate DKIM'),
        });
    };

    const openEditAccountModal = (account) => {
        setEditingAccount(account);
        editAccountForm.setData({
            password: '',
            name: account.name || '',
            quota: account.quota,
            active: account.active,
        });
        setShowEditAccountModal(true);
    };

    const openRelayModal = async () => {
        setShowRelayModal(true);
        try {
            const response = await fetch(route('email.relay.index'));
            const data = await response.json();
            setRelaySettings(data);
            relayForm.setData({
                enabled: data.enabled,
                provider: data.provider,
                smtp_host: data.smtp_host || '',
                smtp_port: data.smtp_port || 587,
                smtp_username: data.smtp_username || '',
                smtp_password: '',
                smtp_encryption: data.smtp_encryption || 'tls',
                api_key: '',
                use_for_all: data.use_for_all,
                use_as_fallback: data.use_as_fallback,
                critical_domains: data.critical_domains || ['gmail.com', 'outlook.com', 'yahoo.com'],
            });
        } catch (error) {
            toast.error('Failed to load relay settings');
        }
    };

    const handleProviderChange = (provider) => {
        relayForm.setData('provider', provider);
        if (providerDefaults[provider]) {
            relayForm.setData({
                ...relayForm.data,
                provider,
                smtp_host: providerDefaults[provider].host,
                smtp_port: providerDefaults[provider].port,
                smtp_encryption: providerDefaults[provider].encryption,
            });
        }
    };

    const handleSaveRelay = (e) => {
        e.preventDefault();
        relayForm.patch(route('email.relay.update'), {
            onSuccess: () => {
                toast.success('Relay settings saved');
            },
            onError: () => toast.error('Failed to save settings'),
        });
    };

    const handleTestRelay = async () => {
        setTestingRelay(true);
        try {
            const response = await fetch(route('email.relay.test'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                },
                body: JSON.stringify({
                    smtp_host: relayForm.data.smtp_host,
                    smtp_port: relayForm.data.smtp_port,
                    smtp_username: relayForm.data.smtp_username,
                    smtp_password: relayForm.data.smtp_password,
                    smtp_encryption: relayForm.data.smtp_encryption,
                }),
            });
            const data = await response.json();
            if (data.success) {
                toast.success('Connection successful!');
            } else {
                toast.error('Connection failed: ' + data.message);
            }
        } catch (error) {
            toast.error('Test failed');
        } finally {
            setTestingRelay(false);
        }
    };

    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!emailData?.domain_enabled) {
        return (
            <div className="bg-white dark:bg-gray-850 rounded-lg shadow p-6">
                <div className="text-center py-12">
                    <TbMail className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                        Email Not Enabled
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                        Enable email hosting for {website.url} to create mailboxes, aliases, and manage email delivery.
                    </p>
                    <PrimaryButton onClick={handleEnableDomain}>
                        <TbMail className="mr-2 w-5 h-5" />
                        Enable Email
                    </PrimaryButton>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Domain Overview */}
            <div className="bg-white dark:bg-gray-850 rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
                            <TbMail className="mr-2 w-5 h-5" />
                            Email for {emailData.domain?.domain}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Manage email accounts and aliases for this domain
                        </p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <SecondaryButton onClick={() => setShowDnsModal(true)}>
                            <TbWorldWww className="mr-2 w-4 h-4" />
                            DNS Records
                        </SecondaryButton>
                        <SecondaryButton onClick={openRelayModal}>
                            <TbMailForward className="mr-2 w-4 h-4" />
                            Relay Settings
                        </SecondaryButton>
                        <ConfirmationButton doAction={handleDisableDomain}>
                            <DangerButton>
                                Disable Email
                            </DangerButton>
                        </ConfirmationButton>
                    </div>
                </div>

                {/* DKIM Status */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-between">
                    <div className="flex items-center">
                        <TbKey className="w-5 h-5 text-gray-500 mr-3" />
                        <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                DKIM {emailData.domain?.has_dkim ? 'Configured' : 'Not Configured'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Email signing for improved deliverability
                            </p>
                        </div>
                    </div>
                    <ConfirmationButton doAction={handleRegenerateDkim}>
                        <SecondaryButton size="sm">
                            <TbRefresh className="mr-1 w-4 h-4" />
                            Regenerate DKIM
                        </SecondaryButton>
                    </ConfirmationButton>
                </div>
            </div>

            {/* Email Accounts */}
            <div className="bg-white dark:bg-gray-850 rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        Email Accounts ({emailData.accounts?.length || 0})
                    </h3>
                    <PrimaryButton onClick={() => setShowCreateAccountModal(true)}>
                        <TbPlus className="mr-2 w-4 h-4" />
                        Add Account
                    </PrimaryButton>
                </div>

                {emailData.accounts?.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                        <TbMail className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                        <p className="text-gray-500 dark:text-gray-400 text-sm">No email accounts yet</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {emailData.accounts.map((account) => (
                            <div key={account.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3">
                                            <h4 className="font-medium text-gray-900 dark:text-gray-100">
                                                {account.email}
                                            </h4>
                                            <CopyButton text={account.email} />
                                            {!account.active && (
                                                <span className="px-2 py-0.5 text-xs rounded-full bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                                                    Disabled
                                                </span>
                                            )}
                                        </div>
                                        {account.name && (
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{account.name}</p>
                                        )}
                                        <div className="flex items-center space-x-4 mt-2">
                                            <div className="flex-1 max-w-xs">
                                                <QuotaBar used={account.used_quota} total={account.quota} />
                                            </div>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                {account.used_quota_formatted} / {account.quota_formatted}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2 ml-4">
                                        <button
                                            onClick={() => openEditAccountModal(account)}
                                            className="p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded"
                                            title="Edit"
                                        >
                                            <TbSettings className="w-4 h-4" />
                                        </button>
                                        <ConfirmationButton doAction={() => handleDeleteAccount(account.id)}>
                                            <button
                                                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                                title="Delete"
                                            >
                                                <TbTrash className="w-4 h-4" />
                                            </button>
                                        </ConfirmationButton>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Email Aliases */}
            <div className="bg-white dark:bg-gray-850 rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        Email Aliases ({emailData.aliases?.length || 0})
                    </h3>
                    <PrimaryButton onClick={() => setShowCreateAliasModal(true)}>
                        <TbPlus className="mr-2 w-4 h-4" />
                        Add Alias
                    </PrimaryButton>
                </div>

                {emailData.aliases?.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                        <TbMailForward className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                        <p className="text-gray-500 dark:text-gray-400 text-sm">No aliases yet</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {emailData.aliases.map((alias) => (
                            <div key={alias.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-between">
                                <div className="flex items-center">
                                    <span className="font-mono text-sm text-gray-900 dark:text-gray-100">{alias.source_email}</span>
                                    <TbMailForward className="mx-3 w-4 h-4 text-gray-400" />
                                    <span className="font-mono text-sm text-gray-600 dark:text-gray-400">{alias.destination_email}</span>
                                </div>
                                <ConfirmationButton doAction={() => handleDeleteAlias(alias.id)}>
                                    <button className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                                        <TbTrash className="w-4 h-4" />
                                    </button>
                                </ConfirmationButton>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Account Modal */}
            <Modal show={showCreateAccountModal} onClose={() => setShowCreateAccountModal(false)} maxWidth="md">
                <form onSubmit={handleCreateAccount} className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-6">
                        Create Email Account
                    </h2>

                    <div className="space-y-4">
                        <div>
                            <InputLabel htmlFor="local_part" value="Email Address" />
                            <div className="flex items-center mt-1">
                                <TextInput
                                    id="local_part"
                                    value={createAccountForm.data.local_part}
                                    onChange={(e) => createAccountForm.setData('local_part', e.target.value.toLowerCase())}
                                    className="rounded-r-none"
                                    placeholder="user"
                                />
                                <span className="px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-md text-gray-600 dark:text-gray-400 text-sm">
                                    @{emailData.domain?.domain}
                                </span>
                            </div>
                            <InputError message={createAccountForm.errors.local_part} className="mt-2" />
                        </div>

                        <div>
                            <InputLabel htmlFor="password" value="Password" />
                            <TextInput
                                id="password"
                                type="password"
                                value={createAccountForm.data.password}
                                onChange={(e) => createAccountForm.setData('password', e.target.value)}
                                className="mt-1 block w-full"
                            />
                            <InputError message={createAccountForm.errors.password} className="mt-2" />
                        </div>

                        <div>
                            <InputLabel htmlFor="name" value="Display Name (optional)" />
                            <TextInput
                                id="name"
                                value={createAccountForm.data.name}
                                onChange={(e) => createAccountForm.setData('name', e.target.value)}
                                className="mt-1 block w-full"
                                placeholder="John Doe"
                            />
                        </div>

                        <div>
                            <InputLabel htmlFor="quota" value="Quota (MB)" />
                            <TextInput
                                id="quota"
                                type="number"
                                value={Math.round(createAccountForm.data.quota / 1048576)}
                                onChange={(e) => createAccountForm.setData('quota', parseInt(e.target.value) * 1048576)}
                                className="mt-1 block w-full"
                                min="100"
                            />
                            <p className="text-xs text-gray-500 mt-1">Minimum 100 MB</p>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end space-x-3">
                        <SecondaryButton onClick={() => setShowCreateAccountModal(false)}>Cancel</SecondaryButton>
                        <PrimaryButton disabled={createAccountForm.processing}>
                            {createAccountForm.processing ? 'Creating...' : 'Create Account'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Edit Account Modal */}
            <Modal show={showEditAccountModal} onClose={() => setShowEditAccountModal(false)} maxWidth="md">
                <form onSubmit={handleUpdateAccount} className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-6">
                        Edit Account: {editingAccount?.email}
                    </h2>

                    <div className="space-y-4">
                        <div>
                            <InputLabel htmlFor="edit_password" value="New Password (leave blank to keep current)" />
                            <TextInput
                                id="edit_password"
                                type="password"
                                value={editAccountForm.data.password}
                                onChange={(e) => editAccountForm.setData('password', e.target.value)}
                                className="mt-1 block w-full"
                            />
                        </div>

                        <div>
                            <InputLabel htmlFor="edit_name" value="Display Name" />
                            <TextInput
                                id="edit_name"
                                value={editAccountForm.data.name}
                                onChange={(e) => editAccountForm.setData('name', e.target.value)}
                                className="mt-1 block w-full"
                            />
                        </div>

                        <div>
                            <InputLabel htmlFor="edit_quota" value="Quota (MB)" />
                            <TextInput
                                id="edit_quota"
                                type="number"
                                value={Math.round(editAccountForm.data.quota / 1048576)}
                                onChange={(e) => editAccountForm.setData('quota', parseInt(e.target.value) * 1048576)}
                                className="mt-1 block w-full"
                                min="100"
                            />
                        </div>

                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                checked={editAccountForm.data.active}
                                onChange={(e) => editAccountForm.setData('active', e.target.checked)}
                                className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500"
                            />
                            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Account Active</span>
                        </label>
                    </div>

                    <div className="mt-6 flex justify-end space-x-3">
                        <SecondaryButton onClick={() => setShowEditAccountModal(false)}>Cancel</SecondaryButton>
                        <PrimaryButton disabled={editAccountForm.processing}>
                            {editAccountForm.processing ? 'Saving...' : 'Save Changes'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Create Alias Modal */}
            <Modal show={showCreateAliasModal} onClose={() => setShowCreateAliasModal(false)} maxWidth="md">
                <form onSubmit={handleCreateAlias} className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-6">
                        Create Email Alias
                    </h2>

                    <div className="space-y-4">
                        <div>
                            <InputLabel htmlFor="source_local" value="Alias Address" />
                            <div className="flex items-center mt-1">
                                <TextInput
                                    id="source_local"
                                    value={createAliasForm.data.source_local}
                                    onChange={(e) => createAliasForm.setData('source_local', e.target.value.toLowerCase())}
                                    className="rounded-r-none"
                                    placeholder="alias"
                                />
                                <span className="px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-md text-gray-600 dark:text-gray-400 text-sm">
                                    @{emailData.domain?.domain}
                                </span>
                            </div>
                            <InputError message={createAliasForm.errors.source_local} className="mt-2" />
                        </div>

                        <div>
                            <InputLabel htmlFor="destination_email" value="Forward To" />
                            <TextInput
                                id="destination_email"
                                type="email"
                                value={createAliasForm.data.destination_email}
                                onChange={(e) => createAliasForm.setData('destination_email', e.target.value)}
                                className="mt-1 block w-full"
                                placeholder="destination@example.com"
                            />
                            <InputError message={createAliasForm.errors.destination_email} className="mt-2" />
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end space-x-3">
                        <SecondaryButton onClick={() => setShowCreateAliasModal(false)}>Cancel</SecondaryButton>
                        <PrimaryButton disabled={createAliasForm.processing}>
                            {createAliasForm.processing ? 'Creating...' : 'Create Alias'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* DNS Records Modal */}
            <Modal show={showDnsModal} onClose={() => setShowDnsModal(false)} maxWidth="3xl">
                <div className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                        <TbWorldWww className="mr-2" />
                        DNS Records for {emailData.domain?.domain}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        Add these DNS records to your domain's DNS settings for email to work properly.
                    </p>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Value</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Priority</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Copy</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-850 divide-y divide-gray-200 dark:divide-gray-700">
                                {emailData.dns_records?.map((record, index) => (
                                    <tr key={index}>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className="px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-700 rounded">
                                                {record.type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-gray-100">
                                            {record.name}
                                        </td>
                                        <td className="px-4 py-3 text-sm font-mono text-gray-600 dark:text-gray-400 max-w-md truncate">
                                            {record.value}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                            {record.priority || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <CopyButton text={record.value} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <div className="flex items-start">
                            <TbAlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
                            <div className="text-sm text-yellow-700 dark:text-yellow-300">
                                <p className="font-medium">Important:</p>
                                <ul className="list-disc list-inside mt-1 space-y-1">
                                    <li>DNS changes can take up to 48 hours to propagate</li>
                                    <li>The DKIM record is required for email signing</li>
                                    <li>SPF and DMARC help prevent email spoofing</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                        <SecondaryButton onClick={() => setShowDnsModal(false)}>Close</SecondaryButton>
                    </div>
                </div>
            </Modal>

            {/* Relay Settings Modal */}
            <Modal show={showRelayModal} onClose={() => setShowRelayModal(false)} maxWidth="2xl">
                <form onSubmit={handleSaveRelay} className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-6 flex items-center">
                        <TbMailForward className="mr-2" />
                        Email Relay Settings
                    </h2>

                    <div className="space-y-4">
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                checked={relayForm.data.enabled}
                                onChange={(e) => relayForm.setData('enabled', e.target.checked)}
                                className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500"
                            />
                            <span className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-100">Enable External Relay</span>
                        </label>

                        {relayForm.data.enabled && (
                            <>
                                <div>
                                    <InputLabel value="Provider" />
                                    <div className="grid grid-cols-3 gap-2 mt-2">
                                        {Object.entries(relayProviders).map(([key, provider]) => (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => handleProviderChange(key)}
                                                className={`p-3 rounded-lg border text-left transition-colors ${
                                                    relayForm.data.provider === key
                                                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                                                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                                }`}
                                            >
                                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{provider.name}</p>
                                                <p className="text-xs text-gray-500">{provider.description}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <InputLabel htmlFor="smtp_host" value="SMTP Host" />
                                        <TextInput
                                            id="smtp_host"
                                            value={relayForm.data.smtp_host}
                                            onChange={(e) => relayForm.setData('smtp_host', e.target.value)}
                                            className="mt-1 block w-full"
                                            placeholder="smtp.example.com"
                                        />
                                    </div>
                                    <div>
                                        <InputLabel htmlFor="smtp_port" value="Port" />
                                        <TextInput
                                            id="smtp_port"
                                            type="number"
                                            value={relayForm.data.smtp_port}
                                            onChange={(e) => relayForm.setData('smtp_port', parseInt(e.target.value))}
                                            className="mt-1 block w-full"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <InputLabel htmlFor="smtp_username" value="Username" />
                                        <TextInput
                                            id="smtp_username"
                                            value={relayForm.data.smtp_username}
                                            onChange={(e) => relayForm.setData('smtp_username', e.target.value)}
                                            className="mt-1 block w-full"
                                        />
                                    </div>
                                    <div>
                                        <InputLabel htmlFor="smtp_password" value="Password" />
                                        <TextInput
                                            id="smtp_password"
                                            type="password"
                                            value={relayForm.data.smtp_password}
                                            onChange={(e) => relayForm.setData('smtp_password', e.target.value)}
                                            className="mt-1 block w-full"
                                            placeholder={relaySettings?.smtp_password ? '••••••••' : ''}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <InputLabel htmlFor="smtp_encryption" value="Encryption" />
                                    <select
                                        id="smtp_encryption"
                                        value={relayForm.data.smtp_encryption}
                                        onChange={(e) => relayForm.setData('smtp_encryption', e.target.value)}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                                    >
                                        <option value="tls">TLS</option>
                                        <option value="ssl">SSL</option>
                                        <option value="none">None</option>
                                    </select>
                                </div>

                                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Relay Options</h4>

                                    <div className="space-y-3">
                                        <label className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={relayForm.data.use_for_all}
                                                onChange={(e) => relayForm.setData('use_for_all', e.target.checked)}
                                                className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500"
                                            />
                                            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                                                Use relay for all outgoing mail
                                            </span>
                                        </label>

                                        <label className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={relayForm.data.use_as_fallback}
                                                onChange={(e) => relayForm.setData('use_as_fallback', e.target.checked)}
                                                className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500"
                                            />
                                            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                                                Use relay as fallback when direct delivery fails
                                            </span>
                                        </label>
                                    </div>

                                    {!relayForm.data.use_for_all && (
                                        <div className="mt-4">
                                            <InputLabel value="Critical Domains (always use relay)" />
                                            <p className="text-xs text-gray-500 mb-2">
                                                Major email providers that often block direct mail delivery
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'live.com', 'aol.com', 'icloud.com'].map((domain) => (
                                                    <label key={domain} className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={relayForm.data.critical_domains?.includes(domain)}
                                                            onChange={(e) => {
                                                                const domains = [...(relayForm.data.critical_domains || [])];
                                                                if (e.target.checked) {
                                                                    domains.push(domain);
                                                                } else {
                                                                    const idx = domains.indexOf(domain);
                                                                    if (idx > -1) domains.splice(idx, 1);
                                                                }
                                                                relayForm.setData('critical_domains', domains);
                                                            }}
                                                            className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500"
                                                        />
                                                        <span className="ml-1 text-xs text-gray-600 dark:text-gray-400">{domain}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    <div className="mt-6 flex justify-between">
                        <SecondaryButton type="button" onClick={handleTestRelay} disabled={testingRelay || !relayForm.data.enabled}>
                            {testingRelay ? 'Testing...' : 'Test Connection'}
                        </SecondaryButton>
                        <div className="flex space-x-3">
                            <SecondaryButton onClick={() => setShowRelayModal(false)}>Cancel</SecondaryButton>
                            <PrimaryButton disabled={relayForm.processing}>
                                {relayForm.processing ? 'Saving...' : 'Save Settings'}
                            </PrimaryButton>
                        </div>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
