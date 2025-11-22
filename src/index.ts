// src/index.ts

// 🌐 Import types for Cloudflare Worker environment and Cron
import type { ExecutionContext, Env, Request } from '@cloudflare/workers-types';

// --- CONFIGURATION ---
// Set the desired ON/OFF hours in UTC (0-23).
// Example: Enable at 9:00 AM PST (17 UTC) and Disable at 5:00 PM PST (1 UTC, next day).
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
    // Global API Key/Email for Authentication (set as secrets)
    CLOUDFLARE_API_KEY: string;
    CLOUDFLARE_EMAIL: string;

    // Variables from wrangler.toml
    ACCOUNT_ID: string;
    RULESET_ID: string;
    TARGET_RULE_IDS: string; // Comma-separated list of rule IDs
}

// Helper function to create the required Global API Key headers
function getAuthHeaders(env: WorkerEnv): HeadersInit {
    return {
        'X-Auth-Email': env.CLOUDFLARE_EMAIL,
        'X-Auth-Key': env.CLOUDFLARE_API_KEY,
        'Content-Type': 'application/json',
    };
}

export default {
    /**
     * Handles incoming HTTP requests. Required to prevent "No fetch handler!" errors,
     * though the primary function of this worker is scheduled tasks.
     */
    async fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext): Promise<Response> {
        return new Response("This worker is dedicated to running scheduled Magic Firewall updates. Status: OK.", {
            status: 200,
            headers: { 'Content-Type': 'text/plain' },
        });
    },

    /**
     * The main scheduled handler triggered by the Cron configuration.
     */
    async scheduled(
        event: ScheduledEvent,
        env: WorkerEnv,
        ctx: ExecutionContext
    ): Promise<void> {
        const now = new Date();
        const currentHourUtc = now.getUTCHours();

        // --- 1. Determine the Desired State based on UTC time ---
        let desiredState: boolean;
        if (ENABLE_HOUR_UTC < DISABLE_HOUR_UTC) {
            // Standard window (e.g., 9-17 UTC)
            desiredState = currentHourUtc >= ENABLE_HOUR_UTC && currentHourUtc < DISABLE_HOUR_UTC;
        } else {
            // Window crosses midnight (e.g., 17-01 UTC)
            desiredState = currentHourUtc >= ENABLE_HOUR_UTC || currentHourUtc < DISABLE_HOUR_UTC;
        }

        // Convert the comma-separated string of IDs into an array
        const targetRuleIdsArray = env.TARGET_RULE_IDS.split(',').filter(id => id.trim() !== '');

        if (targetRuleIdsArray.length === 0) {
            console.error("TARGET_RULE_IDS is empty or not configured correctly.");
            return;
        }

        console.log(`Cron triggered at ${now.toISOString()}. Desired Rule State: ${desiredState ? 'Enabled' : 'Disabled'} for ${targetRuleIdsArray.length} rules.`);

        // --- 2. Validation and API Endpoint Setup ---
        if (!env.CLOUDFLARE_API_KEY || !env.CLOUDFLARE_EMAIL || !env.RULESET_ID || !env.ACCOUNT_ID) {
            console.error("Missing required environment variables (Email, Key, Ruleset ID, OR ACCOUNT ID).");
            return;
        }

        // Correct API Endpoint URL structure for Account-level Rulesets
        const API_ENDPOINT = `https://api.cloudflare.com/client/v4/accounts/${env.ACCOUNT_ID}/rulesets/${env.RULESET_ID}`;

        try {
            // --- 3. Fetch current ruleset state ---
            const fetchResponse = await fetch(API_ENDPOINT, {
                method: 'GET',
                headers: getAuthHeaders(env),
            });

            if (!fetchResponse.ok) {
                throw new Error(`API Fetch Error: ${fetchResponse.status} - ${await fetchResponse.text()}`);
            }

            const ruleset: { result: { rules: RuleItem[] } } = await fetchResponse.json() as any;
            let updateRequired = false;

            // --- 4. Iterate and Update Target Rules ---
            const updatedRules = ruleset.result.rules.map(rule => {
                if (targetRuleIdsArray.includes(rule.id)) {
                    // Check if the current rule state is different from the desired state
                    if (rule.enabled !== desiredState) {
                        updateRequired = true;
                        console.log(`Rule ${rule.id} state change required: ${rule.enabled} -> ${desiredState}.`);
                        return {
                            ...rule,
                            enabled: desiredState, // Apply the new state
                        };
                    }
                    // State is correct, return rule unchanged
                    return rule;
                }
                // Non-target rule, return rule unchanged
                return rule;
            });

            // --- 5. Execute Update (Only if state change is required) ---
            if (!updateRequired) {
                console.log("All target rules are already in the desired state. No API update needed.");
                return;
            }

            const updateResponse = await fetch(API_ENDPOINT, {
                method: 'PUT',
                headers: getAuthHeaders(env),
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