<?php

namespace App\Actions\SSL;

use App\Enums\ApplicationType;
use App\Models\Website;
use Illuminate\Support\Facades\Process;
use Exception;

class GenerateWebsiteSslAction
{
    public function execute(Website $website, string $email): void
    {
        // Update status to pending and mark enabled
        $website->update([
            'ssl_status' => 'pending',
            'ssl_enabled' => true,
        ]);

        // Determine site type for SSL manager
        $siteType = $this->getSiteType($website);

        // Build command arguments
        $command = [
            'sudo',
            config('laranode.laranode_bin_path') . '/laranode-ssl-manager.sh',
            'generate',
            $website->url,
            $email,
            $website->fullDocumentRoot,
            $siteType,
            $website->user->systemUsername,
        ];

        // Add port for Node.js sites
        if ($website->isNodeJs()) {
            $command[] = (string) ($website->port ?? 3000);
        }

        $result = Process::timeout(120)->run($command);

        if ($result->failed()) {
            $website->update([
                'ssl_status' => 'inactive',
                'ssl_enabled' => false,
            ]);
            throw new Exception($result->errorOutput() ?: 'Failed to generate SSL certificate');
        }

        // Verify status after generation
        $statusResult = Process::run([
            'sudo',
            config('laranode.laranode_bin_path') . '/laranode-ssl-manager.sh',
            'status',
            $website->url,
        ]);

        $sslStatus = trim($statusResult->output());

        // Get actual expiry date from certificate
        $expiryDate = $this->getExpiryDate($website->url);

        $website->update([
            'ssl_status' => $sslStatus === 'active' ? 'active' : 'inactive',
            'ssl_generated_at' => now(),
            'ssl_expires_at' => $expiryDate,
        ]);
    }

    /**
     * Get site type string for SSL manager script.
     */
    protected function getSiteType(Website $website): string
    {
        return match ($website->application_type) {
            ApplicationType::PHP => 'php',
            ApplicationType::NodeJS => 'nodejs',
            ApplicationType::Static => 'static',
            default => 'php',
        };
    }

    /**
     * Get the actual certificate expiry date.
     */
    protected function getExpiryDate(string $domain): ?\Carbon\Carbon
    {
        $result = Process::run([
            'sudo',
            config('laranode.laranode_bin_path') . '/laranode-ssl-manager.sh',
            'expiry',
            $domain,
        ]);

        $expiryString = trim($result->output());

        if (empty($expiryString)) {
            return now()->addDays(90); // Fallback
        }

        try {
            return \Carbon\Carbon::parse($expiryString);
        } catch (\Exception $e) {
            return now()->addDays(90); // Fallback
        }
    }
}
