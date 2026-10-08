import { HistoryItem, StoryNode } from "./types";
import { hasOption, hasAnyOption } from "./utils";

const unselectedOptions = (history: HistoryItem[], ...ids: string[]) => {
  return ids.filter(id => !hasOption(history, id));
};

export const story4: Record<string, StoryNode> = {
  "chapter_4_hub": {
    id: "chapter_4_hub",
    title: "Chapter Four: A Call for Help",
    text: [
      "January 1954",
      "The surgery is next Wednesday.",
      "Until then, there is still time. Or rather, there are still a few roads, and I can try each one of them.",
      "I know now what this place is. I know, too, that there is not much time."
    ],
    options: [
      {
        id: "4-1",
        label: "▷ Go to Thomas—late at night, in the library.",
        condition: (history: HistoryItem[]) => !hasOption(history, "4-1"),
        resultText: (history: HistoryItem[]) => {
          if (hasOption(history, "2-1-e")) {
            return [
              "Late at night, the library; a single night-lamp in the corridor, dim and yellow.",
              "He was sitting there. The lamp lit up his side of the table, and the chair across from him was lit as well, as though he had been keeping that chair for someone all along.",
              "“So you know now, after all,” he said.",
              "“I know,” I said. It was the first time I had said it out loud. The moment it was said, the weight of the thing changed, as if something that had been pressing on my chest all this time had suddenly taken on a shape, something I could touch.",
              "He reached into his pocket and took out a bundle of letters held by an old rubber band; the rubber had perished, gone gray, cracked in places, but had not yet snapped. He laid them on the table one by one, very slowly, very carefully. Seventeen. Each one had a name and an address and a stamp already affixed; the stamps were new, and on a few of them the corners had begun to curl—curled by time.",
              "“Written to people I thought could help me,” he said. “Written, sealed, stamped—and never sent, because every letter here has to pass through Jeffrey’s hands, and Jeffrey will not send letters like these. I tried a great many ways, once. Later I came to see it clearly: this place has no loopholes, Mr. Banks, only procedures. Every loophole you think you have found is part of the procedure.”",
              "Then he drew one letter out of the bundle. My name was on the envelope; the address was Lincoln High School. “This one I wrote for you. I wrote it before you came, because I have seen this happen too many times: someone arrives, and then he knows, and then he wants to leave, and then he cannot leave.” He pushed the letter across to me. “Keep it safe. If the day ever comes when it can be sent, send it.”",
              "Then he said, “I am glad you came tonight.” Only that, very low—not a sentiment, only a true thing said aloud. Tonight someone had come and sat in the chair he had always kept.",
              "We talked the whole night through. He told me everything he remembered: which doors led in and out, when the shifts changed, the door at the back of the yard, the twenty minutes the meal cart took coming and going. His mind was clear that night. Twenty-seven years of teaching philosophy had packed his reasoning so firm that it all showed itself that night: every link fastened true, every step already thinking of the next, like a machine left standing far too long running one last time—all its parts still there, the sound it made so clean it hurt to hear. By three in the morning we had gone over the whole plan twice. “Have you got it?” “I’ve got it.” He nodded, laid his hands on the table, and said nothing more.",
              "At daybreak the staff unlocked the doors.",
              "Thomas stood up, saw the sheet of paper on the table with its drawings and times marked on it, and asked, “What’s this?”",
              "His voice was still the voice of the night before, but the night had gone out of it, gone out completely, the way a tide goes out and leaves the ground dry with nothing left behind. He looked at the paper, and at me, with the look I often saw in the daytime: those clear eyes that were only half awake.",
              "I folded up the paper and said, “Nothing. Just something I was doodling.” He nodded—“Oh”—and walked over to his chair, sat down, and waited for breakfast.",
              "This morning, the library. Thomas doesn’t remember.",
              "The letter he wrote for me, I put away in the suitcase.",
              "Thomas’s dose was three times mine, though I only learned this later. Every night he was lucid for a little while, but those spells grew shorter and less steady, like a candle that burns while the wax lasts and goes out when the wax is gone, and no one can control how much wax that candle has left—not even he."
            ];
          } else if (hasAnyOption(history, ["1-1-b", "2-1-c"])) {
            return [
              "Late at night, the library; a single night-lamp in the corridor, dim and yellow.",
              "He was sitting there, and when he saw me come in, he knew me. I told him what I knew. He was silent for a long time; then he reached into his pocket and took out a bundle of letters held by an old rubber band. Seventeen of them, each with a name, an address, and a stamp already affixed. Not one had been sent.",
              "“Written to people I thought could help me,” he said. “They cannot be sent, because every letter has to pass through Jeffrey’s hands. This place has no loopholes, Mr. Banks, only procedures.” He looked at the bundle of letters and said nothing more. We knew each other, but not yet well enough to take a risk together. That he showed me these letters at all was the most he had to give.",
              "Thomas showed me the seventeen letters he had written. Not one has been sent.",
              "Thomas’s dose was three times mine, though I only learned this later. Every night he was lucid for a little while, but those spells grew shorter and less steady, like a candle that burns while the wax lasts and goes out when the wax is gone, and no one can control how much wax that candle has left—not even he."
            ];
          } else {
            return [
              "Late at night, the library; a single night-lamp in the corridor, dim and yellow.",
              "He was sitting there. I went over, meaning to say something to him, but we had never really spoken; standing before him, I suddenly did not know how to begin telling an old man I did not know, “This place is not what it seems; we all have to get out.” He looked up at me. His gaze was clear, but it was also empty; he was waiting for me to speak, and I was waiting for myself to speak, and so we waited on each other, until at last I said, “Sorry to disturb you,” and walked away.",
              "If only it had been sooner, I thought—if only on that first day I had stopped in the corridor and said a word to him, tonight might have been different. But there was no sooner anymore.",
              "I wanted to talk to the old man. But we had never spoken. I stood in front of him and could not say anything.",
              "Thomas’s dose was three times mine, though I only learned this later. Every night he was lucid for a little while, but those spells grew shorter and less steady, like a candle that burns while the wax lasts and goes out when the wax is gone, and no one can control how much wax that candle has left—not even he."
            ];
          }
        },
        nextId: "chapter_4_progress"
      },
      {
        id: "4-2",
        label: "▷ Go to Agnes—I have begun to suspect that rhythm.",
        condition: (history: HistoryItem[]) => !hasOption(history, "4-2"),
        resultText: (history: HistoryItem[]) => {
          const res = [
            "In the library I found a thin pamphlet on the history of radio communication, tucked behind a much thicker book. I took it back to my room and read it for two hours under the bedside lamp. Short-short-short, long-long-long, short-short-short. Dot-dot-dot, dash-dash-dash, dot-dot-dot. I wrote it in the corner of a page of the diary and stared at it for a long time. The next day I carried a book of sheet music into class and pretended to leaf through it, noting Agnes’s rhythm out of the corner of my eye and marking dots in the margins of the score. That afternoon, back in my room, I took that long string of dots and dashes, matched the longs and shorts against the code table, and turned them into letters.",
            "[IMAGE:./10.webp]",
            "S. O. S.",
            "Over and over, the whole class long, from the moment I entered the room until I left it—since that morning of September 7 when I first walked past her, she had been saying these three letters all along.",
            "I sat at the desk for a long time. The first person I thought of was not myself but her—Agnes Shaw, fifty years old, her hair combed every day by someone else, the top button of her collar fastened by someone else. Her fingers had been left to her, left to send this signal to everyone who passed her by; she had been sending it from the very first day—while I wasn’t listening, while I was thinking of Keats, while I took it for the rhythm of some tune, she had been sending it all along.",
            "I realized that Agnes was not someone who could help me. She was another one waiting to be rescued, sending out her signal in the only language she had left. Both of us needed someone to come for us; neither of us could save the other."
          ];
          if (hasAnyOption(history, ["1-1-c", "1-3-d"])) {
            res.push("That afternoon I went to find her in the library and sat down beside her and did nothing, only sat. Her rhythm went on—short-short-short, long-long-long, short-short-short—and this time I understood what it meant. As I sat down, her rhythm gave the briefest pause, less than a beat, then went on. I understood what that pause meant now: the beat she had paused in the corridor that first day, and this less-than-a-beat today—whenever anyone came near, she would pause like that, and then go on sending, because stopping did no good; only going on sending did any good, and she had always gone on. She knew someone was finally listening. But being heard did no good either. That was the part of the whole thing that hurt me most.");
          } else {
            res.push("I wanted to reach her. I sat down beside her, but she treated me as she would any stranger passing by: her fingers never stopped, her eyes never lifted. I understood what she was saying, but she did not know I understood. Between us there was none of that small recognition—a small recognition that might have been, had I sat down beside her sooner. She went on sending her signal—to the air, to the corridor, to a world she believed was not listening. I heard it, and I had no way to let her know I had heard it, because we had never built that small bridge.");
          }
          res.push("Agnes’s surgery was scheduled one week before mine. A week later her hands lay flat on the table, and the rhythm had stopped. The radio had been switched off. No signal, no static, not even that stretch of empty air between two stations—only switched off. In the diary I wrote: “Agnes has quieted down today.” By the time I wrote that sentence, the word “quiet” had already appeared three times in that entry. I did not notice.");
          return res;
        },
        nextId: "chapter_4_progress"
      },
      {
        id: "4-3",
        label: "▷ Corner Jeffrey in the corridor and have it out in the open.",
        condition: (history: HistoryItem[]) => !hasOption(history, "4-3"),
        resultText: (history: HistoryItem[]) => {
          const res = [
            "I cornered him in the corridor and said it straight out: “This is a mental hospital. I am a patient. I should not be here. When I came, I did not know what this place was.”",
            "He stopped—stopped entirely—and turned to face me squarely, and on his face was something I had not expected: a look of sympathy, like a doctor listening to a patient describe where it hurts.",
            "“Mr. Banks,” he said, his tone quite even, “your mother signed the consent form, and Director Kevins’s assessment was that the program here would suit you best. Our whole team took part in that decision. Every one of us believes we are helping you.”",
            "When he said the words “helping you,” his eyes were earnest. I searched those eyes for a long time, looking for the flaw that only a man who knows he is lying would show, and found nothing. His eyes were clean—the eyes of a man who sincerely believes he is doing the right thing.",
            "I asked, “Then may I leave?” “Once Director Kevins assesses that your recovery has reached the standard, of course you may leave.” “And if I want to leave now?” Something appeared on his face, something close to regret, like a man saying he would very much like to help, but the matter is beyond his power. “The unease you are feeling now is a normal stage in the process of recovery. We can help you through it.”",
            "There was no misunderstanding between us. I understood every word he said, and he understood every word of mine, but something lay between us, wide as a river; he was on his bank and I was on mine. His bank was called “help,” and mine was called “out.” There was no bridge across the river, and there never would be, because as far as he could see, the river did not exist."
          ];
          if (hasAnyOption(history, ["2-2-b1", "2-2-b2", "2-2-b3", "2-2-b4_full"])) {
            res.push(
              "That afternoon I happened to glimpse a page of a case file lying open on the nurses’ station. It was mine. A new line had been added, the ink still fresh: Patient persistently records “anomalous details” in his environment (medication, personnel, doors and windows), displaying a tendency toward systematic paranoid interpretation.",
              "All those things I had faithfully recorded—the change in the tablets, the face I could not recall, Louis’s window, the word Jeffrey took back—I had thought I was keeping evidence. And the evidence I kept was all here, every last item of it; only it had been given a new heading. The more carefully I kept it, the more self-assured that line could be."
            );
          }
          res.push("Talked to Jeffrey today. He says they are helping me. His eyes are sincere. I don’t know what to say.");
          return res;
        },
        nextId: "chapter_4_progress"
      },
      {
        id: "4-4",
        label: "▷ Write to Mother and beg her to come.",
        condition: (history: HistoryItem[]) => !hasOption(history, "4-4"),
        resultText: (history: HistoryItem[]) => {
          const res = [
            "I wrote two pages—calm, setting out facts, making no accusations—and at the end begged her to come and see me herself. I gave it to Jeffrey, and he said he would pass it on.",
            "The letter must have arrived. Ten days later, Mother came.",
            "The visit was arranged in Kevins’s office, with him present. It was the first time I had seen anyone from outside since I came here, the first time I had smelled the outside air. I tried to tell Mother the truth: what Louis had been like before; the windows that were not right; the white tablets handed out by force every night; that this was not a school but a place that “treated” sound people until they became patients.",
            "I spoke quickly, but clearly. I held Mother’s eyes—the eyes I had known all my life. I saw a flicker of astonishment pass through them, then worry, and at last that worry turned into a certainty I knew all too well, a certainty that dropped me into ice.",
            "She did not look at me. She turned her head toward Mr. Kevins, seated behind his desk, with a look only a family member has—a look that begs the professional to confirm it.",
            "“Director Kevins, you see? He’s still like this. Always thinking too much.”",
            "[IMAGE:./3.webp]",
            "In that moment I understood. However much I had written about the rose garden in my earlier letters, however much about an ordinary everyday life—in this room, my lucidity itself was the proof that I was “ill.”"
          ];
          return res;
        },
        nextId: "chapter_4_progress"
      },
      {
        id: "4-5",
        label: "▷ Find my own way out.",
        condition: (history: HistoryItem[]) => !hasOption(history, "4-5"),
        resultText: (history: HistoryItem[]) => {
          const res = [
            "Two weeks of watching. Maps drawn in the margins of the diary, disguised as class schedules and walking routes; every way in and out recorded, the times the shifts changed, the type of lock on the front gate.",
            "The window opened—pried open from the inside. It took some effort, and I scraped the skin of my hand, but that was nothing."
          ];
          if (hasAnyOption(history, ["1-1-d", "1-2-e", "1-3-b"])) {
            res.push("While I was prying at the window, what Louis said that first day suddenly came back to me—“The windows here open from the outside.” He told me on the very first day. He knew on the very first day, and he told me, and I did not put it in the diary. The window did indeed open from the outside; I pried it open from the inside, with a great deal of effort. It came to the same thing.");
          }
          res.push(
            "The grass in the yard was wet, the night dew heavy, and the soles of my shoes were soon soaked through; every step made a faint, wet sound. I kept close to the foot of the wall and followed it to the corner of the outer wall. The gate was over there—one lamp, and under the lamp, a guard.",
            "I stood in the dark for a while, thinking: how long will it take to cross that stretch? If I go fast, will I make a sound? Then the man under the lamp spoke: “Out this late, Mr. Banks?”",
            "He had seen me—had been seeing me all along; or rather, they had always known where I was.",
            "“It’s cold out at night,” he said. “Come, I’ll walk you back.” His tone was mild, like one man doing another a small favor on the way; he called no one, wrote nothing down—nothing at all that would make this look like an incident. He walked me back to my room, said good night, and shut the door.",
            "The next day there were two white tablets in the paper cup.",
            "Last night I went out the window. The guard brought me back. Today the pills became two. Two of them, and the sweetness was fainter. Or the same. I can’t taste for certain anymore."
          );
          return res;
        },
        nextId: "chapter_4_progress"
      }
    ]
  },
  "chapter_4_progress": {
    id: "chapter_4_progress",
    text: [],
    options: [
      {
        id: "4-dummy",
        label: "▷ Keep trying the other ways out, or stop trying",
        resultText: [],
        nextId: "chapter_4_hub",
        condition: (history: HistoryItem[]) => unselectedOptions(history, "4-1", "4-2", "4-3", "4-4", "4-5").length > 0
      },
      {
        id: "4-end",
        label: "▷ I already know how it ends. Close the chapter.",
        condition: (history: HistoryItem[]) => unselectedOptions(history, "4-1", "4-2", "4-3", "4-4", "4-5").length === 0,
        resultText: [
          "Five roads, each followed to its end, each sealed off. I threw myself against them one by one, and by the end I understood: this was not the same wall struck five times. These were five different walls, built of different materials, blocking exits in different directions, but behind them all was the same thing.",
          "Then Director Kevins called me in for a talk. His face was kindly; he sat in a leather chair a little bigger and a little softer than mine.",
          "“Mr. Banks, based on our observations over these past months, we would like to arrange a routine neurological examination for you. It is standard procedure in the recovery program; many residents have had it—quite ordinary. We have it set for next Wednesday. It’s very simple; you needn’t worry about a thing.”",
          "I asked what kind of examination.",
          "He smiled and said, “A small neurosurgical evaluation. Modern medicine has made procedures of this kind very safe indeed. Afterward, you’ll feel a great deal better.”",
          "Back in my room, I opened the diary and wrote: “Routine examination, next Wednesday.”",
          "A long pause. A period. I closed the diary."
        ]
      }
    ]
  },
  "nested_novel_4": {
    id: "nested_novel_4",
    text: [
      "Marian Weiss had been in this trade eleven years, and among the cases she had closed there were happy endings, unhappy ones, and some in between; but this was the only one in which she had found the person, confirmed that he was alive and still in the place he had always been, and—by every standard of her profession—could close the case, and yet could not say that she had solved anything.",
      "Her conclusion was this: Henry Ward had not disappeared. From first to last he had been upstairs in that two-story frame house, sitting at that desk, the seven dictionaries lined up in a row. He was still alive; he still ate, still slept. What had disappeared was something else. It was the language he used to translate himself so that the world could hear him; at some moment—perhaps the very moment the man in The Dream-Speaker wakes, perhaps earlier, too early to trace—it had stopped working. And he could never find it again, nor ever use it to explain what he had lost, because explaining it would require the very language that was lost. It was a perfect trap, a trap language sets for itself: you cannot use a language to describe that language’s absence, just as you cannot use a lamp to light up the darkness after that lamp has gone out.",
      "She went to see her client, Alma. Alma asked: Is he all right?"
    ],
    options: [
      {
        id: "4-nn3-a",
        label: "▷ “He’s still there.”",
        resultText: [
          "“He goes in and out, he eats, he sleeps, he sits by the window and looks outside. He’s still there.”",
          "Alma was silent a while, then asked, “But is he still Henry?”",
          "Marian did not answer the question. Not that she did not wish to—the question itself was one she could not answer. If Henry was the man who knew seven languages and could talk his way from etymology to sauerkraut, then no. If Henry was the body still breathing upstairs in that frame house, still warm, then yes. For forty-eight years these two Henrys had been one and the same person; now they had come apart, into two, one still there and one gone, and in all the languages of humankind put together there is not one word made especially for “the part that remains after the parting.” Marian wrote a line in her notebook, trying to set the thought down; halfway through she crossed it out, until only the ink of the crossing-out was left and no one could tell what had been written beneath."
        ],
        nextId: "chapter_5_1"
      },
      {
        id: "4-nn3-b",
        label: "▷ She says nothing; she only hands over her notebook.",
        resultText: [
          "Marian handed Alma the notebook she had kept through these eleven days, the whole of it. In the notebook were the numbers of the milestones, the order of the dictionaries, a sketch of the tree, the sentences she had tried to write down and crossed out, and the last few pages, nearly blank—because toward the end Marian had found she had less and less to write. She sat across from Henry and kept silent with him, and that silence had a strange way of spreading: after sitting long enough, she no longer wanted to speak either, nor to write. Alma turned the pages very slowly, from beginning to end, and looked for a long time; then she closed the notebook and gave it back. She did not say thank you, and she asked no questions. The two of them sat in that office piled high with books. There was wind outside; the window was not open, yet both of them could hear the wind—or each of them believed she heard it."
        ],
        nextId: "chapter_5_1"
      },
      {
        id: "4-nn3-c",
        label: "▷ “I found the answer you were looking for, but I can’t translate it into a language you would understand.”",
        resultText: [
          "Alma looked at her. Marian said, “This isn’t an excuse. It is part of the answer. What happened to Henry—I’ve worked it out; inside my own head I can think it through. But the moment I try to tell it to you, I find I can’t. Every word I use is wrong; every word makes it smaller, shallower, turns it into something familiar that we already have a word for, and it isn’t that. Henry is probably the same. It isn’t that he doesn’t want to speak; it’s that what he would have to say can’t be said in any language there is, so he stopped saying anything at all. That isn’t giving up. That’s honesty.” Then she returned the fee, pushing it back across the desk. Alma did not reach for it, and the stack of bills stayed there on the desk between them. The case was closed, but Marian was not sure what, in the end, had been solved. She left Northgate Press, and on the way she passed the seventeen milestones again, and the tree beside the ninth; it seemed to her a little taller than the last time, though perhaps she misremembered. She sat in the car for a long time without starting the engine, looking at the tree, until it grew dark and neither the tree nor the stone could be seen, and there was nothing left but her own breathing, and the cornfields beyond the window that she could not see but knew were there all along."
        ],
        nextId: "chapter_5_1"
      }
    ]
  }
};
