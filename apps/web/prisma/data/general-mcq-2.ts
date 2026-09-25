/**
 * Canonical GENERAL content, part 2 of 3 — Numerical Reasoning +
 * Communication Skills. Pure data, same conventions as general-mcq.ts.
 */
import type { McqSeed } from "../seed-data";

const D = { E: "EASY", M: "MEDIUM", H: "HARD" } as const;

function g(
  areaId: string,
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
    flow: "GENERAL",
    areaId,
    options: options.map((t, i) => ({ text: t, correct: i === correct })),
  };
}

// ---------------------------------------------------- Numerical (34)

const numerical: McqSeed[] = [
  // EASY (11)
  g("area_numerical", "q_num_e01", D.E, "23 + 45 = ?", ["58", "63", "68", "73"], 2),
  g("area_numerical", "q_num_e02", D.E, "15 x 4 = ?", ["50", "55", "60", "65"], 2),
  g("area_numerical", "q_num_e03", D.E, "40% of 250 is:", ["80", "90", "100", "120"], 2),
  g("area_numerical", "q_num_e04", D.E, "100 - 37 = ?", ["62", "63", "67", "73"], 1),
  g("area_numerical", "q_num_e05", D.E, "The average of 10 and 30 is:", ["18", "20", "22", "25"], 1),
  g("area_numerical", "q_num_e06", D.E, "12% of 50 is:", ["5", "6", "7", "8"], 1),
  g("area_numerical", "q_num_e07", D.E, "7 x 8 = ?", ["54", "56", "58", "63"], 1),
  g("area_numerical", "q_num_e08", D.E, "Three invoices total 150, 250 and 100. The grand total is:", ["450", "480", "500", "520"], 2),
  g("area_numerical", "q_num_e09", D.E, "45 is 50% of which number?", ["75", "85", "90", "100"], 2),
  g("area_numerical", "q_num_e10", D.E, "9 x 9 = ?", ["72", "81", "89", "99"], 1),
  g("area_numerical", "q_num_e11", D.E, "1 hour 45 minutes plus 30 minutes is:", ["2 hours", "2 hours 5 minutes", "2 hours 15 minutes", "2 hours 30 minutes"], 2),
  // MEDIUM (11)
  g("area_numerical", "q_num_m01", D.M, "Monthly sales were 400, 600 and 500 units in January, February and March. The Q1 average is:", ["480", "500", "520", "550"], 1),
  g("area_numerical", "q_num_m02", D.M, "An 18% tax on a 800 invoice amounts to:", ["128", "136", "144", "152"], 2),
  g("area_numerical", "q_num_m03", D.M, "A machine worth 50,000 depreciates 10% per year. Its value after 2 years is:", ["42,000", "40,500", "40,000", "38,500"], 1),
  g("area_numerical", "q_num_m04", D.M, "10 people score 70 on average and 15 people score 80 on average. The combined average is:", ["74", "75", "76", "78"], 2),
  g("area_numerical", "q_num_m05", D.M, "Revenue grows from 200 to 260. The growth rate is:", ["20%", "25%", "30%", "35%"], 2),
  g("area_numerical", "q_num_m06", D.M, "720 is split in the ratio 3:5. The smaller share is:", ["240", "260", "270", "280"], 2),
  g("area_numerical", "q_num_m07", D.M, "A cyclist covers 300 m in 48 s. Her speed is:", ["20 km/h", "21 km/h", "22.5 km/h", "24 km/h"], 2),
  g("area_numerical", "q_num_m08", D.M, "1,000 compounded at 5% per year for 2 years becomes:", ["1,100", "1,102.5", "1,105", "1,110"], 1),
  g("area_numerical", "q_num_m09", D.M, "Conversion rates: A sold 200 of 400 leads, B 300 of 400, C 400 of 400. Which is the highest converter?", ["A", "B", "C", "All equal"], 2),
  g("area_numerical", "q_num_m10", D.M, "A quantity falls from 50 to 40. The percentage change is:", ["-10%", "-20%", "-25%", "-40%"], 1),
  g("area_numerical", "q_num_m11", D.M, "Simple interest on 2,000 at 6% per year for 3 years is:", ["300", "330", "360", "400"], 2),
  // HARD (12)
  g("area_numerical", "q_num_h01", D.H, "Year 1: revenue 1,000, cost 800. Year 2: revenue 1,200, cost 900. How did the profit margin change?", ["Fell 5 points", "Rose 5 points", "Stayed the same", "Rose 10 points"], 1),
  g("area_numerical", "q_num_h02", D.H, "Fixed costs are 6,000 per month. Each unit sells for 50 with a variable cost of 30. The break-even volume is:", ["200 units", "250 units", "300 units", "350 units"], 2),
  g("area_numerical", "q_num_h03", D.H, "A:B = 2:3 and B:C = 4:5. The ratio A:C is:", ["2:5", "4:5", "8:15", "10:15"], 2),
  g("area_numerical", "q_num_h04", D.H, "A population of 1,000,000 grows 2% per year. After 2 years it is approximately:", ["1,020,000", "1,040,000", "1,040,400", "1,044,000"], 2),
  g("area_numerical", "q_num_h05", D.H, "5 litres of a 20% sugar solution are mixed with 10 litres of a 40% solution. The sugar concentration is:", ["26.7%", "30%", "33.3%", "40%"], 2),
  g("area_numerical", "q_num_h06", D.H, "An item with cost 800 is marked up to 1,000, but a 2% discount is given. The actual profit percentage is:", ["20%", "22%", "22.5%", "25%"], 2),
  g("area_numerical", "q_num_h07", D.H, "A works 6 h/day and B 12 h/day on a job. They work 2 days together, then A finishes alone. Total days:", ["4", "5", "6", "7"], 1),
  g("area_numerical", "q_num_h08", D.H, "A is 20% of B and B is 50% of C. A is what percent of C?", ["5%", "10%", "15%", "25%"], 1),
  g("area_numerical", "q_num_h09", D.H, "Department averages: 30 people at 50k, 40 people at 60k, 30 people at 70k. The overall average salary is:", ["58k", "59k", "60k", "62k"], 2),
  g("area_numerical", "q_num_h10", D.H, "40,000 is invested in the ratio 3:5; the parts earn 10% and 6%. The overall return is:", ["6.5%", "7%", "7.5%", "8%"], 2),
  g("area_numerical", "q_num_h11", D.H, "Three consecutive integers multiply to 210. The middle integer is:", ["4", "5", "6", "7"], 2),
  g("area_numerical", "q_num_h12", D.H, "A price rises 25%, then falls 25%. The net change from the original price is:", ["No change", "6.25% decrease", "6.25% increase", "12.5% decrease"], 1),
];

