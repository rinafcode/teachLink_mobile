import {
  decodeBinaryMessage,
  encodeBinaryMessage,
  estimatePayloadReduction,
} from '../../services/socket/binaryProtocol';

describe('binaryProtocol', () => {
  it('encodes and decodes typed notification payload', () => {
    const payload = {
      id: 'n-1',
      title: 'Reminder',
      body: 'Lesson starts in 10 min',
      createdAt: '2026-05-27T10:10:10Z',
      isRead: false,
    };

    const encoded = encodeBinaryMessage('notification_created', payload);
    const decoded = decodeBinaryMessage(encoded);

    expect(decoded.event).toBe('notification_created');
    expect(decoded.payload).toEqual(payload);
  });

  it('falls back for unknown event payloads', () => {
    const payload = { ping: 'pong', attempt: 2 };
    const encoded = encodeBinaryMessage('custom_event', payload);
    const decoded = decodeBinaryMessage(encoded);

    expect(decoded.event).toBe('custom_event');
    expect(decoded.payload).toEqual(payload);
  });

  it('reports payload reduction compared to JSON envelope', () => {
    const payload = {
      id: 'm-1',
      chatId: 'chat-99',
      senderId: 'user-12',
      content: 'Welcome to the class!',
      timestamp: '2026-05-27T10:10:10Z',
      isEdited: false,
    };

    const metrics = estimatePayloadReduction('message_received', payload);

    expect(metrics.jsonBytes).toBeGreaterThan(0);
    expect(metrics.binaryBytes).toBeGreaterThan(0);
    expect(metrics.reductionPercent).toBeGreaterThan(0);
  });
});
