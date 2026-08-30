import type { Archetype, ArchetypeKey, Question } from './types'

export const archetypes: Record<ArchetypeKey, Archetype> = {
  explorer: {
    key: 'explorer', name: 'Explorer', symbol: '✦', color: '#d9a441',
    drive: 'Freedom, discovery, and direct experience.',
    gift: 'Expands possibility and refuses to let the map become the territory.',
    shadow: 'Restlessness, escape, or abandoning commitments when life feels confining.',
    growth: 'Choose freedom deliberately without using it to avoid necessary depth.',
    practices: [
      'Take a route you have never taken and notice what changes in your attention.',
      'Spend twenty minutes exploring a subject you know almost nothing about.',
      'Name one obligation you still choose and one you are merely carrying by inertia.',
      'Visit a local place you have passed many times but never entered.',
      'Write down one assumption about your life that you have never personally tested.'
    ],
    readings: [
      { title: 'Self-Reliance', author: 'Ralph Waldo Emerson', why: 'For independent judgment and living from examined conviction.' },
      { title: 'Walden', author: 'Henry David Thoreau', why: 'For deliberate living and questioning inherited defaults.' }
    ]
  },
  sage: {
    key: 'sage', name: 'Sage', symbol: '◈', color: '#c7b27c',
    drive: 'Truth, understanding, and intellectual honesty.',
    gift: 'Sees patterns, asks better questions, and changes position when evidence demands it.',
    shadow: 'Analysis as control, detachment, or confusing understanding with action.',
    growth: 'Know when enough understanding has been earned to move.',
    practices: [
      'Take one belief you strongly hold and write the strongest case against it.',
      'Explain something difficult in five sentences without jargon.',
      'Ask “what evidence would change my mind?” before reading about a disputed topic.',
      'Notice one place where more information is becoming an excuse not to act.',
      'Teach someone one thing you recently learned.'
    ],
    readings: [
      { title: 'Meditations', author: 'Marcus Aurelius', why: 'For disciplined reflection without losing contact with duty.' },
      { title: 'The Enchiridion', author: 'Epictetus', why: 'For distinguishing what can be known, chosen, and controlled.' }
    ]
  },
  hero: {
    key: 'hero', name: 'Hero', symbol: '⚔', color: '#cf8f56',
    drive: 'Courage, integrity, challenge, and meaningful action.',
    gift: 'Acts when values become costly and helps others believe they can do difficult things.',
    shadow: 'Perpetual mission, unnecessary struggle, or defining worth through hardship.',
    growth: 'Learn that courage also includes rest, receptivity, and ordinary presence.',
    practices: [
      'Do one small thing today that you have been avoiding because it is uncomfortable.',
      'Write the first sentence of a conversation you know you need to have.',
      'Choose one principle you claim to value and identify how it showed up this week.',
      'Let one task be good enough instead of turning it into a test of endurance.',
      'Ask for help with something you could technically carry alone.'
    ],
    readings: [
      { title: 'Man’s Search for Meaning', author: 'Viktor E. Frankl', why: 'For responsibility, meaning, and choosing a stance under pressure.' },
      { title: 'The Odyssey', author: 'Homer', why: 'For courage shaped by endurance, loyalty, and return.' }
    ]
  },
  caregiver: {
    key: 'caregiver', name: 'Caregiver', symbol: '♥', color: '#b78a67',
    drive: 'Protection, service, loyalty, and presence.',
    gift: 'Makes people feel safer, supported, and less alone.',
    shadow: 'Martyrdom, resentment, over-responsibility, and neglect of personal needs.',
    growth: 'Serve from choice rather than disappearance.',
    practices: [
      'Before saying yes, ask: “Do I genuinely want to take responsibility for this?”',
      'Offer care today without solving the other person’s problem for them.',
      'State one need plainly without apologizing for having it.',
      'Notice where you are carrying a responsibility that actually belongs to someone else.',
      'Protect one hour this week for yourself with the same seriousness you protect time for others.'
    ],
    readings: [
      { title: 'The Gift of the Magi', author: 'O. Henry', why: 'A compact reflection on love, sacrifice, and what giving means.' },
      { title: 'Selected Letters', author: 'Seneca', why: 'For friendship, duty, limits, and humane presence.' }
    ]
  },
  creator: {
    key: 'creator', name: 'Creator', symbol: '✧', color: '#d6a05f',
    drive: 'Originality, expression, invention, and making better alternatives.',
    gift: 'Turns imagination into things that did not exist before.',
    shadow: 'Perfectionism, endless iteration, or identity becoming fused with output.',
    growth: 'Finish, release, and let creation become a practice rather than a verdict on your worth.',
    practices: [
      'Make a rough version of something in thirty minutes and do not polish it.',
      'Improve one everyday object, workflow, or ritual in a small concrete way.',
      'Create something only for yourself and do not share it.',
      'Finish one abandoned micro-project before beginning a new one.',
      'List ten bad ideas; choose one and make it less bad.'
    ],
    readings: [
      { title: 'Poetics', author: 'Aristotle', why: 'For thinking about craft, structure, and what makes created work cohere.' },
      { title: 'Leaves of Grass', author: 'Walt Whitman', why: 'For expansive self-expression and creative seeing.' }
    ]
  },
  rebel: {
    key: 'rebel', name: 'Rebel', symbol: '⚡', color: '#c67961',
    drive: 'Liberation, disruption, and resistance to illegitimate constraint.',
    gift: 'Names what is broken and refuses compliance for its own sake.',
    shadow: 'Opposition becoming identity, scorched-earth choices, or reflexive distrust.',
    growth: 'Rebel for something, not merely against something.',
    practices: ['Identify one rule you resist and write the purpose it was meant to serve.', 'Change one stale routine on purpose.', 'Challenge an assumption without attacking the person holding it.', 'Notice one authority you dismiss automatically and ask whether it has earned some legitimacy.', 'Build one alternative instead of merely criticizing the old way.'],
    readings: [{ title: 'Civil Disobedience', author: 'Henry David Thoreau', why: 'For conscience, law, and principled resistance.' }]
  },
  ruler: {
    key: 'ruler', name: 'Ruler', symbol: '♜', color: '#9f8765',
    drive: 'Order, stewardship, responsibility, and durable systems.',
    gift: 'Creates structure that lets people coordinate and flourish.',
    shadow: 'Control, rigidity, status-seeking, or mistaking compliance for health.',
    growth: 'Use authority to create capacity rather than dependence.',
    practices: ['Clarify one decision others are waiting on.', 'Delegate a task and let the other person own the method.', 'Write down the purpose of a system before adding another rule.', 'Remove one unnecessary process.', 'Ask where control is compensating for lack of trust.'],
    readings: [{ title: 'The Prince', author: 'Niccolò Machiavelli', why: 'Not as a moral guide, but as a lens on power, legitimacy, and political realism.' }]
  },
  magician: {
    key: 'magician', name: 'Magician', symbol: '✺', color: '#9d8cbc',
    drive: 'Transformation, synthesis, and changing what seems possible.',
    gift: 'Connects ideas across domains and helps people see a different reality.',
    shadow: 'Manipulation, grandiosity, obscurity, or promises that outrun substance.',
    growth: 'Ground transformation in evidence, craft, and consent.',
    practices: ['Connect two unrelated ideas and write what each reveals about the other.', 'Reframe one recurring problem in three radically different ways.', 'Teach a concept through metaphor.', 'Ask what would have to be true for an “impossible” outcome to become possible.', 'Turn one insight into a concrete experiment.'],
    readings: [{ title: 'The Tempest', author: 'William Shakespeare', why: 'For power, transformation, illusion, and relinquishment.' }]
  },
  lover: {
    key: 'lover', name: 'Lover', symbol: '❦', color: '#ad756b',
    drive: 'Connection, devotion, beauty, and aliveness.',
    gift: 'Creates depth of relationship and notices what makes life worth cherishing.',
    shadow: 'Possessiveness, approval-seeking, fusion, or sacrificing identity for closeness.',
    growth: 'Let intimacy deepen individuality rather than erase it.',
    practices: ['Give someone ten minutes of undivided attention.', 'Name three things you genuinely appreciate without turning them into tasks.', 'Create beauty in one small corner of your environment.', 'Ask someone a question you usually avoid because it feels too vulnerable.', 'Spend time with someone without optimizing the time.'],
    readings: [{ title: 'The Prophet', author: 'Kahlil Gibran', why: 'For poetic reflection on love, relationship, work, and freedom.' }]
  },
  jester: {
    key: 'jester', name: 'Jester', symbol: '☼', color: '#c0a35c',
    drive: 'Play, perspective, spontaneity, and puncturing false seriousness.',
    gift: 'Restores flexibility and human proportion when systems become absurd.',
    shadow: 'Deflection, cynicism, or using humor to avoid vulnerability.',
    growth: 'Let humor reveal truth without replacing sincerity.',
    practices: ['Do something harmless purely because it is funny.', 'Notice one situation you are taking too seriously.', 'Tell a story about one of your own mistakes in a way that makes you laugh.', 'Create a playful constraint for a boring task.', 'Say one sincere thing without cushioning it with a joke.'],
    readings: [{ title: 'Much Ado About Nothing', author: 'William Shakespeare', why: 'For wit, misunderstanding, social masks, and affection.' }]
  },
  innocent: {
    key: 'innocent', name: 'Innocent', symbol: '○', color: '#b7aa83',
    drive: 'Hope, goodness, trust, and simplicity.',
    gift: 'Reminds people that cynicism is not the same as wisdom.',
    shadow: 'Naivety, denial, dependency, or avoiding necessary complexity.',
    growth: 'Preserve hope while becoming harder to fool.',
    practices: ['Write down one thing that is going better than your mind gives it credit for.', 'Choose the simplest adequate solution to one problem.', 'Notice where cynicism protects you from disappointment.', 'Thank someone without adding a qualification.', 'Do one ordinary thing slowly enough to enjoy it.'],
    readings: [{ title: 'The Little Prince', author: 'Antoine de Saint-Exupéry', why: 'For wonder, responsibility, and seeing past adult abstractions.' }]
  },
  everyperson: {
    key: 'everyperson', name: 'Everyperson', symbol: '◎', color: '#8e988b',
    drive: 'Belonging, solidarity, realism, and shared humanity.',
    gift: 'Builds trust without requiring hierarchy or exceptionalism.',
    shadow: 'Conformity, self-erasure, or fear of standing apart.',
    growth: 'Belong without surrendering distinct conviction.',
    practices: ['Ask someone about a part of their life you usually overlook.', 'Join an ordinary community activity with no need to lead it.', 'Notice where you are changing your view merely to reduce social friction.', 'Offer practical help without making yourself central.', 'Name one way you are more similar to someone you disagree with than you prefer to admit.'],
    readings: [{ title: 'A Christmas Carol', author: 'Charles Dickens', why: 'For community, responsibility, isolation, and return to human connection.' }]
  }
}

