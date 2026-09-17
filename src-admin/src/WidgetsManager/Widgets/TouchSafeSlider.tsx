import React from 'react';
import { Slider, type SliderProps } from '@mui/material';

import { TOUCH_ACTION, TouchGestureGuard } from './touchGesture';

type SliderValue = number | readonly number[];

/**
 * MUI Slider that a finger scrolling the page across it leaves alone.
 *
 * MUI reports a value on the very first touch and blocks panning on the whole slider. Here the page may
 * pan vertically, and as long as a touch may still turn out to be a scroll, the values MUI reports are
 * held back: they are passed on once the touch is a drag or a tap, and dropped when the browser scrolls.
 * Mouse, pen and keyboard work as with a plain Slider.
 */
export default function TouchSafeSlider<Value extends SliderValue = number | number[]>(
    props: SliderProps<'span', object, Value>,
): React.JSX.Element {
    const { onChange, onChangeCommitted, onPointerDown, onPointerMove, onPointerCancel, sx, ...rest } = props;
    const [guard] = React.useState(() => new TouchGestureGuard());
    /** Latest change MUI reported while the touch was undecided */
    const heldChange = React.useRef<{ event: Event; value: Value; thumb: number } | null>(null);
    const lastPointer = React.useRef({ x: 0, y: 0 });
    /** Set while MUI is made to end a touch that scrolled away; the commit it reports then must be dropped */
    const dropCommit = React.useRef(false);

    const MuiSlider = Slider as unknown as React.ComponentType<SliderProps<'span', object, Value>>;

    return (
        <MuiSlider
            {...rest}
            ref={guard.ref}
            onPointerDown={e => {
                heldChange.current = null;
                lastPointer.current = { x: e.clientX, y: e.clientY };
                guard.start(e, 'x');
                onPointerDown?.(e);
            }}
            onPointerMove={e => {
                lastPointer.current = { x: e.clientX, y: e.clientY };
                if (guard.move(e) && heldChange.current) {
                    const { event, value, thumb } = heldChange.current;
                    heldChange.current = null;
                    onChange?.(event, value, thumb);
                }
                onPointerMove?.(e);
            }}
            onPointerCancel={e => {
                const touch = guard.touching;
                const drag = guard.cancel(e) === 'drag';
                heldChange.current = null;
                // MUI ignores pointercancel and would keep the thumb active, waiting for a pointerup that never
                // comes. Hand it one, and drop the commit that follows unless a drag was already under way.
                dropCommit.current = touch && !drag;
                e.currentTarget.ownerDocument.dispatchEvent(
                    new PointerEvent('pointerup', {
                        bubbles: true,
                        pointerId: e.pointerId,
                        pointerType: e.pointerType,
                        clientX: lastPointer.current.x,
                        clientY: lastPointer.current.y,
                    }),
                );
                dropCommit.current = false;
                onPointerCancel?.(e);
            }}
            onChange={(event, value, thumb) => {
                if (!guard.touching || guard.dragging) {
                    onChange?.(event, value, thumb);
                } else if (guard.undecided) {
                    heldChange.current = { event, value, thumb };
                }
                // Otherwise the touch only stops a scroll
            }}
            onChangeCommitted={(event, value) => {
                if (dropCommit.current) {
                    return;
                }
                const touch = guard.touching;
                const gesture = guard.finish();
                const held = heldChange.current;
                heldChange.current = null;
                if (!touch) {
                    onChangeCommitted?.(event, value);
                    return;
                }
                if (gesture === 'tap' && held) {
                    onChange?.(held.event, value, held.thumb);
                }
                if (gesture) {
                    onChangeCommitted?.(event, value);
                }
            }}
            sx={[{ touchAction: TOUCH_ACTION }, ...(Array.isArray(sx) ? sx : [sx])]}
        />
    );
}
