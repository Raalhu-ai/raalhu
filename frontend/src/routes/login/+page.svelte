<script lang="ts">
	import { startLogin, exchangeCode } from '$lib/api';
	import {
		Loader2,
		ClipboardPaste,
		ArrowLeft,
		ExternalLink
	} from 'lucide-svelte';

	let authUrl = $state('');
	let authState = $state('');
	let codeInput = $state('');
	let loginError = $state('');
	let submitting = $state(false);

	async function handleStartLogin() {
		loginError = '';
		// Open blank tab synchronously so mobile browsers don't block the popup
		const tab = window.open('about:blank', '_blank');
		try {
			const res = await startLogin();
			authUrl = res.authUrl;
			authState = res.state;

			sessionStorage.setItem('oauth_state', res.state);
			sessionStorage.setItem('oauth_url', res.authUrl);

			if (tab) tab.location.href = res.authUrl;
			else window.open(res.authUrl, '_blank');
		} catch (err: any) {
			if (tab) tab.close();
			loginError = err.message || 'ސައިން އިން ފެށުމުގައި މައްސަލައެއް ދިމާވެއްޖެ';
		}
	}

	function handleReopenTab() {
		const url = authUrl || sessionStorage.getItem('oauth_url');
		if (url) window.open(url, '_blank');
		else handleStartLogin();
	}

	async function handleSubmitCode() {
		if (!codeInput.trim()) return;
		loginError = '';
		submitting = true;

		const state = authState || sessionStorage.getItem('oauth_state') || '';

		try {
			await exchangeCode(codeInput, state);
			window.location.href = '/';
		} catch (err: any) {
			loginError = err.message || 'ކޯޑް ބަލައިގަތުމުގައި މައްސަލައެއް ދިމާވެއްޖެ';
			submitting = false;
		}
	}

	function handleCodeKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') handleSubmitCode();
	}
</script>

<div class="h-dvh flex flex-col items-center justify-center px-6 overflow-hidden">

	<!-- Back to home -->
	<a
		href="/"
		class="absolute top-6 start-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground/60
			hover:text-muted-foreground transition-colors"
	>
		<ArrowLeft class="w-4 h-4" />
		<span class="thaana">ފަހަތަށް</span>
	</a>

	{#if submitting}
		<!-- ═══ LOADING ═══ -->
		<div class="flex flex-col items-center gap-4 animate-fade-in">
			<Loader2 class="w-7 h-7 text-primary animate-spin" />
			<p class="thaana text-lg text-muted-foreground">ސައިން އިން ކުރަނީ...</p>
		</div>
	{:else}
		<!-- ═══ STEP-BY-STEP LOGIN ═══ -->
		<div class="max-w-md w-full mx-auto animate-fade-in-up">

			<!-- Header -->
			<h1 class="thaana-heading text-6xl sm:text-7xl leading-none mb-10 text-center">
				<span class="bg-gradient-to-l from-primary via-primary/80 to-foreground bg-clip-text text-transparent">
					ސައިން އިން
				</span>
			</h1>

			<div class="flex flex-col gap-6">

				<!-- Step 1: Sign in with Google -->
				<div class="flex items-start gap-4">
					<div class="shrink-0 w-7 h-7 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center mt-0.5">1</div>
					<div class="flex-1">
						<p class="thaana text-base text-foreground mb-3">
							ގޫގުލް އެކައުންޓުން ސައިން އިން ކުރައްވާ
						</p>
						<button
							onclick={handleStartLogin}
							class="inline-flex items-center gap-3 px-5 h-11 bg-card border border-border/60
								rounded-lg hover:bg-accent transition-colors cursor-pointer"
						>
							<!-- Google icon -->
							<svg width="18" height="18" viewBox="0 0 48 48">
								<path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
								<path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
								<path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.01 24.01 0 0 0 0 21.56l7.98-6.19z"/>
								<path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
							</svg>
							<span class="thaana text-foreground text-sm font-medium">ގޫގުލް އިން ސައިން އިން ކުރައްވާ</span>
						</button>
					</div>
				</div>

				<!-- Step 2: Copy code -->
				<div class="flex items-start gap-4">
					<div class="shrink-0 w-7 h-7 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center mt-0.5">2</div>
					<p class="thaana text-base text-foreground">
						ސައިން އިން ވުމުން ފެންނަ ކޯޑް ކޮޕީ ކުރައްވާ
					</p>
				</div>

				<!-- Step 3: Paste code -->
				<div>
					<div class="flex items-start gap-4 mb-3">
						<div class="shrink-0 w-7 h-7 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center mt-0.5">3</div>
						<p class="thaana text-base text-foreground">
							ކޯޑް ތިރީގައި ޕޭސްޓް ކުރައްވާ
						</p>
					</div>
					<div class="relative" dir="ltr">
						<ClipboardPaste class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
						<input
							type="text"
							bind:value={codeInput}
							onkeydown={handleCodeKeydown}
							placeholder="ކޯޑް މިތާ ޕޭސްޓް ކުރައްވާ"
							class="w-full pl-10 pr-4 h-12 bg-background border border-border/60 rounded-xl
								text-foreground font-mono text-base placeholder:text-muted-foreground/40 placeholder:font-[var(--font-thaana)] placeholder:text-sm
								focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
						/>
					</div>
				</div>

				<!-- Submit button -->
				<div class="pt-2">
					<button
						onclick={handleSubmitCode}
						disabled={!codeInput.trim()}
						class="thaana w-full h-12 bg-primary text-primary-foreground font-semibold text-lg
							rounded-xl hover:bg-primary/90 transition-colors duration-150
							disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
					>
						ކުރިއަށް
					</button>
				</div>
			</div>

			<!-- Re-open tab link -->
			<div class="text-center mt-6">
				<button
					onclick={handleReopenTab}
					class="thaana inline-flex items-center gap-1.5 text-sm text-muted-foreground/60
						hover:text-muted-foreground transition-colors cursor-pointer"
				>
					<ExternalLink class="w-3.5 h-3.5" />
					ގޫގުލް ޕޭޖް އަލުން ހުޅުވާ
				</button>
			</div>

			{#if loginError}
				<p class="thaana text-sm text-red-400 mt-4 text-center">{loginError}</p>
			{/if}
		</div>
	{/if}

</div>
