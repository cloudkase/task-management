import { Injectable } from '@nestjs/common';
import { ROLE_INHERITANCE, Role } from '@data/roles.enum';

@Injectable()
export class RbacService {
  canReadTasks(role: Role){ return ROLE_INHERITANCE[role].includes(Role.Viewer); }
  canCreateTasks(role: Role){ return ROLE_INHERITANCE[role].includes(Role.Admin) || role===Role.Owner; }
  canUpdateTasks(role: Role){ return ROLE_INHERITANCE[role].includes(Role.Admin) || role===Role.Owner; }
  canDeleteTasks(role: Role){ return role===Role.Owner || role===Role.Admin; }
  orgScope(orgId:number, all:{id:number; parentId?:number|null}[]): number[] {
    const ids = new Set<number>([orgId]);
    all.forEach(o => { if (o.parentId === orgId) ids.add(o.id); });
    return [...ids];
  }
}
