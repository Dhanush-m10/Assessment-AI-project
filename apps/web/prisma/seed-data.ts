/**
 * Canonical seed dataset (single source of truth).
 *
 * Shared by BOTH database loaders so a fresh database and an already
 * populated one can never diverge in content definitions:
 *   - prisma/seed.ts          -> fresh-database loader (refuses to run on a
 *                                non-empty database; wipes nothing)
 *   - prisma/seed-content.ts  -> additive, idempotent top-up for an existing
 *                                database (upsert-by-deterministic-id; never
 *                                deletes; never touches assessment/user data)
 *
 * This module is pure data + helpers: no PrismaClient instantiation and no
 * side effects at import time. Enum names are imported type-only (erased at
 * runtime; the values are plain strings matching the generated client).
 *
 * Scale and names follow the prototype evidence recorded in
 * docs/DECISIONS.md ("Facts extracted from the PDF screenshots").
 */
import type {
  AssessmentFlow,
  Difficulty,
  ExperienceBand,
  JdLibrarySource,
  PublishStatus,
  TestCaseVisibility,
} from "@prisma/client";
import { generalMcqsPart1 } from "./data/general-mcq";
import { generalMcqsPart2 } from "./data/general-mcq-2";
import { generalMcqsPart3 } from "./data/general-mcq-3";
import { roleMcqsPart1 } from "./data/role-mcq-1";
import { roleMcqsPart2 } from "./data/role-mcq-2";
import { skillMcqsPart1 } from "./data/skill-mcq-1";
import { skillMcqsPart2 } from "./data/skill-mcq-2";
import { skillMcqsPart3 } from "./data/skill-mcq-3";
import { codingsExpanded } from "./data/coding";

export const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
export const slug = (s: string) =>
  s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

// ---------------------------------------------------------------- taxonomy

export const categories = [
  { id: "cat_general", name: "General", kind: "TOPIC_TRACK", status: "LIVE" },
  { id: "cat_business", name: "Business", kind: "JOB_TRACK", status: "LIVE" },
  { id: "cat_commerce", name: "Commerce", kind: "JOB_TRACK", status: "LIVE" },
  { id: "cat_science", name: "Science", kind: "JOB_TRACK", status: "LIVE" },
  { id: "cat_technology", name: "Technology", kind: "JOB_TRACK", status: "LIVE" },
  { id: "cat_health", name: "Health", kind: "JOB_TRACK", status: "LIVE" },
  { id: "cat_arts", name: "Arts & Design", kind: "JOB_TRACK", status: "DRAFT" },
] as const;

export const areas: { id: string; categoryId: string; name: string; classification: "GENERAL" | "ROLE_BASED"; status: PublishStatus }[] = [
  // General (TOPIC_TRACK) areas - candidate dashboard carousel
  { id: "area_aptitude", categoryId: "cat_general", name: "Aptitude", classification: "GENERAL", status: "LIVE" },
  { id: "area_logical", categoryId: "cat_general", name: "Logical Reasoning", classification: "GENERAL", status: "LIVE" },
  { id: "area_numerical", categoryId: "cat_general", name: "Numerical Reasoning", classification: "GENERAL", status: "LIVE" },
  { id: "area_communication", categoryId: "cat_general", name: "Communication Skills", classification: "GENERAL", status: "LIVE" },
  { id: "area_critical", categoryId: "cat_general", name: "Critical Thinking", classification: "GENERAL", status: "LIVE" },
  { id: "area_detail", categoryId: "cat_general", name: "Attention to Detail", classification: "GENERAL", status: "LIVE" },
  // Business
  { id: "area_entrepreneurship", categoryId: "cat_business", name: "Entrepreneurship", classification: "ROLE_BASED", status: "LIVE" },
  { id: "area_finance", categoryId: "cat_business", name: "Finance", classification: "ROLE_BASED", status: "LIVE" },
  { id: "area_hr", categoryId: "cat_business", name: "Human Resources", classification: "ROLE_BASED", status: "LIVE" },
  { id: "area_leadership", categoryId: "cat_business", name: "Leadership", classification: "ROLE_BASED", status: "LIVE" },
  // Commerce
  { id: "area_marketing", categoryId: "cat_commerce", name: "Marketing", classification: "ROLE_BASED", status: "LIVE" },
  { id: "area_accounting", categoryId: "cat_commerce", name: "Accounting", classification: "ROLE_BASED", status: "LIVE" },
  { id: "area_biz_analytics", categoryId: "cat_commerce", name: "Business Analytics", classification: "ROLE_BASED", status: "LIVE" },
  // Science
  { id: "area_biotech", categoryId: "cat_science", name: "Biotechnology", classification: "ROLE_BASED", status: "LIVE" },
  { id: "area_env_sci", categoryId: "cat_science", name: "Environmental Science", classification: "ROLE_BASED", status: "LIVE" },
  // Technology
  { id: "area_softdev", categoryId: "cat_technology", name: "Software Development", classification: "ROLE_BASED", status: "LIVE" },
  { id: "area_data_analytics", categoryId: "cat_technology", name: "Data Analytics", classification: "ROLE_BASED", status: "LIVE" },
  { id: "area_cyber", categoryId: "cat_technology", name: "Cybersecurity", classification: "ROLE_BASED", status: "LIVE" },
  { id: "area_data_science", categoryId: "cat_technology", name: "Data Science", classification: "ROLE_BASED", status: "LIVE" },
  // Health
  { id: "area_health_mgmt", categoryId: "cat_health", name: "Healthcare Management", classification: "ROLE_BASED", status: "LIVE" },
  { id: "area_public_health", categoryId: "cat_health", name: "Public Health", classification: "ROLE_BASED", status: "LIVE" },
  { id: "area_nutrition", categoryId: "cat_health", name: "Nutrition", classification: "ROLE_BASED", status: "LIVE" },
  // Arts & Design
  { id: "area_graphic", categoryId: "cat_arts", name: "Graphic Design", classification: "ROLE_BASED", status: "LIVE" },
  { id: "area_interior", categoryId: "cat_arts", name: "Interior Design", classification: "ROLE_BASED", status: "DRAFT" },
];

