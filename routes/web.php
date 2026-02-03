<?php

use App\Http\Controllers\AccountsController;
use App\Http\Controllers\AdminerController;
use App\Http\Controllers\Auth\ForcePasswordChangeController;
use App\Http\Controllers\BackupController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DatabaseController;
use App\Http\Controllers\FilemanagerController;
use App\Http\Controllers\FirewallController;
use App\Http\Controllers\GitDeploymentController;
use App\Http\Controllers\SupervisorController;
use App\Http\Controllers\MysqlController;
use App\Http\Controllers\PHPManagerController;
use App\Http\Controllers\RuntimeManagerController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\StatsHistoryController;
use App\Http\Controllers\WebsiteController;
use App\Http\Controllers\EmailController;
use App\Http\Controllers\UpdateController;
use App\Http\Controllers\TwoFactorController;
use App\Http\Controllers\ActivityLogController;
use App\Http\Controllers\IpRestrictionController;
use App\Http\Middleware\AdminMiddleware;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return redirect('/dashboard');
});

// Force Password Change
Route::middleware(['auth'])->group(function () {
    Route::get('/password/change', [ForcePasswordChangeController::class, 'show'])->name('password.force-change');
    Route::post('/password/change', [ForcePasswordChangeController::class, 'update'])->name('password.force-change.update');
});

// Two-Factor Authentication
Route::prefix('two-factor')->group(function () {
    // Challenge page (no auth - user is in 2FA limbo)
    Route::get('/challenge', [TwoFactorController::class, 'challenge'])->name('two-factor.challenge');
    Route::post('/verify', [TwoFactorController::class, 'verify'])->name('two-factor.verify');

    // 2FA management (requires full auth)
    Route::middleware(['auth'])->group(function () {
        Route::post('/enable', [TwoFactorController::class, 'enable'])->name('two-factor.enable');
        Route::post('/confirm', [TwoFactorController::class, 'confirm'])->name('two-factor.confirm');
        Route::post('/disable', [TwoFactorController::class, 'disable'])->name('two-factor.disable');
        Route::post('/recovery-codes', [TwoFactorController::class, 'regenerateRecoveryCodes'])->name('two-factor.recovery-codes');
    });
});

// Dashboards [Admin | User]
Route::get('/dashboard', [DashboardController::class, 'index'])->middleware(['auth'])->name('dashboard');
Route::get('/dashboard/admin', [DashboardController::class, 'admin'])->middleware(['auth', AdminMiddleware::class])->name('dashboard.admin');
Route::get('/dashboard/admin/get/top-sort', [DashboardController::class, 'getTopSort'])->middleware(['auth', AdminMiddleware::class])->name('dashboard.admin.getTopSort');
Route::patch('/dashboard/admin/set/top-sort', [DashboardController::class, 'setTopSort'])->middleware(['auth', AdminMiddleware::class])->name('dashboard.admin.setTopSort');
Route::get('/dashboard/user', [DashboardController::class, 'user'])->middleware(['auth'])->name('dashboard.user');


// Accounts [Admin]
Route::resource('/accounts', AccountsController::class)->middleware(['auth', AdminMiddleware::class])->except(['create', 'edit', 'show']);
Route::get('/accounts/impersonate/{user}', [AccountsController::class, 'impersonate'])->middleware(['auth', AdminMiddleware::class])->name('accounts.impersonate');
Route::get('/accounts/leave-impersonation', [AccountsController::class, 'leaveImpersonation'])->middleware(['auth'])->name('accounts.leaveImpersonation');

// Websites [Admin | User]
Route::resource('/websites', WebsiteController::class)->middleware(['auth'])->except(['create', 'edit']);
Route::post('/websites/{website}/ssl/toggle', [WebsiteController::class, 'toggleSsl'])->middleware(['auth'])->name('websites.ssl.toggle');
Route::get('/websites/{website}/ssl/status', [WebsiteController::class, 'checkSslStatus'])->middleware(['auth'])->name('websites.ssl.status');
Route::patch('/websites/{website}/settings', [WebsiteController::class, 'updateSettings'])->middleware(['auth'])->name('websites.settings.update');

