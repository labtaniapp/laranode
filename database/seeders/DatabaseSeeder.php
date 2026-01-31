<?php

namespace Database\Seeders;

use App\Models\User;
use Database\Factories\PhpVersionFactory;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        PhpVersionFactory::new()->create();

        // Create default admin user
        User::create([
            'username' => 'laranode',
            'name' => 'Admin',
            'email' => 'admin@expertiseablo.com',
            'password' => bcrypt('Myadmin.10'),
            'role' => 'admin',
            'ssh_access' => true,
            'must_change_password' => true,
        ]);
    }
}
