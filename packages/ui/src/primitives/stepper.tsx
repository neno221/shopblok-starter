// Vendored from ReUI (`shadcn add @reui/stepper`, CLI 4.21.4, style base-vega), 2026-10-17. MIT, see
// packages/ui/NOTICE.md. Edited (SETUP.md, "Primitives (T31)"): a trigger is at least 44 × 44 px
// (`min-h-11 min-w-11`, D32) and aligns its text to the start, the focus ring is at full strength
// (D35), a title wraps (`leading-snug`, not `leading-none`), and the arrow keys follow the reading
// direction (ArrowLeft goes to the next step in a right-to-left horizontal stepper; the direction
// is the `dir` prop, else Base UI's `DirectionProvider`). Fixed from upstream (PR 53 review): the
// tab and panel ids carry a `useId()` prefix, so two steppers on a page don't repeat ids; a
// content is a `tabpanel` labelled by its tab; the arrow keys, Home and End move among the enabled
// triggers in DOM order (upstream registered them in mount order, kept unmounted ones and
// stopped at a disabled one); `stepsCount` counts the items however deep they sit (upstream only
// looked at the Stepper's direct children, by a `displayName` it never set).
// A client component because it keeps the active step in state and moves focus among its triggers.
"use client";

import type { HTMLAttributes, ReactNode } from "react";
import {
  Children,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDirection } from "@base-ui/react/direction-provider";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";

import { cn } from "@shopblok/ui/lib/utils";

// Types
type StepperOrientation = "horizontal" | "vertical";
type StepState = "active" | "completed" | "inactive" | "loading";
type StepIndicators = {
  active?: React.ReactNode;
  completed?: React.ReactNode;
  inactive?: React.ReactNode;
  loading?: React.ReactNode;
};

interface StepperContextValue {
  activeStep: number;
  setActiveStep: (step: number) => void;
  stepsCount: number;
  orientation: StepperOrientation;
  /** Whether the stepper reads right to left, so the horizontal arrow keys swap. */
  rtl: boolean;
  /** The prefix of this stepper's tab and panel ids, unique on the page. */
  baseId: string;
  /** This stepper's enabled triggers, in DOM order (not a nested stepper's). */
  getTriggers: () => HTMLElement[];
  focusNext: (current: HTMLElement) => void;
  focusPrev: (current: HTMLElement) => void;
  focusFirst: () => void;
  focusLast: () => void;
  indicators: StepIndicators;
}

interface StepItemContextValue {
  step: number;
  state: StepState;
  isDisabled: boolean;
  isLoading: boolean;
}

const StepperContext = createContext<StepperContextValue | undefined>(undefined);
const StepItemContext = createContext<StepItemContextValue | undefined>(undefined);

function useStepper() {
  const ctx = useContext(StepperContext);
  if (!ctx) throw new Error("useStepper must be used within a Stepper");
  return ctx;
}

function useStepItem() {
  const ctx = useContext(StepItemContext);
  if (!ctx) throw new Error("useStepItem must be used within a StepperItem");
  return ctx;
}

interface StepperProps extends HTMLAttributes<HTMLDivElement> {
  defaultValue?: number;
  value?: number;
  onValueChange?: (value: number) => void;
  orientation?: StepperOrientation;
  indicators?: StepIndicators;
}

