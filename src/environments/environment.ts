// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  environment: 'development',
  supabase: {
    url: 'https://cfpljkqwubjmtdoarhlz.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmcGxqa3F3dWJqbXRkb2FyaGx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5NDc0ODAsImV4cCI6MjA2NTUyMzQ4MH0.QHUEuBAQqGTH4uy9MKuBg1TiGglBNwZ7W_OM6Xh-yzg'
  }
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.