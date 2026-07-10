/**
 * Real, near-verbatim output used on the "Choosing a Model" help page. For each
 * format, all three models were given the identical system prompt and user
 * prompt — only the model differed — so the differences readers see are the
 * models', not ours.
 *
 * Light cleanup for plain-text display only: markdown bold markers (**) and a
 * couple of stray markdown title lines (e.g. Haiku's "# Letter to the Editor")
 * were removed. Wording, structure, and the models' own choices (Sonnet's
 * [BRACKET] placeholders, Opus's invented specifics) are untouched.
 *
 * Regenerate with the same per-format prompts; models haiku-4-5 / sonnet-4-6 / opus-4-8.
 */

export interface ModelMeta {
  id: string
  name: string
  credits: number
  /** One-line "reach for this when…" guidance. */
  bestFor: string
}

export const MODELS: ModelMeta[] = [
  {
    id: "claude-haiku-4-5",
    name: "Haiku 4.5",
    credits: 1,
    bestFor: "Everyday drafts and first passes where speed and volume matter most.",
  },
  {
    id: "claude-sonnet-4-6",
    name: "Sonnet 4.6",
    credits: 3,
    bestFor: "Op-eds, letters, and longer pieces that need nuance and a distinct voice.",
  },
  {
    id: "claude-opus-4-8",
    name: "Opus 4.8",
    credits: 5,
    bestFor: "Your most important pieces — anything that has to land perfectly.",
  },
]

export interface Sample {
  modelId: string
  approxWords: number
  text: string
}

export interface FormatExample {
  key: string
  label: string
  /** Shown under the prompt — names the exact format the models were asked for. */
  blurb: string
  prompt: string
  /** One per model, in MODELS order (cheapest first). */
  samples: Sample[]
}

