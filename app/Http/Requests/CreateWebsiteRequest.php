<?php

namespace App\Http\Requests;

use App\Enums\ApplicationType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreateWebsiteRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        if (auth()->user()->domain_limit) {
            return auth()->user()->websites->count() < auth()->user()->domain_limit;
        }

        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $domainRegex = 'regex:/^(?!:\/\/)(?=.{1,255}$)(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)+([a-zA-Z]{2,})$/';
        $applicationType = $this->input('application_type', ApplicationType::PHP->value);

        $rules = [
            'url' => ['required', 'string', 'max:255', 'unique:websites,url', $domainRegex],
            'document_root' => ['required', 'string', 'max:255'],
            'application_type' => ['required', 'string', Rule::enum(ApplicationType::class)],
        ];

        // Conditional rules based on application type
        switch ($applicationType) {
            case ApplicationType::PHP->value:
                $rules['php_version_id'] = ['required', 'integer', 'exists:php_versions,id'];
                break;

            case ApplicationType::NodeJS->value:
                $rules['node_version_id'] = ['required', 'integer', 'exists:node_versions,id'];
                $rules['startup_file'] = ['required', 'string', 'max:255'];
                $rules['app_port'] = ['nullable', 'integer', 'min:1024', 'max:65535'];
                $rules['instances'] = ['nullable', 'integer', 'min:1', 'max:16'];
                $rules['environment_variables'] = ['nullable', 'array'];
                break;

            case ApplicationType::Static->value:
                // Static sites don't need version or extra configuration
                break;
        }

        return $rules;
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'url.regex' => 'Please enter a valid domain name (e.g., example.com).',
            'url.unique' => 'This domain is already registered.',
            'php_version_id.required' => 'Please select a PHP version for this PHP application.',
            'node_version_id.required' => 'Please select a Node.js version for this Node.js application.',
            'startup_file.required' => 'Please specify the startup file (e.g., app.js, server.js).',
            'app_port.min' => 'Port must be at least 1024.',
            'app_port.max' => 'Port must be less than 65535.',
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        // Normalize domain: lowercase and remove www. prefix
        if ($this->has('url')) {
            $url = strtolower(trim($this->input('url')));

            // Remove www. prefix if present
            if (str_starts_with($url, 'www.')) {
                $url = substr($url, 4);
            }

            // Remove protocol if accidentally included
            $url = preg_replace('#^https?://#', '', $url);

            // Remove trailing slash
            $url = rtrim($url, '/');

            $this->merge(['url' => $url]);
        }

        // Set default application type if not provided
        if (!$this->has('application_type')) {
            $this->merge([
                'application_type' => ApplicationType::PHP->value,
            ]);
        }

        // Set defaults for Node.js
        if ($this->input('application_type') === ApplicationType::NodeJS->value) {
            $defaults = [];

            if (!$this->filled('instances')) {
                $defaults['instances'] = 1;
            }

            if (!$this->filled('app_port')) {
                $defaults['app_port'] = 3000;
            }

            if (!empty($defaults)) {
                $this->merge($defaults);
            }
        }
    }
}
