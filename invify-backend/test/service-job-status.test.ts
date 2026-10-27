import { serviceJobStatusBucket } from '../src/utils/service-job-status';

describe('serviceJobStatusBucket', () => {
  test('treats in-progress and unpaid work as active', () => {
    expect(serviceJobStatusBucket('in_progress')).toBe('active');
    expect(serviceJobStatusBucket('pending')).toBe('active');
    expect(serviceJobStatusBucket('unpaid')).toBe('active');
  });

  test('treats ready, paid, and delivered work as ready', () => {
    expect(serviceJobStatusBucket('ready')).toBe('ready');
    expect(serviceJobStatusBucket('paid')).toBe('ready');
    expect(serviceJobStatusBucket('delivered')).toBe('ready');
  });
});
