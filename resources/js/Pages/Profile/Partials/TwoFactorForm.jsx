import { useState } from 'react';
import { useForm, usePage } from '@inertiajs/react';
import { TbShieldLock, TbShieldCheck, TbShieldX, TbCopy, TbCheck, TbRefresh } from 'react-icons/tb';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import DangerButton from '@/Components/DangerButton';
import Modal from '@/Components/Modal';
import { toast } from 'react-toastify';

export default function TwoFactorForm({ className = '' }) {
    const { auth } = usePage().props;
    const user = auth.user;

    const [enabling, setEnabling] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [disabling, setDisabling] = useState(false);
    const [showingRecoveryCodes, setShowingRecoveryCodes] = useState(false);
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [secret, setSecret] = useState('');
    const [recoveryCodes, setRecoveryCodes] = useState([]);
    const [copied, setCopied] = useState(false);

    const enableForm = useForm({
        password: '',
    });

    const confirmForm = useForm({
        code: '',
    });

    const disableForm = useForm({
        password: '',
        code: '',
    });

    const enable2FA = (e) => {
        e.preventDefault();

        fetch(route('two-factor.enable'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
            },
            body: JSON.stringify({ password: enableForm.data.password }),
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.secret) {
                    setSecret(data.secret);
                    setQrCodeUrl(data.qr_code_url);
                    setEnabling(false);
                    setConfirming(true);
                    enableForm.reset();
                } else if (data.errors) {
                    enableForm.setError(data.errors);
                }
            })
            .catch(() => {
                toast.error('Failed to enable 2FA');
            });
    };

    const confirm2FA = (e) => {
        e.preventDefault();

        fetch(route('two-factor.confirm'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
            },
            body: JSON.stringify({ code: confirmForm.data.code }),
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.recovery_codes) {
                    setRecoveryCodes(data.recovery_codes);
                    setConfirming(false);
                    setShowingRecoveryCodes(true);
                    confirmForm.reset();
                    toast.success('Two-factor authentication enabled!');
                } else if (data.errors) {
                    confirmForm.setError(data.errors);
                }
            })
            .catch(() => {
                toast.error('Invalid verification code');
            });
    };

    const disable2FA = (e) => {
        e.preventDefault();

        fetch(route('two-factor.disable'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
            },
            body: JSON.stringify(disableForm.data),
        })
            .then((res) => {
                if (res.ok) {
                    setDisabling(false);
                    disableForm.reset();
                    toast.success('Two-factor authentication disabled');
                    window.location.reload();
                } else {
                    return res.json().then((data) => {
                        if (data.errors) {
                            disableForm.setError(data.errors);
                        }
                    });
                }
            })
            .catch(() => {
                toast.error('Failed to disable 2FA');
            });
    };

    const regenerateRecoveryCodes = () => {
        fetch(route('two-factor.recovery-codes'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
            },
            body: JSON.stringify({ password: '' }),
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.recovery_codes) {
                    setRecoveryCodes(data.recovery_codes);
                    setShowingRecoveryCodes(true);
                    toast.success('Recovery codes regenerated');
                }
            })
            .catch(() => {
                toast.error('Failed to regenerate recovery codes');
            });
    };

    const copyRecoveryCodes = () => {
        navigator.clipboard.writeText(recoveryCodes.join('\n'));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const finishSetup = () => {
        setShowingRecoveryCodes(false);
        window.location.reload();
    };

    return (
        <section className={className}>
            <header>
                <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
                    <TbShieldLock className="mr-2 w-5 h-5" />
                    Two-Factor Authentication
                </h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Add an extra layer of security to your account using two-factor authentication.
                </p>
            </header>

            <div className="mt-6">
                {user.two_factor_enabled ? (
                    <div className="space-y-4">
                        <div className="flex items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                            <TbShieldCheck className="w-6 h-6 text-green-600 mr-3" />
                            <div>
                                <p className="font-medium text-green-900 dark:text-green-100">
                                    Two-factor authentication is enabled
                                </p>
                                <p className="text-sm text-green-700 dark:text-green-300">
                                    Your account is protected with an authenticator app.
                                </p>
                            </div>
                        </div>

                        <div className="flex space-x-3">
                            <SecondaryButton onClick={regenerateRecoveryCodes}>
                                <TbRefresh className="mr-2 w-4 h-4" />
                                Regenerate Recovery Codes
                            </SecondaryButton>
                            <DangerButton onClick={() => setDisabling(true)}>
                                <TbShieldX className="mr-2 w-4 h-4" />
                                Disable 2FA
                            </DangerButton>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                            <TbShieldX className="w-6 h-6 text-yellow-600 mr-3" />
                            <div>
                                <p className="font-medium text-yellow-900 dark:text-yellow-100">
                                    Two-factor authentication is not enabled
                                </p>
                                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                    Enable 2FA to add an extra layer of security.
                                </p>
                            </div>
                        </div>

                        <PrimaryButton onClick={() => setEnabling(true)}>
                            <TbShieldLock className="mr-2 w-4 h-4" />
                            Enable Two-Factor Authentication
                        </PrimaryButton>
                    </div>
                )}
            </div>

            {/* Enable 2FA Modal - Password Confirmation */}
            <Modal show={enabling} onClose={() => setEnabling(false)} maxWidth="md">
                <form onSubmit={enable2FA} className="p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                        Enable Two-Factor Authentication
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Please confirm your password to continue.
                    </p>

                    <div>
                        <InputLabel htmlFor="enable_password" value="Password" />
                        <TextInput
                            id="enable_password"
                            type="password"
                            className="mt-1 block w-full"
                            value={enableForm.data.password}
                            onChange={(e) => enableForm.setData('password', e.target.value)}
                            autoFocus
                        />
                        <InputError message={enableForm.errors.password} className="mt-2" />
                    </div>

                    <div className="mt-6 flex justify-end space-x-3">
                        <SecondaryButton onClick={() => setEnabling(false)}>Cancel</SecondaryButton>
                        <PrimaryButton type="submit" disabled={enableForm.processing}>
                            Continue
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Confirm 2FA Modal - QR Code & Verification */}
            <Modal show={confirming} onClose={() => setConfirming(false)} maxWidth="lg">
                <form onSubmit={confirm2FA} className="p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                        Scan QR Code
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Scan the QR code below with your authenticator app (Google Authenticator, Authy, etc.)
                    </p>

                    <div className="flex flex-col items-center mb-6">
                        {qrCodeUrl && (
                            <img src={qrCodeUrl} alt="2FA QR Code" className="w-48 h-48 border rounded" />
                        )}
                        <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded text-center">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                Or enter this code manually:
                            </p>
                            <code className="text-sm font-mono font-bold text-gray-900 dark:text-gray-100 select-all">
                                {secret}
                            </code>
                        </div>
                    </div>

                    <div>
                        <InputLabel htmlFor="confirm_code" value="Verification Code" />
                        <TextInput
                            id="confirm_code"
                            type="text"
                            className="mt-1 block w-full text-center text-2xl tracking-widest"
                            value={confirmForm.data.code}
                            onChange={(e) => confirmForm.setData('code', e.target.value.replace(/\D/g, ''))}
                            maxLength={6}
                            placeholder="000000"
                            autoComplete="one-time-code"
                        />
                        <InputError message={confirmForm.errors.code} className="mt-2" />
                    </div>

                    <div className="mt-6 flex justify-end space-x-3">
                        <SecondaryButton onClick={() => setConfirming(false)}>Cancel</SecondaryButton>
                        <PrimaryButton type="submit" disabled={confirmForm.processing}>
                            Verify & Enable
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Recovery Codes Modal */}
            <Modal show={showingRecoveryCodes} onClose={() => {}} maxWidth="md">
                <div className="p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                        Recovery Codes
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Store these recovery codes in a safe place. They can be used to access your account if you lose your authenticator device.
                    </p>

                    <div className="bg-gray-100 dark:bg-gray-800 rounded p-4 mb-4">
                        <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                            {recoveryCodes.map((code, index) => (
                                <div key={index} className="p-2 bg-white dark:bg-gray-900 rounded text-center">
                                    {code}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-between">
                        <SecondaryButton onClick={copyRecoveryCodes}>
                            {copied ? (
                                <>
                                    <TbCheck className="mr-2 w-4 h-4 text-green-500" />
                                    Copied!
                                </>
                            ) : (
                                <>
                                    <TbCopy className="mr-2 w-4 h-4" />
                                    Copy Codes
                                </>
                            )}
                        </SecondaryButton>
                        <PrimaryButton onClick={finishSetup}>Done</PrimaryButton>
                    </div>
                </div>
            </Modal>

            {/* Disable 2FA Modal */}
            <Modal show={disabling} onClose={() => setDisabling(false)} maxWidth="md">
                <form onSubmit={disable2FA} className="p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                        Disable Two-Factor Authentication
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Enter your password and a verification code to disable 2FA.
                    </p>

                    <div className="space-y-4">
                        <div>
                            <InputLabel htmlFor="disable_password" value="Password" />
                            <TextInput
                                id="disable_password"
                                type="password"
                                className="mt-1 block w-full"
                                value={disableForm.data.password}
                                onChange={(e) => disableForm.setData('password', e.target.value)}
                            />
                            <InputError message={disableForm.errors.password} className="mt-2" />
                        </div>

                        <div>
                            <InputLabel htmlFor="disable_code" value="Verification Code" />
                            <TextInput
                                id="disable_code"
                                type="text"
                                className="mt-1 block w-full"
                                value={disableForm.data.code}
                                onChange={(e) => disableForm.setData('code', e.target.value)}
                                placeholder="Enter code or recovery code"
                            />
                            <InputError message={disableForm.errors.code} className="mt-2" />
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end space-x-3">
                        <SecondaryButton onClick={() => setDisabling(false)}>Cancel</SecondaryButton>
                        <DangerButton type="submit" disabled={disableForm.processing}>
                            Disable 2FA
                        </DangerButton>
                    </div>
                </form>
            </Modal>
        </section>
    );
}
