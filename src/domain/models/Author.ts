import type { AuthorId } from "../values";

/**
 * 작성자 정보
 */
export interface Author {
  /** 작성자의 고유 URI */
  id: AuthorId;

  /** 표시 이름 */
  name: string;

  /** 프로필 URL (브라우저에서 볼 수 있는 URL) */
  url: string | null;
}
