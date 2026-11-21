const React = require('react');
const { act, create } = require('react-test-renderer');

const mockOrder = [];
const mockRouter = { replace: jest.fn((href) => mockOrder.push(`replace:${href}`)) };
const mockJoin = jest.fn();
const mockRefreshUser = jest.fn();
const mockReload = jest.fn(() => mockOrder.push('reload'));
const mockToast = jest.fn();
let mockAuth;
jest.mock('expo-router', () => ({ router: mockRouter, Redirect: ({ href }) => `redirect:${href}` }));
jest.mock('../api/auth', () => ({ joinClassroom: (...a) => mockJoin(...a) }));
jest.mock('../auth/session', () => ({ session: { call: (fn) => fn('tok') }, SessionExpiredError: class SessionExpiredError extends Error {} }));
jest.mock('../auth/AuthContext', () => ({ useAuth: () => mockAuth }));
jest.mock('../bookmarks/BookmarksContext', () => ({ useBookmarks: () => ({ reload: mockReload }) }));
jest.mock('../components/Toast', () => ({ useToast: () => mockToast }));
jest.mock('../components/MainScroll', () => ({ MainScroll: ({ children }) => children }));

const { ApiError } = require('../api/client');
const JoinScreen = require('./JoinScreen').default;
const student = { id: 1, name: '김', role: 'STUDENT', classroom: null };
let tree;
const text = () => JSON.stringify(tree.toJSON());
async function mount() {
  await act(async () => {
    tree = create(React.createElement(JoinScreen));
  });
}
const input = () => tree.root.findByProps({ accessibilityLabel: '참여 코드' });
const type = (value) => act(async () => input().props.onChangeText(value));
const submit = () => act(async () => tree.root.findByProps({ accessibilityRole: 'button' }).props.onPress());

beforeEach(() => {
  mockOrder.length = 0;
  jest.clearAllMocks();
  mockAuth = { status: 'authenticated', user: student, refreshUser: mockRefreshUser };
  mockJoin.mockImplementation(async () => {
    mockOrder.push('join');
    return { id: 3, name: '겨울 특강 A반', code: 'ABC234' };
  });
  mockRefreshUser.mockImplementation(async () => {
    mockOrder.push('refreshUser');
  });
});
afterEach(async () => {
  await act(async () => tree?.unmount());
});

test('shows the form and filters typed characters', async () => {
  await mount();
  expect(text()).toContain('수업 참여코드를');
  expect(text()).not.toContain('지금은');
  await type('abc 2o34x');
  expect(input().props.value).toBe('ABC234');
  // 공백이 낀 코드를 붙여 넣어도 마지막 글자가 잘리지 않는다(maxLength는 공백까지 센다).
  await type('5y4 hst');
  expect(input().props.value).toBe('5Y4HST');
  expect(input().props.maxLength).toBeUndefined();
});

test('mentions the current classroom when the student already has one', async () => {
  mockAuth.user = { ...student, classroom: { id: 1, name: '봄반', code: 'AAAAAA' } };
  await mount();
  expect(text()).toContain('지금은 봄반 수업에 있어요. 다른 코드를 입력하면 수업이 바뀌어요.');
});

test('empty input shows an error and does not call the server', async () => {
  await mount();
  await submit();
  expect(text()).toContain('참여 코드를 입력해 주세요');
  expect(mockJoin).not.toHaveBeenCalled();
});

test('a short code is rejected locally', async () => {
  await mount();
  await type('ABC');
  await submit();
  expect(text()).toContain('참여 코드를 확인해 주세요 (영문 대문자·숫자 6자)');
  expect(mockJoin).not.toHaveBeenCalled();
});

test('success: join, refreshUser, reload, then replace home with a toast', async () => {
  await mount();
  await type('abc234');
  await submit();
  expect(mockJoin).toHaveBeenCalledWith('tok', 'ABC234');
  expect(mockOrder).toEqual(['join', 'refreshUser', 'reload', 'replace:/']);
  expect(mockToast).toHaveBeenCalledWith('겨울 특강 A반 수업에 참여했어요');
});

test('a failing refreshUser does not turn a successful join into an error', async () => {
  mockRefreshUser.mockRejectedValue(new Error('down'));
  await mount();
  await type('ABC234');
  await submit();
  expect(mockOrder).toEqual(['join', 'reload', 'replace:/']);
  expect(mockToast).toHaveBeenCalledWith('겨울 특강 A반 수업에 참여했어요');
  expect(text()).not.toContain('요청에 실패했어요');
});

test('shows the server message and stays on the screen', async () => {
  mockJoin.mockRejectedValue(new ApiError(404, '참여 코드를 확인해 주세요.'));
  await mount();
  await type('ZZZZZZ');
  await submit();
  expect(text()).toContain('참여 코드를 확인해 주세요.');
  expect(mockRefreshUser).not.toHaveBeenCalled();
  expect(mockRouter.replace).not.toHaveBeenCalled();
  expect(mockToast).not.toHaveBeenCalled();
});

test('a non-API failure shows the generic message', async () => {
  mockJoin.mockRejectedValue(new Error('boom'));
  await mount();
  await type('ABC234');
  await submit();
  expect(text()).toContain('요청에 실패했어요');
});

test('a second press while joining is ignored', async () => {
  let release;
  mockJoin.mockImplementation(() => new Promise((r) => (release = r)));
  await mount();
  await type('ABC234');
  const press = tree.root.findByProps({ accessibilityRole: 'button' }).props.onPress;
  await act(async () => {
    void press();
    void press();
  });
  expect(mockJoin).toHaveBeenCalledTimes(1);
  await act(async () => release({ id: 3, name: 'A반', code: 'ABC234' }));
  expect(mockRouter.replace).toHaveBeenCalledTimes(1);
});

test('anonymous users are sent to login, unreachable ones to account', async () => {
  mockAuth = { status: 'anonymous', user: null, refreshUser: mockRefreshUser };
  await mount();
  expect(text()).toContain('redirect:/login');
  await act(async () => tree.unmount());
  mockAuth = { status: 'unreachable', user: null, refreshUser: mockRefreshUser };
  await mount();
  expect(text()).toContain('redirect:/account');
});

test('teachers only see guidance, no form', async () => {
  mockAuth.user = { ...student, role: 'TEACHER' };
  await mount();
  expect(text()).toContain('교사 계정은 참여코드를 입력하지 않아요');
  expect(tree.root.findAllByProps({ accessibilityLabel: '참여 코드' })).toHaveLength(0);
});
