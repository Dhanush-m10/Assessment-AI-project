/**
 * Canonical BASIC_MCQ content, part 1 of 2 — Data Analyst +
 * Digital Marketing Manager. Pure data, same conventions as
 * general-mcq.ts. Skills follow each job title's JobTitleSkill links.
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

// -------------------------------------------------------- Data Analyst (34)

const dataAnalyst: McqSeed[] = [
  // EASY (12)
  r("jt_data_analyst", "q_da_e01", D.E, "In SQL, the WHERE clause is used to:", ["Sort results", "Filter rows before aggregation", "Rename columns", "Create a table"], 1, ["SQL"]),
  r("jt_data_analyst", "q_da_e02", D.E, "GROUP BY in a query is used to:", ["Aggregate data by category groups", "Delete duplicate rows", "Speed up all queries", "Format numbers"], 0, ["SQL"]),
  r("jt_data_analyst", "q_da_e03", D.E, "COUNT(*) on a table returns:", ["The number of columns", "The number of rows", "The largest value", "The table name"], 1, ["SQL"]),
  r("jt_data_analyst", "q_da_e04", D.E, "Which chart type is best for showing a trend over time?", ["Pie chart", "Line chart", "Doughnut chart", "Bubble chart"], 1, ["Analytics"]),
  r("jt_data_analyst", "q_da_e05", D.E, "In a spreadsheet, =SUM(A1:A3) is:", ["A static value", "A formula that adds three cells", "A chart", "A macro error"], 1, ["Analytics"]),
  r("jt_data_analyst", "q_da_e06", D.E, "The median of 2, 4, 6, 8, 10 is:", ["4", "5", "6", "8"], 2, ["Analytics"]),
  r("jt_data_analyst", "q_da_e07", D.E, "Combining two tables on a shared key is called a:", ["Filter", "Join", "Pivot", "Merge cell"], 1, ["SQL"]),
  r("jt_data_analyst", "q_da_e08", D.E, "A pivot table is most useful for:", ["Summarising data across categories", "Editing the database schema", "Backing up files", "Designing logos"], 0, ["Analytics"]),
  r("jt_data_analyst", "q_da_e09", D.E, "30 out of 60 orders were returns. The return rate is:", ["20%", "30%", "50%", "60%"], 2, ["Analytics"]),
  r("jt_data_analyst", "q_da_e10", D.E, "Sorting a column in ascending order shows:", ["Largest values first", "Smallest values first", "Alphabetical names only", "Random order"], 1, ["Analytics"]),
  r("jt_data_analyst", "q_da_e11", D.E, "Which of the following is a measure of central tendency?", ["Range", "Mean", "Variance", "Quartile"], 1, ["Analytics"]),
  r("jt_data_analyst", "q_da_e12", D.E, "A filter that keeps only rows with a value greater than 100 is a:", ["Sort", "Conditional filter", "Formula", "Group"], 1, ["Analytics"]),
  // MEDIUM (10)
  r("jt_data_analyst", "q_da_m01", D.M, "A LEFT JOIN between Orders and Customers keeps:", ["Only matching pairs", "All orders, even without a matching customer", "Only customers", "Only unmatched rows"], 1, ["SQL"]),
  r("jt_data_analyst", "q_da_m02", D.M, "SELECT DISTINCT is used to:", ["Remove duplicate values from results", "Delete rows permanently", "Sort the output", "Join two tables"], 0, ["SQL"]),
  r("jt_data_analyst", "q_da_m03", D.M, "Which KPI best tracks support team responsiveness?", ["Number of agents", "Median first-response time", "Office size", "Number of tickets created"], 1, ["Analytics"]),
  r("jt_data_analyst", "q_da_m04", D.M, "Cohort analysis groups users by:", ["The period they started, to compare behaviour over time", "Their favourite colour", "Random order", "Ticket price only"], 0, ["Analytics"]),
  r("jt_data_analyst", "q_da_m05", D.M, "In the data set [12, 13, 14, 15, 40], the likely outlier is:", ["12", "14", "15", "40"], 3, ["Analytics"]),
  r("jt_data_analyst", "q_da_m06", D.M, "A bar chart is most appropriate for:", ["Comparing values across categories", "Showing a single total", "Displaying text", "Hiding outliers"], 0, ["Analytics"]),
  r("jt_data_analyst", "q_da_m07", D.M, "Two variables move together over time. This observation alone proves:", ["Causation in both directions", "Correlation only, not causation", "Perfect prediction", "Nothing at all"], 1, ["Analytics"]),
  r("jt_data_analyst", "q_da_m08", D.M, "A P90 response time of 400 ms means:", ["90% of responses are faster than 400 ms", "10% of responses fail", "The server takes 90 seconds", "All responses are 400 ms"], 0, ["Analytics"]),
  r("jt_data_analyst", "q_da_m09", D.M, "A rule that an email field must contain '@' is an example of:", ["Format validation", "Encryption", "A primary key", "A data type"], 0, ["Analytics"]),
  r("jt_data_analyst", "q_da_m10", D.M, "1,000 visitors lead to 200 signups. The conversion rate is:", ["5%", "15%", "20%", "25%"], 2, ["Analytics"]),
  // HARD (12)
  r("jt_data_analyst", "q_da_h01", D.H, "In SQL, a window function such as RANK() computes a value:", ["Per row, relative to a defined partition, without collapsing rows", "By deleting the table first", "Only on aggregates", "Only on the first row"], 0, ["SQL"]),
  r("jt_data_analyst", "q_da_h02", D.H, "The main trade-off of denormalising a reporting table is:", ["Faster reads at the cost of redundant, harder-to-maintain data", "Smaller storage always", "Stronger integrity always", "Fewer queries needed to write"], 0, ["SQL"]),
  r("jt_data_analyst", "q_da_h03", D.H, "Analysing only customers who stayed and ignoring churned customers is an example of:", ["Survivorship bias", "Random sampling", "A/B testing", "Cohort design"], 0, ["Analytics"]),
  r("jt_data_analyst", "q_da_h04", D.H, "A data warehouse differs from an operational database mainly in that it is:", ["Optimised for analysis over historical, aggregated data", "Used for transactional writes only", "Never updated", "Always smaller"], 0, ["Analytics"]),
  r("jt_data_analyst", "q_da_h05", D.H, "MRR (monthly recurring revenue) differs from ARR primarily because:", ["MRR is the monthly base and ARR is roughly 12x MRR", "ARR excludes subscriptions", "MRR counts one-time fees", "ARR is measured weekly"], 0, ["Analytics"]),
  r("jt_data_analyst", "q_da_h06", D.H, "Imputing missing values with the column mean is risky mainly because it:", ["Can hide data-collection problems and distort variance", "Always increases the row count", "Is illegal in all industries", "Makes the table unreadable"], 0, ["Analytics"]),
  r("jt_data_analyst", "q_da_h07", D.H, "A correlated subquery is one that:", ["References a column from an outer query row", "Never uses WHERE", "Runs only once", "Cannot use JOINs at all"], 0, ["SQL"]),
  r("jt_data_analyst", "q_da_h08", D.H, "A 95% confidence interval for an effect means:", ["If the method is repeated, 95% of such intervals contain the true effect", "The effect is 95% likely to be true", "95% of data is inside the interval", "The result is proven"], 0, ["Analytics"]),
  r("jt_data_analyst", "q_da_h09", D.H, "In a star schema, fact tables are joined to dimension tables via:", ["Foreign keys to dimension primary keys", "Self-references only", "No keys at all", "Only the fact primary key"], 0, ["SQL"]),
  r("jt_data_analyst", "q_da_h10", D.H, "A statistically underpowered experiment most often leads to:", ["Missing real effects (false negatives)", "Guaranteed true positives", "Faster data collection", "Lower variance"], 0, ["Analytics"]),
  r("jt_data_analyst", "q_da_h11", D.H, "A retention curve that flattens at ~40% after month 3 suggests:", ["A stable core of engaged users remains", "The product will never grow", "All users churn by month 4", "Data is corrupted"], 0, ["Analytics"]),
  r("jt_data_analyst", "q_da_h12", D.H, "Data completeness and data accuracy differ in that completeness measures:", ["Whether expected values are present, while accuracy measures correctness", "Whether rows are deleted", "Only the file size", "Only the timestamp format"], 0, ["Analytics"]),
];

// -------------------------------------------------- Digital Marketing (34)

const dmm: McqSeed[] = [
  // EASY (12)
  r("jt_dmm", "q_dmm_e01", D.E, "Click-through rate (CTR) is calculated as:", ["Clicks divided by impressions", "Impressions divided by clicks", "Spend divided by clicks", "Visitors divided by sales"], 0, ["Analytics", "Social Media Marketing"]),
  r("jt_dmm", "q_dmm_e02", D.E, "A landing page's primary job is to:", ["Show everything the company makes", "Receive visitors and guide them to one action", "Host the blog archive", "Replace the homepage"], 1, ["Social Media Marketing"]),
  r("jt_dmm", "q_dmm_e03", D.E, "A call-to-action (CTA) is:", ["A button or phrase prompting a specific next step", "A legal disclaimer", "The company logo", "A page footer"], 0, ["Social Media Marketing"]),
  r("jt_dmm", "q_dmm_e04", D.E, "A/B testing compares:", ["Two variants to see which performs better", "Two different browsers", "Two years of data", "Two competitors' stock prices"], 0, ["Analytics"]),
  r("jt_dmm", "q_dmm_e05", D.E, "'Organic' traffic means:", ["Visits earned without paid promotion", "Traffic from a single office", "Bots only", "Paid search ads"], 0, ["Analytics"]),
  r("jt_dmm", "q_dmm_e06", D.E, "Engagement on a social post includes:", ["Likes, comments and shares", "Only the post cost", "Server uptime", "The number of followers lost"], 0, ["Social Media Marketing"]),
  r("jt_dmm", "q_dmm_e07", D.E, "The main goal of a brand-awareness campaign is:", ["Making the target audience recognise the brand", "Selling today at any price", "Reducing headcount", "Lowering ad spend only"], 0, ["Social Media Marketing"]),
  r("jt_dmm", "q_dmm_e08", D.E, "A content calendar is used to:", ["Plan and schedule what will be published and when", "Store invoices", "List employee birthdays", "Track server costs"], 0, ["Social Media Marketing"]),
  r("jt_dmm", "q_dmm_e09", D.E, "An email marketing list consists of:", ["People who opted in to receive emails", "Everyone on the internet", "Competitor staff only", "Past customers only, by law"], 0, ["Social Media Marketing"]),
  r("jt_dmm", "q_dmm_e10", D.E, "'Reach' on a social platform measures:", ["How many unique people saw the post", "Total ad spend", "The number of followers", "Video length"], 0, ["Analytics"]),
  r("jt_dmm", "q_dmm_e11", D.E, "Hashtags are mainly useful for:", ["Organising content and tracking campaign conversations", "Hiding posts", "Reducing post length", "Blocking competitors"], 0, ["Social Media Marketing"]),
  r("jt_dmm", "q_dmm_e12", D.E, "Which KPI best measures how often ad viewers click?", ["Impression share", "Click-through rate", "Brand lift", "Cost per view"], 1, ["Analytics"]),
  // MEDIUM (10)
  r("jt_dmm", "q_dmm_m01", D.M, "A campaign spends 1,000 and brings 20 new customers. The customer acquisition cost (CAC) is:", ["20", "50", "100", "200"], 1, ["Analytics"]),
  r("jt_dmm", "q_dmm_m02", D.M, "Spend 1,000 generates 5,000 in attributed revenue. The ROAS is:", ["1.5", "2", "5", "10"], 2, ["Analytics"]),
  r("jt_dmm", "q_dmm_m03", D.M, "A funnel shows 1000 → 600 → 300 → 100. The biggest relative drop-off is:", ["Visit to signup", "Signup to demo", "Demo to purchase", "All equal"], 2, ["Analytics"]),
  r("jt_dmm", "q_dmm_m04", D.M, "Last-click attribution gives full credit to:", ["The final touchpoint before conversion", "Every touchpoint equally", "The first touch only", "Organic search always"], 0, ["Analytics"]),
  r("jt_dmm", "q_dmm_m05", D.M, "Segmenting an audience by purchase behaviour (versus age or city) is:", ["Behavioural segmentation", "Geographic segmentation", "Demographic segmentation", "Psychographic segmentation"], 0, ["Analytics"]),
  r("jt_dmm", "q_dmm_m06", D.M, "Retargeting ads are shown to:", ["People who previously interacted but did not convert", "Brand-new strangers only", "Competitors", "Employees"], 0, ["Social Media Marketing"]),
  r("jt_dmm", "q_dmm_m07", D.M, "Conversion rate rises from 2% to 3%. The relative improvement is:", ["1%", "50%", "100%", "150%"], 1, ["Analytics"]),
  r("jt_dmm", "q_dmm_m08", D.M, "Brand safety review of ad placements exists to:", ["Avoid showing ads next to harmful or off-brand content", "Increase CPMs", "Compress images", "Translate copy"], 0, ["Social Media Marketing"]),
  r("jt_dmm", "q_dmm_m09", D.M, "Social listening is:", ["Monitoring brand mentions and conversations across channels", "Only counting followers", "Buying more ads", "Deleting negative comments"], 0, ["Social Media Marketing"]),
  r("jt_dmm", "q_dmm_m10", D.M, "When reallocating budget across channels, the soundest basis is:", ["Performance per goal with guardrails, not a single metric", "Always the cheapest CPM", "What the agency prefers", "Splitting equally, always"], 0, ["Analytics"]),
  // HARD (12)
  r("jt_dmm", "q_dmm_h01", D.H, "A healthy LTV:CAC ratio for a growing subscription business is commonly targeted around:", ["0.5:1", "1:1", "3:1 or better", "10:1 minimum"], 2, ["Analytics"]),
  r("jt_dmm", "q_dmm_h02", D.H, "Incrementality testing answers:", ["Whether the campaign caused conversions beyond what would have happened anyway", "How fast the site loads", "The brand's colour palette", "Only the total revenue"], 0, ["Analytics"]),
  r("jt_dmm", "q_dmm_h03", D.H, "Time-decay attribution versus last-click attribution:", ["Gives more credit to touches closer to conversion", "Credits only the first touch", "Ignores timing entirely", "Is never used in practice"], 0, ["Analytics"]),
  r("jt_dmm", "q_dmm_h04", D.H, "Cohort-based marketing differs from broad blasting mainly by:", ["Targeting people by lifecycle stage with stage-appropriate messages", "Sending only one email ever", "Using only paid channels", "Avoiding measurement"], 0, ["Social Media Marketing"]),
  r("jt_dmm", "q_dmm_h05", D.H, "Media mix modelling (MMM) is preferred over last-touch analytics when:", ["You need budget-level, channel-level insights with privacy-friendly aggregate data", "You only care about single sessions", "You lack any data", "The brand has one channel only"], 0, ["Analytics"]),
  r("jt_dmm", "q_dmm_h06", D.H, "If paid search spend is up and organic volume is down, a likely explanation is:", ["Paid may be cannibalising organic clicks", "Organic search was discontinued", "The website is offline", "Brands cannot share traffic"], 0, ["Analytics"]),
  r("jt_dmm", "q_dmm_h07", D.H, "Guardrail metrics in a growth experiment are:", ["Metrics that must not deteriorate while the primary metric improves", "Optional vanity numbers", "Only revenue", "Only site speed"], 0, ["Analytics"]),
  r("jt_dmm", "q_dmm_h08", D.H, "High price elasticity of demand means:", ["Small price changes cause large demand changes", "Demand is unresponsive to price", "Prices never change", "Elasticity is always negative and fixed"], 0, ["Analytics"]),
  r("jt_dmm", "q_dmm_h09", D.H, "View fraud in display advertising is a risk because:", ["Bots can inflate impressions, making CPM-based spend ineffective", "It lowers brand recognition", "It increases organic reach", "It is impossible to detect"], 0, ["Analytics"]),
  r("jt_dmm", "q_dmm_h10", D.H, "A lifecycle marketing program is structured around:", ["Awareness, consideration, retention and advocacy stages with tailored touchpoints", "One generic campaign for all", "Only post-purchase", "Only pre-launch"], 0, ["Social Media Marketing"]),
  r("jt_dmm", "q_dmm_h11", D.H, "With third-party cookies declining, marketing teams are shifting toward:", ["First-party data and server-side measurement", "Bigger banners", "More pop-ups", "Unmeasured spend"], 0, ["Analytics"]),
  r("jt_dmm", "q_dmm_h12", D.H, "Choosing a north-star metric, it should be:", ["Tied to long-term customer value and actionable by the team", "The easiest number to fake", "Only revenue, regardless of retention", "Changed weekly for novelty"], 0, ["Analytics"]),
];

export const roleMcqsPart1: McqSeed[] = [...dataAnalyst, ...dmm];