export const FORMAT_EXAMPLES: FormatExample[] = [
  {
    key: "speech",
    label: "Speech",
    blurb: "A 2–3 minute speech for a live audience.",
    prompt:
      "I need to give a 2-3 minute speech at a 4th of July event for the nation's 250th " +
      "anniversary. I would like it to focus on the remarkable experiment in democracy we " +
      "are part of and how to continue to make our democracy better in the future.",
    samples: [
      {
        modelId: "claude-haiku-4-5",
        approxWords: 275,
        text: `Good morning, everyone.

You know what strikes me about July 4th, 1776? It wasn't that colonists won a war. It wasn't military genius or divine intervention. What strikes me is that a group of people sat down and said: what if we tried something completely different? What if we said power doesn't flow down from a king, but up from the people? What if ordinary citizens could actually have a say in how they're governed?

That was radical. It still is.

Two hundred fifty years later, we're still living inside that experiment. And I want to be honest with you—it's messier than most experiments. It breaks down sometimes. It requires work every single day. But here's what I know: it works when we show up.

Look around this community. The reason your kid's school has a library isn't because someone decided from on high that libraries matter. It's because people like you went to a school board meeting. Spoke up. Voted. The reason we fixed the potholes on Maple Street is because someone picked up a phone and demanded better.

That's not complicated. That's not superhuman. That's democracy.

The future of this country doesn't depend on perfect leaders or perfect laws. It depends on something much simpler and much harder: it depends on people who care enough to get involved. To listen to someone they disagree with. To serve on a jury. To vote. To show their kids that their voice matters because it actually does.

Two hundred fifty years ago, they tried an experiment. We're not done with it yet. We get to decide what comes next.

Thank you, and happy Fourth of July.`,
      },
      {
        modelId: "claude-sonnet-4-6",
        approxWords: 395,
        text: `Two hundred and fifty years ago, a small group of people made a bet that most of the world considered foolish. That ordinary men and women — farmers, printers, lawyers, teachers — could govern themselves. No king required. No inherited bloodline to settle the question of who decides. Just people, arguing and debating and occasionally driving each other absolutely crazy, trying to figure it out together.

That bet is still running.

And I think that's the most honest and most inspiring thing I can say today. We are not the finished product. We never were. The founders knew it — that's why they built in the ability to amend, to revisit, to correct. Jefferson called it an experiment. Franklin, walking out of the Constitutional Convention, was asked what they had created. "A republic," he said, "if you can keep it."

That word — keep — does a lot of work. Keeping something isn't passive. You don't keep a garden by ignoring it. You don't keep a friendship by assuming it'll take care of itself.

So what does keeping a democracy actually look like in practice?

It looks like showing up — to vote, yes, but also to a city council meeting when you'd rather be home. It looks like staying curious about your neighbor's life, even when their yard sign makes you want to look away. It looks like teaching our kids not just that democracy is good, but why — and being honest enough to show them where we've fallen short of our own ideals, so they know the work isn't finished.

Because here's what 250 years have taught us: the moments when this country grew most — when it became most fully itself — were the moments when ordinary people decided the gap between what we promised and what we delivered was no longer acceptable. And they pushed. And it was uncomfortable. And eventually, we moved.

That is the tradition we are actually heirs to. Not just the fireworks and the rhetoric, but the hard, specific, sometimes unglamorous work of a people choosing — again and again — to keep the bet alive.

Two hundred and fifty years in, I'm still moved by the audacity of this place. And I believe — genuinely — that the best chapters are still ahead of us, if we're willing to write them.

Happy Fourth of July.`,
      },
      {
        modelId: "claude-opus-4-8",
        approxWords: 475,
        text: `Two hundred and fifty years ago, a group of people did something that had never really been tried before. They wrote down a set of ideas and staked everything on them.

Not a king. Not a bloodline. Not the will of the powerful. Just an idea — that ordinary people, governing themselves, could build something better than anything a crown had ever offered.

It was, when you think about it, an act of astonishing nerve.

Because they didn't have proof it would work. They had a wager. They bet that farmers and shopkeepers and schoolteachers — people with no royal training, no divine right — could be trusted to run their own affairs. They called it, in their letters to one another, an experiment. And that word matters. An experiment isn't a guarantee. An experiment is something you have to keep running. Something you can get wrong, and then try again.

That's what we've been doing for 250 years. Getting it wrong, and trying again.

Because let's be honest about our history. On that first Fourth of July, the promise that all people are created equal was written by people who did not yet live up to it. The circle of "we the people" was small. And nearly every generation since has done the hard, unglamorous work of widening it — abolitionists and suffragists, soldiers and marchers, teachers and organizers, people whose names we'll never know, who looked at the gap between the promise and the reality and refused to accept it.

That's not a story of a perfect country. It's a story of an unfinished one. And honestly, I find that more inspiring. Because it means the experiment isn't over. It means it's ours now.

So the question tonight isn't just "how far have we come." It's "what do we do with our turn."

And I don't think the answer is complicated. Democracy isn't only what happens in Washington. It's the school board meeting on a Tuesday night. It's the neighbor who registers voters. It's the willingness to sit across from someone you disagree with and treat them like a fellow citizen instead of an enemy. It's showing up. It's the boring, beautiful, everyday habit of self-government.

The founders handed us a wager. Every generation gets to decide whether the bet still pays off. Whether people can still govern themselves. Whether we can still argue hard and stay one country.

I believe we can. I believe it because I'm standing here looking at you — people who cared enough to come out on a summer evening for something bigger than themselves.

So here's to 250 years. And here's to the next 250 — which won't take care of themselves. They'll take us. Ordinary people, doing the extraordinary work of keeping this experiment alive.

Happy Fourth of July. Let's get back to work.`,
      },
    ],
  },
  {
    key: "letter",
    label: "Letter",
    blurb: "A letter to the editor for a local paper.",
    prompt:
      "Write a letter to the editor thanking the poll workers and election volunteers in our county " +
      "after this year's elections, and reminding readers that trustworthy elections depend on these " +
      "neighbors stepping up.",
    samples: [
      {
        modelId: "claude-haiku-4-5",
        approxWords: 230,
        text: `Last Tuesday, I watched a woman in her seventies sit at a table in our church basement for twelve hours, checking in voters and answering questions about ballot measures. I watched a young man in a polo shirt patiently walk someone through the voting machine three times until they felt confident. I watched a retired teacher explain voter ID requirements with the kind of patience she probably used in a classroom thirty years ago.

These weren't paid officials with years of training. They were our neighbors—the folks you see at the grocery store, the PTA meetings, the coffee shop. They took time off work or gave up their day to make sure our elections run smoothly.

Election integrity isn't something that happens in a back room. It happens in places like ours, in real time, with people willing to stand up and volunteer. The accuracy of our results depends entirely on people like the ones I saw Tuesday showing up, paying attention, and caring enough to get it right.

If you're reading this and thinking about volunteering next election cycle, we need you. Elections don't run on good intentions or government mandates—they run on the willingness of ordinary people to step up. That's how we keep our democracy trustworthy.

To everyone who worked the polls or volunteered this year: thank you. You did something that matters.`,
      },
      {
        modelId: "claude-sonnet-4-6",
        approxWords: 266,
        text: `Last Tuesday, while most of us were rushing through our morning routines or squeezing in a vote between work and dinner, hundreds of our neighbors were already at their posts — unlocking gymnasium doors in the dark, arranging privacy screens, testing machines, and doing the quiet, unglamorous work that makes democracy actually function. They were there before the first voter arrived and stayed long after the last one left.

I want to say plainly: thank you. To every poll worker, every precinct captain, every volunteer who stuffed envelopes or drove ballots across the county — you did something that mattered. Not in an abstract, civic-textbook way. In a real way. Your presence at that folding table, your patience with a long line, your care with every signature — that's what a trustworthy election looks like from the inside.

It's worth remembering that the integrity of our elections doesn't live in a slogan or a press release. It lives in people. Specifically, it lives in our people — teachers, retirees, small business owners, veterans — who show up for a long, demanding day because they believe their community deserves a process they can trust. If you've ever doubted that elections are run with care and commitment, I'd invite you to sit with one of these volunteers sometime and ask them why they do it.

If this year moved you in any direction — hopeful, frustrated, energized — consider channeling some of that into service. Contact your county election office. Put your name on the list. Your neighbors did it for you. It might be your turn next.`,
      },
      {
        modelId: "claude-opus-4-8",
        approxWords: 229,
        text: `To the Editor:

Before the yard signs come down and we all move on to the next thing, I want to say thank you to the people who made this election work: the poll workers and volunteers of our county.

They were the ones who arrived before sunrise to set up tables and test machines, who stayed long past dark to count every last ballot, who answered the same question patiently for the hundredth time and still smiled at voter one hundred and one. Many of them are retired teachers, neighbors you see at the grocery store, folks who gave up a fourteen-hour day for a small stipend and not much thanks. Some worked their very first election this year. Others have been showing up for decades.

It's easy to talk about "our elections" as if they run themselves. They don't. Trust isn't built by speeches or by machines — it's built by people we recognize, doing careful, honest work in plain sight, checking each other and following the rules. That's what happened here again this year, precinct by precinct.

So to everyone who signed up, trained, and served: thank you. And to anyone who has ever wondered whether they could do it, I'd encourage you to sign up next time. Our elections stay trustworthy only as long as good neighbors keep stepping up to run them.

With gratitude,`,
      },
    ],
  },
  {
    key: "social",
    label: "Social",
    blurb: "A Facebook post for the community.",
    prompt:
      "Write a short, upbeat Facebook post wishing the community a happy Fourth of July and the nation " +
      "a happy 250th birthday — warm, a little reflective about what democracy means at the local level, " +
      "and inviting neighbors to enjoy the day together.",
    samples: [
      {
        modelId: "claude-haiku-4-5",
        approxWords: 106,
        text: `On this 250th birthday, I'm thinking about what makes America work—and honestly, it starts right here. It's the neighbors who show up. The local volunteers who fill potholes and coach Little League. The people at town halls who actually speak up. The folks who disagree but still grab coffee.

That's democracy. Not the big speeches—the small acts of showing up for each other.

So this Fourth, I hope you get outside. Grab a hot dog. Watch fireworks with people you care about. Let your kids run around until they're exhausted. We've earned this moment together.

Happy Birthday, America. Happy Fourth of July, friends.

#FourthOfJuly #America250 #CommunityMatters`,
      },
      {
        modelId: "claude-sonnet-4-6",
        approxWords: 156,
        text: `July 4th always hits a little differently when you've spent the past year sitting across kitchen tables, showing up to school board meetings, and watching neighbors show up for each other in ways big and small.

That's democracy, too — not just the grand sweep of history, but the everyday version we build right here together.

Today America turns 250. What a wild, imperfect, still-becoming experiment this has been. And what a privilege to be part of it at this level, in this community, with all of you.

Wherever you're watching fireworks tonight — whether it's from a lawn chair in your backyard, the hood of a truck at the edge of a field, or a blanket in the park — I hope you feel some of what I feel on days like this: grateful, hopeful, and genuinely glad to be your neighbor.

Happy Independence Day, friends. Enjoy every bit of it. 🎆🇺🇸

#HappyFourthofJuly #America250 #ProudToServeThisCommunity`,
      },
      {
        modelId: "claude-opus-4-8",
        approxWords: 151,
        text: `Happy Fourth, neighbors — and happy 250th, America! 🇺🇸

There's something about this holiday that always brings us back to the basics: kids chasing each other across the grass, the smell of somebody's grill drifting down the block, folks in lawn chairs waving to people they've known for years and people they're meeting for the first time.

That, to me, is what democracy actually looks like. Not just the big documents and the history books — though goodness knows this one's a milestone — but the everyday work of being good neighbors. Showing up. Listening to each other. Deciding, together, what kind of place we want to call home.

So today, enjoy every minute of it. Save me a seat at the parade, wave your flag, and let's celebrate this remarkable, imperfect, still-hopeful experiment we all get to be part of.

See you out there. Happy Independence Day!

#FourthOfJuly #America250 #HometownProud`,
      },
    ],
  },
  {
    key: "print",
    label: "Print",
    blurb: "A press release announcing a community event.",
    prompt:
      "Write a press release announcing a nonpartisan community forum, 'Getting Involved in Local " +
      "Government,' hosted next month at the public library. Include a headline, a dateline, a quote " +
      "from the organizer, and practical details (open to all, RSVP encouraged).",
    samples: [
      {
        modelId: "claude-haiku-4-5",
        approxWords: 232,
        text: `FOR IMMEDIATE RELEASE

Community Forum to Demystify Local Government—No Experience Necessary

Public Library to Host Free Evening on Getting Involved Where Decisions Happen

Springfield—The Springfield Public Library will host "Getting Involved in Local Government" on Tuesday, February 18th at 7 p.m., offering residents a straightforward look at how to participate in the decisions that shape their neighborhoods.

The evening grew out of conversations with neighbors who wanted to know where to start—whether that's attending a city council meeting, joining a board, or simply understanding how local budget decisions get made.

"People care about what happens on their street, in their schools, at the parks their kids use," said Maya Chen, co-organizer with the Springfield Civic Engagement Initiative. "But the mechanics can feel opaque. We wanted to create a space where someone could ask a basic question without feeling out of place. You don't need a civics degree to show up."

The forum will feature short presentations from council members, planning staff, and volunteers who work in local boards and commissions. Attendees will hear directly about concrete opportunities—open seats, meeting schedules, ways to voice concerns before decisions are final.

Light refreshments will be served. The library's main conference room is wheelchair accessible.

The event is free and open to all. While walk-ins are welcome, organizers encourage RSVPs to help with planning. To register, visit springfieldpl.org/civicforum or call the reference desk at 555-0147.

###`,
      },
      {
        modelId: "claude-sonnet-4-6",
        approxWords: 270,
        text: `Neighbors Invited to Learn How Local Government Actually Works — and How to Shape It

MILLBROOK, [STATE] — [DATE] — The Millbrook Public Library will host a free community forum next month for anyone who has ever wondered how decisions get made at City Hall — and what it takes to have a real say in them.

"Getting Involved in Local Government" is scheduled for [DAY, DATE] at [TIME] at the Millbrook Public Library, [ADDRESS]. The event is open to all residents regardless of political affiliation, background, or prior experience with civic life.

The forum will walk attendees through the nuts and bolts of how local government functions — from city council meetings and planning commissions to school boards and neighborhood advisory committees — and will offer concrete steps for anyone who wants to participate more actively.

"Most people care deeply about their neighborhoods but aren't sure where the door is," said [ORGANIZER NAME], who helped organize the event. "This is just us opening that door. You don't need a law degree or a party affiliation. You need a couple of hours and a willingness to show up."

The evening will include a short presentation, a panel of current local officials and community members, and open time for questions. Light refreshments will be provided.

The forum is free and open to the public. Organizers encourage residents to RSVP at [WEBSITE/EMAIL] or by calling [PHONE NUMBER] so they can plan accordingly — but walk-ins are welcome.

What: Getting Involved in Local Government — A Community Forum
When: [DAY, DATE], [TIME]
Where: Millbrook Public Library, [ADDRESS]
Cost: Free
RSVP: [CONTACT INFORMATION]

—###—`,
      },
      {
        modelId: "claude-opus-4-8",
        approxWords: 338,
        text: `FOR IMMEDIATE RELEASE

Library to Host Nonpartisan Forum on How Residents Can Get Involved in Local Government

RIVERTON, Ohio — Ever wondered how the potholes get filled, where your property taxes actually go, or how you might land a seat on a city board? The Riverton Public Library invites residents to bring those questions to "Getting Involved in Local Government," a free community forum on Thursday, June 12, from 6:30 to 8:00 p.m. in the library's Community Room.

The evening is designed to demystify the everyday machinery of local government — from attending a council meeting to serving on the planning commission — and to show neighbors the many ways they can have a say in the decisions that shape their streets, schools, and parks. The forum is strictly nonpartisan and welcomes people of every political stripe and none.

"Most of the decisions that touch our daily lives don't get made in Washington. They get made a few blocks from here, in rooms that anyone can walk into," said Marcy Delgado, the forum's organizer. "A lot of folks tell me they'd love to participate but don't know where to start. This night is for them. You don't need a title or a law degree — you just need to show up."

The program will include a plain-language overview of how the city, county, and school board operate, a walk-through of upcoming volunteer and appointed openings, and an open question-and-answer session. Attendees will leave with a simple guide to meeting schedules, contact information, and next steps.

The forum is open to all. Light refreshments will be served. RSVPs are encouraged so organizers can plan seating and materials, but walk-ins are welcome.

Event Details
- What: "Getting Involved in Local Government," a nonpartisan community forum
- When: Thursday, June 12, 6:30–8:00 p.m.
- Where: Riverton Public Library, Community Room, 210 Main Street
- Cost: Free and open to the public
- RSVP: Call the library at (555) 123-4567 or visit rivertonlibrary.org/forum

For more information, contact Marcy Delgado at events@rivertonlibrary.org.

###`,
      },
    ],
  },
]
