INSERT INTO storage_backend (
    name,
    provider,
    delivery,
    config
)
VALUES (
    'Local Storage',
    'local_fs',
    'direct',
    '{"root_path": "./storage"}'
);