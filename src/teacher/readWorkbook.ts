import readXlsxFile from 'read-excel-file/browser';
import type { SheetData } from './excel';

/** 엑셀 파일(.xlsx)의 모든 시트를 읽는다. 라이브러리는 이 함수 하나 뒤에 둔다(테스트에서 바꿔 끼우기 쉽게). */
export async function readWorkbook(file: Blob): Promise<SheetData[]> {
  try {
    const sheets = await readXlsxFile(file);
    return sheets.map(({ sheet, data }) => ({ name: sheet, rows: data }));
  } catch {
    throw new Error('엑셀 파일(.xlsx)을 읽을 수 없어요.');
  }
}
