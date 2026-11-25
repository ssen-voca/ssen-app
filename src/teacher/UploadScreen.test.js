const React = require('react');
const { act, create } = require('react-test-renderer');
const { Platform, TextInput } = require('react-native');

let mockAuth;
const mockToast = jest.fn();
jest.mock('expo-router', () => ({ Redirect: ({ href }) => require('react').createElement('redirect', { href }) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('../auth/AuthContext', () => ({ useAuth: () => mockAuth }));
jest.mock('../components/Toast', () => ({ useToast: () => mockToast }));
jest.mock('../components/MainScroll', () => ({ MainScroll: ({ children }) => children }));
jest.mock('./api', () => ({ listClassrooms: jest.fn(), createClassroom: jest.fn(), publishWords: jest.fn(), getClassroomWords: jest.fn() }));
jest.mock('./readWorkbook', () => ({ readWorkbook: jest.fn() }));
const api = require('./api');
const { readWorkbook } = require('./readWorkbook');
const { FormButton } = require('../components/FormControls');
const UploadScreen = require('./UploadScreen').default;

const TEACHER = { status: 'authenticated', user: { id: 1, name: '테스트교사', role: 'TEACHER', school: '테스트학원', email: null, classroom: null } };
const A = { id: 1, name: '겨울 특강 A반', code: 'ABC234', createdAt: '' };
const B = { id: 2, name: '겨울 특강 B반', code: 'XYZ789', createdAt: '' };
const HEADER = ['번호', '표제어', '한국어 뜻', '품사', '동의어', '예문', '예문 활용형', '예문 해석', '예문 해석 볼드 부분'];
const GOOD = [
  { name: 'Week 1', rows: [HEADER, [1, 'study', '공부하다', '동사', '', 'He studied hard.', 'studied', '그는 열심히 공부했다.', '공부했다'], [2, 'insight', '통찰력', '명사', '', '', '', '', '']] },
  { name: '설명', rows: [['안내']] },
];
const BAD = [{ name: 'Week 1', rows: [HEADER, [1, 'study', '공부하다', '', '', 'He studied hard.', 'study', '그는 열심히 공부했다.', '']] }];
const FILE = { name: 'words.xlsx' };

let tree;
const text = () => JSON.stringify(tree.toJSON());
const buttonByText = (label) => tree.root.findAllByType(FormButton).find((b) => b.props.label.includes(label));
async function mount() {
  await act(async () => {
    tree = create(React.createElement(UploadScreen));
  });
}
async function pickFile(file = FILE) {
  const input = tree.root.findByType('input');
  await act(async () => {
    await input.props.onChange({ target: { files: [file], value: 'x' } });
  });
}
const press = (label) => act(async () => buttonByText(label).props.onPress());
const toggle = () => tree.root.findAll((n) => n.props.accessibilityRole === 'checkbox' && typeof n.props.onPress === 'function' && typeof n.type !== 'string')[0];
const flip = () => act(async () => toggle().props.onPress());
const radios = () => tree.root.findAll((n) => n.props.accessibilityRole === 'radio' && typeof n.props.onPress === 'function' && typeof n.type !== 'string');

beforeEach(() => {
  mockAuth = TEACHER;
  api.listClassrooms.mockResolvedValue([A, B]);
  api.createClassroom.mockResolvedValue({ id: 3, name: '새 반', code: 'NEW234', createdAt: '' });
  api.publishWords.mockResolvedValue({ created: 2, updated: 0 });
  api.getClassroomWords.mockResolvedValue([]);
  readWorkbook.mockResolvedValue(GOOD);
  jest.replaceProperty(Platform, 'OS', 'web');
});
afterEach(async () => {
  await act(async () => tree?.unmount());
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe('access', () => {
  it('waits while auth is loading', async () => {
    mockAuth = { status: 'loading', user: null };
    await mount();
    expect(tree.toJSON()).toBeNull();
  });

  it('sends anonymous visitors to the login screen', async () => {
    mockAuth = { status: 'anonymous', user: null };
    await mount();
    expect(tree.root.findByType('redirect').props.href).toBe('/login');
    expect(api.listClassrooms).not.toHaveBeenCalled();
  });

  it('sends students to the account screen', async () => {
    mockAuth = { status: 'authenticated', user: { ...TEACHER.user, role: 'STUDENT' } };
    await mount();
    expect(tree.root.findByType('redirect').props.href).toBe('/account');
    expect(api.listClassrooms).not.toHaveBeenCalled();
  });
});

describe('classrooms', () => {
  it('lists classrooms and shows the code of the selected one', async () => {
    await mount();
    expect(text()).toContain('TEACHER');
    expect(text()).toContain('단어 올리기');
    expect(radios().map((r) => r.props.accessibilityState.checked)).toEqual([false, false]);
    await act(async () => radios()[1].props.onPress());
    expect(radios().map((r) => r.props.accessibilityState.checked)).toEqual([false, true]);
    expect(text()).toContain('참여 코드 XYZ789');
  });

  it('says so when there are no classrooms', async () => {
    api.listClassrooms.mockResolvedValue([]);
    await mount();
    expect(text()).toContain('아직 만든 수업이 없어요.');
  });

  it('shows a load error and retries', async () => {
    api.listClassrooms.mockRejectedValueOnce(new Error('서버에 연결할 수 없어요'));
    await mount();
    expect(text()).toContain('서버에 연결할 수 없어요');
    await press('다시 시도');
    expect(radios()).toHaveLength(2);
  });

  it('creates a classroom and selects it', async () => {
    await mount();
    await act(async () => tree.root.findByType(TextInput).props.onChangeText('  새 반  '));
    await press('수업 만들기');
    expect(api.createClassroom).toHaveBeenCalledWith('새 반');
    expect(radios()).toHaveLength(3);
    expect(radios()[2].props.accessibilityState.checked).toBe(true);
    expect(text()).toContain('참여 코드 NEW234');
    expect(tree.root.findByType(TextInput).props.value).toBe('');
  });

  it('rejects empty and too long names without calling the server', async () => {
    await mount();
    await press('수업 만들기');
    expect(text()).toContain('수업 이름을 적어 주세요.');
    await act(async () => tree.root.findByType(TextInput).props.onChangeText('가'.repeat(101)));
    await press('수업 만들기');
    expect(text()).toContain('수업 이름은 100자까지 적을 수 있어요.');
    expect(api.createClassroom).not.toHaveBeenCalled();
  });

  it('shows the server message when creating fails', async () => {
    api.createClassroom.mockRejectedValue(new Error('이미 있는 수업이에요'));
    await mount();
    await act(async () => tree.root.findByType(TextInput).props.onChangeText('A'));
    await press('수업 만들기');
    expect(text()).toContain('이미 있는 수업이에요');
  });
});

describe('file preview', () => {
  it('shows weeks, the total and warnings after choosing a file', async () => {
    await mount();
    expect(tree.root.findByType('input').props.accept).toBe('.xlsx');
    await pickFile();
    expect(text()).toContain('words.xlsx');
    expect(text()).toContain('Week 1 · 2단어');
    expect(text()).toContain('총 2개 단어');
    expect(text()).toContain("설명 · 시트 '설명'은 Week 이름이 아니라서 건너뛰었어요.");
    expect(text()).not.toContain('오류를 고친 뒤');
  });

  it('lists errors with the row, disables the upload and asks for a new file', async () => {
    readWorkbook.mockResolvedValue(BAD);
    await mount();
    await act(async () => radios()[0].props.onPress());
    await pickFile();
    expect(text()).toContain("Week 1 · 2행 · 예문에 없는 활용형: 'study'");
    expect(text()).toContain('오류를 고친 뒤 파일을 다시 골라 주세요.');
    // 오류가 있으면 올릴 수 있는 단어 수를 보여 주지 않고 버튼 문구도 이유를 알려 준다.
    expect(text()).not.toContain('총 ');
    expect(buttonByText('오류가 있어 올릴 수 없어요').props.disabled).toBe(true);
  });

  it('shows at most 20 issues and counts the rest', async () => {
    const rows = [HEADER, ...Array.from({ length: 25 }, (_, i) => [i + 1, 'w' + i, ''])];
    readWorkbook.mockResolvedValue([{ name: 'Week 1', rows }]);
    await mount();
    await pickFile();
    expect(text().match(/한국어 뜻을 적어 주세요/g)).toHaveLength(20);
    expect(text()).toContain('외 5개');
  });

  it('shows a Korean message when the file cannot be read', async () => {
    readWorkbook.mockRejectedValue(new Error('엑셀 파일(.xlsx)을 읽을 수 없어요.'));
    await mount();
    await pickFile();
    expect(text()).toContain('엑셀 파일(.xlsx)을 읽을 수 없어요.');
    expect(buttonByText('0개 단어 올리기').props.disabled).toBe(true);
  });

  it('on native shows a notice instead of the file picker', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    await mount();
    expect(tree.root.findAllByType('input')).toHaveLength(0);
    expect(text()).toContain('엑셀 올리기는 웹에서만 쓸 수 있어요.');
  });
});

describe('publishing', () => {
  it('is disabled until a classroom and a clean file are chosen', async () => {
    await mount();
    await pickFile();
    expect(buttonByText('2개 단어 올리기').props.disabled).toBe(true);
    await act(async () => radios()[0].props.onPress());
    expect(buttonByText('2개 단어 올리기').props.disabled).toBe(false);
  });

  it('publishes to the selected classroom, reports the result and resets the preview', async () => {
    api.publishWords.mockResolvedValue({ created: 1, updated: 1 });
    await mount();
    await act(async () => radios()[1].props.onPress());
    await pickFile();
    await press('2개 단어 올리기');
    expect(api.publishWords).toHaveBeenCalledTimes(1);
    expect(api.publishWords.mock.calls[0][0]).toBe(2);
    expect(api.publishWords.mock.calls[0][1].map((w) => w.word)).toEqual(['study', 'insight']);
    expect(text()).toContain('새로 1개, 고친 1개를 올렸어요.');
    expect(mockToast).toHaveBeenCalledWith('새로 1개, 고친 1개를 올렸어요.');
    expect(text()).not.toContain('Week 1 · 2단어');
    expect(buttonByText('0개 단어 올리기').props.disabled).toBe(true);
  });

  it('shows the server message when publishing fails and keeps the preview', async () => {
    api.publishWords.mockRejectedValue(new Error('단어는 한 번에 2000개까지 올릴 수 있어요'));
    await mount();
    await act(async () => radios()[0].props.onPress());
    await pickFile();
    await press('2개 단어 올리기');
    expect(text()).toContain('단어는 한 번에 2000개까지 올릴 수 있어요');
    expect(text()).toContain('Week 1 · 2단어');
    expect(buttonByText('2개 단어 올리기').props.disabled).toBe(false);
  });
});

describe('replace option', () => {
  const cw = (id, word, chapter) => ({ id, word, meanings: ['뜻'], synonyms: [''], chapter, details: { example: '', exampleKo: '', exampleMeaning: '' } });
  // 파일(Week 1: study, insight) 기준: old 둘은 지워지고, 대소문자·공백만 다른 단어와 파일에 없는 차시(Week 2)는 남는다.
  const CURRENT = [cw('a', 'study', 'Week 1'), cw('b', ' INSIGHT ', 'Week 1'), cw('c', 'old', 'Week 1'), cw('d', 'older', 'Week 1'), cw('e', 'other', 'Week 2')];
  async function ready() {
    api.getClassroomWords.mockResolvedValue(CURRENT);
    await mount();
    await act(async () => radios()[0].props.onPress());
    await pickFile();
  }

  it('is off by default and unchecked again when another file is chosen', async () => {
    await ready();
    expect(toggle().props.accessibilityState.checked).toBe(false);
    expect(text()).toContain('이 파일에 없는 단어는 지우기 (차시 단위로 교체)');
    await flip();
    expect(toggle().props.accessibilityState.checked).toBe(true);
    await pickFile();
    expect(toggle().props.accessibilityState.checked).toBe(false);
  });

  it('previews the words that would be removed and relabels the button', async () => {
    await ready();
    expect(api.getClassroomWords).not.toHaveBeenCalled();
    await flip();
    expect(api.getClassroomWords).toHaveBeenCalledWith(1);
    expect(text()).toContain('지워질 단어 2개');
    expect(text()).toContain('Week 1 · old');
    expect(text()).toContain('Week 1 · older');
    expect(text()).not.toContain('Week 2 · other');
    expect(text()).toContain('학생이 북마크한 단어도 함께 사라져요.');
    expect(buttonByText('2개 올리고 2개 지우기').props.disabled).toBe(false);
  });

  it('lists at most 20 removed words and counts the rest', async () => {
    api.getClassroomWords.mockResolvedValue(Array.from({ length: 25 }, (_, i) => cw('x' + i, 'gone' + i, 'Week 1')));
    await mount();
    await act(async () => radios()[0].props.onPress());
    await pickFile();
    await flip();
    expect(text()).toContain('지워질 단어 25개');
    expect(text().match(/Week 1 · gone/g)).toHaveLength(20);
    expect(text()).toContain('외 5개');
  });

  it('says nothing is removed when the file covers everything', async () => {
    api.getClassroomWords.mockResolvedValue([cw('a', 'study', 'Week 1')]);
    await mount();
    await act(async () => radios()[0].props.onPress());
    await pickFile();
    await flip();
    expect(text()).toContain('지워질 단어가 없어요.');
    expect(text()).not.toContain('학생이 북마크한 단어도 함께 사라져요.');
    expect(buttonByText('2개 올리고 0개 지우기').props.disabled).toBe(false);
  });

  it('sends replace and reports the deleted count', async () => {
    api.publishWords.mockResolvedValue({ created: 0, updated: 2, deleted: 2 });
    await ready();
    await flip();
    await press('2개 올리고 2개 지우기');
    expect(api.publishWords).toHaveBeenCalledWith(1, expect.any(Array), { replace: true });
    expect(text()).toContain('새로 0개, 고친 2개, 지운 2개를 올렸어요.');
    expect(mockToast).toHaveBeenCalledWith('새로 0개, 고친 2개, 지운 2개를 올렸어요.');
  });

  it('blocks publishing while loading and when the current words cannot be loaded', async () => {
    let resolve;
    api.getClassroomWords.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    await mount();
    await act(async () => radios()[0].props.onPress());
    await pickFile();
    await flip();
    expect(buttonByText('지워질 단어를 확인하는 중이에요').props.disabled).toBe(true);
    await act(async () => resolve(CURRENT));
    expect(buttonByText('2개 올리고 2개 지우기').props.disabled).toBe(false);

    api.getClassroomWords.mockRejectedValue(new Error('서버에 문제가 생겼어요'));
    await flip();
    await flip();
    expect(text()).toContain('서버에 문제가 생겼어요');
    expect(buttonByText('올릴 수 없어요').props.disabled).toBe(true);
    expect(api.publishWords).not.toHaveBeenCalled();
    // 끄면 다시 올릴 수 있다.
    await flip();
    expect(buttonByText('2개 단어 올리기').props.disabled).toBe(false);
  });

  it('behaves as before once the toggle is turned off', async () => {
    await ready();
    await flip();
    await flip();
    expect(text()).not.toContain('지워질 단어');
    await press('2개 단어 올리기');
    expect(api.publishWords.mock.calls[0]).toHaveLength(2);
    expect(text()).toContain('새로 2개, 고친 0개를 올렸어요.');
  });

  it('discards a late answer after the classroom changes', async () => {
    let resolve;
    api.getClassroomWords.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    await mount();
    await act(async () => radios()[0].props.onPress());
    await pickFile();
    await flip();
    api.getClassroomWords.mockResolvedValueOnce([cw('z', 'zzz', 'Week 1')]);
    await act(async () => radios()[1].props.onPress());
    await act(async () => resolve(CURRENT));
    expect(api.getClassroomWords).toHaveBeenLastCalledWith(2);
    expect(text()).toContain('지워질 단어 1개');
    expect(text()).not.toContain('Week 1 · old');
  });

  it('does not offer replace while the file has errors', async () => {
    readWorkbook.mockResolvedValue(BAD);
    await mount();
    await act(async () => radios()[0].props.onPress());
    await pickFile();
    expect(toggle()).toBeUndefined();
    expect(api.getClassroomWords).not.toHaveBeenCalled();
  });
});