function Stepper({
  defaultValue = 1,
  value,
  onValueChange,
  orientation = "horizontal",
  className,
  children,
  indicators = {},
  dir,
  ...props
}: StepperProps) {
  const contextDirection = useDirection();
  const rtl = (dir === "rtl" || dir === "ltr" ? dir : contextDirection) === "rtl";
  const [activeStep, setActiveStep] = useState(defaultValue);
  const baseId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  // Read from the DOM on each key press: always in order, without disabled or unmounted triggers.
  const getTriggers = useCallback(() => {
    const root = rootRef.current;
    if (!root) return [];
    return [
      ...root.querySelectorAll<HTMLElement>("[data-slot=stepper-trigger]:not(:disabled)"),
    ].filter((node) => node.closest("[data-slot=stepper]") === root);
  }, []);

  const handleSetActiveStep = useCallback(
    (step: number) => {
      if (value === undefined) {
        setActiveStep(step);
      }
      onValueChange?.(step);
    },
    [value, onValueChange],
  );

  const currentStep = value ?? activeStep;

  // Keyboard navigation logic
  const focusBy = useCallback(
    (current: HTMLElement, offset: number) => {
      const triggers = getTriggers();
      if (triggers.length === 0) return;
      const index = triggers.indexOf(current);
      // From a trigger that is not in the list (none should be), the first or last one.
      const next =
        index === -1
          ? offset > 0
            ? 0
            : triggers.length - 1
          : (index + offset + triggers.length) % triggers.length;
      triggers[next]?.focus();
    },
    [getTriggers],
  );
  const focusNext = useCallback((current: HTMLElement) => focusBy(current, 1), [focusBy]);
  const focusPrev = useCallback((current: HTMLElement) => focusBy(current, -1), [focusBy]);
  const focusFirst = useCallback(() => getTriggers()[0]?.focus(), [getTriggers]);
  const focusLast = useCallback(() => getTriggers().at(-1)?.focus(), [getTriggers]);

  // Context value
  const contextValue = useMemo<StepperContextValue>(
    () => ({
      activeStep: currentStep,
      setActiveStep: handleSetActiveStep,
      stepsCount: countItems(children),
      orientation,
      rtl,
      baseId,
      getTriggers,
      focusNext,
      focusPrev,
      focusFirst,
      focusLast,
      indicators,
    }),
    [
      currentStep,
      handleSetActiveStep,
      children,
      orientation,
      rtl,
      baseId,
      getTriggers,
      focusNext,
      focusPrev,
      focusFirst,
      focusLast,
      indicators,
    ],
  );

  return (
    <StepperContext.Provider value={contextValue}>
      <div
        ref={rootRef}
        role="tablist"
        aria-orientation={orientation}
        data-slot="stepper"
        className={cn("w-full", className)}
        data-orientation={orientation}
        dir={dir}
        {...props}
      >
        {children}
      </div>
    </StepperContext.Provider>
  );
}

/** The StepperItems among `children`, however deep (inside a StepperNav, a fragment, a wrapper). */
function countItems(children: ReactNode): number {
  return Children.toArray(children).reduce<number>((count, child) => {
    if (!isValidElement<{ children?: ReactNode }>(child)) return count;
    if (child.type === StepperItem) return count + 1;
    return count + countItems(child.props.children);
  }, 0);
}

interface StepperItemProps extends React.HTMLAttributes<HTMLDivElement> {
  step: number;
  completed?: boolean;
  disabled?: boolean;
  loading?: boolean;
}

function StepperItem({
  step,
  completed = false,
  disabled = false,
  loading = false,
  className,
  children,
  ...props
}: StepperItemProps) {
  const { activeStep } = useStepper();

  const state: StepState =
    completed || step < activeStep ? "completed" : activeStep === step ? "active" : "inactive";

  const isLoading = loading && step === activeStep;

  return (
    <StepItemContext.Provider value={{ step, state, isDisabled: disabled, isLoading }}>
      <div
        data-slot="stepper-item"
        className={cn(
          "group/step flex items-center justify-center not-last:flex-1 group-data-[orientation=horizontal]/stepper-nav:flex-row group-data-[orientation=vertical]/stepper-nav:flex-col",
          className,
        )}
        data-state={state}
        {...(isLoading ? { "data-loading": true } : {})}
        {...props}
      >
        {children}
      </div>
    </StepItemContext.Provider>
  );
}

type StepperTriggerProps = useRender.ComponentProps<"button">;

function StepperTrigger({ className, children, tabIndex, render, ...props }: StepperTriggerProps) {
  const { state, isLoading } = useStepItem();
  const stepperCtx = useStepper();
  const {
    setActiveStep,
    activeStep,
    baseId,
    focusNext,
    focusPrev,
    focusFirst,
    focusLast,
    orientation,
    rtl,
  } = stepperCtx;
  const { step, isDisabled } = useStepItem();
  const isSelected = activeStep === step;
  const id = `${baseId}-tab-${step}`;
  const panelId = `${baseId}-panel-${step}`;

  // The horizontal arrow that leads on to the next step: the right one, the left in right-to-left.
  const nextArrow = orientation === "horizontal" && rtl ? "ArrowLeft" : "ArrowRight";
  const previousArrow = orientation === "horizontal" && rtl ? "ArrowRight" : "ArrowLeft";

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    switch (e.key) {
      case nextArrow:
      case "ArrowDown":
        e.preventDefault();
        focusNext(e.currentTarget);
        break;
      case previousArrow:
      case "ArrowUp":
        e.preventDefault();
        focusPrev(e.currentTarget);
        break;
      case "Home":
        e.preventDefault();
        focusFirst();
        break;
      case "End":
        e.preventDefault();
        focusLast();
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        setActiveStep(step);
        break;
    }
  };

  const defaultProps = {
    role: "tab",
    id,
    "aria-selected": isSelected,
    "aria-controls": panelId,
    tabIndex: typeof tabIndex === "number" ? tabIndex : isSelected ? 0 : -1,
    "data-slot": "stepper-trigger",
    "data-state": state,
    "data-loading": isLoading,
    className: cn(
      "inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center text-start outline-none focus-visible:z-10 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-60",
      "gap-2.5 rounded-full",
      className,
    ),
    onClick: () => setActiveStep(step),
    onKeyDown: handleKeyDown,
    disabled: isDisabled,
    children,
  };

  return useRender({
    defaultTagName: "button",
    render,
    props: mergeProps<"button">(defaultProps, props),
  });
}

