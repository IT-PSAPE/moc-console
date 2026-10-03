import { useCallback, useEffect, useState, type ChangeEvent, type MouseEvent } from 'react'
import type { MemberType } from '@moc/notifications'
import { useWorkspace } from '@/lib/workspace-context'
import { useFeedback } from '@moc/ui/components/feedback/feedback-provider'
import { assignMemberType,fetchMemberTypes,saveMemberType } from './member-type-service'
export function useMemberTypes(onAssigned:(userId:string,typeId:string)=>void) {
  const {currentWorkspaceId,role}=useWorkspace()
  const {toast}=useFeedback()
  const [types,setTypes]=useState<MemberType[]>([])
  const [draft,setDraft]=useState<{id:string|null;name:string}|null>(null)
  const [saving,setSaving]=useState(false)
  const reload=useCallback(async()=>{
    if(currentWorkspaceId) setTypes(await fetchMemberTypes(currentWorkspaceId))
  },[currentWorkspaceId])
  const showError=useCallback((error:unknown):void=>{toast({title:'Member type update failed',description:error instanceof Error?error.message:'Try again',variant:'error'})},[toast])
  useEffect(()=>{setTypes([]);setDraft(null);void reload().catch(showError)},[reload,showError])
  function openCreate():void {setDraft({id:null,name:''})}
  function openRename(event:MouseEvent<HTMLButtonElement>):void {
    const type=types.find(t=>t.id===event.currentTarget.value)
    if(type) setDraft({id:type.id,name:type.name})
  }
  function changeName(event:ChangeEvent<HTMLInputElement>):void {setDraft(current=>current?{...current,name:event.target.value}:null)}
  function changeOpen(open:boolean):void {if(!open && !saving) setDraft(null)}
  async function save():Promise<void> {
    if(!draft || !currentWorkspaceId || saving) return
    setSaving(true)
    try {await saveMemberType(currentWorkspaceId,draft.name.trim(),draft.id);await reload();setDraft(null)}
    catch(e){showError(e)} finally {setSaving(false)}
  }
  async function assign(userId:string,typeId:string):Promise<void> {
    if(!currentWorkspaceId) return
    try {await assignMemberType(currentWorkspaceId,userId,typeId);onAssigned(userId,typeId)}
    catch(e){showError(e)}
  }
  return {state:{types,draft,saving},actions:{openCreate,openRename,changeName,changeOpen,save,assign},meta:{canEdit:role?.can_update===true}}
}
