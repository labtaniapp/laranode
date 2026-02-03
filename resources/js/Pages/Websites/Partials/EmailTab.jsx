import { useForm, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { TbMail, TbPlus, TbTrash, TbSettings, TbRefresh, TbCopy, TbCheck, TbAlertCircle, TbMailForward, TbKey, TbWorldWww, TbChartBar, TbShield, TbVirus, TbInbox, TbSend, TbBan, TbExternalLink, TbEye, TbPlayerPlay } from 'react-icons/tb';
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

const StatCard = ({ icon: Icon, label, value, color = 'blue' }) => {
    const colors = {
        blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
        green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
        red: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
        yellow: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
        purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    };
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <div className="flex items-center">
                <div className={`p-2 rounded-lg ${colors[color]}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div className="ml-3">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
                    <p className="text-xl font-semibold text-gray-900 dark:text-white">{value}</p>
                </div>
            </div>
        </div>
    );
};

export default function EmailTab({ website }) {
    const [activeSubTab, setActiveSubTab] = useState('accounts');
    const [emailData, setEmailData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [securitySettings, setSecuritySettings] = useState(null);
    const [quarantine, setQuarantine] = useState([]);
    const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
    const [showEditAccountModal, setShowEditAccountModal] = useState(false);
    const [showCreateAliasModal, setShowCreateAliasModal] = useState(false);
    const [showRelayModal, setShowRelayModal] = useState(false);
    const [showDnsModal, setShowDnsModal] = useState(false);
    const [showSecurityModal, setShowSecurityModal] = useState(false);
    const [showQuarantinePreview, setShowQuarantinePreview] = useState(null);
    const [editingAccount, setEditingAccount] = useState(null);
    const [relaySettings, setRelaySettings] = useState(null);
    const [testingRelay, setTestingRelay] = useState(false);
    const [newListEntry, setNewListEntry] = useState('');

    const createAccountForm = useForm({ local_part: '', password: '', name: '', quota: 1073741824 });
    const editAccountForm = useForm({ password: '', name: '', quota: 1073741824, active: true });
    const createAliasForm = useForm({ source_local: '', destination_email: '' });
    const relayForm = useForm({
        enabled: false, provider: 'custom', smtp_host: '', smtp_port: 587, smtp_username: '', smtp_password: '',
        smtp_encryption: 'tls', api_key: '', use_for_all: false, use_as_fallback: true,
        critical_domains: ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'live.com'],
    });
    const securityForm = useForm({
        spam_filter_enabled: true, spam_threshold: 5.0, spam_kill_threshold: 10.0, spam_action: 'quarantine',
        spam_learning_enabled: true, virus_filter_enabled: true, virus_action: 'reject', scan_attachments: true,
        max_attachment_size: 26214400,
    });

    useEffect(() => { fetchEmailData(); }, []);

    const fetchEmailData = async () => {
        setLoading(true);
        try {
            const response = await fetch(route('websites.email.index', website.id));
            const data = await response.json();
            setEmailData(data);
            if (data.domain_enabled) {
                fetchStats();
                fetchSecuritySettings();
                fetchQuarantine();
            }
        } catch (error) {
            toast.error('Failed to load email data');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await fetch(route('websites.email.stats', website.id));
            const data = await response.json();
            setStats(data);
        } catch (error) { console.error('Failed to fetch stats'); }
    };

    const fetchSecuritySettings = async () => {
        try {
            const response = await fetch(route('websites.email.security.index', website.id));
            const data = await response.json();
            setSecuritySettings(data);
            securityForm.setData(data);
        } catch (error) { console.error('Failed to fetch security settings'); }
    };

    const fetchQuarantine = async () => {
        try {
            const response = await fetch(route('websites.email.quarantine.index', website.id));
            const data = await response.json();
            setQuarantine(data.data || []);
        } catch (error) { console.error('Failed to fetch quarantine'); }
    };

    const handleEnableDomain = () => {
        router.post(route('websites.email.enable', website.id), {}, {
            onSuccess: () => { fetchEmailData(); toast.success('Email enabled for ' + website.url); },
            onError: () => toast.error('Failed to enable email'),
        });
    };

    const handleDisableDomain = () => {
        router.post(route('websites.email.disable', website.id), {}, {
            onSuccess: () => { fetchEmailData(); toast.success('Email disabled'); },
            onError: () => toast.error('Failed to disable email'),
        });
    };

    const handleCreateAccount = (e) => {
        e.preventDefault();
        createAccountForm.post(route('websites.email.accounts.store', website.id), {
            onSuccess: () => { setShowCreateAccountModal(false); createAccountForm.reset(); fetchEmailData(); toast.success('Email account created'); },
            onError: () => toast.error('Failed to create account'),
        });
    };

    const handleUpdateAccount = (e) => {
        e.preventDefault();
        editAccountForm.patch(route('websites.email.accounts.update', editingAccount.id), {
            onSuccess: () => { setShowEditAccountModal(false); setEditingAccount(null); fetchEmailData(); toast.success('Account updated'); },
            onError: () => toast.error('Failed to update account'),
        });
    };

    const handleDeleteAccount = (accountId) => {
        router.delete(route('websites.email.accounts.destroy', accountId), {
            onSuccess: () => { fetchEmailData(); toast.success('Account deleted'); },
            onError: () => toast.error('Failed to delete account'),
        });
    };

    const handleCreateAlias = (e) => {
        e.preventDefault();
        createAliasForm.post(route('websites.email.aliases.store', website.id), {
            onSuccess: () => { setShowCreateAliasModal(false); createAliasForm.reset(); fetchEmailData(); toast.success('Alias created'); },
            onError: () => toast.error('Failed to create alias'),
        });
    };

    const handleDeleteAlias = (aliasId) => {
        router.delete(route('websites.email.aliases.destroy', aliasId), {
            onSuccess: () => { fetchEmailData(); toast.success('Alias deleted'); },
            onError: () => toast.error('Failed to delete alias'),
        });
    };

    const handleRegenerateDkim = () => {
        router.post(route('websites.email.regenerate-dkim', website.id), {}, {
            onSuccess: () => { fetchEmailData(); toast.success('DKIM keys regenerated'); },
            onError: () => toast.error('Failed to regenerate DKIM'),
        });
    };

    const handleSaveSecuritySettings = (e) => {
        e.preventDefault();
        securityForm.patch(route('websites.email.security.update', website.id), {
            onSuccess: () => { toast.success('Security settings saved'); setShowSecurityModal(false); fetchSecuritySettings(); },
            onError: () => toast.error('Failed to save settings'),
        });
    };

    const handleAddToWhitelist = () => {
        if (!newListEntry) return;
        router.post(route('websites.email.security.whitelist.add', website.id), { entry: newListEntry }, {
            onSuccess: () => { setNewListEntry(''); fetchSecuritySettings(); toast.success('Added to whitelist'); },
        });
    };

    const handleAddToBlacklist = () => {
        if (!newListEntry) return;
        router.post(route('websites.email.security.blacklist.add', website.id), { entry: newListEntry }, {
            onSuccess: () => { setNewListEntry(''); fetchSecuritySettings(); toast.success('Added to blacklist'); },
        });
    };

    const handleReleaseQuarantine = async (id) => {
        try {
            await fetch(route('email.quarantine.release', id), { method: 'POST', headers: { 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content } });
            toast.success('Message released');
            fetchQuarantine();
        } catch (error) { toast.error('Failed to release'); }
    };

    const handleDeleteQuarantine = async (id) => {
        try {
            await fetch(route('email.quarantine.destroy', id), { method: 'DELETE', headers: { 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content } });
            toast.success('Message deleted');
            fetchQuarantine();
        } catch (error) { toast.error('Failed to delete'); }
    };

    const openEditAccountModal = (account) => {
        setEditingAccount(account);
        editAccountForm.setData({ password: '', name: account.name || '', quota: account.quota, active: account.active });
        setShowEditAccountModal(true);
    };

    const openRelayModal = async () => {
        setShowRelayModal(true);
        try {
            const response = await fetch(route('email.relay.index'));
            const data = await response.json();
            setRelaySettings(data);
            relayForm.setData({
                enabled: data.enabled, provider: data.provider, smtp_host: data.smtp_host || '', smtp_port: data.smtp_port || 587,
                smtp_username: data.smtp_username || '', smtp_password: '', smtp_encryption: data.smtp_encryption || 'tls', api_key: '',
                use_for_all: data.use_for_all, use_as_fallback: data.use_as_fallback,
                critical_domains: data.critical_domains || ['gmail.com', 'outlook.com', 'yahoo.com'],
            });
        } catch (error) { toast.error('Failed to load relay settings'); }
    };

    const handleProviderChange = (provider) => {
        if (providerDefaults[provider]) {
            relayForm.setData({ ...relayForm.data, provider, smtp_host: providerDefaults[provider].host, smtp_port: providerDefaults[provider].port, smtp_encryption: providerDefaults[provider].encryption });
        } else {
            relayForm.setData('provider', provider);
        }
    };

    const handleSaveRelay = (e) => {
        e.preventDefault();
        relayForm.patch(route('email.relay.update'), {
            onSuccess: () => toast.success('Relay settings saved'),
            onError: () => toast.error('Failed to save settings'),
        });
    };

    const handleTestRelay = async () => {
        setTestingRelay(true);
        try {
            const response = await fetch(route('email.relay.test'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content },
                body: JSON.stringify({ smtp_host: relayForm.data.smtp_host, smtp_port: relayForm.data.smtp_port, smtp_username: relayForm.data.smtp_username, smtp_password: relayForm.data.smtp_password, smtp_encryption: relayForm.data.smtp_encryption }),
            });
            const data = await response.json();
            data.success ? toast.success('Connection successful!') : toast.error('Connection failed: ' + data.message);
        } catch (error) { toast.error('Test failed'); }
        finally { setTestingRelay(false); }
    };

    const openWebmail = () => {
        window.open(`/webmail`, '_blank');
    };

    if (loading) {
        return (<div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>);
    }

    if (!emailData?.domain_enabled) {
        return (
            <div className="bg-white dark:bg-gray-850 rounded-lg shadow p-6">
                <div className="text-center py-12">
                    <TbMail className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Email Not Enabled</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">Enable email hosting for {website.url} to create mailboxes, aliases, and manage email delivery.</p>
                    <PrimaryButton onClick={handleEnableDomain}><TbMail className="mr-2 w-5 h-5" />Enable Email</PrimaryButton>
                </div>
            </div>
        );
    }

    const subTabs = [
        { id: 'accounts', label: 'Accounts', icon: TbMail },
        { id: 'stats', label: 'Statistics', icon: TbChartBar },
        { id: 'security', label: 'Security', icon: TbShield },
        { id: 'quarantine', label: 'Quarantine', icon: TbBan, count: quarantine.length },
    ];

    return (
        <div className="space-y-6">
            {/* Domain Header */}
            <div className="bg-white dark:bg-gray-850 rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
                            <TbMail className="mr-2 w-5 h-5" />Email for {emailData.domain?.domain}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage email accounts, security, and delivery</p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <SecondaryButton onClick={openWebmail}><TbExternalLink className="mr-2 w-4 h-4" />Webmail</SecondaryButton>
                        <SecondaryButton onClick={() => setShowDnsModal(true)}><TbWorldWww className="mr-2 w-4 h-4" />DNS</SecondaryButton>
                        <SecondaryButton onClick={openRelayModal}><TbMailForward className="mr-2 w-4 h-4" />Relay</SecondaryButton>
                        <ConfirmationButton doAction={handleDisableDomain}><DangerButton>Disable</DangerButton></ConfirmationButton>
                    </div>
                </div>
                <div className="flex items-center space-x-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center"><TbKey className="w-4 h-4 text-gray-500 mr-2" /><span className="text-sm text-gray-600 dark:text-gray-400">DKIM: {emailData.domain?.has_dkim ? <span className="text-green-600">Active</span> : <span className="text-red-600">Not configured</span>}</span></div>
                    <ConfirmationButton doAction={handleRegenerateDkim}><button className="text-sm text-indigo-600 hover:text-indigo-800"><TbRefresh className="inline w-4 h-4 mr-1" />Regenerate</button></ConfirmationButton>
                </div>
            </div>

            {/* Sub-tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="flex space-x-4">
                    {subTabs.map((tab) => (
                        <button key={tab.id} onClick={() => setActiveSubTab(tab.id)}
                            className={`flex items-center px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${activeSubTab === tab.id ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}>
                            <tab.icon className="w-4 h-4 mr-2" />{tab.label}
                            {tab.count > 0 && <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-600 rounded-full">{tab.count}</span>}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Accounts Tab */}
            {activeSubTab === 'accounts' && (
                <div className="space-y-6">
                    {/* Accounts */}
                    <div className="bg-white dark:bg-gray-850 rounded-lg shadow p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Email Accounts ({emailData.accounts?.length || 0})</h3>
                            <PrimaryButton onClick={() => setShowCreateAccountModal(true)}><TbPlus className="mr-2 w-4 h-4" />Add Account</PrimaryButton>
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
                                                    <h4 className="font-medium text-gray-900 dark:text-gray-100">{account.email}</h4>
                                                    <CopyButton text={account.email} />
                                                    {!account.active && <span className="px-2 py-0.5 text-xs rounded-full bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400">Disabled</span>}
                                                </div>
                                                {account.name && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{account.name}</p>}
                                                <div className="flex items-center space-x-4 mt-2">
                                                    <div className="flex-1 max-w-xs"><QuotaBar used={account.used_quota} total={account.quota} /></div>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">{account.used_quota_formatted} / {account.quota_formatted}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-2 ml-4">
                                                <button onClick={() => openEditAccountModal(account)} className="p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded" title="Edit"><TbSettings className="w-4 h-4" /></button>
                                                <ConfirmationButton doAction={() => handleDeleteAccount(account.id)}><button className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded" title="Delete"><TbTrash className="w-4 h-4" /></button></ConfirmationButton>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    {/* Aliases */}
                    <div className="bg-white dark:bg-gray-850 rounded-lg shadow p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Email Aliases ({emailData.aliases?.length || 0})</h3>
                            <PrimaryButton onClick={() => setShowCreateAliasModal(true)}><TbPlus className="mr-2 w-4 h-4" />Add Alias</PrimaryButton>
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
                                        <ConfirmationButton doAction={() => handleDeleteAlias(alias.id)}><button className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"><TbTrash className="w-4 h-4" /></button></ConfirmationButton>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Statistics Tab */}
            {activeSubTab === 'stats' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        <StatCard icon={TbSend} label="Sent" value={stats?.totals?.sent || 0} color="blue" />
                        <StatCard icon={TbInbox} label="Received" value={stats?.totals?.received || 0} color="green" />
                        <StatCard icon={TbAlertCircle} label="Bounced" value={stats?.totals?.bounced || 0} color="yellow" />
                        <StatCard icon={TbBan} label="Rejected" value={stats?.totals?.rejected || 0} color="red" />
                        <StatCard icon={TbShield} label="Spam Blocked" value={stats?.totals?.spam_blocked || 0} color="purple" />
                        <StatCard icon={TbVirus} label="Virus Blocked" value={stats?.totals?.virus_blocked || 0} color="red" />
                    </div>
                    <div className="bg-white dark:bg-gray-850 rounded-lg shadow p-6">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Daily Statistics (Last 30 days)</h3>
                        {stats?.daily?.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-800">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Sent</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Received</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Bounced</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Spam</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {stats.daily.slice(-10).reverse().map((day, idx) => (
                                            <tr key={idx}>
                                                <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{day.date}</td>
                                                <td className="px-4 py-2 text-sm text-right text-gray-600 dark:text-gray-400">{day.sent}</td>
                                                <td className="px-4 py-2 text-sm text-right text-gray-600 dark:text-gray-400">{day.received}</td>
                                                <td className="px-4 py-2 text-sm text-right text-gray-600 dark:text-gray-400">{day.bounced}</td>
                                                <td className="px-4 py-2 text-sm text-right text-gray-600 dark:text-gray-400">{day.spam_blocked}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-gray-500 text-center py-8">No statistics available yet</p>
                        )}
                    </div>
                </div>
            )}

            {/* Security Tab */}
            {activeSubTab === 'security' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Spam Settings */}
                        <div className="bg-white dark:bg-gray-850 rounded-lg shadow p-6">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center"><TbShield className="mr-2" />SpamAssassin</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Spam Filter</span>
                                    <span className={`px-2 py-1 text-xs rounded-full ${securitySettings?.spam_filter_enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {securitySettings?.spam_filter_enabled ? 'Enabled' : 'Disabled'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Spam Threshold</span>
                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{securitySettings?.spam_threshold || 5.0}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Action</span>
                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">{securitySettings?.spam_action || 'quarantine'}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Auto-learning</span>
                                    <span className={`px-2 py-1 text-xs rounded-full ${securitySettings?.spam_learning_enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {securitySettings?.spam_learning_enabled ? 'Enabled' : 'Disabled'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        {/* Virus Settings */}
                        <div className="bg-white dark:bg-gray-850 rounded-lg shadow p-6">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center"><TbVirus className="mr-2" />ClamAV Antivirus</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Virus Filter</span>
                                    <span className={`px-2 py-1 text-xs rounded-full ${securitySettings?.virus_filter_enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {securitySettings?.virus_filter_enabled ? 'Enabled' : 'Disabled'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Action</span>
                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">{securitySettings?.virus_action || 'reject'}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Scan Attachments</span>
                                    <span className={`px-2 py-1 text-xs rounded-full ${securitySettings?.scan_attachments ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {securitySettings?.scan_attachments ? 'Enabled' : 'Disabled'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Max Attachment</span>
                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{Math.round((securitySettings?.max_attachment_size || 26214400) / 1048576)} MB</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <PrimaryButton onClick={() => setShowSecurityModal(true)}><TbSettings className="mr-2 w-4 h-4" />Configure Security</PrimaryButton>
                    </div>
                    {/* Whitelist/Blacklist */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-gray-850 rounded-lg shadow p-6">
                            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Whitelist</h4>
                            <p className="text-xs text-gray-500 mb-3">Emails from these addresses/domains will never be marked as spam</p>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                {(securitySettings?.whitelist || []).map((entry, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                                        <span className="text-sm font-mono">{entry}</span>
                                        <button onClick={() => router.delete(route('websites.email.security.whitelist.remove', website.id), { data: { entry } })} className="text-red-500 hover:text-red-700"><TbTrash className="w-4 h-4" /></button>
                                    </div>
                                ))}
                            </div>
                            <div className="flex mt-3 space-x-2">
                                <TextInput value={newListEntry} onChange={(e) => setNewListEntry(e.target.value)} placeholder="email@domain.com" className="flex-1 text-sm" />
                                <SecondaryButton onClick={handleAddToWhitelist}>Add</SecondaryButton>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-850 rounded-lg shadow p-6">
                            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Blacklist</h4>
                            <p className="text-xs text-gray-500 mb-3">Emails from these addresses/domains will always be rejected</p>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                {(securitySettings?.blacklist || []).map((entry, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                                        <span className="text-sm font-mono">{entry}</span>
                                        <button onClick={() => router.delete(route('websites.email.security.blacklist.remove', website.id), { data: { entry } })} className="text-red-500 hover:text-red-700"><TbTrash className="w-4 h-4" /></button>
                                    </div>
                                ))}
                            </div>
                            <div className="flex mt-3 space-x-2">
                                <TextInput value={newListEntry} onChange={(e) => setNewListEntry(e.target.value)} placeholder="spammer@domain.com" className="flex-1 text-sm" />
                                <SecondaryButton onClick={handleAddToBlacklist}>Add</SecondaryButton>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Quarantine Tab */}
            {activeSubTab === 'quarantine' && (
                <div className="bg-white dark:bg-gray-850 rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Quarantine ({quarantine.length} items)</h3>
                    {quarantine.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                            <TbShield className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                            <p className="text-gray-500">No quarantined messages</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {quarantine.map((item) => (
                                <div key={item.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-3">
                                                <span className={`px-2 py-0.5 text-xs rounded-full ${item.reason === 'spam' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                                    {item.reason === 'spam' ? 'Spam' : 'Virus'}
                                                </span>
                                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.subject || '(No subject)'}</span>
                                            </div>
                                            <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                                                <span>From: {item.from_address}</span>
                                                <span>To: {item.to_address}</span>
                                                {item.spam_score && <span>Score: {item.spam_score}</span>}
                                                {item.virus_name && <span>Virus: {item.virus_name}</span>}
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <button onClick={() => setShowQuarantinePreview(item)} className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Preview"><TbEye className="w-4 h-4" /></button>
                                            {item.reason === 'spam' && <button onClick={() => handleReleaseQuarantine(item.id)} className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded" title="Release"><TbPlayerPlay className="w-4 h-4" /></button>}
                                            <button onClick={() => handleDeleteQuarantine(item.id)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded" title="Delete"><TbTrash className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Create Account Modal */}
            <Modal show={showCreateAccountModal} onClose={() => setShowCreateAccountModal(false)} maxWidth="md">
                <form onSubmit={handleCreateAccount} className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-6">Create Email Account</h2>
                    <div className="space-y-4">
                        <div>
                            <InputLabel htmlFor="local_part" value="Email Address" />
                            <div className="flex items-center mt-1">
                                <TextInput id="local_part" value={createAccountForm.data.local_part} onChange={(e) => createAccountForm.setData('local_part', e.target.value.toLowerCase())} className="rounded-r-none" placeholder="user" />
                                <span className="px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-md text-gray-600 dark:text-gray-400 text-sm">@{emailData.domain?.domain}</span>
                            </div>
                            <InputError message={createAccountForm.errors.local_part} className="mt-2" />
                        </div>
                        <div>
                            <InputLabel htmlFor="password" value="Password" />
                            <TextInput id="password" type="password" value={createAccountForm.data.password} onChange={(e) => createAccountForm.setData('password', e.target.value)} className="mt-1 block w-full" />
                            <InputError message={createAccountForm.errors.password} className="mt-2" />
                        </div>
                        <div>
                            <InputLabel htmlFor="name" value="Display Name (optional)" />
                            <TextInput id="name" value={createAccountForm.data.name} onChange={(e) => createAccountForm.setData('name', e.target.value)} className="mt-1 block w-full" placeholder="John Doe" />
                        </div>
                        <div>
                            <InputLabel htmlFor="quota" value="Quota (MB)" />
                            <TextInput id="quota" type="number" value={Math.round(createAccountForm.data.quota / 1048576)} onChange={(e) => createAccountForm.setData('quota', parseInt(e.target.value) * 1048576)} className="mt-1 block w-full" min="100" />
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                        <SecondaryButton onClick={() => setShowCreateAccountModal(false)}>Cancel</SecondaryButton>
                        <PrimaryButton disabled={createAccountForm.processing}>{createAccountForm.processing ? 'Creating...' : 'Create Account'}</PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Edit Account Modal */}
            <Modal show={showEditAccountModal} onClose={() => setShowEditAccountModal(false)} maxWidth="md">
                <form onSubmit={handleUpdateAccount} className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-6">Edit Account: {editingAccount?.email}</h2>
                    <div className="space-y-4">
                        <div><InputLabel htmlFor="edit_password" value="New Password (leave blank to keep)" /><TextInput id="edit_password" type="password" value={editAccountForm.data.password} onChange={(e) => editAccountForm.setData('password', e.target.value)} className="mt-1 block w-full" /></div>
                        <div><InputLabel htmlFor="edit_name" value="Display Name" /><TextInput id="edit_name" value={editAccountForm.data.name} onChange={(e) => editAccountForm.setData('name', e.target.value)} className="mt-1 block w-full" /></div>
                        <div><InputLabel htmlFor="edit_quota" value="Quota (MB)" /><TextInput id="edit_quota" type="number" value={Math.round(editAccountForm.data.quota / 1048576)} onChange={(e) => editAccountForm.setData('quota', parseInt(e.target.value) * 1048576)} className="mt-1 block w-full" min="100" /></div>
                        <label className="flex items-center"><input type="checkbox" checked={editAccountForm.data.active} onChange={(e) => editAccountForm.setData('active', e.target.checked)} className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500" /><span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Account Active</span></label>
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                        <SecondaryButton onClick={() => setShowEditAccountModal(false)}>Cancel</SecondaryButton>
                        <PrimaryButton disabled={editAccountForm.processing}>{editAccountForm.processing ? 'Saving...' : 'Save Changes'}</PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Create Alias Modal */}
            <Modal show={showCreateAliasModal} onClose={() => setShowCreateAliasModal(false)} maxWidth="md">
                <form onSubmit={handleCreateAlias} className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-6">Create Email Alias</h2>
                    <div className="space-y-4">
                        <div>
                            <InputLabel htmlFor="source_local" value="Alias Address" />
                            <div className="flex items-center mt-1">
                                <TextInput id="source_local" value={createAliasForm.data.source_local} onChange={(e) => createAliasForm.setData('source_local', e.target.value.toLowerCase())} className="rounded-r-none" placeholder="alias" />
                                <span className="px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-md text-gray-600 dark:text-gray-400 text-sm">@{emailData.domain?.domain}</span>
                            </div>
                            <InputError message={createAliasForm.errors.source_local} className="mt-2" />
                        </div>
                        <div>
                            <InputLabel htmlFor="destination_email" value="Forward To" />
                            <TextInput id="destination_email" type="email" value={createAliasForm.data.destination_email} onChange={(e) => createAliasForm.setData('destination_email', e.target.value)} className="mt-1 block w-full" placeholder="destination@example.com" />
                            <InputError message={createAliasForm.errors.destination_email} className="mt-2" />
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                        <SecondaryButton onClick={() => setShowCreateAliasModal(false)}>Cancel</SecondaryButton>
                        <PrimaryButton disabled={createAliasForm.processing}>{createAliasForm.processing ? 'Creating...' : 'Create Alias'}</PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* DNS Records Modal */}
            <Modal show={showDnsModal} onClose={() => setShowDnsModal(false)} maxWidth="3xl">
                <div className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center"><TbWorldWww className="mr-2" />DNS Records for {emailData.domain?.domain}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Add these DNS records for email to work properly.</p>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Copy</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-850 divide-y divide-gray-200 dark:divide-gray-700">
                                {emailData.dns_records?.map((record, index) => (
                                    <tr key={index}>
                                        <td className="px-4 py-3 whitespace-nowrap"><span className="px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-700 rounded">{record.type}</span></td>
                                        <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-gray-100">{record.name}</td>
                                        <td className="px-4 py-3 text-sm font-mono text-gray-600 dark:text-gray-400 max-w-md truncate">{record.value}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{record.priority || '-'}</td>
                                        <td className="px-4 py-3 text-center"><CopyButton text={record.value} /></td>
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
                                    <li>DKIM record is required for email signing</li>
                                    <li>SPF and DMARC help prevent email spoofing</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end"><SecondaryButton onClick={() => setShowDnsModal(false)}>Close</SecondaryButton></div>
                </div>
            </Modal>

            {/* Relay Settings Modal */}
            <Modal show={showRelayModal} onClose={() => setShowRelayModal(false)} maxWidth="2xl">
                <form onSubmit={handleSaveRelay} className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-6 flex items-center"><TbMailForward className="mr-2" />Email Relay Settings</h2>
                    <div className="space-y-4">
                        <label className="flex items-center"><input type="checkbox" checked={relayForm.data.enabled} onChange={(e) => relayForm.setData('enabled', e.target.checked)} className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500" /><span className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-100">Enable External Relay</span></label>
                        {relayForm.data.enabled && (
                            <>
                                <div>
                                    <InputLabel value="Provider" />
                                    <div className="grid grid-cols-3 gap-2 mt-2">
                                        {Object.entries(relayProviders).map(([key, provider]) => (
                                            <button key={key} type="button" onClick={() => handleProviderChange(key)} className={`p-3 rounded-lg border text-left transition-colors ${relayForm.data.provider === key ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
                                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{provider.name}</p>
                                                <p className="text-xs text-gray-500">{provider.description}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><InputLabel htmlFor="smtp_host" value="SMTP Host" /><TextInput id="smtp_host" value={relayForm.data.smtp_host} onChange={(e) => relayForm.setData('smtp_host', e.target.value)} className="mt-1 block w-full" placeholder="smtp.example.com" /></div>
                                    <div><InputLabel htmlFor="smtp_port" value="Port" /><TextInput id="smtp_port" type="number" value={relayForm.data.smtp_port} onChange={(e) => relayForm.setData('smtp_port', parseInt(e.target.value))} className="mt-1 block w-full" /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><InputLabel htmlFor="smtp_username" value="Username" /><TextInput id="smtp_username" value={relayForm.data.smtp_username} onChange={(e) => relayForm.setData('smtp_username', e.target.value)} className="mt-1 block w-full" /></div>
                                    <div><InputLabel htmlFor="smtp_password" value="Password" /><TextInput id="smtp_password" type="password" value={relayForm.data.smtp_password} onChange={(e) => relayForm.setData('smtp_password', e.target.value)} className="mt-1 block w-full" placeholder={relaySettings?.smtp_password ? '••••••••' : ''} /></div>
                                </div>
                                <div>
                                    <InputLabel htmlFor="smtp_encryption" value="Encryption" />
                                    <select id="smtp_encryption" value={relayForm.data.smtp_encryption} onChange={(e) => relayForm.setData('smtp_encryption', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white">
                                        <option value="tls">TLS</option><option value="ssl">SSL</option><option value="none">None</option>
                                    </select>
                                </div>
                                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Relay Options</h4>
                                    <div className="space-y-3">
                                        <label className="flex items-center"><input type="checkbox" checked={relayForm.data.use_for_all} onChange={(e) => relayForm.setData('use_for_all', e.target.checked)} className="rounded border-gray-300 text-indigo-600" /><span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Use relay for all outgoing mail</span></label>
                                        <label className="flex items-center"><input type="checkbox" checked={relayForm.data.use_as_fallback} onChange={(e) => relayForm.setData('use_as_fallback', e.target.checked)} className="rounded border-gray-300 text-indigo-600" /><span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Use relay as fallback when direct delivery fails</span></label>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                    <div className="mt-6 flex justify-between">
                        <SecondaryButton type="button" onClick={handleTestRelay} disabled={testingRelay || !relayForm.data.enabled}>{testingRelay ? 'Testing...' : 'Test Connection'}</SecondaryButton>
                        <div className="flex space-x-3">
                            <SecondaryButton onClick={() => setShowRelayModal(false)}>Cancel</SecondaryButton>
                            <PrimaryButton disabled={relayForm.processing}>{relayForm.processing ? 'Saving...' : 'Save Settings'}</PrimaryButton>
                        </div>
                    </div>
                </form>
            </Modal>

            {/* Security Settings Modal */}
            <Modal show={showSecurityModal} onClose={() => setShowSecurityModal(false)} maxWidth="2xl">
                <form onSubmit={handleSaveSecuritySettings} className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-6">Security Settings</h2>
                    <div className="space-y-6">
                        <div>
                            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">SpamAssassin</h3>
                            <div className="space-y-4">
                                <label className="flex items-center"><input type="checkbox" checked={securityForm.data.spam_filter_enabled} onChange={(e) => securityForm.setData('spam_filter_enabled', e.target.checked)} className="rounded border-gray-300 text-indigo-600" /><span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Enable spam filter</span></label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><InputLabel value="Spam Threshold" /><TextInput type="number" step="0.5" value={securityForm.data.spam_threshold} onChange={(e) => securityForm.setData('spam_threshold', parseFloat(e.target.value))} className="mt-1 block w-full" /></div>
                                    <div><InputLabel value="Kill Threshold" /><TextInput type="number" step="0.5" value={securityForm.data.spam_kill_threshold} onChange={(e) => securityForm.setData('spam_kill_threshold', parseFloat(e.target.value))} className="mt-1 block w-full" /></div>
                                </div>
                                <div><InputLabel value="Spam Action" /><select value={securityForm.data.spam_action} onChange={(e) => securityForm.setData('spam_action', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 dark:bg-gray-800 dark:border-gray-600"><option value="tag">Tag (add [SPAM] to subject)</option><option value="quarantine">Quarantine</option><option value="reject">Reject</option></select></div>
                                <label className="flex items-center"><input type="checkbox" checked={securityForm.data.spam_learning_enabled} onChange={(e) => securityForm.setData('spam_learning_enabled', e.target.checked)} className="rounded border-gray-300 text-indigo-600" /><span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Enable auto-learning (Bayesian)</span></label>
                            </div>
                        </div>
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">ClamAV Antivirus</h3>
                            <div className="space-y-4">
                                <label className="flex items-center"><input type="checkbox" checked={securityForm.data.virus_filter_enabled} onChange={(e) => securityForm.setData('virus_filter_enabled', e.target.checked)} className="rounded border-gray-300 text-indigo-600" /><span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Enable virus scanning</span></label>
                                <div><InputLabel value="Virus Action" /><select value={securityForm.data.virus_action} onChange={(e) => securityForm.setData('virus_action', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 dark:bg-gray-800 dark:border-gray-600"><option value="quarantine">Quarantine</option><option value="reject">Reject</option><option value="delete">Delete</option></select></div>
                                <label className="flex items-center"><input type="checkbox" checked={securityForm.data.scan_attachments} onChange={(e) => securityForm.setData('scan_attachments', e.target.checked)} className="rounded border-gray-300 text-indigo-600" /><span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Scan attachments</span></label>
                                <div><InputLabel value="Max Attachment Size (MB)" /><TextInput type="number" value={Math.round(securityForm.data.max_attachment_size / 1048576)} onChange={(e) => securityForm.setData('max_attachment_size', parseInt(e.target.value) * 1048576)} className="mt-1 block w-full" /></div>
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                        <SecondaryButton onClick={() => setShowSecurityModal(false)}>Cancel</SecondaryButton>
                        <PrimaryButton disabled={securityForm.processing}>{securityForm.processing ? 'Saving...' : 'Save Settings'}</PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Quarantine Preview Modal */}
            <Modal show={!!showQuarantinePreview} onClose={() => setShowQuarantinePreview(null)} maxWidth="2xl">
                <div className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Quarantined Message</h2>
                    {showQuarantinePreview && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div><span className="text-gray-500">From:</span> <span className="font-medium">{showQuarantinePreview.from_address}</span></div>
                                <div><span className="text-gray-500">To:</span> <span className="font-medium">{showQuarantinePreview.to_address}</span></div>
                                <div><span className="text-gray-500">Subject:</span> <span className="font-medium">{showQuarantinePreview.subject || '(No subject)'}</span></div>
                                <div><span className="text-gray-500">Reason:</span> <span className={`px-2 py-0.5 text-xs rounded-full ${showQuarantinePreview.reason === 'spam' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{showQuarantinePreview.reason}</span></div>
                                {showQuarantinePreview.spam_score && <div><span className="text-gray-500">Spam Score:</span> <span className="font-medium">{showQuarantinePreview.spam_score}</span></div>}
                                {showQuarantinePreview.virus_name && <div><span className="text-gray-500">Virus:</span> <span className="font-medium text-red-600">{showQuarantinePreview.virus_name}</span></div>}
                            </div>
                        </div>
                    )}
                    <div className="mt-6 flex justify-end space-x-3">
                        {showQuarantinePreview?.reason === 'spam' && <PrimaryButton onClick={() => { handleReleaseQuarantine(showQuarantinePreview.id); setShowQuarantinePreview(null); }}>Release Message</PrimaryButton>}
                        <SecondaryButton onClick={() => setShowQuarantinePreview(null)}>Close</SecondaryButton>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
