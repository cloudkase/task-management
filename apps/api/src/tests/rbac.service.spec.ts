import { RbacService } from '@auth/rbac.service';
import { Role } from '@data/roles.enum';
describe('RbacService', () => {
  const r = new RbacService();
  it('viewer can read', () => expect(r.canReadTasks(Role.Viewer)).toBe(true));
  it('viewer cannot create', () => expect(r.canCreateTasks(Role.Viewer)).toBe(false));
  it('owner can delete', () => expect(r.canDeleteTasks(Role.Owner)).toBe(true));
  it('org scope includes direct children only', () => {
    const scope = r.orgScope(1, [{id:1,parentId:null},{id:2,parentId:1},{id:3,parentId:2}]);
    expect(scope).toContain(1);
    expect(scope).toContain(2);
    expect(scope).not.toContain(3);
  });
});
