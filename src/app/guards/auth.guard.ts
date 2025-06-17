import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable, map, take, filter, switchMap } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  canActivate(): Observable<boolean> {
    return this.authService.authReady$.pipe(
      filter(ready => ready),
      take(1),
      switchMap(() => this.authService.isAuthenticated$.pipe(take(1))),
      map(isAuthenticated => {
        if (!isAuthenticated) {
          this.router.navigate(['/auth']);
          return false;
        }
        return true;
      })
    );
  }
}