// Cron Jobs [Admin | User]
Route::middleware(['auth'])->prefix('websites/{website}/cron-jobs')->group(function () {
    Route::get('/', [WebsiteController::class, 'getCronJobs'])->name('websites.cron-jobs.index');
    Route::post('/', [WebsiteController::class, 'storeCronJob'])->name('websites.cron-jobs.store');
    Route::patch('/{cronJob}', [WebsiteController::class, 'updateCronJob'])->name('websites.cron-jobs.update');
    Route::delete('/{cronJob}', [WebsiteController::class, 'destroyCronJob'])->name('websites.cron-jobs.destroy');
    Route::post('/{cronJob}/toggle', [WebsiteController::class, 'toggleCronJob'])->name('websites.cron-jobs.toggle');
});

// Logs [Admin | User]
Route::middleware(['auth'])->prefix('websites/{website}/logs')->group(function () {
    Route::get('/', [WebsiteController::class, 'getLogFiles'])->name('websites.logs.index');
    Route::get('/content', [WebsiteController::class, 'getLogContent'])->name('websites.logs.content');
    Route::post('/clear', [WebsiteController::class, 'clearLog'])->name('websites.logs.clear');
});

// PHP FPM Pools [Admin | User]
Route::get('/php', [PHPManagerController::class, 'index'])->middleware(['auth', AdminMiddleware::class])->name('php.index');
Route::get('/php/get-versions', [PHPManagerController::class, 'getVersions'])->middleware(['auth'])->name('php.get-versions');
Route::get('/php/list', [PHPManagerController::class, 'list'])->middleware(['auth', AdminMiddleware::class])->name('php.list');
Route::post('/php/install', [PHPManagerController::class, 'install'])->middleware(['auth', AdminMiddleware::class])->name('php.install');
Route::delete('/php/uninstall', [PHPManagerController::class, 'uninstall'])->middleware(['auth', AdminMiddleware::class])->name('php.uninstall');
Route::post('/php/service/toggle', [PHPManagerController::class, 'toggleService'])->middleware(['auth', AdminMiddleware::class])->name('php.service.toggle');
Route::post('/php/service/restart', [PHPManagerController::class, 'restartService'])->middleware(['auth', AdminMiddleware::class])->name('php.service.restart');

// Runtime Manager [Admin] - Unified PHP & Node.js management
Route::middleware(['auth', AdminMiddleware::class])->prefix('runtimes')->group(function () {
    Route::get('/', [RuntimeManagerController::class, 'index'])->name('runtimes.index');
    Route::get('/versions', [RuntimeManagerController::class, 'getVersions'])->withoutMiddleware(AdminMiddleware::class)->name('runtimes.versions');

    // PHP routes
    Route::get('/php/list', [RuntimeManagerController::class, 'listPhp'])->name('runtimes.php.list');
    Route::post('/php/install', [RuntimeManagerController::class, 'installPhp'])->name('runtimes.php.install');
    Route::delete('/php/uninstall', [RuntimeManagerController::class, 'uninstallPhp'])->name('runtimes.php.uninstall');
    Route::post('/php/toggle', [RuntimeManagerController::class, 'togglePhpService'])->name('runtimes.php.toggle');
    Route::post('/php/restart', [RuntimeManagerController::class, 'restartPhpService'])->name('runtimes.php.restart');

    // Node.js routes
    Route::get('/node/list', [RuntimeManagerController::class, 'listNode'])->name('runtimes.node.list');
    Route::post('/node/install', [RuntimeManagerController::class, 'installNode'])->name('runtimes.node.install');
    Route::delete('/node/uninstall', [RuntimeManagerController::class, 'uninstallNode'])->name('runtimes.node.uninstall');
    Route::post('/node/default', [RuntimeManagerController::class, 'setDefaultNode'])->name('runtimes.node.default');

    // PM2 routes
    Route::get('/pm2/list', [RuntimeManagerController::class, 'listPm2'])->name('runtimes.pm2.list');
    Route::post('/pm2/restart', [RuntimeManagerController::class, 'restartPm2'])->name('runtimes.pm2.restart');

    // Available versions management (Admin UI to add/remove available versions)
    Route::get('/available', [RuntimeManagerController::class, 'getAvailableVersions'])->name('runtimes.available.index');
    Route::post('/available', [RuntimeManagerController::class, 'storeAvailableVersion'])->name('runtimes.available.store');
    Route::patch('/available', [RuntimeManagerController::class, 'updateAvailableVersion'])->name('runtimes.available.update');
    Route::delete('/available', [RuntimeManagerController::class, 'destroyAvailableVersion'])->name('runtimes.available.destroy');
});

