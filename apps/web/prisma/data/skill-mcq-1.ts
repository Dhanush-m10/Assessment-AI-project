/**
 * Canonical BASIC_SKILLS_MCQ content, part 1 of 3 — Python, Analytics and
 * Algorithms for the Data Scientist job title. Pure data, same conventions.
 * Each question carries BOTH the skill tag and the job-title link the quota
 * engine filters on (QuestionSkill + QuestionJobTitle).
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
    jobTitleId: "jt_data_scientist",
    skills: [skill],
    options: options.map((t, i) => ({ text: t, correct: i === correct })),
  };
}

// --------------------------------------------------------------- Python (22)

const python: McqSeed[] = [
  // EASY (8)
  s("Python", "q_py_ds_e01", D.E, "What does [x * 2 for x in range(3)] evaluate to?", ["[0, 2, 4]", "[1, 2, 3]", "[0, 1, 2]", "[2, 4, 6]"], 0),
  s("Python", "q_py_ds_e02", D.E, "What is the result of len([1, 2, 3])?", ["2", "3", "4", "an error"], 1),
  s("Python", "q_py_ds_e03", D.E, "What does 'hello'.upper() return?", ["'HELLO'", "'hello'", "'Hello'", "an error"], 0),
  s("Python", "q_py_ds_e04", D.E, "range(1, 5) produces how many values when iterated?", ["4", "5", "6", "3"], 0),
  s("Python", "q_py_ds_e05", D.E, "Which is a valid f-string producing 'age: 30' when age = 30?", ['f"age: {age}"', 'f"age: age"', '"age: {age}"', 'f(age: 30)'], 0),
  s("Python", "q_py_ds_e06", D.E, "In def f(a, b=2), the parameter b is:", ["A positional-only parameter", "A keyword parameter with a default", "A required parameter", "A global variable"], 1),
  s("Python", "q_py_ds_e07", D.E, "What is the result of True and False?", ["True", "False", "None", "an error"], 1),
  s("Python", "q_py_ds_e08", D.E, "How do you add an element to the end of a list L?", ["L.append(x)", "L.add(x)", "L.push(x)", "L.insert_end(x)"], 0),
  // MEDIUM (7)
  s("Python", "q_py_ds_m01", D.M, "What does [x for x in [1, 2, 3, 4] if x % 2 == 0] produce?", ["[1, 3]", "[2, 4]", "[1, 2, 3, 4]", "[0]"], 1),
  s("Python", "q_py_ds_m02", D.M, "What is {k: v * 2 for k, v in {'a': 1, 'b': 2}.items()}?", ["{'a': 2, 'b': 4}", "{'a': 1, 'b': 2}", "[(a, 2), (b, 4)]", "an error"], 0),
  s("Python", "q_py_ds_m03", D.M, "In def f(*args, **kwargs), args collects:", ["Extra positional arguments as a tuple", "Keyword arguments as a dict", "Exactly one argument", "Class attributes"], 0),
  s("Python", "q_py_ds_m04", D.M, "A function using yield instead of return is:", ["A generator function", "A class", "A lambda", "A decorator"], 0),
  s("Python", "q_py_ds_m05", D.M, "Which block catches an exception only if it occurs?", ["try/except", "if/else", "with/finally", "def/return"], 0),
  s("Python", "q_py_ds_m06", D.M, "enumerate('ab') yields:", ["('a', 'b')", "(0, 'a'), (1, 'b')", "['a', 'b']", "(0, 'ab')"], 1),
  s("Python", "q_py_ds_m07", D.M, "Why is a mutable default argument (def f(x=[])) a common bug source?", ["The same list object is shared across calls", "Lists cannot be defaults", "It makes the function recursive", "It prevents the function from running"], 0),
  // HARD (7)
  s("Python", "q_py_ds_h01", D.H, "A decorator in Python is best described as:", ["A function that wraps another function to extend its behaviour", "A comment style", "A type hint", "A database index"], 0),
  s("Python", "q_py_ds_h02", D.H, "A closure is:", ["A function that retains access to variables from its defining scope", "A loop that never ends", "A class without methods", "An imported module"], 0),
  s("Python", "q_py_ds_h03", D.H, "The GIL (Global Interpreter Lock) in CPython primarily means:", ["Only one thread executes Python bytecode at a time", "Threads cannot be created", "I/O is blocked in threads", "Memory is shared with the OS"], 0),
  s("Python", "q_py_ds_h04", D.H, "In CPython, when an object's reference count drops to zero, it is typically:", ["Garbage collected immediately", "Kept forever", "Moved to disk", "Converted to a string"], 0),
  s("Python", "q_py_ds_h05", D.H, "A list comprehension versus a generator expression: the key difference is:", ["The generator lazily produces items and uses less memory", "Only lists can be iterated", "Generators are always faster at the end", "Lists cannot hold numbers"], 0),
  s("Python", "q_py_ds_h06", D.H, "The name-resolution order in Python for a variable is:", ["Local, enclosing, global, built-in (LEGB)", "Global, local, built-in, enclosing", "Built-in, local, enclosing, global", "Random per function"], 0),
  s("Python", "q_py_ds_h07", D.H, "Memoising a recursive function (e.g. with functools.lru_cache) primarily improves:", ["Repeated subproblem recomputation time", "Memory usage always", "Network latency", "Readability of the recursion only"], 0),
];

// -------------------------------------------------------- Analytics (22)

const analyticsDs: McqSeed[] = [
  // EASY (8)
  s("Analytics", "q_an_ds_e01", D.E, "The mean of 10, 20, 30 is:", ["15", "20", "25", "30"], 1),
  s("Analytics", "q_an_ds_e02", D.E, "Which chart is best for showing parts of a whole?", ["Line chart", "Pie or donut chart", "Scatter plot", "Heatmap"], 1),
  s("Analytics", "q_an_ds_e03", D.E, "A dashboard is:", ["A single view of key metrics for monitoring", "A raw CSV file", "A database table", "A single bar chart only"], 0),
  s("Analytics", "q_an_ds_e04", D.E, "A KPI differs from a plain metric mainly because a KPI is:", ["Tied to a specific goal and tracked regularly", "Always a percentage", "Only used in finance", "Never changed"], 0),
  s("Analytics", "q_an_ds_e05", D.E, "The first step in data cleaning is usually to:", ["Understand what is missing, duplicated or invalid", "Delete all rows", "Plot everything", "Rename columns only"], 0),
  s("Analytics", "q_an_ds_e06", D.E, "The 90th percentile means:", ["90% of values are at or below it", "10% of values are missing", "The top 10 values are removed", "The value is always the maximum"], 0),
  s("Analytics", "q_an_ds_e07", D.E, "In [1, 2, 3, 4, 50], the value 50 is best called:", ["An outlier", "The mode", "The median", "A duplicate"], 0),
  s("Analytics", "q_an_ds_e08", D.E, "Which is typically a PRIMARY (first-hand) data source?", ["A survey you administer to users", "A news article about the market", "A competitor's press release", "A Wikipedia page"], 0),
  // MEDIUM (7)
  s("Analytics", "q_an_ds_m01", D.M, "A/B testing is used to:", ["Compare two variants on a metric to estimate a causal difference", "Sort a data set", "Backup a database", "Design a logo"], 0),
  s("Analytics", "q_an_ds_m02", D.M, "A confounder is:", ["A variable that influences both treatment and outcome, biasing the estimate", "A plotting library", "A duplicate row", "A missing value"], 0),
  s("Analytics", "q_an_ds_m03", D.M, "Selection bias occurs when:", ["The analysed sample is not representative of the target population", "The chart is too small", "The data is encrypted", "The mean equals the median"], 0),
  s("Analytics", "q_an_ds_m04", D.M, "In a simple regression y = 2 + 3x, the coefficient 3 means:", ["A one-unit increase in x is associated with a 3-unit increase in y", "y is always 3", "x is causal proof", "The model has 3 features"], 0),
  s("Analytics", "q_an_ds_m05", D.M, "A retention cohort analysis tracks:", ["What fraction of users from each start period remains active over time", "Server uptime", "The number of databases", "Office occupancy"], 0),
  s("Analytics", "q_an_ds_m06", D.M, "A conversion funnel is used to:", ["Show drop-off between sequential steps", "Encrypt data", "Sort columns", "Store logs"], 0),
  s("Analytics", "q_an_ds_m07", D.M, "Simple random sampling is valuable because:", ["Every member has a known, equal chance of selection, supporting generalisation", "It is always free", "It selects the largest rows", "It avoids statistics entirely"], 0),
  // HARD (7)
  s("Analytics", "q_an_ds_h01", D.H, "A study with high statistical power is most likely to:", ["Detect a real effect if one exists", "Guarantee business success", "Avoid all bias", "Use a tiny sample"], 0),
  s("Analytics", "q_an_ds_h02", D.H, "Testing 20 metrics at p < 0.05 without correction means:", ["Expect about one false positive by chance alone", "No conclusions are ever valid", "All 20 are true", "The p-value must be 0.005"], 0),
  s("Analytics", "q_an_ds_h03", D.H, "An instrumental variable is useful for causal inference when it:", ["Affects the outcome only through the treatment and is independent of confounders", "Is correlated with the outcome directly", "Is measured after the outcome", "Is always the median"], 0),
  s("Analytics", "q_an_ds_h04", D.H, "In time series, 'seasonality' refers to:", ["Repeating patterns at fixed periods (e.g. weekly, yearly)", "One-off anomalies", "The long-term trend", "Random noise only"], 0),
  s("Analytics", "q_an_ds_h05", D.H, "AUC of an ROC curve measures:", ["Overall ability to rank positives above negatives across thresholds", "Training time", "Number of features", "Dataset size"], 0),
  s("Analytics", "q_an_ds_h06", D.H, "Feature engineering's main purpose is to:", ["Create inputs that improve model signal and generalisation", "Delete the target column", "Increase row count", "Replace the model"], 0),
  s("Analytics", "q_an_ds_h07", D.H, "A Bayesian approach differs from a frequentist one chiefly by:", ["Treating parameters as random with prior beliefs updated by data", "Never using data", "Only working with means", "Requiring no assumptions"], 0),
  s("Analytics", "q_an_ds_h08", D.H, "When two analysts report different results for the same experiment, the strongest first diagnostic is to:", ["Diff the data pipelines: filtering, joins, time windows and deduplication rules", "Re-run the same code and hope", "Trust the more senior analyst by default", "Publish both numbers without comment"], 0),
];

// --------------------------------------------------------- Algorithms (23)

const algorithms: McqSeed[] = [
  // EASY (8)
  s("Algorithms", "q_al_ds_e01", D.E, "An algorithm is:", ["A finite sequence of well-defined steps to solve a problem", "A programming language", "A hardware chip", "A database"], 0),
  s("Algorithms", "q_al_ds_e02", D.E, "A loop that repeats while a condition holds is called a:", ["While loop", "Print statement", "Variable", "Comment"], 0),
  s("Algorithms", "q_al_ds_e03", D.E, "Bubble sort repeatedly does what?", ["Swaps adjacent out-of-order elements until sorted", "Deletes the largest element", "Randomises the list", "Prints the list"], 0),
  s("Algorithms", "q_al_ds_e04", D.E, "Binary search works on:", ["A sorted collection, halving the search range each step", "Any unsorted list", "Only images", "Only one element"], 0),
  s("Algorithms", "q_al_ds_e05", D.E, "Big-O notation describes:", ["How running time grows with input size", "The colour of the code", "The number of files", "The compiler version"], 0),
  s("Algorithms", "q_al_ds_e06", D.E, "A hash table is mainly used for:", ["Fast average-case lookup by key", "Sorting visually", "Storing images", "Encrypting files"], 0),
  s("Algorithms", "q_al_ds_e07", D.E, "A stack processes items in which order?", ["Last in, first out", "First in, first out", "Random order", "Size order"], 0),
  s("Algorithms", "q_al_ds_e08", D.E, "A queue processes items in which order?", ["First in, first out", "Last in, first out", "Priority by value", "Reverse order always"], 0),
  // MEDIUM (8)
  s("Algorithms", "q_al_ds_m01", D.M, "Binary search on n sorted items runs in:", ["O(log n)", "O(n)", "O(n log n)", "O(n^2)"], 0),
  s("Algorithms", "q_al_ds_m02", D.M, "Quicksort's average-case time complexity is:", ["O(n log n)", "O(n)", "O(n^2)", "O(log n)"], 0),
  s("Algorithms", "q_al_ds_m03", D.M, "BFS explores a graph by:", ["Visiting all neighbours at the current depth before going deeper", "Going as deep as possible first", "Skipping unvisited nodes", "Sorting nodes by label"], 0),
  s("Algorithms", "q_al_ds_m04", D.M, "Dynamic programming is most appropriate when a problem has:", ["Overlapping subproblems and optimal substructure", "No substructure at all", "Only one element", "No repeated computation possible"], 0),
  s("Algorithms", "q_al_ds_m05", D.M, "A greedy algorithm:", ["Makes the locally best choice at each step", "Always finds the global optimum", "Is always O(1)", "Requires sorting twice"], 0),
  s("Algorithms", "q_al_ds_m06", D.M, "A min-heap is useful for:", ["Efficiently retrieving the smallest element", "Storing unsorted text", "Drawing circles", "Avoiding recursion"], 0),
  s("Algorithms", "q_al_ds_m07", D.M, "In graph terminology, an edge is:", ["A connection between two nodes", "The outer boundary of the graph", "A missing node", "A label on a node"], 0),
  s("Algorithms", "q_al_ds_m08", D.M, "A recursion without a base case typically:", ["Runs until it hits the call-stack limit", "Always returns zero", "Is always faster", "Never terminates correctly by design"], 0),
  // HARD (7)
  s("Algorithms", "q_al_ds_h01", D.H, "The defining property of dynamic programming problems is:", ["Optimal solutions compose from optimal solutions of subproblems", "Every problem has one solution", "Subproblems never overlap", "Only sorting problems qualify"], 0),
  s("Algorithms", "q_al_ds_h02", D.H, "Storing DP memo tables trades:", ["Time for space", "Space for correctness", "Always speed for nothing", "Readability for nothing"], 0),
  s("Algorithms", "q_al_ds_h03", D.H, "An NP-complete problem is one that:", ["Is in NP and every NP problem can be reduced to it in polynomial time", "Always has a polynomial-time solution", "Can never be solved", "Only has one instance"], 0),
  s("Algorithms", "q_al_ds_h04", D.H, "Dijkstra's algorithm finds:", ["Shortest paths from a source in a graph with non-negative edge weights", "The largest cycle", "A perfect matching always", "The topological order only"], 0),
  s("Algorithms", "q_al_ds_h05", D.H, "Backtracking is best described as:", ["Building candidates incrementally and abandoning a candidate as soon as it cannot lead to a solution", "Sorting then searching", "A hardware technique", "A database index"], 0),
  s("Algorithms", "q_al_ds_h06", D.H, "Amortised analysis is used when:", ["A single operation is expensive but cheap on average over a sequence", "Every operation is O(1) by definition", "The algorithm is random", "The input is fixed"], 0),
  s("Algorithms", "q_al_ds_h07", D.H, "If P = NP, the most direct consequence would be that:", ["Every problem with efficiently verifiable solutions has an efficient algorithm", "Sorting becomes impossible", "All games are unsolvable", "Hashing breaks"], 0),
];

export const skillMcqsPart1: McqSeed[] = [...python, ...analyticsDs, ...algorithms];