export const jobTitles: { id: string; areaOfInterestId: string; name: string; assessmentFlow: AssessmentFlow; status: PublishStatus }[] = [
  { id: "jt_backend", areaOfInterestId: "area_softdev", name: "Backend Developer", assessmentFlow: "CODING", status: "LIVE" },
  { id: "jt_frontend", areaOfInterestId: "area_softdev", name: "Frontend Developer", assessmentFlow: "CODING", status: "LIVE" },
  { id: "jt_fullstack", areaOfInterestId: "area_softdev", name: "Full Stack Developer", assessmentFlow: "CODING", status: "LIVE" },
  { id: "jt_data_analyst", areaOfInterestId: "area_data_analytics", name: "Data Analyst", assessmentFlow: "BASIC_MCQ", status: "LIVE" },
  { id: "jt_data_scientist", areaOfInterestId: "area_data_science", name: "Data Scientist", assessmentFlow: "BASIC_SKILLS_MCQ", status: "LIVE" },
  { id: "jt_security", areaOfInterestId: "area_cyber", name: "Security Analyst", assessmentFlow: "CODING", status: "LIVE" },
  { id: "jt_dmm", areaOfInterestId: "area_marketing", name: "Digital Marketing Manager", assessmentFlow: "BASIC_MCQ", status: "LIVE" },
  { id: "jt_seo", areaOfInterestId: "area_marketing", name: "SEO Specialist", assessmentFlow: "BASIC_SKILLS_MCQ", status: "LIVE" },
  { id: "jt_content", areaOfInterestId: "area_marketing", name: "Content Writer", assessmentFlow: "BASIC_SKILLS_MCQ", status: "LIVE" },
  { id: "jt_hr", areaOfInterestId: "area_hr", name: "HR Manager", assessmentFlow: "BASIC_MCQ", status: "LIVE" },
  { id: "jt_ceo", areaOfInterestId: "area_entrepreneurship", name: "CEO", assessmentFlow: "BASIC_MCQ", status: "LIVE" },
  { id: "jt_accountant", areaOfInterestId: "area_accounting", name: "Accountant", assessmentFlow: "BASIC_MCQ", status: "DRAFT" },
  { id: "jt_graphic_designer", areaOfInterestId: "area_graphic", name: "Graphic Designer", assessmentFlow: "BASIC_SKILLS_MCQ", status: "LIVE" },

{ id: "jt_financial_analyst", areaOfInterestId: "area_finance", name: "Financial Analyst", assessmentFlow: "BASIC_MCQ", status: "LIVE" },

{ id: "jt_business_manager", areaOfInterestId: "area_leadership", name: "Business Manager", assessmentFlow: "BASIC_SKILLS_MCQ", status: "LIVE" },

{ id: "jt_business_analyst", areaOfInterestId: "area_biz_analytics", name: "Business Analyst", assessmentFlow: "BASIC_MCQ", status: "LIVE" },

{ id: "jt_healthcare_admin", areaOfInterestId: "area_health_mgmt", name: "Healthcare Administrator", assessmentFlow: "BASIC_MCQ", status: "LIVE" },

{ id: "jt_nutritionist", areaOfInterestId: "area_nutrition", name: "Nutritionist", assessmentFlow: "BASIC_SKILLS_MCQ", status: "LIVE" },

{ id: "jt_public_health_specialist", areaOfInterestId: "area_public_health", name: "Public Health Specialist", assessmentFlow: "BASIC_MCQ", status: "LIVE" },

{ id: "jt_biotechnologist", areaOfInterestId: "area_biotech", name: "Biotechnologist", assessmentFlow: "BASIC_SKILLS_MCQ", status: "LIVE" },

{ id: "jt_environmental_scientist", areaOfInterestId: "area_env_sci", name: "Environmental Scientist", assessmentFlow: "BASIC_SKILLS_MCQ", status: "LIVE" },
];

