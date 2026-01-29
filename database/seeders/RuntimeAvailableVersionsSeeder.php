<?php

namespace Database\Seeders;

use App\Models\RuntimeAvailableVersion;
use Illuminate\Database\Seeder;

class RuntimeAvailableVersionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $versions = [
            // PHP versions
            ['type' => 'php', 'version' => '8.4', 'label' => 'PHP 8.4 (Latest)', 'is_lts' => false, 'sort_order' => 1],
            ['type' => 'php', 'version' => '8.3', 'label' => 'PHP 8.3', 'is_lts' => true, 'sort_order' => 2],
            ['type' => 'php', 'version' => '8.2', 'label' => 'PHP 8.2', 'is_lts' => true, 'sort_order' => 3],
            ['type' => 'php', 'version' => '8.1', 'label' => 'PHP 8.1', 'is_lts' => true, 'sort_order' => 4],
            ['type' => 'php', 'version' => '8.0', 'label' => 'PHP 8.0', 'is_lts' => false, 'sort_order' => 5],
            ['type' => 'php', 'version' => '7.4', 'label' => 'PHP 7.4 (Legacy)', 'is_lts' => false, 'sort_order' => 6],

            // Node.js versions
            ['type' => 'nodejs', 'version' => '22', 'label' => 'Node.js 22 (Current)', 'is_lts' => false, 'sort_order' => 1],
            ['type' => 'nodejs', 'version' => '21', 'label' => 'Node.js 21', 'is_lts' => false, 'sort_order' => 2],
            ['type' => 'nodejs', 'version' => '20', 'label' => 'Node.js 20 (LTS)', 'is_lts' => true, 'sort_order' => 3],
            ['type' => 'nodejs', 'version' => '18', 'label' => 'Node.js 18 (LTS)', 'is_lts' => true, 'sort_order' => 4],
            ['type' => 'nodejs', 'version' => '16', 'label' => 'Node.js 16 (Legacy)', 'is_lts' => false, 'sort_order' => 5],
        ];

        foreach ($versions as $version) {
            RuntimeAvailableVersion::updateOrCreate(
                ['type' => $version['type'], 'version' => $version['version']],
                $version
            );
        }
    }
}
