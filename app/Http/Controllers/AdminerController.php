<?php

namespace App\Http\Controllers;

use App\Models\Database;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class AdminerController extends Controller
{
    /**
     * Generate a secure token and redirect to Adminer with pre-filled credentials.
     */
    public function connect(Request $request, Database $database)
    {
        // Check if user owns this database
        Gate::authorize('view', $database);

        // Generate a one-time token for this session
        $token = Str::random(64);

        // Store credentials in cache for 60 seconds (one-time use)
        // Note: db_password is auto-decrypted by Laravel's 'encrypted' cast
        $credentials = [
            'driver' => $database->driver->value,
            'server' => $this->getServerHost($database),
            'username' => $database->db_user,
            'password' => $database->db_password,
            'database' => $database->name,
            'user_id' => $request->user()->id,
        ];

        Cache::put("adminer_token_{$token}", $credentials, now()->addSeconds(60));

        // Redirect to Adminer with token
        return redirect()->route('adminer.launch', ['token' => $token]);
    }

    /**
     * Launch Adminer with the stored credentials.
     */
    public function launch(Request $request)
    {
        $token = $request->query('token');

        if (!$token) {
            abort(403, 'Invalid access token');
        }

        $credentials = Cache::pull("adminer_token_{$token}");

        if (!$credentials) {
            abort(403, 'Token expired or invalid. Please try again from the databases page.');
        }

        // Verify the user is still authenticated and matches
        if (!$request->user() || $request->user()->id !== $credentials['user_id']) {
            abort(403, 'Unauthorized access');
        }

        // Store credentials in session for Adminer
        session([
            'adminer_credentials' => $credentials,
            'adminer_expires' => now()->addMinutes(30)->timestamp,
        ]);

        return view('adminer.launch', [
            'credentials' => $credentials,
        ]);
    }

    /**
     * Serve the Adminer interface (proxied through Laravel for auth).
     */
    public function index(Request $request)
    {
        // Check if user has valid Adminer session
        $credentials = session('adminer_credentials');
        $expires = session('adminer_expires');

        if (!$credentials || !$expires || $expires < now()->timestamp) {
            return redirect()->route('databases.index')
                ->with('error', 'Session expired. Please connect to database again.');
        }

        // Include Adminer
        return response()->file(public_path('adminer/adminer.php'), [
            'Content-Type' => 'text/html',
        ]);
    }

    /**
     * Get the server host based on database driver.
     */
    private function getServerHost(Database $database): string
    {
        return match($database->driver->value) {
            'mysql' => config('database.connections.mysql.host', '127.0.0.1'),
            'pgsql' => config('database.connections.pgsql.host', '127.0.0.1'),
            default => '127.0.0.1',
        };
    }

    /**
     * End Adminer session and return to databases.
     */
    public function disconnect(Request $request)
    {
        session()->forget(['adminer_credentials', 'adminer_expires']);

        return redirect()->route('databases.index')
            ->with('success', 'Disconnected from database client.');
    }
}
