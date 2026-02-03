import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { TbSettings, TbWorld, TbClock, TbBug, TbCheck, TbX, TbRefresh, TbDownload } from 'react-icons/tb';
import { FaLaravel, FaPhp } from 'react-icons/fa';
import { toast } from 'react-toastify';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';
import UpdatePanel from '@/Components/UpdatePanel';

export default function SettingsIndex({ settings }) {
    const [activeTab, setActiveTab] = useState('settings');
    const [timezones, setTimezones] = useState({});
    const [loadingTimezones, setLoadingTimezones] = useState(true);
    const [testingUrl, setTestingUrl] = useState(false);
    const [urlTestResult, setUrlTestResult] = useState(null);

    const { data, setData, patch, processing, errors, isDirty } = useForm({
        app_name: settings.app_name || 'LaraNode',
        app_url: settings.app_url || '',
        app_timezone: settings.app_timezone || 'UTC',
        app_debug: settings.app_debug || false,
    });

    useEffect(() => {
        fetch(route('settings.timezones'))
            .then(response => response.json())
            .then(data => {
                setTimezones(data);
                setLoadingTimezones(false);
            })
            .catch(() => {
                toast.error('Failed to load timezones');
                setLoadingTimezones(false);
            });
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        patch(route('settings.update'), {
            onSuccess: () => {
                toast.success('Settings updated successfully');
            },
            onError: () => {
                toast.error('Failed to update settings');
            },
        });
    };

    const testUrl = async () => {
        setTestingUrl(true);
        setUrlTestResult(null);

        try {
            const response = await fetch(route('settings.test-url') + '?url=' + encodeURIComponent(data.app_url));
            const result = await response.json();
            setUrlTestResult(result);
        } catch (error) {
            setUrlTestResult({ success: false, message: 'Failed to test URL' });
        } finally {
            setTestingUrl(false);
        }
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center max-w-7xl pr-5">
                    <TbSettings className="mr-2 w-6 h-6" />
                    <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">
                        Settings
                    </h2>
                </div>
            }
        >
            <Head title="Settings" />

            <div className="max-w-4xl px-4 my-8">
                {/* Tabs */}
                <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
                    <nav className="flex space-x-8">
                        <button
                            onClick={() => setActiveTab('settings')}
                            className={`flex items-center py-4 px-1 text-sm font-medium border-b-2 -mb-px transition-colors ${
                                activeTab === 'settings'
                                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'
                            }`}
                        >
                            <TbSettings className="w-5 h-5 mr-2" />
                            Settings
                        </button>
                        <button
                            onClick={() => setActiveTab('updates')}
                            className={`flex items-center py-4 px-1 text-sm font-medium border-b-2 -mb-px transition-colors ${
                                activeTab === 'updates'
                                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'
                            }`}
                        >
                            <TbDownload className="w-5 h-5 mr-2" />
                            Updates
                        </button>
                    </nav>
                </div>

                {/* Settings Tab */}
                {activeTab === 'settings' && (
                    <>
                        {/* System Info */}
                <div className="bg-white dark:bg-gray-850 rounded-lg shadow p-6 mb-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                        System Information
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-1">
                                <FaLaravel className="mr-2 text-red-500" />
                                Laravel
                            </div>
                            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                {settings.laravel_version}
                            </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-1">
                                <FaPhp className="mr-2 text-indigo-500" />
                                PHP
                            </div>
                            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                {settings.php_version}
                            </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-1">
                                <TbWorld className="mr-2 text-blue-500" />
                                Reverb Host
                            </div>
                            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate" title={settings.reverb_host}>
                                {settings.reverb_host || 'Not set'}
                            </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-1">
                                <TbClock className="mr-2 text-green-500" />
                                Timezone
                            </div>
                            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                {settings.app_timezone}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Settings Form */}
                <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-850 rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-6">
                        Application Settings
                    </h3>

                    <div className="space-y-6">
                        {/* App Name */}
                        <div>
                            <InputLabel htmlFor="app_name" value="Application Name" />
                            <TextInput
                                id="app_name"
                                value={data.app_name}
                                onChange={(e) => setData('app_name', e.target.value)}
                                className="mt-1 block w-full"
                                placeholder="LaraNode"
                            />
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                The name displayed in the browser tab and throughout the application.
                            </p>
                            <InputError message={errors.app_name} className="mt-2" />
                        </div>

                        {/* App URL */}
                        <div>
                            <InputLabel htmlFor="app_url" value="Panel URL" />
                            <div className="mt-1 flex space-x-2">
                                <TextInput
                                    id="app_url"
                                    value={data.app_url}
                                    onChange={(e) => {
                                        setData('app_url', e.target.value);
                                        setUrlTestResult(null);
                                    }}
                                    className="block w-full"
                                    placeholder="https://panel.example.com"
                                />
                                <SecondaryButton
                                    type="button"
                                    onClick={testUrl}
                                    disabled={testingUrl || !data.app_url}
                                    className="!px-4"
                                >
                                    {testingUrl ? (
                                        <TbRefresh className="w-5 h-5 animate-spin" />
                                    ) : (
                                        'Test'
                                    )}
                                </SecondaryButton>
                            </div>
                            {urlTestResult && (
                                <div className={`mt-2 flex items-center text-sm ${urlTestResult.success ? 'text-green-600' : 'text-red-600'}`}>
                                    {urlTestResult.success ? (
                                        <TbCheck className="w-4 h-4 mr-1" />
                                    ) : (
                                        <TbX className="w-4 h-4 mr-1" />
                                    )}
                                    {urlTestResult.message}
                                </div>
                            )}
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                The URL where your panel is accessible. Make sure DNS is configured before changing.
                            </p>
                            <InputError message={errors.app_url} className="mt-2" />
                        </div>

                        {/* Timezone */}
                        <div>
                            <InputLabel htmlFor="app_timezone" value="Timezone" />
                            <select
                                id="app_timezone"
                                value={data.app_timezone}
                                onChange={(e) => setData('app_timezone', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white sm:text-sm"
                                disabled={loadingTimezones}
                            >
                                {loadingTimezones ? (
                                    <option>Loading timezones...</option>
                                ) : (
                                    Object.entries(timezones).map(([region, zones]) => (
                                        <optgroup key={region} label={region}>
                                            {zones.map((zone) => (
                                                <option key={zone.value} value={zone.value}>
                                                    {zone.label}
                                                </option>
                                            ))}
                                        </optgroup>
                                    ))
                                )}
                            </select>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                The default timezone for displaying dates and times.
                            </p>
                            <InputError message={errors.app_timezone} className="mt-2" />
                        </div>

                        {/* Debug Mode */}
                        <div>
                            <div className="flex items-center">
                                <input
                                    id="app_debug"
                                    type="checkbox"
                                    checked={data.app_debug}
                                    onChange={(e) => setData('app_debug', e.target.checked)}
                                    className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800"
                                />
                                <InputLabel htmlFor="app_debug" value="Debug Mode" className="ml-2 !mb-0" />
                                <TbBug className="ml-2 text-orange-500" />
                            </div>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                Enable detailed error messages. <strong className="text-red-500">Keep disabled in production!</strong>
                            </p>
                            <InputError message={errors.app_debug} className="mt-2" />
                        </div>
                    </div>

                    {/* Warning */}
                    {isDirty && data.app_url !== settings.app_url && (
                        <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                            <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                <strong>Warning:</strong> Changing the Panel URL will trigger an asset rebuild.
                                The WebSocket connection may be temporarily interrupted. Make sure DNS is properly configured
                                before saving.
                            </p>
                        </div>
                    )}

                    {/* Submit */}
                    <div className="mt-6 flex justify-end">
                        <PrimaryButton disabled={processing || !isDirty}>
                            {processing ? 'Saving...' : 'Save Settings'}
                        </PrimaryButton>
                    </div>
                </form>
                    </>
                )}

                {/* Updates Tab */}
                {activeTab === 'updates' && (
                    <UpdatePanel />
                )}
            </div>
        </AuthenticatedLayout>
    );
}
