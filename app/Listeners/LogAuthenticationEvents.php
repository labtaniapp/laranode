<?php

namespace App\Listeners;

use App\Models\ActivityLog;
use Illuminate\Auth\Events\Failed;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Auth\Events\PasswordReset;

class LogAuthenticationEvents
{
    /**
     * Handle login events.
     */
    public function handleLogin(Login $event): void
    {
        ActivityLog::logAuth(
            ActivityLog::ACTION_LOGIN,
            "User {$event->user->name} logged in",
            $event->user,
            ['guard' => $event->guard]
        );
    }

    /**
     * Handle logout events.
     */
    public function handleLogout(Logout $event): void
    {
        if ($event->user) {
            ActivityLog::logAuth(
                ActivityLog::ACTION_LOGOUT,
                "User {$event->user->name} logged out",
                $event->user
            );
        }
    }

    /**
     * Handle failed login attempts.
     */
    public function handleFailed(Failed $event): void
    {
        ActivityLog::log(
            ActivityLog::ACTION_LOGIN_FAILED,
            ActivityLog::CATEGORY_AUTH,
            "Failed login attempt for {$event->credentials['email']}",
            null,
            ['email' => $event->credentials['email']],
            ActivityLog::SEVERITY_WARNING
        );
    }

    /**
     * Handle lockout events.
     */
    public function handleLockout(Lockout $event): void
    {
        $email = $event->request->input('email');

        ActivityLog::log(
            'lockout',
            ActivityLog::CATEGORY_SECURITY,
            "Account locked out: {$email}",
            null,
            ['email' => $email, 'ip' => $event->request->ip()],
            ActivityLog::SEVERITY_WARNING
        );
    }

    /**
     * Handle password reset events.
     */
    public function handlePasswordReset(PasswordReset $event): void
    {
        ActivityLog::logAuth(
            ActivityLog::ACTION_PASSWORD_CHANGE,
            "Password reset for {$event->user->name}",
            $event->user
        );
    }

    /**
     * Register the listeners for the subscriber.
     */
    public function subscribe($events): array
    {
        return [
            Login::class => 'handleLogin',
            Logout::class => 'handleLogout',
            Failed::class => 'handleFailed',
            Lockout::class => 'handleLockout',
            PasswordReset::class => 'handlePasswordReset',
        ];
    }
}