export const skills = [
  "React", "JavaScript", "Node.js", "SQL", "MongoDB", "CSS", "HTML", "Python",
  "Docker", "Git", "AWS", "Data Structures", "Algorithms", "REST API",
  "Express", "Next.js", "SEO", "Content Writing", "Social Media Marketing",
  "Analytics", "Leadership", "Communication",
];
export const skillId = (name: string) => `sk_${slug(name)}`;

export const jobTitleSkills: Record<string, string[]> = {
  jt_backend: ["JavaScript", "Node.js", "SQL", "REST API"],
  jt_frontend: ["JavaScript", "React", "CSS", "HTML", "Next.js"],
  jt_fullstack: ["JavaScript", "React", "Node.js", "SQL", "MongoDB", "REST API"],
  jt_data_analyst: ["SQL", "Analytics", "Python"],
  jt_data_scientist: ["Python", "Analytics", "Algorithms"],
  jt_security: ["Python", "AWS", "Algorithms"],
  jt_dmm: ["Social Media Marketing", "Analytics"],
  jt_seo: ["SEO", "Content Writing", "Analytics"],
  jt_content: ["Content Writing", "Communication"],
  jt_hr: ["Leadership", "Communication"],
  jt_ceo: ["Leadership", "Communication"],
  jt_accountant: ["Analytics"],
};

// ------------------------------------------------------------------- JDs

export const bandLabel: Record<ExperienceBand, string> = {
  Y0_2: "0-2 Years",
  Y2_5: "2-5 Years",
  Y5_8: "5-8 Years",
};

