<?php
header('Content-Type: application/json');
echo json_encode([
    'name' => 'Pixel Art POS License API',
    'version' => '1.0',
    'endpoints' => [
        'POST /api/register.php' => 'Register key + MAC on first run',
        'POST /api/validate.php' => 'Validate key + MAC on server startup',
        'POST /api/deactivate.php' => 'Deactivate by key or MAC (requires secret)',
        'POST /api/admin/create-key.php' => 'Generate new product key (requires secret)',
        'GET /api/admin/list.php' => 'List all keys, activations, blacklist (requires secret)',
        'POST /api/admin/deactivate.php' => 'Admin deactivate by key (requires secret)'
    ]
]);
