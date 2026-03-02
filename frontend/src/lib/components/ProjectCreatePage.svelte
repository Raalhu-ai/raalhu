<script lang="ts">
	let {
		onCreate,
		onCancel
	}: {
		onCreate: (name: string, instructions: string) => void;
		onCancel: () => void;
	} = $props();

	let name = $state('');
	let instructions = $state('');

	function handleCreate() {
		if (name.trim()) {
			onCreate(name.trim(), instructions.trim());
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleCreate();
		}
	}
</script>

<div class="flex flex-col h-full" dir="rtl">
	<div class="flex-1 overflow-y-auto">
		<div class="max-w-2xl mx-auto px-6 py-10">

			<!-- Title -->
			<h1 class="thaana text-xl text-foreground mb-6">ޕާސަނަލް ޕްރޮޖެކްޓެއް ހައްދަވާ</h1>

			<!-- Info box -->
			<div class="bg-muted/50 border border-border rounded-xl p-5 mb-8">
				<h3 class="thaana text-sm font-medium text-foreground mb-2">ޕްރޮޖެކްޓް ބޭނުންކުރާނެ ގޮތް</h3>
				<p class="thaana text-sm text-muted-foreground leading-relaxed mb-3">
					ޕްރޮޖެކްޓް ތަކުން ތިބާގެ މަސައްކަތް ތަރުތީބުކޮށް، ގިނަ ޗެޓް ތަކުގައި މައުލޫމާތު ހިއްސާ ކުރެވެއެވެ. ޑޮކިއުމެންޓް، ކޯޑް، ނުވަތަ ފައިލް އަޕްލޯޑް ކުރައްވާ — ކޮންމެ ޗެޓެއްގައިވެސް ރާޅު އެ މައުލޫމާތު ބޭނުންކުރާނެއެވެ.
				</p>
				<p class="thaana text-sm text-muted-foreground/70 leading-relaxed">
					ފުރަތަމަ ނަމަކާއި ތައާރަފެއް ޖައްސަވާ. ފަހުން ބަދަލުކުރެވޭނެ.
				</p>
			</div>

			<!-- Name field -->
			<div class="mb-6">
				<label for="project-name" class="thaana block text-sm text-muted-foreground mb-2">ކޮން މަސައްކަތެއް ކުރައްވަނީ؟</label>
				<input
					id="project-name"
					bind:value={name}
					placeholder="ޕްރޮޖެކްޓް ނަން ޖައްސަވާ"
					dir="rtl"
					onkeydown={handleKeydown}
					class="thaana w-full px-4 py-3 bg-background border border-border rounded-xl
						text-foreground text-sm placeholder:text-muted-foreground/40
						focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/30
						transition-all duration-150"
					autofocus
				/>
			</div>

			<!-- Description / instructions field -->
			<div class="mb-8">
				<label for="project-desc" class="thaana block text-sm text-muted-foreground mb-2">ކޮން ކަމެއް ހާސިލް ކުރައްވަން ބޭނުންފުޅީ؟</label>
				<textarea
					id="project-desc"
					bind:value={instructions}
					placeholder="ޕްރޮޖެކްޓް، ލަނޑުދަނޑި، މައުޟޫ ފަދަ ތަފްސީލް..."
					dir="rtl"
					rows="4"
					class="thaana w-full px-4 py-3 bg-background border border-border rounded-xl
						text-foreground text-sm placeholder:text-muted-foreground/40
						focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/30
						transition-all duration-150 resize-none"
				></textarea>
			</div>

			<!-- Action buttons -->
			<div class="flex items-center gap-3">
				<button
					onclick={onCancel}
					class="thaana px-5 py-2.5 text-sm text-muted-foreground
						border border-border rounded-full
						hover:text-foreground hover:bg-accent
						transition-colors duration-150"
				>
					ކެންސަލް
				</button>
				<button
					onclick={handleCreate}
					disabled={!name.trim()}
					class="thaana px-5 py-2.5 text-sm
						bg-foreground text-background rounded-full
						hover:bg-foreground/90
						disabled:opacity-40
						transition-colors duration-150"
				>
					ޕްރޮޖެކްޓް ހައްދަވާ
				</button>
			</div>

		</div>
	</div>
</div>
