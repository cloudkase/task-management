export enum Role { Viewer='viewer', Admin='admin', Owner='owner' }
export const ROLE_INHERITANCE: Record<Role, Role[]> = {
  [Role.Viewer]: [Role.Viewer],
  [Role.Admin]: [Role.Admin, Role.Viewer],
  [Role.Owner]: [Role.Owner, Role.Admin, Role.Viewer]
};
