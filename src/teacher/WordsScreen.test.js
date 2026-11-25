const React = require('react');
const { act, create } = require('react-test-renderer');
const { TextInput } = require('react-native');

let mockAuth;
const mockToast = jest.fn();
jest.mock('expo-router', () => ({ Redirect: ({ href }) => require('react').createElement('redirect', { href }) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('../auth/AuthContext', () => ({ useAuth: () => mockAuth }));
jest.mock('../components/Toast', () => ({ useToast: () => mockToast }));
jest.mock('../components/MainScroll', () => ({ MainScroll: ({ children }) => children }));
jest.mock('./api', () => ({
  listClassrooms: jest.fn(),
  getClassroomWords: jest.fn(),
  updateClassroomWord: jest.fn(),
  deleteClassroomWord: jest.fn(),
  deleteChapter: jest.fn(),
}));
const api = require('./api');
const { FormButton } = require('../components/FormControls');
const WordsScreen = require('./WordsScreen').default;

const TEACHER = { status: 'authenticated', user: { id: 1, name: '테스트교사', role: 'TEACHER', school: '테스트학원', email: null, classroom: null } };
const A = { id: 1, name: '겨울 특강 A반', code: 'ABC234', createdAt: '' };
const B = { id: 2, name: '겨울 특강 B반', code: 'XYZ789', createdAt: '' };
const word = (id, w, chapter, number, extra = {}) => ({
  id,
  word: w,
  meanings: ['뜻-' + w],
  synonyms: [''],
  number,
  chapter,
  details: { example: '', exampleKo: '', exampleMeaning: '' },
  ...extra,
});
const STUDY = word('w1', 'study', 'Week 1', 1, { meanings: ['공부하다', '연구'], synonyms: ['', ''], partsOfSpeech: ['동사', '명사'] });
const INSIGHT = word('w2', 'insight', 'Week 1', 2);
const BRIDGE = word('w3', 'bridge', 'Week 2', 1);

let tree;
const text = () => JSON.stringify(tree.toJSON());
const buttons = (label) => tree.root.findAllByType(FormButton).filter((b) => b.props.label === label);
const press = (label, index = 0) => act(async () => buttons(label)[index].props.onPress());
const radios = () => tree.root.findAll((n) => n.props.accessibilityRole === 'radio' && typeof n.props.onPress === 'function' && typeof n.type !== 'string');
const input = (label) => tree.root.findAllByType(TextInput).find((n) => n.props.accessibilityLabel === label);
const type = (label, value) => act(async () => input(label).props.onChangeText(value));
async function mount() {
  await act(async () => {
    tree = create(React.createElement(WordsScreen));
  });
}
const pick = (index) => act(async () => radios()[index].props.onPress());
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
};

beforeEach(() => {
  mockAuth = TEACHER;
  api.listClassrooms.mockResolvedValue([A, B]);
  api.getClassroomWords.mockResolvedValue([STUDY, INSIGHT, BRIDGE]);
});
afterEach(async () => {
  await act(async () => tree?.unmount());
  jest.clearAllMocks();
  jest.resetAllMocks();
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

describe('classrooms and word list', () => {
  it('lists classrooms and, after picking one, the words grouped by chapter', async () => {
    await mount();
    expect(text()).toContain('올린 단어 관리');
    expect(api.getClassroomWords).not.toHaveBeenCalled();
    await pick(1);
    expect(api.getClassroomWords).toHaveBeenCalledWith(2);
    expect(text()).toContain('Week 1 · 2단어');
    expect(text()).toContain('Week 2 · 1단어');
    expect(text()).toContain('1. study');
    expect(text()).toContain('동사 공부하다 / 명사 연구');
    expect(text()).toContain('2. insight');
    expect(text()).toContain('뜻-bridge');
    expect(buttons('수정')).toHaveLength(3);
    expect(buttons('차시 삭제')).toHaveLength(2);
  });

  it('says so when a classroom has no words', async () => {
    api.getClassroomWords.mockResolvedValue([]);
    await mount();
    await pick(0);
    expect(text()).toContain('아직 올린 단어가 없어요.');
  });

  it('says so when there are no classrooms and shows load errors with retry', async () => {
    api.listClassrooms.mockResolvedValueOnce([]);
    await mount();
    expect(text()).toContain('아직 만든 수업이 없어요.');
    await act(async () => tree.unmount());
    api.listClassrooms.mockRejectedValueOnce(new Error('서버에 연결할 수 없어요')).mockResolvedValueOnce([A]);
    await mount();
    expect(text()).toContain('서버에 연결할 수 없어요');
    await press('다시 시도');
    expect(radios()).toHaveLength(1);
  });

  it('shows a word load error and retries', async () => {
    api.getClassroomWords.mockRejectedValueOnce(new Error('수업을 찾을 수 없어요')).mockResolvedValueOnce([BRIDGE]);
    await mount();
    await pick(0);
    expect(text()).toContain('수업을 찾을 수 없어요');
    await press('다시 시도');
    expect(text()).toContain('Week 2 · 1단어');
  });

  it('drops edit and confirm state when the classroom changes, and ignores a late response', async () => {
    const late = deferred();
    await mount();
    await pick(0);
    await press('수정', 0);
    expect(input('영단어')).toBeDefined();
    await press('삭제', 1);
    api.getClassroomWords.mockReturnValueOnce(late.promise);
    await pick(1);
    expect(input('영단어')).toBeUndefined();
    expect(text()).not.toContain('이 단어를 지울까요?');
    // 수업 A로 되돌아가는 느린 요청이 B의 목록을 덮어쓰지 않는다.
    api.getClassroomWords.mockResolvedValueOnce([BRIDGE]);
    await pick(0);
    expect(text()).toContain('Week 2 · 1단어');
    await act(async () => late.resolve([STUDY]));
    expect(text()).not.toContain('1. study');
    expect(text()).toContain('Week 2 · 1단어');
  });
});

describe('editing', () => {
  async function openEdit(index = 0) {
    await mount();
    await pick(0);
    await press('수정', index);
  }

  it('opens an inline form from the word, keeps the chapter read-only and only one at a time', async () => {
    await openEdit();
    expect(input('영단어').props.value).toBe('study');
    expect(input('뜻').props.value).toBe('공부하다\n연구');
    expect(text()).toContain('차시는 바꿀 수 없어요: Week 1');
    await press('수정', 1);
    expect(tree.root.findAllByType(TextInput).filter((n) => n.props.accessibilityLabel === '영단어')).toHaveLength(1);
    expect(input('영단어').props.value).toBe('insight');
  });

  it('saves through the server, replaces the word in the list, closes and toasts', async () => {
    const saved = { ...STUDY, meanings: ['배우다', '연구'] };
    api.updateClassroomWord.mockResolvedValue(saved);
    await openEdit();
    await type('뜻', '배우다\n연구');
    await press('저장');
    expect(api.updateClassroomWord).toHaveBeenCalledTimes(1);
    const [classroomId, sent] = api.updateClassroomWord.mock.calls[0];
    expect(classroomId).toBe(1);
    // 번호·품사는 buildWord가 이어 준다.
    expect(sent).toMatchObject({ id: 'w1', word: 'study', meanings: ['배우다', '연구'], number: 1, partsOfSpeech: ['동사', '명사'], chapter: 'Week 1' });
    expect(text()).toContain('동사 배우다 / 명사 연구');
    expect(input('영단어')).toBeUndefined();
    expect(mockToast).toHaveBeenCalledWith('단어를 고쳤어요');
  });

  it('shows the server message (409) inside the form and keeps it open', async () => {
    api.updateClassroomWord.mockRejectedValue(new Error('같은 단어가 이미 있어요.'));
    await openEdit();
    await type('영단어', 'insight');
    await press('저장');
    expect(text()).toContain('같은 단어가 이미 있어요.');
    expect(input('영단어').props.value).toBe('insight');
    expect(mockToast).not.toHaveBeenCalled();
    expect(text()).toContain('1. study');
  });

  it('shows buildWord errors without calling the server', async () => {
    await openEdit();
    await type('뜻', '');
    await press('저장');
    expect(text()).toContain('영단어와 뜻을 입력해 주세요');
    expect(api.updateClassroomWord).not.toHaveBeenCalled();
  });

  it('ignores a second save while one is in flight', async () => {
    const pending = deferred();
    api.updateClassroomWord.mockReturnValue(pending.promise);
    await openEdit();
    await press('저장');
    await act(async () => input('영단어').props.onSubmitEditing?.());
    expect(buttons('저장')[0].props.disabled).toBe(true);
    expect(api.updateClassroomWord).toHaveBeenCalledTimes(1);
    await act(async () => pending.resolve(STUDY));
    expect(input('영단어')).toBeUndefined();
  });

  it('cancel closes the form without a call', async () => {
    await openEdit();
    await press('취소');
    expect(input('영단어')).toBeUndefined();
    expect(api.updateClassroomWord).not.toHaveBeenCalled();
  });
});

describe('deleting a word', () => {
  it('asks inline, then deletes, toasts, and drops an emptied chapter', async () => {
    api.deleteClassroomWord.mockResolvedValue(undefined);
    await mount();
    await pick(0);
    await press('삭제', 2);
    expect(text()).toContain('이 단어를 지울까요? 학생이 북마크한 단어도 함께 사라져요.');
    expect(api.deleteClassroomWord).not.toHaveBeenCalled();
    await press('지우기');
    expect(api.deleteClassroomWord).toHaveBeenCalledWith(1, 'w3');
    expect(text()).not.toContain('Week 2');
    expect(text()).toContain('Week 1 · 2단어');
    expect(mockToast).toHaveBeenCalledWith('단어를 지웠어요');
  });

  it('keeps the word and makes no call when cancelled', async () => {
    await mount();
    await pick(0);
    await press('삭제', 0);
    await press('취소');
    expect(text()).not.toContain('이 단어를 지울까요?');
    expect(api.deleteClassroomWord).not.toHaveBeenCalled();
    expect(text()).toContain('1. study');
  });

  it('shows a delete error on the row and keeps the word', async () => {
    api.deleteClassroomWord.mockRejectedValue(new Error('서버에 문제가 생겼어요'));
    await mount();
    await pick(0);
    await press('삭제', 0);
    await press('지우기');
    expect(text()).toContain('서버에 문제가 생겼어요');
    expect(text()).toContain('1. study');
    expect(mockToast).not.toHaveBeenCalled();
  });
});

describe('deleting a chapter', () => {
  it('asks with the count, then removes the whole chapter', async () => {
    api.deleteChapter.mockResolvedValue(undefined);
    await mount();
    await pick(0);
    await press('차시 삭제', 0);
    expect(text()).toContain('Week 1의 단어 2개를 모두 지울까요? 학생이 북마크한 단어도 함께 사라지고 되돌릴 수 없어요.');
    await press('지우기');
    expect(api.deleteChapter).toHaveBeenCalledWith(1, 'Week 1');
    expect(text()).not.toContain('Week 1 · ');
    expect(text()).toContain('Week 2 · 1단어');
    expect(mockToast).toHaveBeenCalledWith('Week 1 차시를 지웠어요');
  });

  it('does nothing when cancelled', async () => {
    await mount();
    await pick(0);
    await press('차시 삭제', 1);
    await press('취소');
    expect(api.deleteChapter).not.toHaveBeenCalled();
    expect(text()).toContain('Week 2 · 1단어');
  });
});
