import type React from 'react';

/*
 * Tells a deliberate drag on a control apart from a finger that only scrolls the page across it.
 *
 * With `touch-action: none` the browser never scrolls when a swipe starts on a control, so every swipe
 * became a drag that changed the value. The controls let the page pan vertically instead
 * ({@link TOUCH_ACTION}), and a touch only becomes a drag
 * - when it starts sideways, which the browser does not pan, or
 * - when the finger rested for HOLD_MS first; the page is then kept from scrolling.
 * A touch the browser takes over for scrolling ends in `pointercancel` before it became a drag and changes
 * nothing. Neither does a touch that only stops a page that is still scrolling.
 *
 * Mouse and pen do not scroll by dragging, so for them any move beyond the threshold is a drag.
 */

/** `touch-action` for an element whose gestures run through a {@link TouchGestureGuard} */
export const TOUCH_ACTION = 'pan-y';

/** Movement in px up to which a gesture still counts as a tap */
const DRAG_THRESHOLD = 8;
/** A touch has to move this much more sideways than vertically to drag without resting first */
const HORIZONTAL_RATIO = 1.5;
/** How long a finger has to rest before it may drag in any direction */
const HOLD_MS = 250;
/** A touch this soon after something around the control scrolled only stops that scroll */
const SCROLL_SETTLE_MS = 400;

/** The direction a control reads its value from */
export type GestureAxis = 'x' | 'y' | 'both';

let lastScroll: { target: EventTarget | null; time: number } = { target: null, time: 0 };
let scrollListening = false;

function listenForScroll(): void {
    if (scrollListening || typeof document === 'undefined') {
        return;
    }
    scrollListening = true;
    // Scroll events do not bubble, but a capturing listener on the document sees those of every element
    document.addEventListener(
        'scroll',
        e => {
            lastScroll = { target: e.target, time: performance.now() };
        },
        { capture: true, passive: true },
    );
}

/** Whether the page or a container holding the element was scrolling a moment ago */
function scrolledAround(el: Element): boolean {
    if (performance.now() - lastScroll.time > SCROLL_SETTLE_MS) {
        return false;
    }
    const { target } = lastScroll;
    return target instanceof Document || (target instanceof Element && target.contains(el));
}

export class TouchGestureGuard {
    private readonly target: { current: HTMLElement | null } | undefined;
    private element: HTMLElement | null = null;

    /** null while no gesture runs */
    private pointerId: number | null = null;
    private touch = false;
    private axis: GestureAxis = 'both';
    private startX = 0;
    private startY = 0;
    private startTime = 0;
    /** The pointer went beyond the threshold, so the gesture is neither a tap nor a hold any more */
    private travelled = false;
    private phase: 'pending' | 'drag' | 'aborted' = 'pending';

    /** A ref passed in also gets the element handed to {@link ref}, e.g. for geometry */
    constructor(target?: { current: HTMLElement | null }) {
        this.target = target;
        listenForScroll();
    }

    /** Callback ref for the element the gesture runs on */
    readonly ref = (el: HTMLElement | null): void => {
        if (this.target) {
            this.target.current = el;
        }
        if (el === this.element) {
            return;
        }
        this.element?.removeEventListener('touchmove', this.onTouchMove);
        this.element = el;
        // Not passive, and registered before any touch starts: a browser only lets such a listener stop scrolling
        el?.addEventListener('touchmove', this.onTouchMove, { passive: false });
    };

    private readonly onTouchMove = (e: TouchEvent): void => {
        if (e.cancelable && (this.phase === 'drag' || this.held())) {
            e.preventDefault();
        }
    };

    /** A gesture runs and a finger is driving it */
    get touching(): boolean {
        return this.pointerId !== null && this.touch;
    }

    /** A gesture runs that is a drag */
    get dragging(): boolean {
        return this.pointerId !== null && this.phase === 'drag';
    }

    /** A gesture runs that may still become a tap or a drag */
    get undecided(): boolean {
        return this.pointerId !== null && this.phase === 'pending';
    }

    /** The running gesture went beyond the tap threshold */
    get moved(): boolean {
        return this.pointerId !== null && this.travelled;
    }

    private held(): boolean {
        return this.undecided && !this.travelled && performance.now() - this.startTime >= HOLD_MS;
    }

    /**
     * Start a gesture on pointerdown.
     *
     * @param e the pointerdown event
     * @param axis the direction the control reads; a touch moving across it is not taken as a drag
     * @returns false when the pointer is to be ignored: a second finger, or a touch that stops a scroll
     */
    start(e: React.PointerEvent, axis: GestureAxis = 'both'): boolean {
        // A second finger must not take over; a new primary pointer means the previous gesture is gone
        if (this.pointerId !== null && !e.isPrimary) {
            return false;
        }
        this.pointerId = e.pointerId;
        this.touch = e.pointerType === 'touch';
        this.axis = axis;
        this.startX = e.clientX;
        this.startY = e.clientY;
        this.startTime = performance.now();
        this.travelled = false;
        this.phase = this.touch && scrolledAround(e.currentTarget) ? 'aborted' : 'pending';
        return this.phase === 'pending';
    }

    /**
     * Follow the pointer on pointermove.
     *
     * @param e the pointermove event
     * @returns whether the gesture is a drag, so the control should follow the pointer
     */
    move(e: React.PointerEvent): boolean {
        if (e.pointerId !== this.pointerId) {
            return false;
        }
        if (this.phase !== 'pending') {
            return this.phase === 'drag';
        }
        const dx = e.clientX - this.startX;
        const dy = e.clientY - this.startY;
        if (Math.hypot(dx, dy) <= DRAG_THRESHOLD) {
            return false;
        }
        const held = this.held();
        this.travelled = true;
        if (!this.touch) {
            const along = this.axis === 'x' ? Math.abs(dx) : this.axis === 'y' ? Math.abs(dy) : Math.hypot(dx, dy);
            if (along > DRAG_THRESHOLD) {
                this.phase = 'drag';
            }
        } else if (held || (this.axis !== 'y' && Math.abs(dx) > Math.abs(dy) * HORIZONTAL_RATIO)) {
            this.phase = 'drag';
        }
        // Otherwise a touch is still open: the browser either scrolls and cancels it, or it stays no drag
        return this.phase === 'drag';
    }

    /**
     * Finish the gesture on pointerup.
     *
     * @param e the pointerup event
     * @returns what the gesture was; null when it is to be ignored
     */
    end(e: React.PointerEvent): 'tap' | 'drag' | null {
        return e.pointerId === this.pointerId ? this.finish() : null;
    }

    /**
     * Finish the gesture on pointercancel, mostly because the browser scrolls the page instead.
     *
     * @param e the pointercancel event
     * @returns 'drag' when a drag was already under way, so the value it reached stands
     */
    cancel(e: React.PointerEvent): 'drag' | null {
        if (e.pointerId !== this.pointerId) {
            return null;
        }
        return this.finish() === 'drag' ? 'drag' : null;
    }

    /**
     * Finish the running gesture without knowing the pointer, e.g. when a component reports the end itself.
     *
     * @returns what the gesture was; null when none ran or it is to be ignored
     */
    finish(): 'tap' | 'drag' | null {
        if (this.pointerId === null) {
            return null;
        }
        const result = this.phase === 'drag' ? 'drag' : this.phase === 'pending' && !this.travelled ? 'tap' : null;
        this.pointerId = null;
        this.phase = 'pending';
        this.travelled = false;
        return result;
    }

    /** Drop the running gesture, e.g. after a long press opened a dialog */
    abort(): void {
        if (this.pointerId !== null) {
            this.phase = 'aborted';
        }
    }
}
