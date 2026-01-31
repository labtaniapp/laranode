import { useState, useEffect } from 'react';
import { TbServer } from 'react-icons/tb';
import { MdOutlineCircle } from 'react-icons/md';

const SupervisorLive = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = async () => {
        try {
            const response = await fetch('/workers/stats');
            const data = await response.json();
            setStats(data);
        } catch (error) {
            console.error('Failed to fetch supervisor stats');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 10000); // Refresh every 10 seconds
        return () => clearInterval(interval);
    }, []);

    const getStatusColor = (status) => {
        switch (status) {
            case 'running':
                return 'text-green-500';
            case 'starting':
            case 'stopping':
                return 'text-yellow-500';
            case 'fatal':
                return 'text-red-500';
            case 'stopped':
                return 'text-gray-500';
            default:
                return 'text-gray-500';
        }
    };

    if (loading) {
        return (
            <div className="mt-2 text-gray-500 dark:text-gray-400 text-sm">
                Loading supervisor stats...
            </div>
        );
    }

    if (!stats || stats.total === 0) {
        return (
            <div className="mt-2 text-gray-500 dark:text-gray-400 text-sm">
                No supervisor workers configured
            </div>
        );
    }

    return (
        <div className="mt-2">
            <div className="flex items-center space-x-2 mb-2">
                <TbServer className="text-purple-600 w-5 h-5 flex-shrink-0" />
                <div className="text-gray-600 dark:text-gray-400 text-lg">
                    Supervisor Workers
                </div>
            </div>

            <div className="bg-white dark:bg-gray-850 text-gray-900 dark:text-gray-300 rounded-lg shadow py-3 px-6">
                {/* Summary */}
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-sm text-gray-500">Total Workers</span>
                    <div className="flex items-center space-x-3 text-sm">
                        <span className="flex items-center">
                            <MdOutlineCircle className="w-2 h-2 text-green-500 mr-1" />
                            {stats.running}
                        </span>
                        <span className="flex items-center">
                            <MdOutlineCircle className="w-2 h-2 text-gray-500 mr-1" />
                            {stats.stopped}
                        </span>
                        {stats.fatal > 0 && (
                            <span className="flex items-center">
                                <MdOutlineCircle className="w-2 h-2 text-red-500 mr-1" />
                                {stats.fatal}
                            </span>
                        )}
                    </div>
                </div>

                {/* Worker List */}
                <div className="space-y-2">
                    {stats.workers.map((worker, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                            <span className="truncate max-w-[150px]" title={worker.name}>
                                {worker.name}
                            </span>
                            <MdOutlineCircle className={`w-3 h-3 flex-shrink-0 ${getStatusColor(worker.status)}`} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SupervisorLive;
