/**
 * Canonical BASIC_MCQ content, part 2 of 2 — HR Manager + CEO.
 * Pure data, same conventions as general-mcq.ts.
 */
import type { McqSeed } from "../seed-data";

const D = { E: "EASY", M: "MEDIUM", H: "HARD" } as const;

function r(
  jobTitleId: string,
  id: string,
  difficulty: "EASY" | "MEDIUM" | "HARD",
  text: string,
  options: [string, string, string, string],
  correct: 0 | 1 | 2 | 3,
  skills: string[],
): McqSeed {
  return {
    id,
    text,
    difficulty,
    flow: "BASIC_MCQ",
    jobTitleId,
    skills,
    options: options.map((t, i) => ({ text: t, correct: i === correct })),
  };
}

// ---------------------------------------------------------- HR Manager (34)

const hr: McqSeed[] = [
  // EASY (11)
  r("jt_hr", "q_hr_e01", D.E, "The primary purpose of onboarding is to:", ["Delay the start date", "Help new hires become productive and integrated quickly", "Reduce the headcount", "Replace training entirely"], 1, ["Communication"]),
  r("jt_hr", "q_hr_e02", D.E, "A job description typically defines:", ["Responsibilities, requirements and reporting lines", "Employee salaries for the whole company", "The office floor plan", "Server specifications"], 0, ["Communication"]),
  r("jt_hr", "q_hr_e03", D.E, "A performance review is used to:", ["Assess and discuss work performance against goals", "Pick team lunch", "Rewrite contracts unilaterally", "Avoid conversations"], 0, ["Leadership"]),
  r("jt_hr", "q_hr_e04", D.E, "A notice period is:", ["The required time between resignation and the last working day", "A marketing campaign", "A salary band", "A holiday type"], 0, ["Communication"]),
  r("jt_hr", "q_hr_e05", D.E, "A PTO request is a request to:", ["Take paid time off", "Increase the budget", "Change the office", "Hire a contractor"], 0, ["Communication"]),
  r("jt_hr", "q_hr_e06", D.E, "An exit interview is most useful for:", ["Capturing candid feedback about the employee experience", "Delaying separations", "Replacing references", "Writing job ads"], 0, ["Communication"]),
  r("jt_hr", "q_hr_e07", D.E, "When two team members conflict, the first step should be to:", ["Listen to both sides privately", "Pick a winner immediately", "Ignore it", "Escalate to the CEO"], 0, ["Leadership", "Communication"]),
  r("jt_hr", "q_hr_e08", D.E, "Effective feedback is best described as:", ["Specific, timely and focused on behaviour", "Vague and yearly", "Only praise", "Given in public to embarrass"], 0, ["Communication"]),
  r("jt_hr", "q_hr_e09", D.E, "A team charter is:", ["An agreement on how the team works together", "A legal contract with the government", "A pay table", "A project Gantt chart"], 0, ["Leadership"]),
  r("jt_hr", "q_hr_e10", D.E, "Equal-opportunity hiring means candidates are evaluated on:", ["Merit and job relevance", "Friendships", "University names only", "Referrals only"], 0, ["Leadership"]),
  r("jt_hr", "q_hr_e11", D.E, "A leave of absence is:", ["An approved extended break from work, often unpaid or partial pay", "A promotion", "A team-building event", "A salary increase"], 0, ["Communication"]),
  // MEDIUM (11)
  r("jt_hr", "q_hr_m01", D.M, "A high performer's teammate repeatedly misses deadlines. The manager's best first move is:", ["A private conversation to uncover the blocker before escalating", "Public criticism to create urgency", "Immediately reassigning all the work", "Waiting for the annual review to raise it"], 0, ["Leadership"]),
  r("jt_hr", "q_hr_m02", D.M, "A performance improvement plan (PIP) should contain:", ["Specific gaps, expectations, support and a review date", "Only a final warning", "A vague request to do better", "No written record"], 0, ["Leadership"]),
  r("jt_hr", "q_hr_m03", D.M, "For a fully remote team, the best habit for maintaining engagement is:", ["Regular, structured touchpoints plus clear written updates", "Requiring everyone to be online 24/7", "Avoiding video calls", "Random status demands"], 0, ["Communication"]),
  r("jt_hr", "q_hr_m04", D.M, "Compensation benchmarking is used to:", ["Position pay against the market for similar roles", "Guess salaries", "Hide pay ranges", "Replace job descriptions"], 0, ["Leadership"]),
  r("jt_hr", "q_hr_m05", D.M, "Annual attrition of 15 out of 100 employees is:", ["10%", "12.5%", "15%", "20%"], 2, ["Communication"]),
  r("jt_hr", "q_hr_m06", D.M, "The highest-leverage use of an engagement survey is to:", ["Act on the results and share what changed", "Store the data for years", "Rank individuals", "Repeat the same survey monthly"], 0, ["Leadership"]),
  r("jt_hr", "q_hr_m07", D.M, "When an employee raises a grievance, the first duty of the HR lead is to:", ["Take it seriously, confidentially and log it promptly", "Tell the whole team", "Side with the manager automatically", "Ignore minor complaints"], 0, ["Communication"]),
  r("jt_hr", "q_hr_m08", D.M, "Succession planning is:", ["Identifying and developing successors for key roles", "Replacing all managers at once", "Posting every vacancy externally", "Avoiding promotions"], 0, ["Leadership"]),
  r("jt_hr", "q_hr_m09", D.M, "Communicating a layoff to affected employees should be:", ["Individual, private, direct, with next steps and support", "A public wall post", "Anonymous voicemail", "Delayed until the last second"], 0, ["Communication"]),
  r("jt_hr", "q_hr_m10", D.M, "A skills-gap analysis compares:", ["Current team capabilities with the skills the strategy requires", "Office sizes", "Salary budgets only", "Competitor headcount only"], 0, ["Leadership"]),
  r("jt_hr", "q_hr_m11", D.M, "A manager's span of control refers to:", ["The number of direct reports a manager can effectively lead", "The office floor area", "The number of teams in the company", "The length of the org chart"], 0, ["Leadership"]),
  // HARD (12)
  r("jt_hr", "q_hr_h01", D.H, "Sustaining a culture change requires, above all:", ["Leadership consistently modelling the behaviour, reinforced through hiring and rewards", "A one-off all-hands announcement", "New posters in the office", "A longer holiday policy"], 0, ["Leadership"]),
  r("jt_hr", "q_hr_h02", D.H, "Pay compression (new hires paid at or above existing tenured staff) is best addressed by:", ["A transparent band review and targeted adjustments", "Freezing all salaries forever", "Ignoring the issue", "Promoting everyone equally"], 0, ["Leadership"]),
  r("jt_hr", "q_hr_h03", D.H, "Under standard overtime rules, an employee's obligation is most protected when:", ["Overtime is pre-approved and tracked per policy", "Managers can demand unpaid 'favour' hours", "Hours are guessed monthly", "Overtime is never paid"], 0, ["Leadership"]),
  r("jt_hr", "q_hr_h04", D.H, "Managing a difficult high performer who damages team collaboration, the soundest move is:", ["Address the behaviour explicitly; performance does not excuse it, with support to change", "Promote them to escape the team", "Let the team handle it", "Dismiss immediately without process"], 0, ["Leadership"]),
  r("jt_hr", "q_hr_h05", D.H, "A matrix structure (project + functional reporting) creates which core risk?", ["Ambiguous authority between two managers", "Too few managers", "No projects at all", "Lower salaries automatically"], 0, ["Leadership"]),
  r("jt_hr", "q_hr_h06", D.H, "When employees begin organising collectively (e.g. seeking union recognition), the legally safest posture is to:", ["Follow neutral legal guidance, keep communications factual, and avoid coercion or retaliation", "Promise raises to stop it", "Dismiss organisers", "Ignore it publicly"], 0, ["Leadership"]),
  r("jt_hr", "q_hr_h07", D.H, "Setting diversity goals is most defensible when they are:", ["Tied to defined, measurable representation targets with accountability", "Unwritten preferences", "Quotas that override merit without process", "Hidden from leadership"], 0, ["Leadership"]),
  r("jt_hr", "q_hr_h08", D.H, "In an acquisition, the single biggest people risk is:", ["Loss of key talent during integration uncertainty", "The office layout", "Slower email", "More training materials"], 0, ["Leadership"]),
  r("jt_hr", "q_hr_h09", D.H, "Total-rewards communication works best when it:", ["Explains the full value (pay, benefits, growth) in the employee's own terms", "Hides the breakdown", "Only discusses base salary", "Sends once, yearly, with no follow-up"], 0, ["Communication"]),
  r("jt_hr", "q_hr_h10", D.H, "Defending against a discrimination claim most depends on:", ["Consistent, documented, criteria-based decisions over time", "Rewriting history after the fact", "Vague 'good impression' notes", "Avoiding written records"], 0, ["Leadership"]),
  r("jt_hr", "q_hr_h11", D.H, "Applying a structured change model (e.g. Kotter) first means:", ["Creating urgency and a guiding coalition before executing changes", "Rolling out changes first, explaining later", "Cutting the budget first", "Changing the org chart silently"], 0, ["Leadership"]),
  r("jt_hr", "q_hr_h12", D.H, "Turnover-driver analysis is most actionable when it:", ["Segments attrition by role, tenure and manager to find avoidable drivers", "Only reports one company-wide number", "Blames external factors exclusively", "Ignores voluntary exits"], 0, ["Leadership"]),
];

