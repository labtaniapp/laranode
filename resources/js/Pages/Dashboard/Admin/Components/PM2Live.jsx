import { FaArrowUpShortWide, FaMicrochip, FaRotate } from "react-icons/fa6";
import { DiNodejsSmall } from "react-icons/di";
import { LuMemoryStick } from "react-icons/lu";
import { MdOutlineCircle } from "react-icons/md";

const PM2Live = ({ pm2Stats }) => {

    if (!pm2Stats || Object.keys(pm2Stats).length === 0) {
        return (
            <div className="mt-2 text-gray-500 dark:text-gray-400 text-sm">
                No PM2 processes running
            </div>
        );
    }

    const getStatusColor = (status) => {
        switch (status) {
            case 'online':
                return 'text-green-500';
            case 'stopping':
            case 'launching':
                return 'text-yellow-500';
            case 'errored':
            case 'stopped':
                return 'text-red-500';
            default:
                return 'text-gray-500';
        }
    };

    return (<>
        {Object.entries(pm2Stats).map(([processName, stats]) => (
            <div className="mt-2" key={processName}>
                <div className="flex items-center space-x-2">
                    <div>
                        <DiNodejsSmall className="text-green-600 w-5 h-5 flex-shrink-0" />
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 text-lg truncate" title={processName}>
                        {processName}
                    </div>
                    <MdOutlineCircle className={`w-3 h-3 flex-shrink-0 ${getStatusColor(stats?.status)}`} />
                </div>

                <div className="mt-2.5 flex flex-col justify-center space-y-2 text-sm bg-white dark:bg-gray-850 text-gray-900 dark:text-gray-300 rounded-lg shadow py-3 px-6">
                    <div className="flex items-center">
                        <LuMemoryStick className="text-teal-500 w-3 h-3 flex-shrink-0 mr-1" />
                        {stats?.memory ? stats.memory : '--'}
                    </div>
                    <div className="flex items-center">
                        <FaMicrochip className="text-indigo-500 w-3 h-3 flex-shrink-0 mr-1" />
                        {stats?.cpu ? stats.cpu : '--'}
                    </div>
                    <div className="flex items-center">
                        <FaArrowUpShortWide className="text-lime-500 dark:text-lime-200 w-3 h-3 flex-shrink-0 mr-1" />
                        {stats?.uptime ? stats.uptime : '--'}
                    </div>
                    <div className="flex items-center">
                        <FaRotate className="text-orange-500 w-3 h-3 flex-shrink-0 mr-1" />
                        {stats?.restarts !== undefined ? `${stats.restarts} restarts` : '--'}
                    </div>
                </div>

            </div>
        ))
        }
    </>
    );
}

export default PM2Live;
