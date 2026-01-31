import { useState, useEffect, useRef } from 'react';
import { TbFileText, TbRefresh, TbTrash, TbDownload } from 'react-icons/tb';
import { FaPhp, FaNodeJs } from 'react-icons/fa';
import { SiNginx, SiApache } from 'react-icons/si';
import { toast } from 'react-toastify';
import axios from 'axios';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';

export default function LogsTab({ website }) {
    const [logs, setLogs] = useState([]);
    const [selectedLog, setSelectedLog] = useState(null);
    const [logContent, setLogContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingContent, setLoadingContent] = useState(false);
    const [lines, setLines] = useState(100);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const logContentRef = useRef(null);
    const refreshIntervalRef = useRef(null);

    // Fetch available log files
    const fetchLogs = async () => {
        setLoading(true);
        try {
            const response = await axios.get(route('websites.logs.index', website.id));
            setLogs(response.data.logs);
            // Auto-select first log if none selected
            if (response.data.logs.length > 0 && !selectedLog) {
                setSelectedLog(response.data.logs[0].name);
            }
        } catch (error) {
            toast.error('Failed to fetch log files');
        } finally {
            setLoading(false);
        }
    };

    // Fetch log content
    const fetchLogContent = async (logName = selectedLog) => {
        if (!logName) return;

        setLoadingContent(true);
        try {
            const response = await axios.get(route('websites.logs.content', website.id), {
                params: { log_name: logName, lines }
            });
            setLogContent(response.data.content || response.data.message || 'Log file is empty');

            // Scroll to bottom
            if (logContentRef.current) {
                setTimeout(() => {
                    logContentRef.current.scrollTop = logContentRef.current.scrollHeight;
                }, 100);
            }
        } catch (error) {
            toast.error('Failed to fetch log content');
            setLogContent('Error loading log content');
        } finally {
            setLoadingContent(false);
        }
    };

    // Clear log file
    const clearLog = async () => {
        if (!selectedLog) return;

        try {
            await axios.post(route('websites.logs.clear', website.id), {
                log_name: selectedLog
            });
            toast.success('Log file cleared successfully');
            fetchLogContent();
        } catch (error) {
            toast.error('Failed to clear log file');
        }
    };

    // Download log file
    const downloadLog = () => {
        if (!logContent || !selectedLog) return;

        const blob = new Blob([logContent], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedLog}-${website.url}.log`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    // Get icon for log type
    const getLogIcon = (logName) => {
        if (logName.includes('nginx')) {
            return <SiNginx className="w-4 h-4 text-green-600" />;
        } else if (logName.includes('apache')) {
            return <SiApache className="w-4 h-4 text-red-600" />;
        } else if (logName.includes('php')) {
            return <FaPhp className="w-4 h-4 text-indigo-600" />;
        } else if (logName.includes('pm2')) {
            return <FaNodeJs className="w-4 h-4 text-green-500" />;
        }
        return <TbFileText className="w-4 h-4 text-gray-500" />;
    };

    // Get human-readable log name
    const getLogLabel = (logName) => {
        const labels = {
            'nginx-access': 'Nginx Access',
            'nginx-error': 'Nginx Error',
            'apache-access': 'Apache Access',
            'apache-error': 'Apache Error',
            'php-fpm-error': 'PHP-FPM Error',
            'pm2-out': 'PM2 Output',
            'pm2-error': 'PM2 Error',
        };
        return labels[logName] || logName;
    };

    // Auto-refresh setup
    useEffect(() => {
        if (autoRefresh && selectedLog) {
            refreshIntervalRef.current = setInterval(() => {
                fetchLogContent();
            }, 5000);
        } else {
            if (refreshIntervalRef.current) {
                clearInterval(refreshIntervalRef.current);
            }
        }

        return () => {
            if (refreshIntervalRef.current) {
                clearInterval(refreshIntervalRef.current);
            }
        };
    }, [autoRefresh, selectedLog, lines]);

    // Initial fetch
    useEffect(() => {
        fetchLogs();
    }, []);

    // Fetch content when log or lines change
    useEffect(() => {
        if (selectedLog) {
            fetchLogContent();
        }
    }, [selectedLog, lines]);

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    View and manage log files for this website. Logs are specific to the application type.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Log Files List */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-gray-850 rounded-lg shadow p-4">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                            Log Files
                        </h3>

                        {loading ? (
                            <div className="text-center py-4">
                                <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto"></div>
                            </div>
                        ) : logs.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                                No log files found
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {logs.map((log) => (
                                    <button
                                        key={log.name}
                                        onClick={() => setSelectedLog(log.name)}
                                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center ${
                                            selectedLog === log.name
                                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200'
                                                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                                        }`}
                                    >
                                        <span className="mr-2">{getLogIcon(log.name)}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">
                                                {getLogLabel(log.name)}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {log.size}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        <button
                            onClick={fetchLogs}
                            className="w-full mt-4 text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center justify-center"
                        >
                            <TbRefresh className="w-4 h-4 mr-1" />
                            Refresh List
                        </button>
                    </div>
                </div>

                {/* Log Content */}
                <div className="lg:col-span-3">
                    <div className="bg-white dark:bg-gray-850 rounded-lg shadow">
                        {/* Header */}
                        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center space-x-3">
                                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
                                    {selectedLog && getLogIcon(selectedLog)}
                                    <span className="ml-2">{selectedLog ? getLogLabel(selectedLog) : 'Select a log file'}</span>
                                </h3>
                            </div>

                            <div className="flex items-center space-x-2">
                                {/* Lines selector */}
                                <select
                                    value={lines}
                                    onChange={(e) => setLines(parseInt(e.target.value))}
                                    className="text-sm rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                >
                                    <option value={50}>50 lines</option>
                                    <option value={100}>100 lines</option>
                                    <option value={250}>250 lines</option>
                                    <option value={500}>500 lines</option>
                                    <option value={1000}>1000 lines</option>
                                </select>

                                {/* Auto-refresh toggle */}
                                <label className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                                    <input
                                        type="checkbox"
                                        checked={autoRefresh}
                                        onChange={(e) => setAutoRefresh(e.target.checked)}
                                        className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span>Auto</span>
                                </label>

                                {/* Refresh button */}
                                <SecondaryButton
                                    onClick={() => fetchLogContent()}
                                    disabled={!selectedLog || loadingContent}
                                    className="!py-1.5 !px-3"
                                >
                                    <TbRefresh className={`w-4 h-4 ${loadingContent ? 'animate-spin' : ''}`} />
                                </SecondaryButton>

                                {/* Download button */}
                                <SecondaryButton
                                    onClick={downloadLog}
                                    disabled={!selectedLog || !logContent}
                                    className="!py-1.5 !px-3"
                                    title="Download log"
                                >
                                    <TbDownload className="w-4 h-4" />
                                </SecondaryButton>

                                {/* Clear button */}
                                <SecondaryButton
                                    onClick={clearLog}
                                    disabled={!selectedLog}
                                    className="!py-1.5 !px-3 !text-red-600 !border-red-300 hover:!bg-red-50 dark:!text-red-400 dark:!border-red-600 dark:hover:!bg-red-900/20"
                                    title="Clear log"
                                >
                                    <TbTrash className="w-4 h-4" />
                                </SecondaryButton>
                            </div>
                        </div>

                        {/* Content */}
                        <div
                            ref={logContentRef}
                            className="p-4 h-96 overflow-auto bg-gray-900 dark:bg-gray-950 font-mono text-xs text-gray-300 whitespace-pre-wrap"
                        >
                            {!selectedLog ? (
                                <p className="text-gray-500 text-center py-8">
                                    Select a log file from the list to view its contents
                                </p>
                            ) : loadingContent ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                                    <span className="ml-2 text-gray-400">Loading...</span>
                                </div>
                            ) : (
                                logContent || <span className="text-gray-500">Log file is empty</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