// ----------------------------------------------------------------- CEO (34)

const ceo: McqSeed[] = [
  // EASY (12)
  r("jt_ceo", "q_ceo_e01", D.E, "The first thing an executive dashboard should show is:", ["Key metrics against targets", "Every employee's email", "The office floor plan", "Vendor invoices"], 0, ["Leadership"]),
  r("jt_ceo", "q_ceo_e02", D.E, "A board deck is:", ["A concise presentation for the board covering performance and decisions", "A sales brochure", "A legal contract", "A product manual"], 0, ["Communication"]),
  r("jt_ceo", "q_ceo_e03", D.E, "QBR stands for:", ["Quarterly Business Review", "Quick Bug Report", "Quality Board Rating", "Quarterly Budget Request"], 0, ["Communication"]),
  r("jt_ceo", "q_ceo_e04", D.E, "A stakeholder is:", ["Anyone with an interest in or influence over the company", "Only investors", "Only employees", "Only customers"], 0, ["Communication"]),
  r("jt_ceo", "q_ceo_e05", D.E, "A vision statement describes:", ["Where the company aims to be", "Last month's invoice", "The office address", "The hiring process"], 0, ["Leadership"]),
  r("jt_ceo", "q_ceo_e06", D.E, "In a business context, 'bandwidth' refers to:", ["Available capacity of time or resources", "The internet connection only", "A type of report", "A team name"], 0, ["Leadership"]),
  r("jt_ceo", "q_ceo_e07", D.E, "OKR stands for:", ["Objectives and Key Results", "Operational Key Rate", "Order of Key Resources", "Outlook and Key Review"], 0, ["Leadership"]),
  r("jt_ceo", "q_ceo_e08", D.E, "A cap table shows:", ["Who owns equity in the company", "Office furniture ownership", "The board's meeting schedule", "Payroll dates"], 0, ["Leadership"]),
  r("jt_ceo", "q_ceo_e09", D.E, "Before entering a new market, the first question to answer is:", ["What do customers there actually need and will they pay?", "What colour is the logo?", "How many floors do we rent?", "Who designs the website?"], 0, ["Leadership"]),
  r("jt_ceo", "q_ceo_e10", D.E, "Burn rate means:", ["How fast the company spends cash", "The furnace in the office", "Server power usage", "The speed of code deploys"], 0, ["Leadership"]),
  r("jt_ceo", "q_ceo_e11", D.E, "A go-to-market strategy defines:", ["How the product reaches and converts customers", "The office move date", "The HR policy", "The font of the website"], 0, ["Leadership"]),
  r("jt_ceo", "q_ceo_e12", D.E, "All-hands meetings primarily exist to:", ["Align the whole company on direction and priorities", "Read payroll aloud", "Schedule every meeting", "Replace the board"], 0, ["Communication"]),
  // MEDIUM (11)
  r("jt_ceo", "q_ceo_m01", D.M, "When prioritising initiatives, the most useful lens is:", ["Impact against effort and strategic fit", "Loudness of the request", "Alphabetical order", "Personal favourite first"], 0, ["Leadership"]),
  r("jt_ceo", "q_ceo_m02", D.M, "Two department heads push conflicting priorities. The best executive move is to:", ["Make the trade-off explicit using shared goals and decide, communicating the why", "Let them keep fighting", "Do both at full cost", "Avoid the topic"], 0, ["Leadership"]),
  r("jt_ceo", "q_ceo_m03", D.M, "When senior leaders disagree, the constructive pattern is to:", ["Surface data, restate the decision criteria, decide and document", "Side with the louder voice", "Delay indefinitely", "Escalate to the board first"], 0, ["Leadership"]),
  r("jt_ceo", "q_ceo_m04", D.M, "An investor update should lead with:", ["Progress against plan, key risks and what is being done about them", "A 40-slide history", "Only good news", "A personal narrative"], 0, ["Communication"]),
  r("jt_ceo", "q_ceo_m05", D.M, "When scaling, the hiring plan should be aligned to:", ["Revenue and delivery milestones, not headcount for its own sake", "Office square footage", "Competitor headcount blindly", "The founder's calendar"], 0, ["Leadership"]),
  r("jt_ceo", "q_ceo_m06", D.M, "Brand positioning is about:", ["A clear, defensible difference in the customer's mind", "A new logo", "A bigger ad budget", "A cheaper price"], 0, ["Communication"]),
  r("jt_ceo", "q_ceo_m07", D.M, "In the first 24 hours of a crisis, the priority is to:", ["Contain the issue and communicate transparently with affected parties", "Announce a new product", "Stay silent until it passes", "Blame a vendor publicly"], 0, ["Communication"]),
  r("jt_ceo", "q_ceo_m08", D.M, "Choosing a first international market, the best criteria combine:", ["Market size, fit, reachability and competitive gap", "Personal holidays", "Nearest office", "Currency symbol"], 0, ["Leadership"]),
  r("jt_ceo", "q_ceo_m09", D.M, "Good board governance is characterised by:", ["A clear cadence, the right information, and decisions with documented rationale", "Weekly social events", "No minutes", "The CEO deciding everything alone"], 0, ["Leadership"]),
  r("jt_ceo", "q_ceo_m10", D.M, "Scaling culture while hiring fast is best protected by:", ["Hiring for values and deliberately socialising new leaders", "Stopping all hiring", "A longer manual", "Bigger offices"], 0, ["Leadership"]),
  r("jt_ceo", "q_ceo_m11", D.M, "A CEO with P&L ownership should focus most on:", ["Revenue growth, cost discipline and cash conversion together", "Only marketing spend", "Only headcount growth", "Only the product roadmap"], 0, ["Leadership"]),
  // HARD (11)
  r("jt_ceo", "q_ceo_h01", D.H, "With uncertain demand, runway planning is most robust when it:", ["Uses scenarios (base/upside/downside) with explicit triggers to act", "Assumes the best case only", "Ignores cash until it runs low", "Relies on one forecast, never updated"], 0, ["Leadership"]),
  r("jt_ceo", "q_ceo_h02", D.H, "A strong signal to pivot is when:", ["Repeated experiments fail on a core assumption despite sound execution", "One bad week of revenue", "A competitor's logo change", "A single customer complaint"], 0, ["Leadership"]),
  r("jt_ceo", "q_ceo_h03", D.H, "Value-based pricing is set primarily by:", ["The value the product delivers to the customer, not just cost plus margin", "The cheapest competitor always", "The CEO's intuition alone", "A fixed industry percentage"], 0, ["Leadership"]),
  r("jt_ceo", "q_ceo_h04", D.H, "A durable competitive moat is best described as:", ["A structural advantage (network effects, switching costs, scale) competitors cannot easily copy", "A short marketing burst", "A price war", "A single celebrity endorsement"], 0, ["Leadership"]),
  r("jt_ceo", "q_ceo_h05", D.H, "The most common M&A failure pattern is:", ["Overpaying for assumed synergies that never materialise", "Signing the contract too fast on paper", "Choosing a small logo", "Holding too many all-hands"], 0, ["Leadership"]),
  r("jt_ceo", "q_ceo_h06", D.H, "In a talent war for a few key roles, the most effective lever is:", ["A tailored pitch: mission, scope, team and clear comp rationale", "Raising every salary equally", "Posting jobs only", "Waiting for referrals to arrive"], 0, ["Leadership"]),
  r("jt_ceo", "q_ceo_h07", D.H, "Communicating a downturn to the company works best when the CEO:", ["States the facts, the plan, and the choices made, then invites questions", "Hides the numbers", "Blames the market and stops", "Gives no update for months"], 0, ["Communication"]),
  r("jt_ceo", "q_ceo_h08", D.H, "Improving the cash conversion cycle means:", ["Collecting receivables faster, managing inventory and timing payables within policy", "Delaying all payments indefinitely", "Cutting revenue", "Stopping collections"], 0, ["Leadership"]),
  r("jt_ceo", "q_ceo_h09", D.H, "When the board challenges a core strategy, the CEO should respond by:", ["Presenting the evidence, the decision framework, and a reversible experiment plan", "Refusing to engage", "Resigning on the spot", "Promising everything the board wants"], 0, ["Leadership", "Communication"]),
  r("jt_ceo", "q_ceo_h10", D.H, "Evidence of product-market fit includes:", ["Sustained demand: retention, repeat usage and organic pull", "A single large sale", "A polished demo", "A large ad budget"], 0, ["Leadership"]),
  r("jt_ceo", "q_ceo_h11", D.H, "A founder stepping back operationally should sequence the transition by:", ["Documenting decisions, delegating with clear ownership, and staying accountable for outcomes", "Vanishing immediately", "Keeping every decision", "Replacing the whole team at once"], 0, ["Leadership"]),
];

export const roleMcqsPart2: McqSeed[] = [...hr, ...ceo];
