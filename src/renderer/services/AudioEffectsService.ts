// 音效处理服务（占位实现）
// TODO: 实现具体的音效处理逻辑，如混响、回声等效果

export class AudioEffectsService {
  /**
   * 断开所有音效节点连接。
   * 当前仅为占位实现，确保在未实现实际音效逻辑时不影响主流程。
   */
  public disconnect(): void {
    // 目前没有任何音效节点需要断开
  }
}

// 单例导出，保持与 audioService 中的使用方式一致
export const audioEffectsService = new AudioEffectsService();