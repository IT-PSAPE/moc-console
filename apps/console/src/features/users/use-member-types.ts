import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { MemberType } from '@moc/notifications'
import { useWorkspace } from '@/lib/workspace-context'
import { useFeedback } from '@moc/ui/components/feedback/feedback-provider'
import { assignMemberType,fetchMemberTypes,saveMemberTypeAndFetch } from './member-type-service'
export function useMemberTypes(onAssigned:(userId:string,typeId:string)=>void) {
  const {currentWorkspaceId,role}=useWorkspace()
  const {toast}=useFeedback()
  const [typesState,setTypesState]=useState<{workspaceId:string;types:MemberType[]}|null>(null)
  const types=typesState?.workspaceId===currentWorkspaceId?typesState.types:[]
  const activeWorkspaceIdRef=useRef(currentWorkspaceId)
  useLayoutEffect(()=>{activeWorkspaceIdRef.current=currentWorkspaceId},[currentWorkspaceId])
  const showError=useCallback((error:unknown):void=>{toast({title:'Member type update failed',description:error instanceof Error?error.message:'Try again',variant:'error'})},[toast])
  useEffect(()=>{
    if(!currentWorkspaceId) return
    let cancelled=false
    void fetchMemberTypes(currentWorkspaceId).then(loadedTypes=>{
      if(!cancelled && activeWorkspaceIdRef.current===currentWorkspaceId) setTypesState({workspaceId:currentWorkspaceId,types:loadedTypes})
    }).catch(showError)
    return ()=>{cancelled=true}
  },[currentWorkspaceId,showError])
  const save=useCallback(async(name:string,id:string|null):Promise<MemberType>=>{
    if(!currentWorkspaceId) throw new Error('No workspace selected')
    const normalizedName=name.trim()
    if(!normalizedName) throw new Error('Enter a member type name')
    const {types:updatedTypes,savedType}=await saveMemberTypeAndFetch(currentWorkspaceId,normalizedName,id)
    if(activeWorkspaceIdRef.current===currentWorkspaceId) setTypesState({workspaceId:currentWorkspaceId,types:updatedTypes})
    return savedType
  },[currentWorkspaceId])
  const assign=useCallback(async(userId:string,typeId:string):Promise<void>=>{
    if(!currentWorkspaceId) throw new Error('No workspace selected')
    try {
      await assignMemberType(currentWorkspaceId,userId,typeId)
      if(activeWorkspaceIdRef.current===currentWorkspaceId) onAssigned(userId,typeId)
    }
    catch(error){showError(error);throw error}
  },[currentWorkspaceId,onAssigned,showError])
  const create=useCallback((name:string)=>save(name,null),[save])
  const rename=useCallback((type:MemberType,name:string)=>save(name,type.id),[save])
  return {state:{types},actions:{create,rename,assign},meta:{canEdit:role?.can_update===true,workspaceId:currentWorkspaceId}}
}
