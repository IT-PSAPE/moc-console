import { cn } from "@/utils/cn"
import type { HTMLAttributes } from "react"
import React, { createContext, useContext, useState } from "react"

type TabsContextState = {
    value?: string
    setValue: React.Dispatch<React.SetStateAction<string>>
}

const TabContext = createContext<TabsContextState | null>(null);

type TabsRootProps = {
    children: React.ReactNode
    defaultTab?: string
    value?: string
    onValueChange?: (value: string) => void
}

function TabsRoot({ children, defaultTab, value: controlledValue, onValueChange }: TabsRootProps) {
    const [uncontrolledValue, setUncontrolledValue] = useState<string>(defaultTab ?? 'null');

    const isControlled = controlledValue !== undefined;
    const value = isControlled ? controlledValue : uncontrolledValue;
    const setValue: React.Dispatch<React.SetStateAction<string>> = (next) => {
        const nextValue = typeof next === 'function' ? next(value) : next;
        if (!isControlled) setUncontrolledValue(nextValue);
        onValueChange?.(nextValue);
    };

    const context: TabsContextState = { value, setValue };

    return (
        <TabContext.Provider value={context}>
            {children}
        </TabContext.Provider>
    );
}

function TabsList({children, className}: HTMLAttributes<HTMLDivElement>){
    return (
        <div className={cn('flex gap-3 px-3 border-b border-tertiary', className)}>
            {children}
        </div>
    )
}

function TabsTab({children, className, value}: HTMLAttributes<HTMLDivElement> & {value: string}){
    const { setValue, value: selectedValue} = useTabContext();

    const current = value === selectedValue;

    function handleClick() {
        setValue(value);
    }

    return (
        <div className={cn('py-1.5 border-b-2 cursor-pointer paragraph-sm', current ? 'border-brand' : 'border-transparent', className)} onClick={handleClick}>
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