// MySQL management (legacy routes - kept for backward compatibility)
Route::get('/mysql', [MysqlController::class, 'index'])->middleware(['auth'])->name('mysql.index');
Route::get('/mysql/charsets-collations', [MysqlController::class, 'getCharsetsAndCollations'])->middleware(['auth'])->name('mysql.charsets-collations');
Route::post('/mysql', [MysqlController::class, 'store'])->middleware(['auth'])->name('mysql.store');
Route::patch('/mysql', [MysqlController::class, 'update'])->middleware(['auth'])->name('mysql.update');
Route::delete('/mysql', [MysqlController::class, 'destroy'])->middleware(['auth'])->name('mysql.destroy');

// Database management [Admin | User] - New unified controller for all database drivers
Route::middleware(['auth'])->group(function () {
    Route::get('/databases', [DatabaseController::class, 'index'])->name('databases.index');
    Route::get('/databases/charsets-collations', [DatabaseController::class, 'getCharsetsAndCollations'])->name('databases.charsets-collations');
    Route::get('/databases/test-connection', [DatabaseController::class, 'testConnection'])->name('databases.test-connection');
    Route::post('/databases', [DatabaseController::class, 'store'])->name('databases.store');
    Route::patch('/databases', [DatabaseController::class, 'update'])->name('databases.update');
    Route::delete('/databases', [DatabaseController::class, 'destroy'])->name('databases.destroy');
});

// Adminer - Database Client [Admin | User]
Route::middleware(['auth'])->group(function () {
    Route::get('/adminer/connect/{database}', [AdminerController::class, 'connect'])->name('adminer.connect');
    Route::get('/adminer/launch', [AdminerController::class, 'launch'])->name('adminer.launch');
    Route::get('/adminer/disconnect', [AdminerController::class, 'disconnect'])->name('adminer.disconnect');
});

// Firewall [Admin]
Route::middleware(['auth', AdminMiddleware::class])->group(function () {
    Route::get('/admin/firewall', [FirewallController::class, 'index'])->name('firewall.index');
    Route::post('/admin/firewall/toggle', [FirewallController::class, 'toggle'])->name('firewall.toggle');
    Route::post('/admin/firewall/rules', [FirewallController::class, 'store'])->name('firewall.store');
    Route::delete('/admin/firewall/rules/{id}', [FirewallController::class, 'destroy'])->name('firewall.destroy');
});

// Filemanager [Admin | User]
Route::get('/filemanager', [FilemanagerController::class, 'index'])->middleware(['auth'])->name('filemanager');
Route::get('/filemanager/get-directory-contents', [FilemanagerController::class, 'getDirectoryContents'])->middleware(['auth'])->name('filemanager.getDirectorContents');
Route::get('/filemanager/get-file-contents', [FilemanagerController::class, 'getFileContents'])->middleware(['auth'])->name('filemanager.getFileContents');
Route::patch('/filemanager/update-file-contents', [FilemanagerController::class, 'updateFileContents'])->middleware(['auth'])->name('filemanager.updateFileContents');
Route::post('/filemanager/create-file', [FilemanagerController::class, 'createFile'])->middleware(['auth'])->name('filemanager.createFile');
Route::patch('/filemanager/rename-file', [FilemanagerController::class, 'renameFile'])->middleware(['auth'])->name('filemanager.renameFile');
Route::patch('/filemanager/paste-files', [FilemanagerController::class, 'pasteFiles'])->middleware(['auth'])->name('filemanager.pasteFiles');
Route::post('/filemanager/delete-files', [FilemanagerController::class, 'deleteFiles'])->middleware(['auth'])->name('filemanager.deleteFiles');
Route::post('/filemanager/upload-file', [FilemanagerController::class, 'uploadFile'])->middleware(['auth'])->name('filemanager.uploadFile');