const c = (label: string, scores: any, note?: string) => ({ label, scores, note })

export const questions: Question[] = [
  {
    id: 'free-year',
    prompt: 'You suddenly have an entire year completely free. After the novelty wears off, what pull becomes strongest?',
    instruction: 'Choose the answer that feels most alive, not most admirable.',
    choices: [
      c('I want to understand — study, investigate, and go deep.', { sage: 4, explorer: 1 }),
      c('I want to experience — travel, wander, try hard things, and see what happens.', { explorer: 4, hero: 1 }),
      c('I want to build — make something that did not exist before.', { creator: 4, ruler: 1 }),
      c('I want to master — choose something demanding and test myself.', { hero: 3, sage: 1, ruler: 1 }),
      c('I want to contribute — help, teach, protect, or serve.', { caregiver: 4, everyperson: 1 }),
      c('I want to be free — follow curiosity without turning the year into another obligation.', { explorer: 4, jester: 1, rebel: 1 })
    ]
  },
  {
    id: 'frustration',
    prompt: 'When life is most frustrating, which feeling is usually closest to the core of it?',
    choices: [
      c('I feel trapped.', { explorer: 4, rebel: 2 }),
      c('I feel surrounded by shallow or dishonest thinking.', { sage: 4 }),
      c('I feel like I am wasting my potential.', { creator: 3, hero: 2 }),
      c('I feel powerless.', { ruler: 3, rebel: 2 }),
      c('I feel disconnected from my people.', { lover: 3, everyperson: 3, caregiver: 1 }),
      c('I feel morally compromised.', { hero: 4, sage: 1 })
    ]
  },
  {
    id: 'group-problem',
    prompt: 'A group faces a serious problem and no leader has emerged. What do you do first?',
    choices: [
      c('Ask what we actually know and what we are assuming.', { sage: 4 }),
      c('Organize the people and assign the next actions.', { ruler: 4, hero: 1 }),
      c('Generate alternatives nobody has considered.', { creator: 3, magician: 2 }),
      c('Protect the people most exposed to the consequences.', { caregiver: 4 }),
      c('Move. Pick the best available option and act.', { hero: 4 }),
      c('Observe the incentives, politics, and hidden dynamics first.', { sage: 2, magician: 2, ruler: 1 }),
      c('Lighten the room so people can think again.', { jester: 4, everyperson: 1 })
    ]
  },
  {
    id: 'respected-warning',
    prompt: 'Someone you deeply respect says, “I think you are making a mistake.” Your immediate internal response is:',
    choices: [
      c('Tell me why.', { sage: 4 }),
      c('Maybe, but I need to find out for myself.', { explorer: 3, rebel: 1 }),
      c('Are you sure you understand what I am trying to do?', { creator: 2, explorer: 2 }),
      c('What am I missing?', { sage: 3, caregiver: 1 }),
      c('It is my mistake to make.', { explorer: 3, rebel: 2 }),
      c('Prove it. Challenge the reasoning.', { sage: 4, hero: 1 })
    ]
  },
  {
    id: 'shadow',
    prompt: 'When stressed, hurt, angry, or overwhelmed, which version of you is most familiar?',
    choices: [
      c('The escape artist — withdraw, avoid, or fantasize about walking away.', { explorer: 2, rebel: 1 }),
      c('The controller — rigid, impatient, and overly directive.', { ruler: 3 }),
      c('The prosecutor — build the case and prove exactly why I am right.', { sage: 2, hero: 1 }),
      c('The fortress — function, but become emotionally inaccessible.', { hero: 1, sage: 1 }),
      c('The martyr — carry too much, say too little, then resent that nobody noticed.', { caregiver: 4 }),
      c('The destroyer — quit, burn the bridge, and start over.', { rebel: 4 }),
      c('The cynic — people and institutions are all selfish anyway.', { rebel: 2, sage: 1 })
    ]
  },
  {
    id: 'meaningful-success',
    prompt: 'You accomplish something significant. Which reaction would make it feel most meaningful?',
    choices: [
      c('“You changed the way I think.”', { sage: 3, magician: 2 }),
      c('“I could not have done this without you.”', { caregiver: 3, lover: 1 }),
      c('“Nobody had done it that way before.”', { creator: 4, rebel: 1 }),
      c('“I did not think you could do it.”', { hero: 4 }),
      c('“Now I can go anywhere from here.”', { explorer: 4 }),
      c('“I made that. It was not here before.”', { creator: 4 }),
      c('Nobody needs to recognize it. I know more or can do more than before.', { sage: 3, hero: 1 })
    ]
  },
  {
    id: 'bad-rule',
    prompt: 'A rule or tradition is producing a bad outcome. What instinct appears first?',
    choices: [
      c('Work within the system to change it properly.', { ruler: 4 }),
      c('Quietly work around it.', { explorer: 2, rebel: 2 }),
      c('Challenge it openly and make its owner defend it.', { rebel: 3, hero: 2 }),
      c('Ignore it. A rule defeating its purpose has forfeited obedience.', { rebel: 4, explorer: 1 }),
      c('Build a better system and demonstrate the alternative.', { creator: 3, ruler: 1, magician: 1 }),
      c('Ask what problem the rule originally existed to solve.', { sage: 4, ruler: 1 })
    ]
  },
  {
    id: 'age-85',
    prompt: 'At 85, which realization would hurt the most?',
    choices: [
      c('I played it safe.', { explorer: 3, hero: 2 }),
      c('I never really figured myself out.', { sage: 2, magician: 2 }),
      c('I lived somebody else’s life.', { explorer: 4, rebel: 2 }),
      c('I did not leave anything behind.', { creator: 3, ruler: 1 }),
      c('I was not there enough for my people.', { caregiver: 4, lover: 3 }),
      c('I knew better and did not act on it.', { hero: 4 }),
      c('I stopped being curious.', { explorer: 3, sage: 3 })
    ]
  },
  {
    id: 'loved-one-mistake',
    prompt: 'Someone close to you is making a serious mistake after hearing your concerns. What is hardest?',
    choices: [
      c('Letting them learn the hard way.', { caregiver: 2, ruler: 1 }),
      c('Accepting their autonomy matters more than my judgment.', { explorer: 3, lover: 1 }),
      c('Wondering whether I failed to explain it well enough.', { sage: 3 }),
      c('Watching preventable suffering.', { caregiver: 4, lover: 2 }),
      c('Resisting the urge to fix the aftermath.', { caregiver: 3 }),
      c('Nothing about letting them choose; counsel given, the choice is theirs.', { explorer: 4, sage: 1 })
    ]
  },
  {
    id: 'identity',
    prompt: 'Strip away roles, titles, possessions, and reputation. Which statement feels most like the person underneath?',
    choices: [
      c('I am someone who seeks truth.', { sage: 4 }),
      c('I am someone who needs freedom.', { explorer: 4 }),
      c('I am someone who makes things better.', { creator: 3, ruler: 1, caregiver: 1 }),
      c('I am someone who takes care of my people.', { caregiver: 4, lover: 1 }),
      c('I am someone who explores.', { explorer: 4 }),
      c('I am someone who stands for something.', { hero: 4 }),
      c('I am someone who becomes.', { magician: 3, explorer: 1 })
    ]
  },
  {
    id: 'wrong-belief',
    prompt: 'You learn that a belief you defended for twenty years is wrong. What reaction dominates first?',
    choices: [
      c('Realizing I was wrong that long bothers me most.', { sage: 2, hero: 1 }),
      c('Admitting it publicly would hurt.', { ruler: 1, everyperson: 2 }),
      c('Who might my mistake have affected?', { caregiver: 3 }),
      c('What else did I build downstream from this?', { sage: 4 }),
      c('Part of my identity would feel destabilized.', { lover: 1, everyperson: 2 }),
      c('Excitement — I just learned something important.', { sage: 5, explorer: 1 })
    ]
  },
  {
    id: 'two-lives',
    prompt: 'Choose one life: deep mastery in one stable path, or many chapters filled with changing fields, strange interests, failures, communities, and stories.',
    choices: [
      c('Deep mastery, wisdom, and a stable intellectual life.', { sage: 4, ruler: 1 }),
      c('Many chapters, breadth, reinvention, and a hell of a lot of stories.', { explorer: 5, creator: 1 })
    ]
  },
  {
    id: 'new-place',
    prompt: 'You are dropped into an unfamiliar place with enough money to get by. After six months, what would make the time feel most complete?',
    choices: [
      c('I understand the place deeply.', { sage: 4 }),
      c('I built a small circle of my people.', { lover: 3, everyperson: 3 }),
      c('I found a problem and built a solution.', { creator: 3, ruler: 1 }),
      c('I explored the hell out of it.', { explorer: 5 }),
      c('I became useful to people there.', { caregiver: 3, everyperson: 1 }),
      c('I stayed unattached enough that I could leave tomorrow.', { explorer: 3, rebel: 1 })
    ]
  },
  {
    id: 'certainty',
    prompt: 'A person seems certain about almost everything. What bothers you most?',
    choices: [
      c('Their arrogance.', { everyperson: 1, sage: 1 }),
      c('Their lack of curiosity.', { explorer: 2, sage: 3 }),
      c('Their inherited conformity.', { rebel: 3, explorer: 1 }),
      c('Their rigidity in the face of evidence.', { sage: 4 }),
      c('Their desire to impose conclusions on others.', { explorer: 2, rebel: 3 }),
      c('Nothing inherently; certainty can be warranted if beliefs were genuinely examined.', { sage: 5, hero: 1 })
    ]
  },
  {
    id: 'door-motto',
    prompt: 'One sentence gets carved above your door. Which one do you actually want to live by?',
    choices: [
      c('Know what is true.', { sage: 5 }),
      c('Leave things better than you found them.', { creator: 2, caregiver: 2, ruler: 1 }),
      c('Go and see for yourself.', { explorer: 5 }),
      c('Take care of your people.', { caregiver: 5 }),
      c('Never surrender your freedom.', { explorer: 3, rebel: 3 }),
      c('Have the courage to act on what you believe.', { hero: 5 }),
      c('Never stop becoming.', { magician: 4, explorer: 1 })
    ]
  },
  {
    id: 'respect',
    prompt: 'Which person earns your deepest respect?',
    choices: [
      c('The lifelong truth-seeker who admits what they do not know.', { sage: 5 }),
      c('The person who left convention to live a genuinely chosen life.', { explorer: 4, rebel: 1 }),
      c('The person who stood alone for what was right despite the cost.', { hero: 5 }),
      c('The person who quietly cared for others for decades.', { caregiver: 5 }),
      c('The person who made something genuinely original.', { creator: 5 }),
      c('The person who endured hardship without becoming bitter.', { hero: 4, innocent: 1 }),
      c('The person who changed their mind when evidence demanded it despite social cost.', { sage: 4, hero: 2 })
    ]
  },
  {
    id: 'sting',
    prompt: 'Which accusation from someone who knows you well would sting the most?',
    choices: [
      c('You use freedom as an excuse to run when things get difficult.', { explorer: 3 }),
      c('You care so much about being right that you stop listening.', { sage: 3 }),
      c('Your principles matter until they cost you.', { hero: 4 }),
      c('You take care of everyone else partly to avoid dealing with what you need.', { caregiver: 5 }),
      c('You chase the next thing because staying long enough to master one scares you.', { explorer: 3, creator: 1 }),
      c('You care more about approval than you admit.', { everyperson: 3, lover: 1 }),
      c('Imagining who you could become sometimes replaces becoming that person.', { magician: 3, creator: 1 })
    ]
  },
  {
    id: 'duty-self',
    prompt: 'Someone you love genuinely needs you, but helping them costs an opportunity you have wanted for years. There is no clean way to do both.',
    choices: [
      c('They need me. That is the end of the discussion.', { caregiver: 5, hero: 1 }),
      c('I will help, but some part of me will grieve what I gave up.', { caregiver: 3, lover: 2 }),
      c('I need to choose my own life.', { explorer: 4, rebel: 1 }),
      c('Which choice can I live with twenty years from now?', { sage: 2, hero: 2 }),
      c('What is actually right here? Then do that.', { hero: 4, sage: 2 }),
      c('There has to be another solution.', { creator: 2, magician: 2, explorer: 1 })
    ]
  },
  {
    id: 'unseen-right',
    prompt: 'Nobody will ever know what you choose. Doing the right thing costs you significantly. What most compels you?',
    choices: [
      c('Someone needs help.', { caregiver: 4 }),
      c('It is right, whether anyone sees me or not.', { hero: 5 }),
      c('I gave my word.', { ruler: 2, hero: 3 }),
      c('My choices shape the person I become.', { magician: 2, hero: 2 }),
      c('Morality does not automatically require self-sacrifice.', { explorer: 2, sage: 1 }),
      c('Context determines what I actually owe.', { sage: 3 })
    ]
  },
  {
    id: 'truth-door',
    prompt: 'A mysterious door will show you something true about yourself that you do not currently know. It is safe, but you may dislike what you learn.',
    choices: [
      c('Open it immediately.', { sage: 3, explorer: 3 }),
      c('Go in, but deliberately.', { sage: 4, hero: 1 }),
      c('Hesitate, then curiosity probably wins.', { explorer: 2, sage: 2 }),
      c('Leave it alone. Not every truth needs uncovering.', { innocent: 1, ruler: 1 }),
      c('First ask how I know those conditions are actually true.', { sage: 5, jester: 1 })
    ]
  },
  {
    id: 'funeral',
    prompt: 'At the end of your life, you get to overhear one sentence about the kind of person you were. Which do you want most?',
    choices: [
      c('They understood things most people never took time to understand.', { sage: 5 }),
      c('They lived on their own terms and actually experienced the world.', { explorer: 5 }),
      c('When they believed something was right, you could count on them to stand for it.', { hero: 5 }),
      c('Their people always knew they would be there.', { caregiver: 5, lover: 1 }),
      c('There are things in the world that exist because they built them.', { creator: 5 }),
      c('They never stopped learning, changing, and becoming.', { magician: 3, explorer: 2 }),
      c('They made other people braver.', { hero: 4, caregiver: 2, magician: 1 })
    ]
  },
  {
    id: 'belonging',
    prompt: 'In a healthy community, what do you most want to experience?',
    choices: [
      c('Room to be fully myself without being managed.', { explorer: 3, rebel: 1 }),
      c('People who challenge my thinking honestly.', { sage: 3, hero: 1 }),
      c('A shared mission worth carrying together.', { hero: 2, everyperson: 2, ruler: 1 }),
      c('Deep loyalty and mutual care.', { caregiver: 3, lover: 3 }),
      c('Play, warmth, and not taking ourselves too seriously.', { jester: 3, everyperson: 2 }),
      c('The ability to make and build together.', { creator: 3, everyperson: 1 })
    ]
  },
  {
    id: 'failure',
    prompt: 'A project you care about fails publicly. What do you most want to do next?',
    choices: [
      c('Understand exactly why it failed.', { sage: 4 }),
      c('Try again with a harder, better plan.', { hero: 4 }),
      c('Build a different version from the lessons.', { creator: 4 }),
      c('Get some distance and go do something else for a while.', { explorer: 3 }),
      c('Make sure the people affected are okay.', { caregiver: 4 }),
      c('Laugh at the absurdity, then get perspective.', { jester: 4 })
    ]
  },
  {
    id: 'power',
    prompt: 'If you suddenly had much more influence than you do now, what would you most want to do with it?',
    choices: [
      c('Create structures that work better and last.', { ruler: 4, creator: 1 }),
      c('Protect people who have less power.', { caregiver: 3, hero: 2 }),
      c('Open doors and expand people’s options.', { explorer: 2, caregiver: 2, magician: 1 }),
      c('Change how people understand an important problem.', { sage: 2, magician: 3 }),
      c('Challenge institutions that no longer deserve obedience.', { rebel: 4, hero: 1 }),
      c('Make something beautiful, useful, or original at a larger scale.', { creator: 4 })
    ]
  },
  {
    id: 'ordinary-day',
    prompt: 'Which ordinary day sounds most satisfying?',
    choices: [
      c('I learned something difficult and changed my mind about part of it.', { sage: 4 }),
      c('I went somewhere new and came home with a story.', { explorer: 4 }),
      c('I solved a hard problem people were stuck on.', { hero: 2, creator: 2 }),
      c('I made someone I love feel genuinely supported.', { caregiver: 4, lover: 1 }),
      c('I made something and it finally works.', { creator: 4 }),
      c('I laughed a lot and helped other people loosen up.', { jester: 4 }),
      c('I helped a group become more coordinated and capable.', { ruler: 3, everyperson: 1 })
    ]
  }
]
