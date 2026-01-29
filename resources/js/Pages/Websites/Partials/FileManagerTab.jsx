import { useState, useEffect } from 'react';
import { ImSpinner9 } from "react-icons/im";
import { FaFolderClosed, FaUpload } from "react-icons/fa6";
import { RiFolderReceivedLine } from "react-icons/ri";
import { FileIcon, defaultStyles } from 'react-file-icon';
import { toast } from 'react-toastify';
import Checkbox from '@/Components/Checkbox';
import CreateFile from '@/Pages/Filemanager/Components/CreateFile';
import EditFile from '@/Pages/Filemanager/Components/EditFile';
import DeleteFiles from '@/Pages/Filemanager/Components/DeleteFiles';
import RenameFile from '@/Pages/Filemanager/Components/RenameFile';
import UploadFile from '@/Pages/Filemanager/Components/UploadFile';

import { LuFolderPlus, LuFilePlus2, LuDelete } from "react-icons/lu";
import { MdOutlineDriveFileRenameOutline } from "react-icons/md";
import { IoMdCut } from "react-icons/io";
import { BiPaste } from "react-icons/bi";
import { TbFileTypeZip, TbFolder } from "react-icons/tb";
import { VscFileZip } from "react-icons/vsc";
import { PiSelectionAllBold } from "react-icons/pi";

