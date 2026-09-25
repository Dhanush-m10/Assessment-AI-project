/**
 * Canonical BASIC_SKILLS_MCQ content, part 2 of 3 — SEO, Content Writing and
 * Analytics for the SEO Specialist job title. Pure data, same conventions.
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
    jobTitleId: "jt_seo",
    skills: [skill],
    options: options.map((t, i) => ({ text: t, correct: i === correct })),
  };
}

// ----------------------------------------------------------------- SEO (22)

const seo: McqSeed[] = [
  // EASY (8)
  s("SEO", "q_seo_e01", D.E, "SEO stands for:", ["Search Engine Optimisation", "Social Engine Outreach", "Site Experience Output", "Search Engine Ordering"], 0),
  s("SEO", "q_seo_e02", D.E, "A title tag is used to:", ["Describe the page to search engines and users in results", "Style the page with CSS", "Store the site's images", "Set the server location"], 0),
  s("SEO", "q_seo_e03", D.E, "Keyword research is primarily about:", ["Finding terms your audience searches for and where you can rank", "Guessing random words", "Choosing a domain colour", "Writing the sitemap"], 0),
  s("SEO", "q_seo_e04", D.E, "The meta description is:", ["A short summary that can appear under the title in search results", "Required CSS", "The site's logo", "A database field only"], 0),
  s("SEO", "q_seo_e05", D.E, "robots.txt is used to:", ["Tell crawlers which parts of the site to allow or disallow", "Style buttons", "Host the blog", "Encrypt traffic"], 0),
  s("SEO", "q_seo_e06", D.E, "'Indexing' a page means the search engine:", ["Stores it in its database so it can appear in results", "Deletes it", "Compresses it", "Moves it to a new server"], 0),
  s("SEO", "q_seo_e07", D.E, "A descriptive URL like /blog/seo-checklist is preferred because it:", ["Communicates content to users and crawlers", "Shortens the domain", "Increases server speed", "Hides the site from search"], 0),
  s("SEO", "q_seo_e08", D.E, "The main goal of on-page SEO is to:", ["Make the page's content and structure match a query's intent", "Buy more ads", "Reduce the number of pages to one", "Disable comments"], 0),
  // MEDIUM (7)
  s("SEO", "q_seo_m01", D.M, "Hreflang annotations are used to:", ["Tell search engines which language/region version of a page to serve", "Compress the HTML file", "Block indexing of a page", "Increase page speed"], 0),
  s("SEO", "q_seo_m02", D.M, "'Crawl budget' refers to:", ["How much crawling a site receives or requests within a period", "The ad budget", "The number of employees", "Server storage fees"], 0),
  s("SEO", "q_seo_m03", D.M, "Internal linking mainly helps by:", ["Distributing relevance and helping crawlers discover pages", "Replacing external links", "Hiding pages from users", "Removing the menu"], 0),
  s("SEO", "q_seo_m04", D.M, "Structured data (schema markup) is used to:", ["Help search engines understand page content for rich results", "Speed up the server", "Replace the sitemap", "Delete meta tags"], 0),
  s("SEO", "q_seo_m05", D.M, "Core Web Vitals include which of the following?", ["Largest Contentful Paint", "Number of backlinks", "Domain age", "Page count"], 0),
  s("SEO", "q_seo_m06", D.M, "A backlink's relevance matters most when:", ["It comes from a trusted, topically related site", "It is a paid link to any site", "It is a nofollow self-link", "It is from a parked domain"], 0),
  s("SEO", "q_seo_m07", D.M, "'404 vs 410' — a 410 status signals:", ["The resource is permanently gone, unlike a 404", "The page is temporary", "The page moved to a new URL", "The site is under maintenance"], 0),
  // HARD (7)
  s("SEO", "q_seo_h01", D.H, "After a core algorithm update drops traffic, the first sound diagnostic is to:", ["Segment by page and query to see which content and intent clusters moved", "Delete all content", "Buy links immediately", "Ignore it for a year"], 0),
  s("SEO", "q_seo_h02", D.H, "'Content decay' in SEO refers to:", ["Rankings and traffic fading as content ages and competitors improve", "Images losing resolution", "Servers slowing down", "Links being nofollowed"], 0),
  s("SEO", "q_seo_h03", D.H, "Refreshing older content typically improves performance by:", ["Updating facts, adding current depth and strengthening internal links", "Changing the domain", "Removing all keywords", "Making the page shorter and thinner"], 0),
  s("SEO", "q_seo_h04", D.H, "Crawlability and indexability differ in that indexability is about:", ["Whether crawled pages are actually stored and eligible for results", "How fast the server responds", "The colour of the logo", "The number of ads"], 0),
  s("SEO", "q_seo_h05", D.H, "Local SEO factors commonly include:", ["NAP consistency, local reviews and a complete business profile", "Global backlinks only", "The founder's name", "Server country only"], 0),
  s("SEO", "q_seo_h06", D.H, "Link equity from a page is distributed by:", ["Its outbound links to other pages", "Its CSS classes", "The number of images", "The title length"], 0),
  s("SEO", "q_seo_h07", D.H, "A healthy link profile is characterised by:", ["Diverse, relevant domains earning links at a natural rate", "Thousands of identical exact-match anchors", "All links from one network", "Only nofollow links from the site itself"], 0),
];

// ---------------------------------------------------- Content Writing (24)

const cwSeo: McqSeed[] = [
  // EASY (8)
  s("Content Writing", "q_cw_seo_e01", D.E, "The first step in writing SEO content is usually:", ["Understanding the target query and the reader's intent", "Writing 2,000 words immediately", "Choosing the font", "Buying keywords"], 0),
  s("Content Writing", "q_cw_seo_e02", D.E, "A good headline should:", ["Accurately reflect the content and attract the right reader", "Use clickbait unrelated to the page", "Be as long as possible", "Avoid any numbers ever"], 0),
  s("Content Writing", "q_cw_seo_e03", D.E, "Short paragraphs on the web help by:", ["Making content easier to scan", "Hiding the message", "Reducing the word count to zero", "Removing keywords"], 0),
  s("Content Writing", "q_cw_seo_e04", D.E, "In SEO content, the target keyword should appear naturally in:", ["The title, headings, body and meta description where it fits", "Only in the footer, 50 times", "Nowhere at all", "Only in the image file name"], 0),
  s("Content Writing", "q_cw_seo_e05", D.E, "Active voice is generally preferred in web copy because it is:", ["Clearer and more direct", "Always shorter in word count", "Harder to write", "Never used in SEO"], 0),
  s("Content Writing", "q_cw_seo_e06", D.E, "A content brief typically includes:", ["Goal, audience, key points and keyword targets", "The designer's salary", "The server IP", "A stock photo only"], 0),
  s("Content Writing", "q_cw_seo_e07", D.E, "'Plain language' means:", ["Writing clearly for the reader's level, avoiding jargon", "Writing without punctuation", "Using only bullet points", "Translating into another language"], 0),
  s("Content Writing", "q_cw_seo_e08", D.E, "Alt text for images is important because:", ["It describes images for accessibility and can aid relevance", "It makes images smaller", "It replaces the caption only", "It is never used by search engines"], 0),
  // MEDIUM (8)
  s("Content Writing", "q_cw_seo_m01", D.M, "Mapping content to search intent means matching the format to:", ["What the searcher wants to do (informational, navigational, transactional)", "The writer's mood", "The page's colour scheme", "The number of competitors"], 0),
  s("Content Writing", "q_cw_seo_m02", D.M, "Writing for a featured snippet (answer box) favours:", ["A concise, direct answer in a well-structured block", "A 5,000-word essay with no summary", "Only images", "Vague introductions"], 0),
  s("Content Writing", "q_cw_seo_m03", D.M, "Demonstrating E-E-A-T in content means showing:", ["Experience, expertise, authoritativeness and trustworthiness", "Emojis, exclamation marks and ads", "External links only", "A longer word count"], 0),
  s("Content Writing", "q_cw_seo_m04", D.M, "When a page ranks #6-10 for a key query, the strongest next step is usually to:", ["Improve the page's depth, structure and internal links", "Delete the page", "Duplicate it on a new URL", "Stop optimising for that query"], 0),
  s("Content Writing", "q_cw_seo_m05", D.M, "Refresh cadence for SEO content should be driven by:", ["Content decay signals, ranking movement and factual staleness", "A fixed monthly rule for every page", "The writer's availability only", "Random selection"], 0),
  s("Content Writing", "q_cw_seo_m06", D.M, "Internal links in an article should point to:", ["Topically related, relevant pages on the same site", "Unrelated top pages only", "External competitors", "The 404 page"], 0),
  s("Content Writing", "q_cw_seo_m07", D.M, "A content cluster (topic hub and spokes) is used to:", ["Build topical authority by organising related pages around a core topic", "Reduce the site to one page", "Avoid headings", "Hide content from users"], 0),
  s("Content Writing", "q_cw_seo_m08", D.M, "When writing comparison content ('X vs Y'), the best practice is to:", ["Be balanced and specific with verifiable criteria", "Disparage one product without evidence", "Omit all data", "Write only for one product"], 0),
  // HARD (8)
  s("Content Writing", "q_cw_seo_h01", D.H, "Topical authority is built by:", ["Covelling a subject comprehensively with linked, consistently maintained pages", "Publishing one thin article per keyword", "Buying a new domain per topic", "Removing all internal links"], 0),
  s("Content Writing", "q_cw_seo_h02", D.H, "Search intent can shift over time; a good detection method is to:", ["Review SERP results and query samples regularly to see if dominant intent changed", "Assume intent never changes", "Rely only on page views", "Ignore the SERP entirely"], 0),
  s("Content Writing", "q_cw_seo_h03", D.H, "Programmatic SEO done well means:", ["Templates with genuinely useful, unique data per page at scale", "Thin doorway pages with duplicated text", "Pages for every possible keyword with no value", "Blocking all crawlers"], 0),
  s("Content Writing", "q_cw_seo_h04", D.H, "Measuring content's value should combine:", ["Ranking and traffic with downstream outcomes (leads, assisted conversions)", "Impressions only", "Word count only", "The writer's hours only"], 0),
  s("Content Writing", "q_cw_seo_h05", D.H, "Brand queries vs non-brand queries matter because:", ["Brand search indicates loyalty; non-brand growth indicates demand creation", "Brand queries never convert", "Non-brand queries are always bad", "They are measured identically"], 0),
  s("Content Writing", "q_cw_seo_h06", D.H, "When updating a page that ranks for multiple queries, the key discipline is to:", ["Preserve the ranking queries while strengthening the page's core intent", "Rewrite it around a new, unrelated topic", "Delete and recreate the URL", "Remove all headings"], 0),
  s("Content Writing", "q_cw_seo_h07", D.H, "A content gap analysis is best done by:", ["Comparing ranked topics of strong competitors with your own coverage", "Copying competitors' text", "Assuming every keyword is covered", "Counting pages only"], 0),
  s("Content Writing", "q_cw_seo_h08", D.H, "The biggest risk of over-optimising for a single keyword is:", ["Satisficing the query poorly and missing broader user needs", "Having too many words", "Images loading slowly", "The title being readable"], 0),
];

// -------------------------------------------------------- Analytics (24)

const analyticsSeo: McqSeed[] = [
  // EASY (8)
  s("Analytics", "q_an_seo_e01", D.E, "GA4 (Google Analytics 4) is used to:", ["Measure site traffic and user interactions", "Host the website", "Design the logo", "Send invoices"], 0),
  s("Analytics", "q_an_seo_e02", D.E, "An 'organic' session in analytics means:", ["A visit that arrived from an unpaid search result", "A visit from a paid ad", "A bot visit", "An internal employee visit"], 0),
  s("Analytics", "q_an_seo_e03", D.E, "A conversion event is:", ["A defined user action you count as valuable", "Any page view", "A server error", "A logout only"], 0),
  s("Analytics", "q_an_seo_e04", D.E, "Bounce rate traditionally measures:", ["Sessions where the visitor left after one page", "The server's uptime", "The number of signups", "Ad spend"], 0),
  s("Analytics", "q_an_seo_e05", D.E, "A 'landing page' is:", ["The first page a visitor sees in a session", "The homepage always", "The contact form only", "The 404 page"], 0),
  s("Analytics", "q_an_seo_e06", D.E, "UTM parameters are used to:", ["Tag links so traffic sources can be tracked", "Compress images", "Encrypt emails", "Style buttons"], 0),
  s("Analytics", "q_an_seo_e07", D.E, "Impressions in search performance data mean:", ["How often the page appeared in search results", "How often it was clicked", "The number of users", "Ad spend"], 0),
  s("Analytics", "q_an_seo_e08", D.E, "Average position in search console shows:", ["Where your pages rank on average for queries", "The page's file size", "Server response time", "Number of authors"], 0),
  // MEDIUM (8)
  s("Analytics", "q_an_seo_m01", D.M, "Traffic up but clicks from search down could indicate:", ["Lower rankings or a drop in impressions for key queries", "The site is offline", "Analytics is impossible", "Users stopped typing"], 0),
  s("Analytics", "q_an_seo_m02", D.M, "A landing page with high traffic but low conversion should first be checked for:", ["Message match, clarity and friction in the page itself", "The company's stock price", "The logo colour only", "The DNS settings only"], 0),
  s("Analytics", "q_an_seo_m03", D.M, "A conversion funnel in analytics is used to:", ["Show where users drop off between steps", "Encrypt data", "Sort users alphabetically", "Replace the sitemap"], 0),
  s("Analytics", "q_an_seo_m04", D.M, "Segmenting organic traffic by landing page helps you:", ["Identify which entry pages drive the best outcomes", "Delete the homepage", "Increase ad spend blindly", "Rename all URLs"], 0),
  s("Analytics", "q_an_seo_m05", D.M, "A 'vanity metric' is:", ["A number that feels good but does not drive decisions (e.g. total pageviews)", "Revenue", "Conversion rate", "Customer lifetime value"], 0),
  s("Analytics", "q_an_seo_m06", D.M, "When comparing two months of organic traffic, the key caution is:", ["Account for seasonality and query mix before concluding improvement", "Always declare success", "Ignore the sample size", "Only look at the best day"], 0),
  s("Analytics", "q_an_seo_m07", D.M, "Setting up a conversion for 'newsletter signup' requires:", ["Firing a conversion event on the confirmation, with proper configuration", "Guessing the number", "Deleting the form", "Renaming the domain"], 0),
  s("Analytics", "q_an_seo_m08", D.M, "Search console coverage reports are used to detect:", ["Indexing problems (excluded, duplicate, or error pages)", "Ad CPMs", "The logo's colour", "Server CPU usage"], 0),
  // HARD (8)
  s("Analytics", "q_an_seo_h01", D.H, "Attributing revenue to organic search is challenging mainly because:", ["Users take multi-channel paths; organic both initiates and assists conversions", "Analytics never records visits", "Revenue is always zero", "Organic cannot be measured at all"], 0),
  s("Analytics", "q_an_seo_h02", D.H, "A solid GA4 measurement plan for SEO should include:", ["Defined key events, conversions, and a documented property/site setup", "Random event names", "No property structure", "Only ad metrics"], 0),
  s("Analytics", "q_an_seo_h03", D.H, "Running an experiment on an organic landing page should include:", ["A clear hypothesis, primary metric and guardrails", "Changing everything at once", "No control group", "Ignoring significance"], 0),
  s("Analytics", "q_an_seo_h04", D.H, "Connecting SEO KPIs to business KPIs means:", ["Tying rankings/traffic to outcomes like leads, revenue and retention", "Reporting only impressions", "Reporting only clicks", "Reporting only rankings"], 0),
  s("Analytics", "q_an_seo_h05", D.H, "A reliable SEO metrics pipeline typically:", ["Automates collection (search console + analytics), joins by page, and refreshes on a schedule", "Copies numbers by hand monthly", "Uses one screenshot per year", "Ignores page-level data"], 0),
  s("Analytics", "q_an_seo_h06", D.H, "Privacy changes (consent, reduced cookies) affect SEO measurement by:", ["Reducing available user-level signals, raising the value of aggregate and server-side data", "Making rankings impossible", "Deleting the site", "Increasing CPMs only"], 0),
  s("Analytics", "q_an_seo_h07", D.H, "When organic rankings improve but business results do not, the likely causes are:", ["Low commercial intent, weak message match, or a conversion problem downstream", "Analytics is broken, always", "Rankings are fake, always", "The site has no pages"], 0),
  s("Analytics", "q_an_seo_h08", D.H, "Cohort analysis of organic users is most useful for:", ["Comparing retention and value of users acquired in different periods", "Choosing a logo", "Counting domain names", "Setting the DNS"], 0),
];

export const skillMcqsPart2: McqSeed[] = [...seo, ...cwSeo, ...analyticsSeo];
