import { HistoryItem } from "./types";

export const hasOption = (history: HistoryItem[], optionId: string) => {
  return history.some(item => item.selectedOptionId === optionId);
};

export const hasAnyOption = (history: HistoryItem[], optionIds: string[]) => {
  return history.some(item => item.selectedOptionId && optionIds.includes(item.selectedOptionId));
};

export const hasAllOptions = (history: HistoryItem[], optionIds: string[]) => {
  return optionIds.every(id => history.some(item => item.selectedOptionId === id));
};

export const unselectedOptions = (history: HistoryItem[], ...optionIds: string[]) => {
  return optionIds.filter(id => !hasOption(history, id));
};
