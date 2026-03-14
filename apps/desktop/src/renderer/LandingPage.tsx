import React, { useRef, useEffect, useState } from "react";

/* ── Wave Logo ── */

function WaveLogo() {
  return (
    <svg viewBox="0 0 44 28" width="120" height="76" className="text-primary overflow-visible">
      <g clipPath="url(#wc-hero)">
        <path
          d="M-20,8 Q-15,4 -10,8 Q-5,12 0,8 Q5,4 10,8 Q15,12 20,8 Q25,4 30,8 Q35,12 40,8 Q45,4 50,8 Q55,12 60,8"
          fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.7"
        >
          <animateTransform attributeName="transform" type="translate"
            values="0,0;-20,0" dur="2s" repeatCount="indefinite" />
        </path>
        <path
          d="M-20,14 Q-15,10 -10,14 Q-5,18 0,14 Q5,10 10,14 Q15,18 20,14 Q25,10 30,14 Q35,18 40,14 Q45,10 50,14 Q55,18 60,14"
          fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.45"
        >
          <animateTransform attributeName="transform" type="translate"
            values="0,0;-20,0" dur="3s" repeatCount="indefinite" />
        </path>
        <path
          d="M-20,20 Q-15,16 -10,20 Q-5,24 0,20 Q5,16 10,20 Q15,24 20,20 Q25,16 30,20 Q35,24 40,20 Q45,16 50,20 Q55,24 60,20"
          fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.25"
        >
          <animateTransform attributeName="transform" type="translate"
            values="0,0;-20,0" dur="4s" repeatCount="indefinite" />
        </path>
      </g>
      <defs>
        <clipPath id="wc-hero">
          <rect x="0" y="0" width="44" height="28" />
        </clipPath>
      </defs>
    </svg>
  );
}

/* ── InViewDiv — animates on scroll into view ── */

