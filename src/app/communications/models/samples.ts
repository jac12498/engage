/**
 * Real, verbatim output used on the "Choosing a Model" help page. For each format,
 * all three models were given the identical system prompt and user prompt — only
 * the model differed — so the differences readers see are the models', not ours.
 *
 * System prompt (all three): "You are an expert communications writer for a local
 * political candidate or officeholder. Write in a warm, authentic, specific voice
 * for a general community audience. Return only the requested piece — no preamble,
 * no notes to the editor, and no markdown formatting characters." Thinking was
 * disabled on the 5-series (Haiku 4.5 is no-think by default), matching how the
 * product generates short-form comms.
 *
 * Wording, structure, and the models' own choices ([BRACKET] placeholders, invented
 * specifics like town/organizer names) are untouched.
 *
 * Regenerated 2026-08-03 for haiku-4-5 / sonnet-5 / opus-5 with the prompts below.
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
    id: "claude-sonnet-5",
    name: "Sonnet 5",
    credits: 3,
    bestFor: "Op-eds, letters, and longer pieces that need nuance and a distinct voice.",
  },
  {
    id: "claude-opus-5",
    name: "Opus 5",
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
        approxWords: 293,
        text: `Good morning, everyone. Thank you so much for being here today.

You know, I've been thinking a lot this week about what it means that we're celebrating 250 years. Two hundred and fifty years. That's a long time. But it's also, in the grand scheme of human history, not very long at all.

What we're really celebrating today is something remarkable: the idea that ordinary people—farmers, merchants, teachers, people like us—could govern ourselves. That we didn't need a king to tell us what to do. That we could figure it out together.

And here's what amazes me. It worked. Not perfectly. We've stumbled, we've struggled, and we've had to fight for the promise of democracy again and again. But we're here. We're still here. We're still trying.

Because that's what democracy actually is. It's not a finished thing. It's not something you get right once and then you're done. It's an ongoing experiment. It's a daily choice. It's what happens when people like you and me decide that we want to stay engaged, stay involved, and keep showing up for each other.

So as we look toward the next 250 years, I think our job is clear. It's to keep that flame alive. To remember that the vote you cast matters. That the local school board meeting you attend matters. That having a difficult conversation with someone you disagree with—really listening to them—that matters too.

Democracy gets better when we participate. Not just once every four years, but constantly. When we serve on juries. When we volunteer. When we run for office. When we challenge each other to be better.

That's the experiment we're part of. And I truly believe our best days are still ahead.

Happy Fourth of July, everyone. Thank you.`,
      },
      {
        modelId: "claude-sonnet-5",
        approxWords: 514,
        text: `Thank you all for being here today.

Two hundred and fifty years ago, a small group of people did something almost unthinkable. They looked at kings and empires, at the way things had always been done, and they said: we think people can govern themselves. Not perfectly. Not easily. But they bet that ordinary people, given the chance, could be trusted with something as precious as their own freedom.

That bet is still being placed today, by us, every single day.

Think about what an experiment really is. An experiment isn't something you set up once and walk away from. It's something you tend to. You test it, you learn from it, you adjust, and you try again. That's exactly what our democracy has been for two and a half centuries. It was never handed to us finished. It was handed to us unfinished, on purpose, so that each generation would have the responsibility, and the honor, of continuing the work.

Our founders got a lot right, and they got some things wrong. They wrote "all men are created equal" while denying that truth to so many. But here's what's remarkable: they built a system flexible enough to be corrected. Generations after them fought to make those words mean what they should have meant all along. Abolitionists, suffragists, civil rights leaders, working people organizing for dignity on the job. None of them were tearing down the American experiment. They were fulfilling it.

That's the story of America, if you really look at it. Not a straight line, but a persistent stretching toward the promise. And that work isn't finished. It's not finished in our town, it's not finished in our state, and it's not finished in our country. It's ours to carry now.

So what does that mean for us, here, today?

It means showing up. Voting isn't just a right, it's how we keep our hands on the wheel of this experiment. It means staying informed, even when it's easier not to. It means talking to our neighbors, especially the ones who see things differently than we do, because democracy doesn't require us to agree, it requires us to stay in the room together. It means running for school board, showing up at the town council meeting, coaching the little league team, being the kind of citizen this whole thing was designed for.

Two hundred and fifty years is not the end of a story. It's a milestone in the middle of one. The founders didn't get to see how it turned out. Neither will we. But we get to add our chapter, and we get to hand something better to the people who come next, just like others did for us.

So tonight, when the fireworks go up, I hope you feel proud. We've earned that. But I hope you also feel something else: responsibility. Because the most patriotic thing any of us can do is decide, right now, that we're not just going to celebrate this experiment. We're going to keep running it.

Happy 4th of July. Let's get to work.`,
      },
      {
        modelId: "claude-opus-5",
        approxWords: 553,
        text: `Good morning, and happy Fourth of July.

Two hundred and fifty years ago, in a stuffy room in Philadelphia, a group of people did something that had almost no precedent in human history. They wrote down, on paper, that ordinary people could govern themselves. That authority didn't flow down from a throne — it rose up from the consent of the governed.

It's worth pausing on how strange that idea was at the time. Everywhere in the world, power belonged to whoever inherited it or seized it. The notion that a farmer, a printer, a shopkeeper might have a legitimate say in how they were governed — that was radical. Many people expected it to fail. Honestly, on paper, it probably should have.

And here's the thing they knew, and we should remember: they didn't get it right. Not fully. The words "all men are created equal" were written by people who didn't extend that equality to women, or to enslaved people, or to the Indigenous nations already living here. The promise was bigger than the practice.

But that's what makes this an experiment rather than a monument. The promise was written down. And once it was written down, it could be held up. Generation after generation of Americans pointed at those words and said: you're not living up to this yet. Abolitionists did. Suffragists did. Labor organizers did. Civil rights marchers did. Every one of them was, in a sense, a patriot with a receipt — holding this country to the terms of its own founding document.

That's the tradition I hope we celebrate today. Not a finished country. A country that has spent 250 years arguing itself closer to its own ideals.

So what does it ask of us now?

I think it asks three things, and none of them are complicated.

First, show up. Vote — in the big elections and the small ones. Serve on a jury. Come to a school board meeting. Run for something. Democracy is not a spectator sport, and it isn't self-maintaining. It's more like a garden than a statue.

Second, tell the truth, and expect it from others. A self-governing people has to be able to reason together, which means we need some shared floor of facts to stand on. Be a little slower to share the thing that makes you furious. Be a little more willing to say, "I might have that wrong."

Third — and this is the hard one — stay in the room with people you disagree with. Your neighbor who votes differently than you is not your enemy. They're your neighbor. They plow your street, coach your kid's team, sit two rows behind you at church. The alternative to arguing with each other is not peace. It's separation, and separation is how self-government dies.

Two hundred and fifty years in, the experiment is still running. That is not a small thing. Most experiments in self-government throughout history have not lasted this long.

And the reason it's still running is not because it was engineered perfectly in 1776. It's because in every generation, enough people decided it was worth the work.

That's the invitation today. Not to admire what was built, but to keep building it.

Happy Independence Day. Thank you for being the kind of community that shows up.`,
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
        approxWords: 240,
        text: `Dear Editor,

I want to take a moment to say thank you to the poll workers and election volunteers across our county who made this year's elections possible.

These are our neighbors—teachers, retirees, small business owners, and community members who took time away from their families and responsibilities to staff our polling places, process ballots, and handle countless details that voters never see. They arrived early, stayed late, and handled everything from technical questions to making sure every voice could be heard.

What strikes me most is that many of them do this work year after year, often in obscurity, for modest pay or as volunteers entirely. They don't do it for recognition. They do it because they understand something fundamental: elections work because real people show up and do the hard work to make them work.

In a time when trust in institutions can feel fragile, these poll workers represent something steady and true. They're dedicated to one simple mission—making sure that every eligible voter can cast their ballot safely and that every vote counts fairly.

As we move forward, I'd encourage anyone who's never considered becoming a poll worker to think about it. Our county's election office is always looking for people willing to serve. It's one of the most direct ways you can strengthen our democracy.

Thank you to every person who made this election day happen. You're the backbone of our democratic process.

Sincerely,

[Name]
[Title/Position]`,
      },
      {
        modelId: "claude-sonnet-5",
        approxWords: 304,
        text: `To the Editor,

Now that the votes are counted and the signs are coming down, I want to take a moment to say thank you to some of the people who made this election possible: our poll workers and election volunteers.

Long before the polls opened, these neighbors were setting up equipment, organizing supplies, and reviewing procedures. On Election Day, they arrived before sunrise and stayed long after the last voter left, checking people in, answering questions, troubleshooting problems, and making sure every ballot was handled properly. Many worked fourteen-hour days for modest pay, simply because they believe in the importance of the process.

I've heard people describe elections in abstract terms, as if they run themselves through some automated system. They don't. Elections happen because ordinary people in our own county give up their time to make them happen. Our retired teachers, small business owners, students, and grandparents are the ones checking IDs, guiding first-time voters, and staying late to make sure every machine is properly closed out and every count is accurate. These are our neighbors, and they deserve our gratitude and our trust.

In a time when so much doubt gets cast on our elections, I think it's worth remembering that the system depends entirely on people we know, people from our own community, doing this work carefully and honestly. That is what trustworthy elections actually look like: not some distant bureaucracy, but neighbors serving neighbors.

If you see a poll worker around town, thank them. If you've ever thought about volunteering, I encourage you to sign up before the next election. We always need more people willing to serve, and it's one of the most direct ways to support our democracy.

To everyone who worked the polls this year, thank you. Our county is fortunate to have you.

Sincerely,
[Name]`,
      },
      {
        modelId: "claude-opus-5",
        approxWords: 620,
        text: `To the Editor:

Now that the signs are coming down off the roadsides and the last of the mailers have made their way to the recycling bin, I want to take a moment to say thank you to the people who made this election happen — the poll workers and election volunteers of our county.

I stopped by several polling places on Election Day, and here is what I saw. At the fire hall on Route 12, a woman who has worked the polls for more than twenty years was patiently walking a first-time voter through the whole process, step by step, without a hint of hurry. At the elementary school, two workers were figuring out how to move a table so a voter using a walker had a clearer path to the booth. At the community center, someone had brought a box of donuts to share at 5:45 in the morning, because that is the kind of thing people around here do.

These are not political operatives. They are retired teachers and bus drivers, nurses coming off a night shift, college students home for the semester, small business owners who closed up for the day. They arrived before sunrise and many of them were still there long after the last vote was cast, counting, reconciling, sealing envelopes, and signing their names to the results. They did it for a small stipend that does not begin to reflect the hours, and they did it side by side with neighbors who may have voted the exact opposite way they did.

I want readers to understand something that gets lost in a lot of the noise about elections. There is no substitute for what these folks do. Every safeguard we rely on — the bipartisan teams at each table, the two sets of eyes on every seal, the public canvass, the paper record you can go back and check — every one of those safeguards is only as strong as the ordinary people willing to show up and carry it out. Trust in our elections is not something a machine or a law or a press release can manufacture. It is built by neighbors doing careful work in front of one another, in public, year after year.

I also want to say plainly that these volunteers deserve better than suspicion. Serving as a poll worker has become harder in recent years. Some have been shouted at. Some have had their judgment questioned by people who have never spent a single hour in a polling place. They kept showing up anyway. That takes a kind of quiet courage, and it should be honored rather than tested.

So: thank you to our county clerk and staff, to the election board, to the moderators and inspectors and greeters and ballot handlers, to the folks who trained the new workers and the folks who were brand new this year. Thank you to the churches, schools, libraries, and fire departments that opened their doors as polling places. Thank you to the county highway crew that got the equipment where it needed to be.

And to everyone reading this: consider signing up. Our county needs new poll workers every cycle, especially people who can serve on a weekday and people who speak a second language. Contact the county clerk's office and ask how to get on the list. It is a long day, it is genuinely interesting, and it is one of the few remaining places where you sit down beside someone who disagrees with you and get something important done together.

Democracy in this county does not run on speeches. It runs on neighbors. We are lucky to have so many willing to step up.

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
        approxWords: 156,
        text: `Happy Fourth of July, neighbors! 250 years ago today, our nation declared something bold and audacious — that ordinary people could govern themselves. That we the people could shape our own future.

Looking around our community, I see that spirit alive every single day. It's in the families fighting to make our schools stronger. It's in the volunteers at our food bank, our fire department, our local nonprofits. It's in neighbors who show up to town halls and speak their minds, even when we disagree. That's democracy — messy, real, and absolutely vital.

Today, let's celebrate that together. Whether you're watching fireworks, grilling with family, or just taking a moment to breathe easy with people you care about, I hope you take time to enjoy this beautiful day we share.

From my family to yours, happy birthday, America. And thank you for being such a wonderful community to serve.

Hope to see you out there today!`,
      },
      {
        modelId: "claude-sonnet-5",
        approxWords: 173,
        text: `Happy 4th of July, neighbors — and happy 250th birthday, America!

There's something special about celebrating this milestone right here in our own community. Democracy isn't just something that happens in faraway capitols — it happens at school board meetings, town halls, on our streets and sidewalks, and in the conversations we have with each other every single day. It's built by people who show up, speak up, and care enough to get involved. That's you. That's us.

Two hundred fifty years is a long time, and we haven't always gotten it right — but the promise of this country has always been that we keep trying, keep improving, and keep doing it together. That's worth celebrating.

So today, take some time to relax, watch some fireworks, eat something off a grill, and enjoy this place we call home. Bring the kids, bring the lawn chairs, bring your neighbors together.

Wishing you all a safe, joyful, and proud Fourth of July. Here's to the next 250 years — let's make them count.

🎆🇺🇸`,
      },
      {
        modelId: "claude-opus-5",
        approxWords: 203,
        text: `Happy Fourth of July, neighbors — and happy 250th birthday, America!

Two hundred and fifty years. It's hard to wrap your head around a number like that. But here's what I keep coming back to: this whole grand experiment doesn't live in marble buildings far away. It lives here. It lives in the folks who show up to a Tuesday night council meeting with a question about a stop sign. In the neighbors who circulate a petition about the park. In the poll workers who sit in a gym all day so the rest of us can vote. In the people who disagree at the mailbox and still help each other shovel the driveway.

That's democracy. Not always tidy, not always fast, but ours — and it only works because ordinary people keep choosing to participate.

So today, let's just enjoy it. Grab a lawn chair, save room for someone else's potato salad, wave at the parade, and stick around for the fireworks. Say hello to somebody you haven't met yet. Thank a veteran and a first responder if you see one.

Two and a half centuries in, and this town still knows how to throw a birthday party. See you out there.`,
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
        approxWords: 235,
        text: `FOR IMMEDIATE RELEASE

Community Invited to 'Getting Involved in Local Government' Forum at Library

January 15, 2025

The Public Library will host "Getting Involved in Local Government" on February 8th, a free community forum designed to help residents understand how local government works and discover meaningful ways to participate.

The nonpartisan event will feature an overview of how decisions get made at the local level, information about volunteer opportunities, and a chance to meet elected officials and community leaders face-to-face. Whether you're curious about attending a city council meeting for the first time or looking to get more actively involved, this forum is for you.

"We believe that strong communities are built when neighbors understand their local government and feel empowered to have a voice," said Sarah Martinez, event organizer. "This forum is our way of opening the door and making it easier for anyone who wants to learn more or get involved. No prior knowledge needed, no questions that are too basic. We're here to welcome you."

The forum takes place Saturday, February 8th from 10 a.m. to noon at the Main Branch of the Public Library, 450 Oak Street. The program is free and open to residents of all ages and backgrounds.

RSVPs are encouraged to help us plan for refreshments and materials. Register online at our library website or call 555-0147.

For questions, contact the library's Community Programs office at programs@publiclibrary.org.

###`,
      },
      {
        modelId: "claude-sonnet-5",
        approxWords: 283,
        text: `FOR IMMEDIATE RELEASE

Community Forum to Demystify Local Government, Encourage Civic Participation

RIVERTON — A nonpartisan community forum titled "Getting Involved in Local Government" will be held next month at the Riverton Public Library, offering residents a chance to learn how city and county government works and how they can play a part in it.

The event, open to everyone regardless of political affiliation, will take place on Thursday, March 13th, from 6:30 to 8:00 p.m. in the library's main community room, located at 214 Elm Street. It will feature short presentations from local officials and civic staff, followed by an open Q&A session and informal conversation over light refreshments.

Topics will include how to attend and speak at city council and county board meetings, how local budgets are developed, how to apply for boards and commissions, and simple ways to stay informed between elections.

"So many people want to get involved but don't know where to start," said Maria Chen, community outreach coordinator and event organizer. "This forum isn't about any candidate or any party — it's about helping neighbors understand how decisions get made in our own backyard, and showing them that there's a seat at the table for anyone who wants one."

The forum is free and open to the public. Attendees are encouraged to RSVP by calling the library at (555) 234-7890 or emailing events@rivertonlibrary.org, though walk-ins are welcome. Light refreshments will be provided, and free parking is available in the library lot on Elm Street.

Organizers say the forum is the first in a planned series of community conversations aimed at strengthening civic engagement in Riverton.

For more information, contact Maria Chen at (555) 234-7890 or mchen@riverton.gov.

###`,
      },
      {
        modelId: "claude-opus-5",
        approxWords: 460,
        text: `FOR IMMEDIATE RELEASE

New Community Forum Aims to Demystify Local Government for Everyday Residents

"Getting Involved in Local Government" set for Thursday, June 12, at the Main Street Public Library

RIVERTON — May 14, 2025 — Residents who have ever wondered how a pothole gets fixed, how the school budget is set, or how to speak up at a public meeting are invited to a free, nonpartisan community forum next month at the Main Street Public Library.

"Getting Involved in Local Government" will be held Thursday, June 12, from 6:30 to 8:00 p.m. in the library's Community Room. The evening will feature a plain-language overview of how city, county, and school district decisions get made, a walk-through of the boards and commissions currently seeking volunteers, and a practical guide to reading an agenda, submitting public comment, and following an issue from proposal to vote.

Representatives from the City Clerk's Office and the County Board of Elections will be on hand to answer questions, and the second half of the program is reserved entirely for questions from attendees.

"Most people I talk to aren't apathetic — they're just not sure where the door is," said forum organizer Dana Whitfield. "They care a lot about traffic on Elm Street or the condition of the ballfields, but nobody ever handed them a map of how this all works. That's what this night is for. You don't need a background in politics, you don't need to agree with me about anything, and you don't need to sign up for a committee on your way out. Just come and get your questions answered."

The forum is strictly nonpartisan. No candidates will be endorsed, no campaign materials will be distributed, and no political fundraising will take place. All viewpoints are welcome, and organizers encourage residents who have never attended a public meeting to come.

Practical details:

What: Getting Involved in Local Government, a free nonpartisan community forum
When: Thursday, June 12, 6:30 to 8:00 p.m. Doors open at 6:00 p.m.
Where: Main Street Public Library, Community Room, 412 Main Street, Riverton
Cost: Free and open to all
RSVP: Encouraged but not required, so organizers can plan seating and handouts. Reserve a spot at rivertonforum.org or by calling the library at 555-0142.

The Community Room is wheelchair accessible, and the library's parking lot and the Second Street garage are both free after 6:00 p.m. Light refreshments will be served. Attendees who need an accommodation, including interpretation or large-print materials, are asked to call at least one week in advance.

Printed guides covering meeting schedules, contact information for elected officials, and current board and commission vacancies will be available at the door and afterward at the library's front desk.

Media contact:
Dana Whitfield
Forum Organizer
555-0198
dana@rivertonforum.org

###`,
      },
    ],
  },
]
