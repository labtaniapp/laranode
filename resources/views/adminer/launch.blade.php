<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Connecting to Database...</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: #fff;
        }
        .container {
            text-align: center;
            padding: 2rem;
        }
        .spinner {
            width: 50px;
            height: 50px;
            border: 3px solid rgba(255,255,255,0.3);
            border-radius: 50%;
            border-top-color: #6366f1;
            animation: spin 1s ease-in-out infinite;
            margin: 0 auto 1.5rem;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        h2 {
            margin: 0 0 0.5rem;
            font-weight: 500;
        }
        p {
            color: rgba(255,255,255,0.7);
            margin: 0;
        }
        .db-info {
            background: rgba(255,255,255,0.1);
            padding: 1rem 2rem;
            border-radius: 8px;
            margin-top: 1.5rem;
            font-family: monospace;
        }
        .back-link {
            margin-top: 2rem;
            display: inline-block;
            color: #6366f1;
            text-decoration: none;
        }
        .back-link:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="spinner"></div>
        <h2>Connecting to Database</h2>
        <p>Please wait while we establish the connection...</p>

        <div class="db-info">
            <strong>{{ $credentials['driver'] === 'mysql' ? 'MySQL' : 'PostgreSQL' }}</strong>
            &bull; {{ $credentials['database'] }}
        </div>

        <a href="{{ route('databases.index') }}" class="back-link">Cancel and go back</a>
    </div>

    <!-- Hidden form to submit to Adminer -->
    <form id="adminer-form" method="post" action="{{ url('/adminer') }}" style="display: none;">
        @csrf
        <input type="hidden" name="auth[driver]" value="{{ $credentials['driver'] === 'mysql' ? 'server' : 'pgsql' }}">
        <input type="hidden" name="auth[server]" value="{{ $credentials['server'] }}">
        <input type="hidden" name="auth[username]" value="{{ $credentials['username'] }}">
        <input type="hidden" name="auth[password]" value="{{ $credentials['password'] }}">
        <input type="hidden" name="auth[db]" value="{{ $credentials['database'] }}">
    </form>

    <script>
        // Auto-submit after a brief delay to show the loading screen
        setTimeout(function() {
            document.getElementById('adminer-form').submit();
        }, 800);
    </script>
</body>
</html>
