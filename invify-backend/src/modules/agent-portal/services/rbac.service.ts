import { rbacRepository } from '../repositories/rbac.repository';
export class RbacService {
  async listRoles() { return rbacRepository.listRoles(); }
}
export const rbacService = new RbacService();
