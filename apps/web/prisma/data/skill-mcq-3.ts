/**
 * Canonical BASIC_SKILLS_MCQ content, part 3 of 3 — Content Writing and
 * Communication for the Content Writer job title. Pure data, same conventions.
 */
import type { McqSeed } from "../seed-data";

const D = { E: "EASY", M: "MEDIUM", H: "HARD" } as const;

function s(
  skill: string,
  id: string,
  difficulty: "EASY" | "MEDIUM" | "HARD",
  text: string,
  options: [string, string, string, string],
  correct: 0 | 1 | 2 | 3,
): McqSeed {
  return {
    id,
    text,
    difficulty,
    flow: "BASIC_SKILLS_MCQ",
    jobTitleId: "jt_content",
    skills: [skill],
    options: options.map((t, i) => ({ text: t, correct: i === correct })),
  };
}

// ---------------------------------------------------- Content Writing (23)

const cwContent: McqSeed[] = [
  // EASY (7)
  s("Content Writing", "q_cw_ct_e01", D.E, "The first thing to define before writing a blog post is:", ["Who the reader is and what they should take away", "The font size", "The publication time", "The number of images"], 0),
  s("Content Writing", "q_cw_ct_e02", D.E, "Tone in writing is best described as:", ["The attitude or voice the text conveys", "The colour of the page", "The word count", "The author's age"], 0),
  s("Content Writing", "q_cw_ct_e03", D.E, "The standard editing sequence is:", ["Content, structure, then line-level polish", "Punctuation first, content last", "Images before any words", "Publishing first, editing later"], 0),
  s("Content Writing", "q_cw_ct_e04", D.E, "A strong headline is one that:", ["Matches the content and gives a reason to read on", "Promises something the article does not deliver", "Is the longest possible", "Avoids the reader's questions"], 0),
  s("Content Writing", "q_cw_ct_e05", D.E, "A fact is different from an opinion because a fact is:", ["Verifiable with evidence", "Always debatable", "Written in capital letters", "Only in headlines"], 0),
  s("Content Writing", "q_cw_ct_e06", D.E, "'Readability' in a draft mostly refers to:", ["How easily a reader can understand and follow the text", "The file size", "The number of authors", "The page's load time only"], 0),
  s("Content Writing", "q_cw_ct_e07", D.E, "When a brief says 'target audience: first-time buyers', you should write:", ["With simple explanations and no unexplained jargon", "With dense industry jargon", "Only in bullet fragments", "At a university level, always"], 0),
  // MEDIUM (8)
  s("Content Writing", "q_cw_ct_m01", D.M, "Content pillars are:", ["Core themes a brand consistently publishes around", "Physical columns on a website", "Random trending topics", "The team's OKRs"], 0),
  s("Content Writing", "q_cw_ct_m02", D.M, "Interviewing a subject-matter expert, the best technique is to:", ["Ask open questions, probe for specifics, and capture quotable detail", "Ask yes/no questions only", "Read the transcript and stop", "Ask about their salary"], 0),
  s("Content Writing", "q_cw_ct_m03", D.M, "An editorial calendar is used to:", ["Plan topics, owners, deadlines and publication dates", "Store invoices", "List employee birthdays", "Track server costs"], 0),
  s("Content Writing", "q_cw_ct_m04", D.M, "Repurposing content means:", ["Adapting one asset into several formats for different channels", "Deleting old posts", "Buying new software", "Renaming the brand"], 0),
  s("Content Writing", "q_cw_ct_m05", D.M, "A style guide primarily exists to:", ["Keep voice, terminology and formatting consistent across writers", "Replace the editor", "Increase page count", "Choose stock photos"], 0),
  s("Content Writing", "q_cw_ct_m06", D.M, "Fact-checking a draft involves:", ["Verifying claims against sources and correcting inaccuracies before publication", "Trusting memory", "Counting words", "Checking only the title"], 0),
  s("Content Writing", "q_cw_ct_m07", D.M, "When two editors give conflicting feedback, the best move is to:", ["Align on the brief's goal and resolve each point against it", "Pick the friendlier editor", "Ignore both", "Publish two versions"], 0),
  s("Content Writing", "q_cw_ct_m08", D.M, "A content brief for an article should include:", ["Goal, audience, key messages, structure and success criteria", "The writer's social media handles", "A stock photo only", "The printer's name"], 0),
  // HARD (8)
  s("Content Writing", "q_cw_ct_h01", D.H, "Content strategy differs from a list of topics in that it:", ["Connects audience needs, brand positioning and measurement into a plan", "Is just a spreadsheet of ideas", "Is decided only by word count", "Changes daily for fun"], 0),
  s("Content Writing", "q_cw_ct_h02", D.H, "Strong narrative structure for a long-form piece typically follows:", ["A clear thread: context, tension/problem, evidence, resolution", "Random anecdotes with no thread", "A wall of lists only", "Starting with the conclusion and never developing it"], 0),
  s("Content Writing", "q_cw_ct_h03", D.H, "For a deep-dive research article, the highest-value research habit is:", ["Primary sources plus multiple independent secondary sources, with citations", "One blog post", "Memory only", "Competitor articles only, copied"], 0),
  s("Content Writing", "q_cw_ct_h04", D.H, "Ghostwriting in a distinct brand voice requires:", ["Studying the brand's language, examples and audience, then matching deliberately", "Writing in your own preferred style", "Using more adjectives", "Avoiding any examples"], 0),
  s("Content Writing", "q_cw_ct_h05", D.H, "Scaling content operations sustainably depends on:", ["Templates, clear ownership, and quality gates that do not sacrifice accuracy", "Removing all editors", "Doubling word count targets", "Skipping fact-checks for speed"], 0),
  s("Content Writing", "q_cw_ct_h06", D.H, "Measuring content value beyond traffic should include:", ["Engagement quality, downstream conversions and assisted pipeline", "Impressions only", "Pageviews only", "The number of posts only"], 0),
  s("Content Writing", "q_cw_ct_h07", D.H, "When a topic's search intent shifts from informational to transactional, content should adapt by:", ["Adding the decision and conversion elements the new intent expects", "Keeping the old format unchanged", "Removing all product mentions", "Shortening to one paragraph"], 0),
  s("Content Writing", "q_cw_ct_h08", D.H, "The biggest quality risk in high-volume content programs is:", ["Thin, repetitive pieces that serve no unique user need", "Having too many editors", "Using headings", "Publishing on weekdays"], 0),
];

