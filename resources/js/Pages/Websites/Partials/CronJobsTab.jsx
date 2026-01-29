import { useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import { TbClock, TbPlus, TbEdit, TbTrash } from 'react-icons/tb';
import { FaToggleOn, FaToggleOff } from 'react-icons/fa';
import { toast } from 'react-toastify';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';
import ConfirmationButton from '@/Components/ConfirmationButton';

export default function CronJobsTab({ website, cronJobs, templates }) {
    const [showModal, setShowModal] = useState(false);
    const [editingJob, setEditingJob] = useState(null);
    const [selectedTemplate, setSelectedTemplate] = useState('custom');

    const { data, setData, post, patch, processing, errors, reset, clearErrors } = useForm({
        name: '',
        minute: '*',
        hour: '*',
        day: '*',
        month: '*',
        weekday: '*',
        command: '',
    });

    const openCreateModal = () => {
        setEditingJob(null);
        reset();
        setSelectedTemplate('custom');
        setShowModal(true);
    };

    const openEditModal = (job) => {
        setEditingJob(job);
        setData({
            name: job.name || '',
            minute: job.minute,
            hour: job.hour,
            day: job.day,
            month: job.month,
            weekday: job.weekday,
            command: job.command,
        });
        // Try to match template
        const matchedTemplate = templates.find(t =>
            t.minute === job.minute &&
            t.hour === job.hour &&
            t.day === job.day &&
            t.month === job.month &&
            t.weekday === job.weekday
        );
        setSelectedTemplate(matchedTemplate?.value || 'custom');
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingJob(null);
        clearErrors();
        reset();
    };

    const handleTemplateChange = (templateValue) => {
        setSelectedTemplate(templateValue);
        const template = templates.find(t => t.value === templateValue);
        if (template) {
            setData({
                ...data,
                minute: template.minute,
                hour: template.hour,
                day: template.day,
                month: template.month,
                weekday: template.weekday,
            });
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (editingJob) {
            patch(route('websites.cron-jobs.update', [website.id, editingJob.id]), {
                onSuccess: () => {
                    closeModal();
                    toast.success('Cron job updated successfully');
                },
            });
        } else {
            post(route('websites.cron-jobs.store', website.id), {
                onSuccess: () => {
                    closeModal();
                    toast.success('Cron job created successfully');
                },
            });
        }
    };

    const handleDelete = (job) => {
        router.delete(route('websites.cron-jobs.destroy', [website.id, job.id]), {
            onSuccess: () => {
                toast.success('Cron job deleted');
            },
        });
    };

    const handleToggle = (job) => {
        router.post(route('websites.cron-jobs.toggle', [website.id, job.id]), {}, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(job.is_active ? 'Cron job deactivated' : 'Cron job activated');
            },
        });
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Manage scheduled tasks (cron jobs) for this website. Jobs run under the website owner's user account.
                </p>
                <PrimaryButton onClick={openCreateModal}>
                    <TbPlus className="mr-2 w-4 h-4" />
                    Add Cron Job
                </PrimaryButton>
            </div>

            {/* Cron Jobs List */}
            <div className="relative overflow-x-auto bg-white dark:bg-gray-850 rounded-lg shadow">
                <table className="w-full text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-gray-700 uppercase bg-gray-200 dark:bg-gray-700 dark:text-gray-300 text-sm">
                        <tr>
                            <th className="px-6 py-3">Schedule</th>
                            <th className="px-6 py-3">Command</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {cronJobs.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                    <TbClock className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                                    No cron jobs configured. Click "Add Cron Job" to create one.
                                </td>
                            </tr>
                        ) : (
                            cronJobs.map((job) => (
                                <tr key={job.id} className="bg-white border-b dark:bg-gray-850 dark:border-gray-700">
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-gray-100">
                                                {job.name || 'Unnamed Job'}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                                {job.minute} {job.hour} {job.day} {job.month} {job.weekday}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded break-all">
                                            {job.command}
                                        </code>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => handleToggle(job)}
                                            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                                job.is_active
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                            }`}
                                        >
                                            {job.is_active ? (
                                                <><FaToggleOn className="w-4 h-4 mr-1" /> Active</>
                                            ) : (
                                                <><FaToggleOff className="w-4 h-4 mr-1" /> Inactive</>
                                            )}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => openEditModal(job)}
                                                className="p-2 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-600 dark:bg-blue-900 dark:hover:bg-blue-800 dark:text-blue-300 transition-colors"
                                                title="Edit"
                                            >
                                                <TbEdit className="w-4 h-4" />
                                            </button>
                                            <ConfirmationButton doAction={() => handleDelete(job)}>
                                                <button
                                                    className="p-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 dark:bg-red-900 dark:hover:bg-red-800 dark:text-red-300 transition-colors"
                                                    title="Delete"
                                                >
                                                    <TbTrash className="w-4 h-4" />
                                                </button>
                                            </ConfirmationButton>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create/Edit Modal */}
            <Modal show={showModal} onClose={closeModal} maxWidth="2xl">
                <form onSubmit={handleSubmit} className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
                        <TbClock className="mr-2" />
                        {editingJob ? 'Edit Cron Job' : 'Add Cron Job'}
                    </h2>

                    <div className="mt-6 space-y-4">
                        {/* Name */}
                        <div>
                            <InputLabel htmlFor="name" value="Name (optional)" />
                            <TextInput
                                id="name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                className="mt-1 block w-full"
                                placeholder="Backup database, Clear cache, etc."
                            />
                            <InputError message={errors.name} className="mt-2" />
                        </div>

                        {/* Template Dropdown */}
                        <div>
                            <InputLabel htmlFor="template" value="Schedule Template" />
                            <select
                                id="template"
                                value={selectedTemplate}
                                onChange={(e) => handleTemplateChange(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white sm:text-sm"
                            >
                                {templates.map((template) => (
                                    <option key={template.value} value={template.value}>
                                        {template.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Cron Fields */}
                        <div className="grid grid-cols-5 gap-3">
                            <div>
                                <InputLabel htmlFor="minute" value="Minute" />
                                <TextInput
                                    id="minute"
                                    value={data.minute}
                                    onChange={(e) => setData('minute', e.target.value)}
                                    className="mt-1 block w-full text-center font-mono"
                                    placeholder="*"
                                />
                                <p className="text-xs text-gray-500 text-center mt-1">0-59</p>
                                <InputError message={errors.minute} className="mt-1" />
                            </div>
                            <div>
                                <InputLabel htmlFor="hour" value="Hour" />
                                <TextInput
                                    id="hour"
                                    value={data.hour}
                                    onChange={(e) => setData('hour', e.target.value)}
                                    className="mt-1 block w-full text-center font-mono"
                                    placeholder="*"
                                />
                                <p className="text-xs text-gray-500 text-center mt-1">0-23</p>
                                <InputError message={errors.hour} className="mt-1" />
                            </div>
                            <div>
                                <InputLabel htmlFor="day" value="Day" />
                                <TextInput
                                    id="day"
                                    value={data.day}
                                    onChange={(e) => setData('day', e.target.value)}
                                    className="mt-1 block w-full text-center font-mono"
                                    placeholder="*"
                                />
                                <p className="text-xs text-gray-500 text-center mt-1">1-31</p>
                                <InputError message={errors.day} className="mt-1" />
                            </div>
                            <div>
                                <InputLabel htmlFor="month" value="Month" />
                                <TextInput
                                    id="month"
                                    value={data.month}
                                    onChange={(e) => setData('month', e.target.value)}
                                    className="mt-1 block w-full text-center font-mono"
                                    placeholder="*"
                                />
                                <p className="text-xs text-gray-500 text-center mt-1">1-12</p>
                                <InputError message={errors.month} className="mt-1" />
                            </div>
                            <div>
                                <InputLabel htmlFor="weekday" value="Weekday" />
                                <TextInput
                                    id="weekday"
                                    value={data.weekday}
                                    onChange={(e) => setData('weekday', e.target.value)}
                                    className="mt-1 block w-full text-center font-mono"
                                    placeholder="*"
                                />
                                <p className="text-xs text-gray-500 text-center mt-1">0-6</p>
                                <InputError message={errors.weekday} className="mt-1" />
                            </div>
                        </div>

                        {/* Preview */}
                        <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Cron Expression:</p>
                            <code className="text-sm font-mono text-gray-900 dark:text-gray-100">
                                {data.minute} {data.hour} {data.day} {data.month} {data.weekday}
                            </code>
                        </div>

                        {/* Command */}
                        <div>
                            <InputLabel htmlFor="command" value="Command" />
                            <textarea
                                id="command"
                                value={data.command}
                                onChange={(e) => setData('command', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white sm:text-sm font-mono"
                                rows="3"
                                placeholder="/usr/bin/php8.2 /home/user/domains/example.com/public/script.php"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Use full paths for executables and scripts
                            </p>
                            <InputError message={errors.command} className="mt-2" />
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end space-x-3">
                        <SecondaryButton onClick={closeModal} disabled={processing}>
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton disabled={processing || !data.command}>
                            {processing ? 'Saving...' : (editingJob ? 'Update' : 'Create')}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
