import React, { useEffect, useRef, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import { MockCodeExecution } from './landing-mocks/MockCodeExecution';
import { MockArtifactGeneration } from './landing-mocks/MockArtifactGeneration';
import { MockRecipe } from './landing-mocks/MockRecipe';
import { MockWebSearch } from './landing-mocks/MockWebSearch';
import { MockMessageDraft } from './landing-mocks/MockMessageDraft';
import { MockMultiModel } from './landing-mocks/MockMultiModel';

function useInView() {
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const node = ref.current;
		if (!node) return;
		node.style.opacity = '0';
		node.style.transform = 'translateY(24px)';
		node.style.transitionProperty = 'opacity, transform';
		node.style.transitionDuration = '0.6s';
		node.style.transitionTimingFunction = 'ease-out';

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					node.style.opacity = '1';
					node.style.transform = 'translateY(0)';
					observer.unobserve(node);
				}
			},
			{ threshold: 0.1 }
		);
		observer.observe(node);
		return () => observer.disconnect();
	}, []);

	return ref;
}

function InView({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
	const ref = useInView();
	return <div ref={ref} className={className} style={style}>{children}</div>;
}

interface LandingPageProps {
	onLogin: () => void;
	onNavigate: (page: 'about' | 'privacy' | 'terms') => void;
}

export function LandingPage({ onLogin, onNavigate }: LandingPageProps) {
	return (
		<div className="overflow-y-auto h-screen scroll-smooth animate-fade-in" style={{ width: '100%' }}>

			{/* ═══════════════════ HERO ═══════════════════ */}
			<section className="relative flex flex-col items-center justify-center h-screen px-6 overflow-hidden">
				{/* Background image */}
				<div
					className="absolute inset-0 bg-cover bg-center bg-no-repeat"
					style={{ backgroundImage: "url('/hero.jpg')" }}
				/>
				{/* Gradient overlay */}
				<div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/50 to-background" />

				{/* Wave logo */}
				<div className="relative z-10 animate-fade-in mb-8" style={{ animationDelay: '100ms' }}>
					<svg viewBox="0 0 44 28" width={120} height={76} className="text-[#7d9fe3] overflow-visible">
						<g clipPath="url(#wc-hero)">
							<path
								d="M-20,8 Q-15,4 -10,8 Q-5,12 0,8 Q5,4 10,8 Q15,12 20,8 Q25,4 30,8 Q35,12 40,8 Q45,4 50,8 Q55,12 60,8"
								fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.7"
							>
								<animateTransform attributeName="transform" type="translate" values="0,0;-20,0" dur="2s" repeatCount="indefinite" />
							</path>
							<path
								d="M-20,14 Q-15,10 -10,14 Q-5,18 0,14 Q5,10 10,14 Q15,18 20,14 Q25,10 30,14 Q35,18 40,14 Q45,10 50,14 Q55,18 60,14"
								fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.45"
							>
								<animateTransform attributeName="transform" type="translate" values="0,0;-20,0" dur="3s" repeatCount="indefinite" />
							</path>
							<path
								d="M-20,20 Q-15,16 -10,20 Q-5,24 0,20 Q5,16 10,20 Q15,24 20,20 Q25,16 30,20 Q35,24 40,20 Q45,16 50,20 Q55,24 60,20"
								fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.25"
							>
								<animateTransform attributeName="transform" type="translate" values="0,0;-20,0" dur="4s" repeatCount="indefinite" />
							</path>
						</g>
						<defs>
							<clipPath id="wc-hero">
								<rect x="0" y="0" width="44" height="28" />
							</clipPath>
						</defs>
					</svg>
				</div>

				{/* Heading */}
				<h1 className="relative z-10 thaana-heading text-[120px] sm:text-[160px] font-normal leading-none animate-greeting-in">
					<span className="bg-gradient-to-l from-primary via-primary/80 to-foreground bg-clip-text text-transparent">
						ރާޅު
					</span>
				</h1>

				{/* Tagline */}
				<p className="relative z-10 thaana text-2xl sm:text-3xl text-[#9ca3af] mt-6 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
					ދިވެހި ބަހުގެ އެންމެ ކުޅަދާނަ އޭ.އައި
				</p>

				{/* Sub-tagline */}
				<p className="relative z-10 thaana text-lg sm:text-xl text-muted-foreground/60 mt-7 animate-fade-in-up" style={{ animationDelay: '350ms' }}>
					ލިޔުން، ތަރުޖަމާ، ދިރާސާ — ހުރިހާ ކަމެއް ދިވެހިން
				</p>

				{/* Sign in CTA */}
				<div className="relative z-10 mt-10 animate-fade-in-up" style={{ animationDelay: '500ms' }}>
					<button
						onClick={onLogin}
						className="thaana inline-block px-10 py-4 bg-[#7d9fe3] text-[#0a1530] font-semibold text-xl rounded-xl hover:bg-[#6b8fd4] transition-colors duration-150 cursor-pointer"
					>
						ގޫގުލް އިން ފައްޓާ
					</button>
				</div>

				{/* Scroll indicator */}
				<a href="#features" className="absolute bottom-8 z-10 animate-fade-in" style={{ animationDelay: '900ms' }}>
					<ChevronDown className="w-6 h-6 text-muted-foreground/40 animate-bounce" />
				</a>
			</section>

			{/* ═══════════════════ FEATURES ═══════════════════ */}
			<section id="features" className="py-28 sm:py-36">

				{/* Feature 1: Free Usage */}
				<InView className="px-6 mb-28 sm:mb-36">
					<div className="max-w-4xl mx-auto">
						<div
							className="w-full rounded-2xl border border-border/50 overflow-hidden bg-cover bg-bottom bg-no-repeat relative aspect-[3/4] md:aspect-video"
							style={{ backgroundImage: "url('/sections/whale_bg.jpg')" }}
						>
							<div className="absolute inset-0 flex flex-col items-center justify-start pt-[6%] px-6 pb-[8%] text-center">
								<h3 className="thaana-heading text-9xl font-normal mb-4 leading-tight text-primary-foreground">ހިލޭ ބޭނުންކުރެވޭ</h3>
								<p className="thaana text-lg sm:text-xl text-primary-foreground/70 max-w-2xl mx-auto">
									ގޫގުލް އެކައުންޓެއް ހުރިއްޔާ ނިމުނީ. ރެޖިސްޓްރޭޝަނެއް، ފީ އެއް ނެތް
								</p>
								<img src="/sections/whale_new.png" alt="" className="mt-auto w-[78%] max-w-[520px] object-contain pointer-events-none" />
							</div>
						</div>
					</div>
				</InView>

				{/* Feature 2: Code Execution */}
				<InView className="px-6 mb-28 sm:mb-36">
					<div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
						<div className="order-2 lg:order-1">
							<h3 className="thaana-heading text-8xl sm:text-9xl font-normal mb-4 leading-tight">ފުލް އޭޖެންޓިކް</h3>
							<p className="thaana text-lg text-muted-foreground">
								ހިސާބު ޖަހާ، ޑޭޓާ އެނަލައިޒް ކޮށް، ޗާޓް ހެދޭ.
								ލޯނު ކެލްކިއުލޭޓް ކުރުން، ބަޖެޓް ބެލެހެއްޓުން، ނަތީޖާ ރިވިއު ކުރުން.
								ކޯޑް ލިޔާކަށް ނޭނގުނަސް — ބުނީމަ ހައްދައިދޭ
							</p>
						</div>
						<div className="order-1 lg:order-2">
							<div
								className="aspect-[4/3] rounded-2xl border border-border/50 overflow-hidden relative bg-cover bg-center bg-no-repeat"
								style={{ backgroundImage: "url('/sections/python.jpg')" }}
							>
								<div className="absolute inset-0 flex items-center justify-center p-6 sm:p-8">
									<div className="w-full max-w-sm mock-perspective-right">
										<MockCodeExecution />
									</div>
								</div>
							</div>
						</div>
					</div>
				</InView>

				{/* Feature 3: Artifact Generation */}
				<InView className="px-6 mb-28 sm:mb-36">
					<div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
						<div className="order-1">
							<div
								className="aspect-[4/3] rounded-2xl border border-border/50 overflow-hidden relative bg-cover bg-center bg-no-repeat"
								style={{ backgroundImage: "url('/sections/document.jpg')" }}
							>
								<div className="absolute inset-0 flex items-center justify-center p-6 sm:p-8">
									<div className="w-full max-w-sm mock-perspective-left">
										<MockArtifactGeneration />
									</div>
								</div>
							</div>
						</div>
						<div className="order-2">
							<h3 className="thaana-heading text-8xl sm:text-9xl font-normal mb-4 leading-tight">ޑޮކިއުމެންޓް ހެދޭ</h3>
							<p className="thaana text-lg text-muted-foreground">
								ވޯޑް، ޕީ.ޑީ.އެފް، އެކްސެލް ފައިލް ހަދައި ޑައުންލޯޑް ކުރެވޭ.
								ފޯމެޓިންގ އާއި ޗާޓާ އެކު ރީތިކޮށް ތައްޔާރުކޮށްދޭ.
								ސިޓީ، ރިޕޯޓް، އިންވޮއިސް — ކޮންމެ ޑޮކިއުމެންޓެއް ވެސް ސީދާ ޗެޓުން
							</p>
						</div>
					</div>
				</InView>

				{/* Feature 4: Recipes */}
				<InView className="px-6 mb-28 sm:mb-36">
					<div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
						<div className="order-2 lg:order-1">
							<h3 className="thaana-heading text-8xl sm:text-9xl font-normal mb-4 leading-tight">ރޯދަ ރެޑީ</h3>
							<p className="thaana text-lg text-muted-foreground">
								ބޭނުން ރެސިޕީއެއް ކެއްކުމަށް ބޭނުންވާ ތަކެތި އަދި ތައްޔާރު ކުރާނެ ސްޓެޕްތައް.
								ޓައިމަރާ އެކު ކޮންމެ ސްޓެޕެއް ފޮލޯ ކުރެވޭ.
								ރޯދަ ވީއްލުމާ ތަރާވީސް — ކޮންމެ ކެއުމެއް ތައްޔާރު ކުރެވޭ
							</p>
						</div>
						<div className="order-1 lg:order-2">
							<div
								className="aspect-[4/3] rounded-2xl border border-border/50 overflow-hidden relative bg-cover bg-center bg-no-repeat"
								style={{ backgroundImage: "url('/sections/recipe.jpg')" }}
							>
								<div className="absolute inset-0 flex items-center justify-center p-6 sm:p-8">
									<div className="w-full max-w-sm mock-perspective-right">
										<MockRecipe />
									</div>
								</div>
							</div>
						</div>
					</div>
				</InView>

				{/* Minor Feature Cards */}
				<InView className="px-6 max-w-6xl mx-auto">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-5">

						{/* Card: Web Search */}
						<InView className="bg-card/50 border border-border/50 rounded-2xl overflow-hidden hover:border-primary/30 hover:bg-card/80 transition-all duration-300">
							<div className="aspect-[4/3] border-b border-border/30 relative overflow-hidden bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/features/websearch.jpg')" }}>
								<div className="absolute inset-0 flex items-center justify-center p-5">
									<div className="w-full max-w-[220px]">
										<MockWebSearch />
									</div>
								</div>
							</div>
							<div className="p-6">
								<h3 className="thaana-heading text-[48px] font-normal leading-[1.4] mb-2">ވެބް ސާޗް</h3>
								<p className="thaana text-base text-muted-foreground">ގޫގުލް ސާޗް ބޭނުންކޮށް ދިރާސާ ކުރެވޭ</p>
							</div>
						</InView>

						{/* Card: Message Drafting */}
						<InView className="bg-card/50 border border-border/50 rounded-2xl overflow-hidden hover:border-primary/30 hover:bg-card/80 transition-all duration-300" style={{ transitionDelay: '100ms' }}>
							<div className="aspect-[4/3] border-b border-border/30 relative overflow-hidden bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/features/documentgeneration.jpg')" }}>
								<div className="absolute inset-0 flex items-center justify-center p-5">
									<div className="w-full max-w-[220px]">
										<MockMessageDraft />
									</div>
								</div>
							</div>
							<div className="p-6">
								<h3 className="thaana-heading text-[48px] font-normal leading-[1.4] mb-2">މެސެޖް ލިޔެދޭ</h3>
								<p className="thaana text-base text-muted-foreground">ސިޓީ، އީމެއިލް، ޓެކްސްޓް މެސެޖް ލިޔެދޭ</p>
							</div>
						</InView>

						{/* Card: Multi Model */}
						<InView className="bg-card/50 border border-border/50 rounded-2xl overflow-hidden hover:border-primary/30 hover:bg-card/80 transition-all duration-300" style={{ transitionDelay: '200ms' }}>
							<div className="aspect-[4/3] border-b border-border/30 relative overflow-hidden bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/features/modelchange.jpg')" }}>
								<div className="absolute inset-0 flex items-center justify-center p-5">
									<div className="w-full max-w-[220px]">
										<MockMultiModel />
									</div>
								</div>
							</div>
							<div className="p-6">
								<h3 className="thaana-heading text-[48px] font-normal leading-[1.4] mb-2">މޮޑެލް ބަދަލުކުރެވޭ</h3>
								<p className="thaana text-base text-muted-foreground">ގެމިނީ ގެ ތަފާތު މޮޑެލްތައް ބޭނުންކުރެވޭ</p>
							</div>
						</InView>

					</div>
				</InView>

			</section>

			{/* ═══════════════════ FOOTER CTA + FOOTER ═══════════════════ */}
			<div className="relative bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/footer.jpg')" }}>
				{/* Fade-in from top */}
				<div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-background to-transparent" />

				<section className="relative z-10 px-6 py-32 sm:py-40 text-center">
					<InView>
						<h2 className="thaana-heading text-8xl sm:text-9xl mb-6 leading-none text-white">
							ރާޅު ބޭނުން ކުރައްވާ
						</h2>
						<p className="thaana text-xl sm:text-2xl text-white/60 mb-14">
							ހިލޭ، ގޫގުލް އެކައުންޓެއް ހުރިއްޔާ ނިމުނީ
						</p>
						<button
							onClick={onLogin}
							className="thaana inline-block px-16 py-6 bg-[#7d9fe3] text-[#0a1530] font-bold text-3xl rounded-2xl hover:bg-[#6b8fd4] transition-all duration-200 shadow-[0_0_40px_rgba(125,159,227,0.3)] hover:shadow-[0_0_60px_rgba(125,159,227,0.45)] cursor-pointer"
						>
							ހިލޭ ފައްޓާ
						</button>
					</InView>
				</section>

				<footer className="relative z-10 px-6 py-12">
					<div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
						<div className="text-center sm:text-start">
							<span className="thaana-heading text-3xl text-white/60">ރާޅު</span>
							<p className="thaana text-sm text-white/30 mt-1">ޖެމިނީ ބޭނުންކޮށް</p>
						</div>
						<nav className="flex items-center gap-6">
							<button onClick={() => onNavigate('about')} className="thaana text-sm text-white/40 hover:text-white/70 transition-colors cursor-pointer bg-transparent border-none">
								ރާޅު އާ ބެހޭ
							</button>
							<button onClick={() => onNavigate('privacy')} className="thaana text-sm text-white/40 hover:text-white/70 transition-colors cursor-pointer bg-transparent border-none">
								ޕްރައިވެސީ
							</button>
							<button onClick={() => onNavigate('terms')} className="thaana text-sm text-white/40 hover:text-white/70 transition-colors cursor-pointer bg-transparent border-none">
								ޝަރުތުތައް
							</button>
						</nav>
					</div>
				</footer>
			</div>
		</div>
	);
}
