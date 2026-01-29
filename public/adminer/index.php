<?php
/**
 * Laranode Adminer Wrapper
 *
 * This file wraps Adminer and provides auto-login functionality
 * using credentials stored in the Laravel session.
 */

// Start session to access Laravel session data
session_start();

// Check if we have credentials from Laravel
$laranodeCredentials = $_SESSION['adminer_credentials'] ?? null;
$expiresAt = $_SESSION['adminer_expires'] ?? 0;

// Verify session is valid
if (!$laranodeCredentials || $expiresAt < time()) {
    header('Location: /databases');
    exit('Session expired. Redirecting...');
}

// Custom Adminer plugin for auto-login
function adminer_object() {
    class LaranodeAdminer extends Adminer {

        function name() {
            return '<a href="/databases">Laranode</a> Database Manager';
        }

        function credentials() {
            $creds = $_SESSION['adminer_credentials'] ?? null;
            if ($creds) {
                return [
                    $creds['server'],
                    $creds['username'],
                    $creds['password']
                ];
            }
            return ['', '', ''];
        }

        function database() {
            return $_SESSION['adminer_credentials']['database'] ?? null;
        }

        function login($login, $password) {
            // Allow login if we have valid session credentials
            $creds = $_SESSION['adminer_credentials'] ?? null;
            if ($creds && $login === $creds['username']) {
                return true;
            }
            return false;
        }

        function loginForm() {
            $creds = $_SESSION['adminer_credentials'] ?? null;
            if (!$creds) {
                echo '<p class="error">No database credentials found. <a href="/databases">Go back to databases</a></p>';
                return;
            }

            // Auto-submit login form
            ?>
            <script>
                document.addEventListener('DOMContentLoaded', function() {
                    var form = document.querySelector('form');
                    if (form) {
                        setTimeout(function() { form.submit(); }, 100);
                    }
                });
            </script>
            <?php

            // Show a nicer login form
            echo '<table cellspacing="0" class="layout">';
            echo '<tr><th>Driver<td>';
            $driver = $creds['driver'] === 'mysql' ? 'server' : 'pgsql';
            echo '<input type="hidden" name="auth[driver]" value="' . htmlspecialchars($driver) . '">';
            echo $creds['driver'] === 'mysql' ? 'MySQL' : 'PostgreSQL';

            echo '<tr><th>Server<td>';
            echo '<input type="hidden" name="auth[server]" value="' . htmlspecialchars($creds['server']) . '">';
            echo htmlspecialchars($creds['server']);

            echo '<tr><th>Username<td>';
            echo '<input type="hidden" name="auth[username]" value="' . htmlspecialchars($creds['username']) . '">';
            echo htmlspecialchars($creds['username']);

            echo '<tr><th>Password<td>';
            echo '<input type="hidden" name="auth[password]" value="' . htmlspecialchars($creds['password']) . '">';
            echo '********';

            echo '<tr><th>Database<td>';
            echo '<input type="hidden" name="auth[db]" value="' . htmlspecialchars($creds['database']) . '">';
            echo htmlspecialchars($creds['database']);

            echo '</table>';
            echo '<p><input type="submit" value="Connect"></p>';
            echo '<p><a href="/databases">Back to Databases</a></p>';
        }

        // Customize permanent login key
        function permanentLogin($create = false) {
            return '';
        }
    }

    return new LaranodeAdminer;
}

// Include Adminer
include __DIR__ . '/adminer.php';