export const jds: { id: string; jobTitleId: string; band: ExperienceBand; content: string; source: JdLibrarySource; status: PublishStatus; skills: string[] }[] = [
  { id: "jd_backend_0_2", jobTitleId: "jt_backend", band: "Y0_2", content: "Assist in building and maintaining robust backend services, APIs, and database integrations under senior guidance.", source: "MANUAL", status: "LIVE", skills: ["JavaScript", "Node.js", "SQL"] },
  { id: "jd_backend_2_5", jobTitleId: "jt_backend", band: "Y2_5", content: "Design and develop secure backend services, optimize performance, and collaborate with frontend teams on API contracts.", source: "MANUAL", status: "LIVE", skills: ["JavaScript", "Node.js", "REST API", "SQL"] },
  { id: "jd_frontend_0_2", jobTitleId: "jt_frontend", band: "Y0_2", content: "Implement responsive UI components from designs, fix bugs, and write basic unit tests for a React codebase.", source: "MANUAL", status: "LIVE", skills: ["JavaScript", "React", "CSS"] },
  { id: "jd_frontend_2_5", jobTitleId: "jt_frontend", band: "Y2_5", content: "Own feature development end-to-end in a Next.js app, improve Core Web Vitals, and maintain a shared component library.", source: "AI", status: "LIVE", skills: ["React", "Next.js", "CSS", "HTML"] },
  { id: "jd_fullstack_0_2", jobTitleId: "jt_fullstack", band: "Y0_2", content: "Assist in developing and maintaining web applications using modern JavaScript frameworks and backend technologies.", source: "MANUAL", status: "DRAFT", skills: ["JavaScript", "React", "Node.js"] },
  { id: "jd_fullstack_2_5", jobTitleId: "jt_fullstack", band: "Y2_5", content: "Develop scalable full stack applications, integrate third-party APIs, and optimize performance and security.", source: "MANUAL", status: "LIVE", skills: ["JavaScript", "React", "Node.js", "MongoDB"] },
  { id: "jd_data_analyst_0_2", jobTitleId: "jt_data_analyst", band: "Y0_2", content: "Build dashboards and recurring reports, clean datasets, and support stakeholders with ad-hoc SQL analysis.", source: "CSV", status: "LIVE", skills: ["SQL", "Analytics"] },
  { id: "jd_data_analyst_2_5", jobTitleId: "jt_data_analyst", band: "Y2_5", content: "Translate business questions into analyses, maintain semantic models, and present insights to leadership.", source: "MANUAL", status: "LIVE", skills: ["SQL", "Analytics", "Python"] },
  { id: "jd_data_scientist_2_5", jobTitleId: "jt_data_scientist", band: "Y2_5", content: "Develop and evaluate predictive models, design experiments, and productionize models with engineering support.", source: "AI", status: "LIVE", skills: ["Python", "Analytics", "Algorithms"] },
  { id: "jd_data_scientist_5_8", jobTitleId: "jt_data_scientist", band: "Y5_8", content: "Set the technical direction for modelling, mentor scientists, and own model risk and monitoring standards.", source: "MANUAL", status: "LIVE", skills: ["Python", "Algorithms", "Analytics"] },
  { id: "jd_security_0_2", jobTitleId: "jt_security", band: "Y0_2", content: "Triage security alerts, run vulnerability scans, and assist with incident documentation and remediation tracking.", source: "MANUAL", status: "LIVE", skills: ["Python", "AWS"] },
  { id: "jd_security_2_5", jobTitleId: "jt_security", band: "Y2_5", content: "Perform threat modelling, review application security, and automate detection rules across cloud infrastructure.", source: "MANUAL", status: "LIVE", skills: ["Python", "AWS", "Algorithms"] },
  { id: "jd_dmm_2_5", jobTitleId: "jt_dmm", band: "Y2_5", content: "Plan and execute multi-channel campaigns, own the paid media budget, and report on funnel performance.", source: "MANUAL", status: "LIVE", skills: ["Social Media Marketing", "Analytics"] },
  { id: "jd_dmm_5_8", jobTitleId: "jt_dmm", band: "Y5_8", content: "Lead the digital marketing strategy, build the team's analytics practice, and own acquisition targets.", source: "CSV", status: "LIVE", skills: ["Social Media Marketing", "Analytics", "Leadership"] },
  { id: "jd_seo_0_2", jobTitleId: "jt_seo", band: "Y0_2", content: "Run keyword research, on-page audits, and support content updates under the SEO roadmap.", source: "MANUAL", status: "LIVE", skills: ["SEO", "Content Writing"] },
  { id: "jd_seo_2_5", jobTitleId: "jt_seo", band: "Y2_5", content: "Own technical SEO fixes, link acquisition, and performance reporting for organic growth.", source: "MANUAL", status: "LIVE", skills: ["SEO", "Analytics", "Content Writing"] },
  { id: "jd_content_0_2", jobTitleId: "jt_content", band: "Y0_2", content: "Draft blog posts and product copy following the editorial guide; incorporate editor feedback.", source: "MANUAL", status: "LIVE", skills: ["Content Writing", "Communication"] },
  { id: "jd_content_2_5", jobTitleId: "jt_content", band: "Y2_5", content: "Own content pillars end-to-end, interview subject-matter experts, and optimize for search intent.", source: "MANUAL", status: "DRAFT", skills: ["Content Writing", "SEO", "Communication"] },
  { id: "jd_hr_2_5", jobTitleId: "jt_hr", band: "Y2_5", content: "Run end-to-end recruitment cycles, onboard new hires, and maintain employee relations practices.", source: "MANUAL", status: "LIVE", skills: ["Leadership", "Communication"] },
  { id: "jd_hr_5_8", jobTitleId: "jt_hr", band: "Y5_8", content: "Own workforce planning, compensation benchmarking, and culture programs across the organization.", source: "MANUAL", status: "LIVE", skills: ["Leadership", "Communication"] },
  { id: "jd_ceo_5_8", jobTitleId: "jt_ceo", band: "Y5_8", content: "Set company strategy, own fundraising and board relationships, and lead the executive team.", source: "MANUAL", status: "LIVE", skills: ["Leadership", "Communication"] },
  { id: "jd_accountant_0_2", jobTitleId: "jt_accountant", band: "Y0_2", content: "Post journal entries, reconcile accounts, and support month-end close activities.", source: "MANUAL", status: "DRAFT", skills: ["Analytics"] },
  { id: "jd_accountant_2_5", jobTitleId: "jt_accountant", band: "Y2_5", content: "Prepare statutory statements, manage audits, and ensure tax compliance across entities.", source: "MANUAL", status: "DRAFT", skills: ["Analytics"] },
  { id: "jd_fullstack_5_8", jobTitleId: "jt_fullstack", band: "Y5_8", content: "Lead full stack development projects, architect solutions, mentor junior developers, and ensure best practices.", source: "MANUAL", status: "LIVE", skills: ["JavaScript", "React", "Node.js", "REST API"] },
];

// -------------------------------------------------------------- questions

export type McqSeed = {
  id: string;
  text: string;
  difficulty: Difficulty;
  flow: AssessmentFlow;
  status?: PublishStatus;
  options: { text: string; correct?: boolean }[];
  skills?: string[];
  areaId?: string;
  jobTitleId?: string;
};

