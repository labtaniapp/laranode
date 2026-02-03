import { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import { TbShieldLock, TbKey } from 'react-icons/tb';
import GuestLayout from '@/Layouts/GuestLayout';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';

export default function TwoFactorChallenge() {
    const [useRecoveryCode, setUseRecoveryCode] = useState(false);

    const { data, setData, post, processing, errors } = useForm({
        code: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('two-factor.verify'));
    };

    return (
        <GuestLayout>
            <Head title="Two-Factor Authentication" />

            <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 mb-4">
                    <TbShieldLock className="w-8 h-8 text-indigo-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    Two-Factor Authentication
                </h2>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {useRecoveryCode
                        ? 'Enter one of your recovery codes to access your account.'
                        : 'Enter the 6-digit code from your authenticator app.'}
                </p>
            </div>

            <form onSubmit={submit}>
                <div>
                    <InputLabel
                        htmlFor="code"
                        value={useRecoveryCode ? 'Recovery Code' : 'Authentication Code'}
                    />

                    <TextInput
                        id="code"
                        type="text"
                        name="code"
                        value={data.code}
                        className="mt-1 block w-full text-center text-2xl tracking-widest"
                        autoComplete="one-time-code"
                        autoFocus
                        placeholder={useRecoveryCode ? 'XXXX-XXXX' : '000000'}
                        maxLength={useRecoveryCode ? 9 : 6}
                        onChange={(e) => {
                            let value = e.target.value;
                            if (!useRecoveryCode) {
                                // Only allow digits for TOTP
                                value = value.replace(/\D/g, '');
                            }
                            setData('code', value);
                        }}
                    />

                    <InputError message={errors.code} className="mt-2" />
                </div>

                <div className="mt-6">
                    <PrimaryButton className="w-full justify-center" disabled={processing}>
                        {processing ? 'Verifying...' : 'Verify'}
                    </PrimaryButton>
                </div>

                <div className="mt-4 text-center">
                    <button
                        type="button"
                        className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                        onClick={() => {
                            setUseRecoveryCode(!useRecoveryCode);
                            setData('code', '');
                        }}
                    >
                        {useRecoveryCode ? (
                            <>
                                <TbShieldLock className="inline w-4 h-4 mr-1" />
                                Use authentication code
                            </>
                        ) : (
                            <>
                                <TbKey className="inline w-4 h-4 mr-1" />
                                Use recovery code
                            </>
                        )}
                    </button>
                </div>
            </form>
        </GuestLayout>
    );
}
