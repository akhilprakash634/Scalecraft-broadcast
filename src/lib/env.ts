const required = [
  'JWT_SECRET',
  'ADMIN_SECRET', 
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SCALECRAFT_SSH_PRIVATE_KEY',
];

export function validateEnv() {
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing env variables: ${missing.join(', ')}`);
  }
  if (process.env.JWT_SECRET!.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters');
  }
}
