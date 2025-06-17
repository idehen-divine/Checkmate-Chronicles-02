# Utility Classes

This directory contains reusable utility classes that implement the DRY (Don't Repeat Yourself) principle across the application.

## DragScrollUtil

A comprehensive utility for implementing smooth drag-to-scroll functionality with momentum physics and cross-platform support.

### Features

- **Mouse drag scrolling** with grab/grabbing cursor states
- **Touch scrolling** with momentum for mobile devices
- **Momentum physics** with configurable friction and velocity
- **Configurable speeds** for different interaction types
- **Mobile-responsive** with automatic grab cursor disable on mobile
- **Memory efficient** with proper cleanup functions
- **TypeScript support** with full type definitions

### Basic Usage

```typescript
import { DragScrollUtil } from '../utils';

// Simple setup with default configuration
const cleanup = DragScrollUtil.setupDragScroll(containerElement);

// Cleanup when component is destroyed
cleanup();
```

### Advanced Configuration

```typescript
const cleanup = DragScrollUtil.setupDragScroll(containerElement, {
  mouseSpeed: 1.5,           // Mouse drag speed multiplier
  touchSpeed: 0.8,           // Touch drag speed multiplier
  mouseFriction: 0.95,       // Mouse momentum friction (0-1)
  touchFriction: 0.92,       // Touch momentum friction (0-1)
  momentumThreshold: 0.1,    // Minimum velocity for momentum
  mouseMomentumScale: 120,   // Mouse momentum intensity
  touchMomentumScale: -90,   // Touch momentum intensity
  disableOnMobile: true,     // Disable grab cursor on mobile
  mobileBreakpoint: 1024     // Screen width breakpoint for mobile
});
```

### Mobile Behavior

By default, the utility automatically detects mobile screen sizes (< 1024px) and:
- **Disables** grab cursor and mouse drag events
- **Keeps** touch scrolling with momentum
- **Maintains** smooth native touch behavior

This provides the best user experience across devices without conflicting with native touch scrolling.

### Configuration Options

| Option               | Type    | Default | Description                                  |
| -------------------- | ------- | ------- | -------------------------------------------- |
| `mouseSpeed`         | number  | 1       | Mouse drag speed multiplier                  |
| `touchSpeed`         | number  | 0.6     | Touch drag speed multiplier                  |
| `mouseFriction`      | number  | 0.95    | Mouse momentum friction (0-1)                |
| `touchFriction`      | number  | 0.92    | Touch momentum friction (0-1)                |
| `momentumThreshold`  | number  | 0.1     | Minimum velocity for momentum                |
| `mouseMomentumScale` | number  | 100     | Mouse momentum intensity                     |
| `touchMomentumScale` | number  | -80     | Touch momentum intensity                     |
| `disableOnMobile`    | boolean | true    | Disable grab functionality on mobile         |
| `mobileBreakpoint`   | number  | 1024    | Screen width breakpoint for mobile detection |

### Implementation Example

```typescript
export class ProfilePage implements OnInit, OnDestroy {
  private dragScrollCleanup?: () => void;

  ngAfterViewInit() {
    const container = this.elementRef.nativeElement.querySelector('.nft-scroll-container');
    if (container) {
      this.dragScrollCleanup = DragScrollUtil.setupDragScroll(container, {
        mouseSpeed: 1,
        touchSpeed: 0.6,
        disableOnMobile: true
      });
    }
  }

  ngOnDestroy() {
    this.dragScrollCleanup?.();
  }
}
```

## NavigationUtil

A consolidated navigation utility that provides both service functionality and mixin patterns for navigation across the application. This replaces the previous NavigationService + NavigationMixin approach.

### Direct Usage (Service Pattern)

```typescript
import { NavigationUtil } from '../../utils';

export class MyComponent {
  constructor(private navigationUtil: NavigationUtil) {}

  someMethod() {
    // Direct navigation methods
    this.navigationUtil.goBack();
    this.navigationUtil.navigateTo('/dashboard');
    this.navigationUtil.handleSidebarNavigation('profile');
    
    // History methods
    if (this.navigationUtil.hasPreviousRoute()) {
      this.navigationUtil.goBack();
    }
  }
}
```

### Mixin Usage (Component Pattern)

```typescript
import { NavigationUtil, NavigationMixin, NavigationComponent } from '../../utils';

export class MyComponent implements NavigationComponent {
  private navigationMethods: ReturnType<typeof NavigationMixin.createNavigationMethods>;

  constructor(private navigationUtil: NavigationUtil) {
    this.navigationMethods = NavigationMixin.createNavigationMethods(this.navigationUtil);
  }

  // Use the mixin methods
  onSidebarNavigation(target: string): void {
    this.navigationMethods.onSidebarNavigation(target);
  }

  onBottomNavigation(target: string): void {
    this.navigationMethods.onBottomNavigation(target);
  }

  // ... other navigation methods
}
```

### Available Methods

#### Core Navigation
- `goBack()`: Navigate back using browser history
- `navigateTo(route: string)`: Navigate to a specific route
- `navigateToWithParams(route: string, params: any)`: Navigate with query parameters
- `openMenu()`: Handle menu opening

#### Component Navigation Handlers
- `handleSidebarNavigation(target: string)`: Handle sidebar navigation
- `handleBottomNavigation(target: string)`: Handle bottom navigation
- `handleBottomSubmenuNavigation(target: string)`: Handle submenu navigation

#### History Management
- `hasPreviousRoute()`: Check if there's a previous route
- `getPreviousUrl()`: Get the previous URL

## DataLoaderUtil

A utility class for managing data loading operations and subscription cleanup.

### Usage

```typescript
import { DataLoaderUtil } from '../../utils';
import { MyService } from '../../services';

export class MyComponent implements OnDestroy {
  private dataLoader = new DataLoaderUtil();

  ngOnInit() {
    // Load single data source
    this.dataLoader.loadData(
      this.myService.getData(),
      (data) => this.handleData(data),
      (error) => this.handleError(error)
    );

    // Load multiple data sources
    this.dataLoader.loadMultiple([
      {
        source$: this.service1.getData(),
        onSuccess: (data) => this.handleData1(data)
      },
      {
        source$: this.service2.getData(),
        onSuccess: (data) => this.handleData2(data)
      }
    ]);
  }

  ngOnDestroy() {
    this.dataLoader.cleanup();
  }
}
```

### Methods

- `loadData<T>(source$, onSuccess, onError?)`: Load single data source
- `loadMultiple(loaders[])`: Load multiple data sources in parallel
- `cleanup()`: Unsubscribe from all managed subscriptions
- `getActiveSubscriptionCount()`: Get number of active subscriptions

## Benefits

1. **DRY Principle**: Eliminates code duplication across components
2. **Consistency**: Ensures consistent behavior across the application
3. **Maintainability**: Centralized logic makes updates easier
4. **Reusability**: Utilities can be used in any component
5. **Memory Management**: Proper cleanup prevents memory leaks
6. **Type Safety**: Full TypeScript support with interfaces
7. **Consolidated Navigation**: Single utility for all navigation needs

## Index Imports

All modules in the application use index imports for cleaner, more maintainable code:

### Utils
```typescript
import { DragScrollUtil, NavigationUtil, NavigationMixin, DataLoaderUtil } from '../../utils';
```

### Services
```typescript
import { AuthService, ProfileService, SupabaseService } from '../../services';
```

### Types
```typescript
import { UserProfile, NFTItem, MatchHistoryItem } from '../../types';
```

This pattern provides:
- **Cleaner imports**: Single import line for multiple exports
- **Better organization**: Clear module boundaries
- **Easier refactoring**: Changes to file structure don't break imports
- **Consistent patterns**: Same import style across the entire application

## Architecture Improvements

### Navigation Consolidation

Previously, navigation was split between:
- `NavigationService` (60 lines) - Core navigation logic
- `NavigationMixin` (50 lines) - Component delegation wrapper

Now consolidated into:
- `NavigationUtil` (110 lines) - Complete navigation solution

**Benefits:**
- **Reduced complexity**: Single source of truth for navigation
- **Better performance**: No unnecessary service → mixin delegation
- **Cleaner architecture**: Direct utility usage or mixin pattern as needed
- **Enhanced functionality**: Additional navigation methods included 