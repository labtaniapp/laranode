import { useState, useEffect } from 'react';
import { useForm, router } from '@inertiajs/react';
import { MdLock, MdLockOpen, MdRefresh, MdWarning, MdCheckCircle, MdError, MdSchedule } from 'react-icons/md';
import { TbCertificate, TbShieldCheck, TbShieldOff, TbCalendar, TbExternalLink } from 'react-icons/tb';
import { toast } from 'react-toastify';
import PrimaryButton from '@/Components/PrimaryButton';
import DangerButton from '@/Components/DangerButton';

export default function SSLTab({ website }) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [isRemoving, setIsRemoving] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [sslStatus, setSslStatus] = useState({
        ssl_enabled: website.ssl_enabled,
        ssl_status: website.ssl_status,
        ssl_expires_at: website.ssl_expires_at,
        ssl_generated_at: website.ssl_generated_at,
    });

    const refreshStatus = async () => {
        setIsRefreshing(true);
        try {
            const response = await fetch(route('websites.ssl.status', website.id));
            const data = await response.json();
            if (data.success) {
                setSslStatus({
                    ssl_enabled: data.ssl_enabled,
                    ssl_status: data.ssl_status,
                    ssl_expires_at: data.ssl_expires_at || website.ssl_expires_at,
                    ssl_generated_at: data.ssl_generated_at || website.ssl_generated_at,
                });
            }
        } catch (error) {
            console.error('Failed to refresh SSL status:', error);
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleGenerateSSL = () => {
        if (!confirm('Generate SSL certificate for ' + website.url + '? This may take a few moments.')) {
            return;
        }

        setIsGenerating(true);
        router.post(route('websites.ssl.toggle', website.id), {
            enabled: true
        }, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('SSL certificate generated successfully');
                setSslStatus(prev => ({ ...prev, ssl_enabled: true, ssl_status: 'active' }));
            },
            onError: (errors) => {
                toast.error(errors.message || 'Failed to generate SSL certificate');
            },
            onFinish: () => {
                setIsGenerating(false);
            }
        });
    };

    const handleRemoveSSL = () => {
        if (!confirm('Remove SSL certificate from ' + website.url + '? The site will only be accessible via HTTP.')) {
            return;
        }

        setIsRemoving(true);
        router.post(route('websites.ssl.toggle', website.id), {
            enabled: false
        }, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('SSL certificate removed successfully');
                setSslStatus(prev => ({ ...prev, ssl_enabled: false, ssl_status: 'inactive' }));
            },
            onError: (errors) => {
                toast.error(errors.message || 'Failed to remove SSL certificate');
            },
            onFinish: () => {
                setIsRemoving(false);
            }
        });
    };

    const handleRenewSSL = () => {
        if (!confirm('Renew SSL certificate for ' + website.url + '?')) {
            return;
        }

        setIsGenerating(true);
        router.post(route('websites.ssl.toggle', website.id), {
            enabled: true
        }, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('SSL certificate renewed successfully');
                setSslStatus(prev => ({ ...prev, ssl_status: 'active' }));
            },
            onError: (errors) => {
                toast.error(errors.message || 'Failed to renew SSL certificate');
            },
            onFinish: () => {
                setIsGenerating(false);
            }
        });
    };

    const getStatusIcon = () => {
        switch (sslStatus.ssl_status) {
            case 'active':
                return <MdCheckCircle className="w-6 h-6 text-green-500" />;
            case 'expired':
                return <MdError className="w-6 h-6 text-red-500" />;
            case 'pending':
                return <MdSchedule className="w-6 h-6 text-yellow-500" />;
            default:
                return <MdLockOpen className="w-6 h-6 text-gray-400" />;
        }
    };

    const getStatusBadge = () => {
        const statusConfig = {
            active: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-800 dark:text-green-200', label: 'Active' },
            expired: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-800 dark:text-red-200', label: 'Expired' },
            pending: { bg: 'bg-yellow-100 dark:bg-yellow-900', text: 'text-yellow-800 dark:text-yellow-200', label: 'Pending' },
            inactive: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-800 dark:text-gray-200', label: 'Inactive' },
        };

        const config = statusConfig[sslStatus.ssl_status] || statusConfig.inactive;

        return (
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
                {config.label}
            </span>
        );
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getDaysUntilExpiry = () => {
        if (!sslStatus.ssl_expires_at) return null;
        const expiryDate = new Date(sslStatus.ssl_expires_at);
        const now = new Date();
        const diffTime = expiryDate - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const daysUntilExpiry = getDaysUntilExpiry();
    const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0;
    const isExpired = daysUntilExpiry !== null && daysUntilExpiry <= 0;

    return (
        <div className="space-y-6">
            {/* SSL Status Overview */}
            <div className="bg-white dark:bg-gray-850 rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
                        <TbCertificate className="w-5 h-5 mr-2 text-indigo-500" />
                        SSL Certificate
                    </h3>
                    <button
                        onClick={refreshStatus}
                        disabled={isRefreshing}
                        className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center disabled:opacity-50"
                    >
                        <MdRefresh className={`w-4 h-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                        Refresh Status
                    </button>
                </div>

                {/* Status Card */}
                <div className={`rounded-lg p-6 ${sslStatus.ssl_enabled ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            {sslStatus.ssl_enabled ? (
                                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                                    <TbShieldCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
                                </div>
                            ) : (
                                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                    <TbShieldOff className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                                </div>
                            )}
                            <div className="ml-4">
                                <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                    {sslStatus.ssl_enabled ? 'SSL is Enabled' : 'SSL is Not Enabled'}
                                </h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {sslStatus.ssl_enabled
                                        ? `Your site is secured with HTTPS (${website.url})`
                                        : 'Your site is only accessible via HTTP'}
                                </p>
                            </div>
                        </div>
                        {getStatusBadge()}
                    </div>

                    {/* SSL Details (when enabled) */}
                    {sslStatus.ssl_enabled && (
                        <div className="mt-6 pt-6 border-t border-green-200 dark:border-green-800 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Generated</p>
                                <p className="mt-1 text-sm text-gray-900 dark:text-gray-100 flex items-center">
                                    <TbCalendar className="w-4 h-4 mr-1 text-gray-400" />
                                    {formatDate(sslStatus.ssl_generated_at)}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Expires</p>
                                <p className={`mt-1 text-sm flex items-center ${isExpired ? 'text-red-600 dark:text-red-400' : isExpiringSoon ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-900 dark:text-gray-100'}`}>
                                    <TbCalendar className="w-4 h-4 mr-1 text-gray-400" />
                                    {formatDate(sslStatus.ssl_expires_at)}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Issuer</p>
                                <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                                    Let's Encrypt
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Expiry Warning */}
                    {sslStatus.ssl_enabled && isExpiringSoon && !isExpired && (
                        <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg border border-yellow-200 dark:border-yellow-800 flex items-start">
                            <MdWarning className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-3 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                                    Certificate expiring soon
                                </p>
                                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                                    Your SSL certificate will expire in {daysUntilExpiry} days. Consider renewing it now to avoid any service interruption.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Expired Warning */}
                    {sslStatus.ssl_enabled && isExpired && (
                        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-800 flex items-start">
                            <MdError className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 mr-3 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                                    Certificate has expired
                                </p>
                                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                                    Your SSL certificate has expired. Visitors may see security warnings. Please renew your certificate immediately.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="mt-6 flex flex-wrap gap-3">
                    {!sslStatus.ssl_enabled ? (
                        <PrimaryButton
                            onClick={handleGenerateSSL}
                            disabled={isGenerating}
                        >
                            <MdLock className="w-4 h-4 mr-2" />
                            {isGenerating ? 'Generating...' : 'Generate SSL Certificate'}
                        </PrimaryButton>
                    ) : (
                        <>
                            <PrimaryButton
                                onClick={handleRenewSSL}
                                disabled={isGenerating}
                            >
                                <MdRefresh className="w-4 h-4 mr-2" />
                                {isGenerating ? 'Renewing...' : 'Renew Certificate'}
                            </PrimaryButton>
                            <DangerButton
                                onClick={handleRemoveSSL}
                                disabled={isRemoving}
                            >
                                <MdLockOpen className="w-4 h-4 mr-2" />
                                {isRemoving ? 'Removing...' : 'Remove SSL'}
                            </DangerButton>
                        </>
                    )}
                </div>
            </div>

            {/* SSL Information */}
            <div className="bg-white dark:bg-gray-850 rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                    About SSL Certificates
                </h3>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">What is SSL?</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                SSL (Secure Sockets Layer) encrypts data transferred between your website and visitors,
                                protecting sensitive information and building trust with your users.
                            </p>
                        </div>
                        <div>
                            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Benefits</h4>
                            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                <li className="flex items-center">
                                    <MdCheckCircle className="w-4 h-4 text-green-500 mr-2" />
                                    Encrypted data transfer
                                </li>
                                <li className="flex items-center">
                                    <MdCheckCircle className="w-4 h-4 text-green-500 mr-2" />
                                    Better SEO ranking
                                </li>
                                <li className="flex items-center">
                                    <MdCheckCircle className="w-4 h-4 text-green-500 mr-2" />
                                    Browser trust indicators
                                </li>
                                <li className="flex items-center">
                                    <MdCheckCircle className="w-4 h-4 text-green-500 mr-2" />
                                    PCI compliance requirement
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Auto-Renewal Info */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start">
                    <TbCertificate className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                            Automatic Renewal
                        </p>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                            SSL certificates are automatically renewed before expiration. Let's Encrypt certificates
                            are valid for 90 days and will be renewed automatically when they have less than 30 days remaining.
                        </p>
                    </div>
                </div>
            </div>

            {/* Quick Links */}
            {sslStatus.ssl_enabled && (
                <div className="bg-white dark:bg-gray-850 rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                        Quick Links
                    </h3>
                    <div className="flex flex-wrap gap-3">
                        <a
                            href={`https://${website.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors"
                        >
                            <TbExternalLink className="w-4 h-4 mr-2" />
                            Visit Site (HTTPS)
                        </a>
                        <a
                            href={`https://www.ssllabs.com/ssltest/analyze.html?d=${website.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors"
                        >
                            <TbShieldCheck className="w-4 h-4 mr-2" />
                            Test SSL Security
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}