function StepperIndicator({ children, className }: React.ComponentProps<"div">) {
  const { state, isLoading } = useStepItem();
  const { indicators } = useStepper();

  return (
    <div
      data-slot="stepper-indicator"
      data-state={state}
      className={cn(
        "border-background bg-accent text-accent-foreground data-[state=completed]:bg-primary data-[state=completed]:text-primary-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground relative flex size-6 shrink-0 items-center justify-center overflow-hidden",
        "rounded-full text-xs",
        className,
      )}
    >
      <div className="absolute">
        {indicators &&
        ((isLoading && indicators.loading) ||
          (state === "completed" && indicators.completed) ||
          (state === "active" && indicators.active) ||
          (state === "inactive" && indicators.inactive))
          ? (isLoading && indicators.loading) ||
            (state === "completed" && indicators.completed) ||
            (state === "active" && indicators.active) ||
            (state === "inactive" && indicators.inactive)
          : children}
      </div>
    </div>
  );
}

function StepperSeparator({ className }: React.ComponentProps<"div">) {
  const { state } = useStepItem();

  return (
    <div
      data-slot="stepper-separator"
      data-state={state}
      className={cn(
        "bg-muted rounded-sm m-0.5 group-data-[orientation=horizontal]/stepper-nav:h-0.5 group-data-[orientation=horizontal]/stepper-nav:flex-1 group-data-[orientation=vertical]/stepper-nav:h-12 group-data-[orientation=vertical]/stepper-nav:w-0.5",
        className,
      )}
    />
  );
}

function StepperTitle({ children, className }: React.ComponentProps<"h3">) {
  const { state } = useStepItem();

  return (
    <h3
      data-slot="stepper-title"
      data-state={state}
      className={cn("text-sm leading-snug font-medium", className)}
    >
      {children}
    </h3>
  );
}

function StepperDescription({ children, className }: React.ComponentProps<"div">) {
  const { state } = useStepItem();

  return (
    <div
      data-slot="stepper-description"
      data-state={state}
      className={cn("text-muted-foreground text-sm", className)}
    >
      {children}
    </div>
  );
}

function StepperNav({ children, className }: React.ComponentProps<"nav">) {
  const { activeStep, orientation } = useStepper();

  return (
    <nav
      data-slot="stepper-nav"
      data-state={activeStep}
      data-orientation={orientation}
      className={cn(
        "group/stepper-nav inline-flex data-[orientation=horizontal]:w-full data-[orientation=horizontal]:flex-row data-[orientation=vertical]:flex-col",
        className,
      )}
    >
      {children}
    </nav>
  );
}

function StepperPanel({ children, className }: React.ComponentProps<"div">) {
  const { activeStep } = useStepper();

  return (
    <div data-slot="stepper-panel" data-state={activeStep} className={cn("w-full", className)}>
      {children}
    </div>
  );
}

interface StepperContentProps extends React.ComponentProps<"div"> {
  value: number;
  forceMount?: boolean;
}

function StepperContent({ value, forceMount, children, className, ...props }: StepperContentProps) {
  const { activeStep, baseId } = useStepper();
  const isActive = value === activeStep;

  if (!forceMount && !isActive) {
    return null;
  }

  return (
    <div
      role="tabpanel"
      id={`${baseId}-panel-${value}`}
      aria-labelledby={`${baseId}-tab-${value}`}
      {...props}
      data-slot="stepper-content"
      data-state={activeStep}
      className={cn("w-full", className, !isActive && forceMount && "hidden")}
      hidden={!isActive && forceMount}
    >
      {children}
    </div>
  );
}

export {
  useStepper,
  useStepItem,
  Stepper,
  StepperItem,
  StepperTrigger,
  StepperIndicator,
  StepperSeparator,
  StepperTitle,
  StepperDescription,
  StepperPanel,
  StepperContent,
  StepperNav,
  type StepperProps,
  type StepperItemProps,
  type StepperTriggerProps,
  type StepperContentProps,
};
