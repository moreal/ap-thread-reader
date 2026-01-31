import type { PostId } from "../values";
import type { Post } from "../models";

/**
 * 포스트 저장소 인터페이스
 * 인프라 레이어에서 구현됨
 */
export interface PostRepository {
  findById(id: PostId): Promise<Post | null>;
  findReplies(post: Post, authorFilter?: string): Promise<Post[]>;
}
