import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';
if (environment.production) {
	console.log = () => { };
	console.debug = () => { };
	console.warn = () => { };
	// console.error = () => { };
}

bootstrapApplication(AppComponent, {
	providers: [
		{ provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
		provideIonicAngular(),
		provideRouter(routes, withPreloading(PreloadAllModules)),
	],
});
