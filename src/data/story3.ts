import { HistoryItem, StoryNode } from "./types";
import { hasOption, hasAnyOption } from "./utils";

export const story3: Record<string, StoryNode> = {
  "chapter_3": {
    id: "chapter_3",
    title: "Chapter Three: Winter Comes",
    text: [
      "November to December, 1953",
      "Winter did not come by way of the temperature. The temperature was an earlier matter: by the end of October the nameless-colored floor of the corridor had begun to give off a different, colder gleam—that was the temperature. The winter I mean is something else, a season that keeps its own time inside the small, shut-in world of Greenbrook, and it came slowly, along with the silences of one lengthening afternoon after another, along with the dwindling of those exact remarks Thomas would now and then let fall.",
      "Louis was taken away for a “routine examination.” I stood in the corridor and watched him go through another door, together with the staff.",
      "Three days later, Louis came back.",
      "He sat in his old seat. His shoulders were as broad as ever, his frame as big; every measurement you could take from the outside was unchanged, not by a fraction. But something inside had changed. Not taken away—tampered with, like a radio whose back panel someone has unscrewed to adjust something inside: on the outside it is still the same radio, but the way it picks up signals is different. I told a joke. Ordinarily Louis was always the first to laugh; I had grown used to that, had come to count on it. This time he did not laugh. The corner of his mouth moved—the movement was there—but it stopped where it was and went not one step further, as if he wanted to laugh, but somewhere in the clockwork of laughing a part had come loose: the motion started up and could not arrive.",
      "[IMAGE:./4.webp]",
      "From which angle to look in."
    ],
    options: [
      {
        id: "3-1-a",
        label: "▷ Go and talk to him after class.",
        resultText: (history: HistoryItem[]) => {
          const res = [];
          if (hasAnyOption(history, ["1-1-d", "1-2-e", "1-3-b"])) {
            res.push("He looked up first, and his glance rested on me a second longer than it needed to, as though he were making something out in some very deep place; then he said “Mr. Banks,” just those two words, and lowered his head again. Those two words stirred something in me I couldn’t name, as if someone at the bottom of a very deep well had looked up once—whether he saw you or not, you could not be sure, but he had tried.");
          }
          res.push(
            "I waited until everyone had gone before I went over.",
            "He sat with his elbows propped on his knees, looking at the rectangle of light on the floor. The sun had moved, and the rectangle had slanted into a parallelogram whose edge almost touched the legs of his chair. I sat down beside him.",
            "“Louis, how are you feeling today?”",
            "He looked up at me for a while and said, “All right.” Then a long pause. Those two words seemed to have walked from somewhere very far away, and by the time they reached his lips they were a little tired.",
            "I said we had read Whitman today and asked whether he liked it. He thought about it and said, “I liked it.” Then he said, “Mr. Banks, the mill—do you know what happened with it after?”",
            "I hesitated. The mill back home. From the very first day he had been waiting for news of it after it started up again. I said I didn’t know; I had no way of finding out. He nodded, lowered his head, and went back to looking at the parallelogram.",
            "I told a joke, one I had used many times at Lincoln High that never once failed to make the students laugh. Louis heard it out, and after three or four seconds the corner of his mouth moved. The movement was there, but it stopped where it was and went no further, as if he wanted to laugh, but somewhere in the clockwork of laughing a part had come loose.",
            "I did not tell a second one. We simply sat there, neither of us speaking; the sun went on moving, the parallelogram went on narrowing, shrank to a line, and was gone, and the corridor grew a little darker.",
            "Back in my room, I opened the diary and wrote the word “quiet” on a fresh page, then stopped and stared at it, wondering whether the word was accurate. After a while I decided it would do, and went on writing; I wrote a paragraph, and in that paragraph the word “quiet” turned up twice more. I did not notice."
          );
          return res;
        },
        nextId: "chapter_3_collapse"
      },
      {
        id: "3-1-b",
        label: "▷ Watch his eyes during class.",
        resultText: [
          "In class I read Whitman—“I am large, I contain multitudes.” I love that line; I love the tenderness hidden beneath its arrogance, love that it trusts a person can grow large enough to hold all his own contradictions without splitting apart. As I read it, I glanced at Louis.",
          "His eyes were open, facing forward, but—",
          "I stopped. I could not find the next word.",
          "I have never lacked for words. Whatever I come up against, I can always find a word, a sentence, to settle it into place; nine years of teaching English trained it into me, and it is an instinct I have had since I was a boy. But when I reached for that thing in Louis’s eyes, the shelf where the words are kept was empty.",
          "After class I sat in my room and spent a whole entry in the diary trying to fish back a certain line from a certain poem—a line I was sure existed, sure I had read, sure could describe the state I had seen. But the line did not come back, and neither did the poem it lived in. I sat there like someone searching a room he knows better than any other for some object: you know it is here, you have turned over every place you can remember, and it is nowhere.",
          "This weighed on me more deeply than Louis’s eyes did. I could not say why."
        ],
        nextId: "chapter_3_collapse"
      },
      {
        id: "3-1-c",
        label: "▷ Describe the change in the diary.",
        resultText: [
          "I sat down and opened the diary, meaning to set down clearly how things had changed over those three days, because writing a thing clearly is the same as thinking it clearly—I have always believed so.",
          "I wrote: “Louis came back today, and his whole condition—” and then I stopped; the next word defeated me. I tried them one by one in my head: stable—no. Calm—no, not that either. Gone quiet—now that was accurate, but its accuracy was something I could hardly bring myself to say, as though it admitted something.",
          "In the end I wrote “gone quiet,” and put a tiny question mark beside it, stared at the question mark for a while, and rubbed it out, because leaving a question mark in a diary is like admitting defeat.",
          "I turned back—the page before, and the one before that, and the one before that. The word “quiet” had turned up many times. I counted: including today, seven times in all, scattered over the past two weeks, each time describing something different—the corridor was quiet, the afternoon was quiet, Thomas said little today so the classroom was quiet. Those seven “quiets” stacked on one another were like someone tracing the same word seven times on the same sheet of paper with the same pen, pressing a little harder each time.",
          "After “gone quiet” I added a sentence: “This is not the quiet he used to have.” Then I closed the diary and wondered: what was the quiet I used to have? When was “used to”? From what day on did that time become “used to”?"
        ],
        nextId: "chapter_3_collapse"
      },
      {
        id: "3-1-d",
        label: "▷ Go and find Thomas in the library, late at night.",
        condition: (history: HistoryItem[]) => hasOption(history, "2-1-e"),
        resultText: [
          "Thomas was there, in the chair in the corner, the book he never opened lying on his knees; the lamp gathered its light into a small circle, and outside the circle it was dark. When I pushed open the door, he was already looking at the doorway.",
          "“You’ve come again,” he said.",
          "I sat down across from him. Every so often there were footsteps outside—staff passing at the change of shift—then they were gone and the quiet came back. I asked him what had happened to Louis.",
          "He was silent a long time, so long that I thought his lucid spell for the night had already passed; then he said, “He had the examination.”",
          "I asked: what examination?",
          "He laid his hand on the cover of the book—didn’t open it, just let it rest there. “Before you came,” he said, “there was a man who sat in that seat by the window in the dining hall. Do you still remember him?”",
          "I said I remembered the seat, but could not recall his face.",
          "Thomas nodded, as though mine were exactly the answer he had expected. “He had the examination, and after it, he was gone. He still sat in that seat and ate, still slept here, but he was gone—you understand the kind of gone I mean. The body was there; the man was not.” He paused. “Louis has had it too.”",
          "I asked what kind of examination it was.",
          "This time he was silent even longer. The lamp held its light in the circle between us; outside the circle it was very dark, as if nothing were left in the room but the two of us and that ring of light, and everything else had withdrawn into the distance. “They call it an assessment, or a treatment, or an adjustment—which word they use depends on their mood that day.” He looked at me, and on this night his eyes were clear, so clear that something somewhere inside me tightened. “They go into people’s heads and tamper with them. Mr. Banks—inside their heads.”",
          "I listened, and said nothing.",
          "“What I tell you tonight, I won’t remember tomorrow,” he said. “So you remember. Remember for me, and remember for Louis. Remember that he asked you about the mill, remember the way he laughed, remember the sound of that laugh—because these are things he himself will soon be unable to remember.”",
          "By the time I got back to my room it was nearly dawn. I opened the diary, found the page where I had written about Louis, drew a line under those few lines, and below the line copied them out again. Then I folded that page, folded it down into a very small square, and tucked it into the farthest corner of the suitcase, under the box of lozenges. I knew by now that in this place some things get taken away. I had to put him somewhere I could find him, the safest place I had—somewhere I still remembered."
        ],
        nextId: "chapter_3_collapse"
      }
    ]
  },
  "chapter_3_collapse": {
    id: "chapter_3_collapse",
    text: [
      "In the days after Louis came back, I kept wanting to do something for him, and there was nothing I could do. I could not make him laugh again, could not find out what had become of the mill back home, could not stop the next “examination.” There was only one thing I could do—write him down. Write down the way he was while he was still there, while I still remembered. At least, I thought, there ought to be one place that kept the Louis who laughed out loud and wondered whether the mill had started up again, even if that place was only a diary.",
      "So that night I turned back through the pages, looking for the first page where I had written about Louis, to read those lines over again and make sure I had not misremembered him.",
      "I came to the entry for September 7—his name was there, and beside it: “likes the papers, wonders whether the mill has started up again.” I was about to read on when my eyes snagged first on a few other words. Just above Louis’s name, on the same page, in the same day’s handwriting:",
      "I had written the people I met that day as “staff.”",
      "I had written the place I lived as “the dormitory.”",
      "I had written what happened each day as “classes.”",
      "I had written these people as “residents.”",
      "I sat at the desk and looked at these words for a long time. Someone walked by out in the corridor, footsteps very light, then gone, and the quiet came back, and I went on looking at the words. “Staff.” “Dormitory.” “Classes.” “Residents.”—",
      "At first I thought it was the place that had changed later on—that it had slowly turned from a school into something else, and my diary had faithfully changed along with it. But no. This was the first day. This was the very first day, when I had only just pushed open that door with my father’s suitcase in my hand. From the very first word, these were the words I wrote. The place had never changed. From beginning to end it had been exactly what it was; it was I who, with these words, had drawn it stroke by stroke into a school.",
      "No one forced me to write “staff.” It was I who did not want to write “nurses.”",
      "It was never this place that did the translating. It was me. I had meant to keep something real for Louis, and when I opened the diary I found that the diary had not been real from the first page—I had translated my own reality, word by word, into a school, translated it for my own eyes, and believed it. A whole autumn long.",
      "What broke through me was no document, no word anyone said. It was my own handwriting. It was myself, whom I ran into when I reached for the diary to save Louis."
    ],
    options: [
      {
        id: "3-2-a",
        label: "▷ Dig out the papers I signed on admission and read them again.",
        resultText: [
          "The papers were in the side pocket of the suitcase; I had not touched them since I put them there. I took them out, spread them on the desk, switched on the lamp, and sat down to read.",
          "Greenbrook Psychiatric Rehabilitation Hospital · Inpatient Consent Form.",
          "My eyes rested for a long time on the words “Psychiatric Rehabilitation Hospital.” My hand pressed the edge of the paper; the sweat of my palm softened it until the fibers loosened and the edge went a little fuzzy. I did not move my hand. I just sat there and let those words lie under the lamp, trying to find some way to square them with what Mr. Kevins had told me, some reading that would make sense from both ends. This is something I have always been good at: finding a good explanation, and then believing my way into it. I thought about it for nearly an hour.",
          "In the end I folded the papers, put them back in the suitcase, and wrote in the diary: “The wording of the documents is more formal than I had supposed, but this does not contradict Mr. Kevins’s original description; it is entirely reasonable for a comprehensive institution to adopt stricter terminology in its legal documents.”",
          "I read the passage twice. The frame had already collapsed, and I was still trying in vain to hold it up. It was my last rationalization, and the most desperate.",
          "On those nights, for the last time, I read The Glass Detective in peace."
        ],
        nextId: "nested_novel_3"
      },
      {
        id: "3-2-b",
        label: "▷ Sound out the residents in class, by way of a literary discussion.",
        resultText: (history: HistoryItem[]) => {
          const res = [
            "I chose Kafka’s The Trial and read the opening of the first chapter—Josef K. wakes one morning to find himself under arrest; the men who have come for him cannot say what he is charged with, nor does he know himself, but the arrest simply happens, the paperwork in order, the procedure in motion, everything running correctly, only no one can say why.",
            "When I finished, I closed the book and asked, “If a man were sent to a place, and no one told him what the place really was, what should he do?”",
            "The classroom went silent. Thomas did not look up; his voice came from somewhere near the hands he had laid on the desk, very low: “We all know. How can you not know?”",
            "Agnes’s fingers stopped—stopped for perhaps five seconds—then took up again. Louis was looking at the window. I said, “This is a hypothetical literary situation; let’s discuss Josef K.’s state of mind.” Thomas raised his head and looked at me, for a long time. “Josef K. is killed in the end,” he said. “Like a dog. He says the shame of it will outlive him.” Then he lowered his head again and said nothing more.",
            "After that class I did not write in the diary. I did not know what words to set that scene down in. Or rather, I knew what had happened; I simply was not ready to write it down, because writing it down would mean admitting it."
          ];
          if (hasOption(history, "2-1-e")) {
            res.splice(3, 0, "He paused, then said in a low voice, “I told you. You didn’t put it in your diary.” It was not reproach; it was a kind of weariness—the weariness of a man who has held out something very heavy many times, and each time seen it set down.")
          }
          res.push("On those nights, for the last time, I read The Glass Detective in peace.");
          return res;
        },
        nextId: "nested_novel_3"
      },
      {
        id: "3-2-c",
        label: "▷ Find the public telephone and try to call James.",
        resultText: [
          "The public telephone was in a little booth at the turn of the corridor: a black rotary-dial set. I stepped in, lifted the receiver to my ear, and waited for the dial tone.",
          "There was no dial tone. Inside the receiver was a very clean silence, like pressing your ear to a thick wall to listen to what is inside, and there is nothing inside, only the wall itself.",
          "I stood there with the receiver against my ear and waited about a minute, as if something might change if I waited a little longer. Then I hung up and stepped out of the booth. Jeffrey happened to be coming along the corridor; he smiled and said, “The lines are under repair this week; outside calls can’t go through for the moment. If you need to reach your family, you can write a letter, and I’ll see that it gets sent.” His tone was earnest, his eyes were earnest; whatever he said always sounded as though he truly believed it.",
          "I said thank you. Back in my room I wrote in the diary: “The public telephone lines are under repair this week; outside calls temporarily unavailable.” Then I skipped a line and wrote: “I want to call James. I don’t know what I want to say to him. Perhaps I only want to hear a voice that does not belong to this place.” It is one of the few places in the diary from those weeks where I did not tidy my feelings into respectable sentences. I let it stay on the paper just as it was.",
          "On those nights, for the last time, I read The Glass Detective in peace."
        ],
        nextId: "nested_novel_3"
      },
      {
        id: "3-2-d",
        label: "▷ Write my brother James a letter, two pages long.",
        resultText: [
          "I sat at the desk a long time and thought through exactly how the letter should be written: like an expository essay—thesis clear, evidence specific, no emotion—because an emotional letter is easily taken for something written by a man not in his right state, and what I needed was for this letter to be taken seriously.",
          "I listed six points: the locks on the front doors and on the room doors are all on the outside; the window latches are all on the outside; the public telephone has no dial tone; every outing beyond the grounds must be applied for, and almost none are ever approved; the white tablets handed out after dinner every night have never once been identified by name or contents; a resident I know was taken away for an examination three days ago and came back another person—not a figure of speech; another person, in the literal sense.",
          "Beneath them I wrote: James, I need you to come, but before you come don’t tell anyone you are coming—don’t tell Mother, don’t tell Mr. Kevins. Just come. Stand at the front gate and say you are my brother and you want to see me. You have that right.",
          "I sealed it and gave it to Jeffrey. He took it and said it would go out with tomorrow’s mail. In the diary I wrote: “Letter sent; awaiting reply.”",
          "One day, two days, five days, a week, ten days. James did not come, no reply came, nothing at all. I went on writing “awaiting reply” in the diary, for many days, and then one day I opened the diary, turned to the line where “awaiting reply” was supposed to go, and thought: what was I waiting for, again? I turned back a few pages and looked it up—oh, a reply—and then I closed the diary and went to lunch. I had forgotten what I was waiting for.",
          "On those nights, for the last time, I read The Glass Detective in peace."
        ],
        nextId: "nested_novel_3"
      },
      {
        id: "3-2-e",
        label: "▷ Write a letter to Mother.",
        resultText: [
          "I wrote this letter in three drafts.",
          "The first draft ran two pages and was entirely true: I wrote about the title on the documents, about the window latches, about Louis, about the white tablet every night; I begged her to come and take me away. When it was done I read it through once and burned it, because it read like a letter written by an overwrought man, and Mother has seen me overwrought too many times; she has a steady gift, decades in the practicing, for believing I am only thinking too much.",
          "The second draft ran half a page and said only one thing: Mother, I need you to come; I need you to come and see me yourself. This one, too, read like something written in a bad state.",
          "For the third draft, I tried another approach. I know my mother; I know her love, and I know her trust in men with titles, men like Kevins—a trust so deep that no argument can shake it; it can only be loosened by feeling. So in the third draft I wrote about feelings: about the rose garden, about the cold gleam the nameless-colored floor of the corridor gives off in winter, about the library with a whole wall of books, about teaching Dickens and Whitman, about the feeling of a teacher slowly finding his rhythm in an unfamiliar place; and at the very end I set down, lightly, one sentence: I’ve been a little homesick lately—if it isn’t too much trouble, could you come and see me?",
          "Every word in this letter was true; it merely chose, from among the true things, the ones most likely to set Mother’s mind at ease.",
          "I gave the letter to Jeffrey, and he took it. Back in my room I wrote in the diary: “Wrote to Mother—it’s been a long time; she’ll probably be glad.” Then beneath it I wrote one more sentence, and when it was written I crossed it out, crossed it out so thoroughly that no one could tell what had been written underneath. The sentence was: I really do want very much to see her.",
          "On those nights, for the last time, I read The Glass Detective in peace."
        ],
        nextId: "nested_novel_3"
      }
    ]
  },
  "nested_novel_3": {
    id: "nested_novel_3",
    text: [
      "Marian spent three afternoons in Henry’s room.",
      "The first afternoon she asked nothing at all; she only sat, watching Henry, watching the seven dictionaries, watching the light from the window move slowly from one end of the desk to the other. The second afternoon she began to ask, slowly, gently, as though afraid of startling something: Why did you stop translating? Where have you been these six months? Could you not go on with the second half of that book? Henry listened, sometimes nodding, sometimes looking elsewhere, and answered none of her questions. By the third afternoon Marian no longer held out much hope; she had come almost to say goodbye. She sat down and asked no questions, only made small talk with Henry—about the weather that day, about the cornfields along the road being turned over for the winter, about the cat Mrs. Griffith kept downstairs, which seemed to be expecting. When she got to the cat, Henry suddenly spoke.",
      "He said one sentence. In a language Marian did not understand.",
      "It was not long—seven or eight syllables, soft and quick, full of sounds Marian’s tongue could not make, like water running over stones, or like some kind of bird—exactly the way Mrs. Griffith had described the old foreign man’s speech. When Henry had finished, he looked at Marian and waited, as though he were truly waiting for an answer, as though he had just asked a question. Marian did not know what it meant. For the first time in her life she wished, with all her might, that she knew a language she did not know. She opened her mouth and could say nothing, because Henry was no longer inside any language she could speak. Henry waited a while, and when she made no reply, the small light of waiting in his eyes slowly receded; he looked away again, and the index finger of his right hand began once more to move, very slightly, on the desktop.",
      "Later Marian went through Northgate Press’s files and found the book Henry had last been translating—a Romanian novel called The Dream-Speaker."
    ],
    options: [
      {
        id: "3-nn3-a",
        label: "▷ She reads what the book is about.",
        resultText: [
          "The Dream-Speaker tells of a man who lives in a small village in the Carpathian mountains. One night he has a dream, and in the dream he understands, and can speak, a language he has never learned—a perfect language, in which every word is exactly equal to the thing it names, with no ambiguity, no misunderstanding, nothing lost in translation: when you say “water,” the whole of water is in your mouth; when you say “mother,” the whole of your mother stands before you. In the dream the man speaks this language with many people—with the dead, with the not yet born, with animals, with stones—and every barrier between them disappears, because barriers were only ever made by the imperfection of language, and this language is perfect. Then he wakes. On waking he finds he has forgotten that language, not a word of it left—which is only to be expected; what is in dreams can never be kept. But at the same time he discovers something he did not expect: he has also forgotten how to speak the language he knew before, the language his mother taught him. In leaving, the perfect language had taken the other with it, the way the tide going out takes not only what it brought in but also what was on the beach to begin with. From then on the man cannot say a word. The second half of the novel tells how the village slowly grows used to this man who does not speak, how it rearranges its life around his silence; and, at the last, how the villagers, one after another, stop speaking too—not because they have had the same dream, but because, when there is one man in a village who does not speak, and that man plainly knows something the others do not, speaking itself slowly comes to seem superfluous, even a little shameful."
        ],
        nextId: "chapter_4_transition"
      },
      {
        id: "3-nn3-b",
        label: "▷ She leafs through Henry’s half-finished translation.",
        resultText: [
          "Henry’s translation was clean and orderly, without a single correction, all the way to the last line, the last word—and the last letter of that word was half written; the pen had stopped and never come down again. Not a period, not the end of a paragraph: just one letter, half written, and the pen stopped. Marian bent close to that half letter, wanting to know which word Henry had meant to write. It suddenly occurred to her that perhaps he had stopped here not because he could not go on translating, but because the sentence he had reached was the very sentence in which the man forgets all language—the translator and the man he was translating had stopped their pens on the same word at the same moment, because at that moment they were using the same vanishing language, and that language had vanished in the middle of that word. She turned the manuscript over and looked at the backs of the pages. On the backs of the last few sheets there were ink marks—not words but lines, as though someone had traced the same shape over and over, many times, until the ink built up and blurred into a single patch of black. She held it up to the light, trying to make out what shape it was. It looked a little like a letter, a little like a tree—a tree growing up from a single point, its branches dividing and dividing until at last they blurred into a mass. Perhaps it was not a picture of anything at all; perhaps it was simply the last motion a man’s hand still remembered as he forgot how to write—a stroke that no longer pointed to any letter, written over and over until it no longer knew what it was."
        ],
        nextId: "chapter_4_transition"
      }
    ]
  },
  "chapter_4_transition": {
    id: "chapter_4_transition",
    text: [],
    options: [
      {
        id: "start_chapter_4",
        label: "▷ Turn to the next page",
        resultText: [],
        nextId: "chapter_4_hub"
      }
    ]
  }
};
