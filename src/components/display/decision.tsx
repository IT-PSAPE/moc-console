import { Children, isValidElement, type ReactNode } from 'react'

type DecisionRootProps<T> = {
    value: T
    loading?: boolean
    children: ReactNode
}

type DecisionSlotProps = {
    children: ReactNode
}

type DecisionDataProps<T> = {
    children: ReactNode | ((data: T) => ReactNode)
}

function isEmpty(value: unknown): boolean {
    if (value === null || value === undefined) return true
    if (Array.isArray(value) && value.length === 0) return true
    return false
}

function DecisionRoot<T>({ value, loading = false, children }: DecisionRootProps<T>) {
    let loadingSlot: ReactNode = null
    let emptySlot: ReactNode = null
    let dataSlot: DecisionDataProps<T>['children'] = null

    Children.forEach(children, (child) => {
        if (!isValidElement(child)) return

        if (child.type === DecisionLoading) loadingSlot = (child.props as DecisionSlotProps).children
        if (child.type === DecisionEmpty) emptySlot = (child.props as DecisionSlotProps).children
        if (child.type === DecisionData) dataSlot = (child.props as DecisionDataProps<T>).children
    })

    if (loading) return <>{loadingSlot}</>
    if (isEmpty(value)) return <>{emptySlot}</>

    const renderData = dataSlot as ((data: T) => ReactNode) | null

    if (typeof renderData === 'function') return <>{renderData(value)}</>
    return <>{dataSlot}</>
}

function DecisionLoading({ children }: DecisionSlotProps) {
    return <>{children}</>
}

function DecisionEmpty({ children }: DecisionSlotProps) {
    return <>{children}</>
}

function DecisionData<T>({ children }: DecisionDataProps<T>) {
    return <>{typeof children === 'function' ? null : children}</>
}

export const Decision = {
    Root: DecisionRoot,
    Loading: DecisionLoading,
    Empty: DecisionEmpty,
    Data: DecisionData,
}
