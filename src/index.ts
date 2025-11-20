// 🌐 Import types for Cloudflare Worker environment and Cron
import type { ExecutionContext, Env } from '@cloudflare/workers-types';

// --- CONFIGURATION ---
// Set the desired ON/OFF hours in UTC (0-23).
const ENABLE_HOUR_UTC = 17;  // Example: 9:00 AM PST
const DISABLE_HOUR_UTC = 1; // Example: 5:00 PM PST (1:00 AM next day UTC)

// ---------------------

interface RuleItem {
    id: string;
    expression: string;
    action: string;
    description: string;
    enabled: boolean;
}

interface WorkerEnv extends Env {
    CLOUDFLARE_API_TOKEN: string;
    ACCOUNT_ID: string;
    RULESET_ID: string;
    TARGET_RULE_IDS: string;
}

export default {
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
            // Standard window (e.g., 9-17 UTC)
            desiredState = currentHourUtc >= ENABLE_HOUR_UTC && currentHourUtc < DISABLE_HOUR_UTC;
        } else {
            // Window crosses midnight (e.g., 17-01 UTC)
            desiredState = currentHourUtc >= ENABLE_HOUR_UTC || currentHourUtc < DISABLE_HOUR_UTC;
        }

        // Split the comma-separated string into an array of IDs
        const targetRuleIdsArray = env.TARGET_RULE_IDS.split(',');
        if (targetRuleIdsArray.length === 0) {
            console.error("TARGET_RULE_IDS is empty or not configured correctly.");
            return;
        }

        console.log(`Cron triggered at ${now.toISOString()}. Desired Rule State: ${desiredState ? 'Enabled' : 'Disabled'} for ${targetRuleIdsArray.length} rules.`);

        // --- 2. Validation and API Endpoint Setup ---
        if (!env.CLOUDFLARE_API_TOKEN || !env.ACCOUNT_ID || !env.RULESET_ID) {
            console.error("Missing required environment variables (Token, IDs).");
            return;
        }

        const API_ENDPOINT = `https://api.cloudflare.com/client/v4/accounts/${env.ACCOUNT_ID}/rulesets/${env.RULESET_ID}`;

        try {
            // --- 3. Fetch current ruleset state ---
            const fetchResponse = await fetch(API_ENDPOINT, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!fetchResponse.ok) {
                throw new Error(`API Fetch Error: ${fetchResponse.status} - ${await fetchResponse.text()}`);
            }

            const ruleset: { result: { rules: RuleItem[] } } = await fetchResponse.json() as any;
            let updateRequired = false;

            // --- 4. Iterate and Update Target Rules ---
            const updatedRules = ruleset.result.rules.map(rule => {
                // Check if the current rule's ID is in our target list
                if (targetRuleIdsArray.includes(rule.id)) {
                    // If the rule's current state is NOT the desired state, mark for update
                    if (rule.enabled !== desiredState) {
                        updateRequired = true;
                        console.log(`Rule ${rule.id} state change required: ${rule.enabled} -> ${desiredState}.`);
                        return {
                            ...rule,
                            enabled: desiredState, // Apply the new state
                        };
                    }
                    // If the state is already correct, return the rule unchanged
                    return rule;
                }
                // Return all non-target rules unchanged
                return rule;
            });

            // --- 5. Execute Update (Only if state change is required) ---
            if (!updateRequired) {
                console.log("All target rules are already in the desired state. No API update needed.");
                return;
            }

            const updateResponse = await fetch(API_ENDPOINT, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
                    'Content-Type': 'application/json',
                },
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