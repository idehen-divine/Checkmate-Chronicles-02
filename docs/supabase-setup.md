# Supabase Setup Guide for Checkmate Chronicles

## Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in to your account
3. Click "New Project"
4. Choose your organization
5. Fill in project details:
   - **Name**: Checkmate Chronicles
   - **Database Password**: Choose a strong password
   - **Region**: Choose closest to your users
6. Click "Create new project"

## Step 2: Get Project Credentials

1. Go to **Settings** → **API** in your Supabase dashboard
2. Copy the following values:
   - **Project URL** (starts with https://...)
   - **anon public key** (starts with eyJ...)

## Step 3: Update Environment Files

Replace the placeholder values in your environment files:

### `src/environments/environment.ts`
```typescript
export const environment = {
  production: false,
  supabase: {
    url: 'YOUR_ACTUAL_SUPABASE_URL',
    anonKey: 'YOUR_ACTUAL_SUPABASE_ANON_KEY'
  }
};
```

### `src/environments/environment.prod.ts`
```typescript
export const environment = {
  production: true,
  supabase: {
    url: 'YOUR_ACTUAL_SUPABASE_URL',
    anonKey: 'YOUR_ACTUAL_SUPABASE_ANON_KEY'
  }
};
```

## Step 4: Create Database Schema

### Option A: Using Supabase Dashboard (Recommended)

1. Go to **SQL Editor** in your Supabase dashboard
2. Click "New query"
3. Copy and paste the entire content from `supabase/migrations/001_initial_schema.sql`
4. Click "Run" to execute the query

### Option B: Using Supabase CLI

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Initialize Supabase in your project:
   ```bash
   supabase init
   ```

3. Link to your project:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

4. Run migrations:
   ```bash
   supabase db push
   ```

## Step 5: Configure Authentication Providers

### Google OAuth Setup

1. Go to **Authentication** → **Providers** in Supabase dashboard
2. Find **Google** and click the toggle to enable it
3. You'll need to set up Google OAuth credentials:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add your Supabase callback URL: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
4. Copy Client ID and Client Secret to Supabase

### Apple OAuth Setup

1. Go to **Authentication** → **Providers** in Supabase dashboard
2. Find **Apple** and click the toggle to enable it
3. You'll need Apple Developer account and:
   - Create an App ID
   - Create a Service ID
   - Generate a private key
   - Configure Sign in with Apple
4. Add the credentials to Supabase

## Step 6: Test the Setup

1. Start your development server:
   ```bash
   yarn start
   ```

2. Navigate to the auth page
3. Try signing in with Google or Apple
4. Check the Supabase dashboard to see if users are being created

## Troubleshooting

### Common Issues:

1. **"Invalid API key"**: Double-check your environment variables
2. **"Table doesn't exist"**: Make sure you ran the SQL schema
3. **"RLS policy violation"**: Check that RLS policies are correctly set up
4. **OAuth redirect issues**: Verify callback URLs in provider settings

### Useful Supabase Dashboard Sections:

- **Table Editor**: View and edit your data
- **Authentication**: Manage users and providers
- **SQL Editor**: Run custom queries
- **Logs**: Debug issues and monitor activity
- **Settings** → **API**: Get connection details

## Next Steps

Once your database is set up:

1. Test user registration and authentication
2. Implement user profile management
3. Add game creation and management features
4. Set up real-time subscriptions for live games