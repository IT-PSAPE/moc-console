import type { UserWithRole } from '@/data/fetch-users'
import { useUsers } from './users-provider'
export function useUserMemberType(user:UserWithRole) {
  const {state,actions,meta}=useUsers()
  function change(typeId:string):void {void actions.memberTypes.assign(user.id,typeId)}
  return {actions:{change},meta:{canEdit:meta.memberTypes.canEdit,items:state.memberTypes.types.map(t=>({value:t.id,label:`${t.name}${t.is_default?' (Default)':''}`})),name:state.memberTypes.types.find(t=>t.id===user.memberTypeId)?.name??'Members'}}
}
