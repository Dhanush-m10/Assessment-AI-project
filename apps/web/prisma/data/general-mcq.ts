/**
 * Canonical GENERAL content, part 1 of 3 — Aptitude + Logical Reasoning.
 *
 * Pure data: each entry follows the McqSeed shape from ../seed-data with
 * exactly one correct option among four. IDs are deterministic
 * (q_<area>_<difficulty><sequence>) and never collide with the original
 * q_<area>_<n> ids. Loaded via seed-data.ts by BOTH loaders.
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

// ------------------------------------------------------------ Aptitude (34)

const aptitude: McqSeed[] = [
  // EASY (11)
  g("area_aptitude", "q_apt_e01", D.E, "What is 15% of 200?", ["25", "30", "35", "40"], 1),
  g("area_aptitude", "q_apt_e02", D.E, "What is the average of 4, 8, 12 and 16?", ["9", "10", "11", "12"], 1),
  g("area_aptitude", "q_apt_e03", D.E, "A and B finish a job in 6 and 3 days respectively. Working together, they finish it in:", ["1 day", "2 days", "3 days", "4 days"], 1),
  g("area_aptitude", "q_apt_e04", D.E, "An increase from 200 to 250 is what percentage?", ["20%", "25%", "30%", "40%"], 1),
  g("area_aptitude", "q_apt_e05", D.E, "Simple interest on 500 at 10% per year for 2 years is:", ["50", "75", "100", "125"], 2),
  g("area_aptitude", "q_apt_e06", D.E, "A car travels 90 km in 1.5 hours. Its average speed is:", ["50 km/h", "55 km/h", "60 km/h", "65 km/h"], 2),
  g("area_aptitude", "q_apt_e07", D.E, "Two numbers are in the ratio 2:3 and their sum is 50. The smaller number is:", ["18", "20", "22", "25"], 1),
  g("area_aptitude", "q_apt_e08", D.E, "The sum of 7 consecutive integers is 70. The middle integer is:", ["8", "9", "10", "11"], 2),
  g("area_aptitude", "q_apt_e09", D.E, "40% of a number is 60. The number is:", ["120", "140", "150", "160"], 2),
  g("area_aptitude", "q_apt_e10", D.E, "A 20% discount on an item priced at 80 makes its final price:", ["58", "62", "64", "68"], 2),
  g("area_aptitude", "q_apt_e11", D.E, "Three-fifths of 250 is:", ["150", "160", "170", "180"], 0),
  // MEDIUM (11)
  g("area_aptitude", "q_apt_m01", D.M, "Complete the series: 3, 7, 15, 31, ?", ["47", "55", "63", "71"], 2),
  g("area_aptitude", "q_apt_m02", D.M, "A train 150 m long running at 54 km/h crosses a pole in:", ["7.5 s", "8.5 s", "10 s", "12 s"], 2),
  g("area_aptitude", "q_apt_m03", D.M, "In what ratio must a 25% solution be mixed with a 60% solution to obtain a 40% solution?", ["2:3", "3:2", "1:2", "4:3"], 1),
  g("area_aptitude", "q_apt_m04", D.M, "An item sold for 1200 at a 20% profit. Its cost price is:", ["900", "950", "1000", "1050"], 2),
  g("area_aptitude", "q_apt_m05", D.M, "A finishes a job in 10 days and B in 15. A works 2 days, then B finishes the rest. Total days taken:", ["12", "13", "14", "15"], 2),
  g("area_aptitude", "q_apt_m06", D.M, "X is 25% more than Y. If Y = 80, then X is:", ["90", "95", "100", "105"], 2),
  g("area_aptitude", "q_apt_m07", D.M, "A boat goes 18 km/h downstream and 12 km/h upstream. The speed of the current is:", ["2 km/h", "3 km/h", "4 km/h", "6 km/h"], 1),
  g("area_aptitude", "q_apt_m08", D.M, "Two fair dice are thrown. The probability that the sum is 7 is:", ["1/12", "1/6", "1/5", "5/36"], 1),
  g("area_aptitude", "q_apt_m09", D.M, "The LCM of 12, 18 and 24 is:", ["36", "48", "60", "72"], 3),
  g("area_aptitude", "q_apt_m10", D.M, "A father is three times as old as his son. In 10 years he will be twice as old. The son is now:", ["8 years", "10 years", "12 years", "15 years"], 1),
  g("area_aptitude", "q_apt_m11", D.M, "A price rises 20% and then falls 25%. The net effect is:", ["No change", "5% increase", "10% decrease", "10% increase"], 2),
  // HARD (12)
  g("area_aptitude", "q_apt_h01", D.H, "Pipe A fills a tank in 12 min, B in 15 min, and C empties it in 20 min. With all three open, the tank fills in:", ["8 min", "10 min", "12 min", "15 min"], 1),
  g("area_aptitude", "q_apt_h02", D.H, "A bag has 5 red and 3 blue balls. Two balls are drawn without replacement. The probability both are red is:", ["5/14", "5/8", "10/21", "15/28"], 0),
  g("area_aptitude", "q_apt_h03", D.H, "Complete the series: 2, 3, 5, 9, 17, 33, ?", ["49", "57", "65", "73"], 2),
  g("area_aptitude", "q_apt_h04", D.H, "A finishes a job in 6 days, B in 4. They work on alternate days, starting with A. The job is finished in:", ["4 days", "5 days", "6 days", "7 days"], 1),
  g("area_aptitude", "q_apt_h05", D.H, "The class average of 13 students is 60. If the lowest score, 36, is removed, the new average is:", ["61", "62", "63", "64"], 1),
  g("area_aptitude", "q_apt_h06", D.H, "How many distinct arrangements of the letters of LEADER keep the vowels together?", ["60", "120", "240", "720"], 1),
  g("area_aptitude", "q_apt_h07", D.H, "Compound interest on 8000 at 10% per year for 2 years (compounded annually) is:", ["1600", "1680", "1720", "1800"], 1),
  g("area_aptitude", "q_apt_h08", D.H, "Trains 100 m and 150 m long run at 25 and 35 km/h in opposite directions. They cross each other in:", ["12 s", "15 s", "18 s", "20 s"], 1),
  g("area_aptitude", "q_apt_h09", D.H, "An item sold at a 10% loss. Had it been sold for 240 more, the profit would have been 10%. The cost price is:", ["900", "1200", "1500", "1800"], 1),
  g("area_aptitude", "q_apt_h10", D.H, "A box has 1 red, 2 blue and 3 green balls. Two are drawn at random. The probability that neither is green is:", ["1/5", "1/4", "1/6", "1/10"], 0),
  g("area_aptitude", "q_apt_h11", D.H, "Complete the series: 7, 10, 8, 11, 9, 12, ?", ["10", "11", "13", "14"], 0),
  g("area_aptitude", "q_apt_h12", D.H, "An alloy contains copper and zinc in the ratio 5:3. How many grams of copper must be added to 80 g of the alloy to make the ratio 6:5?", ["12 g", "16 g", "20 g", "24 g"], 1),
];

// ---------------------------------------------------- Logical Reasoning (34)

const logical: McqSeed[] = [
  // EASY (12)
  g("area_logical", "q_log_e01", D.E, "Complete the series: 1, 3, 5, 7, ?", ["8", "9", "10", "11"], 1),
  g("area_logical", "q_log_e02", D.E, "In a code, each letter is replaced by its position in the alphabet (A=1, B=2...). CAT is coded 3120. DOG is coded:", ["2413", "4157", "4156", "4167"], 1),
  g("area_logical", "q_log_e03", D.E, "Pointing to a photo, Ravi says: 'His mother is the only daughter of my mother.' Ravi is the man's:", ["Uncle", "Father", "Brother", "Cousin"], 2),
  g("area_logical", "q_log_e04", D.E, "You walk 5 km north, then 5 km east. To return to the start you head:", ["South-west", "North-west", "South-east", "West"], 0),
  g("area_logical", "q_log_e05", D.E, "Which one does not belong: apple, mango, carrot, banana?", ["Apple", "Mango", "Carrot", "Banana"], 2),
  g("area_logical", "q_log_e06", D.E, "Complete the series: 2, 4, 8, 16, ?", ["24", "28", "30", "32"], 3),
  g("area_logical", "q_log_e07", D.E, "Doctor is to patient as teacher is to:", ["School", "Student", "Lesson", "Classroom"], 1),
  g("area_logical", "q_log_e08", D.E, "Complete the series: 100, 90, 80, 70, ?", ["50", "60", "65", "75"], 1),
  g("area_logical", "q_log_e09", D.E, "A is B's father. B is C's sister. A is C's:", ["Uncle", "Brother", "Father", "Grandfather"], 2),
  g("area_logical", "q_log_e10", D.E, "Which number does not belong: 3, 5, 9, 11?", ["3", "5", "9", "11"], 2),
  g("area_logical", "q_log_e11", D.E, "If yesterday was Wednesday, tomorrow is:", ["Thursday", "Friday", "Saturday", "Sunday"], 1),
  g("area_logical", "q_log_e12", D.E, "Complete the series: 5, 10, 15, 20, ?", ["22", "24", "25", "28"], 2),
  // MEDIUM (10)
  g("area_logical", "q_log_m01", D.M, "Statements: All cats are mammals. All mammals are animals. Conclusion: All cats are animals. Does it follow?", ["Yes", "No", "Cannot be determined", "Only if some animals are cats"], 0),
  g("area_logical", "q_log_m02", D.M, "In a code, each letter is shifted forward by one (A becomes B). If DOG is coded EPH, CAT is coded:", ["BCT", "DBU", "DAU", "DCV"], 1),
  g("area_logical", "q_log_m03", D.M, "Five people sit in a row. A sits at one end, B in the middle, C next to A, D at the other end, and E between B and D. How many people sit between A and D?", ["1", "2", "3", "4"], 2),
  g("area_logical", "q_log_m04", D.M, "Complete the series: 1, 4, 10, 19, ?", ["25", "28", "31", "34"], 2),
  g("area_logical", "q_log_m05", D.M, "Pointing to a man, a woman says: 'His son is my son's father.' The man is the woman's:", ["Son", "Brother", "Father", "Husband"], 2),
  g("area_logical", "q_log_m06", D.M, "You walk 10 m east, then 10 m south, then 10 m west. Where are you relative to the start?", ["10 m north", "10 m south", "At the start", "10 m east"], 1),
  g("area_logical", "q_log_m07", D.M, "8 is to 27 as 27 is to:", ["36", "54", "64", "81"], 2),
  g("area_logical", "q_log_m08", D.M, "Statements: All good managers are honest. Some honest people are managers. Conclusion: Some good managers are honest. Does it follow?", ["Yes", "No", "Cannot be determined", "Only if all managers are good"], 0),
  g("area_logical", "q_log_m09", D.M, "Complete the series: AB, CD, EF, GH, ?", ["GK", "IK", "IJ", "KL"], 2),
  g("area_logical", "q_log_m10", D.M, "A is taller than B. B is taller than C. D is taller than A. Who is the shortest?", ["A", "B", "C", "D"], 2),
  // HARD (12)
  g("area_logical", "q_log_h01", D.H, "Six people sit in a row facing north. A sits third from the left end. E sits immediately to the right of A. B sits immediately to the right of E. F sits at the right end. D sits immediately to the left of C. Who sits immediately to the left of A?", ["B", "C", "D", "F"], 1),
  g("area_logical", "q_log_h02", D.H, "Statements: All pens are tools. Some tools are pencils. Conclusions: I. Some pens are pencils. II. Some pencils are pens.", ["Only I follows", "Only II follows", "Both follow", "Neither follows"], 3),
  g("area_logical", "q_log_h03", D.H, "In a code, each letter is written as its position in the alphabet; PAPER becomes 16116518. PEN becomes:", ["16514", "14516", "16145", "151614"], 0),
  g("area_logical", "q_log_h04", D.H, "K walks 10 m north, turns right and walks 10 m, turns right and walks 10 m, then turns left and walks 10 m. How far is K from the start?", ["10 m", "20 m", "30 m", "40 m"], 1),
  g("area_logical", "q_log_h05", D.H, "Statement: 'Please switch off the light before leaving the room.' Assumptions: I. The light is currently on. II. Someone will come to the room later.", ["Only I is implicit", "Only II is implicit", "Both are implicit", "Neither is implicit"], 3),
  g("area_logical", "q_log_h06", D.H, "Exactly one of A or B is hired. If A is hired, then C is hired. C is not hired. Who is hired?", ["A", "B", "Neither", "Cannot be determined"], 1),
  g("area_logical", "q_log_h07", D.H, "Complete the series: 3, 5, 9, 17, 33, ?", ["49", "57", "63", "65"], 3),
  g("area_logical", "q_log_h08", D.H, "Statements: No manager is an engineer. All engineers are professionals. What definitely follows?", ["Some professionals are engineers", "No manager is a professional", "All professionals are managers", "No engineer is a professional"], 0),
  g("area_logical", "q_log_h09", D.H, "243 is to 81 as 64 is to:", ["8", "12", "16", "32"], 2),
  g("area_logical", "q_log_h10", D.H, "If the 13th day of a month falls on a Friday, the 30th day of that month falls on a:", ["Friday", "Saturday", "Sunday", "Monday"], 3),
  g("area_logical", "q_log_h11", D.H, "Five players scored as follows: P more than Q; R more than P; S less than Q; T more than R. Who scored the least?", ["P", "Q", "S", "T"], 2),
  g("area_logical", "q_log_h12", D.H, "If it rains, the ground gets wet. If the ground is wet, cricket is not played. It is raining. What definitely follows?", ["The ground is wet and cricket is not played", "Cricket is played", "The ground is dry", "Nothing follows"], 0),
];

export const generalMcqsPart1: McqSeed[] = [...aptitude, ...logical];
