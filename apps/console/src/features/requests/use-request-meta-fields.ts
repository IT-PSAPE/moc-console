import type { ChangeEvent } from "react"
import { useWorkspace } from "@/lib/workspace-context"
import type { Category, Request, RequestCategoryDefinition, Status } from "@moc/types/requests"
import { getCategoryLabel } from "@moc/types/requests"
import { formatUtcIsoForBrowserDateTimeInput, formatUtcIsoInBrowserTimeZone, parseBrowserDateTimeInputToUtcIso } from "@moc/utils/browser-date-time"
import { useDateTimeFields } from "@moc/ui/components/form/use-date-time-fields"
import { useRequests } from "./request-provider"

export type RequestMetaFieldsOptions = {
  request: Request
  categories: RequestCategoryDefinition[]
  editable?: boolean
  onFieldChange?: <K extends keyof Request>(field: K, value: Request[K]) => void
}

type RequestTypeActions = ReturnType<typeof useRequests>["actions"]
type DateTimeActions = ReturnType<typeof useDateTimeFields>["actions"]
type RequestMetaFieldsModel = {
  state: {
    availableCategories: RequestCategoryDefinition[]
    categoryLabel: string
    date: string
    time: string
    isEditable: boolean
    dueDateLabel: string
    dueTimeLabel: string
    createdAtLabel: string
    updatedAtLabel: string
  }
  actions: {
    changeStatus: (value: Status | null) => void
    changeCategory: (category: RequestCategoryDefinition | null) => void
    changeRequestedBy: (event: ChangeEvent<HTMLInputElement>) => void
    changeDate: DateTimeActions["handleDateChange"]
    changeTime: DateTimeActions["handleTimeChange"]
    createType: RequestTypeActions["createRequestType"] | undefined
    renameType: RequestTypeActions["renameRequestType"] | undefined
    setTypeActive: RequestTypeActions["setRequestTypeActive"] | undefined
  }
  meta: { currentWorkspaceId: string | null }
}

export function useRequestMetaFields({ request, categories, editable = false, onFieldChange }: RequestMetaFieldsOptions): RequestMetaFieldsModel {
  const { role, currentWorkspaceId } = useWorkspace()
  const { actions: { createRequestType, renameRequestType, setRequestTypeActive } } = useRequests()
  const canManageTypes = role?.can_manage_roles === true
  const dateTime = useDateTimeFields(formatUtcIsoForBrowserDateTimeInput(request.dueDate), changeDueDate)

  function changeDueDate(value: string): void {
    if (value) onFieldChange?.("dueDate", parseBrowserDateTimeInputToUtcIso(value))
  }

  function changeStatus(value: Status | null): void {
    if (value) onFieldChange?.("status", value)
  }

  function changeCategory(category: RequestCategoryDefinition | null): void {
    if (!category || !onFieldChange) return
    onFieldChange("category", category.key as Category)
    onFieldChange("categoryName", category.name)
  }

  function changeRequestedBy(event: ChangeEvent<HTMLInputElement>): void {
    onFieldChange?.("requestedBy", event.target.value)
  }

  return {
    state: {
      availableCategories: categories.filter((category) => category.active || category.key === request.category),
      categoryLabel: getCategoryLabel(request.category, request.categoryName),
      date: dateTime.state.date,
      time: dateTime.state.time,
      isEditable: editable && Boolean(onFieldChange),
      dueDateLabel: formatUtcIsoInBrowserTimeZone(request.dueDate, { dateStyle: "medium" }),
      dueTimeLabel: formatUtcIsoInBrowserTimeZone(request.dueDate, { timeStyle: "short" }),
      createdAtLabel: formatUtcIsoInBrowserTimeZone(request.createdAt),
      updatedAtLabel: formatUtcIsoInBrowserTimeZone(request.updatedAt),
    },
    actions: {
      changeStatus,
      changeCategory,
      changeRequestedBy,
      changeDate: dateTime.actions.handleDateChange,
      changeTime: dateTime.actions.handleTimeChange,
      createType: canManageTypes ? createRequestType : undefined,
      renameType: canManageTypes ? renameRequestType : undefined,
      setTypeActive: canManageTypes ? setRequestTypeActive : undefined,
    },
    meta: { currentWorkspaceId },
  }
}