// Backups [Admin | User]
Route::middleware(['auth'])->prefix('backups')->group(function () {
    Route::get('/', [BackupController::class, 'index'])->name('backups.index');
    Route::post('/', [BackupController::class, 'store'])->name('backups.store');
    Route::get('/{backup}/download', [BackupController::class, 'download'])->name('backups.download');
    Route::post('/{backup}/restore', [BackupController::class, 'restore'])->name('backups.restore');
    Route::delete('/{backup}', [BackupController::class, 'destroy'])->name('backups.destroy');
    Route::get('/{backup}/status', [BackupController::class, 'status'])->name('backups.status');
    Route::patch('/settings', [BackupController::class, 'updateSettings'])->name('backups.settings');
    Route::post('/test-s3', [BackupController::class, 'testS3'])->name('backups.test-s3');
});

// Git Deployment [Admin | User]
Route::middleware(['auth'])->prefix('git')->group(function () {
    Route::get('/', [GitDeploymentController::class, 'index'])->name('git.index');
    Route::post('/connect', [GitDeploymentController::class, 'connect'])->name('git.connect');
    Route::patch('/{repository}', [GitDeploymentController::class, 'update'])->name('git.update');
    Route::delete('/{repository}', [GitDeploymentController::class, 'disconnect'])->name('git.disconnect');
    Route::post('/{repository}/deploy', [GitDeploymentController::class, 'deploy'])->name('git.deploy');
    Route::get('/{repository}/history', [GitDeploymentController::class, 'history'])->name('git.history');
    Route::post('/{repository}/regenerate-webhook', [GitDeploymentController::class, 'regenerateWebhook'])->name('git.regenerate-webhook');
    Route::get('/deployments/{deployment}/logs', [GitDeploymentController::class, 'logs'])->name('git.logs');
    Route::post('/deployments/{deployment}/rollback', [GitDeploymentController::class, 'rollback'])->name('git.rollback');
    Route::get('/deploy-script', [GitDeploymentController::class, 'getDeployScript'])->name('git.deploy-script');
});

// Git Webhook (Public - no auth required)
Route::post('/git/webhook/{repository}/{secret}', [GitDeploymentController::class, 'webhook'])->name('git.webhook');

// Supervisor Workers [Admin | User]
Route::middleware(['auth'])->prefix('websites/{website}/workers')->group(function () {
    Route::get('/', [SupervisorController::class, 'index'])->name('websites.workers.index');
    Route::post('/', [SupervisorController::class, 'store'])->name('websites.workers.store');
    Route::patch('/{worker}', [SupervisorController::class, 'update'])->name('websites.workers.update');
    Route::delete('/{worker}', [SupervisorController::class, 'destroy'])->name('websites.workers.destroy');
    Route::post('/{worker}/start', [SupervisorController::class, 'start'])->name('websites.workers.start');
    Route::post('/{worker}/stop', [SupervisorController::class, 'stop'])->name('websites.workers.stop');
    Route::post('/{worker}/restart', [SupervisorController::class, 'restart'])->name('websites.workers.restart');
    Route::get('/{worker}/logs', [SupervisorController::class, 'logs'])->name('websites.workers.logs');
});
Route::get('/workers/presets', [SupervisorController::class, 'presets'])->middleware(['auth'])->name('workers.presets');
Route::get('/workers/stats', [SupervisorController::class, 'stats'])->middleware(['auth'])->name('workers.stats');

