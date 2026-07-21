import posthog from 'posthog-js';

function initPosthog() {
	posthog.init(import.meta.env.PUBLIC_POSTHOG_KEY, {
		api_host: import.meta.env.PUBLIC_POSTHOG_HOST,
		person_profiles: 'identified_only',
		session_recording: {
			maskAllInputs: true,
			maskTextSelector: '[data-ph-mask]',
		},
	});
}

// ponytail: init tras load para no competir con LCP por main thread.
if (document.readyState === 'complete') {
	initPosthog();
} else {
	window.addEventListener('load', initPosthog, { once: true });
}
