/**
 * 유효하지 않은 스레드 생성 시 발생하는 에러
 */
export class InvalidThreadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidThreadError";
  }
}

/**
 * 유효하지 않은 PostId 생성 시 발생하는 에러
 */
export class InvalidPostIdError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPostIdError";
  }
}
