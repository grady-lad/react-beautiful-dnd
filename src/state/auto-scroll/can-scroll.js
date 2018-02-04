// @flow
import { add, apply, isEqual, subtract } from '../position';
// TODO: state reaching into VIEW :(
import getWindowScroll from '../../window/get-window-scroll';
import getViewport from '../../window/get-viewport';
import getMaxScroll from '../get-max-scroll';
import type {
  ClosestScrollable,
  DroppableDimension,
  Spacing,
  Position,
  Area,
} from '../../types';

type CanScrollArgs = {|
  max: Position,
  current: Position,
  change: Position,
|}

const origin: Position = { x: 0, y: 0 };

// TODO: should this be round or floor?
const smallestSigned = apply((value: number) => {
  if (value === 0) {
    return 0;
  }
  return value > 0 ? 1 : -1;
});

type GetRemainderArgs = {|
  current: Position,
  max: Position,
  change: Position,
|}

// We need to figure out how much of the movement
// cannot be done with a scroll
export const getOverlap = (() => {
  const getRemainder = (target: number, max: number): number => {
    if (target === 0) {
      return 0;
    }

    if (target < 0) {
      return target;
    }
    if (target > max) {
      return target - max;
    }
    return 0;
  };

  return ({
    current,
    max,
    change,
  }: GetRemainderArgs): ?Position => {
    const targetScroll: Position = add(current, change);

    console.log('target', targetScroll);
    console.log('max', max);
    console.log('x', getRemainder(targetScroll.x, max.x));
    console.log('y', getRemainder(targetScroll.y, max.y));

    const overlap: Position = {
      x: getRemainder(targetScroll.x, max.x),
      y: getRemainder(targetScroll.y, max.y),
    };

    console.log('overlap', overlap);

    if (isEqual(overlap, origin)) {
      return null;
    }

    return overlap;
  };
})();

export const canPartiallyScroll = ({
  max,
  current,
  change,
}: CanScrollArgs): boolean => {
  // Only need to be able to move the smallest amount in the desired direction
  const smallestChange: Position = smallestSigned(change);
  console.log('smallest change', smallestChange);

  const overlap: ?Position = getOverlap({
    max, current, change: smallestChange,
  });

  // there will be no remainder if you can partially scroll
  return !overlap;
};

const getMaxWindowScroll = (): Position => {
  const el: ?HTMLElement = document.documentElement;

  if (!el) {
    console.error('Cannot find document element');
    return origin;
  }

  const viewport: Area = getViewport();

  // window.innerWidth / innerHeight includes scrollbar
  // however the scrollHeight / scrollWidth do not :(

  const maxScroll: Position = getMaxScroll({
    scrollHeight: el.scrollHeight,
    scrollWidth: el.scrollWidth,
    width: viewport.width,
    height: viewport.height,
  });

  return maxScroll;
};

export const canScrollWindow = (change: Position): boolean => {
  const maxScroll: Position = getMaxWindowScroll();
  const currentScroll: Position = getWindowScroll();

  return canPartiallyScroll({
    current: currentScroll,
    max: maxScroll,
    change,
  });
};

export const canScrollDroppable = (
  droppable: DroppableDimension,
  change: Position,
): boolean => {
  const closestScrollable: ?ClosestScrollable = droppable.viewport.closestScrollable;
  // Cannot scroll when there is no scroll container!
  if (!closestScrollable) {
    console.log('no closest scrollable');
    return false;
  }

  console.log('closestScrollable min', closestScrollable.scroll.current);
  console.log('closestScrollable max', closestScrollable.scroll.max);
  console.log('change', change);

  return canPartiallyScroll({
    current: closestScrollable.scroll.current,
    max: closestScrollable.scroll.max,
    change,
  });
};

export const getWindowOverlap = (change: Position): ?Position => {
  if (!canScrollWindow(change)) {
    return null;
  }

  const max: Position = getMaxWindowScroll();
  const current: Position = getWindowScroll();

  return getOverlap({
    current,
    max,
    change,
  });
};

export const getDroppableOverlap = (droppable: DroppableDimension, change: Position): ?Position => {
  if (!canScrollDroppable(droppable, change)) {
    console.log('cannot scroll droppable');
    return null;
  }

  const closestScrollable: ?ClosestScrollable = droppable.viewport.closestScrollable;
  // Cannot scroll when there is no scroll container!
  if (!closestScrollable) {
    return null;
  }

  return getOverlap({
    current: closestScrollable.scroll.current,
    max: closestScrollable.scroll.max,
    change,
  });
};