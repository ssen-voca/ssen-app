const React = require('react');
const { act, create } = require('react-test-renderer');

const mockUser = { id: 1, name: '김', role: 'STUDENT', email: null, school: 'S', classroom: null };
const mockCall = jest.fn();
class mockExpired extends Error {}
jest.mock('./session', () => ({ session: { call: (...a) => mockCall(...a), setTokens: jest.fn(), clear: jest.fn() }, SessionExpiredError: mockExpired }));
jest.mock('../api/auth', () => ({ getMe: jest.fn(), login: jest.fn() }));

const { AuthProvider, useAuth } = require('./AuthContext');
let auth;
function Probe() {
  auth = useAuth();
  return null;
}
async function mount() {
  let tree;
  await act(async () => {
    tree = create(React.createElement(AuthProvider, null, React.createElement(Probe)));
  });
  return tree;
}
beforeEach(() => mockCall.mockReset());

describe('refreshUser', () => {
  it('replaces the user while staying authenticated', async () => {
    mockCall.mockResolvedValueOnce(mockUser);
    await mount();
    const joined = { ...mockUser, classroom: { id: 3, name: 'A반', code: 'ABC234' } };
    mockCall.mockResolvedValueOnce(joined);
    await act(async () => auth.refreshUser());
    expect(auth.status).toBe('authenticated');
    expect(auth.user).toEqual(joined);
  });

  it('propagates failures and leaves the current user alone', async () => {
    mockCall.mockResolvedValueOnce(mockUser);
    await mount();
    mockCall.mockRejectedValueOnce(new Error('down'));
    await act(async () => {
      await expect(auth.refreshUser()).rejects.toThrow('down');
    });
    expect(auth.user).toEqual(mockUser);
  });

  it('ignores a response that arrives after logout', async () => {
    mockCall.mockResolvedValueOnce(mockUser);
    await mount();
    let resolve;
    mockCall.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    let pending;
    await act(async () => {
      pending = auth.refreshUser();
    });
    await act(async () => auth.logout());
    await act(async () => {
      resolve({ ...mockUser, name: '늦은 응답' });
      await pending;
    });
    expect(auth.status).toBe('anonymous');
    expect(auth.user).toBeNull();
  });

  it('does not let a stale response overwrite a newer login', async () => {
    mockCall.mockResolvedValueOnce(mockUser);
    await mount();
    let resolve;
    mockCall.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    let pending;
    await act(async () => {
      pending = auth.refreshUser();
    });
    const other = { ...mockUser, id: 2, name: '이' };
    require('../api/auth').login.mockResolvedValueOnce({ accessToken: 'a', refreshToken: 'r' });
    mockCall.mockResolvedValueOnce(other);
    await act(async () => auth.login({ school: 'S', name: '이', phoneLast4: '1234' }));
    await act(async () => {
      resolve({ ...mockUser, name: '늦은 응답' });
      await pending;
    });
    expect(auth.user).toEqual(other);
  });

  it('does nothing to an anonymous state', async () => {
    mockCall.mockRejectedValueOnce(new mockExpired());
    await mount();
    expect(auth.status).toBe('anonymous');
    mockCall.mockResolvedValueOnce(mockUser);
    await act(async () => auth.refreshUser());
    expect(auth.status).toBe('anonymous');
    expect(auth.user).toBeNull();
  });
});
