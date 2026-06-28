import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../../../services/api/axios.config';

describe('axios.config.ts', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mock.restore();
  });

  it('should add an X-Request-ID header to every request', async () => {
    mock.onGet('/test').reply(200);

    await apiClient.get('/test');

    expect(mock.history.get[0].headers['X-Request-ID']).toBeDefined();
  });
});