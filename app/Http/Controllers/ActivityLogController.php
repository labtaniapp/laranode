<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ActivityLogController extends Controller
{
    /**
     * Display activity logs (Admin only).
     */
    public function index(Request $request)
    {
        $query = ActivityLog::with('user')
            ->orderBy('created_at', 'desc');

        // Filter by category
        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        // Filter by severity
        if ($request->filled('severity')) {
            $query->where('severity', $request->severity);
        }

        // Filter by action
        if ($request->filled('action')) {
            $query->where('action', $request->action);
        }

        // Filter by user
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        // Filter by date range
        if ($request->filled('from')) {
            $query->where('created_at', '>=', $request->from);
        }
        if ($request->filled('to')) {
            $query->where('created_at', '<=', $request->to . ' 23:59:59');
        }

        // Search in description
        if ($request->filled('search')) {
            $query->where('description', 'like', '%' . $request->search . '%');
        }

        $logs = $query->paginate(50)->withQueryString();

        // Get unique values for filters
        $categories = ActivityLog::select('category')->distinct()->pluck('category');
        $actions = ActivityLog::select('action')->distinct()->pluck('action');

        return Inertia::render('Admin/ActivityLogs', [
            'logs' => $logs,
            'categories' => $categories,
            'actions' => $actions,
            'filters' => $request->only(['category', 'severity', 'action', 'user_id', 'from', 'to', 'search']),
        ]);
    }

    /**
     * Get activity logs as JSON (for API/AJAX).
     */
    public function list(Request $request)
    {
        $query = ActivityLog::with('user')
            ->orderBy('created_at', 'desc');

        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        if ($request->filled('limit')) {
            $logs = $query->limit($request->limit)->get();
        } else {
            $logs = $query->paginate(50);
        }

        return response()->json($logs);
    }

    /**
     * Get security events.
     */
    public function security(Request $request)
    {
        $logs = ActivityLog::recentSecurityEvents($request->get('limit', 50));

        return response()->json($logs);
    }

    /**
     * Get user's login history.
     */
    public function loginHistory(Request $request)
    {
        $userId = $request->get('user_id', auth()->id());
        $logs = ActivityLog::loginHistory($userId, $request->get('limit', 10));

        return response()->json($logs);
    }

    /**
     * Export logs as CSV.
     */
    public function export(Request $request)
    {
        $query = ActivityLog::with('user')
            ->orderBy('created_at', 'desc');

        if ($request->filled('from')) {
            $query->where('created_at', '>=', $request->from);
        }
        if ($request->filled('to')) {
            $query->where('created_at', '<=', $request->to . ' 23:59:59');
        }

        $logs = $query->limit(10000)->get();

        $filename = 'activity-logs-' . now()->format('Y-m-d-His') . '.csv';
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"$filename\"",
        ];

        $callback = function () use ($logs) {
            $file = fopen('php://output', 'w');
            fputcsv($file, ['Date', 'User', 'Action', 'Category', 'Description', 'IP Address', 'Severity']);

            foreach ($logs as $log) {
                fputcsv($file, [
                    $log->created_at->format('Y-m-d H:i:s'),
                    $log->user?->name ?? 'System',
                    $log->action,
                    $log->category,
                    $log->description,
                    $log->ip_address,
                    $log->severity,
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * Clean old logs.
     */
    public function cleanup(Request $request)
    {
        $request->validate([
            'days' => ['required', 'integer', 'min:7', 'max:365'],
        ]);

        $deleted = ActivityLog::cleanOldLogs($request->days);

        ActivityLog::logSystem(
            'cleanup',
            "Cleaned up $deleted old activity logs",
            ['days' => $request->days, 'deleted_count' => $deleted]
        );

        return response()->json([
            'success' => true,
            'deleted' => $deleted,
        ]);
    }

    /**
     * Get statistics for dashboard.
     */
    public function stats()
    {
        $today = now()->startOfDay();
        $thisWeek = now()->startOfWeek();
        $thisMonth = now()->startOfMonth();

        return response()->json([
            'today' => [
                'total' => ActivityLog::where('created_at', '>=', $today)->count(),
                'logins' => ActivityLog::where('created_at', '>=', $today)->where('action', 'login')->count(),
                'failed_logins' => ActivityLog::where('created_at', '>=', $today)->where('action', 'login_failed')->count(),
                'security' => ActivityLog::where('created_at', '>=', $today)->where('category', 'security')->count(),
            ],
            'week' => [
                'total' => ActivityLog::where('created_at', '>=', $thisWeek)->count(),
                'logins' => ActivityLog::where('created_at', '>=', $thisWeek)->where('action', 'login')->count(),
                'failed_logins' => ActivityLog::where('created_at', '>=', $thisWeek)->where('action', 'login_failed')->count(),
            ],
            'month' => [
                'total' => ActivityLog::where('created_at', '>=', $thisMonth)->count(),
            ],
            'by_category' => ActivityLog::where('created_at', '>=', $thisMonth)
                ->selectRaw('category, count(*) as count')
                ->groupBy('category')
                ->pluck('count', 'category'),
            'recent_critical' => ActivityLog::whereIn('severity', ['error', 'critical'])
                ->orderBy('created_at', 'desc')
                ->limit(5)
                ->get(),
        ]);
    }
}
