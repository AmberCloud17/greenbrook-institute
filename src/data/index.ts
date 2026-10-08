import { story1 as storyData1 } from "./story1";
import { story2 as storyData2 } from "./story2";
import { story3 as storyData3 } from "./story3";
import { story4 as storyData4 } from "./story4";
import { story5 as storyData5 } from "./story5";
import { StoryNode } from "./types";

export { storyData1 as storyData, storyData2, storyData3, storyData4, storyData5 };

export const allStoryNodes: Record<string, StoryNode> = {
  ...storyData1,
  ...storyData2,
  ...storyData3,
  ...storyData4,
  ...storyData5
};