export const mcqs: McqSeed[] = [
  // General (TOPIC_TRACK) - linked by area only
  { id: "q_apt_1", text: "A train covers 120 km in 2 hours. What is its average speed?", difficulty: "EASY", flow: "GENERAL", areaId: "area_aptitude", options: [{ text: "40 km/h" }, { text: "50 km/h" }, { text: "60 km/h", correct: true }, { text: "80 km/h" }] },
  { id: "q_apt_2", text: "Complete the series: 2, 6, 12, 20, 30, ?", difficulty: "MEDIUM", flow: "GENERAL", areaId: "area_aptitude", options: [{ text: "40" }, { text: "42", correct: true }, { text: "44" }, { text: "46" }] },
  { id: "q_log_1", text: "Statements: All engineers are logical. Some logical people are programmers. Does it follow that some engineers are programmers?", difficulty: "MEDIUM", flow: "GENERAL", areaId: "area_logical", options: [{ text: "Yes" }, { text: "No" }, { text: "Cannot be determined", correct: true }, { text: "Only if all programmers are logical" }] },
  { id: "q_log_2", text: "If it rains, the match is cancelled. The match was not cancelled. What follows?", difficulty: "MEDIUM", flow: "GENERAL", areaId: "area_logical", options: [{ text: "It rained" }, { text: "It did not rain", correct: true }, { text: "The match was played outdoors" }, { text: "Nothing follows" }] },
  { id: "q_num_1", text: "A shirt is bought for 400 and sold for 500. What is the profit percentage?", difficulty: "EASY", flow: "GENERAL", areaId: "area_numerical", options: [{ text: "20%", correct: true }, { text: "25%" }, { text: "10%" }, { text: "15%" }] },
  { id: "q_num_2", text: "The ratio of boys to girls is 3:5. If there are 24 boys, how many girls are there?", difficulty: "MEDIUM", flow: "GENERAL", areaId: "area_numerical", options: [{ text: "30" }, { text: "35" }, { text: "40", correct: true }, { text: "45" }] },
  { id: "q_com_1", text: "Which channel is most appropriate for announcing a new company-wide policy?", difficulty: "EASY", flow: "GENERAL", areaId: "area_communication", options: [{ text: "A casual chat message" }, { text: "An official written announcement", correct: true }, { text: "Word of mouth" }, { text: "A comment on someone's document" }] },
  { id: "q_com_2", text: "In an email raising a disagreement, the best practice is to:", difficulty: "MEDIUM", flow: "GENERAL", areaId: "area_communication", options: [{ text: "Copy everyone senior to force resolution" }, { text: "Describe the issue and propose options", correct: true }, { text: "Use strong language to show urgency" }, { text: "Avoid stating your position" }] },
  { id: "q_crit_1", text: "An argument states: 'Our sales rose after the rebrand, so the rebrand caused the rise.' The hidden assumption is:", difficulty: "HARD", flow: "GENERAL", areaId: "area_critical", options: [{ text: "No other factor explains the rise", correct: true }, { text: "Rebrands always raise sales" }, { text: "Sales were measured weekly" }, { text: "Customers noticed the rebrand" }] },
  { id: "q_crit_2", text: "Which question best tests the claim 'this course improves hiring outcomes'?", difficulty: "MEDIUM", flow: "GENERAL", areaId: "area_critical", options: [{ text: "How long is the course?" }, { text: "Compared to non-takers, do graduates get hired more often?", correct: true }, { text: "Who teaches the course?" }, { text: "Is the course popular?" }] },
  { id: "q_det_1", text: "Which line contains a spelling error?", difficulty: "EASY", flow: "GENERAL", areaId: "area_detail", options: [{ text: "Quarterly revenue exceeded forecasts" }, { text: "The reciept was filed yesterday", correct: true }, { text: "Payments are processed weekly" }, { text: "Invoices were reconciled" }] },
  { id: "q_det_2", text: "Which entry breaks the pattern: AB-1024, AB-1025, AB-1O26, AB-1027?", difficulty: "MEDIUM", flow: "GENERAL", areaId: "area_detail", status: "DRAFT", options: [{ text: "AB-1024" }, { text: "AB-1025" }, { text: "AB-1O26", correct: true }, { text: "AB-1027" }] },
  // Job-track MCQs
  { id: "q_be_1", text: "In Node.js, why does a long-running synchronous loop degrade server throughput?", difficulty: "MEDIUM", flow: "CODING", jobTitleId: "jt_backend", skills: ["JavaScript", "Node.js"], options: [{ text: "It blocks the single-threaded event loop", correct: true }, { text: "It spawns too many threads" }, { text: "It disables garbage collection" }, { text: "It closes open sockets" }] },
  { id: "q_be_2", text: "Which JOIN returns all rows from the left table even without a match on the right?", difficulty: "MEDIUM", flow: "CODING", jobTitleId: "jt_backend", skills: ["SQL"], options: [{ text: "INNER JOIN" }, { text: "LEFT JOIN", correct: true }, { text: "RIGHT JOIN" }, { text: "CROSS JOIN" }] },
  { id: "q_fe_1", text: "What is the purpose of useEffect in React?", difficulty: "EASY", flow: "CODING", jobTitleId: "jt_frontend", skills: ["React"], options: [{ text: "To run side effects after render", correct: true }, { text: "To memoize expensive values" }, { text: "To define component props" }, { text: "To split bundles" }] },
  { id: "q_fe_2", text: "Which selector has the highest CSS specificity?", difficulty: "MEDIUM", flow: "CODING", jobTitleId: "jt_frontend", skills: ["CSS"], options: [{ text: ".card" }, { text: "#card" }, { text: "div.card" }, { text: "div#card", correct: true }] },
  { id: "q_fs_1", text: "Which HTTP status code indicates a resource was created successfully?", difficulty: "MEDIUM", flow: "CODING", jobTitleId: "jt_fullstack", skills: ["REST API"], options: [{ text: "200" }, { text: "201", correct: true }, { text: "204" }, { text: "301" }] },
  { id: "q_fs_2", text: "Why add a compound index on (userId, createdAt) for a per-user history feed?", difficulty: "HARD", flow: "CODING", jobTitleId: "jt_fullstack", skills: ["MongoDB", "SQL"], options: [{ text: "It matches the filter+sort shape of the query", correct: true }, { text: "It reduces document size" }, { text: "It disables table scans globally" }, { text: "It encrypts the fields" }] },
  { id: "q_da_1", text: "A table stores order_id, customer_id, customer_name together. Which normal form is violated first?", difficulty: "MEDIUM", flow: "BASIC_MCQ", jobTitleId: "jt_data_analyst", skills: ["SQL", "Analytics"], options: [{ text: "1NF" }, { text: "2NF", correct: true }, { text: "3NF" }, { text: "BCNF" }] },
  { id: "q_da_2", text: "Which metric best measures retention for a subscription product?", difficulty: "MEDIUM", flow: "BASIC_MCQ", jobTitleId: "jt_data_analyst", skills: ["Analytics"], options: [{ text: "Daily signups" }, { text: "Cohort renewal rate", correct: true }, { text: "Total registrations" }, { text: "Bounce rate" }] },
  { id: "q_ds_1", text: "A model with very low training error and very high validation error is:", difficulty: "MEDIUM", flow: "BASIC_SKILLS_MCQ", jobTitleId: "jt_data_scientist", skills: ["Python", "Analytics"], options: [{ text: "Underfitting" }, { text: "Overfitting", correct: true }, { text: "Well calibrated" }, { text: "Regularized" }] },
  { id: "q_ds_2", text: "Increasing model complexity generally affects bias and variance how?", difficulty: "HARD", flow: "BASIC_SKILLS_MCQ", jobTitleId: "jt_data_scientist", skills: ["Algorithms", "Python"], options: [{ text: "Bias up, variance up" }, { text: "Bias down, variance up", correct: true }, { text: "Bias up, variance down" }, { text: "Both down" }] },
  { id: "q_sec_1", text: "What is the difference between authentication and authorization?", difficulty: "MEDIUM", flow: "CODING", jobTitleId: "jt_security", skills: ["Python"], options: [{ text: "Authentication verifies identity; authorization checks permissions", correct: true }, { text: "They are synonyms" }, { text: "Authorization verifies identity; authentication checks permissions" }, { text: "Authentication applies only to APIs" }] },
  { id: "q_sec_2", text: "Which control best prevents SQL injection?", difficulty: "MEDIUM", flow: "CODING", jobTitleId: "jt_security", skills: ["SQL", "Python"], options: [{ text: "Parameterized queries", correct: true }, { text: "Input length limits" }, { text: "HTML escaping" }, { text: "HTTPS" }] },
  { id: "q_dmm_1", text: "Which of the following is NOT a key performance indicator (KPI) for marketing?", difficulty: "MEDIUM", flow: "BASIC_MCQ", jobTitleId: "jt_dmm", skills: ["Social Media Marketing", "Analytics"], options: [{ text: "Customer acquisition cost" }, { text: "Conversion rate" }, { text: "Office occupancy rate", correct: true }, { text: "Click-through rate" }] },
  { id: "q_dmm_2", text: "Which channel metric indicates content resonance rather than reach?", difficulty: "MEDIUM", flow: "BASIC_MCQ", jobTitleId: "jt_dmm", skills: ["Social Media Marketing"], options: [{ text: "Impressions" }, { text: "Shares per post", correct: true }, { text: "Ad spend" }, { text: "Follower count" }] },
  { id: "q_seo_1", text: "What is the difference between on-page and off-page SEO?", difficulty: "MEDIUM", flow: "BASIC_SKILLS_MCQ", jobTitleId: "jt_seo", skills: ["SEO"], options: [{ text: "On-page covers content/structure; off-page covers external signals like links", correct: true }, { text: "On-page is paid; off-page is organic" }, { text: "On-page applies to images only" }, { text: "There is no difference" }] },
  { id: "q_seo_2", text: "A canonical tag is primarily used to:", difficulty: "HARD", flow: "BASIC_SKILLS_MCQ", jobTitleId: "jt_seo", skills: ["SEO"], options: [{ text: "Signal the preferred URL among duplicates", correct: true }, { text: "Redirect users server-side" }, { text: "Block crawlers" }, { text: "Compress images" }] },
  { id: "q_cw_1", text: "When rewriting technical content for a general audience, the best first step is:", difficulty: "EASY", flow: "BASIC_SKILLS_MCQ", jobTitleId: "jt_content", skills: ["Content Writing", "Communication"], options: [{ text: "Replace jargon with plain equivalents", correct: true }, { text: "Add more acronyms" }, { text: "Lengthen sentences" }, { text: "Remove all examples" }] },
  { id: "q_cw_2", text: "Which headline is strongest for a how-to article?", difficulty: "MEDIUM", flow: "BASIC_SKILLS_MCQ", jobTitleId: "jt_content", status: "DRAFT", skills: ["Content Writing"], options: [{ text: "Some Thoughts on Writing" }, { text: "How to Write Release Notes Engineers Actually Read", correct: true }, { text: "Writing Stuff" }, { text: "Notes, Misc" }] },
  { id: "q_hr_1", text: "Which practice most reduces unconscious bias in screening?", difficulty: "MEDIUM", flow: "BASIC_MCQ", jobTitleId: "jt_hr", skills: ["Leadership", "Communication"], options: [{ text: "Structured scorecards against job criteria", correct: true }, { text: "Gut-feel shortlisting" }, { text: "School-name filtering" }, { text: "Referrals only" }] },
  { id: "q_hr_2", text: "A 360-degree review primarily gathers feedback from:", difficulty: "EASY", flow: "BASIC_MCQ", jobTitleId: "jt_hr", skills: ["Communication"], options: [{ text: "Peers, reports and managers", correct: true }, { text: "Only the direct manager" }, { text: "Only customers" }, { text: "External auditors" }] },
  { id: "q_ceo_1", text: "Which value best reflects strong leadership under pressure?", difficulty: "MEDIUM", flow: "BASIC_MCQ", jobTitleId: "jt_ceo", skills: ["Leadership"], options: [{ text: "Transparent communication with a clear plan", correct: true }, { text: "Withholding information until resolved" }, { text: "Blaming the closest team" }, { text: "Avoiding decisions" }] },
  { id: "q_ceo_2", text: "With cash runway at 6 months, the first priority should be:", difficulty: "HARD", flow: "BASIC_MCQ", jobTitleId: "jt_ceo", skills: ["Leadership", "Communication"], options: [{ text: "Scenario planning on burn and revenue levers", correct: true }, { text: "Expanding headcount" }, { text: "Redesigning the logo" }, { text: "Ignoring the forecast" }] },
  { id: "q_acc_1", text: "Under accrual accounting, revenue is recognized when:", difficulty: "MEDIUM", flow: "BASIC_MCQ", jobTitleId: "jt_accountant", skills: ["Analytics"], options: [{ text: "It is earned, regardless of cash receipt", correct: true }, { text: "Cash is received" }, { text: "The invoice is printed" }, { text: "The year ends" }] },
  { id: "q_acc_2", text: "The accounting equation is Assets =", difficulty: "EASY", flow: "BASIC_MCQ", jobTitleId: "jt_accountant", status: "DRAFT", skills: ["Analytics"], options: [{ text: "Liabilities + Equity", correct: true }, { text: "Liabilities - Equity" }, { text: "Equity - Liabilities" }, { text: "Revenue - Expenses" }] },
  // extra skill-breadth questions for selection-engine coverage
  { id: "q_react_1", text: "Which hook returns a memoized value in React?", difficulty: "EASY", flow: "BASIC_SKILLS_MCQ", jobTitleId: "jt_frontend", skills: ["React", "JavaScript"], options: [{ text: "useMemo", correct: true }, { text: "useEffect" }, { text: "useRef" }, { text: "useState" }] },
  { id: "q_docker_1", text: "What does a Dockerfile layer cache speed up?", difficulty: "MEDIUM", flow: "CODING", jobTitleId: "jt_backend", skills: ["Docker"], options: [{ text: "Rebuilds when earlier layers are unchanged", correct: true }, { text: "Network latency" }, { text: "Container runtime memory" }, { text: "Image signing" }] },
  { id: "q_git_1", text: "Which command re-applies a commit from another branch as a new commit?", difficulty: "MEDIUM", flow: "CODING", jobTitleId: "jt_fullstack", skills: ["Git"], options: [{ text: "git cherry-pick", correct: true }, { text: "git rebase --abort" }, { text: "git reset --hard" }, { text: "git stash" }] },
  // --- Phase 3 content expansion (pure data modules under prisma/data) ---
  ...generalMcqsPart1,
  ...generalMcqsPart2,
  ...generalMcqsPart3,
  ...roleMcqsPart1,
  ...roleMcqsPart2,
  ...skillMcqsPart1,
  ...skillMcqsPart2,
  ...skillMcqsPart3,
];

