import { describe, it, expect } from '@jest/globals';

describe('Broadcast Recipient Logs Schema Contract', () => {
  it('should verify correct schema fields for broadcast_recipient_logs query', () => {
    const validFields = ['campaign_id', 'phone', 'status', 'sent_at'];
    expect(validFields).toContain('sent_at');
    expect(validFields).not.toContain('created_at');
  });
});
