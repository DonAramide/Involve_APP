import { supportRepository } from '../repositories/support.repository';

export class SupportService {
  async getTickets() {
    return supportRepository.findAll();
  }
}
export const supportService = new SupportService();