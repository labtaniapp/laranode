<?php

use App\Http\Controllers\AccountsController;
use App\Http\Controllers\AdminerController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DatabaseController;
use App\Http\Controllers\FilemanagerController;
use App\Http\Controllers\FirewallController;
use App\Http\Controllers\MysqlController;
use App\Http\Controllers\PHPManagerController;
use App\Http\Controllers\RuntimeManagerController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\StatsHistoryController;
use App\Http\Controllers\WebsiteController;
use App\Http\Middleware\AdminMiddleware;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return redirect('/dashboard');
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


// Stats History [Admin]
Route::get('/stats/history', [StatsHistoryController::class, 'cpuAndMemory'])->middleware(['auth', AdminMiddleware::class])->name('stats.history');

// Settings [Admin]
Route::middleware(['auth', AdminMiddleware::class])->prefix('admin/settings')->group(function () {
    Route::get('/', [SettingsController::class, 'index'])->name('settings.index');
    Route::patch('/', [SettingsController::class, 'update'])->name('settings.update');
    Route::get('/timezones', [SettingsController::class, 'getTimezones'])->name('settings.timezones');
    Route::get('/test-url', [SettingsController::class, 'testUrl'])->name('settings.test-url');
});

// Accounts
Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__ . '/auth.php';