function InViewDiv({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(40px)",
        transition: `opacity 0.6s ease-out ${delay}ms, transform 0.6s ease-out ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ── Chevron icon ── */

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/* ── Feature card data ── */

interface FeatureCard {
  image: string;
  titleDv: string;
  descDv: string;
}

const FULL_WIDTH_FEATURES: FeatureCard[] = [
  {
    image: "/sections/free.jpg",
    titleDv: "ހިލޭ",
    descDv: "ރާޅު ބޭނުންކުރެވޭނީ ހުރިހާ މީހުންނަށް، ހުރިހާ ވަގުތެއްގައި، ހިލޭ.",
  },
  {
    image: "/sections/python.jpg",
    titleDv: "ޕައިތަން ސޭންޑްބޮކްސް",
    descDv: "ކޯޑު ލިޔެ ރަން ކުރެވޭ — ގްރާފް، ޗާޓް، ޑޭޓާ އެނަލިސިސް.",
  },
  {
    image: "/sections/document.jpg",
    titleDv: "ލިޔެކިޔުން",
    descDv: "ސިޓީ، ރިޕޯޓް، ދިރާސާ — ދިވެހިން ލިޔުންތައް ތައްޔާރުކުރޭ.",
  },
  {
    image: "/sections/recipe.jpg",
    titleDv: "ރެސިޕީ",
    descDv: "ދިވެހި ކެއުންތަކުގެ ރެސިޕީ ހޯދާ، ބައި ބަދަލުކުރޭ.",
  },
];

const SMALL_FEATURES: FeatureCard[] = [
  {
    image: "/features/websearch.jpg",
    titleDv: "ވެބް ސާރޗް",
    descDv: "އެންމެ ފަހުގެ މައުލޫމާތު ހޯދައިދޭ.",
  },
  {
    image: "/features/documentgeneration.jpg",
    titleDv: "ޑޮކިޔުމެންޓް ޖެނެރޭޝަން",
    descDv: "ފައިލް އުފައްދައި ޑައުންލޯޑް ކުރެވޭ.",
  },
  {
    image: "/features/modelchange.jpg",
    titleDv: "މޮޑެލް ބަދަލުކުރޭ",
    descDv: "ތަފާތު އޭ.އައި މޮޑެލްތައް ޚިޔާރުކުރެވޭ.",
  },
];

/* ── Landing Page ── */

interface LandingPageProps {
  onGetStarted: () => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const featuresRef = useRef<HTMLDivElement>(null);

  function scrollToFeatures() {
    featuresRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="h-screen overflow-y-auto scroll-smooth">
      {/* Hero section */}
      <section className="relative flex flex-col items-center justify-center h-screen px-6 overflow-hidden shrink-0">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/hero.jpg')" }}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/50 to-background" />

        {/* Wave logo */}
        <div className="relative z-10 animate-fade-in mb-8" style={{ animationDelay: "100ms" }}>
          <WaveLogo />
        </div>

        {/* Heading */}
        <h1 className="relative z-10 thaana-heading text-[120px] sm:text-[160px] font-normal leading-none animate-greeting-in">
          <span className="bg-gradient-to-l from-primary via-primary/80 to-white bg-clip-text text-transparent">
            ރާޅު
          </span>
        </h1>

        {/* Tagline */}
        <p
          className="relative z-10 thaana text-2xl sm:text-3xl text-white mt-6 animate-fade-in-up"
          style={{ animationDelay: "200ms" }}
        >
          ދިވެހި ބަހުގެ އެންމެ ކުޅަދާނަ އޭ.އައި
        </p>

        {/* Sub-tagline */}
        <p
          className="relative z-10 thaana text-lg sm:text-xl text-white/60 mt-3 animate-fade-in-up"
          style={{ animationDelay: "350ms" }}
        >
          ލިޔުން، ތަރުޖަމާ، ދިރާސާ — ހުރިހާ ކަމެއް ދިވެހިން
        </p>

        {/* Sign in CTA */}
        <div className="relative z-10 mt-16 animate-fade-in-up" style={{ animationDelay: "500ms" }}>
          <button
            onClick={onGetStarted}
            className="thaana inline-block px-10 py-4 bg-primary text-primary-foreground font-semibold text-xl
              rounded-xl hover:bg-primary/90 transition-colors duration-150 cursor-pointer"
          >
            ގޫގުލް އިން ފައްޓާ
          </button>
        </div>

        {/* Scroll chevron — hidden while features section is commented out */}
        {/*
        <button
          onClick={scrollToFeatures}
          className="absolute bottom-8 z-10 animate-fade-in text-white/40 hover:text-white/70 transition-colors"
          style={{ animationDelay: "800ms" }}
        >
          <ChevronDownIcon className="w-8 h-8 animate-bounce" />
        </button>
        */}
      </section>

      {/* Features section — commented out, hero only for now */}
      {/*
      <section ref={featuresRef} className="px-6 py-20 max-w-5xl mx-auto" dir="rtl">
        <InViewDiv className="text-center mb-16">
          <h2 className="thaana-heading text-5xl sm:text-6xl text-foreground" style={{ marginTop: 8 }}>
            ކުޅަދާނަ ފީޗާތައް
          </h2>
          <p className="thaana text-lg text-muted-foreground mt-4">
            ރާޅު އަކީ ދިވެހިންނަށް ޚާއްސަ އޭ.އައި ޕްލެޓްފޯމެއް
          </p>
        </InViewDiv>

        <div className="flex flex-col gap-8 mb-12">
          {FULL_WIDTH_FEATURES.map((feat, i) => (
            <InViewDiv key={i} delay={i * 100}>
              <div className="relative rounded-2xl overflow-hidden border border-border bg-card group">
                <div className="relative h-56 sm:h-72 overflow-hidden">
                  <img
                    src={feat.image}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
                </div>
                <div className="relative px-6 pb-6 -mt-12 z-10">
                  <h3 className="thaana-heading text-2xl sm:text-3xl text-foreground mb-2" style={{ marginTop: 8 }}>
                    {feat.titleDv}
                  </h3>
                  <p className="thaana text-base text-muted-foreground">
                    {feat.descDv}
                  </p>
                </div>
              </div>
            </InViewDiv>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-20">
          {SMALL_FEATURES.map((feat, i) => (
            <InViewDiv key={i} delay={i * 100}>
              <div className="rounded-2xl overflow-hidden border border-border bg-card group">
                <div className="relative h-40 overflow-hidden">
                  <img
                    src={feat.image}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
                </div>
                <div className="px-4 pb-4 -mt-6 relative z-10">
                  <h4 className="thaana-heading text-lg text-foreground mb-1" style={{ marginTop: 6 }}>
                    {feat.titleDv}
                  </h4>
                  <p className="thaana text-sm text-muted-foreground">
                    {feat.descDv}
                  </p>
                </div>
              </div>
            </InViewDiv>
          ))}
        </div>
      </section>

      <footer className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/footer.jpg')" }}
        />
        <div className="absolute inset-0 bg-background/80" />
        <div className="relative z-10 px-6 py-20 text-center">
          <InViewDiv>
            <WaveLogo />
          </InViewDiv>
          <InViewDiv delay={100}>
            <h3 className="thaana-heading text-4xl text-foreground mt-6" style={{ marginTop: 8 }}>
              ރާޅު
            </h3>
            <p className="thaana text-muted-foreground mt-3 mb-8">
              ދިވެހި ބަހުގެ އެންމެ ކުޅަދާނަ އޭ.އައި
            </p>
            <button
              onClick={onGetStarted}
              className="thaana inline-block px-8 py-3 bg-primary text-primary-foreground font-semibold text-lg
                rounded-xl hover:bg-primary/90 transition-colors duration-150 cursor-pointer"
            >
              މިހާރު ފައްޓާ
            </button>
          </InViewDiv>
        </div>
      </footer>
      */}
    </div>
  );
}
