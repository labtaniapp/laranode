<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;

class ForcePasswordChangeController extends Controller
{
    /**
     * Show the force password change form.
     */
    public function show()
    {
        return Inertia::render('Auth/ForcePasswordChange');
    }

    /**
     * Update the user's password.
     */
    public function update(Request $request)
    {
        $validated = $request->validate([
            'password' => ['required', 'confirmed', Password::defaults()],
        ]);

        $request->user()->update([
            'password' => Hash::make($validated['password']),
            'must_change_password' => false,
        ]);

        return redirect()->route('dashboard')->with('success', 'Password changed successfully.');
    }
}
