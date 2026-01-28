<?php

namespace App\Http\Controllers;

use App\Enums\DatabaseDriver;
use App\Http\Requests\CreateDatabaseRequest;
use App\Http\Requests\DeleteDatabaseRequest;
use App\Http\Requests\UpdateDatabaseRequest;
use App\Models\Database;
use App\Services\Database\DatabaseServiceFactory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Inertia\Inertia;
use Illuminate\Support\Facades\Gate;

class DatabaseController extends Controller
{
    public function index(Request $request): \Inertia\Response
    {
        $user = $request->user();
        $databases = Database::where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($database) {
                $service = DatabaseServiceFactory::make($database->driver);
                $stats = $service->getDatabaseStats($database);

                return [
                    'id' => $database->id,
                    'name' => $database->name,
                    'db_user' => $database->db_user,
                    'driver' => $database->driver->value,
                    'driver_label' => $database->driver->label(),
                    'charset' => $database->charset,
                    'collation' => $database->collation,
                    'size' => $stats['size'] ?? 0,
                    'tables_count' => $stats['tables_count'] ?? 0,
                    'created_at' => $database->created_at,
                ];
            });

        $availableDrivers = DatabaseServiceFactory::getAvailableDrivers();

        return Inertia::render('Databases/Index', [
            'databases' => $databases,
            'availableDrivers' => $availableDrivers,
            'driverOptions' => DatabaseDriver::options(),
        ]);
    }

    public function getCharsetsAndCollations(Request $request): JsonResponse
    {
        $driver = $request->input('driver', DatabaseDriver::MySQL->value);

        try {
            $service = DatabaseServiceFactory::make($driver);
            $charsets = $service->getCharsets();

            $charsetsWithCollations = [];
            foreach ($charsets as $charset) {
                $charsetsWithCollations[$charset] = $service->getCollations($charset);
            }

            return response()->json([
                'charsets' => $charsets,
                'collations' => $charsetsWithCollations,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to get charsets: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function store(CreateDatabaseRequest $request): RedirectResponse
    {
        $user = $request->user();
        $validated = $request->validated();

        $service = DatabaseServiceFactory::make($validated['driver']);
        $service->createDatabase($validated, $user);

        session()->flash('success', 'Database created successfully!');

        return redirect()->route('databases.index');
    }

    public function update(UpdateDatabaseRequest $request): RedirectResponse
    {
        $user = $request->user();
        $databaseId = $request->integer('id');

        $database = Database::where('id', $databaseId)
            ->where('user_id', $user->id)
            ->firstOrFail();

        Gate::authorize('update', $database);

        $service = DatabaseServiceFactory::make($database->driver);

        // Handle password update
        if ($request->filled('db_pass')) {
            $service->updatePassword($database, $request->input('db_pass'));
        }

        session()->flash('success', 'Database updated successfully!');

        return redirect()->route('databases.index');
    }

    public function destroy(DeleteDatabaseRequest $request): RedirectResponse
    {
        $user = $request->user();
        $databaseId = $request->integer('id');

        $database = Database::where('id', $databaseId)
            ->where('user_id', $user->id)
            ->firstOrFail();

        Gate::authorize('delete', $database);

        $service = DatabaseServiceFactory::make($database->driver);
        $service->deleteDatabase($database);

        session()->flash('success', 'Database deleted successfully!');

        return redirect()->route('databases.index');
    }

    /**
     * Test connection to a specific database driver.
     */
    public function testConnection(Request $request): JsonResponse
    {
        $driver = $request->input('driver', DatabaseDriver::MySQL->value);

        try {
            $service = DatabaseServiceFactory::make($driver);
            $connected = $service->testConnection();

            return response()->json([
                'connected' => $connected,
                'driver' => $driver,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'connected' => false,
                'driver' => $driver,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
