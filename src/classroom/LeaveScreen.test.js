const React = require('react');
const { act, create } = require('react-test-renderer');

const mockOrder = [];
const mockRouter = { replace: jest.fn((href) => mockOrder.push(`replace:${href}`)), push: jest.fn() };
const mockLeave = jest.fn();
const mockRefreshUser = jest.fn();
const mockReload = jest.fn(() => mockOrder.push('reload'));
const mockToast = jest.fn((m) => mockOrder.push(`toast:${m}`));
let mockAuth;
jest.mock('expo-router', () => ({ router: mockRouter, Redirect: ({ href }) => `redirect:${href}` }));
jest.mock('../api/auth', () => ({ leaveClassroom: (...a) => mockLeave(...a) }));
jest.mock('../auth/session', () => ({ session: { call: (fn) => fn('tok') }, SessionExpiredError: class SessionExpiredError extends Error {} }));
jest.mock('../auth/AuthContext', () => ({ useAuth: () => mockAuth }));
jest.mock('../bookmarks/BookmarksContext', () => ({ useBookmarks: () => ({ reload: mockReload }) }));
jest.mock('../components/Toast', () => ({ useToast: () => mockToast }));
jest.mock('../components/MainScroll', () => ({ MainScroll: ({ children }) => children }));

const { ApiError } = require('../api/client');
const { FormButton } = require('../components/FormControls');
const LeaveScreen = require('./LeaveScreen').default;
const student = { id: 1, name: '김', role: 'STUDENT', classroom: { id: 3, name: '겨울 특강 A반', code: 'ABC234' } };
let tree;
const text = () => JSON.stringify(tree.toJSON());
async function mount() {
  await act(async () => {
    tree = create(React.createElement(LeaveScreen));
  });
}
const buttons = () => tree.root.findAllByType(FormButton);
const button = (label) => buttons().find((b) => b.props.label === label);
const press = (label) => act(async () => button(label).props.onPress());

beforeEach(() => {
  mockOrder.length = 0;
  jest.clearAllMocks();
  mockAuth = { status: 'authenticated', user: student, refreshUser: mockRefreshUser };
  mockLeave.mockImplementation(async () => {
    mockOrder.push('leave');
  });
  mockRefreshUser.mockImplementation(async () => {
    mockOrder.push('refreshUser');
  });
});
afterEach(async () => {
  await act(async () => tree?.unmount());
});

test('asks for confirmation with the classroom name and two buttons', async () => {
  await mount();
  expect(text()).toContain('겨울 특강 A반 수업에서 나가면 선생님이 올린 단어가 보이지 않아요.');
  expect(text()).toContain('같은 참여코드로 다시 들어오면 돌아와요.');
  expect(text()).toContain('수업 나가기');
  expect(text()).toContain('취소');
  expect(buttons()).toHaveLength(2);
  expect(mockLeave).not.toHaveBeenCalled();
});

test('success: leave, refreshUser, reload, toast, then replace account', async () => {
  await mount();
  await press('수업 나가기');
  expect(mockLeave).toHaveBeenCalledWith('tok');
  expect(mockOrder).toEqual(['leave', 'refreshUser', 'reload', 'toast:수업에서 나갔어요', 'replace:/account']);
});

test('a failing refreshUser does not turn a successful leave into an error', async () => {
  mockRefreshUser.mockRejectedValue(new Error('down'));
  await mount();
  await press('수업 나가기');
  expect(mockOrder).toEqual(['leave', 'reload', 'toast:수업에서 나갔어요', 'replace:/account']);
  expect(text()).not.toContain('요청에 실패했어요');
});

test('shows the server message and stays on the screen', async () => {
  mockLeave.mockRejectedValue(new ApiError(500, '잠시 후 다시 시도해 주세요.'));
  await mount();
  await press('수업 나가기');
  expect(text()).toContain('잠시 후 다시 시도해 주세요.');
  expect(mockRefreshUser).not.toHaveBeenCalled();
  expect(mockRouter.replace).not.toHaveBeenCalled();
  expect(mockToast).not.toHaveBeenCalled();
});

test('a non-API failure shows the generic message', async () => {
  mockLeave.mockRejectedValue(new Error('boom'));
  await mount();
  await press('수업 나가기');
  expect(text()).toContain('요청에 실패했어요');
});

test('a second press while leaving is ignored', async () => {
  let release;
  mockLeave.mockImplementation(() => new Promise((r) => (release = r)));
  await mount();
  const onPress = button('수업 나가기').props.onPress;
  await act(async () => {
    void onPress();
    void onPress();
  });
  expect(mockLeave).toHaveBeenCalledTimes(1);
  expect(button('수업 나가기').props.disabled).toBe(true);
  await act(async () => release());
  expect(mockRouter.replace).toHaveBeenCalledTimes(1);
});

test('cancel goes back to account without calling the server', async () => {
  await mount();
  await press('취소');
  expect(mockRouter.replace).toHaveBeenCalledWith('/account');
  expect(mockLeave).not.toHaveBeenCalled();
});

test('a student without a classroom is offered to join one', async () => {
  mockAuth.user = { ...student, classroom: null };
  await mount();
  expect(text()).toContain('지금 속한 수업이');
  expect(text()).toContain('선생님께 받은 참여코드를 입력하면 수업에 들어갈 수 있어요.');
  expect(buttons()).toHaveLength(1);
  await press('수업 참여하기');
  expect(mockRouter.push).toHaveBeenCalledWith('/join');
  expect(mockLeave).not.toHaveBeenCalled();
});

test('teachers only see guidance', async () => {
  mockAuth.user = { ...student, role: 'TEACHER', classroom: null };
  await mount();
  expect(text()).toContain('교사 계정은 수업에 속하지 않아요.');
  expect(buttons()).toHaveLength(0);
});

test('anonymous users are sent to login, unreachable ones to account, loading renders nothing', async () => {
  mockAuth = { status: 'anonymous', user: null, refreshUser: mockRefreshUser };
  await mount();
  expect(text()).toContain('redirect:/login');
  await act(async () => tree.unmount());
  mockAuth = { status: 'unreachable', user: null, refreshUser: mockRefreshUser };
  await mount();
  expect(text()).toContain('redirect:/account');
  await act(async () => tree.unmount());
  mockAuth = { status: 'loading', user: null, refreshUser: mockRefreshUser };
  await mount();
  expect(tree.toJSON()).toBeNull();
});
