const React = require('react');
const { act, create } = require('react-test-renderer');

const mockOrder = [];
const mockRouter = { replace: jest.fn((href) => mockOrder.push(`replace:${href}`)) };
const mockWithdraw = jest.fn();
const mockLogout = jest.fn(async () => {
  mockOrder.push('logout');
});
const mockToast = jest.fn((message) => mockOrder.push(`toast:${message}`));
let mockAuth;
jest.mock('expo-router', () => ({ router: mockRouter, Redirect: ({ href }) => `redirect:${href}` }));
jest.mock('../api/auth', () => ({ withdraw: (...a) => mockWithdraw(...a) }));
jest.mock('../auth/session', () => ({ session: { call: (fn) => fn('tok') }, SessionExpiredError: class SessionExpiredError extends Error {} }));
jest.mock('../auth/AuthContext', () => ({ useAuth: () => mockAuth }));
jest.mock('../components/Toast', () => ({ useToast: () => mockToast }));
jest.mock('../components/MainScroll', () => ({ MainScroll: ({ children }) => children }));

const { ApiError } = require('../api/client');
const WithdrawScreen = require('./WithdrawScreen').default;
const student = { id: 1, name: '김', role: 'STUDENT', classroom: null };
let tree;
const text = () => JSON.stringify(tree.toJSON());
async function mount() {
  await act(async () => {
    tree = create(React.createElement(WithdrawScreen));
  });
}
const input = () => tree.root.findByProps({ accessibilityLabel: '휴대폰 번호 뒤 4자리' });
const type = (value) => act(async () => input().props.onChangeText(value));
// 화면 순서대로 [탈퇴하기, 취소].
const button = (label) => tree.root.findAll((n) => n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function')[label === '취소' ? 1 : 0];
const submit = () => act(async () => button('탈퇴하기').props.onPress());

beforeEach(() => {
  mockOrder.length = 0;
  jest.clearAllMocks();
  mockAuth = { status: 'authenticated', user: student, logout: mockLogout };
  mockWithdraw.mockImplementation(async () => {
    mockOrder.push('withdraw');
  });
});
afterEach(async () => {
  await act(async () => tree?.unmount());
});

test('students see the warning, a masked number input and both buttons', async () => {
  await mount();
  expect(text()).toContain('정말 탈퇴할까요?');
  expect(text()).toContain('되돌릴 수 없어요');
  expect(text()).toContain('선생님이 올린 단어와 다른 친구들에게는 영향이 없어요');
  expect(input().props.secureTextEntry).toBe(true);
  expect(input().props.maxLength).toBe(4);
  expect(button('탈퇴하기')).toBeDefined();
  expect(button('취소')).toBeDefined();
});

test('the withdraw button stays disabled until four digits are entered', async () => {
  await mount();
  expect(button('탈퇴하기').props.disabled).toBe(true);
  await type('12a3');
  expect(input().props.value).toBe('123');
  expect(button('탈퇴하기').props.disabled).toBe(true);
  await type('1234');
  expect(button('탈퇴하기').props.disabled).toBe(false);
  // 키보드의 제출 키로도 4자리 미만이면 서버를 부르지 않는다.
  await type('12');
  await act(async () => input().props.onSubmitEditing());
  expect(text()).toContain('휴대폰 번호 뒤 4자리를 숫자로 입력해 주세요');
  expect(mockWithdraw).not.toHaveBeenCalled();
});

test('success: withdraw, logout, toast, then replace home', async () => {
  await mount();
  await type('1234');
  await submit();
  expect(mockWithdraw).toHaveBeenCalledWith('tok', '1234');
  expect(mockOrder).toEqual(['withdraw', 'logout', 'toast:탈퇴했어요', 'replace:/']);
});

test('a wrong number (403) keeps the login, shows the server message and clears the input', async () => {
  mockWithdraw.mockRejectedValue(new ApiError(403, '번호가 올바르지 않아요.'));
  await mount();
  await type('0000');
  await submit();
  expect(mockLogout).not.toHaveBeenCalled();
  expect(mockToast).not.toHaveBeenCalled();
  expect(mockRouter.replace).not.toHaveBeenCalled();
  expect(text()).toContain('번호가 올바르지 않아요.');
  expect(input().props.value).toBe('');
  expect(button('탈퇴하기').props.disabled).toBe(true);
});

test('too many attempts (429) shows the server message and keeps the login', async () => {
  mockWithdraw.mockRejectedValue(new ApiError(429, '시도 횟수를 초과했어요. 5분 뒤에 다시 시도해 주세요.'));
  await mount();
  await type('0000');
  await submit();
  expect(text()).toContain('시도 횟수를 초과했어요. 5분 뒤에 다시 시도해 주세요.');
  expect(mockLogout).not.toHaveBeenCalled();
  expect(input().props.value).toBe('0000');
});

test('a non-API failure shows the generic message and keeps the login', async () => {
  mockWithdraw.mockRejectedValue(new Error('boom'));
  await mount();
  await type('1234');
  await submit();
  expect(text()).toContain('요청에 실패했어요');
  expect(mockLogout).not.toHaveBeenCalled();
});

test('a second press while withdrawing is ignored', async () => {
  let release;
  mockWithdraw.mockImplementation(() => new Promise((r) => (release = r)));
  await mount();
  await type('1234');
  const press = button('탈퇴하기').props.onPress;
  await act(async () => {
    void press();
    void press();
  });
  expect(button('탈퇴하기').props.disabled).toBe(true);
  expect(mockWithdraw).toHaveBeenCalledTimes(1);
  await act(async () => release());
  expect(mockLogout).toHaveBeenCalledTimes(1);
  expect(mockRouter.replace).toHaveBeenCalledTimes(1);
});

test('cancel goes back to the account page without calling the server', async () => {
  await mount();
  await act(async () => button('취소').props.onPress());
  expect(mockRouter.replace).toHaveBeenCalledWith('/account');
  expect(mockWithdraw).not.toHaveBeenCalled();
  expect(mockLogout).not.toHaveBeenCalled();
});

test('teachers only see guidance, no form', async () => {
  mockAuth.user = { ...student, role: 'TEACHER' };
  await mount();
  expect(text()).toContain('학생 계정에서 해요');
  expect(text()).toContain('교사 계정은 서버 설정으로 관리돼요.');
  expect(tree.root.findAllByProps({ accessibilityLabel: '휴대폰 번호 뒤 4자리' })).toHaveLength(0);
});

test('loading renders nothing, anonymous goes to login, unreachable to account', async () => {
  mockAuth = { status: 'loading', user: null, logout: mockLogout };
  await mount();
  expect(tree.toJSON()).toBeNull();
  await act(async () => tree.unmount());
  mockAuth = { status: 'anonymous', user: null, logout: mockLogout };
  await mount();
  expect(text()).toContain('redirect:/login');
  await act(async () => tree.unmount());
  mockAuth = { status: 'unreachable', user: null, logout: mockLogout };
  await mount();
  expect(text()).toContain('redirect:/account');
});