export type CodingSeed = {
  id: string;
  title: string;
  problem: string;
  difficulty: Difficulty;
  language: string;
  starter: string;
  status?: PublishStatus;
  skills: string[];
  jobTitleIds?: string[];
  tests: { input: string; expected: string; visibility: TestCaseVisibility }[];
};

export const codings: CodingSeed[] = [
  {
    id: "cq_two_sum", title: "Two Sum", difficulty: "EASY", language: "javascript",
    problem: "Read a JSON array of integers on line 1 and an integer target on line 2. Print a JSON array of the two indices whose values sum to the target, ascending. Exactly one solution exists.",
    starter: "const lines = require('fs').readFileSync(0, 'utf8').trim().split('\\n');\n// lines[0] = JSON array, lines[1] = target\n",
    skills: ["JavaScript", "Algorithms"], jobTitleIds: ["jt_backend", "jt_fullstack"],
    tests: [
      { input: "[2,7,11,15]\n9", expected: "[0,1]", visibility: "PUBLIC" },
      { input: "[3,2,4]\n6", expected: "[1,2]", visibility: "PUBLIC" },
      { input: "[1,5,3,8]\n13", expected: "[1,3]", visibility: "HIDDEN" },
      { input: "[-1,0,1]\n0", expected: "[0,2]", visibility: "HIDDEN" },
    ],
  },
  {
    id: "cq_palindrome", title: "Palindrome Check", difficulty: "EASY", language: "python",
    problem: "Read one line of text. Print 'true' if it is a palindrome ignoring case and non-alphanumeric characters, otherwise 'false'.",
    starter: "import sys\ntext = sys.stdin.read().strip()\n",
    skills: ["Python", "Algorithms"], jobTitleIds: ["jt_backend"],
    tests: [
      { input: "Race car", expected: "true", visibility: "PUBLIC" },
      { input: "hello", expected: "false", visibility: "PUBLIC" },
      { input: "A man, a plan, a canal: Panama", expected: "true", visibility: "HIDDEN" },
      { input: "", expected: "true", visibility: "HIDDEN" },
    ],
  },
  {
    id: "cq_word_freq", title: "Word Frequency Counter", difficulty: "MEDIUM", language: "javascript",
    problem: "Read all stdin text. Print the most frequent word (case-insensitive, words are [a-z]+ sequences). On ties print the lexicographically smallest.",
    starter: "const text = require('fs').readFileSync(0, 'utf8');\n",
    skills: ["JavaScript"], jobTitleIds: ["jt_frontend"],
    tests: [
      { input: "the cat and the dog", expected: "the", visibility: "PUBLIC" },
      { input: "Apple apple banana", expected: "apple", visibility: "HIDDEN" },
      { input: "b b a a c", expected: "a", visibility: "HIDDEN" },
    ],
  },
  {
    id: "cq_brackets", title: "Balanced Brackets", difficulty: "MEDIUM", language: "python",
    problem: "Read one line containing only ()[]{} characters. Print 'true' if the brackets are balanced and properly nested, otherwise 'false'.",
    starter: "import sys\nline = sys.stdin.read().strip()\n",
    skills: ["Python", "Data Structures"], jobTitleIds: ["jt_backend", "jt_security"],
    tests: [
      { input: "([])", expected: "true", visibility: "PUBLIC" },
      { input: "([)]", expected: "false", visibility: "PUBLIC" },
      { input: "{{[()]}}", expected: "true", visibility: "HIDDEN" },
      { input: "(((", expected: "false", visibility: "HIDDEN" },
    ],
  },
  {
    id: "cq_debounce", title: "Implement Debounce (simulated clock)", difficulty: "HARD", language: "javascript",
    problem: "Implement debounce(fn, wait) using the provided fake timer API: schedule(fn, ms) and now(). Read lines of 't action' events (t = ms timestamp, action = call|flush) and print the values fn received, one per line, in execution order.",
    starter: "// fake timer API provided by the runner:\n// schedule(fn, ms), now()\nconst events = require('fs').readFileSync(0, 'utf8').trim().split('\\n');\n",
    status: "DRAFT", skills: ["JavaScript", "Node.js"], jobTitleIds: ["jt_frontend", "jt_fullstack"],
    tests: [
      { input: "0 call\n10 call\n150 flush", expected: "2", visibility: "PUBLIC" },
      { input: "0 call\n200 flush", expected: "1", visibility: "HIDDEN" },
    ],
  },
  {
    id: "cq_matrix", title: "Rotate Matrix", difficulty: "HARD", language: "python",
    problem: "Read an integer n, then n lines of n space-separated integers. Print the matrix rotated 90 degrees clockwise as n lines of space-separated integers.",
    starter: "import sys\ndata = sys.stdin.read().strip().split('\\n')\n",
    skills: ["Python", "Algorithms", "Data Structures"], jobTitleIds: ["jt_security"],
    tests: [
      { input: "2\n1 2\n3 4", expected: "3 1\n4 2", visibility: "PUBLIC" },
      { input: "3\n1 2 3\n4 5 6\n7 8 9", expected: "7 4 1\n8 5 2\n9 6 3", visibility: "HIDDEN" },
    ],
  },
  // --- Phase 3 content expansion (DSA library, >=1 PUBLIC + >=1 HIDDEN each) ---
  ...codingsExpanded,
];
