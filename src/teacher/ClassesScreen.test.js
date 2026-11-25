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
jest.mock('./api', () => ({
  listClassrooms: jest.fn(),
  updateClassroom: jest.fn(),
  reissueClassroomCode: jest.fn(),
  listClassroomStudents: jest.fn(),
  removeClassroomStudent: jest.fn(),
  deleteClassroom: jest.fn(),
}));
const api = require('./api');
const { FormButton } = require('../components/FormControls');
const ClassesScreen = require('./ClassesScreen').default;

const TEACHER = { status: 'authenticated', user: { id: 1, name: '테스트교사', role: 'TEACHER', school: '테스트학원', email: null, classroom: null } };
const A = { id: 1, name: '겨울 특강 A반', code: 'ABC234', createdAt: '', joinable: true, studentCount: 2 };
const B = { id: 2, name: '겨울 특강 B반', code: 'XYZ789', createdAt: '', joinable: false, studentCount: 0 };
const KIM = { id: 11, name: '김학생', school: '한빛중' };
const LEE = { id: 12, name: '이학생', school: null };

let tree;
const text = () => JSON.stringify(tree.toJSON());
const buttons = (label) => tree.root.findAllByType(FormButton).filter((b) => b.props.label === label);
const press = (label, index = 0) => act(async () => buttons(label)[index].props.onPress());
const radios = () => tree.root.findAll((n) => n.props.accessibilityRole === 'radio' && typeof n.props.onPress === 'function' && typeof n.type !== 'string');
const input = (label) => tree.root.findAllByType(TextInput).find((n) => n.props.accessibilityLabel === label);
const type = (label, value) => act(async () => input(label).props.onChangeText(value));
async function mount() {
  await act(async () => {
    tree = create(React.createElement(ClassesScreen));
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
  api.listClassroomStudents.mockResolvedValue([KIM, LEE]);
});
afterEach(async () => {
  await act(async () => tree?.unmount());
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

describe('classroom list', () => {
  it('shows each classroom with its student count and join state, and no detail until picked', async () => {
    await mount();
    expect(text()).toContain('수업 관리');
    expect(text()).toContain('학생 2명 · 참여 받는 중');
    expect(text()).toContain('학생 0명 · 참여 닫힘');
    expect(api.listClassroomStudents).not.toHaveBeenCalled();
    expect(buttons('이름 저장')).toHaveLength(0);
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

  it('drops edit and confirm state when the classroom changes, and ignores a late student list', async () => {
    const late = deferred();
    await mount();
    await pick(0);
    await type('수업 이름', '고치는 중');
    await type('삭제할 수업 이름 확인', 'abc');
    await press('코드 다시 만들기');
    await press('내보내기', 0);
    expect(text()).toContain('김학생 학생을 수업에서 내보낼까요?');
    api.listClassroomStudents.mockReturnValueOnce(late.promise);
    await pick(1);
    expect(input('수업 이름').props.value).toBe(B.name);
    expect(input('삭제할 수업 이름 확인').props.value).toBe('');
    expect(text()).not.toContain('새 코드를 만들면');
    expect(text()).not.toContain('내보낼까요?');
    // 수업 B의 느린 응답이 수업 A로 돌아간 화면에 끼어들지 않는다.
    api.listClassroomStudents.mockResolvedValueOnce([LEE]);
    await pick(0);
    await act(async () => late.resolve([KIM]));
    expect(text()).toContain('이학생');
    expect(text()).not.toContain('김학생');
  });
});

describe('name', () => {
  it('saves the trimmed name, refreshes the list and toasts', async () => {
    api.updateClassroom.mockResolvedValue({ ...A, name: '새 이름' });
    await mount();
    await pick(0);
    expect(input('수업 이름').props.value).toBe(A.name);
    await type('수업 이름', '  새 이름 ');
    await press('이름 저장');
    expect(api.updateClassroom).toHaveBeenCalledWith(1, { name: '새 이름' });
    expect(text()).toContain('새 이름');
    expect(text()).not.toContain('겨울 특강 A반');
    expect(mockToast).toHaveBeenCalledWith('이름을 바꿨어요');
  });

  it('rejects an empty or too long name without calling the server', async () => {
    await mount();
    await pick(0);
    await type('수업 이름', '   ');
    await press('이름 저장');
    expect(text()).toContain('수업 이름을 적어 주세요.');
    await type('수업 이름', 'x'.repeat(101));
    await press('이름 저장');
    expect(text()).toContain('수업 이름은 100자까지 적을 수 있어요.');
    expect(api.updateClassroom).not.toHaveBeenCalled();
  });

  it('shows the server message and keeps the old name in the list', async () => {
    api.updateClassroom.mockRejectedValue(new Error('같은 이름의 수업이 이미 있어요.'));
    await mount();
    await pick(0);
    await type('수업 이름', '새 이름');
    await press('이름 저장');
    expect(text()).toContain('같은 이름의 수업이 이미 있어요.');
    expect(text()).toContain('겨울 특강 A반');
    expect(mockToast).not.toHaveBeenCalled();
  });
});

describe('join', () => {
  it('closes and reopens joining', async () => {
    api.updateClassroom.mockResolvedValueOnce({ ...A, joinable: false }).mockResolvedValueOnce({ ...A, joinable: true });
    await mount();
    await pick(0);
    expect(text()).toContain('지금은 학생이 참여코드로 들어올 수 있어요.');
    await press('참여 닫기');
    expect(api.updateClassroom).toHaveBeenLastCalledWith(1, { joinable: false });
    expect(text()).toContain('지금은 참여가 닫혀 있어요. 이미 들어온 학생은 그대로예요.');
    expect(text()).toContain('학생 2명 · 참여 닫힘');
    expect(mockToast).toHaveBeenLastCalledWith('참여를 닫았어요');
    await press('참여 열기');
    expect(api.updateClassroom).toHaveBeenLastCalledWith(1, { joinable: true });
    expect(text()).toContain('학생 2명 · 참여 받는 중');
    expect(mockToast).toHaveBeenLastCalledWith('참여를 열었어요');
  });

  it('shows the server error and blocks double submits while busy', async () => {
    const pending = deferred();
    api.updateClassroom.mockReturnValueOnce(pending.promise);
    await mount();
    await pick(0);
    await press('참여 닫기');
    expect(buttons('참여 닫기')[0].props.disabled).toBe(true);
    expect(buttons('이름 저장')[0].props.disabled).toBe(true);
    await act(async () => buttons('참여 닫기')[0].props.onPress());
    expect(api.updateClassroom).toHaveBeenCalledTimes(1);
    await act(async () => pending.resolve({ ...A, joinable: false }));
    api.updateClassroom.mockRejectedValueOnce(new Error('권한이 없어요'));
    await press('참여 열기');
    expect(text()).toContain('권한이 없어요');
  });
});

describe('code', () => {
  afterEach(() => {
    Platform.OS = 'ios';
    delete global.navigator;
  });

  it('shows the code and copies it on the web only', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    global.navigator = { clipboard: { writeText } };
    await mount();
    await pick(0);
    expect(text()).toContain('ABC234');
    expect(buttons('코드 복사')).toHaveLength(0);
    await act(async () => tree.unmount());
    Platform.OS = 'web';
    await mount();
    await pick(0);
    await press('코드 복사');
    expect(writeText).toHaveBeenCalledWith('ABC234');
    expect(mockToast).toHaveBeenCalledWith('참여 코드를 복사했어요');
  });

  it('ignores copying quietly when the clipboard is missing or fails', async () => {
    Platform.OS = 'web';
    await mount();
    await pick(0);
    await press('코드 복사');
    global.navigator = { clipboard: { writeText: jest.fn().mockRejectedValue(new Error('denied')) } };
    await press('코드 복사');
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('asks first, then reissues and shows the new code', async () => {
    api.reissueClassroomCode.mockResolvedValue({ ...A, code: 'NEW234' });
    await mount();
    await pick(0);
    await press('코드 다시 만들기');
    expect(text()).toContain('새 코드를 만들면 옛 코드는 더 쓸 수 없어요. 이미 들어온 학생은 그대로예요.');
    expect(api.reissueClassroomCode).not.toHaveBeenCalled();
    await press('다시 만들기');
    expect(api.reissueClassroomCode).toHaveBeenCalledWith(1);
    expect(text()).toContain('NEW234');
    expect(text()).not.toContain('ABC234');
    expect(text()).not.toContain('새 코드를 만들면');
    expect(mockToast).toHaveBeenCalledWith('새 참여 코드를 만들었어요');
  });

  it('does nothing on cancel, and keeps the confirm open with the server error', async () => {
    await mount();
    await pick(0);
    await press('코드 다시 만들기');
    await press('취소');
    expect(api.reissueClassroomCode).not.toHaveBeenCalled();
    expect(text()).not.toContain('새 코드를 만들면');
    api.reissueClassroomCode.mockRejectedValue(new Error('잠시 후 다시 시도해 주세요'));
    await press('코드 다시 만들기');
    await press('다시 만들기');
    expect(text()).toContain('잠시 후 다시 시도해 주세요');
    expect(text()).toContain('ABC234');
    expect(text()).toContain('새 코드를 만들면');
  });
});

describe('students', () => {
  it('loads the students with their school', async () => {
    await mount();
    await pick(0);
    expect(api.listClassroomStudents).toHaveBeenCalledWith(1);
    expect(text()).toContain('학생 2명');
    expect(text()).toContain('김학생');
    expect(text()).toContain('한빛중');
    expect(text()).toContain('이학생');
    expect(buttons('내보내기')).toHaveLength(2);
  });

  it('says so when empty and shows a load error with retry', async () => {
    api.listClassroomStudents.mockResolvedValueOnce([]);
    await mount();
    await pick(1);
    expect(text()).toContain('아직 들어온 학생이 없어요.');
    api.listClassroomStudents.mockRejectedValueOnce(new Error('학생을 불러오지 못했어요')).mockResolvedValueOnce([KIM]);
    await pick(0);
    expect(text()).toContain('학생을 불러오지 못했어요');
    await press('다시 시도');
    expect(text()).toContain('김학생');
  });

  it('removes a student after confirming and lowers the count', async () => {
    api.removeClassroomStudent.mockResolvedValue(undefined);
    await mount();
    await pick(0);
    await press('내보내기', 0);
    expect(text()).toContain('김학생 학생을 수업에서 내보낼까요? 계정과 북마크는 그대로이고, 같은 참여코드로 다시 들어올 수 있어요.');
    expect(api.removeClassroomStudent).not.toHaveBeenCalled();
    // 확인 안의 버튼도 같은 라벨이라, 그 학생의 확인 버튼은 목록 순서상 이학생 행 버튼 앞에 온다.
    const confirmIndex = buttons('내보내기').findIndex((b) => b.props.style && b.props.style.flex === 1);
    await press('내보내기', confirmIndex);
    expect(api.removeClassroomStudent).toHaveBeenCalledWith(1, 11);
    expect(text()).not.toContain('김학생');
    expect(text()).toContain('이학생');
    expect(text()).toContain('학생 1명 · 참여 받는 중');
    expect(mockToast).toHaveBeenCalledWith('학생을 내보냈어요');
  });

  it('keeps everyone on cancel and shows a server error on that row', async () => {
    await mount();
    await pick(0);
    await press('내보내기', 0);
    await press('취소');
    expect(api.removeClassroomStudent).not.toHaveBeenCalled();
    expect(text()).not.toContain('내보낼까요?');
    api.removeClassroomStudent.mockRejectedValue(new Error('학생을 찾을 수 없어요.'));
    await press('내보내기', 1);
    const confirmIndex = buttons('내보내기').findIndex((b) => b.props.style && b.props.style.flex === 1);
    await press('내보내기', confirmIndex);
    expect(text()).toContain('학생을 찾을 수 없어요.');
    expect(text()).toContain('이학생');
    expect(text()).toContain('학생 2명 · 참여 받는 중');
  });
});

describe('delete', () => {
  it('stays disabled until the exact name is typed, then deletes and unselects', async () => {
    api.deleteClassroom.mockResolvedValue(undefined);
    await mount();
    await pick(0);
    expect(text()).toContain('수업을 지우면 올린 단어와 학생들의 북마크가 사라지고, 학생들은 수업에서 빠져요. 되돌릴 수 없어요.');
    expect(buttons('수업 삭제')[0].props.disabled).toBe(true);
    await type('삭제할 수업 이름 확인', '겨울 특강 B반');
    expect(buttons('수업 삭제')[0].props.disabled).toBe(true);
    await type('삭제할 수업 이름 확인', '겨울 특강 A반 ');
    expect(buttons('수업 삭제')[0].props.disabled).toBe(true);
    await type('삭제할 수업 이름 확인', '겨울 특강 A반');
    expect(buttons('수업 삭제')[0].props.disabled).toBe(false);
    await press('수업 삭제');
    expect(api.deleteClassroom).toHaveBeenCalledWith(1);
    expect(radios()).toHaveLength(1);
    expect(text()).not.toContain('겨울 특강 A반');
    expect(buttons('수업 삭제')).toHaveLength(0);
    expect(mockToast).toHaveBeenCalledWith('수업을 지웠어요');
  });

  it('shows the server error in place, keeps the classroom, and submits once while busy', async () => {
    const pending = deferred();
    api.deleteClassroom.mockReturnValueOnce(pending.promise);
    await mount();
    await pick(0);
    await type('삭제할 수업 이름 확인', '겨울 특강 A반');
    await press('수업 삭제');
    expect(buttons('수업 삭제')[0].props.disabled).toBe(true);
    await act(async () => buttons('수업 삭제')[0].props.onPress());
    expect(api.deleteClassroom).toHaveBeenCalledTimes(1);
    await act(async () => pending.resolve(undefined));
    expect(radios()).toHaveLength(1);

    await act(async () => tree.unmount());
    api.listClassrooms.mockResolvedValue([A, B]);
    api.deleteClassroom.mockReset().mockRejectedValue(new Error('수업을 찾을 수 없어요.'));
    await mount();
    await pick(0);
    await type('삭제할 수업 이름 확인', '겨울 특강 A반');
    await press('수업 삭제');
    expect(text()).toContain('수업을 찾을 수 없어요.');
    expect(radios()).toHaveLength(2);
  });
});
