<script lang="ts">
	import { ArrowLeft } from 'lucide-svelte';
</script>

<div class="min-h-screen px-6 py-16 max-w-3xl mx-auto">

	<a
		href="/"
		class="inline-flex items-center gap-1.5 text-sm text-muted-foreground/60
			hover:text-muted-foreground transition-colors mb-10"
	>
		<ArrowLeft class="w-4 h-4" />
		<span class="thaana">ފަހަތަށް</span>
	</a>

	<h1 class="thaana-heading text-9xl sm:text-[180px] font-normal leading-none mb-8">
		<span class="bg-gradient-to-l from-primary via-primary/80 to-foreground bg-clip-text text-transparent">
			ޕްރައިވެސީ ޕޮލިސީ
		</span>
	</h1>

	<p class="thaana text-sm text-muted-foreground/60 mb-10">އެންމެ ފަހުން އަޕްޑޭޓް ކުރީ: 23 ފެބްރުއަރީ 2026</p>

	<div class="space-y-10">

		<section>
			<p class="thaana text-base text-muted-foreground leading-[2]">
				ރާޅު އަކީ ދިވެހި ބަހަށް ޚާއްޞަ އޭ.އައި ޓޫލެކެވެ. ތިޔަ ބޭފުޅުންގެ ޕްރައިވެސީ ރައްކާތެރި ކުރުމަކީ އެންމެ މުހިންމު ކަންތައް ކަމުގައި ދެކެމެވެ. މި ޕޮލިސީގައި ބަޔާންކޮށްފައި ވާނީ ރާޅު ބޭނުން ކުރާއިރު ކޮން ޑޭޓާއެއް ނެގޭ ކަމާއި، އެ ޑޭޓާ ބޭނުންކުރެވޭ ގޮތެވެ.
			</p>
		</section>

		<section>
			<h2 class="thaana-heading text-7xl font-normal mb-4">ނެގޭ މައުލޫމާތު</h2>
			<div class="space-y-4">
				<div>
					<h3 class="thaana text-lg font-semibold text-foreground mb-1">ގޫގުލް އެކައުންޓް މައުލޫމާތު</h3>
					<p class="thaana text-base text-muted-foreground leading-[2]">
						ސައިން އިން ކުރާއިރު ގޫގުލް އެކައުންޓުގެ ނަން، އީމެއިލް އެޑްރެސް، އަދި ޕްރޮފައިލް ފޮޓޯ ނެގެއެވެ. ޕާސްވޯޑް ރާޅަށް ނުފެންނާނެއެވެ.
					</p>
				</div>
				<div>
					<h3 class="thaana text-lg font-semibold text-foreground mb-1">ސެޝަން ޓޯކެންތައް</h3>
					<p class="thaana text-base text-muted-foreground leading-[2]">
						ގޫގުލް އޯތް ޓޯކެން ސާވާގައި ރައްކާކުރެވެއެވެ. މި ޓޯކެންތައް ބޭނުންކުރެވެނީ ތިޔަ ބޭފުޅާގެ ގޫގުލް ޖެމިނީ ކޯޓާ މެދުވެރިކޮށް އޭ.އައި ޚިދުމަތް ފޯރުކޮށްދިނުމަށެވެ.
					</p>
				</div>
				<div>
					<h3 class="thaana text-lg font-semibold text-foreground mb-1">ޗެޓް މެސެޖްތައް</h3>
					<p class="thaana text-base text-muted-foreground leading-[2]">
						ޗެޓް ހިސްޓްރީ ރައްކާކުރެވެނީ ހަމައެކަނި ތިޔަ ބޭފުޅާގެ ބްރައުޒާގައެވެ. ސާވާގައި ޗެޓް މެސެޖް ރައްކާއެއް ނުކުރެއެވެ. ބްރައުޒާގެ ޑޭޓާ ފޮހެލީމާ ޗެޓް ހިސްޓްރީ ގެއްލޭނެއެވެ.
					</p>
				</div>
			</div>
		</section>

		<section>
			<h2 class="thaana-heading text-7xl font-normal mb-4">ޑޭޓާ ބޭނުންކުރެވޭ ގޮތް</h2>
			<ul class="thaana text-base text-muted-foreground leading-[2] space-y-2 list-disc list-inside">
				<li>ގޫގުލް ޖެމިނީ މެދުވެރިކޮށް އޭ.އައި ޚިދުމަތް ފޯރުކޮށްދިނުމަށް</li>
				<li>ސެޝަން ދެމެހެއްޓުމަށް (30 ދުވަހުގެ ކުކީ)</li>
				<li>ގޫގުލް ކޯޑް އެސިސްޓް ޕްރޮޖެކްޓް ސެޓަޕް ކުރުމަށް</li>
			</ul>
		</section>

		<section>
			<h2 class="thaana-heading text-7xl font-normal mb-4">ކުކީތައް</h2>
			<p class="thaana text-base text-muted-foreground leading-[2]">
				ރާޅު ބޭނުންކުރަނީ އެންމެ ކުކީއެކެވެ — ސެޝަން ކުކީ. މިއީ HttpOnly، Secure ކުކީއެކެވެ. ޖާވާސްކްރިޕްޓުން މި ކުކީ ކިޔޭ ގޮތެއް ނުވާނެއެވެ. 30 ދުވަސް ފަހުން ކުކީ އެކްސްޕަޔާ ވާނެއެވެ.
			</p>
		</section>

		<section>
			<h2 class="thaana-heading text-7xl font-normal mb-4">ތާޑް ޕާޓީ ޚިދުމަތްތައް</h2>
			<div class="space-y-4">
				<div>
					<h3 class="thaana text-lg font-semibold text-foreground mb-1">ގޫގުލް ޖެމިނީ</h3>
					<p class="thaana text-base text-muted-foreground leading-[2]">
						ޗެޓް މެސެޖްތައް ގޫގުލް ޖެމިނީ އޭ.ޕީ.އައި އަށް ފޮނުވެއެވެ. ގޫގުލްގެ ޕްރައިވެސީ ޕޮލިސީ ތިޔަ ބޭފުޅާގެ ޑޭޓާއަށް އެޕްލައި ވާނެއެވެ.
					</p>
				</div>
				<div>
					<h3 class="thaana text-lg font-semibold text-foreground mb-1">ކްލައުޑްފްލެއާ</h3>
					<p class="thaana text-base text-muted-foreground leading-[2]">
						ރާޅު ހޯސްޓް ކުރެވިފައި ވަނީ ކްލައުޑްފްލެއާ ވާކާސް ގައެވެ. ސެޝަން ޑޭޓާ ކްލައުޑްފްލެއާ ކީ-ވެލިޔު ސްޓޯރޭޖް ގައި ރައްކާ ކުރެވެއެވެ.
					</p>
				</div>
			</div>
		</section>

		<section>
			<h2 class="thaana-heading text-7xl font-normal mb-4">ޑޭޓާ ބެހެއްޓޭ މުއްދަތު</h2>
			<ul class="thaana text-base text-muted-foreground leading-[2] space-y-2 list-disc list-inside">
				<li>ސެޝަން ޑޭޓާ: 30 ދުވަސް، ކުކީ އެކްސްޕަޔާ ވީމާ ޑިލީޓް ވާނެ</li>
				<li>ލޯކަލް ޗެޓް ހިސްޓްރީ: ތިޔަ ބޭފުޅާގެ ކޮންޓްރޯލް ގައި (ބްރައުޒާ ޑޭޓާ)</li>
				<li>ސާވާ ސައިޑް ޗެޓް ލޮގް: ނުނެގޭ، ނުރައްކާ ކުރެވޭ</li>
			</ul>
		</section>

		<section>
			<h2 class="thaana-heading text-7xl font-normal mb-4">ތިޔަ ބޭފުޅާގެ ހައްގުތައް</h2>
			<ul class="thaana text-base text-muted-foreground leading-[2] space-y-2 list-disc list-inside">
				<li>ކޮންމެ ވަގުތެއްގައި ވެސް ލޮގްއައުޓް ކުރެވޭ — ސެޝަން ޑިލީޓް ވާނެ</li>
				<li>ބްރައުޒާ ޑޭޓާ ކްލިއާ ކުރީމާ ލޯކަލް ޗެޓް ހިސްޓްރީ ފޮހެވޭނެ</li>
				<li>ގޫގުލް އެކައުންޓް ސެޓިންގްސް އިން ރާޅު ގެ އެކްސެސް ރީވޯކް ކުރެވޭނެ</li>
			</ul>
		</section>

		<section>
			<h2 class="thaana-heading text-7xl font-normal mb-4">ގުޅުއްވާ</h2>
			<p class="thaana text-base text-muted-foreground leading-[2]">
				ސުވާލެއް ނުވަތަ ކަންބޮޑުވުމެއް ވާނަމަ އީމެއިލް ކުރައްވާ.
			</p>
		</section>

	</div>
</div>
