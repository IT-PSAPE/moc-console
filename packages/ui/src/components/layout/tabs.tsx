import { cn } from "@moc/utils/cn"
import { cv } from "@moc/utils/cv"
import type { HTMLAttributes } from "react"
import React, { createContext, useContext, useState } from "react"

type TabsVariant = 'default' | 'pill'

type TabsContextState = {
    value?: string
    setValue: React.Dispatch<React.SetStateAction<string>>
    variant: TabsVariant
}

const TabContext = createContext<TabsContextState | null>(null);

type TabsRootProps = {
    children: React.ReactNode
    defaultTab?: string
    value?: string
    onValueChange?: (value: string) => void
    variant?: TabsVariant
}

const tabsListVariants = cv({
    base: ['flex'],
    variants: {
        variant: {
            default: ['gap-3 px-3 border-b border-tertiary'],
            pill: ['gap-1 items-center'],
        },
    },
    defaultVariants: { variant: 'default' },
})

const tabsTabVariants = cv({
    base: ['cursor-pointer transition-colors'],
    variants: {
        variant: {
            default: ['py-1.5 border-b-2 paragraph-sm'],
            pill: ['px-3 py-1.5 rounded-md label-sm'],
        },
        state: {
            'default-active': ['border-brand'],
            'default-inactive': ['border-transparent'],
            'pill-active': ['bg-primary text-primary border border-secondary shadow-xs'],
            'pill-inactive': ['text-tertiary hover:text-primary hover:bg-secondary'],
        },
    },
})

function TabsRoot({ children, defaultTab, value: controlledValue, onValueChange, variant = 'default' }: TabsRootProps) {
    const [uncontrolledValue, setUncontrolledValue] = useState<string>(defaultTab ?? 'null');

    const isControlled = controlledValue !== undefined;
    const value = isControlled ? controlledValue : uncontrolledValue;
    const setValue: React.Dispatch<React.SetStateAction<string>> = (next) => {
        const nextValue = typeof next === 'function' ? next(value) : next;
        if (!isControlled) setUncontrolledValue(nextValue);
        onValueChange?.(nextValue);
    };

    const context: TabsContextState = { value, setValue, variant };

    return (
        <TabContext.Provider value={context}>
            {children}
        </TabContext.Provider>
    );
}

function TabsList({children, className}: HTMLAttributes<HTMLDivElement>){
    const { variant } = useTabContext();
    return (
        <div className={cn(tabsListVariants({ variant }), className)}>
            {children}
        </div>
    )
}

function TabsTab({children, className, value}: HTMLAttributes<HTMLDivElement> & {value: string}){
    const { setValue, value: selectedValue, variant } = useTabContext();

    const current = value === selectedValue;
    const state = `${variant}-${current ? 'active' : 'inactive'}` as
        | 'default-active'
        | 'default-inactive'
        | 'pill-active'
        | 'pill-inactive';

    function handleClick() {
        setValue(value);
    }

    return (
        <div className={cn(tabsTabVariants({ variant, state }), className)} onClick={handleClick}>
            {children}
        </div>
    )
}

function TabsPanels({children, className}: HTMLAttributes<HTMLDivElement>){
    return (
        <div className={cn(className)}>
            {children}
        </div>
    )
}

function TabsPanel({children, className, value}: HTMLAttributes<HTMLDivElement> & {value: string}){
    const { value: selectedValue } = useTabContext();

    if (value !== selectedValue) return null;

    return (
        <div className={cn(className)}>
            {children}
        </div>
    )
}

export function useTabContext() {
    const context = useContext(TabContext);

    if (!context) throw new Error("useTabContext must be used within a TabContextProvider");

    return context;
}

export const Tabs = Object.assign(TabsRoot, {
    List: TabsList,
    Tab: TabsTab,
    Panels: TabsPanels,
    Panel: TabsPanel,
})
