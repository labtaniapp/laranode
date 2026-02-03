<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Inertia\Inertia;

class TwoFactorController extends Controller
{
    /**
     * Generate a new secret key for 2FA.
     */
    public function enable(Request $request)
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        if ($user->two_factor_enabled) {
            return back()->withErrors(['two_factor' => '2FA is already enabled.']);
        }

        // Generate a new secret
        $secret = $this->generateSecretKey();

        // Store encrypted secret (not confirmed yet)
        $user->two_factor_secret = Crypt::encryptString($secret);
        $user->save();

        // Generate QR code URL
        $qrCodeUrl = $this->getQrCodeUrl($user->email, $secret);

        return response()->json([
            'secret' => $secret,
            'qr_code_url' => $qrCodeUrl,
        ]);
    }

    /**
     * Confirm 2FA setup with a valid code.
     */
    public function confirm(Request $request)
    {
        $request->validate([
            'code' => ['required', 'string', 'size:6'],
        ]);

        $user = $request->user();

        if (!$user->two_factor_secret) {
            return back()->withErrors(['two_factor' => 'Please enable 2FA first.']);
        }

        $secret = Crypt::decryptString($user->two_factor_secret);

        if (!$this->verifyCode($secret, $request->code)) {
            return back()->withErrors(['code' => 'Invalid verification code.']);
        }

        // Generate recovery codes
        $recoveryCodes = $this->generateRecoveryCodes();

        $user->two_factor_enabled = true;
        $user->two_factor_confirmed_at = now();
        $user->two_factor_recovery_codes = Crypt::encryptString(json_encode($recoveryCodes));
        $user->save();

        return response()->json([
            'recovery_codes' => $recoveryCodes,
        ]);
    }

    /**
     * Disable 2FA.
     */
    public function disable(Request $request)
    {
        $request->validate([
            'password' => ['required', 'current_password'],
            'code' => ['required', 'string'],
        ]);

        $user = $request->user();

        if (!$user->two_factor_enabled) {
            return back()->withErrors(['two_factor' => '2FA is not enabled.']);
        }

        // Verify with code or recovery code
        $secret = Crypt::decryptString($user->two_factor_secret);
        $isValidCode = $this->verifyCode($secret, $request->code);
        $isValidRecovery = $this->verifyRecoveryCode($user, $request->code);

        if (!$isValidCode && !$isValidRecovery) {
            return back()->withErrors(['code' => 'Invalid verification code.']);
        }

        $user->two_factor_enabled = false;
        $user->two_factor_secret = null;
        $user->two_factor_recovery_codes = null;
        $user->two_factor_confirmed_at = null;
        $user->save();

        return back()->with('status', '2FA has been disabled.');
    }

    /**
     * Verify 2FA code during login.
     */
    public function verify(Request $request)
    {
        $request->validate([
            'code' => ['required', 'string'],
        ]);

        $userId = session('2fa:user:id');

        if (!$userId) {
            return redirect()->route('login')->withErrors(['email' => 'Session expired. Please login again.']);
        }

        $user = \App\Models\User::find($userId);

        if (!$user) {
            return redirect()->route('login');
        }

        $secret = Crypt::decryptString($user->two_factor_secret);
        $code = $request->code;

        // Check TOTP code
        $isValidCode = $this->verifyCode($secret, $code);

        // Check recovery code if TOTP fails
        $isValidRecovery = false;
        if (!$isValidCode && strlen($code) > 6) {
            $isValidRecovery = $this->verifyRecoveryCode($user, $code);
        }

        if (!$isValidCode && !$isValidRecovery) {
            return back()->withErrors(['code' => 'Invalid verification code.']);
        }

        // Clear 2FA session and log in
        session()->forget('2fa:user:id');
        auth()->login($user, session('2fa:remember', false));
        session()->forget('2fa:remember');
        session()->regenerate();

        return redirect()->intended(route('dashboard'));
    }

    /**
     * Show 2FA challenge page.
     */
    public function challenge()
    {
        if (!session('2fa:user:id')) {
            return redirect()->route('login');
        }

        return Inertia::render('Auth/TwoFactorChallenge');
    }

    /**
     * Regenerate recovery codes.
     */
    public function regenerateRecoveryCodes(Request $request)
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        if (!$user->two_factor_enabled) {
            return back()->withErrors(['two_factor' => '2FA is not enabled.']);
        }

        $recoveryCodes = $this->generateRecoveryCodes();
        $user->two_factor_recovery_codes = Crypt::encryptString(json_encode($recoveryCodes));
        $user->save();

        return response()->json([
            'recovery_codes' => $recoveryCodes,
        ]);
    }

    /**
     * Generate a random secret key (Base32).
     */
    protected function generateSecretKey(): string
    {
        $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $secret = '';
        for ($i = 0; $i < 32; $i++) {
            $secret .= $chars[random_int(0, 31)];
        }
        return $secret;
    }

    /**
     * Generate recovery codes.
     */
    protected function generateRecoveryCodes(): array
    {
        $codes = [];
        for ($i = 0; $i < 8; $i++) {
            $codes[] = strtoupper(Str::random(4) . '-' . Str::random(4));
        }
        return $codes;
    }

    /**
     * Verify a TOTP code.
     */
    protected function verifyCode(string $secret, string $code): bool
    {
        // Allow 1 period before and after for clock drift
        for ($i = -1; $i <= 1; $i++) {
            $calculatedCode = $this->getCode($secret, time() + ($i * 30));
            if (hash_equals($calculatedCode, $code)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Calculate TOTP code.
     */
    protected function getCode(string $secret, ?int $timestamp = null): string
    {
        $timestamp = $timestamp ?? time();
        $timeSlice = floor($timestamp / 30);

        // Decode Base32 secret
        $secretKey = $this->base32Decode($secret);

        // Pack time into binary string
        $time = pack('N*', 0) . pack('N*', $timeSlice);

        // Generate HMAC-SHA1
        $hmac = hash_hmac('sha1', $time, $secretKey, true);

        // Extract 4 bytes from HMAC based on last nibble
        $offset = ord(substr($hmac, -1)) & 0x0F;
        $code = (
            ((ord($hmac[$offset]) & 0x7F) << 24) |
            ((ord($hmac[$offset + 1]) & 0xFF) << 16) |
            ((ord($hmac[$offset + 2]) & 0xFF) << 8) |
            (ord($hmac[$offset + 3]) & 0xFF)
        ) % 1000000;

        return str_pad((string) $code, 6, '0', STR_PAD_LEFT);
    }

    /**
     * Decode Base32 string.
     */
    protected function base32Decode(string $input): string
    {
        $map = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $input = strtoupper($input);
        $input = str_replace('=', '', $input);

        $buffer = 0;
        $bitsLeft = 0;
        $output = '';

        for ($i = 0; $i < strlen($input); $i++) {
            $val = strpos($map, $input[$i]);
            if ($val === false) {
                continue;
            }

            $buffer = ($buffer << 5) | $val;
            $bitsLeft += 5;

            if ($bitsLeft >= 8) {
                $bitsLeft -= 8;
                $output .= chr(($buffer >> $bitsLeft) & 0xFF);
            }
        }

        return $output;
    }

    /**
     * Get QR code URL for authenticator apps.
     */
    protected function getQrCodeUrl(string $email, string $secret): string
    {
        $issuer = config('app.name', 'Laranode');
        $otpauth = sprintf(
            'otpauth://totp/%s:%s?secret=%s&issuer=%s&algorithm=SHA1&digits=6&period=30',
            rawurlencode($issuer),
            rawurlencode($email),
            $secret,
            rawurlencode($issuer)
        );

        // Use Google Charts API for QR code generation
        return 'https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl=' . urlencode($otpauth);
    }

    /**
     * Verify a recovery code.
     */
    protected function verifyRecoveryCode($user, string $code): bool
    {
        if (!$user->two_factor_recovery_codes) {
            return false;
        }

        $codes = json_decode(Crypt::decryptString($user->two_factor_recovery_codes), true);
        $code = strtoupper(str_replace(' ', '', $code));

        $index = array_search($code, $codes);

        if ($index !== false) {
            // Remove used recovery code
            unset($codes[$index]);
            $user->two_factor_recovery_codes = Crypt::encryptString(json_encode(array_values($codes)));
            $user->save();
            return true;
        }

        return false;
    }
}
