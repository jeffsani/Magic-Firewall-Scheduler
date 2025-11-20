// 🌐 Import types for Cloudflare Worker environment and Cron
import type { ExecutionContext, Env, Request } from '@cloudflare/workers-types';

// --- CONFIGURATION ---
const ENABLE_HOUR_UTC = 17;
const DISABLE_HOUR_UTC = 1;
// ---------------------

interface RuleItem {
    id: string;
    expression: string;
    action: string;
    description: string;
    enabled: boolean;
}

interface WorkerEnv extends Env {
    //Using Global API Key and Email for authorization
    CLOUDFLARE_API_KEY: string;
    CLOUDFLARE_EMAIL: string;

    // Rule variables remain
    RULESET_ID: string;
    TARGET_RULE_IDS: string;
}

// Helper function to create the required headers
function getAuthHeaders(env: WorkerEnv): HeadersInit {
    return {
        'X-Auth-Email': env.CLOUDFLARE_EMAIL, // Your Cloudflare Account Email
        'X-Auth-Key': env.CLOUDFLARE_API_KEY,   // Your Global API Key
        'Content-Type': 'application/json',
    };
}

export default {
    async fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext): Promise<Response> {
        return new Response("This worker is primarily for scheduled (Cron) tasks. Status: OK.", {
            status: 200,
            headers: { 'Content-Type': 'text/plain' },
        });
    },

    async scheduled(
        event: ScheduledEvent,
        env: WorkerEnv,
        ctx: ExecutionContext
    ): Promise<void> {
        const now = new Date();
        const currentHourUtc = now.getUTCHours();

        // --- 1. Determine the Desired State ---
        let desiredState: boolean;
        if (ENABLE_HOUR_UTC < DISABLE_HOUR_UTC) {
            desiredState = currentHourUtc >= ENABLE_HOUR_UTC && currentHourUtc < DISABLE_HOUR_UTC;
        } else {
            desiredState = currentHourUtc >= ENABLE_HOUR_UTC || currentHourUtc < DISABLE_HOUR_UTC;
        }

        const targetRuleIdsArray = env.TARGET_RULE_IDS.split(',');

        console.log(`Cron triggered at ${now.toISOString()}. Desired Rule State: ${desiredState ? 'Enabled' : 'Disabled'} for ${targetRuleIdsArray.length} rules.`);

        // --- 2. Validation and API Endpoint Setup ---
        // NOTE: The Account ID is no longer needed in the fetch URL for Magic Firewall rulesets!
        if (!env.CLOUDFLARE_API_KEY || !env.CLOUDFLARE_EMAIL || !env.RULESET_ID) {
            console.error("Missing required environment variables (Email, Key, or Ruleset ID).");
            return;
        }

        // The endpoint URL changes slightly when using the Global Key/Email method
        // for rulesets, as the Account ID can be derived from the authentication.
        const API_ENDPOINT = `https://api.cloudflare.com/client/v4/rulesets/${env.RULESET_ID}`;

        try {
            // --- 3. Fetch current ruleset state ---
            const fetchResponse = await fetch(API_ENDPOINT, {
                method: 'GET',
                headers: getAuthHeaders(env), // Using the new helper function
            });

            if (!fetchResponse.ok) {
                throw new Error(`API Fetch Error: ${fetchResponse.status} - ${await fetchResponse.text()}`);
            }

            const ruleset: { result: { rules: RuleItem[] } } = await fetchResponse.json() as any;
            let updateRequired = false;

            // --- 4. Iterate and Update Target Rules ---
            const updatedRules = ruleset.result.rules.map(rule => {
                if (targetRuleIdsArray.includes(rule.id)) {
                    if (rule.enabled !== desiredState) {
                        updateRequired = true;
                        console.log(`Rule ${rule.id} state change required: ${rule.enabled} -> ${desiredState}.`);
                        return {
                            ...rule,
                            enabled: desiredState,
                        };
                    }
                    return rule;
                }
                return rule;
            });

            // --- 5. Execute Update (Only if state change is required) ---
            if (!updateRequired) {
                console.log("All target rules are already in the desired state. No API update needed.");
                return;
            }

            const updateResponse = await fetch(API_ENDPOINT, {
                method: 'PUT',
                headers: getAuthHeaders(env), // Using the new helper function
                body: JSON.stringify({
                    rules: updatedRules,
                }),
            });

            if (!updateResponse.ok) {
                throw new Error(`API Update Error: ${updateResponse.status} - ${await updateResponse.text()}`);
            }

            console.log(`✅ Successfully updated the ruleset. Rules set to: ${desiredState ? 'Enabled' : 'Disabled'}.`);

        } catch (error) {
            console.error('An unexpected error occurred during API operations:', error);
        }
    },
};