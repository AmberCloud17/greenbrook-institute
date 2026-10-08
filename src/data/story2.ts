import { HistoryItem, StoryNode } from "./types";
import { hasOption, hasAnyOption } from "./utils";

export const story2: Record<string, StoryNode> = {
  "chapter_2": {
    id: "chapter_2",
    title: "Chapter Two: Autumn Lessons",
    text: [
      "September to October, 1953",
      "For my first class at Greenbrook I had meant to start with short stories—to find some prose with a steady rhythm and help the residents get the feel of reading again, the way you let the engine warm up before driving on a winter morning. But on my first day in the library I came upon a paperback Dickens on the shelf, its spine worn but its pages still in good order, and I carried it into the classroom. Sometimes it is not you who chooses the book; the book chooses you.",
      "The classroom was a room in the east wing: eight chairs set in a half circle, a small blackboard, and a window that opened onto the inner courtyard—this window could be opened, because it faced inward. At nine in the morning the sun slanted in and laid a rectangle across the floor. The residents came in one by one and found their seats, quiet, like a real class, only without satchels or textbooks; some of them, once seated, would spend a while simply looking down at their own hands.",
      "The three I had seen in the corridor all took their places in that half circle.",
      "Thomas Hall sat at the outer end of the half circle, on the left. Daylight gave him a clearer kind of presence, like an object finally set down in the right light, so that you can see at last what it is made of. His eyes were the stillest I have ever seen—not calm; calm has to be tended every day to be kept up—but something that no longer needs keeping up, like a pendulum that has swung through every arc it had and come to rest at its lowest point. He told me later that he used to teach modern philosophy at a university, for twenty-seven years. I believed him, because his speech had a precision worn exceedingly smooth, as though decades at the lectern had polished the road between his thinking and his speaking until it gleamed and was very easy to travel—only sometimes, halfway along that road, he stopped.",
      "Agnes Shaw sat at the center of the half circle. Today she wore a pale dress with a row of small buttons at the collar, every one of them fastened. Her hands rested on her lap, and the rhythm had not stopped. I was reading aloud from Great Expectations, and when I came to “I had always believed myself a gentleman, but the word ‘gentleman’ had never once counted me within its meaning,” her rhythm stopped—stopped for perhaps two seconds—then took up again. What happened in those two seconds, I do not know. But those two seconds gave me a thought: perhaps her rhythm was not merely a habit; perhaps it was something more exact, something with intent.",
      "Louis Parrish sat at the outer end on the right, diagonally across from Thomas. Over the course of the class he laughed four times, was quietly reminded twice by the staff, and apologized twice, each time a little louder than required. His attention came and went; it would drift to the window, drift to the rectangle of sunlight on the floor, but after a while it would come back, and when it came back it came back whole, with something sharp in his eyes that surfaced for the briefest instant and sank again.",
      "The first class was over.",
      "[IMAGE:./2.webp]",
      "Today—where to begin."
    ],
    options: [
      {
        id: "2-1-a",
        label: "▷ Write down today’s class, those two seconds of stillness included.",
        resultText: (history: HistoryItem[]) => {
          const res = [
            "The two seconds when Agnes’s rhythm stopped seem to me the most important thing in this whole building, more important than anything Jeffrey has ever said. In those two seconds, something not yet entirely extinguished flared briefly, at the very moment Dickens’s sentence fell upon her—like a small flame in the wind that trembles up one last time before it is blown out. That is where literature is of use. Not as treatment—as those two seconds. I wrote nearly a page. Whether the residents thought the class was any good, I do not know, but I myself felt it was right."
          ];
          if (hasAnyOption(history, ["1-1-c", "1-3-d"])) {
            res.push("This was the second time. The first was in the corridor: I was sitting beside her, and when I stood up she paused for one beat. That beat, together with today’s two seconds, makes three seconds. Whether three seconds are enough to prove anything, I do not know. But I wrote it down.");
          }
          return res;
        },
        nextId: "chapter_2_2"
      },
      {
        id: "2-1-b",
        label: "▷ Let the residents write freely, and see what they write.",
        resultText: [
          "Agnes drew nothing but musical notes—one long line of them, packed close across the page—and before I could make out what tune it was, a nurse came in and collected the papers, saying they would be “filed first.” I thought it a little strange, but in the diary I translated that strangeness into a respectable sentence: “The administration files the residents’ creative work in order to assess their learning progress; this is standard procedure.” And I added: “The residents were thoroughly engaged in today’s class; I believe this is the right direction.” I hoped that if Jeffrey should ever happen to read my diary, he would think so too."
        ],
        nextId: "chapter_2_2"
      },
      {
        id: "2-1-c",
        label: "▷ Discuss poetry and memory in class; listen closely to what Thomas says.",
        resultText: (history: HistoryItem[]) => {
          const res = [
            "Thomas said, “Sometimes I cannot remember what I ate yesterday, and yet I remember the third line of a poem from ten years ago. Not remembering yesterday happens more and more often now.” I copied this into the diary under the heading “The Selective Mechanism of Memory,” and wrote beneath it that the observation itself showed how very active Thomas’s mind still was. A strong satisfaction welled up in me; I felt this was exactly what I could bring to this place. That satisfaction was very hard to swallow later, when I reread this page. But that came later."
          ];
          if (hasOption(history, "1-1-b")) {
            res.push("When he had said it, Thomas glanced at me and added, “You’re the English teacher who came that first day. You told me you had come to report in. I remember.”");
          }
          return res;
        },
        nextId: "chapter_2_2"
      },
      {
        id: "2-1-d",
        label: "▷ Read poetry aloud, and after class wait for Louis to come over.",
        resultText: (history: HistoryItem[]) => {
          if (hasAnyOption(history, ["1-1-d", "1-2-e", "1-3-b"])) {
            return [
              "After class Louis came over and asked in a low voice, “Mr. Banks, what I told you that time about the windows—have you thought about it?” I was silent a moment, then said, “Louis, this is an institute.” He looked at me for three seconds, nodded, and walked away. I did not put this conversation in the diary."
            ];
          } else {
            return [
              "After class Louis came over and asked in a low voice, “Mr. Banks, is this a hospital?” I was taken aback for a moment, then laughed and said no, it was an institute. Louis looked at me for three seconds, nodded, and walked away. In the diary I wrote: “Louis asked an interesting question today—perhaps a slight misunderstanding of the word ‘institute.’ Next class I might try Whitman; his language is more direct and may better suit residents like Louis.” And at the end I added: “I think I judged the pace of today’s reading rather well.” Having written that, I paused and wondered: is it true, or do I only need it to be true?"
            ];
          }
        },
        nextId: "chapter_2_2"
      },
      {
        id: "2-1-e",
        label: "▷ Sleepless late at night, go and sit in the library for a while.",
        resultText: (history: HistoryItem[]) => {
          const res = [
            "I couldn’t sleep, so I went to the library. Not all the lights were on; only the reading lamp by the window was lit, gathering its light into a cone, and everything else lay steeped in darkness. Thomas sat in the chair in the corner with a book on his knees, closed. When I pushed open the door, he was already looking at the doorway, as though he had been waiting.",
            "I sat down across from him. Neither of us spoke; it was quiet for a while.",
            "He said he used to teach modern philosophy at a university, for twenty-seven years. He said the number with great certainty—not like someone remembering, but like someone stating a fact he checks every day to make sure it has not changed. We talked a little. He began to quote a passage of Wittgenstein and stopped halfway. He had not forgotten—I could see he had not forgotten; it was that he was looking at the sentence he had just spoken as though it were a sentence someone else had said, and so he went no further. It was quiet for a long time. At last he said, “Will you come again tomorrow?”",
            "I said I would."
          ];
          if (hasOption(history, "1-1-b")) {
            res.push("In the silence he said one thing more: “You are the only one who has ever come over on purpose to talk to me. Other people pass by me the way they pass by a chair.”");
          }
          res.push("In the diary I wrote: late at night, Thomas is far more lucid than in the daytime. What this means, I do not know. But I want to come again tomorrow.");
          return res;
        },
        nextId: "chapter_2_2"
      }
    ]
  },
  "chapter_2_2": {
    id: "chapter_2_2",
    text: [
      "The classes found their rhythm, and the days found theirs along with them. Then one day a small thing stopped me short.",
      "Tonight the white tablet after dinner had smoother edges than in the days before, and it broke apart with a different snap.",
      "[IMAGE:./13.webp]"
    ],
    options: [
      {
        id: "2-2-a1",
        label: "▷ “Probably a different batch.”",
        resultText: [
          "In the diary I wrote: “Tonight’s tablet seems to come from a new batch; the edges are a little smoother—probably some change in supply, nothing to worry about.” Having written it, I set it aside and thought no more about it."
        ],
        nextId: "chapter_2_3"
      },
      {
        id: "2-2-b1",
        label: "▷ Record the change in the tablet just as it is, without passing judgment.",
        resultText: [
          "In the diary I wrote it down exactly: tonight’s tablet had smoother edges than in the days before, and did not snap as crisply when broken. I did not explain it; I only recorded it. I don’t know why I felt I had to, but I felt that with some things, it is better to write them down first than to explain them away first."
        ],
        nextId: "chapter_2_3"
      },
      {
        id: "2-2-c1",
        label: "▷ Think nothing of it; write about the poem we read in class today.",
        resultText: [
          "I paid the tablet no mind and turned to writing about the Dickens we had read in class today. As I wrote, the business of the tablet slipped from my mind."
        ],
        nextId: "chapter_2_3"
      }
    ]
  },
  "chapter_2_3": {
    id: "chapter_2_3",
    text: [
      "Today the seat of the resident who had “graduated” was taken by a newcomer, and no one mentioned where the previous one had gone. I could not remember the previous one’s face."
    ],
    options: [
      {
        id: "2-2-a2",
        label: "▷ “He graduated, didn’t he? Jeffrey said so.”",
        resultText: [
          "In the diary I wrote: “The resident by the window has graduated, and a new resident has arrived. People come and go; that is only natural.” It came out so smoothly that I believed it myself."
        ],
        nextId: "chapter_2_4_check"
      },
      {
        id: "2-2-b2",
        label: "▷ Record the plain fact itself: “I cannot remember his face.”",
        resultText: [
          "I tried to write down the man’s face. I wrote about the seat he sat in, about roughly what his hands looked like, about the light when we talked—all things around the edges, not one of them his face. In the end I wrote: I cannot remember his face. Just that one sentence; I did not explain it further. When the newcomer sat down, the way his silverware was laid out and the angle of his chair were exactly the same as for the man who had disappeared, as though the seat remembered how it was supposed to look, and whoever sat in it could be replaced."
        ],
        nextId: "chapter_2_4_check"
      },
      {
        id: "2-2-c2",
        label: "▷ Write about the newcomer, and don’t think about the old one.",
        resultText: [
          "I wrote about the newcomer—how he sat, how he ate, whether he talked much. As I wrote, the old one withdrew from my pen entirely."
        ],
        nextId: "chapter_2_4_check"
      }
    ]
  },
  "chapter_2_4_check": {
    id: "chapter_2_4_check",
    text: (history: HistoryItem[]) => {
      if (hasAnyOption(history, ["1-1-d", "1-2-e", "1-3-b"])) {
        return ["At lunch Louis pointed at the window: “That window is locked from the outside.” He didn’t look at me as he said it; he pointed once, then put his hand back down and went on eating, as if he had said something that did not much concern him, as if he had said the soup was a little thin today."];
      } else {
        return ["In an ordinary conversation with Jeffrey, he used the words “therapeutic results,” then at once corrected himself to “learning progress.” I noticed the correction."];
      }
    },
    options: [
      {
        id: "2-2-a3",
        label: "▷ Find a reasonable explanation",
        condition: (history: HistoryItem[]) => hasAnyOption(history, ["1-1-d", "1-2-e", "1-3-b"]),
        resultText: [
          "In the diary I wrote: “Louis was in good spirits today; his powers of observation regarding his surroundings are improving.” I had translated what he said into a compliment."
        ],
        nextId: "chapter_2_5_check"
      },
      {
        id: "2-2-b3",
        label: "▷ Write down exactly what Louis said.",
        condition: (history: HistoryItem[]) => hasAnyOption(history, ["1-1-d", "1-2-e", "1-3-b"]),
        resultText: [
          "I wrote down Louis’s words exactly, without changing one: “That window is locked from the outside.” I added no comment. Once it was written, I stared at the sentence for a while, then turned the page and began writing about something else—but the sentence was still there, one sheet of paper away."
        ],
        nextId: "chapter_2_5_check"
      },
      {
        id: "2-2-c3",
        label: "▷ Let his remark pass, and go back to eating.",
        condition: (history: HistoryItem[]) => hasAnyOption(history, ["1-1-d", "1-2-e", "1-3-b"]),
        resultText: [
          "I let his remark pass and bent over my soup. The soup was a little thin, it’s true. What Louis said, I did not write down."
        ],
        nextId: "chapter_2_5_check"
      },
      {
        id: "2-2-a4",
        label: "▷ “Probably just a slip of the tongue.”",
        condition: (history: HistoryItem[]) => !hasAnyOption(history, ["1-1-d", "1-2-e", "1-3-b"]),
        resultText: [
          "In the diary I wrote: “Director Coleman made a small slip today, saying something else in place of ‘learning progress,’ and corrected himself at once. Everyone misspeaks now and then.”\nOn those nights, I opened The Glass Detective again."
        ],
        nextId: "nested_novel_2"
      },
      {
        id: "2-2-b4",
        label: "▷ Write down the words he took back: “therapeutic results.”",
        condition: (history: HistoryItem[]) => !hasAnyOption(history, ["1-1-d", "1-2-e", "1-3-b"]),
        resultText: [
          "I wrote down the words he had taken back: first he said “therapeutic results,” then changed it to “learning progress.” A word that is taken back at once is often truer than the one left standing. I wrote that thought down too, and then felt a little cold, though the room was not cold.\nOn those nights, I opened The Glass Detective again."
        ],
        nextId: "nested_novel_2"
      },
      {
        id: "2-2-c4",
        label: "▷ It doesn’t seem important; leave it out.",
        condition: (history: HistoryItem[]) => !hasAnyOption(history, ["1-1-d", "1-2-e", "1-3-b"]),
        resultText: [
          "I thought it was nothing—just a word; who doesn’t stumble over a word now and then? I did not write it down.\nOn those nights, I opened The Glass Detective again."
        ],
        nextId: "nested_novel_2"
      }
    ]
  },
  "chapter_2_5_check": {
    id: "chapter_2_5_check",
    text: [
      "In an ordinary conversation with Jeffrey, he used the words “therapeutic results,” then at once corrected himself to “learning progress.” I noticed the correction."
    ],
    options: [
      {
        id: "2-2-a4_full",
        label: "▷ “Probably just a slip of the tongue.”",
        resultText: [
          "In the diary I wrote: “Director Coleman made a small slip today, saying something else in place of ‘learning progress,’ and corrected himself at once. Everyone misspeaks now and then.”\nOn those nights, I opened The Glass Detective again."
        ],
        nextId: "nested_novel_2"
      },
      {
        id: "2-2-b4_full",
        label: "▷ Write down the words he took back: “therapeutic results.”",
        resultText: [
          "I wrote down the words he had taken back: first he said “therapeutic results,” then changed it to “learning progress.” A word that is taken back at once is often truer than the one left standing. I wrote that thought down too, and then felt a little cold, though the room was not cold.\nOn those nights, I opened The Glass Detective again."
        ],
        nextId: "nested_novel_2"
      },
      {
        id: "2-2-c4_full",
        label: "▷ It doesn’t seem important; leave it out.",
        resultText: [
          "I thought it was nothing—just a word; who doesn’t stumble over a word now and then? I did not write it down.\nOn those nights, I opened The Glass Detective again."
        ],
        nextId: "nested_novel_2"
      }
    ]
  },
  "nested_novel_2": {
    id: "nested_novel_2",
    text: [
      "Henry lived in an old two-story frame house. The landlady, a Mrs. Griffith, was past seventy and lived downstairs; Henry lived upstairs. Mrs. Griffith told Marian that Henry had lived there for nine years and was the quietest tenant she had ever had: in nine years he had never once complained, never once been late with the rent, never brought anyone home—except once, perhaps four or five years ago, when an old foreign man came and stayed three days, and he and Henry talked upstairs for three days in a language Mrs. Griffith could not understand at all. It was not German, and it was not French; she had spent time in Europe as a young woman and could recognize the common languages, but what was spoken upstairs those three days she could not place at all. The sound of it was soft and quick, full of sounds her tongue could not make, like water running over stones, or like some kind of bird. After three days the old man left, and Henry came downstairs and said to her: I’m sorry for the disturbance; that was one of my teachers. Mrs. Griffith said that ever since then, something about Henry had seemed different—she couldn’t say what, only that it was different—though perhaps she was misremembering; it had been four or five years, after all, and when you get old, memory puts things into what happened all on its own, and takes things out on its own too, and you cannot check it, because everyone who could have checked it is gone.",
      "Marian went upstairs. Henry Ward sat at his desk. On the desk stood seven dictionaries, one for each language he knew, lined up in a row—like a file of sentries, or like a row of headstones, depending on your mood that day. There was also a stack of manuscript paper on the desk, blank, not a single word on it. His hands lay on the desktop, very still—an ordinary pair of hands, without the calluses twenty years of translating ought to have left, smooth, lying there as though they had lain there a very long time, so long that their owner had long since forgotten they were there.",
      "Marian sat down across from Henry and opened her notebook."
    ],
    options: [
      {
        id: "2-nn2-a",
        label: "▷ She notes the order in which the seven dictionaries stand.",
        resultText: [
          "The seven dictionaries stood in some kind of order, but not by size, not alphabetically by language, not by year of publication, not by thickness, not by any logic she could think of. She went along the spines one by one and noted the order from left to right: Romanian, Serbo-Croatian, Hungarian, Polish, Russian, German, and at the far right a hand-bound booklet with no title, its cover blank. Suddenly she understood: this was the order in which Henry had learned these languages, ranged from the last learned to the first, and the blank one on the far right was the one he was still learning, or had learned but not yet had time to make a dictionary for—the mountain dialect that only two or three people could still speak. The dictionaries were arranged in the order of forgetting. There is only one circumstance in which a person arranges his belongings in the order of forgetting: when he knows he is about to begin forgetting, and wants to know which end it will start from."
        ],
        nextId: "chapter_3"
      },
      {
        id: "2-nn2-b",
        label: "▷ She notes the stack of blank manuscript paper.",
        resultText: [
          "The paper was new, without a crease, but the corner of the top sheet had been rolled slightly by fingers, which meant it had lain there a long time and been picked up and put down, picked up and put down, many times over, with not a word written. Marian picked up the top sheet and held it to the light from the window: nothing—no impressions, no erased writing, only a blank sheet of paper. She thought of what Alma had said: the one hundred and thirty-seven blank sheets Henry had mailed back to the press. She realized she was doing arithmetic, reaching with numbers for something numbers could not reach. She put the paper back, as nearly as she could the way she had found it, with the curled corner of the top sheet turned the way it had been—though she knew that Henry probably would not notice, or would notice but not care, or would care but have no way of expressing that he cared. She could rule out none of these three possibilities, and that was what disturbed her most about this room: here, every possibility held true at once, because the one person who could have ruled them out did not speak."
        ],
        nextId: "chapter_3"
      },
      {
        id: "2-nn2-c",
        label: "▷ She notes Henry’s hands.",
        resultText: [
          "Translation usually means writing a great many words, and Marian had expected to see a pair of worn hands, the knuckles thickened, a callus on the middle finger. But Henry’s hands were smooth and clean, the nails neatly trimmed—the hands of a man who had not held a pen in a long time. She stared at those hands for a long while, long enough to be a little rude, but Henry did not mind, or did not know what rudeness was, or knew, but that knowing had been severed along with everything else. She noticed that now and then the index finger of Henry’s right hand would move, very slightly, on the desktop—not tapping, but some smaller motion, as though writing on an invisible surface, stroke by stroke, finishing one letter, pausing, then writing the next. Marian held her breath, trying to recognize a single letter among those invisible strokes. She could not. That hand was writing in a language that left no trace on any surface, writing for a reader who was not present—or writing nothing at all: only a hand that remembered it had once known how to write, and so, without pen, without paper, without reader, went on making the motion it had made all its life, like an amputee who can still feel the leg that is no longer there begin to itch."
        ],
        nextId: "chapter_3"
      }
    ]
  }
};
