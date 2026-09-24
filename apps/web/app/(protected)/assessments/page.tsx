import { getLandingSections } from "@/lib/queries/candidate";
import { AssessmentCard, type AssessmentCardData } from "@/components/ui/assessment-card";
import { Carousel } from "@/components/ui/carousel";
import { EmptyState, SectionHeading } from "@/components/ui/card";
import { IconPlusDashed } from "@/components/ui/icons";
import { visualKeyFor } from "@/lib/ui/category-visuals";

export const dynamic = "force-dynamic";

export const metadata = { title: "New Assessment · Assessment AI" };

/**
 * New Assessment landing: centred hero + one paged carousel per LIVE
 * category. Cards are interactive (hover elevation/reveal, quick-view modal)
 * but every essential fact stays visible at rest; all metadata is real
 * database content (names, role counts, flows).
 */
export default async function AssessmentsPage() {
  const sections = await getLandingSections();

  return (
    <div className="space-y-14">
      <section className="relative mx-auto max-w-3xl px-4 py-10 text-center sm:py-14">
        <span
          aria-hidden
          className="absolute -left-10 top-0 h-40 w-40 rounded-full bg-blue-200/40 blur-3xl"
        />
        <span
          aria-hidden
          className="absolute -right-8 bottom-0 h-36 w-36 rounded-full bg-fuchsia-200/40 blur-3xl"
        />
        <span
          aria-hidden
          className="absolute left-6 top-6 hidden h-12 w-12 rotate-12 rounded-xl bg-gradient-to-br from-pink-300 to-fuchsia-400 opacity-80 shadow-lg motion-safe:animate-[float-slow_6s_ease-in-out_infinite] sm:block"
        />
        <span
          aria-hidden
          className="absolute right-8 top-12 hidden h-10 w-10 -rotate-6 rounded-xl bg-gradient-to-br from-blue-300 to-indigo-400 opacity-80 shadow-lg motion-safe:animate-[float-slow_7s_ease-in-out_infinite] sm:block"
        />
        <span
          aria-hidden
          className="absolute bottom-10 left-20 hidden h-9 w-9 rotate-6 rounded-lg bg-gradient-to-br from-sky-300 to-blue-400 opacity-70 shadow sm:block"
        />
        <span
          aria-hidden
          className="absolute bottom-6 right-20 hidden h-11 w-11 rotate-12 rounded-lg bg-gradient-to-br from-indigo-300 to-blue-400 opacity-70 shadow sm:block"
        />
        <h1 className="relative text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          What would you like to be assessed on today?
        </h1>
        <p className="relative mx-auto mt-4 max-w-xl text-slate-500">
          Choose from our assessment library or create a personalized assessment using your
          own job description.
        </p>
      </section>

      {sections.length === 0 ? (
        <EmptyState
          icon={<IconPlusDashed className="h-8 w-8" />}
          title="No live assessment areas yet"
          message="Assessment areas appear here as soon as an administrator publishes them."
        />
      ) : (
        sections.map((section) => (
          <section key={section.categoryId} aria-label={section.title}>
            <SectionHeading>{section.title}</SectionHeading>
            <Carousel>
              {section.areas.map((area) => {
                const data: AssessmentCardData = {
                  id: area.id,
                  name: area.name,
                  meta: area.meta,
                  href: `/assessments/${area.id}`,
                  visual: visualKeyFor(section.categorySlug),
                  flowLabel: area.classification === "GENERAL" ? "GENERAL" : "ROLE_BASED",
                  implemented: true,
                  details: [
                    { label: "Category", value: section.title.replace(" Assessments", "") },
                    { label: "Track", value: area.classification === "GENERAL" ? "General" : "Role-based" },
                    {
                      label: "Flows",
                      value:
                        area.classification === "GENERAL"
                          ? "General MCQ"
                          : area.flows.length
                            ? area.flows
                                .map((f) =>
                                  f === "BASIC_MCQ"
                                    ? "Basic MCQ"
                                    : f === "BASIC_SKILLS_MCQ"
                                      ? "Basic + Skills"
                                      : f === "CODING"
                                        ? "Coding"
                                        : f,
                                )
                                .join(", ")
                            : "No live roles yet",
                    },
                  ],
                };
                return <AssessmentCard key={area.id} data={data} />;
              })}
            </Carousel>
          </section>
        ))
      )}
    </div>
  );
}