// Email [Admin | User]
Route::middleware(['auth'])->prefix('websites/{website}/email')->group(function () {
    Route::get('/', [EmailController::class, 'index'])->name('websites.email.index');
    Route::post('/enable', [EmailController::class, 'enableDomain'])->name('websites.email.enable');
    Route::post('/disable', [EmailController::class, 'disableDomain'])->name('websites.email.disable');
    Route::post('/regenerate-dkim', [EmailController::class, 'regenerateDkim'])->name('websites.email.regenerate-dkim');
});

// Email Accounts
Route::middleware(['auth'])->group(function () {
    Route::post('/websites/{website}/email/accounts', [EmailController::class, 'createAccount'])->name('websites.email.accounts.store');
    Route::patch('/email/accounts/{account}', [EmailController::class, 'updateAccount'])->name('websites.email.accounts.update');
    Route::delete('/email/accounts/{account}', [EmailController::class, 'deleteAccount'])->name('websites.email.accounts.destroy');
});

// Email Aliases
Route::middleware(['auth'])->group(function () {
    Route::post('/websites/{website}/email/aliases', [EmailController::class, 'createAlias'])->name('websites.email.aliases.store');
    Route::delete('/email/aliases/{alias}', [EmailController::class, 'deleteAlias'])->name('websites.email.aliases.destroy');
});

// Email Relay Settings
Route::middleware(['auth'])->prefix('email/relay')->group(function () {
    Route::get('/', [EmailController::class, 'getRelaySettings'])->name('email.relay.index');
    Route::patch('/', [EmailController::class, 'updateRelaySettings'])->name('email.relay.update');
    Route::post('/test', [EmailController::class, 'testRelay'])->name('email.relay.test');
});

// Email Statistics & Logs
Route::middleware(['auth'])->group(function () {
    Route::get('/websites/{website}/email/stats', [EmailController::class, 'getStats'])->name('websites.email.stats');
    Route::get('/websites/{website}/email/logs', [EmailController::class, 'getLogs'])->name('websites.email.logs');
});

// Email Security Settings (Spam/Antivirus)
Route::middleware(['auth'])->prefix('websites/{website}/email/security')->group(function () {
    Route::get('/', [EmailController::class, 'getSecuritySettings'])->name('websites.email.security.index');
    Route::patch('/', [EmailController::class, 'updateSecuritySettings'])->name('websites.email.security.update');
    Route::post('/whitelist', [EmailController::class, 'addToWhitelist'])->name('websites.email.security.whitelist.add');
    Route::delete('/whitelist', [EmailController::class, 'removeFromWhitelist'])->name('websites.email.security.whitelist.remove');
    Route::post('/blacklist', [EmailController::class, 'addToBlacklist'])->name('websites.email.security.blacklist.add');
    Route::delete('/blacklist', [EmailController::class, 'removeFromBlacklist'])->name('websites.email.security.blacklist.remove');
    Route::post('/train', [EmailController::class, 'trainSpam'])->name('websites.email.security.train');
});

// Email Quarantine
Route::middleware(['auth'])->group(function () {
    Route::get('/websites/{website}/email/quarantine', [EmailController::class, 'getQuarantine'])->name('websites.email.quarantine.index');
    Route::post('/email/quarantine/{quarantine}/release', [EmailController::class, 'releaseQuarantine'])->name('email.quarantine.release');
    Route::delete('/email/quarantine/{quarantine}', [EmailController::class, 'deleteQuarantine'])->name('email.quarantine.destroy');
    Route::get('/email/quarantine/{quarantine}/preview', [EmailController::class, 'previewQuarantine'])->name('email.quarantine.preview');
});

