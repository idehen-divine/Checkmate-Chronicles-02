export interface DragScrollConfig {
    mouseSpeed?: number;
    touchSpeed?: number;
    mouseFriction?: number;
    touchFriction?: number;
    momentumThreshold?: number;
    mouseMomentumScale?: number;
    touchMomentumScale?: number;
    disableOnMobile?: boolean;
    mobileBreakpoint?: number;
}

export class DragScrollUtil {
    private static readonly DEFAULT_CONFIG: Required<DragScrollConfig> = {
        mouseSpeed: 1,
        touchSpeed: 0.6,
        mouseFriction: 0.95,
        touchFriction: 0.92,
        momentumThreshold: 0.1,
        mouseMomentumScale: 100,
        touchMomentumScale: -80,
        disableOnMobile: true,
        mobileBreakpoint: 1024
    };

    /**
     * Checks if the current screen size is considered mobile
     * @param breakpoint - The pixel width breakpoint for mobile detection
     * @returns True if screen width is below the breakpoint
     */
    private static isMobileScreen(breakpoint: number): boolean {
        return window.innerWidth < breakpoint;
    }

    /**
     * Sets up drag-to-scroll functionality on a container element
     * @param container - The HTML element to enable drag scrolling on
     * @param config - Optional configuration for scroll behavior
     * @returns Cleanup function to remove event listeners
     */
    static setupDragScroll(
        container: HTMLElement,
        config: DragScrollConfig = {}
    ): () => void {
        if (!container) {
            console.warn('DragScrollUtil: Container element is required');
            return () => { };
        }

        const finalConfig = { ...this.DEFAULT_CONFIG, ...config };

        // Check if we should disable on mobile
        if (finalConfig.disableOnMobile && this.isMobileScreen(finalConfig.mobileBreakpoint)) {
            // On mobile, only set up touch events for momentum, no grab cursor or mouse events
            return this.setupMobileOnlyScroll(container, finalConfig);
        }

        // Full desktop functionality
        return this.setupFullDragScroll(container, finalConfig);
    }

    /**
     * Sets up mobile-only mode with no custom touch handling
     */
    private static setupMobileOnlyScroll(
        container: HTMLElement,
        config: Required<DragScrollConfig>
    ): () => void {
        // On mobile, we don't want any custom touch handling
        // Let the native scrolling handle everything completely
        // Just ensure no grab cursor is set
        container.style.cursor = '';

        // Return a minimal cleanup function
        return () => {
            container.style.cursor = '';
            container.style.scrollBehavior = '';
        };
    }