// -------------------------------------------------------- Communication (23)

const commContent: McqSeed[] = [
  // EASY (7)
  s("Communication", "q_cm_ct_e01", D.E, "A clear subject line in an email should:", ["Summarise the purpose so the reader knows what is needed", "Be left blank", "Be as long as the body", "Use all caps"], 0),
  s("Communication", "q_cm_ct_e02", D.E, "Adapting your message for a new technical reader means:", ["Assuming less background and defining terms", "Using more jargon", "Skipping the context", "Writing a longer email, always"], 0),
  s("Communication", "q_cm_ct_e03", D.E, "Active listening in a call means:", ["Confirming understanding by reflecting or paraphrasing", "Planning your reply while they talk", "Multitasking", "Nodding without processing"], 0),
  s("Communication", "q_cm_ct_e04", D.E, "The tone of a message to a frustrated client should be:", ["Calm, empathetic and solution-oriented", "Defensive and legalistic", "Sarcastic", "Indifferent"], 0),
  s("Communication", "q_cm_ct_e05", D.E, "Giving constructive feedback works best when it is:", ["Specific, timely and tied to observable work", "Vague and annual", "Public and personal", "Only negative"], 0),
  s("Communication", "q_cm_ct_e06", D.E, "In a meeting, 'parking lot' refers to:", ["Setting aside off-topic items to handle later", "Where cars are kept", "Ending the meeting", "Deleting the agenda"], 0),
  s("Communication", "q_cm_ct_e07", D.E, "When you do not understand a request, the best move is to:", ["Ask a clarifying question or restate your understanding", "Guess silently", "Say nothing and proceed", "Blame the sender"], 0),
  // MEDIUM (8)
  s("Communication", "q_cm_ct_m01", D.M, "Pitching a story idea to an editor should lead with:", ["Why it matters now, the angle, and why you are the right writer", "Your full biography", "A 10-page sample", "An apology in advance"], 0),
  s("Communication", "q_cm_ct_m02", D.M, "In an interview, the strongest questions are:", ["Open-ended, specific and built to draw detail and quotes", "Yes/no questions only", "Questions about the interviewer's salary", "Reading the resume aloud"], 0),
  s("Communication", "q_cm_ct_m03", D.M, "A stakeholder update on a delayed deliverable should include:", ["The new date, the reason, the impact, and what is being done", "Only 'sorry for the delay'", "Silence until it is done", "A blame list"], 0),
  s("Communication", "q_cm_ct_m04", D.M, "Written feedback on a draft is most useful when it:", ["Separates must-fix issues from suggestions and references specific lines", "Is a single paragraph of adjectives", "Changes the voice entirely without saying so", "Arrives after publication"], 0),
  s("Communication", "q_cm_ct_m05", D.M, "Cross-functional alignment on a content project is best achieved by:", ["A shared brief, named owners and agreed deadlines", "A chain of DMs with no owner", "Weekly redesign of the brief", "Letting each team interpret it freely"], 0),
  s("Communication", "q_cm_ct_m06", D.M, "When a client asks for 'punchier' copy, the practical response is to:", ["Ask for one specific example of what they mean, then revise", "Triple the exclamation marks", "Double the word count", "Refuse to change anything"], 0),
  s("Communication", "q_cm_ct_m07", D.M, "Saying no to an unreasonable deadline is most professional when you:", ["Explain the trade-off and offer a realistic alternative", "Say nothing and miss the date", "Accuse them of being unrealistic", "Agree silently and resent it"], 0),
  s("Communication", "q_cm_ct_m08", D.M, "Documenting a verbal agreement by email ('just to confirm...') is valuable because it:", ["Creates a shared written record and prevents drift", "Is always confrontational", "Wastes everyone's time by definition", "Replaces the meeting entirely, always"], 0),
  // HARD (8)
  s("Communication", "q_cm_ct_h01", D.H, "Translating a complex topic for executives, the best approach is:", ["Lead with the decision or ask, then support with the minimum necessary detail", "Start with every technical detail", "Write the longest possible brief", "Avoid numbers entirely"], 0),
  s("Communication", "q_cm_ct_h02", D.H, "When an editor pushes back on copy you believe is right, the strongest response is to:", ["Anchor on the brief's goal and evidence, and propose a test or compromise", "Resign from the project", "Ignore the feedback", "Escalate publicly on social media"], 0),
  s("Communication", "q_cm_ct_h03", D.H, "Brand voice governance at scale works best with:", ["A concise voice guide with do/don't examples and named ownership", "Every writer inventing the voice per article", "No guide, ever", "A 100-page legal document only"], 0),
  s("Communication", "q_cm_ct_h04", D.H, "When a subject-matter expert is vague in an interview, the effective technique is to:", ["Ask for concrete examples, numbers or a specific case", "Accept the vagueness and pad the article", "Make up the details", "End the interview"], 0),
  s("Communication", "q_cm_ct_h05", D.H, "In a product-incident communication, the audience-first structure is:", ["What happened, who is affected, what we are doing, when they will hear next", "A deep technical root-cause essay first", "No communication until the postmortem", "A sales pitch"], 0),
  s("Communication", "q_cm_ct_h06", D.H, "Ethical sourcing in content means:", ["Attributing claims, verifying sources, and disclosing conflicts or paid input", "Anonymous quotes always", "Uncredited reposts", "Unverified statistics"], 0),
  s("Communication", "q_cm_ct_h07", D.H, "Managing multiple urgent requests from different stakeholders is best done by:", ["Making priorities explicit, negotiating trade-offs, and communicating commitments", "Doing all of them at half quality", "Picking the loudest request, always", "Going silent"], 0),
  s("Communication", "q_cm_ct_h08", D.H, "The hallmark of mature written communication is:", ["Clarity of intent, audience awareness, and disciplined follow-through", "Maximum jargon", "Longest emails", "Frequent all-caps emphasis"], 0),
];

export const skillMcqsPart3: McqSeed[] = [...cwContent, ...commContent];