export default function FileManagerTab({ website }) {
    const basePath = website.base_path;

    const [files, setFiles] = useState([]);
    const [path, setPath] = useState(basePath);
    const [goBack, setGoBack] = useState(false);
    const [spinner, showSpinner] = useState(true);
    const [selectedPaths, setSelectedPaths] = useState([]);
    const [createFileType, setCreateFileType] = useState(false);
    const [editFile, setEditFile] = useState(false);
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);
    const [renameFile, setRenameFile] = useState(false);
    const [showUploadFile, setShowUploadFile] = useState(false);
    const [cutFiles, setCutFiles] = useState(false);

    useEffect(() => {
        cdIntoPath(path);
    }, [editFile]);

    const cdIntoPath = async (newPath) => {
        // Ensure we don't navigate above the website's base path
        if (!newPath.startsWith(basePath)) {
            toast('Cannot navigate outside the website directory', { type: 'error' });
            return;
        }

        setPath(newPath);
        showSpinner(true);

        try {
            const response = await fetch(`/filemanager/get-directory-contents?path=${newPath}`);

            if (!response.ok) {
                const errorData = await response.json();
                const errorMessage = errorData.error || response.statusText;
                toast(errorMessage, { type: 'error' });
                showSpinner(false);
                return;
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
            }

            const json = JSON.parse(buffer.trim());
            setFiles(json.files);

            // Only allow going back if we're not at the base path
            if (json.goBack && json.goBack.startsWith(basePath) && newPath !== basePath) {
                setGoBack(json.goBack);
            } else {
                setGoBack(false);
            }

        } catch (error) {
            toast(error.message, { type: 'error' });
        } finally {
            showSpinner(false);
        }
    };

    const handleFileClick = (file) => {
        setSelectedPaths((prevSelected) =>
            prevSelected.includes(file.path)
                ? prevSelected.filter((p) => p !== file.path)
                : [...prevSelected, file.path]
        );
    };

    const handleDoubleClick = (file) => {
        if (cutFiles && selectedPaths.includes(file.path)) {
            toast('Cannot cut files into a path that already contains them', { type: 'error' });
            return;
        }

        if (file.type === "dir") {
            cdIntoPath(file.path);
        }

        const extension = file.path.split('.').pop();
        const imagesAndVideos = ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mp3', 'webm', 'wav', 'ogg', 'flac', 'mkv', 'mov', 'avi', 'wmv', 'm4v'];

        if (file.type === "file" && !imagesAndVideos.includes(extension)) {
            setEditFile(file.path);
        }
    };

    const selectAll = () => {
        if (selectedPaths.length === files.length) {
            setSelectedPaths([]);
        } else {
            setSelectedPaths(files.map((file) => file.path));
        }
    };

    const pasteFiles = async (pasteFromAction) => {
        window.axios.patch('/filemanager/paste-files', {
            filesToPaste: selectedPaths,
            intoPath: path,
            pasteFromAction
        }).then((response) => {
            setSelectedPaths([]);
            setCutFiles(false);
            cdIntoPath(path);
            toast(response.data.message, { type: 'success' });
        }).catch((error) => {
            if (error?.response?.data?.error) {
                toast(error.response.data.error, { type: 'error' });
            } else {
                toast(error.message, { type: 'error' });
            }
        });
    };

    const formatBytes = (bytes, decimals = 2) => {
        if (bytes === 0) return "0 B";
        const sizes = ["B", "KB", "MB", "GB", "TB"];
        const factor = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${parseFloat((bytes / Math.pow(1024, factor)).toFixed(decimals))} ${sizes[factor]}`;
    };

    const getRelativePath = (fullPath) => {
        return fullPath.replace(basePath, '') || '/';
    };

    if (spinner) {
        return (
            <div className="bg-white dark:bg-gray-850 rounded-lg shadow p-6">
                <div className="flex items-center space-x-2">
                    <ImSpinner9 className="animate-spin w-5 h-5" />
                    <span className="text-gray-600 dark:text-gray-400 text-sm">Loading files...</span>
                </div>
            </div>
        );
    }

    return (
        <div>
            {/* Toolbar */}
            <div className="mb-4 flex flex-wrap items-center gap-2 text-gray-600 dark:text-gray-300 text-sm font-medium">
                <button onClick={() => setShowUploadFile(true)} className="flex items-center px-3 py-2 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-700 dark:bg-indigo-900 dark:hover:bg-indigo-800 dark:text-indigo-300 transition-colors">
                    <FaUpload className="mr-1 w-4 h-4" />
                    Upload
                </button>

                <button onClick={() => setCreateFileType('directory')} className="flex items-center px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors">
                    <LuFolderPlus className="mr-1 w-4 h-4" />
                    Directory
                </button>

                <button onClick={() => setCreateFileType('file')} className="flex items-center px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors">
                    <LuFilePlus2 className="mr-1 w-4 h-4" />
                    File
                </button>

                <button onClick={() => selectAll()} className="flex items-center px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors">
                    <PiSelectionAllBold className="mr-1 w-4 h-4" />
                    {selectedPaths.length === files.length ? 'Deselect' : 'Select All'}
                </button>

                <button
                    onClick={() => setRenameFile(true)}
                    className="flex items-center px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={selectedPaths.length !== 1}
                >
                    <MdOutlineDriveFileRenameOutline className="mr-1 w-4 h-4" />
                    Rename
                </button>

                {!cutFiles ? (
                    <button
                        onClick={() => setCutFiles(true)}
                        className="flex items-center px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={selectedPaths.length === 0}
                    >
                        <IoMdCut className="mr-1 w-4 h-4" />
                        Cut
                    </button>
                ) : (
                    <button
                        onClick={() => setCutFiles(false)}
                        className="flex items-center px-3 py-2 rounded-lg bg-yellow-100 hover:bg-yellow-200 text-yellow-700 dark:bg-yellow-900 dark:hover:bg-yellow-800 dark:text-yellow-300 transition-colors"
                    >
                        <IoMdCut className="mr-1 w-4 h-4" />
                        Cancel
                    </button>
                )}

                {cutFiles && (
                    <button
                        onClick={() => pasteFiles('cut')}
                        className="flex items-center px-3 py-2 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 dark:bg-green-900 dark:hover:bg-green-800 dark:text-green-300 transition-colors"
                    >
                        <BiPaste className="mr-1 w-4 h-4" />
                        Paste
                    </button>
                )}

                <button
                    onClick={() => setShowConfirmDelete(true)}
                    className="flex items-center px-3 py-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900 dark:hover:bg-red-800 dark:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={selectedPaths.length === 0}
                >
                    <LuDelete className="mr-1 w-4 h-4" />
                    Delete
                </button>
            </div>

            {/* Breadcrumb / Path */}
            <div className="mb-4 flex items-center gap-2 text-sm">
                {goBack && (
                    <button
                        onClick={() => cdIntoPath(goBack)}
                        className="flex items-center px-3 py-2 rounded-lg bg-white dark:bg-gray-850 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <RiFolderReceivedLine className="mr-1 w-4 h-4 text-gray-500" />
                        Back
                    </button>
                )}
                <div className="flex items-center px-3 py-2 rounded-lg bg-white dark:bg-gray-850 text-gray-700 dark:text-gray-300">
                    <TbFolder className="mr-2 w-4 h-4 text-indigo-500" />
                    <span className="font-mono text-xs">{getRelativePath(path) || '/'}</span>
                </div>
            </div>

            {/* Files List */}
            <div className="bg-white dark:bg-gray-850 rounded-lg shadow overflow-hidden">
                {files.length === 0 ? (
                    <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                        <TbFolder className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                        This directory is empty
                    </div>
                ) : (
                    files
                        .filter(file => !file.path.includes('laranode-scripts'))
                        .sort((a, b) => {
                            if (a.type === 'dir' && b.type !== 'dir') return -1;
                            if (a.type !== 'dir' && b.type === 'dir') return 1;
                            return 0;
                        })
                        .map((file, index) => (
                            <div
                                key={`file-${index}`}
                                className={`flex items-center py-3 px-4 border-b dark:border-gray-700 last:border-b-0 cursor-pointer transition-colors ${
                                    selectedPaths.includes(file.path)
                                        ? 'bg-indigo-50 dark:bg-indigo-900/30'
                                        : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}
                                onDoubleClick={() => handleDoubleClick(file)}
                            >
                                <div className="mr-3">
                                    <Checkbox
                                        checked={selectedPaths.includes(file.path)}
                                        onChange={() => handleFileClick(file)}
                                    />
                                </div>

                                <div className="mr-3">
                                    {file.type === "dir" ? (
                                        <FaFolderClosed className={`w-5 h-5 ${selectedPaths.includes(file.path) ? 'text-indigo-500' : 'text-gray-400'}`} />
                                    ) : (
                                        <div className="w-5 h-5">
                                            <FileIcon
                                                extension={file.path.split('.').pop()}
                                                {...defaultStyles[file.path.split('.').pop()]}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className={`flex-grow text-sm font-medium text-gray-900 dark:text-gray-100 ${selectedPaths.includes(file.path) && cutFiles ? 'text-gray-400 dark:text-gray-500' : ''}`}>
                                    {file.path.split('/').pop()}
                                    {selectedPaths.includes(file.path) && cutFiles && <IoMdCut className="inline ml-2 w-4 h-4" />}
                                </div>

                                <div className="text-xs text-gray-400 dark:text-gray-500">
                                    {typeof file.file_size === "undefined" ? "--" : formatBytes(file.file_size)}
                                </div>
                            </div>
                        ))
                )}
            </div>

            {/* Modals */}
            <CreateFile
                path={path}
                fileType={createFileType}
                setCreateFileType={setCreateFileType}
                refreshFiles={cdIntoPath}
            />

            <EditFile
                editFile={editFile}
                setEditFile={setEditFile}
            />

            <DeleteFiles
                files={selectedPaths}
                setSelectedPaths={setSelectedPaths}
                showConfirmDelete={showConfirmDelete}
                setShowConfirmDelete={setShowConfirmDelete}
                refreshFiles={cdIntoPath}
                path={path}
            />

            <RenameFile
                selectedFile={selectedPaths.length === 1 ? selectedPaths[0] : null}
                setSelectedPaths={setSelectedPaths}
                renameFile={renameFile}
                setRenameFile={setRenameFile}
                refreshFiles={cdIntoPath}
                path={path}
            />

            <UploadFile
                showUploadFile={showUploadFile}
                setShowUploadFile={setShowUploadFile}
                refreshFiles={cdIntoPath}
                path={path}
            />
        </div>
    );
}
