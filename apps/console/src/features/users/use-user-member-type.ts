import type { UserWithRole } from '@/data/fetch-users'
import { useUsers } from './users-provider'
export function useUserMemberType(user:UserWithRole) {
  const {state,actions,meta}=useUsers()
  const selected=state.memberTypes.types.find(type=>type.id===user.memberTypeId)??null
  function change(typeId:string):void {void actions.memberTypes.assign(user.id,typeId).catch(()=>undefined)}
  function create(name:string) {return actions.memberTypes.create(name)}
  function rename(type:typeof state.memberTypes.types[number],name:string) {return actions.memberTypes.rename(type,name)}
  return {actions:{change,create,rename},meta:{canEdit:meta.memberTypes.canEdit,types:state.memberTypes.types,selected,name:selected?.name??'Members',workspaceId:meta.memberTypes.workspaceId}}
}
