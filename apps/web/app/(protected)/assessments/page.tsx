import { getLandingSections } from "@/lib/queries/candidate";
import { AreaCard } from "@/components/ui/area-card";
import { Carousel } from "@/components/ui/carousel";
import { EmptyState, SectionHeading } from "@/components/ui/card";
import { IconPlusDashed } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

export const metadata = { title: "New Assessment · Assessment AI" };

/**
 * New Assessment landing (reference pages 3+): centred hero with floating
 * pastel tiles, then one paged carousel section per LIVE category, cards
 * showing real area names and real role counts from the taxonomy.
 *
 * Cards link to the per-area setup placeholder; the four approved flows
 * (GENERAL / BASIC_MCQ / BASIC_SKILLS_MCQ / CODING) are untouched here —
 * routing into them arrives with the setup phases.
 */
export default async function AssessmentsPage() {
  const sections = await getLandingSections();

  return (
    <div className="space-y-14">
      <section className="relative mx-auto max-w-3xl px-4 py-10 text-center sm:py-14">
        <span
          aria-hidden
          className="absolute left-2 top-6 hidden h-12 w-12 rotate-12 rounded-xl bg-gradient-to-br from-pink-300 to-fuchsia-400 opacity-80 sm:block"
        />
        <span
          aria-hidden
          className="absolute right-4 top-10 hidden h-10 w-10 -rotate-6 rounded-xl bg-gradient-to-br from-blue-300 to-indigo-400 opacity-80 sm:block"
        />
        <span
          aria-hidden
          className="absolute bottom-8 left-16 hidden h-9 w-9 rotate-6 rounded-lg bg-gradient-to-br from-sky-300 to-blue-400 opacity-70 sm:block"
        />
        <span
          aria-hidden
          className="absolute bottom-4 right-16 hidden h-11 w-11 rotate-12 rounded-lg bg-gradient-to-br from-indigo-300 to-blue-400 opacity-70 sm:block"
        />
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          What would you like to be assessed on today?
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-slate-500">
          Choose from our assessment library or create a personalized assessment using your own
          job description.
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
              {section.areas.map((area) => (
                <AreaCard
                  key={area.id}
                  id={area.id}
                  name={area.name}
                  meta={area.meta}
                  href={`/assessments/${area.id}`}
                />
              ))}
            </Carousel>
          </section>
        ))
      )}
    </div>
  );
}
