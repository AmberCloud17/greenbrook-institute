import { HistoryItem, StoryNode } from "./types";
import { hasOption } from "./utils";

export const story5: Record<string, StoryNode> = {
  "chapter_5_1": {
    id: "chapter_5_1",
    title: "Chapter Five: Afterward",
    text: [
      "When I finished, I closed the book and put it back on the nightstand. In the diary I wrote only one line: “Read a book today.”",
      "Then I turned to a new page and wrote: “Surgery, next Wednesday.”",
      "A long pause.",
      "Then I wrote: “I feel—”",
      "Then I crossed it out.",
      "________________________________________",
      "After January 1954",
      "The surgery is next Wednesday.",
      "The surgery was done next Wednesday.",
      "________________________________________",
      "Ate breakfast today. It is cold."
    ],
    options: [
      {
        id: "5-1-a",
        label: "▷ A. Lunch was mashed potatoes. I ate it.",
        resultText: [
          "I ate. I slept. Today is cold. I want to write something, but I don’t know what to write. The days are flat; I can’t tell one day from the next anymore. I remember I used to know how to write—long things, about roses, about a person’s hand, about a smell. Now I write “today is cold.” That is writing too."
        ],
        nextId: "chapter_5_2"
      },
      {
        id: "5-1-b",
        label: "▷ B. After lunch I slept.",
        resultText: [
          "I ate. I slept. Today is cold. I want to write something, but I don’t know what to write. The days are flat; I can’t tell one day from the next anymore. I remember I used to know how to write—long things, about roses, about a person’s hand, about a smell. Now I write “today is cold.” That is writing too."
        ],
        nextId: "chapter_5_2"
      },
      {
        id: "5-1-c",
        label: "▷ C. Today is cold. Over by the window it is cold.",
        resultText: [
          "I ate. I slept. Today is cold. I want to write something, but I don’t know what to write. The days are flat; I can’t tell one day from the next anymore. I remember I used to know how to write—long things, about roses, about a person’s hand, about a smell. Now I write “today is cold.” That is writing too."
        ],
        nextId: "chapter_5_2"
      },
      {
        id: "5-1-d",
        label: "▷ D. I want to write something.",
        resultText: [
          "I ate. I slept. Today is cold. I want to write something, but I don’t know what to write. The days are flat; I can’t tell one day from the next anymore. I remember I used to know how to write—long things, about roses, about a person’s hand, about a smell. Now I write “today is cold.” That is writing too."
        ],
        nextId: "chapter_5_2"
      }
    ]
  },
  "chapter_5_2": {
    id: "chapter_5_2",
    text: [
      "Lunch today was bread and soup. I had the soup first."
    ],
    options: [
      {
        id: "5-2-a",
        label: "▷ A. I lay down.",
        resultText: [
          "I lay down. Eyes closed, and later open again. Someone came, in white, and gave me a cup, and I drank. What was in the cup was sweet. Or not sweet. I can’t taste for certain anymore. I remember I wrote about “can’t taste for certain” once before; which day I wrote it, I can’t find. There is too much paper. Or too little."
        ],
        nextId: "chapter_5_3"
      },
      {
        id: "5-2-b",
        label: "▷ B. Went to the toilet. Twice. Or three times.",
        resultText: [
          "I lay down. Eyes closed, and later open again. Someone came, in white, and gave me a cup, and I drank. What was in the cup was sweet. Or not sweet. I can’t taste for certain anymore. I remember I wrote about “can’t taste for certain” once before; which day I wrote it, I can’t find. There is too much paper. Or too little."
        ],
        nextId: "chapter_5_3"
      },
      {
        id: "5-2-c",
        label: "▷ C. Sunlight on the floor. A square. Then it was gone.",
        resultText: [
          "I lay down. Eyes closed, and later open again. Someone came, in white, and gave me a cup, and I drank. What was in the cup was sweet. Or not sweet. I can’t taste for certain anymore. I remember I wrote about “can’t taste for certain” once before; which day I wrote it, I can’t find. There is too much paper. Or too little."
        ],
        nextId: "chapter_5_3"
      },
      {
        id: "5-2-d",
        label: "▷ D. I lay down.",
        resultText: [
          "I lay down. Eyes closed, and later open again. Someone came, in white, and gave me a cup, and I drank. What was in the cup was sweet. Or not sweet. I can’t taste for certain anymore. I remember I wrote about “can’t taste for certain” once before; which day I wrote it, I can’t find. There is too much paper. Or too little."
        ],
        nextId: "chapter_5_3"
      }
    ]
  },
  "chapter_5_3": {
    id: "chapter_5_3",
    text: [
      "Today is cold."
    ],
    options: [
      {
        id: "5-3-a",
        label: "▷ A. Eat.",
        resultText: ["Eat. Sleep. Cold."],
        nextId: "chapter_5_4"
      },
      {
        id: "5-3-b",
        label: "▷ B. Sleep.",
        resultText: ["Eat. Sleep. Cold."],
        nextId: "chapter_5_4"
      },
      {
        id: "5-3-c",
        label: "▷ C. Cold.",
        resultText: ["Eat. Sleep. Cold."],
        nextId: "chapter_5_4"
      }
    ]
  },
  "chapter_5_4": {
    id: "chapter_5_4",
    text: [
      "Today is cold. Today I ate. Today I slept."
    ],
    options: [
      {
        id: "5-4-a",
        label: "▷ A. Eat.",
        resultText: [
          "Eat. Sleep. Cold.",
          "Someone talked. I nodded. I nod because when you nod, things get simple. I don’t remember whether “simple” is a good thing. I don’t remember “good.”"
        ],
        nextId: "chapter_5_5_1"
      },
      {
        id: "5-4-b",
        label: "▷ B. Sleep.",
        resultText: [
          "Eat. Sleep. Cold.",
          "Someone talked. I nodded. I nod because when you nod, things get simple. I don’t remember whether “simple” is a good thing. I don’t remember “good.”"
        ],
        nextId: "chapter_5_5_1"
      },
      {
        id: "5-4-c",
        label: "▷ C. Cold.",
        resultText: [
          "Eat. Sleep. Cold.",
          "Someone talked. I nodded. I nod because when you nod, things get simple. I don’t remember whether “simple” is a good thing. I don’t remember “good.”"
        ],
        nextId: "chapter_5_5_1"
      }
    ]
  },
  "chapter_5_5_1": {
    id: "chapter_5_5_1",
    text: [],
    options: [
      { id: "5-5-1-a", label: "▷ A. Eat.", resultText: ["Eat."], nextId: "chapter_5_5_2" },
      { id: "5-5-1-b", label: "▷ B. Eat.", resultText: ["Eat."], nextId: "chapter_5_5_2" },
      { id: "5-5-1-c", label: "▷ C. Eat.", resultText: ["Eat."], nextId: "chapter_5_5_2" }
    ]
  },
  "chapter_5_5_2": {
    id: "chapter_5_5_2",
    text: [],
    options: [
      { id: "5-5-2-a", label: "▷ A. Eat.", resultText: ["Eat."], nextId: "chapter_5_5_3" },
      { id: "5-5-2-b", label: "▷ B. Eat.", resultText: ["Eat."], nextId: "chapter_5_5_3" },
      { id: "5-5-2-c", label: "▷ C. Eat.", resultText: ["Eat."], nextId: "chapter_5_5_3" }
    ]
  },
  "chapter_5_5_3": {
    id: "chapter_5_5_3",
    text: [],
    options: [
      { id: "5-5-3-a", label: "▷ A. Sleep.", resultText: ["Sleep."], nextId: "chapter_5_5_4" },
      { id: "5-5-3-b", label: "▷ B. Sleep.", resultText: ["Sleep."], nextId: "chapter_5_5_4" },
      { id: "5-5-3-c", label: "▷ C. Sleep.", resultText: ["Sleep."], nextId: "chapter_5_5_4" }
    ]
  },
  "chapter_5_5_4": {
    id: "chapter_5_5_4",
    text: [],
    options: [
      { id: "5-5-4-a", label: "▷ A. Sleep.", resultText: ["Sleep."], nextId: "chapter_5_5_5" },
      { id: "5-5-4-b", label: "▷ B. Sleep.", resultText: ["Sleep."], nextId: "chapter_5_5_5" },
      { id: "5-5-4-c", label: "▷ C. Sleep.", resultText: ["Sleep."], nextId: "chapter_5_5_5" }
    ]
  },
  "chapter_5_5_5": {
    id: "chapter_5_5_5",
    text: [],
    options: [
      { id: "5-5-5-a", label: "▷ A. Cold.", resultText: ["Cold."], nextId: "chapter_5_5_6" },
      { id: "5-5-5-b", label: "▷ B. Cold.", resultText: ["Cold."], nextId: "chapter_5_5_6" },
      { id: "5-5-5-c", label: "▷ C. Cold.", resultText: ["Cold."], nextId: "chapter_5_5_6" }
    ]
  },
  "chapter_5_5_6": {
    id: "chapter_5_5_6",
    text: [],
    options: [
      { id: "5-5-6-a", label: "▷ A. Cold.", resultText: ["Cold."], nextId: "chapter_5_5_7" },
      { id: "5-5-6-b", label: "▷ B. Cold.", resultText: ["Cold."], nextId: "chapter_5_5_7" },
      { id: "5-5-6-c", label: "▷ C. Cold.", resultText: ["Cold."], nextId: "chapter_5_5_7" }
    ]
  },
  "chapter_5_5_7": {
    id: "chapter_5_5_7",
    text: [],
    options: [
      { id: "5-5-7-a", label: "▷ A. Cold.", resultText: ["Cold."], nextId: "chapter_5_5_8" },
      { id: "5-5-7-b", label: "▷ B. Cold.", resultText: ["Cold."], nextId: "chapter_5_5_8" },
      { id: "5-5-7-c", label: "▷ C. Cold.", resultText: ["Cold."], nextId: "chapter_5_5_8" }
    ]
  },
  "chapter_5_5_8": {
    id: "chapter_5_5_8",
    text: [],
    options: [
      { id: "5-5-8-a", label: "▷ A. Cold.", resultText: ["Cold."], nextId: "chapter_5_final" },
      { id: "5-5-8-b", label: "▷ B. Cold.", resultText: ["Cold."], nextId: "chapter_5_final" }
    ]
  },
  "chapter_5_final": {
    id: "chapter_5_final",
    text: [
      "Eat.",
      "Eat.",
      "Eat.",
      "Sleep.",
      "Sleep.",
      "Sleep.",
      "Cold.",
      "Cold.",
      "Cold.",
      "Eat. Sleep. Cold.",
      "Eat. Sleep. Cold.",
      "eatsleepcoldeatsleepcoldeatsleepcoldeatsleepcoldeatsleepcoldeatsleepcoldeatsleepcoldeatsleepcoldeatsleepcoldeatsleepcoldeatsleepcoldeatsleepcold",
      "eatsleepcoldeatsleepcoldeatsleepcoldeatsleepcoldeatsleepcoldeatsleepcoldeatsleepcoldeatsleepcoldeatsleepcoldeatsleepcoldeatsleepcoldeatsleepcold",
      "eatsleepcoldeatsleepcoldeatsleepcoldeatsleepcoldeatsleepcoldeatsleepcoldeatsleepcoldeatsleepcoldeatsleepcoldeatsleepcoldeatsleepcoldeatsleepcold",
      "Cold.",
      "Cold.",
      "Cold.",
      "Cold.",
      "Cold.",
      "Cold.",
      "Cold.",
      "________________________________________",
      "The diary has run out of pages. At the end there is one blank page.",
      "[IMAGE:./5.webp]"
    ],
    options: [
      {
        id: "5-end-a",
        label: "▷ Close the diary.",
        resultText: [
            "Here the diary ends."
        ],
        nextId: "report_discharge"
      },
      {
        id: "5-end-b",
        label: "▷ Keep turning the pages.",
        resultText: [
          "Blank.",
          "Blank.",
          "Blank.",
          "Blank.",
          "There are no more pages. This is the last page of the book.",
          "The things he would have written—the things about to fall and not yet fallen, hanging in that last inch—were never written down. Not because anyone took them away. It is that when the time came to write them, the hand no longer remembered that it had ever known how to write.",
          "Blank.",
          "— The End —"
        ],
        nextId: "end"
      }
    ]
  },
  "report_discharge": {
    id: "report_discharge",
    text: (history: HistoryItem[]) => {
      const res = [
        "[This report was found tucked inside the back cover of the diary.]",
        "Greenbrook Psychiatric Rehabilitation Hospital · Discharge Assessment Report",
        "Patient: Edward Banks · Date of Admission: September 7, 1953 · Date of Surgery: January 14, 1954",
        "Assessment: Patient is emotionally stable and cooperative with treatment; eats and sleeps regularly; shows no aggression; social functioning meets the criteria for discharge. Recovery good.",
        "Attending Physician: R. Kevins"
      ];
      if (hasOption(history, "3-2-e") && hasOption(history, "4-4")) {
        res.push("Record of family visits: Mother visited on January 20, 1954, and remarked, “He looks so much better than he used to.”");
      }
      return res;
    },
    options: [
      {
        id: "5-end-report",
        label: "▷ Finish",
        resultText: ["— The End —"],
        nextId: "end"
      }
    ]
  }
};