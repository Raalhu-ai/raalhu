import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface AboutPageProps {
	onBack: () => void;
}

export function AboutPage({ onBack }: AboutPageProps) {
	return (
		<div className="min-h-screen px-6 py-16 max-w-3xl mx-auto overflow-y-auto animate-fade-in" style={{ width: '100%' }}>
			<button
				onClick={onBack}
				className="inline-flex items-center gap-1.5 text-sm text-muted-foreground/60 hover:text-muted-foreground transition-colors mb-10 cursor-pointer bg-transparent border-none"
			>
				<ArrowLeft className="w-4 h-4" />
				<span className="thaana">ފަހަތަށް</span>
			</button>

			<h1 className="thaana-heading text-9xl sm:text-[180px] font-normal leading-none mb-8">
				<span className="bg-gradient-to-l from-primary via-primary/80 to-foreground bg-clip-text text-transparent">
					ރާޅު އާ ބެހޭ
				</span>
			</h1>

			<div className="space-y-10">
				<section>
					<p className="thaana text-lg text-muted-foreground leading-[2]">
						ރާޅު އަކީ ދިވެހި ބަހަށް ޚާއްޞަ އޭ.އައި ޓޫލެވެ. ގޫގުލް ޖެމިނީ ގެ ބާރުގައި ދިވެހި ބަހުން ލިޔުން، ތަރުޖަމާ، ދިރާސާ، ކޯޑް ރަން ކުރުން، ޑޮކިއުމެންޓް ހެދުން، ރެސިޕީ ދެއްކުން — މި ހުރިހާ ކަމެއް ކުރެވެއެވެ.
					</p>
				</section>

				<section>
					<h2 className="thaana-heading text-7xl font-normal mb-4">މިޝަން</h2>
					<p className="thaana text-base text-muted-foreground leading-[2]">
						ދިވެހި ބަހުން ފެންވަރު ރަނގަޅު އޭ.އައި ޚިދުމަތެއް ހިލޭ ފޯރުކޮށްދިނުން. ދިވެހިން ޑިޖިޓަލް ދުނިޔޭގައި ފަސޭހައިން މަސައްކަތް ކުރެވޭނެ ގޮތް ހެދުން. ދިވެހި ބަސް ޓެކްނޮލޮޖީ ގެ ދާއިރާގައި ކުރިއެރުވުން.
					</p>
				</section>

				<section>
					<h2 className="thaana-heading text-7xl font-normal mb-4">ކާކު ހެދީ؟</h2>
					<div className="bg-card/50 border border-border/50 rounded-xl p-6 sm:p-8">
						<p className="thaana text-base text-muted-foreground leading-[2] mb-4">
							އައްސަލާމު ޢަލައިކުމް، އަޅުގަނޑަކީ އެލްގިއަސް އެސްޕިން. އަޅުގަނޑަކީ ދިވެހިރާއްޖޭގައި ދިރިއުޅޭ އިންޑިޔާ މީހެއް. ރާޅު.އޭއައި ހެދީ ދިވެހިރާއްޖޭގެ ރީތި ބަސް، ދިވެހި ބަސް ދަސްކުރުމަށް ބޭނުންކުރާ ޓޫލެއްގެ ގޮތުގައި. މި ޓޫލް އަޅުގަނޑަށް ވަރަށް ބޭނުންތެރިވީމާ، އެހެން މީހުންނަށް ވެސް ބޭނުންތެރިވާނެ ކަމަށް ހީކޮށް، ދުނިޔެއާ ޙިއްޞާ ކުރަނީ.
						</p>
						<p className="thaana text-base text-muted-foreground leading-[2] mb-6">
							ރާޅު.އޭއައި އަބަދުވެސް ހިލޭ ބޭނުންކުރެވޭ ގޮތަށް ހުންނާނެ. ބަހުގެ ހުރަސްތައް ނައްތާލައި، އެކަކު އަނެކަކު ދަސްކުރަމާ.
						</p>
						<p className="text-base text-muted-foreground/70 italic">
							— Elgius Espin
						</p>
					</div>
				</section>

				<section>
					<h2 className="thaana-heading text-7xl font-normal mb-4">ޓެކްނޮލޮޖީ</h2>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						{[
							['ސްވެލްޓް ކިޓް', 'ފްރަންޓް އެންޑް ފްރޭމް ވާކް (ސްވެލްޓް 5)'],
							['ޓެއިލް ވިންޑް ސީ.އެސް.އެސް', 'ސްޓައިލިންގ ފްރޭމް ވާކް (ވީ 4)'],
							['ހޮނޯ', 'ބެކް އެންޑް ފްރޭމް ވާކް'],
							['ކްލައުޑްފްލެއާ ވާކާސް', 'އެޖް ހޯސްޓިންގ އަދި ޑިޕްލޯއީ'],
							['ޓައިޕް ސްކްރިޕްޓް', 'ޕްރޮގްރާމިންގ ލެންގުއެޖް'],
							['ވައިޓް', 'ބިލްޑް ޓޫލް'],
						].map(([title, desc], i) => (
							<div key={i} className="bg-card/50 border border-border/50 rounded-xl p-5">
								<h3 className="thaana text-lg font-semibold text-foreground mb-1">{title}</h3>
								<p className="thaana text-sm text-muted-foreground">{desc}</p>
							</div>
						))}
					</div>
				</section>

				<section>
					<h2 className="thaana-heading text-7xl font-normal mb-4">ކްރެޑިޓްސް</h2>
					<div className="space-y-4">
						{[
							['ގޫގުލް ޖެމިނީ', 'އޭ.އައި މޮޑެލް — ގޫގުލް ކޯޑް އެސިސްޓް އޭ.ޕީ.އައި މެދުވެރިކޮށް'],
							['އެމް.ވީ ޓައިޕް ރައިޓާ', 'ތާނަ ބޮޑީ ފޮންޓް'],
							['ސަންގު ސުރުހީ', 'ތާނަ ހެޑިންގ ފޮންޓް'],
							['ލޫސައިޑް އައިކޮންސް', 'އޯޕެން ސޯސް އައިކޮން ލައިބްރެރީ'],
							['ޝެޑް ސީ.އެން — ސްވެލްޓް', 'ޔޫ.އައި ކޮމްޕޮނެންޓް ލައިބްރެރީ (ބިޓްސް ޔޫ.އައި)'],
							['ވާސެލް އޭ.އައި އެސް.ޑީ.ކޭ', 'އޭ.އައި ސްޓްރީމިންގ'],
							['ހައިލައިޓް.ޖޭ.އެސް', 'ކޯޑް ސިންޓެކްސް ހައިލައިޓިންގ'],
							['ޑެކްސީ', 'ބްރައުޒާ ޑޭޓާބޭސް (ޗެޓް ހިސްޓްރީ ރައްކާކުރުން)'],
						].map(([title, desc], i) => (
							<div key={i} className="bg-card/50 border border-border/50 rounded-xl p-5">
								<h3 className="thaana text-lg font-semibold text-foreground mb-1">{title}</h3>
								<p className="thaana text-sm text-muted-foreground">{desc}</p>
							</div>
						))}
					</div>
				</section>
			</div>
		</div>
	);
}
