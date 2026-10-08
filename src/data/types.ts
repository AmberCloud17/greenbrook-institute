export interface HistoryItem {
  nodeId: string;
  selectedOptionId: string | null;
}

export type Option = {
  id: string;
  label: string;
  desc?: string;
  resultText?: string | string[] | ((history: HistoryItem[]) => string[]);
  /** 终局选项（如第四章的「结束本章」）没有 nextId，由信封流程接管跳转。 */
  nextId?: string;
  condition?: (history: HistoryItem[]) => boolean;
};

export type StoryNode = {
  id: string;
  title?: string;
  text: string[] | ((history: HistoryItem[]) => string[]);
  options: Option[];
};