// Webmail Settings [Admin]
Route::middleware(['auth', AdminMiddleware::class])->prefix('admin/webmail')->group(function () {
    Route::get('/', [EmailController::class, 'getWebmailSettings'])->name('webmail.settings.index');
    Route::patch('/', [EmailController::class, 'updateWebmailSettings'])->name('webmail.settings.update');
});

// Webmail URL for domain
Route::get('/websites/{website}/email/webmail-url', [EmailController::class, 'getWebmailUrl'])->middleware(['auth'])->name('websites.email.webmail-url');

// Stats History [Admin]
Route::get('/stats/history', [StatsHistoryController::class, 'cpuAndMemory'])->middleware(['auth', AdminMiddleware::class])->name('stats.history');

// Settings [Admin]
Route::middleware(['auth', AdminMiddleware::class])->prefix('admin/settings')->group(function () {
    Route::get('/', [SettingsController::class, 'index'])->name('settings.index');
    Route::patch('/', [SettingsController::class, 'update'])->name('settings.update');
    Route::get('/timezones', [SettingsController::class, 'getTimezones'])->name('settings.timezones');
    Route::get('/test-url', [SettingsController::class, 'testUrl'])->name('settings.test-url');
});

// Updates [Admin]
Route::middleware(['auth', AdminMiddleware::class])->prefix('admin/updates')->group(function () {
    Route::get('/', [UpdateController::class, 'status'])->name('updates.status');
    Route::post('/check', [UpdateController::class, 'checkForUpdates'])->name('updates.check');
    Route::post('/perform', [UpdateController::class, 'performUpdate'])->name('updates.perform');
    Route::post('/rollback', [UpdateController::class, 'rollback'])->name('updates.rollback');
    Route::get('/logs', [UpdateController::class, 'getLogs'])->name('updates.logs');
    Route::get('/system-info', [UpdateController::class, 'systemInfo'])->name('updates.system-info');
});

// Activity Logs [Admin]
Route::middleware(['auth', AdminMiddleware::class])->prefix('admin/activity-logs')->group(function () {
    Route::get('/', [ActivityLogController::class, 'index'])->name('activity-logs.index');
    Route::get('/list', [ActivityLogController::class, 'list'])->name('activity-logs.list');
    Route::get('/security', [ActivityLogController::class, 'security'])->name('activity-logs.security');
    Route::get('/stats', [ActivityLogController::class, 'stats'])->name('activity-logs.stats');
    Route::get('/export', [ActivityLogController::class, 'export'])->name('activity-logs.export');
    Route::post('/cleanup', [ActivityLogController::class, 'cleanup'])->name('activity-logs.cleanup');
});

// Login History (User)
Route::get('/activity-logs/login-history', [ActivityLogController::class, 'loginHistory'])
    ->middleware(['auth'])
    ->name('activity-logs.login-history');

// IP Restrictions [Admin]
Route::middleware(['auth', AdminMiddleware::class])->prefix('admin/ip-restrictions')->group(function () {
    Route::get('/', [IpRestrictionController::class, 'index'])->name('ip-restrictions.index');
    Route::get('/list', [IpRestrictionController::class, 'list'])->name('ip-restrictions.list');
    Route::post('/', [IpRestrictionController::class, 'store'])->name('ip-restrictions.store');
    Route::patch('/{restriction}', [IpRestrictionController::class, 'update'])->name('ip-restrictions.update');
    Route::delete('/{restriction}', [IpRestrictionController::class, 'destroy'])->name('ip-restrictions.destroy');
    Route::get('/stats', [IpRestrictionController::class, 'stats'])->name('ip-restrictions.stats');
    Route::post('/quick-block', [IpRestrictionController::class, 'quickBlock'])->name('ip-restrictions.quick-block');
    Route::post('/clear-logs', [IpRestrictionController::class, 'clearLogs'])->name('ip-restrictions.clear-logs');
});
Route::get('/ip-restrictions/check-my-ip', [IpRestrictionController::class, 'checkMyIp'])
    ->middleware(['auth'])
    ->name('ip-restrictions.check-my-ip');

// Accounts
Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__ . '/auth.php';
