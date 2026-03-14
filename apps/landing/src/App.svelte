<script lang="ts">
	import MockCodeExecution from './lib/components/landing-mocks/MockCodeExecution.svelte';
	import MockArtifactGeneration from './lib/components/landing-mocks/MockArtifactGeneration.svelte';
	import MockRecipe from './lib/components/landing-mocks/MockRecipe.svelte';
	import MockWebSearch from './lib/components/landing-mocks/MockWebSearch.svelte';
	import MockMessageDraft from './lib/components/landing-mocks/MockMessageDraft.svelte';
	import MockMultiModel from './lib/components/landing-mocks/MockMultiModel.svelte';

	function inview(node: HTMLElement) {
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
		return { destroy: () => observer.disconnect() };
	}
</script>

<div class="overflow-y-auto h-screen scroll-smooth">

	<!-- ═══════════════════ HERO ═══════════════════ -->
	<section class="relative flex flex-col items-center justify-center h-screen px-6 overflow-hidden">

		<!-- Background image -->
		<div
			class="absolute inset-0 bg-cover bg-center bg-no-repeat"
			style="background-image: url('/hero.jpg')"
		></div>
		<!-- Gradient overlay for readability -->
		<div class="absolute inset-0 bg-gradient-to-b from-background/70 via-background/50 to-background"></div>

		<!-- Wave logo -->
		<div class="relative z-10 animate-fade-in mb-8" style="animation-delay: 100ms">
			<svg viewBox="0 0 44 28" width="120" height="76" class="text-primary overflow-visible">
				<g clip-path="url(#wc-hero)">
					<path
						d="M-20,8 Q-15,4 -10,8 Q-5,12 0,8 Q5,4 10,8 Q15,12 20,8 Q25,4 30,8 Q35,12 40,8 Q45,4 50,8 Q55,12 60,8"
						fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity="0.7"
					>
						<animateTransform attributeName="transform" type="translate"
							values="0,0;-20,0" dur="2s" repeatCount="indefinite" />
					</path>
					<path
						d="M-20,14 Q-15,10 -10,14 Q-5,18 0,14 Q5,10 10,14 Q15,18 20,14 Q25,10 30,14 Q35,18 40,14 Q45,10 50,14 Q55,18 60,14"
						fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity="0.45"
					>
						<animateTransform attributeName="transform" type="translate"
							values="0,0;-20,0" dur="3s" repeatCount="indefinite" />
					</path>
					<path
						d="M-20,20 Q-15,16 -10,20 Q-5,24 0,20 Q5,16 10,20 Q15,24 20,20 Q25,16 30,20 Q35,24 40,20 Q45,16 50,20 Q55,24 60,20"
						fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity="0.25"
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
		</div>

		<!-- Heading -->
		<h1 class="relative z-10 thaana-heading text-[120px] sm:text-[160px] font-normal leading-none animate-greeting-in">
			<span class="bg-gradient-to-l from-primary via-primary/80 to-foreground bg-clip-text text-transparent">
				ރާޅު
			</span>
		</h1>

		<!-- Tagline -->
		<p
			class="relative z-10 thaana text-2xl sm:text-3xl text-muted-foreground mt-6 animate-fade-in-up"
			style="animation-delay: 200ms"
		>
			ދިވެހި ބަހުގެ އެންމެ ކުޅަދާނަ އޭ.އައި
		</p>

		<!-- Sub-tagline -->
		<p
			class="relative z-10 thaana text-lg sm:text-xl text-muted-foreground/60 mt-3 animate-fade-in-up"
			style="animation-delay: 350ms"
		>
			ލިޔުން، ތަރުޖަމާ، ދިރާސާ — ހުރިހާ ކަމެއް ދިވެހިން
		</p>

		<!-- Platform buttons -->
		<div class="relative z-10 mt-10 animate-fade-in-up flex flex-col sm:flex-row items-center gap-4" style="animation-delay: 500ms">
			<a
				href="https://raalhu.ai"
				class="thaana inline-flex items-center gap-3 px-10 py-4 bg-primary text-primary-foreground font-semibold text-xl
					rounded-xl hover:bg-primary/90 transition-colors duration-150"
			>
				<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
				</svg>
				Web
			</a>
			<a
				href="#"
				class="thaana inline-flex items-center gap-3 px-10 py-4 bg-card border border-border text-foreground font-semibold text-xl
					rounded-xl hover:bg-accent transition-colors duration-150"
			>
				<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>
				</svg>
				Desktop
			</a>
			<a
				href="#"
				class="thaana inline-flex items-center gap-3 px-10 py-4 bg-card border border-border text-foreground font-semibold text-xl
					rounded-xl hover:bg-accent transition-colors duration-150"
			>
				<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>
				</svg>
				Mobile
			</a>
		</div>

		<!-- Scroll indicator -->
		<a
			href="#features"
			class="absolute bottom-8 z-10 animate-fade-in"
			style="animation-delay: 900ms"
		>
			<svg class="w-6 h-6 text-muted-foreground/40 animate-bounce" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="m6 9 6 6 6-6"/>
			</svg>
		</a>
	</section>

	<!-- ═══════════════════ FEATURES ═══════════════════ -->
	<section id="features" class="py-28 sm:py-36">

		<!-- ── Feature 1: Free Usage (full-wide, centered) ── -->
		<div use:inview class="px-6 mb-28 sm:mb-36">
			<div class="max-w-4xl mx-auto">
				<div
					class="w-full rounded-2xl border border-border/50 overflow-hidden bg-cover bg-bottom bg-no-repeat relative aspect-[3/4] md:aspect-video"
					style="background-image: url('/sections/whale_bg.jpg')"
				>
					<div class="absolute inset-0 flex flex-col items-center justify-start pt-[6%] px-6 pb-[8%] text-center">
						<h3 class="thaana-heading text-9xl font-normal mb-4 leading-tight text-primary-foreground">ހިލޭ ބޭނުންކުރެވޭ</h3>
						<p class="thaana text-lg sm:text-xl text-primary-foreground/70 max-w-2xl mx-auto">
							ގޫގުލް އެކައުންޓެއް ހުރިއްޔާ ނިމުނީ. ރެޖިސްޓްރޭޝަނެއް، ފީ އެއް ނެތް
						</p>
						<img src="/sections/whale_new.png" alt="" class="mt-auto w-[78%] max-w-[520px] object-contain pointer-events-none" />
					</div>
				</div>
			</div>
		</div>

		<!-- ── Feature 2: Code Executable (text left, image right) ── -->
		<div use:inview class="px-6 mb-28 sm:mb-36">
			<div class="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
				<div class="order-2 lg:order-1">
					<h3 class="thaana-heading text-8xl sm:text-9xl font-normal mb-4 leading-tight">ފުލް އޭޖެންޓިކް</h3>
					<p class="thaana text-lg text-muted-foreground">
						ހިސާބު ޖަހާ، ޑޭޓާ އެނަލައިޒް ކޮށް، ޗާޓް ހެދޭ.
						ލޯނު ކެލްކިއުލޭޓް ކުރުން، ބަޖެޓް ބެލެހެއްޓުން، ނަތީޖާ ރިވިއު ކުރުން.
						ކޯޑް ލިޔާކަށް ނޭނގުނަސް — ބުނީމަ ހައްދައިދޭ
					</p>
				</div>
				<div class="order-1 lg:order-2">
					<div
						class="aspect-[4/3] rounded-2xl border border-border/50 overflow-hidden relative bg-cover bg-center bg-no-repeat"
						style="background-image: url('/sections/python.jpg')"
					>
						<div class="absolute inset-0 flex items-center justify-center p-6 sm:p-8">
							<div class="w-full max-w-sm mock-perspective-right">
								<MockCodeExecution />
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- ── Feature 3: Artifact Generation (text right, image left) ── -->
		<div use:inview class="px-6 mb-28 sm:mb-36">
			<div class="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
				<div class="order-1">
					<div
						class="aspect-[4/3] rounded-2xl border border-border/50 overflow-hidden relative bg-cover bg-center bg-no-repeat"
						style="background-image: url('/sections/document.jpg')"
					>
						<div class="absolute inset-0 flex items-center justify-center p-6 sm:p-8">
							<div class="w-full max-w-sm mock-perspective-left">
								<MockArtifactGeneration />
							</div>
						</div>
					</div>
				</div>
				<div class="order-2">
					<h3 class="thaana-heading text-8xl sm:text-9xl font-normal mb-4 leading-tight">ޑޮކިއުމެންޓް ހެދޭ</h3>
					<p class="thaana text-lg text-muted-foreground">
						ވޯޑް، ޕީ.ޑީ.އެފް، އެކްސެލް ފައިލް ހަދައި ޑައުންލޯޑް ކުރެވޭ.
						ފޯމެޓިންގ އާއި ޗާޓާ އެކު ރީތިކޮށް ތައްޔާރުކޮށްދޭ.
						ސިޓީ، ރިޕޯޓް، އިންވޮއިސް — ކޮންމެ ޑޮކިއުމެންޓެއް ވެސް ސީދާ ޗެޓުން
					</p>
				</div>
			</div>
		</div>

		<!-- ── Feature 4: Recipes (text left, image right) ── -->
		<div use:inview class="px-6 mb-28 sm:mb-36">
			<div class="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
				<div class="order-2 lg:order-1">
					<h3 class="thaana-heading text-8xl sm:text-9xl font-normal mb-4 leading-tight">ރޯދަ ރެޑީ</h3>
					<p class="thaana text-lg text-muted-foreground">
						ބޭނުން ރެސިޕީއެއް ކެއްކުމަށް ބޭނުންވާ ތަކެތި އަދި ތައްޔާރު ކުރާނެ ސްޓެޕްތައް.
						ޓައިމަރާ އެކު ކޮންމެ ސްޓެޕެއް ފޮލޯ ކުރެވޭ.
						ރޯދަ ވީއްލުމާ ތަރާވީސް — ކޮންމެ ކެއުމެއް ތައްޔާރު ކުރެވޭ
					</p>
				</div>
				<div class="order-1 lg:order-2">
					<div
						class="aspect-[4/3] rounded-2xl border border-border/50 overflow-hidden relative bg-cover bg-center bg-no-repeat"
						style="background-image: url('/sections/recipe.jpg')"
					>
						<div class="absolute inset-0 flex items-center justify-center p-6 sm:p-8">
							<div class="w-full max-w-sm mock-perspective-right">
								<MockRecipe />
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- ── Minor Feature Cards ── -->
		<div use:inview class="px-6 max-w-6xl mx-auto">
			<div class="grid grid-cols-1 md:grid-cols-3 gap-5">

				<!-- Card: Web Search -->
				<div
					use:inview
					class="bg-card/50 border border-border/50 rounded-2xl overflow-hidden
						hover:border-primary/30 hover:bg-card/80 transition-all duration-300"
				>
					<div class="aspect-[4/3] border-b border-border/30 relative overflow-hidden bg-cover bg-center bg-no-repeat" style="background-image: url('/features/websearch.jpg')">
						<div class="absolute inset-0 flex items-center justify-center p-5">
							<div class="w-full max-w-[220px]">
								<MockWebSearch />
							</div>
						</div>
					</div>
					<div class="p-6">
						<h3 class="thaana-heading text-[48px] font-normal leading-[1.4] mb-2">ވެބް ސާޗް</h3>
						<p class="thaana text-base text-muted-foreground">ގޫގުލް ސާޗް ބޭނުންކޮށް ދިރާސާ ކުރެވޭ</p>
					</div>
				</div>

				<!-- Card: Message Drafting -->
				<div
					use:inview
					class="bg-card/50 border border-border/50 rounded-2xl overflow-hidden
						hover:border-primary/30 hover:bg-card/80 transition-all duration-300"
					style="transition-delay: 100ms"
				>
					<div class="aspect-[4/3] border-b border-border/30 relative overflow-hidden bg-cover bg-center bg-no-repeat" style="background-image: url('/features/documentgeneration.jpg')">
						<div class="absolute inset-0 flex items-center justify-center p-5">
							<div class="w-full max-w-[220px]">
								<MockMessageDraft />
							</div>
						</div>
					</div>
					<div class="p-6">
						<h3 class="thaana-heading text-[48px] font-normal leading-[1.4] mb-2">މެސެޖް ލިޔެދޭ</h3>
						<p class="thaana text-base text-muted-foreground">ސިޓީ، އީމެއިލް، ޓެކްސްޓް މެސެޖް ލިޔެދޭ</p>
					</div>
				</div>

				<!-- Card: Multi Model -->
				<div
					use:inview
					class="bg-card/50 border border-border/50 rounded-2xl overflow-hidden
						hover:border-primary/30 hover:bg-card/80 transition-all duration-300"
					style="transition-delay: 200ms"
				>
					<div class="aspect-[4/3] border-b border-border/30 relative overflow-hidden bg-cover bg-center bg-no-repeat" style="background-image: url('/features/modelchange.jpg')">
						<div class="absolute inset-0 flex items-center justify-center p-5">
							<div class="w-full max-w-[220px]">
								<MockMultiModel />
							</div>
						</div>
					</div>
					<div class="p-6">
						<h3 class="thaana-heading text-[48px] font-normal leading-[1.4] mb-2">މޮޑެލް ބަދަލުކުރެވޭ</h3>
						<p class="thaana text-base text-muted-foreground">ގެމިނީ ގެ ތަފާތު މޮޑެލްތައް ބޭނުންކުރެވޭ</p>
					</div>
				</div>

			</div>
		</div>

	</section>

	<!-- ═══════════════════ FOOTER CTA + FOOTER ═══════════════════ -->
	<div class="relative bg-cover bg-center bg-no-repeat" style="background-image: url('/footer.jpg')">
		<!-- Fade-in from top -->
		<div class="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-background to-transparent"></div>

		<section class="relative z-10 px-6 py-32 sm:py-40 text-center">
			<div use:inview>
				<h2 class="thaana-heading text-8xl sm:text-9xl mb-6 leading-none text-white">
					ރާޅު ބޭނުން ކުރައްވާ
				</h2>
				<p class="thaana text-xl sm:text-2xl text-white/60 mb-14">
					ހިލޭ، ގޫގުލް އެކައުންޓެއް ހުރިއްޔާ ނިމުނީ
				</p>
				<div class="flex flex-col sm:flex-row items-center justify-center gap-4">
					<a
						href="https://raalhu.ai"
						class="thaana inline-flex items-center gap-3 px-16 py-6 bg-primary text-primary-foreground font-bold text-3xl
							rounded-2xl hover:brightness-110 transition-all duration-200
							shadow-[0_0_40px_rgba(125,159,227,0.3)] hover:shadow-[0_0_60px_rgba(125,159,227,0.45)]"
					>
						Web
					</a>
					<a
						href="#"
						class="thaana inline-flex items-center gap-3 px-16 py-6 bg-white/10 backdrop-blur-sm border border-white/20 text-white font-bold text-3xl
							rounded-2xl hover:bg-white/20 transition-all duration-200"
					>
						Desktop
					</a>
					<a
						href="#"
						class="thaana inline-flex items-center gap-3 px-16 py-6 bg-white/10 backdrop-blur-sm border border-white/20 text-white font-bold text-3xl
							rounded-2xl hover:bg-white/20 transition-all duration-200"
					>
						Mobile
					</a>
				</div>
			</div>
		</section>

		<footer class="relative z-10 px-6 py-12">
			<div class="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
				<div class="text-center sm:text-start">
					<span class="thaana-heading text-3xl text-white/60">ރާޅު</span>
					<p class="thaana text-sm text-white/30 mt-1">ޖެމިނީ ބޭނުންކޮށް</p>
				</div>
				<nav class="flex items-center gap-6">
					<a href="/about" class="thaana text-sm text-white/40 hover:text-white/70 transition-colors">
						ރާޅު އާ ބެހޭ
					</a>
					<a href="/privacy" class="thaana text-sm text-white/40 hover:text-white/70 transition-colors">
						ޕްރައިވެސީ
					</a>
					<a href="/terms" class="thaana text-sm text-white/40 hover:text-white/70 transition-colors">
						ޝަރުތުތައް
					</a>
				</nav>
			</div>
		</footer>
	</div>
</div>

<style>
	.mock-perspective-right {
		transform: perspective(1200px) rotateY(-5deg) rotateX(2deg);
		filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.3));
	}
	.mock-perspective-left {
		transform: perspective(1200px) rotateY(5deg) rotateX(2deg);
		filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.3));
	}

	@media (max-width: 1023px) {
		.mock-perspective-right,
		.mock-perspective-left {
			transform: perspective(1200px) rotateY(-2deg) rotateX(1deg);
		}
	}

	@media (max-width: 639px) {
		.mock-perspective-right,
		.mock-perspective-left {
			transform: none;
			filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.2));
		}
	}
</style>
