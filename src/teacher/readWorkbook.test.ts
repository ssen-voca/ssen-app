import readXlsxFile from 'read-excel-file/browser';
import { readWorkbook } from './readWorkbook';

jest.mock('read-excel-file/browser', () => ({ __esModule: true, default: jest.fn() }));

const mockRead = readXlsxFile as unknown as jest.Mock;
const FILE = new Blob(['x']);

beforeEach(() => mockRead.mockReset());

describe('readWorkbook', () => {
  it('returns every sheet with its name and rows', async () => {
    mockRead.mockResolvedValue([
      { sheet: 'Week 1', data: [['번호', '표제어'], [1, 'insight']] },
      { sheet: '설명', data: [['안내']] },
    ]);

    await expect(readWorkbook(FILE)).resolves.toEqual([
      { name: 'Week 1', rows: [['번호', '표제어'], [1, 'insight']] },
      { name: '설명', rows: [['안내']] },
    ]);
    expect(mockRead).toHaveBeenCalledWith(FILE);
  });

  it('maps any library error to a Korean message', async () => {
    mockRead.mockRejectedValue(new Error('End of data reached (data length = 4, asked index: 8)'));

    await expect(readWorkbook(FILE)).rejects.toThrow('엑셀 파일(.xlsx)을 읽을 수 없어요.');
  });
});