// ------------------------------------------------ Communication (34)

const communication: McqSeed[] = [
  // EASY (11)
  g("area_communication", "q_com_e01", D.E, "A good email subject line is:", ["As long as possible", "Short and specific to the request", "Left blank", "The same for every email"], 1),
  g("area_communication", "q_com_e02", D.E, "When first writing to a new client, you should open by:", ["Demanding payment terms", "Introducing yourself and the context", "Copying your whole team", "Apologising in advance"], 1),
  g("area_communication", "q_com_e03", D.E, "In formal written work, 'ASAP' is best replaced with:", ["'Immediately'", "A concrete date and time", "An exclamation mark", "Nothing at all"], 1),
  g("area_communication", "q_com_e04", D.E, "The right tone when replying to a customer complaint is:", ["Defensive", "Empathetic and solution-focused", "Indifferent", "Formal and cold"], 1),
  g("area_communication", "q_com_e05", D.E, "In a meeting, the person who records decisions and action items is the:", ["Chair only", "Minute-taker", "Most senior person", "Scribe, often a dedicated minute-taker"], 3),
  g("area_communication", "q_com_e06", D.E, "In email, 'CC' stands for:", ["Copy channel", "Carbon copy", "Central contact", "Copy to client"], 1),
  g("area_communication", "q_com_e07", D.E, "When presenting numbers to a non-technical audience, you should:", ["Use as many decimals as possible", "Speak in plain language with examples", "Quote only formulas", "Avoid any numbers"], 1),
  g("area_communication", "q_com_e08", D.E, "Delivering bad news at work works best when you are:", ["Vague until pressed", "Direct, brief, and include the next step", "Overly cheerful", "Silent and hopeful"], 1),
  g("area_communication", "q_com_e09", D.E, "The best follow-up after a job interview is:", ["A short, specific thank-you note", "A long essay of your background", "No follow-up", "A daily check-in call"], 0),
  g("area_communication", "q_com_e10", D.E, "Active listening in a conversation means:", ["Waiting for your turn to talk", "Reflecting back what you understood", "Planning your reply", "Nodding and glancing at your phone"], 1),
  g("area_communication", "q_com_e11", D.E, "A meeting should end with:", ["A summary of who said what", "Clear action items, owners and deadlines", "A vote on the venue", "An open discussion"], 1),
  // MEDIUM (11)
  g("area_communication", "q_com_m01", D.M, "A project-delay email to a client should lead with:", ["A list of internal excuses", "The impact, the revised timeline, and the mitigation", "A personal apology, only", "The next quarter's forecast"], 1),
  g("area_communication", "q_com_m02", D.M, "The phrase 'we need to look into this issue' is weak in a commitment because it:", ["Uses too many words", "Commits to no owner or timeline", "Is too polite", "Names the issue"], 1),
  g("area_communication", "q_com_m03", D.M, "The strongest structure for a one-page business proposal is:", ["Background, history, appendix", "Problem, proposed solution, cost, next steps", "Features first, price last, no summary", "A single paragraph of 500 words"], 1),
  g("area_communication", "q_com_m04", D.M, "Disagreeing with a senior colleague in a meeting is best handled by:", ["Staying silent and complaining later", "Acknowledging their point, then presenting a data-backed alternative", "Escalating to the boss immediately", "Changing the subject"], 1),
  g("area_communication", "q_com_m05", D.M, "The purpose of an executive summary is to let a busy reader:", ["Skip the document", "Understand the conclusion and the ask within a minute", "Verify every data point", "See the team org chart"], 1),
  g("area_communication", "q_com_m06", D.M, "In a cross-team status update, the most valuable content is:", ["How hard everyone worked", "What is blocked, and what unblocks it", "The full meeting transcript", "Next month's budget only"], 1),
  g("area_communication", "q_com_m07", D.M, "In a formal report, which word choice is most appropriate?", ["Kids", "Folks", "Children", "Guys"], 2),
  g("area_communication", "q_com_m08", D.M, "When a stakeholder asks 'why did we choose option X?', the strongest answer:", ["Says 'because it's better'", "Cites the decision criteria and the alternatives considered", "Blames the vendor", "Repeats the original email verbatim"], 1),
  g("area_communication", "q_com_m09", D.M, "You receive a rude email from a colleague. The most professional move is to:", ["Reply in kind immediately", "Reply CC'ing leadership", "Pause, then respond calmly addressing only the issue", "Delete it and ignore the person"], 2),
  g("area_communication", "q_com_m10", D.M, "A slide packed with eight bullet points is best handled by:", ["Reading them all aloud", "Summarising to three key points and keeping detail in handout", "Making the font smaller", "Removing the slide"], 1),
  g("area_communication", "q_com_m11", D.M, "In a negotiation email, 'anchoring' means:", ["Attaching a calendar invite", "Opening with your own terms to shape the range", "Quoting a competitor's price", "Ending without a signature"], 1),
  // HARD (12)
  g("area_communication", "q_com_h01", D.H, "The same release news goes to executives and end users. The best audience adaptation is:", ["Identical text for both", "Executives get business impact and metrics; users get what changes for them", "Users get full technical detail; executives get nothing", "Send only to executives"], 1),
  g("area_communication", "q_com_h02", D.H, "A manager agrees in meetings but complains privately. The most effective correction is:", ["Raising disagreements in the room, with data and a proposed path", "Complaining privately in return", "Avoiding that manager's meetings", "Documenting every 'yes' and confronting later"], 0),
  g("area_communication", "q_com_h03", D.H, "Explaining a risky data migration to a non-technical VP, you should lead with:", ["Schema details and query plans", "Business impact: downtime window, revenue at risk, and rollback plan", "A list of database versions", "The migration team's org chart"], 1),
  g("area_communication", "q_com_h04", D.H, "A client's 'urgent' new request threatens a committed deadline. The best response is:", ["Silently absorb both", "Present the explicit trade-off and let the client choose the priority", "Drop the old deadline", "Refuse without discussion"], 1),
  g("area_communication", "q_com_h05", D.H, "Which phrasing is the most neutral, professional way to report a missed report?", ["'You always send reports late!'", "'The report was late.'", "'We missed the reporting deadline; here is the cause and the fix.'", "'Sorry sorry sorry.'"], 2),
  g("area_communication", "q_com_h06", D.H, "A vendor delay will make you miss a compliance deadline. The right escalation is:", ["Waiting to see if it resolves", "Escalating immediately with the impact, the evidence, and two options", "Emailing everyone in the company", "Handling it quietly after the deadline"], 1),
  g("area_communication", "q_com_h07", D.H, "A good post-incident summary contains:", ["Who to blame, at length", "Timeline, impact, root cause, and prevention steps, framed blamelessly", "Only the fix that was applied", "A motivational reflection"], 1),
  g("area_communication", "q_com_h08", D.H, "A stakeholder agreed in the meeting but objected by email afterwards. The best move is:", ["Proceeding as agreed in the meeting", "Requesting a short call to reconcile the conflict before proceeding", "Quoting the meeting notes publicly", "Ignoring the email"], 1),
  g("area_communication", "q_com_h09", D.H, "The line between persuasion and manipulation in a business email is:", ["How many exclamation marks you use", "Perspective: persuasion shares reasoning and invites choice; manipulation hides the ask or manufactures urgency", "The length of the email", "Whether you use bold text"], 1),
  g("area_communication", "q_com_h10", D.H, "A well-structured performance-feedback conversation follows:", ["General praise, then vague criticism", "Specific behaviour, its impact, and an agreed improvement plan", "Rankings against the whole team", "Only written feedback, never verbal"], 1),
  g("area_communication", "q_com_h11", D.H, "For a distributed, multi-country team, the best writing habit is:", ["Rich local idioms for warmth", "Plain, explicit language that avoids idioms and local references", "Very long emails so nothing is missed", "Voice notes instead of writing"], 1),
  g("area_communication", "q_com_h12", D.H, "A decision document is most skimmable when:", ["The recommendation is buried in the final paragraph", "The recommendation and its rationale lead, followed by options and risks", "Only the dissent is included", "Every option gets equal length"], 1),
];

export const generalMcqsPart2: McqSeed[] = [...numerical, ...communication];