    /**
     * Sets up full drag-to-scroll functionality for desktop
     */
    private static setupFullDragScroll(
        container: HTMLElement,
        config: Required<DragScrollConfig>
    ): () => void {
        // State variables
        let isDown = false;
        let startX: number;
        let scrollLeft: number;
        let velocity = 0;
        let momentum = 0;
        let lastX = 0;
        let lastTime = 0;

        // Touch state variables
        let touchStartX: number;
        let touchScrollLeft: number;
        let touchVelocity = 0;
        let touchLastX = 0;
        let touchLastTime = 0;

        // Mouse event handlers
        const handleMouseDown = (e: MouseEvent) => {
            isDown = true;
            container.classList.add('active');
            startX = e.pageX - container.offsetLeft;
            scrollLeft = container.scrollLeft;
            lastX = e.pageX;
            lastTime = Date.now();
            velocity = 0;
            container.style.cursor = 'grabbing';
            container.style.scrollBehavior = 'auto';
            e.preventDefault();
        };

        const handleMouseLeave = () => {
            isDown = false;
            container.classList.remove('active');
            container.style.cursor = 'grab';
            container.style.scrollBehavior = 'smooth';
            applyMomentum();
        };

        const handleMouseUp = () => {
            isDown = false;
            container.classList.remove('active');
            container.style.cursor = 'grab';
            container.style.scrollBehavior = 'smooth';
            applyMomentum();
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (!isDown) return;
            e.preventDefault();

            const currentTime = Date.now();
            const currentX = e.pageX;
            const timeDelta = currentTime - lastTime;
            const xDelta = currentX - lastX;

            if (timeDelta > 0) {
                velocity = xDelta / timeDelta;
            }

            const x = e.pageX - container.offsetLeft;
            const walk = (x - startX) * config.mouseSpeed;
            container.scrollLeft = scrollLeft - walk;

            lastX = currentX;
            lastTime = currentTime;
        };

        const handleClick = (e: MouseEvent) => {
            if (container.classList.contains('active')) {
                e.preventDefault();
                e.stopPropagation();
            }
        };

        // Touch event handlers
        const handleTouchStart = (e: TouchEvent) => {
            touchStartX = e.touches[0].pageX;
            touchScrollLeft = container.scrollLeft;
            touchLastX = e.touches[0].pageX;
            touchLastTime = Date.now();
            touchVelocity = 0;
            container.style.scrollBehavior = 'auto';
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!touchStartX) return;

            const currentTime = Date.now();
            const currentX = e.touches[0].pageX;
            const timeDelta = currentTime - touchLastTime;
            const xDelta = currentX - touchLastX;

            if (timeDelta > 0) {
                touchVelocity = xDelta / timeDelta;
            }

            const x = e.touches[0].pageX;
            const walk = (touchStartX - x) * config.touchSpeed;
            container.scrollLeft = touchScrollLeft + walk;

            touchLastX = currentX;
            touchLastTime = currentTime;
        };

        const handleTouchEnd = () => {
            touchStartX = 0;
            container.style.scrollBehavior = 'smooth';

            if (Math.abs(touchVelocity) > config.momentumThreshold) {
                let touchMomentum = touchVelocity * config.touchMomentumScale;

                function touchMomentumScroll() {
                    if (Math.abs(touchMomentum) > 0.5) {
                        container.scrollLeft += touchMomentum;
                        touchMomentum *= config.touchFriction;
                        requestAnimationFrame(touchMomentumScroll);
                    }
                }

                requestAnimationFrame(touchMomentumScroll);
            }
        };

        // Momentum functions
        function applyMomentum() {
            if (Math.abs(velocity) > config.momentumThreshold) {
                momentum = velocity * config.mouseMomentumScale;
                requestAnimationFrame(momentumScroll);
            }
        }

        function momentumScroll() {
            if (Math.abs(momentum) > 0.5) {
                container.scrollLeft -= momentum;
                momentum *= config.mouseFriction;
                requestAnimationFrame(momentumScroll);
            }
        }

        // Add event listeners
        container.addEventListener('mousedown', handleMouseDown);
        container.addEventListener('mouseleave', handleMouseLeave);
        container.addEventListener('mouseup', handleMouseUp);
        container.addEventListener('mousemove', handleMouseMove);
        container.addEventListener('click', handleClick);
        container.addEventListener('touchstart', handleTouchStart, { passive: true });
        container.addEventListener('touchmove', handleTouchMove, { passive: true });
        container.addEventListener('touchend', handleTouchEnd);

        // Set initial cursor
        container.style.cursor = 'grab';

        // Return cleanup function
        return () => {
            container.removeEventListener('mousedown', handleMouseDown);
            container.removeEventListener('mouseleave', handleMouseLeave);
            container.removeEventListener('mouseup', handleMouseUp);
            container.removeEventListener('mousemove', handleMouseMove);
            container.removeEventListener('click', handleClick);
            container.removeEventListener('touchstart', handleTouchStart);
            container.removeEventListener('touchmove', handleTouchMove);
            container.removeEventListener('touchend', handleTouchEnd);

            // Reset styles
            container.style.cursor = '';
            container.style.scrollBehavior = '';
            container.classList.remove('active');
        };
    }
} 