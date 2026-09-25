/**
 * Canonical GENERAL content, part 3 of 3 — Critical Thinking +
 * Attention to Detail. Pure data, same conventions as general-mcq.ts.
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

// ------------------------------------------------ Critical (34)

const critical: McqSeed[] = [
  // EASY (12)
  g("area_critical", "q_crit_e01", D.E, "'Every time I wear red I win, so red causes wins.' The main flaw is:", ["Overgeneralising from anecdotes and treating correlation as causation", "The sample is too large", "Red is not a colour", "Wearing red is illegal"], 0),
  g("area_critical", "q_crit_e02", D.E, "'All dogs bark. Rex is a dog. Therefore Rex barks.' This argument is:", ["Valid", "Invalid", "Unsound because Rex is named", "Irrelevant"], 0),
  g("area_critical", "q_crit_e03", D.E, "'9 out of 10 dentists prefer brand X.' The weakest part is:", ["The number 10", "The dentists surveyed may not represent all dentists", "Brand X exists", "Dentists have opinions"], 1),
  g("area_critical", "q_crit_e04", D.E, "'You will fail because you are lazy.' This reasoning:", ["Attacks the person instead of the argument", "Cites strong evidence", "Uses a statistical sample", "Is a valid deduction"], 0),
  g("area_critical", "q_crit_e05", D.E, "'Either the train is delayed or the station is crowded. The train is not delayed.' What follows?", ["The station is crowded", "The train is on time and the station is quiet", "The station is closed", "Nothing follows"], 0),
  g("area_critical", "q_crit_e06", D.E, "'My uncle smoked his whole life and lived to 90, so smoking is fine.' The flaw is:", ["Treating one survivor's story as evidence about the whole population", "The uncle did not smoke", "90 is too old to count", "The uncle is not named"], 0),
  g("area_critical", "q_crit_e07", D.E, "'If you are a manager, you lead people. Anna leads people. So Anna is a manager.' The flaw is:", ["Affirming the consequent", "Hasty generalisation", "Denying the antecedent", "Circular reasoning"], 0),
  g("area_critical", "q_crit_e08", D.E, "'Sales rose 5% in each of the last six months, so next month will surely rise 5%.' The assumption is:", ["The recent trend will continue unchanged", "No new competitors will appear, necessarily", "Next month has 30 days", "Sales will fall instead"], 0),
  g("area_critical", "q_crit_e09", D.E, "'This phone is the best because it is the most expensive.' This is an appeal to:", ["Price as a proxy for quality", "Expert opinion", "Scientific evidence", "Personal experience"], 0),
  g("area_critical", "q_crit_e10", D.E, "'All interns are students. Priya is a student. Priya is an intern.' The flaw is:", ["Assuming the middle term covers everyone (undistributed middle)", "Priya is not an intern", "Interns are not students", "The conclusion is false"], 0),
  g("area_critical", "q_crit_e11", D.E, "'The team missed the deadline because the lead was absent.' This reasoning is weak because it:", ["Ignores other contributing factors and assumes a single cause", "Blames the team", "Uses too many words", "Is too polite"], 0),
  g("area_critical", "q_crit_e12", D.E, "3 of 5 sampled stores had low stock. The stronger, defensible conclusion is:", ["Every store in the chain has low stock", "Low stock may be a wider issue worth checking", "No store has low stock", "Stock levels never change"], 1),
  // MEDIUM (11)
  g("area_critical", "q_crit_m01", D.M, "Claim: 'Users who took the tutorial churned less.' The strongest way to strengthen it is to show:", ["The tutorial group was matched on tenure and plan with non-takers", "The tutorial was one page long", "Non-takers were surveyed on a different day", "The claim was repeated in a newsletter"], 0),
  g("area_critical", "q_crit_m02", D.M, "Claim: 'City X has the most electric cars and the cleanest air.' The best weakener is:", ["City X also enforces the strictest industrial emission limits", "City X likes cars", "The air was measured once", "Other cities are large too"], 0),
  g("area_critical", "q_crit_m03", D.M, "'The new process policy will cut our costs.' The hidden assumption is:", ["The savings will not be offset by costs elsewhere", "The policy is popular", "Everyone reads policies", "Costs are fixed forever"], 0),
  g("area_critical", "q_crit_m04", D.M, "'80% of readers support the policy,' based on a self-selected survey in a pro-policy newsletter. The main problem is:", ["Selection bias in who responds", "The number 80%", "Readers do not vote", "Newsletters are expensive"], 0),
  g("area_critical", "q_crit_m05", D.M, "An A/B test shows 2% conversion for B versus 1% for A, with 30 users per arm. The responsible conclusion is:", ["B is clearly better", "The sample is too small to be confident", "A is clearly worse", "The test must be rerun with 30 users"], 1),
  g("area_critical", "q_crit_m06", D.M, "The strongest way to test a causal claim is to:", ["Compare anecdotes", "Hold other factors constant, ideally via random assignment", "Wait for more time to pass", "Ask a single expert"], 1),
  g("area_critical", "q_crit_m07", D.M, "'After we cut prices, sales rose.' A key alternative explanation is:", ["A seasonal demand spike happened at the same time", "Customers dislike prices", "Sales cannot rise", "The price cut was large"], 0),
  g("area_critical", "q_crit_m08", D.M, "'Company A cut working hours and productivity rose, so we should cut hours too.' This assumes:", ["Our team and work mix are comparable to Company A's", "Productivity always rises", "Hours are the only variable", "Company A lied"], 0),
  g("area_critical", "q_crit_m09", D.M, "From 'No reptiles are mammals. Some reptiles are lizards,' it follows that:", ["Some lizards are not mammals", "All lizards are mammals", "No lizards are reptiles", "Some mammals are reptiles"], 0),
  g("area_critical", "q_crit_m10", D.M, "'The more ads we ran, the more we sold.' The caution warranted is:", ["Ads may have followed demand rather than driven it", "Ads are always ineffective", "Selling is impossible", "The correlation is perfectly causal"], 0),
  g("area_critical", "q_crit_m11", D.M, "The statement that most weakens 'remote work raises productivity' is:", ["Many roles lose coordination and take longer remotely", "Some people prefer remote work", "Laptops are heavy", "Offices are expensive"], 0),
  // HARD (11)
  g("area_critical", "q_crit_h01", D.H, "A study finds daily fish eaters live longer. The best design fix before claiming causation is:", ["Track and adjust for overall diet, exercise and income", "Restrict the sample to one city", "Interview the participants twice", "Increase the sample of non-eaters only"], 0),
  g("area_critical", "q_crit_h02", D.H, "'Churn dropped after our pricing change, so the change caused it.' The strongest counter is:", ["Churn had already been trending down for three quarters", "The pricing page looks nicer", "Customers were polled once", "The change was small"], 0),
  g("area_critical", "q_crit_h03", D.H, "'We cannot fund project X because the budget is fixed.' The hidden assumption is:", ["Nothing else in scope can be deprioritised", "X is the only project", "Budgets never change", "Funding is always available"], 0),
  g("area_critical", "q_crit_h04", D.H, "Revenue is up while NPS is down. The best reading is:", ["Short-term gain may be eroding loyalty; investigate the trade-off", "NPS is irrelevant", "Revenue must be wrong", "Customers are unhappy but fine"], 0),
  g("area_critical", "q_crit_h05", D.H, "'Our ranking model is fair because it ignores gender.' The main flaw is:", ["Proxy variables can encode gender even when gender is excluded", "Models cannot be fair", "Gender is the only factor", "Rankings are always biased"], 0),
  g("area_critical", "q_crit_h06", D.H, "1% of applicants are fraudsters. A test flags fraud with 95% sensitivity and 95% specificity. A random applicant tests positive. The probability they are a fraudster is closest to:", ["95%", "50%", "16%", "1%"], 2),
  g("area_critical", "q_crit_h07", D.H, "'We have invested two years, so we must finish the product.' The flaw is:", ["Sunk cost should not drive a go/no-go; only future costs and benefits should", "Two years is too short", "Products always fail", "Investment is invisible"], 0),
  g("area_critical", "q_crit_h08", D.H, "'Team A ships twice as fast, so hire more engineers like A.' The main confound to check is:", ["Team A had a simpler backlog and better tooling", "Team A has more engineers", "Shipping is always slow", "Engineers dislike teams"], 0),
  g("area_critical", "q_crit_h09", D.H, "A regression shows 'more support staff, lower ticket time.' The confounder to rule out is:", ["Ticket complexity also changed over the period", "Staff wear uniforms", "Tickets are printed", "Time zones exist"], 0),
  g("area_critical", "q_crit_h10", D.H, "The strongest support for 'the training program improved sales' is:", ["A matched control group without training grew noticeably less", "Trainees felt happier", "The program was long", "Sales rose that year everywhere"], 0),
  g("area_critical", "q_crit_h11", D.H, "Two cities ran a pilot: City A saw crime fall 8%, City B 4%. The biggest threat to the conclusion is:", ["The two cities had different crime trends before the pilot", "Crime is measured monthly", "The pilot lasted six months", "City A is larger"], 0),
];

// ---------------------------------------------------- Detail (35)

const detail: McqSeed[] = [
  // EASY (11)
  g("area_detail", "q_det_e01", D.E, "Which number does not belong: 4, 8, 12, 17, 20?", ["4", "8", "17", "20"], 2),
  g("area_detail", "q_det_e02", D.E, "Which word is misspelled?", ["Calendar", "Calender", "Calendar (both correct)", "Neither"], 1),
  g("area_detail", "q_det_e03", D.E, "Which pair is not equal?", ["0.5 = 1/2", "0.5 = 50%", "0.5 = 1/5", "50% = 0.50"], 2),
  g("area_detail", "q_det_e04", D.E, "Which is the largest number?", ["0.39", "0.4", "0.399", "0.390"], 1),
  g("area_detail", "q_det_e05", D.E, "Which number does not belong: 2, 3, 5, 9?", ["2", "3", "5", "9"], 3),
  g("area_detail", "q_det_e06", D.E, "Which time is earlier?", ["14:05", "13:55", "They are equal", "Cannot tell"], 1),
  g("area_detail", "q_det_e07", D.E, "Which list contains a duplicate value?", ["1, 2, 3, 4", "1, 2, 2, 3", "5, 6, 7, 8", "9, 10, 11, 12"], 1),
  g("area_detail", "q_det_e08", D.E, "Which number completes the sequence: 5, 10, 15, __, 25?", ["17", "18", "20", "22"], 2),
  g("area_detail", "q_det_e09", D.E, "Which value breaks the pattern: 3.5, 4.0, 4.5, 5.2, 5.5?", ["3.5", "4.5", "5.2", "5.5"], 2),
  g("area_detail", "q_det_e10", D.E, "Which number is exactly 2 more than 47?", ["48", "49", "50", "52"], 1),
  g("area_detail", "q_det_e11", D.E, "Which invoice line has the wrong total? (3 x 250 = 850; 4 x 120 = 480; 2 x 310 = 620)", ["3 x 250 = 850", "4 x 120 = 480", "2 x 310 = 620", "All are correct"], 0),
  // MEDIUM (12)
  g("area_detail", "q_det_m01", D.M, "Two reports state the same total as 12,480 and 12,408. The difference is most likely:", ["A real 72-unit gap", "A transposed digit (48 vs 40)", "A currency difference", "Rounding"], 1),
  g("area_detail", "q_det_m02", D.M, "A summary says 'Q3 revenue 4.2M, Q4 revenue 4.8M, total 9.6M.' What is wrong?", ["Nothing", "The total should be 9.0M", "Q4 should be 5.4M", "The units are wrong"], 1),
  g("area_detail", "q_det_m03", D.M, "Rule: column 3 = column 1 + column 2. Rows: (12, 8, 20), (15, 7, 22), (10, 9, 18). Which row breaks the rule?", ["(12, 8, 20)", "(15, 7, 22)", "(10, 9, 18)", "None"], 2),
  g("area_detail", "q_det_m04", D.M, "Which date does not belong: Monday 12th, Monday 19th, Monday 25th, Monday 26th?", ["12th", "19th", "25th", "26th"], 3),
  g("area_detail", "q_det_m05", D.M, "Which number breaks the pattern: 100, 102, 105, 110, 116?", ["100", "102", "110", "116"], 2),
  g("area_detail", "q_det_m06", D.M, "Which entry is different? (1: INV-2024-0115, 2: INV-2024-0115, 3: INV-2024-O115, 4: INV-2024-0115)", ["Entry 1", "Entry 2", "Entry 3 (letter O for zero)", "Entry 4"], 2),
  g("area_detail", "q_det_m07", D.M, "Items total 150 + 230 + 120, but the summary says 510. The error is:", ["Off by 5", "Off by 10", "Off by 20", "No error"], 1),
  g("area_detail", "q_det_m08", D.M, "Which number breaks the sequence: 7, 14, 21, 28, 34?", ["7", "28", "34", "None"], 2),
  g("area_detail", "q_det_m09", D.M, "Which word contains no repeated letter?", ["meeting", "office", "report", "garden"], 3),
  g("area_detail", "q_det_m10", D.M, "A timesheet shows 37.5 hours for an employee, but the monthly summary shows 38.0. Which document to trust first?", ["The summary, always", "The timesheet, since it is the primary record", "Whichever is larger", "Neither; discard both"], 1),
  g("area_detail", "q_det_m11", D.M, "Which percentage is miscalculated? (18/60 = 30%; 15/60 = 25%; 17/60 = 28.3%; 16/60 = 27%)", ["18/60", "15/60", "17/60", "16/60"], 3),
  g("area_detail", "q_det_m12", D.M, "Rule: end = start + duration. Which row is inconsistent? (09:15 + 2:30 = 11:44; 13:30 + 1:45 = 15:15; 08:45 + 3:00 = 11:45)", ["09:15 + 2:30 = 11:44", "13:30 + 1:45 = 15:15", "08:45 + 3:00 = 11:45", "None"], 0),
  // HARD (12)
  g("area_detail", "q_det_h01", D.H, "Employee IDs issued this week: EMP-0042, EMP-0043, EMP-0044, EMP-0046, EMP-0047. Which number was skipped?", ["EMP-0045", "EMP-0044", "EMP-0046", "None skipped"], 0),
  g("area_detail", "q_det_h02", D.H, "Three ledger entries should total 10,000: 3,450 + 4,125 + 2,430. The actual sum is:", ["10,000", "10,005", "9,995", "10,010"], 1),
  g("area_detail", "q_det_h03", D.H, "Which date is invalid?", ["2026-02-28", "2026-02-29", "2026-04-30", "2026-06-30"], 1),
  g("area_detail", "q_det_h04", D.H, "Which statement is FALSE? ('12% of 8% of 500 = 4.8'; '20% of 500 = 100'; '600 is 40% of 240'; '8% of 500 = 40')", ["12% of 8% of 500 = 4.8", "20% of 500 = 100", "600 is 40% of 240", "8% of 500 = 40"], 2),
  g("area_detail", "q_det_h05", D.H, "Which number is not divisible by 3?", ["123", "135", "141", "145"], 3),
  g("area_detail", "q_det_h06", D.H, "A contract lists the sum as '1.25M', '1,250,000' and '1,25,000'. Which is the outlier?", ["1.25M", "1,250,000", "1,25,000", "All match"], 2),
  g("area_detail", "q_det_h07", D.H, "In the sequence 2, 6, 18, 54, 160, 480, which entry breaks the pattern?", ["2", "54", "160", "480"], 2),
  g("area_detail", "q_det_h08", D.H, "A sorted batch should contain 3487, 3492, 3501, 3508. It actually contains 3487, 3847, 3492, 3508. The faulty entry is:", ["3487", "3847", "3492", "3508"], 1),
  g("area_detail", "q_det_h09", D.H, "12% of 8% of 500 equals:", ["4.8", "20", "9.6", "48"], 0),
  g("area_detail", "q_det_h10", D.H, "A shift runs 09:00-17:00 with a 1-hour lunch, i.e. 8 worked hours. A log shows 9 worked hours. The log is:", ["Consistent", "Inconsistent by 1 hour", "Inconsistent by 2 hours", "Impossible to check"], 1),
  g("area_detail", "q_det_h11", D.H, "Phone numbers on a list: 415-5550, 415-5551, 415-5552, 415-5554, 415-5555. Which number is missing from the run?", ["415-5553", "415-5552", "415-5555", "None missing"], 0),
  g("area_detail", "q_det_h12", D.H, "Orders table lists order numbers 1001-1085 (85 orders); shipments lists 1001-1086. Which shipment has no matching order?", ["1085", "1086", "1001", "All match"], 1),
];

export const generalMcqsPart3: McqSeed[] = [...critical, ...detail];
