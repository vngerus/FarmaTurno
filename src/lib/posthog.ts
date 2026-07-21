import posthog from 'posthog-js';

posthog.init(import.meta.env.PUBLIC_POSTHOG_KEY, {
	api_host: import.meta.env.PUBLIC_POSTHOG_HOST,
	person_profiles: 'identified_only',
	session_recording: {
		maskAllInputs: true,
		maskTextSelector: '[data-ph-mask]',
	},
});
